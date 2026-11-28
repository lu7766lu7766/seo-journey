"""第三輪試聽頁 index.html：一頁聽完全部 8 個聲音。
  ① 重跑的 3 個角色（晴 hare_D、翔 kuro_A、NPC 成年女性 npc_woman_A）：每句最多 2 個通過新守門的 take，附守門數值與通過率
  ② 5 個已定案角色（凜、未來、千尋、NPC 沉穩少女、NPC 少年）：第二輪口音 A 的代表句（第二輪產物，原樣複製）
  ③ 量產煙霧測試 10 句成品（含情緒指令、守門結果；沒過的列在最下面）

用法：python3 build_page_r3.py --r3 <voice-r3> [--r2 <voice-r2>] [--smoke <voice-produce-smoke>] [--out <voice-r3>]
音檔會複製到 <out>/audio/（r2_*、smoke_*），頁面只用相對路徑，整個資料夾可直接搬動。
"""

import argparse
import html
import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "r2"))
from build_page_r2 import CSS  # noqa: E402

# 已定案角色的代表句（第二輪口音 A）：各取一句平常、一句帶情緒
REP = {"rin_A": ["rin_1", "rin_3"], "mirai_A": ["mirai_1", "mirai_4"], "sensei_A": ["sensei_1", "sensei_3"], "npc_girl_A": ["npc_girl_1", "npc_girl_4"], "npc_boy_A": ["npc_boy_1", "npc_boy_3"]}
LABEL = {"rin_A": "凜（學生會長）", "mirai_A": "未來（GEO 評審）", "sensei_A": "千尋（顧問老師）", "npc_girl_A": "NPC 沉穩少女（料理社社長）", "npc_boy_A": "NPC 少年（籃球社隊長、天文社社長）"}
E = lambda s: html.escape(str(s))  # noqa: E731


def pr(x):
    return f"{x * 100:.0f}%"


def gate_line(t, f0r, lead_max, cer_cap=None):
    def b(ok, txt):
        return f'<b class="{"ok" if ok else "bad"}">{txt}</b>'

    parts = [f"語種 SV={E(t.get('sv_lang'))}/{E(t.get('sv_event'))}", f"CER {b(cer_cap is None or t['cer'] <= cer_cap, '%.3f' % t['cer'])}", f"F0 {b(f0r[0] <= t['f0_median_hz'] <= f0r[1], '%.0f' % t['f0_median_hz'])} Hz（{f0r[0]}–{f0r[1]}）"]
    lead = t.get("lead_s")
    parts.append(f"起音延遲 {b(lead is None or lead <= lead_max, '—' if lead is None else '%.2f' % lead)}s（上限 {lead_max}）")
    parts.append(f"{t['duration_s']:.1f}s")
    return '<span class="gate">' + " ｜".join(parts) + "</span>"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--r3", required=True)
    ap.add_argument("--r2", default="/tmp/seo-journey-audio/voice-r2")
    ap.add_argument("--smoke")
    ap.add_argument("--out")
    a = ap.parse_args()
    r3, r2 = Path(a.r3), Path(a.r2)
    out = Path(a.out) if a.out else r3
    (out / "audio").mkdir(parents=True, exist_ok=True)
    cfg = json.loads((Path(__file__).resolve().parent / "voices_r3.json").read_text(encoding="utf-8"))
    G = cfg["gates"]
    V = {v["id"]: v for v in cfg["voices"]}
    data = json.loads((r3 / "candidates_r3.json").read_text(encoding="utf-8"))

    # ---------- ① 重跑 3 角色
    secs3 = []
    ov_rows = []
    for vid, v in data["voices"].items():
        vc = V[vid]
        lead_max = vc.get("lead_s_max", G["lead_s_max"])
        fr = v["first_round"]
        sent_ok = sum(1 for ln in v["lines"] if ln["chosen"])
        within = sum(1 for ln in v["lines"] if ln["first_pass_attempt"] is not None and ln["first_pass_attempt"] <= G["max_attempts"])
        ov_rows.append(f"<tr><td>{E(vid)}</td><td>{E(v['label'])}</td><td>{fr['pass']}/{fr['n']}（{pr(fr['pass'] / max(1, fr['n']))}）</td><td>{within}/{len(v['lines'])}</td><td>{E(fr['fails'])}</td></tr>")
        body = []
        for ln in v["lines"]:
            players = []
            for au in ln["audio"]:
                t = next(t for t in ln["takes"] if t["file"] == au["file"])
                tag = "" if au["passed"] else '<div class="fail">⚠ 未通過守門的「最接近」take（' + E("、".join(au["fails"])) + "），僅供參考，不會進量產。</div>"
                players.append(f'<div>{tag}{gate_line(t, vc["f0"], lead_max, 0.0 if ln["catchphrase"] or ln["nchar"] <= G["short_chars"] else G["cer_max"])}<div class="meta">ASR：{E(t["asr_text"])}｜{au["lufs"]} LUFS / {au["true_peak_dbtp"]} dBTP</div><audio controls preload="none" src="{E(au["mp3"])}"></audio></div>')
            if not players:
                players.append('<div class="fail">⚠ 這句沒有任何 take 通過守門。</div>')
            body.append(
                f'<div class="line"><div class="txt"><span class="emo">{E(ln["face"] or "口頭禪")}</span>{E(ln["text"])}</div><div class="tts">送進 TTS：{E(ln["text_tts"])}</div>'
                f'<div class="meta">情緒指令：{E(ln["emotion_instruct"])}</div><div class="meta">首輪 {ln["first_round_pass"]}/{ln["first_round_n"]} 通過；第 {ln["first_pass_attempt"] or "—"} 次嘗試首次通過（共 {ln["attempts"]} 個 take）</div>{"".join(players)}</div>'
            )
        secs3.append(f'<div class="cand"><h3>{E(vid)}（{E(v["label"])}）</h3><div class="prompt">聲音基底描述：{E(v["design"])}\n口音 A：{E(cfg["accent"])}</div>{"".join(body)}</div>')

    # ---------- ② 5 個已定案角色（第二輪 A）
    r2d = json.loads((r2 / "candidates_r2.json").read_text(encoding="utf-8"))["qwen3_tts"]["voices"]
    secs5 = []
    for vid, lids in REP.items():
        v = next(x for x in r2d if x["id"] == vid)
        rows = []
        for ln in v["accents"]["A"]["lines"]:
            if ln["id"] not in lids or not ln.get("audio"):
                continue
            t = next(t for t in ln["takes"] if t["file"] == ln["chosen_file"])
            dst = f"audio/r2_{vid}__{ln['id']}.mp3"
            shutil.copy(r2 / ln["audio"]["mp3"], out / dst)
            rows.append(
                f'<div class="line"><div class="txt"><span class="emo">{E(ln["emotion"])}</span>{E(ln["text"])}</div><div class="meta">情緒指令（第二輪原樣）：{E(ln["emotion_instruct"])}</div>'
                f'<span class="gate">第二輪守門：CER {t["cer"]:.3f} ｜F0 {t["f0_median_hz"]:.0f} Hz ｜{t["duration_s"]:.1f}s ｜SV={E(ln["audio"].get("sv_lang"))}</span><audio controls preload="none" src="{dst}"></audio></div>'
            )
        secs5.append(f'<div class="cand"><h3>{E(LABEL[vid])}（{E(vid)}）</h3><div class="prompt">聲音基底描述：{E(V[vid]["design"])}</div>{"".join(rows)}</div>')

    # ---------- ③ 煙霧測試
    smoke_html = ""
    if a.smoke:
        sm = Path(a.smoke)
        rep = json.loads((sm / "report.json").read_text(encoding="utf-8")) if (sm / "report.json").exists() else {}
        fin = json.loads((sm / "finalize_summary.json").read_text(encoding="utf-8")) if (sm / "finalize_summary.json").exists() else {}
        ids = json.loads((Path(__file__).resolve().parent.parent / "produce" / "smoke_ids.json").read_text(encoding="utf-8"))
        rows = []
        for lid in ids:
            side = sm / "raw" / "wav" / f"{lid}.json"
            fside = sm / "raw" / "failed" / f"{lid}.json"
            mp3 = sm / "public-voice" / f"{lid}.mp3"
            meta = json.loads(side.read_text(encoding="utf-8")) if side.exists() else (json.loads(fside.read_text(encoding="utf-8")) if fside.exists() else None)
            if meta is None:
                rows.append(f'<div class="line"><div class="txt">{E(lid)}</div><div class="fail">⚠ 沒有結果</div></div>')
                continue
            m = meta["metrics"]
            vc = V[meta["voice"]]
            if mp3.exists():
                dst = f"audio/smoke_{lid.replace('/', '__')}.mp3"
                shutil.copy(mp3, out / dst)
                player = f'<audio controls preload="none" src="{dst}"></audio>'
                fl = ""
            else:
                player = ""
                fl = f'<div class="fail">⚠ {meta["attempts"]} 次嘗試仍未通過：{E("、".join(m["fails"]))}（最接近的 take 的 ASR：{E(m["asr_text"])}）</div>'
            rows.append(
                f'<div class="line"><div class="txt"><span class="emo">{E(meta["voice"])}</span>{E(meta["text"])}</div><div class="tts">送進 TTS：{E(meta["text_tts"])}</div>'
                f'<div class="meta">{E(lid)}｜表情 {E(meta["face"])}｜情緒指令：{E(meta["emotion_instruct"])}｜用到 {E(meta["emotion_trace"])}</div>'
                f'<div class="meta">第 {meta["attempts"]} 次嘗試{"通過" if mp3.exists() else "仍失敗"}（各次：{E([("O" if t["passed"] else "X:" + ",".join(t["fails"])) for t in meta["takes"]])}）｜ASR：{E(m["asr_text"])}</div>'
                f'{gate_line(m, vc["f0"], vc.get("lead_s_max", G["lead_s_max"]))}{fl}{player}</div>'
            )
        stats = (
            f'<div class="meta">{rep.get("passed", "?")}/{rep.get("attempted", "?")} 句通過；{rep.get("takes", "?")} 個 take（{rep.get("takes_per_line", "?")} 個/句）；生成 {rep.get("gen_s_per_take", "?")}s/take、評測 {rep.get("eval_s_per_take", "?")}s/take；'
            f'MP3 響度 {fin.get("lufs_min", "?")}～{fin.get("lufs_max", "?")} LUFS、最高 true peak {fin.get("true_peak_max_dbtp", "?")} dBTP；manifest 條目 {fin.get("mp3_total", "?")}</div>'
        )
        smoke_html = f'<section class="char" id="smoke"><h2>③ 量產煙霧測試（10 句）</h2><div class="role">走完整條量產流程：讀 voice-lines.json → 依說話者／NPC 名牌選聲音 → 依表情與上下文產生情緒指令 → 12 句一批 → 全守門 → 重抽 → 增量下載 → MP3＋manifest。</div>{stats}<div class="cands" style="grid-template-columns:1fr">{"".join(rows)}</div></section>'

    overview = (
        '<div class="sum"><h3>第三輪重跑 3 角色的守門結果（新守門：SenseVoice 必要、CER ≤ 0.08、短句／口頭禪 CER = 0）</h3>'
        f'<table><tr><th>聲音</th><th>角色</th><th>首輪 take 通過率</th><th>逐句 ≤{G["max_attempts"]} 次內通過</th><th>首輪失敗原因</th></tr>{"".join(ov_rows)}</table></div>'
    )
    page = f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>角色聲音試聽 第三輪・直到你找到我</title><style>{CSS}</style></head><body>
<header><h1>角色聲音試聽（第三輪：8 個定案聲音一頁聽完）</h1>
<p class="lead">全部口音 A、設計模式、Qwen3-TTS-12Hz-1.7B-VoiceDesign（Apache-2.0）；聲音完全由文字描述設計，未使用任何真人聲音。送進 TTS 的台詞先經：妳→你、句中「……」→「，」、句末「……」→「。」、句首「……」移除、數字轉中文、OpenCC t2s；遊戲顯示文字不變。</p>
<div class="warn">守門只能擋明顯壞掉的（粵語、念錯、音高離譜、雜訊事件、不收尾）。台灣腔、情緒是否到位、像不像角色一律要人耳判斷。<b>起音延遲</b>為 ASR 首字時間戳扣掉第一個有聲能量（若取不到才退回 pyin 啟發式），仍是未經耳驗校準的啟發式。</div>
{overview}<nav><a href="#r3">① 重跑 3 角色</a><a href="#final5">② 已定案 5 角色</a>{'<a href="#smoke">③ 煙霧測試</a>' if smoke_html else ''}</nav></header>
<main>
<section class="char" id="r3"><h2>① 重跑 3 角色：晴・翔・NPC 成年女性</h2><div class="role">每句最多 2 個通過守門的 take（同句不同抽樣，可比較穩定度）</div><div class="cands">{"".join(secs3)}</div></section>
<section class="char" id="final5"><h2>② 已定案 5 角色（第二輪口音 A 的代表句）</h2><div class="role">第二輪產物原樣放入，供和上面 3 個新聲音一起比對音色與年齡層。</div><div class="cands">{"".join(secs5)}</div></section>
{smoke_html}
</main></body></html>"""
    (out / "index.html").write_text(page, encoding="utf-8")
    print("wrote", out / "index.html")


if __name__ == "__main__":
    main()
