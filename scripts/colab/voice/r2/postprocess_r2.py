"""第二輪本機後處理：把通過守門的 take 轉成 MP3，彙整成 candidates_r2.json。

- 去頭尾靜音（ffmpeg silenceremove -45 dB）
- 響度統一到約 -16 LUFS（loudnorm 兩段式、linear），true peak 上限 −2.0 dBTP
- 單聲道、24 kHz、前後各 12 ms 淡入淡出（避免爆音）
- 編成 MP3（LAME 48 kbps）後再量一次 true peak；若 MP3 編碼過衝 > −1.0 dBTP，降增益重編
只用 ffmpeg 與標準函式庫。

用法：python3 postprocess_r2.py <voice-r2 目錄>   （內需有 raw/r2_out/{wav,metrics_r2.json}；若有 vox_raw/vox_out 也一併處理）
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

TARGET_LUFS = -16.0
TRUE_PEAK = -2.0
LRA = 11
FADE_S = 0.012
TP_REENCODE_ABOVE = -1.0
TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:detection=peak,areverse"


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def _json_from(txt):
    return json.loads(txt[txt.rfind("{") : txt.rfind("}") + 1])


def _loudnorm_json(src, chain):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", f"{chain},loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA={LRA}:print_format=json", "-f", "null", "-"])
    return _json_from(r.stderr)


def measure(src):
    m = _loudnorm_json(src, TRIM)
    if m["input_i"] in ("-inf", "inf"):  # 去靜音後太短，loudnorm 閘門量不到 → 重複 6 次再量（積分響度等同原片段）
        m = _loudnorm_json(src, TRIM + ",aloop=loop=6:size=2147483647")
    return m


def duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)])
    return float(r.stdout.strip())


def mp3_stats(path):
    """回傳 (LUFS, true peak dBTP)；太短時改量重複 6 次的版本。"""
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "loudnorm=I=-16:print_format=json", "-f", "null", "-"])
    d = _json_from(r.stderr)
    if d["input_i"] in ("-inf", "inf"):
        r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "aloop=loop=6:size=2147483647,loudnorm=I=-16:print_format=json", "-f", "null", "-"])
        d = _json_from(r.stderr)
    return float(d["input_i"]), float(d["input_tp"])


def to_mp3(src, dst):
    m = measure(src)
    ln = (
        f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
        f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    )
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td) / "n.wav"
        r = run(["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-af", f"{TRIM},{ln},aresample=24000", "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(tmp)])
        if r.returncode != 0:
            raise RuntimeError(r.stderr[-600:])
        dur = duration(tmp)
        fade = min(FADE_S, dur / 4)
        gain = 0.0
        for _ in range(3):
            af = f"afade=t=in:d={fade:.4f},afade=t=out:st={max(dur - fade, 0):.4f}:d={fade:.4f}" + (f",volume={gain:.2f}dB" if gain else "")
            r = run(["ffmpeg", "-hide_banner", "-y", "-i", str(tmp), "-af", af, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", str(dst)])
            if r.returncode != 0:
                raise RuntimeError(r.stderr[-600:])
            lufs, tp = mp3_stats(dst)
            if tp <= TP_REENCODE_ABOVE:
                break
            gain -= (tp - TRUE_PEAK) + 0.2  # MP3 編碼過衝，降增益重編
    return {"lufs": round(lufs, 1), "true_peak_dbtp": round(tp, 1), "reencode_gain_db": round(gain, 1), "duration_s": round(duration(dst), 2)}


def strip_take(t, keep_emb=False):
    return {k: v for k, v in t.items() if k != "_emb"}


def load_sv(voice_dir):
    p = voice_dir / "sv_eval.json"
    if not p.exists():
        return {}
    return {r["file"]: r for r in json.loads(p.read_text(encoding="utf-8")) if r["group"] in ("r2", "vox")}


def process_qwen(voice_dir, out_audio):
    """主跑（r2_out）＋補測（r2_out_b，晴的兩個補測聲音等）合併；每個聲音的 wav 從各自的資料夾讀。"""
    dirs = [d for d in (voice_dir / "raw" / "r2_out", voice_dir / "raw" / "r2_out_b") if (d / "metrics_r2.json").exists()]
    metrics = None
    cache = {}
    sv = load_sv(voice_dir)

    def mp3_for(raw, fname, out_name):
        if not fname:
            return None
        key = (str(raw), fname)
        if key not in cache:
            dst = out_audio / out_name
            cache[key] = {"mp3": f"audio/{out_name}", **to_mp3(raw / "wav" / fname, dst), "sv_lang": sv.get(fname, {}).get("lang"), "sv_text": sv.get(fname, {}).get("text")}
        return cache[key]

    for raw in dirs:
        part = json.loads((raw / "metrics_r2.json").read_text(encoding="utf-8"))
        for v in part["voices"]:
            v["source_run"] = raw.name
            for a, ad in v["accents"].items():
                for ln in ad["lines"]:
                    ln["audio"] = mp3_for(raw, ln["chosen_file"], f"{v['id']}__{a}__{ln['id']}.mp3")
            cm = v.get("clone_mode") or {}
            if cm.get("ref_file"):
                cm["ref_audio"] = mp3_for(raw, cm["ref_file"], f"{v['id']}__ref.mp3")
            for ln in cm.get("lines", []):
                ln["audio"] = mp3_for(raw, ln["chosen_file"], f"{v['id']}__{ln['id']}__clone.mp3")
        for c in part.get("catchphrases", []):
            c["audio"] = mp3_for(raw, c["chosen_file"], f"{c['voice']}__{c['accent']}__{c['id']}.mp3")
        if metrics is None:
            metrics = part
            metrics["runs"] = [raw.name]
        else:
            metrics["voices"].extend(part["voices"])
            metrics["catchphrases"].extend(part.get("catchphrases", []))
            for k, st in part["first_round_stats"].items():
                if not k.startswith("ALL|"):
                    metrics["first_round_stats"].setdefault(k, st)
            metrics["runs"].append(raw.name)
    return metrics


def process_vox(voice_dir, out_audio):
    p = voice_dir / "vox_raw" / "vox_out" / "metrics_voxcpm.json"
    if not p.exists():
        return None
    raw = p.parent
    metrics = json.loads(p.read_text(encoding="utf-8"))
    sv = load_sv(voice_dir)
    for v in metrics["voices"]:
        for var, vd in v["variants"].items():
            for ln in vd["lines"]:
                f = ln["chosen_file"]
                if f and sv.get(f, {}).get("lang") == "yue":  # 生成當下的守門尚未含 SenseVoice；事後檢查抓到粵語就撤下
                    ln["audio"] = None
                    ln["sv_rejected"] = f
                    ln["takes"] = [dict(t, fails=t["fails"] + ["yue(SenseVoice)"]) if t.get("file") == f else t for t in ln["takes"]]
                    continue
                ln["audio"] = {"mp3": f"audio/{Path(f).stem}.mp3", **to_mp3(raw / "wav" / f, out_audio / f"{Path(f).stem}.mp3"), "sv_lang": sv.get(f, {}).get("lang"), "sv_text": sv.get(f, {}).get("text")} if f else None
    return metrics


def main():
    voice_dir = Path(sys.argv[1])
    out_audio = voice_dir / "audio"
    out_audio.mkdir(exist_ok=True)
    qwen = process_qwen(voice_dir, out_audio)
    vox = process_vox(voice_dir, out_audio)
    validation = None
    svp, r1p = voice_dir / "sv_eval.json", voice_dir / "r1_eval.json"
    if svp.exists() and r1p.exists():
        from collections import Counter

        sv = json.loads(svp.read_text(encoding="utf-8"))
        r1 = json.loads(r1p.read_text(encoding="utf-8"))
        validation = {
            "note": "用第一輪（Gemini 聽出大量粵語）的 117 個音檔驗證守門器：Whisper 語種偵測 vs SenseVoiceSmall 語種標籤；並列出第二輪／VoxCPM2 輸出的 SenseVoice 標籤分布。",
            "round1_117": {
                "whisper_flagged_yue": sum(1 for x in r1 if x["lang_top"] == "yue" or x["yue_prob"] > 0.1),
                "sensevoice_yue": sum(1 for x in r1 if x["sv_lang"] == "yue"),
                "by_kind": {k: {"n": sum(1 for x in r1 if x["kind"] == k), "sensevoice_yue": sum(1 for x in r1 if x["kind"] == k and x["sv_lang"] == "yue"), "whisper_yue": sum(1 for x in r1 if x["kind"] == k and (x["lang_top"] == "yue" or x["yue_prob"] > 0.1)), "mean_cer": round(sum(x["cer"] for x in r1 if x["kind"] == k) / max(1, sum(1 for x in r1 if x["kind"] == k)), 3), "passed_all_gates": sum(1 for x in r1 if x["kind"] == k and x["passed"])} for k in ("design", "clone", "ref")},
            },
            "sensevoice_labels": {g: dict(Counter(r["lang"] for r in sv if r["group"] == g)) for g in ("r1", "r2", "vox")},
        }
    cand = {
        "generated_by": "scripts/colab/voice/r2/run_colab_r2.sh",
        "postprocess": {"trim": "silenceremove -45dB 頭尾", "loudness": f"loudnorm 兩段式 I={TARGET_LUFS} LUFS TP={TRUE_PEAK}", "fade": f"前後各 {int(FADE_S * 1000)} ms", "format": "mono 24kHz MP3 LAME 48kbps，編碼後 true peak > −1.0 dBTP 則降增益重編"},
        "ethics_note": "所有聲音皆由文字描述設計生成；未使用任何真人聲音或外部參考音。複製實驗的參考音也是 VoiceDesign 生成。",
        "lid_validation": validation,
        "qwen3_tts": qwen,
        "voxcpm2": vox,
    }
    (voice_dir / "candidates_r2.json").write_text(json.dumps(cand, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    n = sum(1 for _ in out_audio.glob("*.mp3"))
    print(f"candidates_r2.json 完成；MP3 共 {n} 個")


if __name__ == "__main__":
    main()
