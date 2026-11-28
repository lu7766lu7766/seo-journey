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


def _mods(emap, speaker, voice_text, npc_name):
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
    return hits[: emap["max_modifiers"]]


def _base(emap, speaker, face, npc_name):
    if speaker == "npc":
        return emap["npcs"].get(npc_name or "", emap["npcs"]["_default"]), f"npc:{npc_name}"
    table = emap["faces"].get(speaker, {})
    f = face or "normal"
    base = table.get(f) or emap["faces"]["_default"].get(f) or emap["faces"]["_default"]["normal"]
    return base, f"{speaker}.{f}"


def emotion_for(emap, speaker, face, voice_text, npc_name=None):
    """回傳 (情緒指令, trace)。trace 記錄用了哪個基底與哪些修飾，方便稽核。"""
    flat = _PUNCT.sub("", voice_text)
    for cp in emap["catchphrases"]:
        if flat == cp["text"] and cp["speaker"] == speaker:
            return cp["instruct"], {"base": f"catchphrase:{cp['text']}", "mods": []}
    base, base_id = _base(emap, speaker, face, npc_name)
    hits = _mods(emap, speaker, voice_text, npc_name)
    return base + "".join(r["add"] for r in hits), {"base": base_id, "mods": [r["id"] for r in hits]}


def soft_emotion(emap, speaker, face, voice_text, npc_name=None):
    """收斂版情緒指令：保留原本的表情基底與情緒、語速，只把音高壓在穩定的音域（第四輪：以前降成 normal，翔的驚慌就整個不見了）。
    重抽數次仍因音高過高失敗時才用（見 produce.py 的 soften_after）。口頭禪整句單獨出現時沒有收斂版（沿用專用句）。"""
    flat = _PUNCT.sub("", voice_text)
    for cp in emap["catchphrases"]:
        if flat == cp["text"] and cp["speaker"] == speaker:
            return cp["instruct"]
    sf = emap["soften"]
    base, base_id = _base(emap, speaker, face, npc_name)
    mods = "".join(r["add"] for r in _mods(emap, speaker, voice_text, npc_name))
    if base_id in sf["overrides"]:
        return sf["overrides"][base_id] + mods
    rng = sf["ranges"].get(base_id if base_id.startswith("npc:") else speaker, sf["ranges"]["_default"])
    return base + mods + sf["template"].format(range=rng)
