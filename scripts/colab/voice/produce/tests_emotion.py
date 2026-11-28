"""emotion_map.json 的本機檢查：python3 tests_emotion.py（讀 ../scripts/audio/voice-lines.json 與 ../r3/voices_r3.json）。"""
import collections, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "r3"))
from emotion import emotion_for, load_map
from r3_common import banned_hits, t2s  # noqa: F401  (opencc 需已安裝)

emap = load_map()
cfg = json.load(open(os.path.join(HERE, "..", "r3", "voices_r3.json"), encoding="utf-8"))
banned = cfg["banned_words"]
bad = 0

def walk(o, path=""):
    if isinstance(o, str):
        if banned_hits(o, banned):
            print("禁用字眼", path, o, banned_hits(o, banned)); return 1
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
    if banned_hits(ins, banned):
        bad += 1; print("禁用字眼（組合後）", l["key"], ins)
    if l["speaker"] != "npc" and (l["face"] or "normal") not in emap["faces"].get(l["speaker"], {}) and (l["face"] or "normal") not in emap["faces"]["_default"]:
        bad += 1; print("缺 face", l["speaker"], l["face"])
print(f"{len(lines)} 句，{len(combos)} 種 說話者×表情 組合")
for (sp, f), n in sorted(combos.items(), key=lambda x: -x[1])[:6]: print(" ", sp, f, n)
print("OK" if not bad else f"{bad} 個問題")
sys.exit(1 if bad else 0)
