"""第四輪試聽頁：單一 HTML 檔（所有 mp3 以 base64 data URI 內嵌，`preload="metadata"`，沒有任何相對路徑），總大小控制在 5MB 內。

每一句列出：通過版（量產後處理後的 MP3）、保留的失敗版（最接近通過的最多 3 個，64 kbps）、上一輪同句版本（第三輪樣本／煙霧測試成品），
以及本輪改了什麼（情緒指令前後對照、音高範圍、拼音 CER、收斂版、響度壓縮…）。

用法：python3 build_page_r4.py --work /tmp/seo-journey-audio/voice-r4/work --out /tmp/seo-journey-audio/voice-r4
         [--r3 /tmp/seo-journey-audio/voice-r3] [--smoke /tmp/seo-journey-audio/voice-produce-smoke] [--max-mb 4.8]
需要在 git 倉庫內執行（用 `git show` 取上一輪的 emotion_map／voices 來算「上一輪情緒指令」）。
"""

import argparse
import base64
import html
import importlib.util
import json
import re
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent / "r3"))
sys.path.insert(0, str(HERE.parent / "r2"))
from build_page_r2 import CSS  # noqa: E402
from emotion import emotion_for, load_map  # noqa: E402
from r3_common import negation_hits  # noqa: E402

E = lambda s: html.escape(str(s))  # noqa: E731
PREV_COMMIT = "6bcca64"  # 第三輪合併點：「上一輪」的設定

# 上一輪同句的音檔（相對 voice-r3/audio 或 voice-produce-smoke；label, 檔名）。沒列的句子＝上一輪沒有這句。
R3 = "r3"
SMOKE = "smoke"
PREV = {
    "date-hare-1/d39dedad0e1f": [(SMOKE, "煙霧測試成品", "date-hare-1/d39dedad0e1f"), (R3, "第三輪樣本 hare_1", "hare_D__hare_1__r0t3.mp3")],
    "festival/aba114c7f739": [(SMOKE, "煙霧測試（仍失敗，最接近的 take）", "FAILED:festival/aba114c7f739")],
    "end-blackhat/62a21f83deac": [(SMOKE, "煙霧測試成品（收斂版才過）", "end-blackhat/62a21f83deac"), (R3, "第三輪樣本 kuro_2", "kuro_A__kuro_2__r0t3.mp3")],
    "end-bad/b34a1db30bb3": [(SMOKE, "煙霧測試成品", "end-bad/b34a1db30bb3")],
    "sq-m1/97971c87a6ca": [(SMOKE, "煙霧測試成品", "sq-m1/97971c87a6ca"), (R3, "第三輪樣本 npc_woman_3", "npc_woman_A__npc_woman_3__r0t0.mp3")],
    "sq-m1/cb6530dfb4af": [(SMOKE, "煙霧測試成品", "sq-m1/cb6530dfb4af")],
    "sq-h2/c079448d054d": [(SMOKE, "煙霧測試成品（−21.1 LUFS）", "sq-h2/c079448d054d")],
    "sq-m2/d26559546567": [(SMOKE, "煙霧測試（仍失敗，最接近的 take）", "FAILED:sq-m2/d26559546567")],
    "date-mirai-1/f21640cf457d": [(SMOKE, "煙霧測試成品", "date-mirai-1/f21640cf457d")],
    "sq-h1/5aa566f12c99": [(SMOKE, "煙霧測試成品", "sq-h1/5aa566f12c99")],
    "date-hare-2/faf5b6b172db": [(R3, "第三輪樣本 hare_3（十個 take 都沒過，最接近：f0_high）", "hare_D__hare_3__r2t5.mp3")],
    "sq-m1/076a06239f18": [(R3, "第三輪樣本 npc_woman_1", "npc_woman_A__npc_woman_1__r0t0.mp3")],
    "sq-m1/d9cbb0adbecc": [(R3, "第三輪樣本 npc_woman_4 r0t0", "npc_woman_A__npc_woman_4__r0t0.mp3"), (R3, "第三輪樣本 npc_woman_4 r0t1（Gemini：跑偏成大叔嗓）", "npc_woman_A__npc_woman_4__r0t1.mp3")],
    "w1/784e070e9823": [(R3, "第三輪樣本 hare_2", "hare_D__hare_2__r0t0.mp3")],
    "w6/df285d5d5fad": [(R3, "第三輪樣本 kuro_4", "kuro_A__kuro_4__r0t0.mp3")],
    "sq-x1/10b5f05b0a79": [(R3, "第三輪樣本 kuro_3", "kuro_A__kuro_3__r0t0.mp3")],
}


def git_show(path):
    return subprocess.run(["git", "show", f"{PREV_COMMIT}:{path}"], capture_output=True, text=True, cwd=REPO, check=True).stdout


def load_old_emotion():
    """上一輪（第三輪合併點）的 emotion.py + emotion_map.json + voices_r3.json。"""
    td = Path(tempfile.mkdtemp())
    (td / "emotion_old.py").write_text(git_show("scripts/colab/voice/produce/emotion.py"), encoding="utf-8")
    spec = importlib.util.spec_from_file_location("emotion_old", td / "emotion_old.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    omap = json.loads(git_show("scripts/colab/voice/produce/emotion_map.json"))
    ovoices = json.loads(git_show("scripts/colab/voice/r3/voices_r3.json"))
    return mod, omap, ovoices


def b64mp3(path):
    return "data:audio/mpeg;base64," + base64.b64encode(Path(path).read_bytes()).decode("ascii")


def to_mp3_64k(wav, dst):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-ac", "1", "-b:a", "64k", str(dst)], check=True, capture_output=True)


class Audio:
    """一個要內嵌的音檔：path、priority（數字小＝重要）、說明。預算不夠時由大到小丟掉 priority 高的。"""

    def __init__(self, path, prio, size=None):
        self.path, self.prio = Path(path), prio
        self.size = (size or self.path.stat().st_size)
        self.keep = True

    def tag(self):
        return f'<audio controls preload="metadata" src="{b64mp3(self.path)}"></audio>' if self.keep else '<div class="meta">（為了控制頁面大小，這個音檔沒有內嵌）</div>'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--r3", default="/tmp/seo-journey-audio/voice-r3")
    ap.add_argument("--smoke", default="/tmp/seo-journey-audio/voice-produce-smoke")
    ap.add_argument("--max-mb", type=float, default=4.8)
    ap.add_argument("--meta", help="另存一份 JSON 結果摘要（通過率、失敗句、響度）")
    a = ap.parse_args()
    work, out, r3, smoke = Path(a.work), Path(a.out), Path(a.r3), Path(a.smoke)
    out.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    cfg = json.loads((HERE.parent / "r3" / "voices_r3.json").read_text(encoding="utf-8"))
    V = {v["id"]: v for v in cfg["voices"]}
    emap = load_map()
    old_emotion, omap, ovoices = load_old_emotion()
    OV = {v["id"]: v for v in ovoices["voices"]}
    ids = json.loads((HERE / "validate_ids.json").read_text(encoding="utf-8"))
    ids = [i for i in ids if "@" not in i] + [i for i in ids if "@" in i]  # 一般句在前，A/B 變體（翔「偏低沉」聲音描述）在後
    smoke_ids = json.loads((HERE / "smoke_ids.json").read_text(encoding="utf-8"))
    lines = {f"{l['sceneId']}/{l['key']}": l for l in json.loads((REPO / "scripts/audio/voice-lines.json").read_text(encoding="utf-8"))["lines"]}
    report = json.loads((work / "report.json").read_text(encoding="utf-8")) if (work / "report.json").exists() else {}
    fin = json.loads((work / "finalize_summary.json").read_text(encoding="utf-8")) if (work / "finalize_summary.json").exists() else {}
    mstats = json.loads((work / "mp3_stats.json").read_text(encoding="utf-8")) if (work / "mp3_stats.json").exists() else {}
    smoke_stats = json.loads((smoke / "mp3_stats.json").read_text(encoding="utf-8")) if (smoke / "mp3_stats.json").exists() else {}
    prog = json.loads((work / "progress.json").read_text(encoding="utf-8")) if (work / "progress.json").exists() else {}
    smap = json.loads((HERE / "speaker_map.json").read_text(encoding="utf-8"))

    audios = []

    def add(path, prio):
        au = Audio(path, prio)
        audios.append(au)
        return au

    blocks, summary_rows, fully_failed = [], [], []
    passed_n = 0
    first_try = 0
    all_takes = 0
    pass_takes = 0
    sims = {}
    results = {}
    for n, lid in enumerate(ids, 1):
        base_id, _, tag = lid.partition("@")
        ln = lines[base_id]
        scene, key = base_id.split("/")
        if tag:
            scene = f"{scene}@{tag}"
        side = work / "raw" / "wav" / scene / f"{key}.json"
        fside = work / "raw" / "failed" / scene / f"{key}.json"
        rv = work / "raw" / "review" / scene / f"{key}.json"
        meta = json.loads(side.read_text(encoding="utf-8")) if side.exists() else (json.loads(fside.read_text(encoding="utf-8")) if fside.exists() else None)
        review = json.loads(rv.read_text(encoding="utf-8")) if rv.exists() else {"kept": []}
        sp = ln["speaker"]
        vid = smap["speakers"][sp] if sp != "npc" else smap["npcs"][ln["name"]]["voice"]
        design_now = V[vid]["design_variants"][tag] if tag else V[vid]["design"]
        who = ln.get("name") or sp
        # ---- 本輪情緒指令 vs 上一輪
        new_ins, trace = emotion_for(emap, sp, ln["face"], ln["voiceText"], ln.get("name"))
        old_ins, otrace = old_emotion.emotion_for(omap, sp, ln["face"], ln["voiceText"], ln.get("name"))
        chips = []
        if tag:
            chips.append(f"A/B 聲音描述變體「{tag}」（偏低沉、略帶沙啞的少年男中音）")
        if negation_hits(old_ins) or negation_hits(OV[vid]["design"]):
            if new_ins != old_ins or OV[vid]["design"] != V[vid]["design"]:
                chips.append("否定詞→正向描述")
        if OV[vid]["design"] != design_now:
            chips.append("聲音描述已改寫")
        if OV[vid]["f0"] != V[vid]["f0"]:
            chips.append(f"F0 範圍 {OV[vid]['f0']}→{V[vid]['f0']}")
        if "hey" in trace["mods"]:
            chips.append("『哎呀』短促輕快規則")
        if "acronym" in trace["mods"]:
            chips.append("英文縮寫提示")
        if "english_word" in trace["mods"]:
            chips.append("英文單字提示（自然英語發音）")
        if sp == "hare" and ln["face"] == "blush":
            chips.append("加『音高維持在穩定的中音域』")
        if meta and meta.get("softened"):
            chips.append("收斂版情緒指令（保留情緒、只壓音高）")
        if meta and meta["status"] == "done":
            m = meta["metrics"]
            if m.get("cer_char") is not None and abs(m["cer_char"] - m["cer"]) > 1e-6:
                chips.append(f"拼音 CER {m['cer']:.3f}（字元 CER {m['cer_char']:.3f} 會誤判）")
        st = mstats.get(lid)  # 變體的 key 是「<scene>/<key>@<variant>」
        if st and st.get("compress"):
            chips.append(f"短句／高峰值壓縮（第 {st['compress']} 檔）")
        if st and ln["voiceText"] and meta and meta["status"] == "done" and (st["duration_s"] < 1.0):
            chips.append("短句響度")
        # ---- 通過版
        takes = meta["takes"] if meta else []
        ok = bool(meta and meta["status"] == "done")
        if not tag:  # A/B 變體（翔的偏低沉描述）不算進驗證集通過率，另在 A/B 表呈現
            passed_n += ok
            first_try += bool(takes and takes[0]["passed"])
            all_takes += len(takes)
            pass_takes += sum(t["passed"] for t in takes)
        for t in takes:
            if t.get("anchor_sim") is not None:
                sims.setdefault(vid, []).append((t["anchor_sim"], t["passed"], lid, t["attempt"]))
        results[lid] = {"voice": vid, "passed": ok, "attempts": len(takes), "first_try": bool(takes and takes[0]["passed"]), "lufs": st["lufs"] if st else None, "tp": st["true_peak_dbtp"] if st else None, "dur": st["duration_s"] if st else None}
        mp3 = work / "public-voice" / scene / f"{key}.mp3"
        f0_pass = meta["metrics"]["f0_median_hz"] if ok else None
        results[lid]["f0"] = f0_pass
        results[lid]["sim"] = meta["metrics"].get("anchor_sim") if ok else None
        results[lid]["tag"] = tag or None
        pass_html = ""
        if ok and mp3.exists():
            au = add(mp3, 0)
            m = meta["metrics"]
            gl = (f'<span class="gate">CER(拼音) {m["cer"]:.3f}｜CER(字元) {m.get("cer_char", 0):.3f}｜F0 {m["f0_median_hz"]:.0f} Hz（{V[vid]["f0"][0]}–{V[vid]["f0"][1]}）｜說話人相似度 {m.get("anchor_sim")}（≥{V[vid]["anchor_sim_min"]}）｜起音 {m.get("lead_s")}｜{m["duration_s"]:.1f}s'
                  + (f'｜成品 {st["lufs"]} LUFS / {st["true_peak_dbtp"]} dBTP' if st else "") + "</span>")
            pass_html = f'<div class="ver ok"><b>✅ 通過版</b>（第 {len(takes)} 個 take；{"收斂版情緒指令" if meta.get("softened") else "原情緒指令"}）{gl}<div class="meta">ASR：{E(m["asr_text"])}</div>{{AU{id(au)}}}</div>'
            pass_html = pass_html.replace("{AU%d}" % id(au), "@@AU%d@@" % id(au))
            au_ph = {id(au): au}
        else:
            au_ph = {}
            reasons = Counter(f for t in takes for f in t["fails"])
            pass_html = f'<div class="ver bad"><b>⚠ 全部 {len(takes)} 個 take 失敗</b>：{E("、".join(f"{k}×{v}" for k, v in reasons.most_common()))}</div>'
            if not tag:
              fully_failed.append({"id": lid, "voice": vid, "text": ln["voiceText"], "reasons": dict(reasons), "takes": takes})
        # ---- 保留的失敗版
        rev_html = ""
        for k, it in enumerate(review.get("kept", []), 1):
            p = work / "raw" / "review" / scene / it["file"]
            if not p.exists():
                continue
            au = add(p, 1 + k)
            au_ph[id(au)] = au
            rev_html += (f'<div class="ver fail"><b>失敗版 f{k}</b>（第 {it["attempt"]} 個 take{"，收斂版" if it["softened"] else ""}；{E("、".join(it["fails"]))}）<span class="gate">CER(拼音) {it["cer"]:.3f}｜CER(字元) {it["cer_char"]:.3f}｜F0 {it["f0"]:.0f}｜相似度 {it["anchor_sim"]}｜{it["duration_s"]:.1f}s</span>'
                         f'<div class="meta">ASR：{E(it["asr_text"])}</div>@@AU{id(au)}@@</div>')
        # ---- 上一輪
        prev_html = ""
        for k, (src, label, ref) in enumerate(PREV.get(base_id, []), 1):
            if src == R3:
                p = r3 / "audio" / ref
            elif ref.startswith("FAILED:"):
                w = smoke / "raw" / "failed" / f"{ref[7:]}.wav"
                p = tmp / f"prev_{n}_{k}.mp3"
                if w.exists():
                    to_mp3_64k(w, p)
            else:
                p = smoke / "public-voice" / f"{ref}.mp3"
            if not p.exists():
                continue
            au = add(p, 5 + k)
            au_ph[id(au)] = au
            extra = ""
            if src == SMOKE and ref in smoke_stats:
                extra = f"（{smoke_stats[ref]['lufs']} LUFS / {smoke_stats[ref]['true_peak_dbtp']} dBTP）"
            prev_html += f'<div class="ver prev"><b>上一輪：{E(label)}</b>{E(extra)}@@AU{id(au)}@@</div>'
        if not prev_html:
            prev_html = '<div class="meta">上一輪沒有這一句的樣本，無法對照。</div>'
        instr_html = (f'<details><summary>情緒指令（本輪 vs 上一輪）</summary><div class="prompt">本輪：{E(new_ins)}\n上一輪：{E(old_ins)}\n（用到：{E(trace["base"])} ＋ {E(trace["mods"])}；上一輪：{E(otrace["base"])} ＋ {E(otrace["mods"])}）</div></details>')
        smk = "smoke" if lid in smoke_ids else ""
        results[lid]["n"] = n
        summary_rows.append(f'<tr><td><a href="#l{n}">{n}</a></td><td>{E(who)}（{E(vid)}{E("@" + tag) if tag else ""}）</td><td>{E(ln["voiceText"][:30])}</td><td>{"✅" if ok else "❌"}</td><td>{len(takes)}</td><td>{"✅" if takes and takes[0]["passed"] else "—"}</td><td>{"、".join(E(c) for c in chips[:3])}</td></tr>')
        emo_tags = f'<span class="emo">{E(ln["face"] or "—")}</span>' + (f'<span class="emo">A/B：{E(tag)}</span>' if tag else "") + ('<span class="emo">煙霧測試</span>' if smk else "")
        chips_html = "".join(f'<span class="chip">{E(c)}</span>' for c in chips) or '<span class="chip">無特別改動（沿用管線修正）</span>'
        tts_shown = meta["text_tts"] if meta else ln["voiceText"]
        blocks.append((f'<section class="char" id="l{n}"><h3>{n}. {E(who)}（{E(vid)}）{emo_tags}</h3>'
                       f'<div class="txt">{E(ln["text"])}</div><div class="tts">送進 TTS：{E(tts_shown)}</div><div class="chips">{chips_html}</div>'
                       f'{pass_html}{rev_html}{instr_html}<h4>上一輪同句</h4>{prev_html}</section>', au_ph))

    # ---- 預算：超過就由 priority 大者開始丟（上一輪第二版 → 失敗版 f3 → f2 …），通過版一定留
    budget = int(a.max_mb * 1e6 / 1.3334)
    total = sum(x.size for x in audios)
    for au in sorted(audios, key=lambda x: (-x.prio, -x.size)):
        if total <= budget:
            break
        if au.prio == 0:
            continue
        au.keep = False
        total -= au.size
    body = []
    for html_block, ph in blocks:
        for i, au in ph.items():
            html_block = html_block.replace(f"@@AU{i}@@", au.tag())
        body.append(html_block)

    n_lines = len([i for i in ids if "@" not in i])
    smoke_pass = sum(1 for i in smoke_ids if results.get(i, {}).get("passed"))
    sim_rows = []
    for v in sorted(sims):
        xs = sorted(sims[v])
        vals = [x[0] for x in xs]
        low = [f"{x[0]:.3f}{'（通過）' if x[1] else '（失敗）'} {x[2].split('/')[1][:6]}#{x[3]}" for x in xs[:3]]
        sim_rows.append(f'<tr><td>{E(v)}</td><td>{V[v]["anchor_sim_min"]}</td><td>{len(vals)}</td><td>{min(vals):.3f}</td><td>{sorted(vals)[len(vals) // 2]:.3f}</td><td>{max(vals):.3f}</td><td>{E("；".join(low))}</td></tr>')
    ff_rows = "".join(f'<tr><td>{E(f["id"])}</td><td>{E(f["voice"])}</td><td>{E(f["text"])}</td><td>{E(f["reasons"])}</td></tr>' for f in fully_failed) or '<tr><td colspan="4">沒有「全部 take 失敗」的句子</td></tr>'
    lufs = [r["lufs"] for r in results.values() if r["lufs"] is not None]
    tps = [r["tp"] for r in results.values() if r["tp"] is not None]
    ab_rows = []
    for lid, r in results.items():
        if r["tag"]:
            b = results.get(lid.split("@")[0])
            if b:
                ab_rows.append(f'<tr><td>{E(lid.split("@")[0])}</td><td><a href="#l{b["n"]}">基準</a>：{"✅" if b["passed"] else "❌"} {b["attempts"]} 個 take，F0 {b["f0"] or "—"} Hz，相似度 {b["sim"] or "—"}</td><td><a href="#l{r["n"]}">偏低沉</a>：{"✅" if r["passed"] else "❌"} {r["attempts"]} 個 take，F0 {r["f0"] or "—"} Hz，相似度 {r["sim"] or "—"}</td></tr>')
    ab_html = (f'<h4>翔的聲音描述 A/B（錨點 107 Hz 偏低沉；基準＝現行描述，偏低沉＝「偏低沉、略帶沙啞的少年男中音」）</h4><table><tr><th>台詞</th><th>基準</th><th>偏低沉</th></tr>{"".join(ab_rows)}</table>' if ab_rows else "")
    stats = (f'<div class="sum"><h3>驗證集結果（{n_lines} 句，量產管線原樣）</h3><table>'
             f'<tr><th>通過（≤6 個 take）</th><td>{passed_n}/{n_lines}</td><th>第一個 take 就通過</th><td>{first_try}/{n_lines}</td><th>take 通過率</th><td>{pass_takes}/{all_takes}（{pass_takes / max(1, all_takes) * 100:.0f}%）</td></tr>'
             f'<tr><th>其中煙霧測試 10 句</th><td>{smoke_pass}/10（上一輪 8/10）</td><th>響度</th><td>{min(lufs) if lufs else "—"}～{max(lufs) if lufs else "—"} LUFS</td><th>最高 true peak</th><td>{max(tps) if tps else "—"} dBTP</td></tr>'
             f'<tr><th>GPU／精度／批次</th><td>{E(prog.get("gpu"))}／{E(prog.get("precision"))}／{E(prog.get("batch"))}</td><th>每句 take</th><td>{report.get("takes_per_line", "—")}</td><th>生成／評測（秒/take）</th><td>{report.get("gen_s_per_take", "—")}／{report.get("eval_s_per_take", "—")}</td></tr></table>'
             f'<h4>全部 take 失敗的句子（供人工決定放寬或改句）</h4><table><tr><th>id</th><th>聲音</th><th>台詞</th><th>失敗原因（take 數）</th></tr>{ff_rows}</table>'
             f'{ab_html}<h4>說話人相似度（與錨點）</h4><table><tr><th>聲音</th><th>門檻</th><th>take 數</th><th>最小</th><th>中位</th><th>最大</th><th>最低的 3 個</th></tr>{"".join(sim_rows)}</table>'
             f'<h4>逐句總表</h4><table><tr><th>#</th><th>聲音</th><th>台詞</th><th>結果</th><th>take 數</th><th>首 take 通過</th><th>本輪改動</th></tr>{"".join(summary_rows)}</table></div>')
    css = CSS + ".chips{margin:6px 0}.chip{display:inline-block;font-size:12px;border:1px solid var(--acc2);color:var(--acc2);border-radius:99px;padding:0 8px;margin:0 4px 4px 0}.ver{border-left:4px solid var(--line);padding:4px 10px;margin:8px 0}.ver.ok{border-color:var(--ok)}.ver.fail{border-color:var(--warn)}.ver.bad{border-color:var(--acc)}.ver.prev{border-color:var(--acc2)}"
    page = f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>角色聲音驗證 第四輪・直到你找到我</title><style>{css}</style></head><body>
<header><h1>角色聲音驗證（第四輪：量產管線修正後的小規模驗證）</h1>
<p class="lead">8 個聲音照舊（Qwen3-TTS-12Hz-1.7B-VoiceDesign，Apache-2.0；聲音完全由文字描述設計）。這一頁是單一檔案：所有音檔都內嵌（base64），可直接搬動或放進任何檢視器。每句列出通過版、保留的失敗版與上一輪同句版本。</p>
<div class="warn">守門只能擋明顯壞掉的；台灣腔、情緒、像不像角色一律要人耳判斷。<b>先聽「啦／了」那類只差一個音的失敗版</b>（例如 hare_3），再決定要不要放寬。說話人相似度用 WavLM x-vector，只能擋同一個聲音設定下明顯跑偏，不是身分辨識。</div>
{stats}</header><main>{"".join(body)}</main></body></html>"""
    (out / "index.html").write_text(page, encoding="utf-8")
    size = (out / "index.html").stat().st_size
    dropped = sum(1 for x in audios if not x.keep)
    print(f"wrote {out / 'index.html'}  {size / 1e6:.2f} MB；音檔 {len(audios)} 個，為控制大小未內嵌 {dropped} 個")
    leftovers = re.findall(r'(?:src|href)="(?!data:|#)[^"]*"', page)
    print("相對路徑殘留：", leftovers[:5] or "無")
    if a.meta:
        Path(a.meta).write_text(json.dumps({"results": results, "fully_failed": fully_failed, "passed": passed_n, "n": n_lines, "first_try": first_try, "take_pass": [pass_takes, all_takes], "smoke_pass": smoke_pass, "html_mb": round(size / 1e6, 2)}, ensure_ascii=False, indent=1), encoding="utf-8")
    if size > 5_000_000:
        sys.exit("頁面超過 5MB")
    if leftovers:
        sys.exit("頁面仍有相對路徑")


if __name__ == "__main__":
    main()
