"""驗證守門：把第一輪（Gemini 聽過、確認有粵語污染）的 117 個音檔丟進第二輪的評測器，看語種偵測／CER／F0 守門抓不抓得到。

在 Colab VM 上執行；輸入 /content/r1_audio.tar.gz（第一輪 MP3）、/content/r1_candidates.json（第一輪 candidates.json，取台詞原文）。
輸出 /content/r1_eval.json。只用於評測，不生成任何聲音。
"""

import json
import os
import sys
import tarfile

sys.path.insert(0, "/content")
import librosa  # noqa: E402

from r2_common import Evaluator, gate, log, norm_text, prep_text  # noqa: E402

os.makedirs("/content/r1_audio", exist_ok=True)
tarfile.open("/content/r1_audio.tar.gz").extractall("/content/r1_audio")
cand = json.load(open("/content/r1_candidates.json", encoding="utf-8"))
cfg = json.load(open("/content/voices_r2.json", encoding="utf-8"))
gates = cfg["gates"]
f0r = {"rin": [170, 270], "hare": [200, 300], "mirai": [190, 290], "sensei": [140, 235], "kuro": [95, 200], "npc_girl": [170, 270], "npc_boy": [95, 200], "npc_woman": [140, 230]}
ev = Evaluator()
rows = []
for v in cand["voices"]:
    items = [(f'{ln["id"]}', ln["text"], ln["mp3"]) for ln in v["lines"]]
    ce = v.get("clone_experiment") or {}
    items += [(f'{c["id"]}__clone', next(l["text"] for l in v["lines"] if l["id"] == c["id"]), c["mp3"]) for c in ce.get("lines", [])]
    if ce.get("ref_mp3"):
        items.append(("ref", ce["ref_text"], ce["ref_mp3"]))
    for lid, text, mp3 in items:
        path = f"/content/r1_audio/audio/{os.path.basename(mp3)}"
        y, sr = librosa.load(path, sr=24000)
        t = prep_text(text)
        m = ev.measure(y, sr, t)
        m.pop("_emb")
        ok, fails = gate(m, gates, f0r[v["character"]], len(norm_text(t)))
        rows.append({"voice": v["id"], "kind": "ref" if lid == "ref" else ("clone" if lid.endswith("__clone") else "design"), "id": lid, "passed": ok, "fails": fails, **{k: m[k] for k in ["lang_top", "yue_prob", "zh_prob", "sv_lang", "cer", "f0_median_hz", "lead_s", "asr_text"]}})
        log(f"{v['id']}/{lid} top={m['lang_top']} yue={m['yue_prob']:.3f} sv={m['sv_lang']} cer={m['cer']} f0={m['f0_median_hz']} {'PASS' if ok else 'FAIL ' + ','.join(fails)}")
json.dump(rows, open("/content/r1_eval.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
log("R1EVAL_DONE")
