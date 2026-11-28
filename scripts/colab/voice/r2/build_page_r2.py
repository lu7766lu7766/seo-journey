"""由 candidates_r2.json 產生第二輪試聽頁 index.html。

每句顯示：遊戲原文、送進 TTS 的文字、情緒指令、守門結果（Whisper 語種機率、Paraformer CER、F0 與允許區間、長度、響度）。
未通過守門的 take 不放上頁面；只顯示「這句重抽 N 次仍未通過」的提示與失敗原因統計（完整紀錄在 candidates_r2.json）。

用法：python3 build_page_r2.py <voice-r2 目錄>
"""

import html
import json
import sys
from collections import Counter
from pathlib import Path

CSS = """
:root{--bg:#f7f4ee;--card:#fff;--ink:#2a2a33;--mute:#6b6b78;--line:#e4dfd3;--acc:#c0392b;--acc2:#2c5aa0;--ok:#2e7d5b;--warn:#b26a00}
@media (prefers-color-scheme:dark){:root{--bg:#17181d;--card:#20222a;--ink:#ecebe6;--mute:#9a9aa8;--line:#34363f;--acc:#ff8a7a;--acc2:#8ab4f8;--ok:#6fcf9f;--warn:#e3a94b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 -apple-system,"PingFang TC","Noto Sans TC",sans-serif}
header,main{max-width:1180px;margin:0 auto;padding:0 20px}
h1{font-size:26px;margin:32px 0 6px}h2{font-size:21px;margin:0}h3{font-size:16px;margin:0 0 6px}h4{font-size:14px;margin:10px 0 4px}
.lead{color:var(--mute);margin:0 0 14px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 24px}nav a{padding:4px 12px;border:1px solid var(--line);border-radius:99px;color:var(--ink);text-decoration:none;background:var(--card)}
section.char{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:0 0 26px}
.role{color:var(--mute);margin:2px 0 10px}
.cands{display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:16px;margin-top:14px}
.cand{border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--bg)}
.prompt{background:var(--card);border:1px dashed var(--line);border-radius:8px;padding:8px 10px;font-size:13px;color:var(--mute);margin:6px 0 10px;white-space:pre-wrap}
.acc{border-top:2px solid var(--line);margin-top:12px;padding-top:8px}
.line{padding:8px 0;border-top:1px solid var(--line)}.acc>.line:first-of-type{border-top:0}
.txt{font-size:15px}.tts{font-size:12px;color:var(--acc2)}.meta{font-size:12px;color:var(--mute)}
.emo{display:inline-block;font-size:12px;background:var(--acc2);color:#fff;border-radius:6px;padding:0 6px;margin-right:6px}
.gate{font-size:12px;font-family:ui-monospace,Menlo,monospace;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:2px 8px;margin-top:3px;display:inline-block}
.gate b.ok{color:var(--ok)}.gate b.bad{color:var(--acc)}
.fail{font-size:13px;color:var(--warn);padding:6px 0}
audio{width:100%;height:34px;margin-top:4px}
details{margin-top:10px;font-size:13px}summary{cursor:pointer;color:var(--acc2)}
.warn{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px;margin:10px 0 20px;font-size:13px}
table{border-collapse:collapse;font-size:13px;margin:8px 0 16px;width:100%}th,td{border:1px solid var(--line);padding:4px 8px;text-align:left}th{background:var(--card)}
.sum{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin:0 0 26px;overflow-x:auto}
@media(max-width:560px){.cands{grid-template-columns:1fr}}
"""


def esc(s):
    return html.escape(str(s))


def gate_html(t, f0r, audio=None):
    ok_yue = t["lang_top"] != "yue" and t["yue_prob"] <= 0.1
    ok_f0 = f0r[0] <= t["f0_median_hz"] <= f0r[1]
    return (
        f'<span class="gate">語種 top={esc(t["lang_top"])} yue=<b class="{"ok" if ok_yue else "bad"}">{t["yue_prob"]:.3f}</b> zh={t["zh_prob"]:.2f}'
        f' ｜CER <b class="{"ok" if t["cer"] <= 0.2 else "bad"}">{t["cer"]:.2f}</b>'
        f' ｜F0 <b class="{"ok" if ok_f0 else "bad"}">{t["f0_median_hz"]:.0f}</b> Hz（允許 {f0r[0]}–{f0r[1]}）'
        f' ｜{t["duration_s"]:.1f}s ｜句首無音高聲音 {("%.2f" % t["lead_s"]) if t.get("lead_s") is not None else "—"}s'
        + (f' ｜SenseVoice 語種 <b class="{"ok" if audio["sv_lang"] == "zh" else "bad"}">{esc(audio["sv_lang"])}</b>' if audio and audio.get("sv_lang") else "")
        + "</span>"
    )


def chosen_take(ln):
    for t in ln["takes"]:
        if t["file"] == ln["chosen_file"]:
            return t
    return None


def render_lines(lines, f0r, with_instruct=True):
    out = []
    for ln in lines:
        head = f'<div class="txt"><span class="emo">{esc(ln.get("emotion", ""))}</span>{esc(ln["text"])}</div><div class="tts">送進 TTS：{esc(ln["text_tts"])}</div>'
        if ln.get("audio") and chosen_take(ln):
            t = chosen_take(ln)
            extra = f'｜第 {ln["attempts"]} 次嘗試通過（共 {len(ln["takes"])} 個 take）｜響度 {ln["audio"]["lufs"]} LUFS / {ln["audio"]["true_peak_dbtp"]} dBTP'
            ins = f'<details><summary>instruct</summary><div class="prompt">{esc(ln["instruct"])}</div></details>' if with_instruct else ""
            out.append(f'<div class="line">{head}{gate_html(t, f0r, ln["audio"])}<div class="meta">{esc(extra)}</div><audio controls preload="none" src="{esc(ln["audio"]["mp3"])}"></audio>{ins}</div>')
        else:
            reasons = Counter(f for t in ln["takes"] for f in t["fails"])
            rs = "、".join(f"{k}×{v}" for k, v in reasons.most_common())
            out.append(f'<div class="line">{head}<div class="fail">⚠ 守門：{len(ln["takes"])} 個 take 皆未通過（{esc(rs)}），無音檔。</div></div>')
    return "".join(out)


def pr(x):
    return f"{x * 100:.0f}%" if x is not None else "—"


def main():
    out_dir = Path(sys.argv[1])
    data = json.loads((out_dir / "candidates_r2.json").read_text(encoding="utf-8"))
    q = data["qwen3_tts"]
    chars = json.loads((Path(__file__).resolve().parent.parent / "characters.json").read_text(encoding="utf-8"))["characters"]
    cmeta = {c["id"]: c for c in chars}
    accents = q["accents"]

    # 摘要表
    allst = q["first_round_stats"]
    rows = []
    for a in accents:
        st = allst.get(f"ALL|{a}")
        if st:
            rows.append(f'<tr><td>{esc(a)}</td><td>{esc(accents[a] or "（不加口音提示，對照組）")}</td><td>{st["n"]}</td><td>{pr(st["pass_rate"])}</td><td>{pr(st["yue_rate"])}</td><td>{st["mean_cer"]:.3f}</td><td>{esc(st["fail_reasons"])}</td></tr>')
    vrows = []
    for v in q["voices"]:
        cells = []
        for a in accents:
            st = allst.get(f"{v['id']}|{a}")
            cells.append(f'<td>{pr(st["pass_rate"])}（yue {pr(st["yue_rate"])}）</td>' if st else "<td>—</td>")
        vrows.append(f'<tr><td>{esc(v["id"])}</td>{"".join(cells)}</tr>')
    summary = (
        '<div class="sum"><h3>口音提示詞比較（第 0 輪 take、未重抽、全部 13 個聲音 × 4 句）</h3>'
        f'<table><tr><th>組別</th><th>口音提示詞</th><th>take 數</th><th>守門通過率</th><th>粵語淘汰率</th><th>平均 CER</th><th>失敗原因</th></tr>{"".join(rows)}</table>'
        f'<h3>各聲音第 0 輪守門通過率</h3><table><tr><th>聲音</th>{"".join(f"<th>{esc(a)}</th>" for a in accents)}</tr>{"".join(vrows)}</table></div>'
    )

    lv = data.get("lid_validation")
    lv_html = ""
    if lv:
        r1 = lv["round1_117"]
        kinds = "".join(f'<tr><td>{esc(k)}</td><td>{d["n"]}</td><td>{d["whisper_yue"]}</td><td>{d["sensevoice_yue"]}</td><td>{d["mean_cer"]}</td><td>{d["passed_all_gates"]}</td></tr>' for k, d in r1["by_kind"].items())
        lv_html = (
            '<div class="sum"><h3>守門器驗證：拿第一輪 117 個音檔（Gemini 聽出大量粵語）重測</h3>'
            f'<table><tr><th>第一輪類別</th><th>音檔數</th><th>Whisper 判 yue</th><th>SenseVoice 判 yue</th><th>Paraformer 平均 CER</th><th>通過全部守門</th></tr>{kinds}</table>'
            f'<div class="meta">結論：Whisper 語種偵測對這批粵語污染幾乎無感（117 個只抓 {r1["whisper_flagged_yue"]} 個），SenseVoiceSmall 抓 {r1["sensevoice_yue"]} 個，與 Gemini 的聽感一致；因此守門改為 SenseVoice 與 Whisper 任一判 yue 即淘汰。'
            f'本頁所有音檔經 SenseVoice 事後檢查：{esc(lv["sensevoice_labels"])}（本輪生成當下守門尚未加 SenseVoice，故以事後檢查把關；VoxCPM2 抓到的 yue 已撤下）。</div></div>'
        )
    by_char = {}
    for v in q["voices"]:
        by_char.setdefault(v["character"], []).append(v)
    nav = "".join(f'<a href="#{esc(c)}">{esc(cmeta[c]["name"])}</a>' for c in by_char) + '<a href="#cp">口頭禪</a>' + ('<a href="#vox">VoxCPM2 對照</a>' if data.get("voxcpm2") else "")
    secs = []
    for cid, vs in by_char.items():
        cm = cmeta[cid]
        cards = []
        for v in vs:
            body = []
            for a, ad in v["accents"].items():
                fr = ad["first_round"]
                passed = sum(1 for l in ad["lines"] if l.get("audio"))
                head = f'<h4>口音 {esc(a)}：{esc(accents[a] or "對照（無口音提示）")}</h4><div class="meta">第 0 輪通過率 {pr(fr["pass_rate"])}｜重抽後 {passed}/{len(ad["lines"])} 句通過｜跨句說話人一致性 {ad["consistency"] if ad["consistency"] is not None else "—"}</div>'
                inner = render_lines(ad["lines"], v["f0_range"])
                if ad["kind"] == "control":
                    body.append(f'<details><summary>對照組 {esc(a)}（不加口音提示，只在第 0 輪抽樣）</summary><div class="acc">{head}{inner}</div></details>')
                else:
                    body.append(f'<div class="acc">{head}{inner}</div>')
            cl = v.get("clone_mode")
            if cl:
                if cl.get("skipped"):
                    body.append(f'<details><summary>設計→複製（口音 {esc(cl["accent"])}）：略過</summary><div class="fail">{esc(cl["skipped"])}</div></details>')
                elif cl.get("ref_audio"):
                    rows_ = []
                    for l in cl["lines"]:
                        t = next((t for t in l["takes"] if t["file"] == l["chosen_file"]), None)
                        orig = next(x for x in v["accents"][cl["accent"]]["lines"] if x["id"] == l["id"])
                        if l.get("audio") and t:
                            rows_.append(f'<div class="line"><div class="txt">{esc(orig["text"])}</div>{gate_html(t, v["f0_range"], l["audio"])}<audio controls preload="none" src="{esc(l["audio"]["mp3"])}"></audio></div>')
                        else:
                            rows_.append(f'<div class="line"><div class="txt">{esc(orig["text"])}</div><div class="fail">⚠ 複製模式 {len(l["takes"])} 個 take 皆未通過守門，無音檔。</div></div>')
                    body.append(
                        f'<details><summary>設計→複製（口音 {esc(cl["accent"])}）：一致性 {cl.get("consistency")}｜參考音通過守門</summary>'
                        f'<div class="meta">參考句（VoiceDesign 生成並通過守門）：{esc(cl["ref_text"])}</div><audio controls preload="none" src="{esc(cl["ref_audio"]["mp3"])}"></audio>{"".join(rows_)}</details>'
                    )
            cards.append(f'<div class="cand"><h3>{esc(v["label"])}（{esc(v["id"])}）</h3><div class="prompt">聲音設計提示詞（基底，情緒不在此）：{esc(v["design"])}</div>{"".join(body)}</div>')
        secs.append(f'<section class="char" id="{esc(cid)}"><h2>{esc(cm["name"])}</h2><div class="role">{esc(cm["role"])}</div><div>{esc(cm["profile"])}</div><div class="cands">{"".join(cards)}</div></section>')

    # 口頭禪
    cps = {}
    for c in q.get("catchphrases", []):
        cps.setdefault((c["id"], c["text"]), []).append(c)
    cp_html = []
    for (cid, text), items in cps.items():
        rows_ = []
        for c in items:
            tk = next((t for t in c["takes"] if t["file"] == c["chosen_file"]), None)
            asr = "、".join(sorted({t["asr_text"] or "（空）" for t in c["takes"]}))
            au = f'<audio controls preload="none" src="{esc(c["audio"]["mp3"])}"></audio>' if c.get("audio") else '<span class="fail">無通過的 take</span>'
            rows_.append(f'<tr><td>{esc(c["voice"])}／{esc(c["accent"])}</td><td>{c["pass"]}/{c["n"]}</td><td>{esc(asr)}</td><td>{au}</td></tr>')
        cp_html.append(f'<h4>「{esc(text)}」（期望轉寫：{esc(items[0]["expect"])}，CER 必須為 0）</h4><table><tr><th>聲音／口音</th><th>通過</th><th>ASR 轉寫（各 take）</th><th>試聽（通過的 take）</th></tr>{"".join(rows_)}</table>')
    cp_sec = f'<section class="char" id="cp"><h2>口頭禪獨立抽測</h2><div class="meta">口頭禪要求 Paraformer 轉寫與期望完全一致（CER = 0）。</div>{"".join(cp_html)}</section>' if cp_html else ""

    # VoxCPM2
    vox_sec = ""
    vx = data.get("voxcpm2")
    if vx:
        vrows_ = []
        vcards = []
        for v in vx["voices"]:
            for var, vd in v["variants"].items():
                fr = vd["first_round"]
                vrows_.append(f'<tr><td>{esc(v["id"])}</td><td>{esc(var)}</td><td>{pr(fr["pass_rate"])}</td><td>{pr(fr["yue_rate"])}</td><td>{esc(fr["fail_reasons"])}</td></tr>')
            blocks = []
            for var, vd in v["variants"].items():
                inner = []
                for ln in vd["lines"]:
                    t = next((t for t in ln["takes"] if t.get("file") == ln["chosen_file"]), None)
                    if ln.get("audio") and t:
                        inner.append(f'<div class="line"><div class="txt">{esc(ln["text"])}</div><div class="tts">送進 VoxCPM2：{esc(ln["text_tts"])}</div>{gate_html(t, v["f0_range"], ln["audio"])}<audio controls preload="none" src="{esc(ln["audio"]["mp3"])}"></audio></div>')
                    else:
                        inner.append(f'<div class="line"><div class="txt">{esc(ln["text"])}</div><div class="fail">⚠ {ln["attempts"]} 個 take 皆未通過守門，無音檔。</div></div>')
                blocks.append(f'<details><summary>{esc(v["id"])}｜{esc(var)}（第 0 輪通過率 {pr(vd["first_round"]["pass_rate"])}）</summary>{"".join(inner)}</details>')
            vcards.append("".join(blocks))
        vox_sec = (
            f'<section class="char" id="vox"><h2>備案對照：VoxCPM2（{esc(vx["license"])}）</h2><div class="meta">同樣的聲音描述（口音提示詞 A）、同樣 4 句、同一套守門；t2s＝台詞與描述轉簡體字形，trad＝保留繁體。</div>'
            f'<table><tr><th>聲音</th><th>文字版本</th><th>第 0 輪通過率</th><th>粵語淘汰率</th><th>失敗原因</th></tr>{"".join(vrows_)}</table>{"".join(vcards)}</section>'
        )

    m = q["model"]
    page = f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>角色聲音試聽 第二輪・直到你找到我</title><style>{CSS}</style></head><body>
<header><h1>角色聲音試聽（第二輪：t2s＋正向口音提示詞＋自動守門）</h1>
<p class="lead">模型：{esc(m["design"])}（{esc(m["license"])}）｜聲音全部由文字描述設計，未使用任何真人聲音｜送進 TTS 的台詞與 instruct 先經 OpenCC t2s（只轉字形，保留台灣詞彙；遊戲顯示文字不變）、移除句首「……」、結巴「別、別」改「別，別」。</p>
<div class="warn">每個 take 都過守門才會出現在本頁：Whisper-large-v3 語種偵測（yue 最高或機率 &gt; 0.1 淘汰）、Paraformer-zh 純普通話 CER ≤ 0.2、各聲音 F0 區間、長度上限、起音延遲（句首喘氣）、尾端能量（不收尾）。<b>守門只能擋明顯壞掉的；台灣腔、情緒、像不像角色仍須人耳判斷。</b>未通過的 take 不放本頁，記錄保留在 candidates_r2.json。後處理：loudnorm −16 LUFS、TP −2.0 dBTP、前後 12 ms 淡入淡出。</div>
{summary}{lv_html}<nav>{nav}</nav></header><main>{"".join(secs)}{cp_sec}{vox_sec}</main></body></html>"""
    (out_dir / "index.html").write_text(page, encoding="utf-8")
    print("wrote", out_dir / "index.html")


if __name__ == "__main__":
    main()
