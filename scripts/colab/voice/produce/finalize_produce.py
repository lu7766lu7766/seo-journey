"""量產後處理（本機）：把 raw/wav 裡通過守門的 WAV 轉成 MP3、放進 public/audio/voice/<sceneId>/<key>.mp3，並更新 manifest.json。

- 後處理用 postprocess_r4.to_mp3：去頭尾靜音（−45 dB）→ 短句／高峰值句先過溫和壓縮＋軟限幅 → 增益到 −16.7 LUFS（區間 −17.5～−16.0）→ 前後各 12 ms 淡入淡出 →
  單聲道 24 kHz MP3 48 kbps；以編碼後實測為準，true peak 必須 ≤ −2 dBTP，否則降增益重編（第二輪的 −1 dBTP 門檻已收緊）。
- key 以 src/audio/voiceKey.ts 的規則在這裡重算一次（SHA-1 前 12 碼，說話者部分 npc 為 `npc:<名牌>`）驗證，不一致就報錯。
- 可重複執行：已轉過且 WAV 沒更新的 MP3 跳過；manifest 只增補／更新本次處理的條目，其餘保留；--prune 才會移除不在目前 voice-lines.json 內的條目。

用法：python3 finalize_produce.py --raw <WORK>/raw --public <public/audio/voice> [--lines scripts/audio/voice-lines.json] [--force] [--prune]
輸出摘要到 stdout，並寫 <WORK>/finalize_summary.json（--summary 可改路徑）。
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from postprocess_r4 import BAND, TP_MAX, duration, mp3_stats, to_mp3  # noqa: E402,F401


def voice_key(speaker, text, npc_name=None):
    who = f"npc:{npc_name or ''}" if speaker == "npc" else speaker
    return hashlib.sha1(f"{who}\n{text}".encode("utf-8")).hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--public", required=True)
    ap.add_argument("--lines", default=str(HERE.parents[3] / "scripts/audio/voice-lines.json"))
    ap.add_argument("--summary")
    ap.add_argument("--hardware", default="", help="Colab 實際取得的卡型（driver 傳入）；VM 端的 GPU 名稱與精度另從 report.json 讀")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--prune", action="store_true")
    a = ap.parse_args()
    raw, public = Path(a.raw), Path(a.public)
    public.mkdir(parents=True, exist_ok=True)
    manifest_path = public / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    lines = {f"{l['sceneId']}/{l['key']}": l for l in json.loads(Path(a.lines).read_text(encoding="utf-8"))["lines"]}
    cache_path = raw.parent / "mp3_stats.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}

    done, converted, skipped, key_errors, stale_audio = 0, 0, 0, [], []
    for side in sorted((raw / "wav").glob("*/*.json")):
        meta = json.loads(side.read_text(encoding="utf-8"))
        lid = meta["id"]
        wav = side.with_suffix(".wav")
        if not wav.exists() or meta.get("status") != "done":
            continue
        ln = lines.get(lid.split("@")[0])  # "<id>@<variant>"：A/B 對照用的聲音描述變體（只轉 MP3、不進 manifest）
        if ln is None:
            stale_audio.append(lid)  # 劇本已改、這句不存在了
            continue
        k = voice_key(ln["speaker"], ln["text"], ln.get("name"))
        if k != ln["key"] or lid.split("@")[0] != f"{ln['sceneId']}/{k}":
            key_errors.append({"id": lid, "expected": k, "got": ln["key"]})
            continue
        dst = public / meta["scene"] / f"{meta['key']}.mp3"
        dst.parent.mkdir(parents=True, exist_ok=True)
        done += 1
        if dst.exists() and not a.force and dst.stat().st_mtime >= wav.stat().st_mtime and cache.get(lid, {}).get("pp") == 4:  # pp=4：舊版（第二輪）後處理的快取不算，會重轉
            skipped += 1
            st = cache[lid]
        else:
            st = to_mp3(wav, dst)
            cache[lid] = st
            converted += 1
        if "@" in lid:
            continue
        manifest[lid] = {"src": f"/audio/voice/{meta['scene']}/{meta['key']}.mp3", "duration": st["duration_s"]}

    pruned = []
    if a.prune:
        for k in list(manifest):
            if k not in lines:
                pruned.append(k)
                del manifest[k]
    manifest_path.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    cache_path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")

    rep_path = raw.parent / "report.json"
    rep = json.loads(rep_path.read_text(encoding="utf-8")) if rep_path.exists() else {}
    mine = [cache[i] for i in cache if i in manifest]
    size = sum((public / i.split("/")[0] / f"{i.split('/')[1]}.mp3").stat().st_size for i in manifest if (public / i.split("/")[0] / f"{i.split('/')[1]}.mp3").exists())
    summary = {
        "mp3_total": len(manifest), "this_run_converted": converted, "this_run_skipped": skipped, "total_mb": round(size / 1e6, 2), "total_duration_s": round(sum(m["duration"] for m in manifest.values()), 1),
        "lufs_min": min((m["lufs"] for m in mine), default=None), "lufs_max": max((m["lufs"] for m in mine), default=None), "true_peak_max_dbtp": max((m["true_peak_dbtp"] for m in mine), default=None),
        "compressed": sum(1 for m in mine if m.get("compress")), "out_of_range": [i for i in cache if i in manifest and not (BAND[0] <= cache[i]["lufs"] <= BAND[1] and cache[i]["true_peak_dbtp"] <= TP_MAX)], "key_errors": key_errors, "stale_audio": stale_audio, "pruned": pruned,
        "gpu": a.hardware or None, "gpu_name": rep.get("gpu"), "precision": rep.get("precision"), "fp32_fallback": rep.get("fp32_fallback"), "batch": rep.get("batch"),
        "lines_in_script": len(lines), "lines_with_voice": sum(1 for i in lines if i in manifest),
    }
    Path(a.summary or raw.parent / "finalize_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    if key_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
