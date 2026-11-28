"""量產後處理 v4（本機）：WAV → MP3。和第二輪 `r2/postprocess_r2.py` 的差別：

  * 響度目標改成一個區間：**−17.5～−16.0 LUFS（目標 −16.7）、true peak ≤ −2 dBTP**（編碼後實測，不達標就降增益重編）。
  * 短句（< 1 秒，例如「……搜不到。」）以前被 true peak 卡住、只有 −21.1 LUFS。現在量完先預測：若以 TP 上限能達到的響度低於 −17.0 LUFS，
    就先過一段**溫和壓縮＋軟限幅**（acompressor → alimiter，三檔由輕到重，夠用就停），把峰值壓下來再正規化，而不是降低整句音量。
    不需要壓縮的句子完全不動，所以長句的動態與先前一致。
  * 其餘沿用：去頭尾靜音（−45 dB）、前後 12 ms 淡入淡出、單聲道 24 kHz MP3 LAME 48 kbps。

只用 ffmpeg／ffprobe 與標準函式庫。
"""

import json
import subprocess
import tempfile
from pathlib import Path

TARGET_LUFS = -16.7  # 區間 −17.5～−16.0 的中央附近
BAND = (-17.5, -16.0)
TP_MAX = -2.0  # 編碼後 true peak 上限
TP_PRE = -2.4  # 編碼前留 0.4 dB 給 MP3 過衝
NEED_COMPRESS_BELOW = -17.0  # 以 TP_PRE 能達到的響度低於這個值就壓縮
FADE_S = 0.012
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:detection=peak,areverse"
# 由輕到重：(acompressor 參數, alimiter 上限 dB, alimiter attack/release)。attack/release 以 ms 計；短句的峰值多半是單一爆音（crest factor 可達 18 dB），攻擊時間要短才壓得到。
PRESETS = [
    ("threshold=-20dB:ratio=2.5:attack=2:release=80:makeup=1", -3.0, "attack=1:release=20"),
    ("threshold=-24dB:ratio=3.5:attack=1:release=70:makeup=1", -4.0, "attack=1:release=15"),
    ("threshold=-24dB:ratio=4:attack=0.5:release=50:makeup=1", -6.0, "attack=0.5:release=10"),
]


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def _json_from(txt):
    return json.loads(txt[txt.rfind("{") : txt.rfind("}") + 1])


def _loudnorm(src, chain, loop=False):
    af = (chain + "," if chain else "") + ("aloop=loop=6:size=2147483647," if loop else "") + "loudnorm=I=-16:print_format=json"
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", af, "-f", "null", "-"])
    return _json_from(r.stderr)


def measure(src, chain=""):
    """(integrated LUFS, true peak dBTP)。太短時 loudnorm 的閘門量不到 → 重複 6 次再量（積分響度等同原片段，true peak 不變）。"""
    d = _loudnorm(src, chain)
    if d["input_i"] in ("-inf", "inf"):
        d = _loudnorm(src, chain, loop=True)
    return float(d["input_i"]), float(d["input_tp"])


def duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)])
    return float(r.stdout.strip())


def mp3_stats(path):
    return measure(path)


def _render(src, dst, chain):
    r = run(["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-af", chain, "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(dst)])
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-600:])


def to_mp3(src, dst):
    """回傳 {"lufs","true_peak_dbtp","reencode_gain_db","duration_s","compress"}；compress = 0 表示沒壓縮，1～3 是用到的檔位。"""
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        # ① 去靜音 → 量；預測以 TP_PRE 能達到的響度
        base = td / "base.wav"
        _render(src, base, TRIM)
        lufs, tp = measure(base)
        compress = 0
        cur = base
        if lufs + (TP_PRE - tp) < NEED_COMPRESS_BELOW:
            # ② 短句／高峰值句：溫和壓縮＋軟限幅，由輕到重，夠用就停
            for lvl, (comp, lim_db, lim_t) in enumerate(PRESETS, 1):
                out = td / f"c{lvl}.wav"
                _render(base, out, f"acompressor={comp},alimiter=limit={10 ** (lim_db / 20):.4f}:{lim_t}:level=0")
                l2, t2 = measure(out)
                cur, compress, lufs, tp = out, lvl, l2, t2
                if l2 + (TP_PRE - t2) >= NEED_COMPRESS_BELOW:
                    break
        # ③ 增益 = 達到目標，但不讓編碼前的 true peak 超過 TP_PRE
        gain = min(TARGET_LUFS - lufs, TP_PRE - tp)
        dur = duration(cur)
        fade = min(FADE_S, dur / 4)
        # ④ 編碼 → 實測 → 閉環修正：MP3 48 kbps 的低通會讓響度掉約 0.4 LU，所以以編碼後的實測為準，
        #    每次把增益調到「接近目標、且編碼後 true peak ≤ TP_MAX（留 0.15 dB）」，最多 5 輪。
        for _ in range(5):
            af = f"volume={gain:.2f}dB,afade=t=in:d={fade:.4f},afade=t=out:st={max(dur - fade, 0):.4f}:d={fade:.4f}"
            r = run(["ffmpeg", "-hide_banner", "-y", "-i", str(cur), "-af", af, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", str(dst)])
            if r.returncode != 0:
                raise RuntimeError(r.stderr[-600:])
            lu, tpe = mp3_stats(dst)
            delta = min(TARGET_LUFS - lu, (TP_MAX - 0.15) - tpe)
            if tpe <= TP_MAX and abs(TARGET_LUFS - lu) <= 0.25:
                break
            if tpe <= TP_MAX and delta > 0 and delta < 0.05:
                break  # 想再加大聲但被 true peak 擋住
            gain += delta
        return {"lufs": round(lu, 1), "true_peak_dbtp": round(tpe, 1), "reencode_gain_db": 0.0, "duration_s": round(duration(dst), 2), "compress": compress, "pp": 4, "in_range": BAND[0] <= lu <= BAND[1] and tpe <= TP_MAX}
