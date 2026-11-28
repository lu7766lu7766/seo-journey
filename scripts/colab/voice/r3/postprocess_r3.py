"""第三輪本機後處理：把 r3_out/wav 裡通過守門（與每句最接近通過）的 WAV 轉成 MP3，彙整成 candidates_r3.json。
後處理與第二輪相同（去頭尾靜音 −45 dB、loudnorm −16 LUFS／TP −2 dBTP、前後各 12 ms 淡入淡出、單聲道 24 kHz MP3 48 kbps）。

用法：python3 postprocess_r3.py <voice-r3 目錄>   （內需有 raw/r3_out/{wav,metrics_r3.json}）
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "r2"))
from postprocess_r2 import to_mp3  # noqa: E402


def main():
    d = Path(sys.argv[1])
    raw = d / "raw" / "r3_out"
    out = d / "audio"
    out.mkdir(exist_ok=True)
    m = json.loads((raw / "metrics_r3.json").read_text(encoding="utf-8"))
    for v in m["voices"].values():
        for ln in v["lines"]:
            ln["audio"] = []
            for f in ln["chosen"] + ([ln["best_failed"]] if ln.get("best_failed") else []):
                name = f"{v['id']}__{ln['id']}__{Path(f).stem.split('__')[-1]}.mp3"
                st = to_mp3(raw / "wav" / f, out / name)
                take = next(t for t in ln["takes"] if t["file"] == f)
                ln["audio"].append({"mp3": f"audio/{name}", "file": f, "passed": take["passed"], "fails": take["fails"], **st})
    (d / "candidates_r3.json").write_text(json.dumps(m, ensure_ascii=False, indent=1, default=str), encoding="utf-8")
    print(f"candidates_r3.json 完成；MP3 共 {len(list(out.glob('*.mp3')))} 個")


if __name__ == "__main__":
    main()
