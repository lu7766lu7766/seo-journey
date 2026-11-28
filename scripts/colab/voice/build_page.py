"""由 candidates.json 產生自包含的繁中試聽頁 index.html（音檔以相對路徑引用 audio/*.mp3）。

用法：python3 build_page.py <voice_dir>
"""

import html
import json
import sys
from pathlib import Path

CSS = """
:root{--bg:#f7f4ee;--card:#fff;--ink:#2a2a33;--mute:#6b6b78;--line:#e4dfd3;--acc:#c0392b;--acc2:#2c5aa0;--ok:#2e7d5b}
@media (prefers-color-scheme:dark){:root{--bg:#17181d;--card:#20222a;--ink:#ecebe6;--mute:#9a9aa8;--line:#34363f;--acc:#ff8a7a;--acc2:#8ab4f8;--ok:#6fcf9f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 -apple-system,"PingFang TC","Noto Sans TC",sans-serif}
header,main{max-width:1080px;margin:0 auto;padding:0 20px}
h1{font-size:26px;margin:32px 0 6px}h2{font-size:21px;margin:0}h3{font-size:16px;margin:0 0 6px}
.lead{color:var(--mute);margin:0 0 18px}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 24px}nav a{padding:4px 12px;border:1px solid var(--line);border-radius:99px;color:var(--ink);text-decoration:none;background:var(--card)}
section.char{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:0 0 26px}
.role{color:var(--mute);margin:2px 0 10px}
.cands{display:grid;grid-template-columns:repeat(auto-fit,minmax(440px,1fr));gap:16px;margin-top:14px}
.cand{border:1px solid var(--line);border-radius:12px;padding:14px;background:var(--bg)}
.cand.rec{border-color:var(--ok);box-shadow:0 0 0 1px var(--ok)}
.badge{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;background:var(--ok);color:#fff;margin-left:6px;vertical-align:middle}
.prompt{background:var(--card);border:1px dashed var(--line);border-radius:8px;padding:8px 10px;font-size:13px;color:var(--mute);margin:6px 0 10px;white-space:pre-wrap}
.line{padding:8px 0;border-top:1px solid var(--line)}.line:first-of-type{border-top:0}
.txt{font-size:15px}.meta{font-size:12px;color:var(--mute)}.emo{display:inline-block;font-size:12px;background:var(--acc2);color:#fff;border-radius:6px;padding:0 6px;margin-right:6px}
audio{width:100%;height:34px;margin-top:4px}
details{margin-top:10px;font-size:13px}summary{cursor:pointer;color:var(--acc2)}
.metrics{font-size:12px;color:var(--mute);margin:4px 0 6px}
.warn{background:var(--card);border-left:4px solid var(--acc);padding:8px 12px;margin:10px 0 20px;font-size:13px}
@media(max-width:560px){.cands{grid-template-columns:1fr}}
"""


def esc(s):
    return html.escape(str(s))


def render_voice(v, rec):
    is_rec = rec.get("voice_id") == v["id"] and not v["id"].startswith("npc_")
    badge = '<span class="badge">客觀推薦</span>' if is_rec else ""
    rows = []
    for ln in v["lines"]:
        rows.append(
            f'<div class="line"><div class="txt"><span class="emo">{esc(ln["emotion"])}</span>{esc(ln["text"])}</div>'
            f'<div class="meta">表情 {esc(ln["face"])}｜情緒指令：{esc(ln["emotion_instruct"])}｜seed {ln["seed"]}｜{ln["duration_s"]}s｜字錯率 {ln["cer"]:.2f}</div>'
            f'<audio controls preload="none" src="{esc(ln["mp3"])}"></audio></div>'
        )
    clone_html = ""
    ce = v.get("clone_experiment")
    if ce:
        crow = "".join(
            f'<div class="line"><div class="meta">{esc(next(l["text"] for l in v["lines"] if l["id"] == c["id"]))}（複製模式，字錯率 {c["cer"]:.2f}）</div>'
            f'<audio controls preload="none" src="{esc(c["mp3"])}"></audio></div>'
            for c in ce["lines"]
        )
        clone_html = (
            f'<details><summary>實驗：「設計→複製」模式（一致性 {ce["consistency"]:.3f}；直接設計模式 {v["design_mode_consistency"]:.3f}）</summary>'
            f'<div class="meta">參考音由同一個聲音描述的 VoiceDesign 生成（seed {ce["ref_seed"]}）：「{esc(ce["ref_text"])}」</div>'
            f'<audio controls preload="none" src="{esc(ce["ref_mp3"])}"></audio>{crow}</details>'
        )
    return (
        f'<div class="cand{" rec" if is_rec else ""}"><h3>候選 {esc(v["label"])}{badge}</h3>'
        f'<div class="prompt">聲音設計提示詞：{esc(v["design_prompt"])}</div>'
        f'<div class="metrics">基頻中位數約 {v["mean_f0_hz"]} Hz｜語速約 {v["mean_chars_per_s"]} 字/秒｜平均字錯率 {v["mean_cer"]:.3f}｜跨句說話人一致性 {v["design_mode_consistency"]:.3f}</div>'
        f'{"".join(rows)}{clone_html}</div>'
    )


def main():
    vd = Path(sys.argv[1])
    data = json.loads((vd / "candidates.json").read_text(encoding="utf-8"))
    chars = {}
    for v in data["voices"]:
        chars.setdefault(v["character"], []).append(v)
    nav = "".join(f'<a href="#{esc(cid)}">{esc(vs[0]["character_name"])}</a>' for cid, vs in chars.items())
    secs = []
    for cid, vs in chars.items():
        rec = data["recommendations"].get(cid, {})
        rec_note = ""
        if len(vs) > 1:
            rec_note = f'<p class="meta">客觀推薦：{esc(rec.get("voice_id", ""))} — {esc(rec.get("reason", ""))}</p>'
        secs.append(
            f'<section class="char" id="{esc(cid)}"><h2>{esc(vs[0]["character_name"])}</h2>'
            f'<div class="role">{esc(vs[0]["character_role"])}</div><div>{esc(vs[0]["character_profile"])}</div>{rec_note}'
            f'<div class="cands">{"".join(render_voice(v, rec) for v in vs)}</div></section>'
        )
    m = data["model"]
    page = f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>角色聲音試聽・直到你找到我</title><style>{CSS}</style></head><body>
<header><h1>角色聲音試聽（選角研究）</h1>
<p class="lead">模型：{esc(m["design"])}（{esc(m["license"])}）｜全部聲音由文字描述生成，未使用任何真人聲音｜每句取 {data["takes_per_line"]} 個 take，以字錯率與說話人一致性客觀挑選｜後處理：{esc(data["postprocess"]["format"])}、約 −16 LUFS。</p>
<div class="warn">「客觀推薦」只依機器指標（Whisper 字錯率、WavLM 說話人嵌入一致性）排序，<b>未代表聽感</b>。請直接試聽、挑出你喜歡的候選。主角與旁白不配音。</div>
<nav>{nav}</nav></header><main>{"".join(secs)}</main></body></html>"""
    (vd / "index.html").write_text(page, encoding="utf-8")
    print("wrote", vd / "index.html")


if __name__ == "__main__":
    main()
