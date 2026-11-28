"""說話人錨點門檻校準（本機，CPU 即可；需要 torch、transformers，WavLM 權重是公開的）。

用法：python3 calibrate_anchors.py --pool pool.json --anchors ../anchors --out calibration.json
pool.json：[{"voice": "hare_D", "path": "/abs/take.wav", "group": "r3|smoke|r2", "passed": true, "name": "任意標籤"}, ...]
每個聲音：錨點（anchors/<voice>.mp3）與池內「同聲音」take 的 WavLM x-vector 餘弦相似度（與 r3_common.Evaluator.embed 同一個嵌入），
另外算「別的聲音」的 take 與這個錨點的相似度當負例，輸出分布，門檻由人依分布決定（寫進 voices_r3.json 的 anchor_sim_min）。
"""
import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "r3"))
from r3_common import cos, load_audio_16k  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", required=True)
    ap.add_argument("--anchors", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    import torch
    from transformers import AutoFeatureExtractor, WavLMForXVector

    fe = AutoFeatureExtractor.from_pretrained("microsoft/wavlm-base-plus-sv")
    sv = WavLMForXVector.from_pretrained("microsoft/wavlm-base-plus-sv").eval()

    def embed(w16):
        with torch.no_grad():
            inp = fe(w16, sampling_rate=16000, return_tensors="pt", padding=True)
            e = sv(**inp).embeddings[0]
            return torch.nn.functional.normalize(e, dim=-1).numpy()

    pool = json.load(open(a.pool, encoding="utf-8"))
    anchors = {Path(f).stem: embed(load_audio_16k(os.path.join(a.anchors, f))) for f in sorted(os.listdir(a.anchors)) if f.endswith(".mp3")}
    rows = []
    for e in pool:
        emb = embed(load_audio_16k(e["path"]))
        rows.append({**e, "sims": {v: round(cos(anc, emb), 4) for v, anc in anchors.items()}})
    json.dump(rows, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    for v in anchors:
        own = [r["sims"][v] for r in rows if r["voice"] == v and r["sims"][v] < 0.995]
        oth = [r["sims"][v] for r in rows if r["voice"] != v]
        if own:
            q = np.percentile(own, [0, 5, 50, 100])
            print(f"{v:12s} 同聲音 n={len(own):3d} min={q[0]:.3f} p5={q[1]:.3f} median={q[2]:.3f} max={q[3]:.3f} | 別的聲音 n={len(oth)} max={max(oth):.3f}")


if __name__ == "__main__":
    main()
