"""第二個語種偵測器交叉驗證：SenseVoiceSmall（FunASR，MIT／FunASR Model License）能輸出 <|zh|>/<|yue|> 語種標籤。

Whisper 語種偵測在第一輪（Gemini 聽出大量粵語）的 117 個音檔只抓到 1 個，所以要比較另一個偵測器是否更敏感。
對象：第一輪 117 個 MP3、第二輪通過守門的 WAV（/content/r2_out/wav、/content/r2_out_b/wav）。
輸出 /content/sv_eval.json：每檔的語種標籤與轉寫。只用於評測。
"""

import glob
import json
import os
import re
import sys

import librosa

sys.path.insert(0, "/content")
from r2_common import log  # noqa: E402

from funasr import AutoModel  # noqa: E402

try:
    sv = AutoModel(model="iic/SenseVoiceSmall", device="cuda:0", disable_update=True)
except Exception as e:
    log(f"SenseVoice 預設 hub 失敗（{type(e).__name__}: {str(e)[:100]}），改 hf")
    sv = AutoModel(model="FunAudioLLM/SenseVoiceSmall", hub="hf", device="cuda:0", disable_update=True)

files = [("r1", p) for p in sorted(glob.glob("/content/r1_audio/audio/*.mp3"))]
files += [("r2", p) for p in sorted(glob.glob("/content/r2_out/wav/*.wav") + glob.glob("/content/r2_out_b/wav/*.wav"))]
files += [("vox", p) for p in sorted(glob.glob("/content/vox_out/wav/*.wav"))]
rows = []
for grp, p in files:
    y, _ = librosa.load(p, sr=16000)
    res = sv.generate(input=y.astype("float32"), language="auto", use_itn=True)
    raw = res[0]["text"] if res else ""
    tag = re.match(r"<\|(\w+)\|>", raw)
    rows.append({"group": grp, "file": os.path.basename(p), "lang": tag.group(1) if tag else None, "text": re.sub(r"<\|[^|]*\|>", "", raw)})
    log(f"{grp} {os.path.basename(p)} lang={rows[-1]['lang']} {rows[-1]['text'][:30]}")
json.dump(rows, open("/content/sv_eval.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
log("SVEVAL_DONE")
