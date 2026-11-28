"""量產生成（Colab VM 端）：讀 voice-lines.json，依說話者／NPC 名牌對應定案聲音，12 句一批生成、套全部守門、失敗重抽，可斷點續跑。

輸入（/content）：voice-lines.json、voices_r3.json、speaker_map.json、emotion_map.json、emotion.py、asr_equiv.json、r3_common.py，
              選用：done.json（本機已有的 id 清單，這些句子不重做）、ids.json（只做這些 id，煙霧測試用）
輸出（/content/produce_out）：
  wav/<sceneId>/<key>.wav ＋ .json    通過守門的音檔與機器指標（每句一個 sidecar）
  failed/<sceneId>/<key>.wav ＋ .json 重抽 N 次仍未通過者的「最接近通過」的 take，供人耳判斷（不進 manifest）
  packs/pack_NNNNN.tar               每個 chunk 完成後把新產生的檔案打包，driver 增量下載
  state.json / progress.json / report.json
  id 是 "<sceneId>/<key>"（key 規則見 src/audio/voiceKey.ts，由 list-voice-lines.mjs 產生）。

斷點續跑：
  * 同一個 VM 內程序中斷 → 重新執行本腳本，state.json 裡 status=done 的句子會跳過。
  * VM 被回收 → driver 把本機已下載的 id 清單當 done.json 上傳，這些句子同樣跳過。
  * 失敗的句子（failed）每次重新執行都會再試一次（用新的 seed）。

環境變數：PRODUCE_CHUNK（每個 chunk 的句數，預設 72，須為 12 的倍數）、MAX_ATTEMPTS（預設用 voices_r3.json 的 max_attempts=6）、
        PRODUCE_LIMIT（只做前 N 句，除錯用）、PRODUCE_SALT（seed 加鹽，預設用時間）
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

sys.path.insert(0, "/content")
from emotion import emotion_for, load_map  # noqa: E402
from r3_common import Evaluator, banned_hits, build_instruct, chunks, design_batch, dur_cap, gate, load_json, log, norm_text, penalty, prep_text  # noqa: E402

OUT = os.environ.get("PRODUCE_OUT", "/content/produce_out")
CHUNK = int(os.environ.get("PRODUCE_CHUNK", "72"))
BATCH = 12
SALT = int(os.environ.get("PRODUCE_SALT", str(int(time.time()) % 100000)))
BASE_SEED = 20261201


def write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1, default=str)
    os.replace(tmp, path)


def main():
    cfg = load_json("voices_r3.json")
    smap = load_json("speaker_map.json")
    emap = load_map()
    gates = cfg["gates"]
    max_att = int(os.environ.get("MAX_ATTEMPTS", gates["max_attempts"]))
    voices = {v["id"]: v for v in cfg["voices"]}
    accent = cfg["accent"]
    must_phrases = cfg["must_have_phrases"]
    for d in ("wav", "failed", "packs"):
        os.makedirs(f"{OUT}/{d}", exist_ok=True)

    # ------------------------------------------------------------ 載入台詞並建立 items
    lines = json.load(open("/content/voice-lines.json", encoding="utf-8"))["lines"]
    only = set(json.load(open("/content/ids.json"))) if os.path.exists("/content/ids.json") else None
    done_local = set(json.load(open("/content/done.json"))) if os.path.exists("/content/done.json") else set()
    state = json.load(open(f"{OUT}/state.json", encoding="utf-8")) if os.path.exists(f"{OUT}/state.json") else {"lines": {}}
    done_ids = done_local | {i for i, v in state["lines"].items() if v["status"] == "done"}

    items, unmapped = [], []
    for ln in lines:
        lid = f"{ln['sceneId']}/{ln['key']}"
        if only is not None and lid not in only:
            continue
        sp = ln["speaker"]
        if sp == "npc":
            ent = smap["npcs"].get(ln.get("name"))
            if ent is None:
                ent = smap["npc_fallback"]
                unmapped.append(lid)
            vid = ent["voice"]
        else:
            vid = smap["speakers"][sp]
        v = voices[vid]
        emo, trace = emotion_for(emap, sp, ln["face"], ln["voiceText"], ln.get("name"))
        assert not banned_hits(emo, cfg["banned_words"]), f"{lid} 情緒指令含禁用字眼：{emo}"
        tts = prep_text(ln["voiceText"])
        nc = len(norm_text(tts))
        flat = norm_text(ln["voiceText"])
        items.append({"id": lid, "scene": ln["sceneId"], "key": ln["key"], "speaker": sp, "npc": ln.get("name"), "voice": vid, "face": ln["face"], "text": ln["text"], "voice_text": ln["voiceText"], "text_tts": tts, "nchar": nc,
                      "emotion_instruct": emo, "emotion_trace": trace, "instruct": build_instruct(v["design"], accent, emo), "cap": dur_cap(gates, nc),
                      "must": [p for p in must_phrases if p in ln["voiceText"]], "catch": any(flat == norm_text(p) for p in must_phrases),
                      "takes": [], "passed": False, "best": None})
    if os.environ.get("PRODUCE_LIMIT"):
        items = items[: int(os.environ["PRODUCE_LIMIT"])]
    total_requested = len(items)
    todo = [it for it in items if it["id"] not in done_ids]
    log(f"台詞 {total_requested} 句（要求範圍）；已完成 {total_requested - len(todo)}；待做 {len(todo)}；未列名 NPC {len(unmapped)}")

    if os.environ.get("PRODUCE_DRYRUN") == "1":  # 本機乾跑：只建立 items 並輸出分佈，不載入模型
        per = Counter(it["voice"] for it in todo)
        print("DRYRUN voices:", dict(per), "unmapped_npc:", len(unmapped), "catchphrase-only lines:", sum(it["catch"] for it in todo), "must:", sum(bool(it["must"]) for it in todo))
        write_json(f"{OUT}/dryrun_items.json", [{k: it[k] for k in ("id", "voice", "text_tts", "nchar", "emotion_instruct", "emotion_trace", "must", "catch")} for it in todo])
        return

    # VM 上已完成、但本機沒有的句子（上一輪的 pack 沒下載完就中斷）→ 補打成 catch-up pack，不重做
    missing = [i for i, v in state["lines"].items() if v["status"] == "done" and i not in done_local and os.path.exists(f"{OUT}/wav/{i}.wav")]
    packs = sorted(f for f in os.listdir(f"{OUT}/packs") if f.endswith(".tar"))
    if missing:
        pname = f"pack_{len(packs):05d}.tar"
        with tarfile.open(f"{OUT}/packs/{pname}.part", "w") as tar:
            for i in missing:
                tar.add(f"{OUT}/wav/{i}.wav", arcname=f"wav/{i}.wav")
                tar.add(f"{OUT}/wav/{i}.json", arcname=f"wav/{i}.json")
        os.replace(f"{OUT}/packs/{pname}.part", f"{OUT}/packs/{pname}")
        packs.append(pname)
        log(f"catch-up pack {pname}：{len(missing)} 句（VM 有、本機沒有）")
    prog = {"total": total_requested, "todo_at_start": len(todo), "done_this_run": 0, "failed_this_run": 0, "chunks_total": (len(todo) + CHUNK - 1) // CHUNK, "chunks_done": 0, "packs": packs,
            "takes": 0, "gen_s": 0.0, "eval_s": 0.0, "started": time.time(), "updated": time.time(), "finished": False, "error": None, "salt": SALT, "unmapped_npc": unmapped, "phase": "loading"}
    write_json(f"{OUT}/progress.json", prog)
    if not todo:
        prog.update(finished=True, phase="nothing_to_do", updated=time.time())
        write_json(f"{OUT}/progress.json", prog)
        write_json(f"{OUT}/report.json", {"failed": [], "note": "沒有待做的句子"})
        log("DONE: 沒有待做的句子")
        return

    from qwen_tts import Qwen3TTSModel
    import torch

    t_boot = time.time()
    log("載入 Qwen3-TTS VoiceDesign …")
    model = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
    ev = Evaluator()
    prog.update(phase="generating", load_s=round(time.time() - t_boot, 1), gpu=torch.cuda.get_device_name(0))
    write_json(f"{OUT}/progress.json", prog)
    log(f"載入完成 {prog['load_s']}s")

    centroid = {}  # voice → (sum, n)：通過句的說話人嵌入中心，只當參考指標（center_sim），不當守門

    def center_sim(vid, emb):
        c = centroid.get(vid)
        if not c or c[1] < 3:
            return None
        cv = c[0] / np.linalg.norm(c[0])
        return round(float(np.dot(cv, emb) / (np.linalg.norm(emb) + 1e-9)), 4)

    def run_batch(batch, chunk_i, rnd, bidx):
        seed = BASE_SEED + SALT * 10 + chunk_i * 1000 + rnd * 100 + bidx
        t0 = time.time()
        outs = design_batch(model, [{"text_tts": it["text_tts"], "instruct": it["instruct"], "cap": it["cap"]} for it in batch], cfg["language"], seed)
        prog["gen_s"] += time.time() - t0
        for it, (wav, sr) in zip(batch, outs):
            t1 = time.time()
            m = ev.measure(wav, sr, it["text_tts"])
            prog["eval_s"] += time.time() - t1
            emb = m.pop("_emb")
            ok, fails = gate(m, gates, voices[it["voice"]], it["nchar"], catchphrase=it["catch"], must_have=it["must"])
            m.pop("_hyp_norm", None)
            m.update({"attempt": len(it["takes"]) + 1, "seed": seed, "passed": ok, "fails": fails, "penalty": round(penalty(m, fails), 2), "center_sim": center_sim(it["voice"], emb)})
            it["takes"].append({"attempt": m["attempt"], "passed": ok, "fails": fails, "cer": m["cer"], "f0": m["f0_median_hz"], "dur": m["duration_s"]})
            prog["takes"] += 1
            if ok:
                it["passed"] = True
                it["best"] = (wav, sr, m)
                c = centroid.get(it["voice"], (np.zeros_like(emb), 0))
                centroid[it["voice"]] = (c[0] + emb, c[1] + 1)
            elif it["best"] is None or m["penalty"] < it["best"][2]["penalty"]:
                it["best"] = (wav, sr, m)
            log(f"  {it['id']} {it['voice']} #{m['attempt']} dur={m['duration_s']} cer={m['cer']} sv={m['sv_lang']}/{m['sv_event']} f0={m['f0_median_hz']} lead={m['lead_s']} {'PASS' if ok else 'FAIL ' + ','.join(fails)} asr='{m['asr_text']}'")
        prog["updated"] = time.time()
        write_json(f"{OUT}/progress.json", prog)

    pack_n = len(packs)
    for ci, chunk in enumerate(chunks(todo, CHUNK)):
        pend = list(chunk)
        rnd = 0
        while pend and rnd < max_att:
            pend.sort(key=lambda it: it["cap"])
            for bidx, b in enumerate(chunks(pend, BATCH)):
                run_batch(b, ci, rnd, bidx)
            pend = [it for it in chunk if not it["passed"]]
            rnd += 1
        # ---- chunk 收尾：寫檔、更新 state、打包
        new_files = []
        for it in chunk:
            wav, sr, m = it["best"]
            ok = it["passed"]
            sub = "wav" if ok else "failed"
            d = f"{OUT}/{sub}/{it['scene']}"
            os.makedirs(d, exist_ok=True)
            sf.write(f"{d}/{it['key']}.wav", wav, sr)
            side = {k: it[k] for k in ("id", "scene", "key", "speaker", "npc", "voice", "face", "text", "voice_text", "text_tts", "emotion_instruct", "emotion_trace", "must")}
            side.update({"status": "done" if ok else "failed", "attempts": len(it["takes"]), "takes": it["takes"], "metrics": m, "sample_rate": sr, "instruct": it["instruct"]})
            write_json(f"{d}/{it['key']}.json", side)
            new_files += [f"{sub}/{it['scene']}/{it['key']}.wav", f"{sub}/{it['scene']}/{it['key']}.json"]
            state["lines"][it["id"]] = {"status": "done" if ok else "failed", "attempts": len(it["takes"]), "voice": it["voice"], "fails": dict(Counter(f for t in it["takes"] for f in t["fails"]))}
            prog["done_this_run" if ok else "failed_this_run"] += 1
        write_json(f"{OUT}/state.json", state)
        pname = f"pack_{pack_n:05d}.tar"
        with tarfile.open(f"{OUT}/packs/{pname}.part", "w") as tar:
            for f in new_files:
                tar.add(f"{OUT}/{f}", arcname=f)
        os.replace(f"{OUT}/packs/{pname}.part", f"{OUT}/packs/{pname}")
        pack_n += 1
        prog["packs"].append(pname)
        prog["chunks_done"] = ci + 1
        prog["updated"] = time.time()
        write_json(f"{OUT}/progress.json", prog)
        log(f"== chunk {ci + 1}/{prog['chunks_total']} 完成：通過 {prog['done_this_run']}、失敗 {prog['failed_this_run']}、累計 {prog['takes']} 個 take ==")

    # ------------------------------------------------------------ 報告
    failed = []
    for it in todo:
        if not it["passed"]:
            failed.append({"id": it["id"], "speaker": it["speaker"], "npc": it["npc"], "voice": it["voice"], "text": it["voice_text"], "attempts": len(it["takes"]), "fail_reasons": dict(Counter(f for t in it["takes"] for f in t["fails"])), "best_take_fails": it["best"][2]["fails"],
                           "best_asr": it["best"][2]["asr_text"]})
    by_voice = {}
    for it in todo:
        b = by_voice.setdefault(it["voice"], {"lines": 0, "passed": 0, "takes": 0, "first_try_pass": 0, "reasons": Counter()})
        b["lines"] += 1
        b["passed"] += it["passed"]
        b["takes"] += len(it["takes"])
        b["first_try_pass"] += bool(it["takes"] and it["takes"][0]["passed"])
        for t in it["takes"]:
            b["reasons"].update(t["fails"])
    for b in by_voice.values():
        b["reasons"] = dict(b["reasons"])
    elapsed = time.time() - prog["started"]
    report = {"requested": total_requested, "attempted": len(todo), "passed": prog["done_this_run"], "failed": failed, "by_voice": by_voice, "takes": prog["takes"],
              "gen_s_per_take": round(prog["gen_s"] / max(1, prog["takes"]), 2), "eval_s_per_take": round(prog["eval_s"] / max(1, prog["takes"]), 2), "takes_per_line": round(prog["takes"] / max(1, len(todo)), 2),
              "elapsed_s": round(elapsed, 1), "load_s": prog.get("load_s"), "unmapped_npc": unmapped, "max_attempts": max_att, "chunk": CHUNK, "gpu": prog.get("gpu")}
    write_json(f"{OUT}/report.json", report)
    prog.update(finished=True, phase="done", updated=time.time())
    write_json(f"{OUT}/progress.json", prog)
    log(f"DONE: 通過 {prog['done_this_run']}/{len(todo)}，失敗 {len(failed)}；{prog['takes']} 個 take（{report['takes_per_line']}/句）；生成 {report['gen_s_per_take']}s/take、評測 {report['eval_s_per_take']}s/take；{elapsed / 60:.1f} min")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        err = traceback.format_exc()
        traceback.print_exc()
        try:
            p = json.load(open(f"{OUT}/progress.json"))
            p.update(error=err[-1500:], updated=time.time())
            write_json(f"{OUT}/progress.json", p)
        except Exception:  # noqa: BLE001
            pass
        print("Traceback: produce failed", flush=True)
        sys.exit(1)
