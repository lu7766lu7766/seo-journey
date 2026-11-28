"""依說話者、表情（face）與台詞文字（上下文）產生每句的情緒指令。純 Python、不依賴 GPU；對應表在 emotion_map.json。"""

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
_PUNCT = re.compile(r"[\s，。！？、…—：；「」『』“”‘’（）()\-,.!?:;~·《》]")


def load_map(path=None):
    for p in (path, os.path.join(HERE, "emotion_map.json"), "/content/emotion_map.json"):
        if p and os.path.exists(p):
            with open(p, encoding="utf-8") as fh:
                return json.load(fh)
    raise FileNotFoundError("emotion_map.json")


def n_chars(s):
    return len(_PUNCT.sub("", s))


def emotion_for(emap, speaker, face, voice_text, npc_name=None):
    """回傳 (情緒指令, trace)。trace 記錄用了哪個基底與哪些修飾，方便稽核。"""
    flat = _PUNCT.sub("", voice_text)
    for cp in emap["catchphrases"]:
        if flat == cp["text"] and cp["speaker"] == speaker:
            return cp["instruct"], {"base": f"catchphrase:{cp['text']}", "mods": []}
    if speaker == "npc":
        base = emap["npcs"].get(npc_name or "", emap["npcs"]["_default"])
        base_id = f"npc:{npc_name}"
    else:
        table = emap["faces"].get(speaker, {})
        f = face or "normal"
        base = table.get(f) or emap["faces"]["_default"].get(f) or emap["faces"]["_default"]["normal"]
        base_id = f"{speaker}.{f}"
    n = n_chars(voice_text)
    hits = []
    for r in emap["modifiers"]:
        if "speakers" in r and speaker not in r["speakers"]:
            continue
        if speaker in r.get("not_speakers", []):
            continue
        if "npcs" in r and npc_name not in r["npcs"]:
            continue
        if "regex" in r and not re.search(r["regex"], voice_text):
            continue
        if n < r.get("min_chars", 0) or n > r.get("max_chars", 10**9):
            continue
        hits.append(r)
    hits.sort(key=lambda r: r["priority"])
    hits = hits[: emap["max_modifiers"]]
    return base + "".join(r["add"] for r in hits), {"base": base_id, "mods": [r["id"] for r in hits]}


def soft_emotion(emap, speaker, voice_text, npc_name=None):
    """收斂版情緒指令：該說話者的 normal 表情＋上下文修飾＋收斂片語。重抽數次仍因音高過高失敗時才用（見 produce.py 的 soften_after）。"""
    base, _ = emotion_for(emap, speaker, "normal", voice_text, npc_name)
    return base + emap["soften"]
