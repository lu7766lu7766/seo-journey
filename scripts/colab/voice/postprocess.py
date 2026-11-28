"""本機後處理：把 Colab 挑出的 take 轉成遊戲用的 MP3，並輸出 candidates.json。

- 去頭尾靜音（ffmpeg silenceremove）
- 響度統一到約 -16 LUFS（loudnorm 兩段式、linear）
- 單聲道、24 kHz、LAME 48 kbps
只用 ffmpeg 與標準函式庫（不需要 numpy）。

用法：python3 postprocess.py <voice_dir>   （voice_dir 內需有 raw/voice_out/{wav,metrics.json}）
"""

import json
import subprocess
import sys
from pathlib import Path

TARGET_LUFS = -16.0
TRUE_PEAK = -1.5
LRA = 11
SCRIPT_DIR = Path(__file__).resolve().parent

TRIM = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:detection=peak,areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05:detection=peak,areverse"


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def _loudnorm_json(src, chain):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", f"{chain},loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA={LRA}:print_format=json", "-f", "null", "-"])
    txt = r.stderr
    return json.loads(txt[txt.rfind("{") : txt.rfind("}") + 1])


def measure_loudnorm(src):
    m = _loudnorm_json(src, TRIM)
    if m["input_i"] in ("-inf", "inf"):
        # 去靜音後不到 0.4 秒（例如「……謝了。」），loudnorm 的閘門量不到響度；把片段重複 6 次再量，積分響度等同原片段
        m = _loudnorm_json(src, TRIM + ",aloop=loop=6:size=2147483647")
    return m


def to_mp3(src, dst):
    m = measure_loudnorm(src)
    ln = (
        f"loudnorm=I={TARGET_LUFS}:TP={TRUE_PEAK}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
        f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    )
    # loudnorm 內部會升取樣，之後再降到 24k 並補上極短淡出以免爆音
    af = f"{TRIM},{ln},aresample=24000,afade=t=in:d=0.01"
    r = run(["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-af", af, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", "48k", str(dst)])
    if r.returncode != 0:
        raise RuntimeError(r.stderr[-800:])


def probe(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration,bit_rate", "-of", "json", str(path)])
    f = json.loads(r.stdout)["format"]
    return float(f["duration"]), int(float(f["bit_rate"]))


def final_lufs(path):
    r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "loudnorm=I=-16:print_format=json", "-f", "null", "-"])
    txt = r.stderr
    d = json.loads(txt[txt.rfind("{") : txt.rfind("}") + 1])
    if d["input_i"] in ("-inf", "inf"):  # 太短量不到，改量重複 6 次的版本
        r = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", "aloop=loop=6:size=2147483647,loudnorm=I=-16:print_format=json", "-f", "null", "-"])
        txt = r.stderr
        d = json.loads(txt[txt.rfind("{") : txt.rfind("}") + 1])
    return float(d["input_i"]), float(d["input_tp"])


def main():
    voice_dir = Path(sys.argv[1])
    raw = voice_dir / "raw" / "voice_out"
    metrics = json.loads((raw / "metrics.json").read_text(encoding="utf-8"))
    chars = json.loads((SCRIPT_DIR / "characters.json").read_text(encoding="utf-8"))
    cmeta = {c["id"]: c for c in chars["characters"]}
    out_audio = voice_dir / "audio"
    out_audio.mkdir(exist_ok=True)

    voices_out = []
    for v in metrics["voices"]:
        ch = cmeta[v["character"]]
        lines_out = []
        for ln in v["lines"]:
            dst = out_audio / f"{v['id']}__{ln['id']}.mp3"
            to_mp3(raw / "wav" / ln["chosen_file"], dst)
            dur, br = probe(dst)
            lufs, tp = final_lufs(dst)
            chosen = next(t for t in ln["takes"] if t["take"] == ln["chosen_take"])
            lines_out.append(
                {
                    "id": ln["id"],
                    "text": ln["text"],
                    "emotion": ln["emotion"],
                    "face": ln["face"],
                    "emotion_instruct": ln["emotion_instruct"],
                    "instruct": ln["instruct"],
                    "seed": ln["chosen_seed"],
                    "take": ln["chosen_take"],
                    "mp3": f"audio/{dst.name}",
                    "duration_s": round(dur, 2),
                    "bitrate_bps": br,
                    "lufs": round(lufs, 1),
                    "true_peak_dbtp": round(tp, 1),
                    "cer": chosen["cer"],
                    "asr_text": chosen["asr_text"],
                    "f0_median_hz": chosen["f0_median_hz"],
                    "chars_per_s": chosen["chars_per_s"],
                    "center_sim": chosen.get("center_sim"),
                    "all_takes": [{"take": t["take"], "seed": t["seed"], "cer": t["cer"], "score": t.get("score")} for t in ln["takes"]],
                }
            )
        clone = v.get("clone_mode", {})
        clone_out = None
        if "lines" in clone:
            clone_lines = []
            for cl in clone["lines"]:
                dst = out_audio / f"{v['id']}__{cl['id']}__clone.mp3"
                to_mp3(raw / "wav" / cl["file"], dst)
                clone_lines.append({"id": cl["id"], "mp3": f"audio/{dst.name}", "seed": cl["seed"], "cer": cl["cer"], "f0_median_hz": cl["f0_median_hz"]})
            ref_dst = out_audio / f"{v['id']}__ref.mp3"
            to_mp3(raw / "wav" / clone["ref_file"], ref_dst)
            clone_out = {
                "ref_mp3": f"audio/{ref_dst.name}",
                "ref_text": metrics["ref_text"],
                "ref_seed": clone["ref_seed"],
                "consistency": clone["consistency"],
                "sim_to_ref": clone["sim_to_ref"],
                "design_sim_to_ref": clone["design_sim_to_ref"],
                "lines": clone_lines,
            }
        voices_out.append(
            {
                "id": v["id"],
                "character": v["character"],
                "character_name": ch["name"],
                "character_role": ch["role"],
                "character_profile": ch["profile"],
                "label": v["label"],
                "seed_base": v["seed"],
                "design_prompt": v["design"],
                "design_mode_consistency": v["design_mode_consistency"],
                "mean_cer": round(sum(l["cer"] for l in lines_out) / len(lines_out), 4),
                "mean_f0_hz": round(sum(l["f0_median_hz"] for l in lines_out) / len(lines_out), 1),
                "mean_chars_per_s": round(sum(l["chars_per_s"] for l in lines_out) / len(lines_out), 2),
                "lines": lines_out,
                "clone_experiment": clone_out,
            }
        )

    # 客觀推薦：每個角色在其候選中，依 (4 句平均 CER 越低越好) 與 (跨句說話人一致性越高越好) 排序
    by_char = {}
    for v in voices_out:
        by_char.setdefault(v["character"], []).append(v)
    recommendations = {}
    for cid, vs in by_char.items():
        if len(vs) == 1:
            recommendations[cid] = {"voice_id": vs[0]["id"], "reason": "僅一個候選。"}
            continue
        best = min(vs, key=lambda v: v["mean_cer"] + 2.0 * (1 - (v["design_mode_consistency"] or 0)))
        other = [v for v in vs if v is not best][0]
        recommendations[cid] = {
            "voice_id": best["id"],
            "reason": (
                f"客觀指標較佳：4 句平均字錯率 {best['mean_cer']:.3f}（對手 {other['mean_cer']:.3f}）、"
                f"跨句說話人一致性 {best['design_mode_consistency']:.3f}（對手 {other['design_mode_consistency']:.3f}）。"
                "此為機器指標，未代表聽感，請人耳確認。"
            ),
        }
    cand = {
        "generated_by": "scripts/colab/voice/run_colab.sh",
        "model": metrics["model"],
        "gpu": metrics["gpu"],
        "language": metrics["language"],
        "gen_params": metrics["gen_params"],
        "takes_per_line": metrics["takes_per_line"],
        "seed_rule": metrics["seed_rule"],
        "postprocess": {"trim": "silenceremove -45dB 頭尾", "loudness": f"loudnorm 兩段式 I={TARGET_LUFS} LUFS TP={TRUE_PEAK}", "format": "mono 24kHz MP3 LAME 48kbps"},
        "cross_voice_cosine": metrics.get("cross_voice_cosine", {}),
        "total_minutes": metrics.get("total_minutes"),
        "recommendations": recommendations,
        "ethics_note": "所有聲音皆由 Qwen3-TTS VoiceDesign 以文字描述生成；未使用任何真人聲音或外部參考音。複製實驗的參考音也是 VoiceDesign 生成。",
        "voices": voices_out,
    }
    (voice_dir / "candidates.json").write_text(json.dumps(cand, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"candidates.json：{len(voices_out)} 個聲音、{sum(len(v['lines']) for v in voices_out)} 句")


if __name__ == "__main__":
    main()
