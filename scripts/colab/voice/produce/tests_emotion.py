"""emotion_map.json 的本機檢查：python3 tests_emotion.py（讀 ../scripts/audio/voice-lines.json 與 ../r3/voices_r3.json）。"""
import collections, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "r3"))
from emotion import emotion_for, load_map, soft_emotion
from r3_common import banned_hits, negation_hits, t2s  # noqa: F401  (opencc 需已安裝)

emap = load_map()
cfg = json.load(open(os.path.join(HERE, "..", "r3", "voices_r3.json"), encoding="utf-8"))
banned = cfg["banned_words"]
bad = 0

def walk(o, path=""):
    if isinstance(o, str):
        if banned_hits(o, banned):
            print("禁用字眼", path, o, banned_hits(o, banned)); return 1
        if negation_hits(o):
            print("否定句（要改成正向描述）", path, o, negation_hits(o)); return 1
        return 0
    if isinstance(o, dict):
        return sum(walk(v, f"{path}.{k}") for k, v in o.items() if not k.startswith("_"))
    if isinstance(o, list):
        return sum(walk(v, f"{path}[{i}]") for i, v in enumerate(o))
    return 0

bad += walk(emap)
repo = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
lines = json.load(open(os.path.join(repo, "scripts/audio/voice-lines.json"), encoding="utf-8"))["lines"]
combos = collections.Counter()
for l in lines:
    ins, tr = emotion_for(emap, l["speaker"], l["face"], l["voiceText"], l.get("name"))
    combos[(l["speaker"], l.get("name") or l["face"])] += 1
    if banned_hits(ins, banned) or negation_hits(ins):
        bad += 1; print("禁用字眼／否定句（組合後）", l["key"], ins)
    soft = soft_emotion(emap, l["speaker"], l["face"], l["voiceText"], l.get("name"))
    if banned_hits(soft, banned) or negation_hits(soft):
        bad += 1; print("收斂版含禁用字眼／否定句", l["key"], soft)
    if tr["base"].startswith("catchphrase"):
        continue_ = True
    else:
        base_text = emap["npcs"].get(l.get("name") or "", emap["npcs"]["_default"]) if l["speaker"] == "npc" else (emap["faces"].get(l["speaker"], {}).get(l["face"] or "normal") or emap["faces"]["_default"].get(l["face"] or "normal") or emap["faces"]["_default"]["normal"])
        if not (soft.startswith(base_text) or soft.startswith(emap["soften"]["overrides"].get(tr["base"], "\0"))):
            bad += 1; print("收斂版沒有保留原本的表情基底", l["key"], tr["base"], soft)
    if l["speaker"] != "npc" and (l["face"] or "normal") not in emap["faces"].get(l["speaker"], {}) and (l["face"] or "normal") not in emap["faces"]["_default"]:
        bad += 1; print("缺 face", l["speaker"], l["face"])
# ---- 英文詞：全大寫縮寫（SEO、LCP、FAQ）走縮寫提示；Disallow、robots 這類一般英文單字走自然英語發音提示
def mods_of(text, speaker="rin", face="normal", npc=None):
    return emotion_for(emap, speaker, face, text, npc)[1]["mods"]

def check(cond, msg):
    global bad
    if not cond:
        bad += 1; print("FAIL", msg)

for w in ("SEO", "LCP", "FAQ", "INP"):
    m = mods_of(f"我用 {w} 看過了。"); check("acronym" in m and "english_word" not in m, f"{w} 應走縮寫：{m}")
for w in ("Disallow", "robots", "noindex", "GPTBot", "Recipe"):
    m = mods_of(f"我用 {w} 看過了。"); check("english_word" in m and "acronym" not in m, f"{w} 應走一般英文：{m}")
check(emap["modifiers"][[r["id"] for r in emap["modifiers"]].index("english_word")]["add"] == "英文單字以自然的英語發音念出。", "一般英文提示文字")
m2 = mods_of("先看 LCP 再看 Disallow。")
check("acronym" in m2 and "english_word" in m2, f"同句有縮寫與英文單字時兩個提示都要有：{m2}")

# ---- 「哎呀」開頭：短促輕快（正向寫法）
for t in ("哎呀，來了來了。", "哎呀……英文頁那個，是我翻的。", "……哎呀，我明明記得，是 1982。"):
    ins = emotion_for(emap, "npc", None, t, "圖書館員")[0]
    check("「哎呀」短促輕快" in ins and "不拖" not in ins, f"哎呀規則：{t} → {ins}")
check("「哎呀」" not in emotion_for(emap, "npc", None, "孩子，哎呀你看這個。", "圖書館員")[0], "只有『哎呀』開頭才套用")

# ---- 收斂版：保留情緒，只收斂音高
ks = soft_emotion(emap, "kuro", "shock", "連我的備用網域也被一起拔掉了！我錯了啦！")
check(ks.startswith("維持急促驚慌的語速與情緒，只把音高壓在穩定的男中音域、音量適中。"), f"翔 shock 收斂版：{ks}")
check("平常" not in ks and "輕佻隨性" not in ks, "翔 shock 收斂版不能降成 normal")
for sp, f in (("rin", "angry"), ("hare", "surprised"), ("mirai", "happy"), ("sensei", "sad"), ("kuro", "smug"), ("kuro", "normal")):
    b = emap["faces"][sp][f]
    sv = soft_emotion(emap, sp, f, "今天天氣很好。")
    check(sv.startswith(b) and "維持原本的情緒與語速，只把音高壓在穩定的" in sv, f"{sp}.{f} 收斂版要保留表情基底：{sv}")
check("男中音域" in soft_emotion(emap, "npc", None, "嗯。", "籃球社隊長") and "中低音域" in soft_emotion(emap, "npc", None, "嗯。", "圖書館員"), "NPC 依名牌決定音域")
check("音高維持在穩定的中音域" in emap["faces"]["hare"]["blush"], "hare.blush 要有『音高維持在穩定的中音域』")
check("音高維持在穩定的中音域" not in emap["faces"]["hare"]["surprised"], "hare.surprised 不加（以免把晴壓太低、離錨點太遠）")

print(f"{len(lines)} 句，{len(combos)} 種 說話者×表情 組合")
for (sp, f), n in sorted(combos.items(), key=lambda x: -x[1])[:6]: print(" ", sp, f, n)
print("OK" if not bad else f"{bad} 個問題")
sys.exit(1 if bad else 0)
