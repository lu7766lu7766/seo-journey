"""r3_common 的本機單元測試（不需 GPU）：python3 tests_r3_common.py（需 opencc-python-reimplemented）。"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r3_common import apply_equiv, banned_hits, cer_equiv, digits_to_cn, gate, load_json, norm_text, prep_text

CASES = [
    ("你來得正好。", "你来得正好。"),
    ("妳的聲音，剛好讓麵團醒了。", "你的声音，刚好让面团醒了。"),
    ("哎呀……英文頁那個，是我翻的。", "哎呀，英文页那个，是我翻的。"),
    ("……搜不到。", "搜不到。"),
    ("……謝了。", "谢了。"),
    ("搜不到……", "搜不到。"),
    ("其實我一直在想，你是不是覺得我很吵……", "其实我一直在想，你是不是觉得我很吵。"),
    ("結論先說。我想說的是……我……", "结论先说。我想说的是，我。"),
    ("孩子，你看這個——", "孩子，你看这个。"),
    ("真的嗎……！", "真的吗！"),
    ("真的嗎…？", "真的吗？"),
    ("別、別突然講這麼溫柔的話啦！", "别，别突然讲这么温柔的话啦！"),
    ("青葉創校於 1985 年。", "青叶创校于一九八五年。"),
    ("標準答案：青葉學園、1982、青葉區青葉路四段 12 號。", "标准答案：青叶学园、一九八二、青叶区青叶路四段十二号。"),
    ("哎呀，我明明記得，是 1982。", "哎呀，我明明记得，是一九八二。"),
    ("Disallow 到底！", "Disallow 到底！"),
    ("AEO 評審夏川晴講評：結論先說，超級清楚！", "AEO 评审夏川晴讲评：结论先说，超级清楚！"),
]
bad = 0
for src, exp in CASES:
    got = prep_text(src)
    if got != exp:
        bad += 1
        print("FAIL", repr(src), "→", repr(got), "預期", repr(exp))
assert digits_to_cn("82") == "八十二" and digits_to_cn("10") == "十" and digits_to_cn("2026") == "二零二六"

# 白名單：只在參考文字含正規詞時才換
c, ap, _ = cer_equiv(prep_text("結論先說！"), "杰伦先说")
assert c == 0 and ap, (c, ap)
c, ap, _ = cer_equiv(prep_text("今天天氣很好"), "杰伦先说")
assert c > 0.5 and not ap  # 參考不含「結論」→ 不放寬
c, ap, _ = cer_equiv(prep_text("結論！筆記要被引用，照片集別被拿去訓練！"), "杰伦筆记要被引用照片集别被拿去训练")
assert c == 0, c
c, _, _ = cer_equiv(prep_text("宇宙都向我們敞開了"), "宇宙都向我们敞开")
assert abs(c - 1 / 9) < 1e-6
# 含拉丁字母只比 CJK 部分
c, _, _ = cer_equiv(prep_text("SEO 評審白鷺凜講評"), "seo评审白鹭凛讲评")
assert c == 0, c
# 1985 轉寫成阿拉伯數字也算對
c, _, _ = cer_equiv(prep_text("創校於 1985 年"), "创校于1985年")
assert c == 0, c

cfg = load_json("voices_r3.json")
G = cfg["gates"]
V = {v["id"]: v for v in cfg["voices"]}
for vid, lines in cfg["r3_lines"].items():
    for l in lines:
        assert not banned_hits(l["emotion_instruct"], cfg["banned_words"]), (l["id"], l["emotion_instruct"])
assert sorted(banned_hits("聲音響亮，帶氣音", cfg["banned_words"])) == sorted(["響亮", "氣音"])
assert not banned_hits("自然口語不結巴破音，不破音不尖叫", cfg["banned_words"])


def take(**kw):
    m = dict(lang_top="zh", yue_prob=0.0, sv_lang="zh", sv_event="Speech", cer=0.0, asr_text="", f0_median_hz=250, duration_s=3.0, lead_s=0.3, tail_ratio=0.2, _hyp_norm="")
    m.update(kw)
    return m


ok, f = gate(take(), G, V["rin_A"], 12)
assert ok, f
assert gate(take(sv_lang="yue"), G, V["rin_A"], 12)[1] == ["yue"]
assert gate(take(sv_lang="ja"), G, V["rin_A"], 12)[1] == ["sv_lang"]
assert gate(take(sv_lang=None), G, V["rin_A"], 12)[1] == ["sv_lang"]
assert gate(take(sv_event="Breath"), G, V["rin_A"], 12)[1] == ["sv_event"]
assert gate(take(cer=1 / 12), G, V["rin_A"], 12)[1] == ["cer"]  # ≤12 字：任何錯字都不行（1/12=0.083）
assert gate(take(cer=1 / 13), G, V["rin_A"], 13)[0]  # 13 字允許 1 個錯字
assert gate(take(cer=0.25), G, V["rin_A"], 4)[1] == ["cer"] and gate(take(cer=0.0), G, V["rin_A"], 4)[0]
assert gate(take(f0_median_hz=330), G, V["hare_D"], 12)[1] == ["f0_high"] and gate(take(f0_median_hz=310), G, V["hare_D"], 12)[0]
assert gate(take(f0_median_hz=240), G, V["kuro_A"], 12)[1] == ["f0_high"] and gate(take(f0_median_hz=230), G, V["kuro_A"], 12)[0]
assert gate(take(f0_median_hz=226), G, V["npc_boy_A"], 12)[1] == ["f0_high"]
assert gate(take(lead_s=1.1), G, V["rin_A"], 12)[1] == ["lead"] and gate(take(lead_s=1.1, f0_median_hz=200), G, V["npc_woman_A"], 12)[0]
assert gate(take(lead_s=1.3, f0_median_hz=200), G, V["npc_woman_A"], 12)[1] == ["lead"]
ok, f = gate(take(asr_text="杰伦先说", _hyp_norm=norm_text("杰伦先说")), G, V["hare_D"], 4, catchphrase=True, must_have=["結論先說"])
assert ok, f
ok, f = gate(take(asr_text="别论先说", _hyp_norm=norm_text("别论先说")), G, V["hare_D"], 4, catchphrase=True, must_have=["結論先說"])
assert "phrase" in f, f
print("OK" if not bad else f"{bad} 個文字預處理案例失敗")
sys.exit(1 if bad else 0)
