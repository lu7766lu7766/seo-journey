"""第三輪：晴 hare_D、翔 kuro_A、成年女性 npc_woman_A 的重跑（口音 A、設計模式、新版文字預處理與守門）。

輸入（都在 /content）：voices_r3.json、asr_equiv.json、r3_common.py
流程：每句首輪 R3_FIRST_TAKES 個 take（口頭禪 8 個）→ 套 r3_common.gate → 通過數不足 2 個的句子每輪補 1 個 take，最多 max_attempts 輪。
紀錄：每個 take 的完整機器指標（含 SenseVoice 標籤、ASR 首字時間戳與 pyin 兩種 lead）都存在 metrics_r3.json，供校準守門。
輸出：/content/r3_out/（wav/、metrics_r3.json）、/content/r3_bundle.tar.gz
環境變數：R3_FIRST_TAKES（預設 4）、R3_ONLY（逗號分隔的 voice id）、R3_SMOKE=1（每個聲音只跑 1 句、首輪 2 個 take）
"""

import json
import os
import sys
import tarfile
import time
import traceback
from collections import Counter

import numpy as np
import soundfile as sf
import torch

sys.path.insert(0, "/content")
from r3_common import Evaluator, banned_hits, build_instruct, chunks, design_batch, dur_cap, gate, log, norm_text, penalty, prep_text  # noqa: E402

OUT = os.environ.get("R3_OUT", "/content/r3_out")
FIRST = int(os.environ.get("R3_FIRST_TAKES", "4"))
ONLY = [x for x in os.environ.get("R3_ONLY", "").split(",") if x]
SMOKE = os.environ.get("R3_SMOKE") == "1"
BATCH = 12
BASE_SEED = 20261201
WANT_PASS = 2  # 試聽頁每句想放幾個通過的 take


def main():
    from r3_common import load_json

    cfg = load_json("voices_r3.json")
    gates = cfg["gates"]
    voices = {v["id"]: v for v in cfg["voices"]}
    accent = cfg["accent"]
    must = cfg["must_have_phrases"]
    os.makedirs(f"{OUT}/wav_all", exist_ok=True)
    os.makedirs(f"{OUT}/wav", exist_ok=True)

    # 禁用字眼檢查（不通過就中止，不浪費 GPU）
    for vid, lines in cfg["r3_lines"].items():
        for ln in lines:
            bad = banned_hits(ln["emotion_instruct"], cfg["banned_words"])
            assert not bad, f"{ln['id']} 情緒指令含禁用字眼 {bad}：{ln['emotion_instruct']}"
    for cp in cfg["r3_catchphrases"]:
        assert not banned_hits(cp["emotion_instruct"], cfg["banned_words"]), cp

    from qwen_tts import Qwen3TTSModel

    t_start = time.time()
    log("載入 Qwen3-TTS VoiceDesign …")
    model = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
    ev = Evaluator()
    t_loaded = time.time()
    log(f"模型與評測器載入完成 {t_loaded - t_start:.0f}s")

    # ------------------------------------------------------------ slots
    slots = []
    for vid, lines in cfg["r3_lines"].items():
        if ONLY and vid not in ONLY:
            continue
        v = voices[vid]
        for ln in (lines[:1] if SMOKE else lines):
            tts = prep_text(ln["text"])
            nc = len(norm_text(tts))
            slots.append({"voice": vid, "id": ln["id"], "text": ln["text"], "face": ln["face"], "emotion_instruct": ln["emotion_instruct"], "text_tts": tts, "nchar": nc, "catch": False,
                          "must": [p for p in must if p in ln["text"]], "instruct": build_instruct(v["design"], accent, ln["emotion_instruct"]), "cap": dur_cap(gates, nc), "n_first": 2 if SMOKE else FIRST, "takes": []})
    for cp in cfg["r3_catchphrases"]:
        if ONLY and cp["voice_id"] not in ONLY:
            continue
        v = voices[cp["voice_id"]]
        tts = prep_text(cp["text"])
        nc = len(norm_text(tts))
        slots.append({"voice": cp["voice_id"], "id": cp["id"], "text": cp["text"], "face": None, "emotion_instruct": cp["emotion_instruct"], "text_tts": tts, "nchar": nc, "catch": True,
                      "must": [p for p in must if p in cp["text"]], "instruct": build_instruct(v["design"], accent, cp["emotion_instruct"]), "cap": dur_cap(gates, nc) + 1.0, "n_first": 2 if SMOKE else cp["takes"], "takes": []})
    log(f"{len(slots)} 個 slot：" + "、".join(f"{s['voice']}/{s['id']}" for s in slots))

    embs = {}
    gen_total = [0.0, 0]  # 生成秒數、take 數
    eval_total = [0.0]

    def run(items, rnd, bidx):
        seed = BASE_SEED + rnd * 1000 + bidx
        t0 = time.time()
        outs = design_batch(model, items, cfg["language"], seed)
        gen_s = time.time() - t0
        gen_total[0] += gen_s
        gen_total[1] += len(items)
        for it, (wav, sr) in zip(items, outs):
            s = it["slot"]
            ti = len(s["takes"])
            name = f"{s['voice']}__{s['id']}__r{rnd}t{ti}.wav"
            sf.write(f"{OUT}/wav_all/{name}", wav, sr)
            t1 = time.time()
            m = ev.measure(wav, sr, s["text_tts"])
            eval_total[0] += time.time() - t1
            embs[name] = m.pop("_emb")
            ok, fails = gate(m, gates, voices[s["voice"]], s["nchar"], catchphrase=s["catch"], must_have=s["must"])
            m.pop("_hyp_norm", None)
            m.update({"file": name, "order": ti, "round": rnd, "batch_seed": seed, "gen_s_batch": round(gen_s, 1), "batch_n": len(items), "passed": ok, "fails": fails, "penalty": round(penalty(m, fails), 2)})
            s["takes"].append(m)
            log(f"  {s['voice']}/{s['id']} r{rnd}t{ti} dur={m['duration_s']} cer={m['cer']} sv={m['sv_lang']}/{m['sv_event']} f0={m['f0_median_hz']} lead={m['lead_s']} {'PASS' if ok else 'FAIL ' + ','.join(fails)} asr='{m['asr_text']}'")

    def item(s):
        return {"slot": s, "text_tts": s["text_tts"], "instruct": s["instruct"], "cap": s["cap"]}

    # ------------------------------------------------------------ 首輪 + 補抽
    pending = [item(s) for s in slots for _ in range(s["n_first"])]
    rnd = 0
    while pending:
        pending.sort(key=lambda it: it["cap"])
        log(f"== 第 {rnd} 輪：{len(pending)} 個 take；已有 {WANT_PASS} 個通過的 slot {sum(sum(t['passed'] for t in s['takes']) >= WANT_PASS for s in slots)}/{len(slots)} ==")
        for bidx, b in enumerate(chunks(pending, BATCH)):
            run(b, rnd, bidx)
        rnd += 1
        if rnd > gates["max_attempts"]:
            break
        pending = [item(s) for s in slots if sum(t["passed"] for t in s["takes"]) < (1 if SMOKE else WANT_PASS)]

    # ------------------------------------------------------------ 彙整
    out = {"round": 3, "gpu": torch.cuda.get_device_name(0), "gates": gates, "accent": accent, "voices": {}, "load_s": round(t_loaded - t_start, 1), "total_s": 0}
    keep = []
    for vid in sorted({s["voice"] for s in slots}):
        v = voices[vid]
        vs = [s for s in slots if s["voice"] == vid]
        first = [t for s in vs for t in s["takes"] if t["round"] == 0]
        vout = {"id": vid, "label": v["label"], "design": v["design"], "f0_range": v["f0"], "lead_s_max": v.get("lead_s_max", gates["lead_s_max"]), "lines": [],
                "first_round": {"n": len(first), "pass": sum(t["passed"] for t in first), "fails": dict(Counter(f for t in first for f in t["fails"]))}}
        for s in vs:
            okt = sorted([t for t in s["takes"] if t["passed"]], key=lambda t: (t["cer"], t["penalty"]))[:WANT_PASS]
            chosen = [t["file"] for t in okt]
            best_fail = None
            if not okt:
                best_fail = min(s["takes"], key=lambda t: t["penalty"])["file"]
            keep += chosen + ([best_fail] if best_fail else [])
            first_pass = next((t["order"] + 1 for t in s["takes"] if t["passed"]), None)
            r0 = [t for t in s["takes"] if t["round"] == 0]
            sims = None
            if len(chosen) == 2:
                a, b = embs[chosen[0]], embs[chosen[1]]
                sims = round(float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))), 4)
            vout["lines"].append({"id": s["id"], "text": s["text"], "text_tts": s["text_tts"], "face": s["face"], "emotion_instruct": s["emotion_instruct"], "instruct": s["instruct"], "catchphrase": s["catch"],
                                  "nchar": s["nchar"], "first_round_n": len(r0), "first_round_pass": sum(t["passed"] for t in r0), "attempts": len(s["takes"]), "first_pass_attempt": first_pass,
                                  "chosen": chosen, "best_failed": best_fail, "chosen_pair_sim": sims, "takes": s["takes"]})
        out["voices"][vid] = vout
    out["gen_s_per_take"] = round(gen_total[0] / max(1, gen_total[1]), 2)
    out["eval_s_per_take"] = round(eval_total[0] / max(1, gen_total[1]), 2)
    out["takes_total"] = gen_total[1]
    out["total_s"] = round(time.time() - t_start, 1)
    for f in set(keep):
        os.replace(f"{OUT}/wav_all/{f}", f"{OUT}/wav/{f}")
    with open(f"{OUT}/metrics_r3.json", "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1, default=str)
    with tarfile.open("/content/r3_bundle.tar.gz", "w:gz") as tar:
        tar.add(f"{OUT}/wav", arcname="r3_out/wav")
        tar.add(f"{OUT}/metrics_r3.json", arcname="r3_out/metrics_r3.json")
    log(f"DONE: {gen_total[1]} 個 take，生成 {out['gen_s_per_take']}s/take、評測 {out['eval_s_per_take']}s/take，總 {out['total_s'] / 60:.1f} min；保留 {len(set(keep))} 個音檔")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        print("Traceback: generation failed", flush=True)
        sys.exit(1)
