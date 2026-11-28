"""Objectively rank triage candidates and pick the best 4 per sound effect.

Reads triage_summary.json (from `postprocess.py --mode triage`) plus the raw
generation_manifest.json and writes a selection.json for `postprocess.py --mode finalize`.

The score only uses measurable properties (no listening): cleanliness, onset clarity,
low noise floor, natural ending (not cut mid-ring), suitable length, no clipping.
Candidates are ordered best-first, so c1 is the objective recommendation.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

LOUD_TARGET = {"standard": -17.0, "quiet_click": -24.5, "quiet_blip": -26.0}
MAX_SYNTH = 2      # click/blip may include at most this many synth candidates
MIN_AI = 2         # ... and always at least this many AI candidates
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
    parts["length"] = 0.0 if m["in_target_duration"] else -20.0
    if sfx_id in ("click", "blip"):
        parts["length"] -= dur * 0.10
        parts["decay"] = -m["decay_t30_ms"] * 0.12
        # low-key and pitched: penalise hissy, very bright spectra
        parts["brightness"] = -max(0.0, m["spectral_centroid_hz"] - 5000.0) / 400.0
    # Mostly-silent clips (short sound zero-padded up to the minimum length) are less useful.
    if sfx_id not in ("click", "blip"):
        parts["padding"] = -max(0.0, 0.6 - m["active_ms"] / max(dur, 1.0)) * 40.0
    # Loudness consistency within the tier (after normalisation)
    parts["loudness"] = -abs(m["loudness_lkfs"] - LOUD_TARGET[tier]) * 1.0
    parts["clipping"] = -100.0 if m["clipping"] else 0.0
    return round(sum(parts.values()), 2), {k: round(v, 2) for k, v in parts.items()}


def pick(items: list[dict], sfx_id: str) -> list[dict]:
    items = sorted(items, key=lambda x: -x["score"])
    chosen: list[dict] = []
    per_prompt: dict[str, int] = {}
    synth_n = 0
    # Pass 1: greedy by score under variety / synth caps
    for it in items:
        if len(chosen) == 4:
            break
        if it["source"] == "synth" and synth_n >= MAX_SYNTH:
            continue
        if per_prompt.get(it["prompt_id"], 0) >= MAX_PER_PROMPT and it["source"] == "ai":
            continue
        chosen.append(it)
        per_prompt[it["prompt_id"]] = per_prompt.get(it["prompt_id"], 0) + 1
        synth_n += it["source"] == "synth"
    # Guarantee at least MIN_AI AI candidates for click/blip
    ai_n = sum(c["source"] == "ai" for c in chosen)
    if sfx_id in ("click", "blip") and ai_n < MIN_AI:
        spare = [i for i in items if i["source"] == "ai" and i not in chosen]
        weakest_synth = [c for c in sorted(chosen, key=lambda x: x["score"]) if c["source"] == "synth"]
        for s_it, a_it in zip(weakest_synth, spare):
            chosen[chosen.index(s_it)] = a_it
            ai_n += 1
            if ai_n >= MIN_AI:
                break
    # Fill if variety cap left us short
    for it in items:
        if len(chosen) == 4:
            break
        if it not in chosen:
            chosen.append(it)
    return sorted(chosen, key=lambda x: -x["score"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--triage", type=Path, required=True)
    ap.add_argument("--raw-dir", type=Path, required=True)
    ap.add_argument("--prompts", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    triage = json.loads(args.triage.read_text(encoding="utf-8"))["sounds"]
    manifest = json.loads((args.raw_dir / "generation_manifest.json").read_text(encoding="utf-8"))
    raw_by_key = {Path(e["rel_path"]).stem: e.get("raw_stats") for e in manifest["entries"]}
    cfg = json.loads(args.prompts.read_text(encoding="utf-8"))

    selection: dict[str, dict] = {}
    report: dict[str, list] = {}
    for sound in cfg["sounds"]:
        sid = sound["id"]
        tier = sound["loudness_tier"]
        items = triage[sid]
        for it in items:
            it["score"], it["score_parts"] = score(it, sid, tier, raw_by_key.get(it["key"]), sound["target_duration_ms"])
        chosen = pick(items, sid)
        notes = {}
        for it in chosen:
            m = it["metrics"]
            notes[it["key"]] = (
                f"客觀分數 {it['score']:.1f}；SNR {m['snr_db']:.0f} dB、起音前靜音 {m['pre_attack_silence_ms']:.1f} ms、"
                f"淡出前殘餘 {m['pre_fade_level_db']:.0f} dB、衰減 {m['decay_t30_ms']:.0f} ms"
            )
        top = chosen[0]
        selection[sid] = {
            "candidates": [c["key"] for c in chosen],
            "recommended": "c1",
            "reason": (
                f"依客觀指標排名第 1（分數 {top['score']:.1f}，"
                f"{'Python 合成' if top['source'] == 'synth' else 'AI 生成'}）：無削波、"
                f"SNR {top['metrics']['snr_db']:.0f} dB、起音前靜音 {top['metrics']['pre_attack_silence_ms']:.1f} ms、"
                f"結尾淡出前殘餘 {top['metrics']['pre_fade_level_db']:.0f} dB（越低越代表自然收尾）。"
                "此為依數據的建議，未經人耳確認。"
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
