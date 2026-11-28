"""第二輪：Qwen3-TTS VoiceDesign 角色試聽樣本（文字預處理 + 正向口音提示詞 + 自動守門 + 重抽）。

階段：
  1. 設計模式：13 個聲音 × 口音提示詞 A/B（＋C 無提示對照）× 4 句。第 0 輪每句 2 個 take（做口音提示詞的公平比較，
     只看「第 0 輪 take」的守門通過率），之後只對未通過的 A/B 重抽（每輪 1 個 take，最多 max_rounds 輪），仍失敗就記錄。
  2. 設計→複製：對每個聲音挑通過率較高的口音版本，先生成中性參考句（同樣過守門），通過才建立 clone prompt 並唸 4 句（同樣過守門）。
  3. 口頭禪獨立抽測：「已讀取。」「結論先說！」等，每個聲音×口音抽 N 個 take，要求 CER = 0。

守門（見 r2_common.gate）：Whisper-large-v3 語種偵測（yue 最高或機率 > 0.1 淘汰）、Paraformer-zh CER、F0 區間、長度上限、
首個有聲段起點（句首喘氣）、尾端能量（不收尾）。所有 take 的結果都記錄在 metrics_r2.json。

只用 VoiceDesign 生成的音訊當參考音；不載入任何外部人聲。
輸入：/content/voices_r2.json、/content/characters.json、/content/r2_common.py
輸出：/content/r2_out/、/content/r2_bundle.tar.gz
"""

import json
import os
import random
import sys
import tarfile
import time
import traceback
from collections import Counter, defaultdict

import numpy as np
import soundfile as sf
import torch

sys.path.insert(0, "/content")
from r2_common import Evaluator, build_instruct, cos, gate, log, norm_text, prep_text  # noqa: E402

OUT = os.environ.get("R2_OUT", "/content/r2_out")
TAG = os.path.basename(OUT)
ONLY = [x for x in os.environ.get("R2_ONLY", "").split(",") if x]
SMOKE = os.environ.get("R2_SMOKE") == "1"
BATCH = int(os.environ.get("R2_BATCH", "12"))
FIRST_ROUND_TAKES = int(os.environ.get("R2_FIRST_TAKES", "2"))
BASE_SEED = 20261128
TOK_PER_S = 12.5
GEN_KW = dict(do_sample=True, top_k=50, top_p=1.0, temperature=0.9, repetition_penalty=1.05)


def set_seed(s):
    random.seed(s)
    np.random.seed(s)
    torch.manual_seed(s)
    torch.cuda.manual_seed_all(s)


def tok_budget(items, gates):
    cap = max(it["cap"] for it in items)
    return int(cap * TOK_PER_S) + 12


def design_batch(model, items, lang, seed, gates):
    """一批（instruct, text）一起生成；OOM 時折半重試。回傳 [(wav, sr)]。"""
    set_seed(seed)
    try:
        wavs, sr = model.generate_voice_design(text=[it["text_tts"] for it in items], language=[lang] * len(items), instruct=[it["instruct"] for it in items], max_new_tokens=tok_budget(items, gates), **GEN_KW)
        return [(np.asarray(w, dtype=np.float32), sr) for w in wavs]
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        if len(items) == 1:
            raise
        h = len(items) // 2
        return design_batch(model, items[:h], lang, seed, gates) + design_batch(model, items[h:], lang, seed + 1, gates)


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]


def main():
    cfg = json.load(open("/content/voices_r2.json", encoding="utf-8"))
    chars = {c["id"]: c for c in json.load(open("/content/characters.json", encoding="utf-8"))["characters"]}
    gates = cfg["gates"]
    lang = cfg["language"]
    os.makedirs(f"{OUT}/wav_all", exist_ok=True)
    os.makedirs(f"{OUT}/wav", exist_ok=True)

    from qwen_tts import Qwen3TTSModel

    log("載入 Qwen3-TTS VoiceDesign …")
    design = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
    ev = Evaluator()
    t_start = time.time()

    voices = cfg["voices"]
    primary = cfg["primary_accents"]
    control = [] if os.environ.get("R2_NO_CONTROL") == "1" else cfg["control_accents"]
    if ONLY:
        voices = [v for v in voices if v["id"] in ONLY]
    elif any(v.get("round_b") for v in voices):
        voices = [v for v in voices if not v.get("round_b")]  # 補測聲音只在指定 R2_ONLY 時跑
    if SMOKE:
        voices = [v for v in voices if v["id"] in ("hare_A", "kuro_A")]
        gates = dict(gates, max_rounds=1)

    import importlib.metadata as md

    result = {
        "round": 2,
        "model": {"design": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", "clone": "Qwen/Qwen3-TTS-12Hz-1.7B-Base", "license": "Apache-2.0", "qwen_tts": md.version("qwen-tts"), "transformers": md.version("transformers"), "torch": torch.__version__},
        "evaluators": {"language_id": "openai/whisper-large-v3 (語種偵測，含 yue)", "asr": "funasr paraformer-zh（純普通話 ASR）", "speaker": "microsoft/wavlm-base-plus-sv", "f0": "librosa.pyin 16kHz"},
        "gpu": torch.cuda.get_device_name(0),
        "gen_params": GEN_KW,
        "gates": gates,
        "accents": cfg["accents"],
        "seed_rule": f"批次生成：每批 set_seed(batch_seed)（random/numpy/torch/cuda），batch_seed = {BASE_SEED} + round*1000 + batch_idx；take 記錄中有 batch_seed。批次內的個別 take 不可單獨重現，穩定保住聲音請靠保存的 WAV 檔。",
        "first_round_takes": FIRST_ROUND_TAKES,
        "batch_size": BATCH,
        "voices": [],
    }

    # ------------------------------------------------------------ 建立 slots
    slots = []
    for v in voices:
        ch = chars[v["character"]]
        lines = ch["lines"][:2] if SMOKE else ch["lines"]
        for a in primary + control:
            accent_txt = cfg["accents"][a]
            for ln in lines:
                text_tts = prep_text(ln["text"])
                slots.append(
                    {
                        "voice": v["id"], "accent": a, "kind": "control" if a in control else "primary", "line_id": ln["id"],
                        "text": ln["text"], "text_tts": text_tts, "emotion": ln["emotion"], "face": ln["face"], "emotion_instruct": ln["emotion_instruct"],
                        "instruct": build_instruct(v["design"], accent_txt, ln["emotion_instruct"]), "nchar": len(norm_text(text_tts)),
                        "cap": gates["dur_cap"]["base_s"] + gates["dur_cap"]["per_char_s"] * len(norm_text(text_tts)),
                        "f0": v["f0"], "takes": [], "passed": False,
                    }
                )
    vmap = {v["id"]: v for v in voices}
    embs = {}  # file -> embedding

    def run_takes(batch_items, rnd, bidx, mode="design", clone_prompts=None):
        seed = BASE_SEED + rnd * 1000 + bidx
        t0 = time.time()
        outs = design_batch(design, batch_items, lang, seed, gates)
        gen_s = time.time() - t0
        for it, (wav, sr) in zip(batch_items, outs):
            s = it["slot"]
            ti = len(s["takes"])
            name = f"{s['voice']}__{s['accent']}__{s['line_id']}__r{rnd}t{ti}.wav"
            sf.write(f"{OUT}/wav_all/{name}", wav, sr)
            m = ev.measure(wav, sr, s["text_tts"])
            embs[name] = m.pop("_emb")
            ok, fails = gate(m, gates, s["f0"], s["nchar"])
            m.update({"file": name, "round": rnd, "batch_seed": seed, "gen_s_batch": round(gen_s, 1), "batch_n": len(batch_items), "passed": ok, "fails": fails})
            s["takes"].append(m)
            if ok:
                s["passed"] = True
            log(f"  {s['voice']}/{s['accent']}/{s['line_id']} r{rnd}t{ti} dur={m['duration_s']} cer={m['cer']} yue={m['yue_prob']} f0={m['f0_median_hz']} {'PASS' if ok else 'FAIL ' + ','.join(fails)} asr='{m['asr_text']}'")

    def save_progress():
        with open(f"{OUT}/metrics_r2.json", "w", encoding="utf-8") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=1, default=str)

    # ------------------------------------------------------------ 階段 1：設計模式（含重抽）
    rnd = 0
    pending = []
    for s in slots:
        for _ in range(FIRST_ROUND_TAKES):
            pending.append({"slot": s, "text_tts": s["text_tts"], "instruct": s["instruct"], "cap": s["cap"]})
    while pending:
        pending.sort(key=lambda it: it["cap"])
        log(f"== 第 {rnd} 輪：{len(pending)} 個 take，{len(slots)} slots，已通過 {sum(s['passed'] for s in slots)} ==")
        for bidx, batch_items in enumerate(chunks(pending, BATCH)):
            run_takes(batch_items, rnd, bidx)
        rnd += 1
        if rnd > gates["max_rounds"]:
            break
        pending = [{"slot": s, "text_tts": s["text_tts"], "instruct": s["instruct"], "cap": s["cap"]} for s in slots if s["kind"] == "primary" and not s["passed"]]
        result["_progress"] = {"round": rnd, "elapsed_min": round((time.time() - t_start) / 60, 1), "primary_pass": sum(s["passed"] for s in slots if s["kind"] == "primary"), "primary_total": sum(1 for s in slots if s["kind"] == "primary")}
        save_progress()
    log(f"PASS design stage done：primary 通過 {sum(s['passed'] for s in slots if s['kind'] == 'primary')}/{sum(1 for s in slots if s['kind'] == 'primary')}，elapsed={(time.time() - t_start) / 60:.1f}min")

    # ------------------------------------------------------------ 彙整設計模式
    def pick(s):
        okt = [t for t in s["takes"] if t["passed"]]
        if not okt:
            return None
        return min(okt, key=lambda t: t["cer"] + 0.02 * t["round"])

    # 每個 voice×accent 的中心嵌入（只用通過的 take）
    centers = {}
    for v in voices:
        for a in primary + control:
            es = [embs[t["file"]] for s in slots if s["voice"] == v["id"] and s["accent"] == a for t in s["takes"] if t["passed"]]
            if es:
                c = np.mean(es, axis=0)
                centers[(v["id"], a)] = c / np.linalg.norm(c)
    first_round_stats = defaultdict(lambda: {"n": 0, "pass": 0, "fails": Counter(), "yue": 0, "cer": [], "f0": []})
    for s in slots:
        for t in s["takes"]:
            if t["round"] == 0:
                for key in [(s["voice"], s["accent"]), ("ALL", s["accent"]), (s["voice"], "ALL")]:
                    st = first_round_stats[key]
                    st["n"] += 1
                    st["pass"] += t["passed"]
                    st["fails"].update(t["fails"])
                    st["yue"] += "yue" in t["fails"]
                    st["cer"].append(t["cer"])
                    st["f0"].append(t["f0_median_hz"])
    stats_out = {}
    for (vid, a), st in first_round_stats.items():
        stats_out[f"{vid}|{a}"] = {"n": st["n"], "pass_rate": round(st["pass"] / st["n"], 3), "yue_rate": round(st["yue"] / st["n"], 3), "mean_cer": round(float(np.mean(st["cer"])), 3), "median_f0": round(float(np.median(st["f0"])), 1), "fail_reasons": dict(st["fails"])}
    result["first_round_stats"] = stats_out

    for v in voices:
        vres = {"id": v["id"], "character": v["character"], "label": v["label"], "seed": v["seed"], "design": v["design"], "f0_range": v["f0"], "accents": {}}
        for a in primary + control:
            lines_out = []
            chosen_embs = []
            for s in [x for x in slots if x["voice"] == v["id"] and x["accent"] == a]:
                best = pick(s)
                if best:
                    c = centers.get((v["id"], a))
                    best["center_sim"] = round(cos(embs[best["file"]], c), 4) if c is not None else None
                    chosen_embs.append(embs[best["file"]])
                lines_out.append({
                    "id": s["line_id"], "text": s["text"], "text_tts": s["text_tts"], "emotion": s["emotion"], "face": s["face"], "emotion_instruct": s["emotion_instruct"],
                    "instruct": s["instruct"], "passed": s["passed"], "attempts": len(s["takes"]), "chosen_file": best["file"] if best else None,
                    "takes": s["takes"],
                })
            sims = [cos(chosen_embs[i], chosen_embs[j]) for i in range(len(chosen_embs)) for j in range(i + 1, len(chosen_embs))]
            vres["accents"][a] = {
                "accent_prompt": cfg["accents"][a], "kind": "control" if a in control else "primary", "lines": lines_out,
                "consistency": round(float(np.mean(sims)), 4) if sims else None,
                "first_round": stats_out.get(f"{v['id']}|{a}"),
            }
        result["voices"].append(vres)
    save_progress()

    # ------------------------------------------------------------ 階段 2：設計→複製（只對通過守門的參考音）
    if os.environ.get("R2_SKIP_CLONE") != "1":
        try:
            log("載入 Qwen3-TTS Base（複製模式）…")
            base = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
            for vres in result["voices"]:
                v = vmap[vres["id"]]
                prim = {a: vres["accents"][a]["first_round"] for a in primary}
                win = max(primary, key=lambda a: (prim[a]["pass_rate"], -prim[a]["mean_cer"]))
                vres["clone_mode"] = {"accent": win}
                ref_text = prep_text(cfg["ref"]["text"])
                ref_instruct = build_instruct(v["design"], cfg["accents"][win], cfg["ref"]["emotion_instruct"])
                ref_slot = {"voice": v["id"], "accent": win, "line_id": "ref", "takes": [], "passed": False, "text_tts": prep_text(cfg["ref"]["text"])}
                nchar = len(norm_text(ref_text))
                ref_item = {"slot": ref_slot, "text_tts": ref_text, "instruct": ref_instruct, "cap": gates["dur_cap"]["base_s"] + gates["dur_cap"]["per_char_s"] * nchar}
                ref_slot.update({"f0": v["f0"], "nchar": nchar})
                for r in range(2):
                    run_takes([ref_item] * 4, 90 + r, 0)
                    if ref_slot["passed"]:
                        break
                okt = [t for t in ref_slot["takes"] if t["passed"]]
                vres["clone_mode"]["ref_attempts"] = ref_slot["takes"]
                if not okt:
                    vres["clone_mode"]["skipped"] = "參考音未通過守門（語種／CER／F0／長度），不做複製模式"
                    log(f"{v['id']} 參考音全未通過，略過複製")
                    continue
                ref_best = min(okt, key=lambda t: t["cer"])
                rw, rsr = sf.read(f"{OUT}/wav_all/{ref_best['file']}")
                sf.write(f"{OUT}/wav/{v['id']}__ref.wav", rw, rsr)
                vres["clone_mode"]["ref_file"] = f"{v['id']}__ref.wav"
                vres["clone_mode"]["ref_text"] = ref_text
                prompt = base.create_voice_clone_prompt(ref_audio=(rw.astype(np.float32), rsr), ref_text=ref_text)
                lines = vres["accents"][win]["lines"]
                cslots = []
                for ln in lines:
                    nc = len(norm_text(ln["text_tts"]))
                    cslots.append({"line": ln, "takes": [], "passed": False, "nchar": nc, "cap": gates["dur_cap"]["base_s"] + gates["dur_cap"]["per_char_s"] * nc})
                for r in range(4):
                    todo = [c for c in cslots if not c["passed"]]
                    if not todo:
                        break
                    set_seed(BASE_SEED + 5000 + r)
                    wavs, sr = base.generate_voice_clone(text=[c["line"]["text_tts"] for c in todo], language=[lang] * len(todo), voice_clone_prompt=prompt, max_new_tokens=int(max(c["cap"] for c in todo) * TOK_PER_S) + 12, **GEN_KW)
                    for c, w in zip(todo, wavs):
                        w = np.asarray(w, dtype=np.float32)
                        name = f"{v['id']}__{c['line']['id']}__clone_r{r}.wav"
                        sf.write(f"{OUT}/wav_all/{name}", w, sr)
                        m = ev.measure(w, sr, c["line"]["text_tts"])
                        embs[name] = m.pop("_emb")
                        ok, fails = gate(m, gates, v["f0"], c["nchar"])
                        m.update({"file": name, "round": r, "passed": ok, "fails": fails})
                        c["takes"].append(m)
                        c["passed"] = c["passed"] or ok
                        log(f"  clone {v['id']}/{c['line']['id']} r{r} cer={m['cer']} yue={m['yue_prob']} f0={m['f0_median_hz']} {'PASS' if ok else 'FAIL ' + ','.join(fails)}")
                clines = []
                cembs = []
                ref_emb = embs[ref_best["file"]]
                for c in cslots:
                    okt = [t for t in c["takes"] if t["passed"]]
                    best = min(okt, key=lambda t: t["cer"]) if okt else None
                    if best:
                        cembs.append(embs[best["file"]])
                    clines.append({"id": c["line"]["id"], "passed": c["passed"], "attempts": len(c["takes"]), "chosen_file": best["file"] if best else None, "takes": c["takes"]})
                csims = [cos(cembs[i], cembs[j]) for i in range(len(cembs)) for j in range(i + 1, len(cembs))]
                vres["clone_mode"].update({"lines": clines, "consistency": round(float(np.mean(csims)), 4) if csims else None, "sim_to_ref": round(float(np.mean([cos(e, ref_emb) for e in cembs])), 4) if cembs else None})
            save_progress()
        except Exception:
            traceback.print_exc()
            result["clone_error"] = traceback.format_exc()
        log(f"PASS clone stage done elapsed={(time.time() - t_start) / 60:.1f}min")

    # ------------------------------------------------------------ 階段 3：口頭禪獨立抽測
    cps_out = []
    for cp in cfg["catchphrases"]:
        text_tts = prep_text(cp["text"])
        expect = prep_text(cp["expect"]) if cp.get("expect") else text_tts
        for vid in cp["voice_ids"]:
            if vid not in vmap:
                continue
            v = vmap[vid]
            for a in primary:
                instruct = build_instruct(v["design"], cfg["accents"][a], cp["emotion_instruct"])
                nc = len(norm_text(cp["text"]))
                takes = []
                s = {"voice": vid, "accent": a, "line_id": cp["id"], "takes": takes, "passed": False}
                items = [{"slot": s, "text_tts": text_tts, "instruct": instruct, "cap": 1.5 + 0.8 * nc + 1.0}] * (2 if SMOKE else cp["takes"])
                set_seed(BASE_SEED + 9000)
                outs = design_batch(design, items, lang, BASE_SEED + 9000 + len(cps_out), gates)
                for k, (w, sr) in enumerate(outs):
                    name = f"{vid}__{a}__{cp['id']}__t{k}.wav"
                    sf.write(f"{OUT}/wav_all/{name}", w, sr)
                    m = ev.measure(w, sr, text_tts, expect=expect)
                    embs[name] = m.pop("_emb")
                    ok, fails = gate(m, gates, v["f0"], nc, catchphrase=True)
                    m.update({"file": name, "take": k, "passed": ok, "fails": fails})
                    takes.append(m)
                    log(f"  口頭禪 {vid}/{a}/{cp['id']} t{k} asr='{m['asr_text']}' cer={m['cer']} yue={m['yue_prob']} {'PASS' if ok else 'FAIL ' + ','.join(fails)}")
                okt = [t for t in takes if t["passed"]]
                cps_out.append({"id": cp["id"], "voice": vid, "accent": a, "text": cp["text"], "text_tts": text_tts, "expect": expect, "n": len(takes), "pass": len(okt), "chosen_file": min(okt, key=lambda t: t["cer"])["file"] if okt else None, "takes": takes})
    result["catchphrases"] = cps_out
    save_progress()

    # ------------------------------------------------------------ 打包：只含通過守門的 take
    keep = set()
    for vres in result["voices"]:
        for a, ad in vres["accents"].items():
            for ln in ad["lines"]:
                if ln["chosen_file"]:
                    keep.add(ln["chosen_file"])
        cm = vres.get("clone_mode", {})
        for ln in cm.get("lines", []):
            if ln["chosen_file"]:
                keep.add(ln["chosen_file"])
        for t in cm.get("ref_attempts", []):
            if t["passed"]:
                keep.add(t["file"])
    for c in cps_out:
        if c["chosen_file"]:
            keep.add(c["chosen_file"])
    for f in keep:
        os.replace(f"{OUT}/wav_all/{f}", f"{OUT}/wav/{f}") if not os.path.exists(f"{OUT}/wav/{f}") else None
    result["total_minutes"] = round((time.time() - t_start) / 60, 1)
    result.pop("_progress", None)
    save_progress()
    with tarfile.open(f"/content/{TAG}_bundle.tar.gz", "w:gz") as tar:
        tar.add(f"{OUT}/wav", arcname=f"{TAG}/wav")
        tar.add(f"{OUT}/metrics_r2.json", arcname=f"{TAG}/metrics_r2.json")
    log(f"DONE: {len(keep)} 個通過的音檔，{result['total_minutes']} min")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        print("Traceback: generation failed", flush=True)
        sys.exit(1)
