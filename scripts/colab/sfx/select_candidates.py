"""Objectively rank triage candidates and pre-screen candidates per sound effect.

Reads triage_summary.json (from `postprocess.py --mode triage`) plus optional raw
generation_manifest.json and writes a selection.json for `postprocess.py --mode finalize`.

Also exports ranked audit metadata so a human/agent can listen to ALL candidates
and override the selection/recommended slot before finalizing.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

LOUD_TARGET = {"standard": -17.0, "quiet_click": -24.5, "quiet_blip": -26.0}
MAX_PER_PROMPT = 2  # keep some variety between prompt variants


def score(item: dict, sfx_id: str, tier: str, raw_stats: dict | None, target_ms: list[float]) -> tuple[float, dict]:
    m = item["metrics"]
    parts: dict[str, float] = {}

    # Cleanliness: SNR of processed clip (capped) and raw-file SNR from the generation manifest.
    parts["snr"] = min(m["snr_db"], 60.0) * 0.30
    if raw_stats:
        parts["raw_snr"] = min(raw_stats.get("snr_est_db", 60.0), 100.0) * 0.10
    else:
        parts["raw_snr"] = 100.0 * 0.10
    parts["tail_noise"] = -max(0.0, m["tail_rms_dbfs"] + 80.0) * 0.20 if m["tail_rms_dbfs"] > -80 else 0.0

    # Onset: pre-attack silence should be 2-5 ms.
    pre = m["pre_attack_silence_ms"]
    parts["onset"] = -(max(0.0, 2.0 - pre) + max(0.0, pre - 5.0)) * 3.0

    # Natural ending: penalise clips cut while still ringing (level just before the fade vs. peak).
    parts["natural_end"] = -max(0.0, m["pre_fade_level_db"] + 35.0) * 0.60

    # Length: inside the target range, and shorter-is-better for the micro sounds.
    dur = m["duration_ms"]
    parts["length"] = 0.0 if m["in_target_duration"] else -25.0
    cent = m["spectral_centroid_hz"]
    if sfx_id in ("click", "blip"):
        parts["length"] -= dur * 0.08
        parts["decay"] = -m["decay_t30_ms"] * 0.10
        # Strict high-frequency rejection: >2200 Hz penalized heavily; target 550-1300 Hz
        if cent > 2200.0:
            parts["brightness"] = -100.0 - (cent - 2200.0) / 100.0
        else:
            parts["brightness"] = -max(0.0, cent - 1300.0) / 150.0
        parts["above_4k"] = -m.get("band_above_4k_ratio", 0.0) * 80.0
    else:
        # Standard SFX: penalize harsh piercing spectra > 5500 Hz
        if cent > 5500.0:
            parts["brightness"] = -(cent - 5500.0) / 250.0
        parts["padding"] = -max(0.0, 0.6 - m["active_ms"] / max(dur, 1.0)) * 45.0

    # Pitch contour cues for choice (ascending) and fail (descending)
    f0_trend = m.get("f0_trend_semitones", 0.0)
    if sfx_id == "choice":
        if f0_trend >= 1.8:
            parts["contour"] = min(12.0, f0_trend * 1.5)
        elif f0_trend < 0.5:
            parts["contour"] = -12.0
    elif sfx_id == "fail":
        if f0_trend <= -1.8:
            parts["contour"] = min(12.0, abs(f0_trend) * 1.5)
        elif f0_trend > -0.5:
            parts["contour"] = -12.0
        if m["active_ms"] < 350.0:
            parts["too_short_fail"] = -18.0
    elif sfx_id == "shock":
        # Prefer punchy onset with crisp body without harsh piercing highs
        if cent > 4500.0:
            parts["shock_bright"] = -(cent - 4500.0) / 300.0

    # Loudness consistency within the tier (after normalisation)
    parts["loudness"] = -abs(m["loudness_lkfs"] - LOUD_TARGET[tier]) * 1.0
    parts["clipping"] = -100.0 if m["clipping"] else 0.0
    return round(sum(parts.values()), 2), {k: round(v, 2) for k, v in parts.items()}


def pick(items: list[dict], sfx_id: str) -> list[dict]:
    items = sorted(items, key=lambda x: -x["score"])
    chosen: list[dict] = []
    per_prompt: dict[str, int] = {}
    for it in items:
        if len(chosen) == 4:
            break
        if it["source"] == "ai" and per_prompt.get(it["prompt_id"], 0) >= MAX_PER_PROMPT:
            continue
        chosen.append(it)
        per_prompt[it["prompt_id"]] = per_prompt.get(it["prompt_id"], 0) + 1
    for it in items:
        if len(chosen) == 4:
            break
        if it not in chosen:
            chosen.append(it)
    return sorted(chosen, key=lambda x: -x["score"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--triage", type=Path, required=True)
    ap.add_argument("--raw-dir", type=Path, default=None)
    ap.add_argument("--prompts", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--sfx-only", default="", help="Comma-separated sfx IDs to select")
    args = ap.parse_args()

    triage = json.loads(args.triage.read_text(encoding="utf-8"))["sounds"]
    raw_by_key: dict[str, dict | None] = {}
    if args.raw_dir and (args.raw_dir / "generation_manifest.json").exists():
        manifest = json.loads((args.raw_dir / "generation_manifest.json").read_text(encoding="utf-8"))
        raw_by_key = {Path(e["rel_path"]).stem: e.get("raw_stats") for e in manifest["entries"]}
    cfg = json.loads(args.prompts.read_text(encoding="utf-8"))

    only_set = {s.strip() for s in args.sfx_only.split(",") if s.strip()} if args.sfx_only else None
    selection: dict[str, dict] = {}
    report: dict[str, list] = {}
    for sound in cfg["sounds"]:
        sid = sound["id"]
        if only_set is not None and sid not in only_set:
            continue
        items = triage.get(sid, [])
        if not items:
            continue
        tier = sound["loudness_tier"]
        for it in items:
            it["score"], it["score_parts"] = score(it, sid, tier, raw_by_key.get(it["key"]), sound["target_duration_ms"])
        chosen = pick(items, sid)
        notes = {}
        for it in chosen:
            m = it["metrics"]
            notes[it["key"]] = (
                f"客觀分數 {it['score']:.1f}；SNR {m['snr_db']:.0f} dB、質心 {m['spectral_centroid_hz']:.0f} Hz、"
                f"起音前靜音 {m['pre_attack_silence_ms']:.1f} ms、淡出前殘餘 {m['pre_fade_level_db']:.0f} dB、"
                f"音高趨勢 {m.get('f0_trend_semitones', 0.0):+.1f} st"
            )
        top = chosen[0]
        selection[sid] = {
            "candidates": [c["key"] for c in chosen],
            "recommended": "c1",
            "reason": (
                f"依客觀指標初選排名第 1（分數 {top['score']:.1f}，"
                f"{'Python 物理合成' if top['source'] == 'synth' else 'AI 生成'}）：待人耳實聽確認。"
            ),
            "candidate_notes": notes,
        }
        report[sid] = [
            {"key": it["key"], "score": it["score"], "parts": it["score_parts"], "picked": it in chosen}
            for it in sorted(items, key=lambda x: -x["score"])
        ]
        print(f"[select] {sid}: " + ", ".join(f"{c['key']}({c['score']:.1f})" for c in chosen))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(selection, ensure_ascii=False, indent=2), encoding="utf-8")
    args.out.with_name(args.out.stem + "_scores.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
