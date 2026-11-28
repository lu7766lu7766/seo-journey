"""r3_common 的本機單元測試（不需 GPU）：python3 tests_r3_common.py（需 opencc-python-reimplemented）。"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from r3_common import apply_equiv, banned_hits, cer_equiv, cer_pinyin, digits_to_cn, gate, load_json, negation_hits, norm_text, phrase_present, prep_text, to_pinyin

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
c, _, _ = cer_equiv(prep_text("我決定了！全擋！Disallow 到底！"), "我决定了全挡第四捞到底")
assert c == 0, c  # 英文詞被轉成中文亂字，不算錯
c, _, _ = cer_equiv(prep_text("我決定了！全擋！Disallow 到底！"), "我决定了全打第四捞到底")
assert abs(c - 1 / 8) < 1e-6, c
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
assert banned_hits("自然口語不結巴破音", cfg["banned_words"]) == ["破音"]  # 第四輪：不再放行否定用法，要改寫成正向描述

# ---- 否定詞 lint（第四輪）：聲音描述、口音、情緒指令都不得含「不…／別…／沒有…」這類否定句
assert negation_hits("語氣自然不刻意嘆氣") == ["不"] and negation_hits("不好意思地承認，語氣明朗親切、起音俐落平順") == []
assert negation_hits("音高不拔尖") and negation_hits("避免嘆氣") and negation_hits("沒有笑聲") and negation_hits("別拖長")
assert negation_hits("特別有精神") == [] and negation_hits("不耐煩的少年語氣") == []


def _walk_strings(o, path=""):
    if isinstance(o, str):
        yield path, o
    elif isinstance(o, dict):
        for k, v in o.items():
            if k.startswith("_note") or k in ("banned_words", "text", "must_have_phrases"):
                continue
            yield from _walk_strings(v, f"{path}.{k}")
    elif isinstance(o, list):
        for i, v in enumerate(o):
            yield from _walk_strings(v, f"{path}[{i}]")


for path, txt in _walk_strings(cfg):
    assert not negation_hits(txt), ("voices_r3.json 含否定句", path, txt)
    assert not banned_hits(txt, cfg["banned_words"]), ("voices_r3.json 含禁用字眼", path, txt)
for v in cfg["voices"]:  # 第四輪：每個聲音都有錨點與門檻，錨點檔存在且 < 200KB
    ap = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "anchors", v["anchor"])
    assert os.path.exists(ap) and os.path.getsize(ap) < 200_000, ap
    assert 0.5 < v["anchor_sim_min"] < 0.9, v["id"]
sd = {v["id"]: v for v in cfg["voices"]}
assert sd["kuro_A"]["f0"] == [95, 255] and sd["npc_woman_A"]["f0"] == [150, 235] and sd["npc_boy_A"]["f0"] == [125, 225] and sd["hare_D"]["f0"][1] == 320
assert "lowvoice" in sd["kuro_A"]["design_variants"] and "偏低沉" in sd["kuro_A"]["design_variants"]["lowvoice"]
assert "嘆氣" not in json.dumps(cfg["voices"], ensure_ascii=False) and "喘" not in json.dumps(cfg["voices"], ensure_ascii=False)

# ---- 無聲調拼音 CER（第四輪）
assert to_pinyin("部落格") == to_pinyin("布洛格") and to_pinyin("用得") == to_pinyin("用的") and to_pinyin("啦") != to_pinyin("了")
c, _, _ = cer_pinyin(prep_text("貓咪部落格最佳化"), "猫咪布洛格最佳化")
assert c == 0, c  # 部落格≡布洛格
assert cer_equiv(prep_text("貓咪部落格最佳化"), "猫咪布洛格最佳化")[0] > 0.2  # 字元 CER 會誤擋
c, _, _ = cer_pinyin(prep_text("圖片最佳化，用得真好。"), "图片最佳化用的真好")
assert c == 0, c  # 用得≡用的
c, _, _ = cer_pinyin(prep_text("別、別突然講這麼溫柔的話啦！"), "别别突然讲这么温柔的话了")
assert abs(c - 1 / 12) < 1e-6, c  # 啦≠了：刻意仍被擋（12 字 1 個錯 = 0.083 > 0.08）
assert gate(dict(lang_top="zh", yue_prob=0.0, sv_lang="zh", sv_event="Speech", cer=c, asr_text="", f0_median_hz=250, duration_s=3.0, lead_s=0.3, tail_ratio=0.2, _hyp_norm=""), cfg["gates"], sd["rin_A"], 12)[1] == ["cer"]
c, _, _ = cer_pinyin(prep_text("結論先說！"), "杰伦先说")
assert c == 0, c  # 白名單（杰倫→結論）在拼音比對下本來就等價；白名單仍保留
c, ap, _ = cer_pinyin(prep_text("結論先說！"), "杰乐先说")
assert c == 0 and ap, (c, ap)  # 「杰乐」（le）不同音，靠白名單才放行
c, _, _ = cer_pinyin(prep_text("結論先說！"), "别论先说")
assert c > 0.2, c  # 真的念歪仍會被擋
c, _, _ = cer_pinyin(prep_text("今天天氣很好"), "杰伦先说")
assert c > 0.5
c, _, _ = cer_pinyin(prep_text("我決定了！全擋！Disallow 到底！"), "我决定了全挡第四捞到底")
assert c == 0, c  # 英文詞處照舊切段比對
assert phrase_present("結論先說", norm_text("杰伦先说")) and not phrase_present("結論先說", norm_text("别论先说"))


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
assert gate(take(f0_median_hz=256), G, V["kuro_A"], 12)[1] == ["f0_high"] and gate(take(f0_median_hz=250), G, V["kuro_A"], 12)[0]
assert gate(take(f0_median_hz=90), G, V["kuro_A"], 12)[1] == ["f0_low"] and gate(take(f0_median_hz=107), G, V["kuro_A"], 12)[0]  # 翔 [95, 255]（使用者選的錨點 107 Hz 要能過）
assert gate(take(f0_median_hz=226), G, V["npc_boy_A"], 12)[1] == ["f0_high"]
assert gate(take(f0_median_hz=120), G, V["npc_boy_A"], 12)[1] == ["f0_low"] and gate(take(f0_median_hz=126), G, V["npc_boy_A"], 12)[0]  # NPC 少年 [125, 225]
assert gate(take(f0_median_hz=145), G, V["npc_woman_A"], 12)[1] == ["f0_low"] and gate(take(f0_median_hz=164), G, V["npc_woman_A"], 12)[0]  # 成年女性 [150, 235]（錨點 164 Hz 要能過）
assert gate(take(f0_median_hz=321), G, V["hare_D"], 12)[1] == ["f0_high"] and gate(take(f0_median_hz=318), G, V["hare_D"], 12)[0]  # 晴上限 320（錨點 318 Hz 要能過）
# ---- 說話人錨點守門：npc_woman_4 r0t1 與錨點的相似度 0.673（校準資料見 anchors/anchors.json）
assert gate(take(f0_median_hz=200, anchor_sim=0.673, lead_s=0.5), G, V["npc_woman_A"], 12)[1] == ["speaker"]
assert gate(take(f0_median_hz=200, anchor_sim=0.891, lead_s=0.5), G, V["npc_woman_A"], 12)[0]
assert gate(take(f0_median_hz=200, anchor_sim=None, lead_s=0.5), G, V["npc_woman_A"], 12)[0]  # 沒算相似度（沒有錨點）就不守這一關
assert gate(take(anchor_sim=0.01, duration_s=0.32), G, V["rin_A"], 4)[0]  # 短於 0.5 秒不守說話人（x-vector 不可靠）
assert gate(take(anchor_sim=0.30), G, V["rin_A"], 12)[1] == ["speaker"] and gate(take(anchor_sim=0.80), G, V["rin_A"], 12)[0]
assert gate(take(lead_s=1.1), G, V["rin_A"], 12)[1] == ["lead"] and gate(take(lead_s=1.1, f0_median_hz=200), G, V["npc_woman_A"], 12)[0]
assert gate(take(lead_s=1.3, f0_median_hz=200), G, V["npc_woman_A"], 12)[1] == ["lead"]
ok, f = gate(take(asr_text="杰伦先说", _hyp_norm=norm_text("杰伦先说")), G, V["hare_D"], 4, catchphrase=True, must_have=["結論先說"])
assert ok, f
ok, f = gate(take(asr_text="别论先说", _hyp_norm=norm_text("别论先说")), G, V["hare_D"], 4, catchphrase=True, must_have=["結論先說"])
assert "phrase" in f, f
# ---- TTS：依卡型決定精度、fp16 出 NaN 時退回 fp32、依 VRAM 決定 batch（用假 torch，不需要 GPU）
import types
import numpy as np
from r3_common import TTS, pick_batch, pick_dtype

def fake_torch(bf16):
    cuda = types.SimpleNamespace(is_bf16_supported=lambda including_emulation=True: bf16 and not including_emulation or bf16, empty_cache=lambda: None)
    return types.SimpleNamespace(cuda=cuda, bfloat16="bf16", float16="fp16", float32="fp32")

assert pick_dtype(fake_torch(True)) == "bf16" and pick_dtype(fake_torch(False)) == "fp16"
assert (pick_batch(15), pick_batch(9), pick_batch(5)) == (12, 8, 4)
calls = []
def loader(dt):
    calls.append(dt)
    return dt
def gen_fp16_nan(model, items, lang, seed):
    w = np.full(100, 0.1, dtype=np.float32)
    if model == "fp16":
        w[3] = np.nan
    return [(w, 24000) for _ in items]
t = TTS(loader=loader, torch_mod=fake_torch(False), gen=gen_fp16_nan)
outs = t.batch([{}, {}], "Chinese", 1)
assert calls == ["fp16", "fp32"] and t.fallback_fp32 and t.precision == "fp32" and np.isfinite(outs[0][0]).all(), (calls, t.precision)
t2 = TTS(loader=loader, torch_mod=fake_torch(True), gen=gen_fp16_nan)
assert t2.precision == "bf16"  # bf16 卡不走 fp16 退回路徑
print("OK" if not bad else f"{bad} 個文字預處理案例失敗")
sys.exit(1 if bad else 0)
