"""備案實測：VoxCPM2（OpenBMB，Apache-2.0）文字設計聲音，用同樣的聲音描述、同樣的 4 句台詞、同一套守門做對照。

VoxCPM2 的聲音設計寫法：把描述放在 text 開頭的全形／半形括號內，例如 "(年輕女性，溫柔)要唸的字"。
這裡把「聲音描述 + 口音提示詞 A + 本句情緒」都放進括號。比較兩個文字版本：
  t2s  ：台詞與描述都轉簡體字形（與 Qwen3-TTS 的做法相同）
  trad ：台詞與描述保留繁體（只移除句首「……」、結巴頓號改逗號）

不載入任何外部人聲；聲音只由文字描述設計。
輸入：/content/voices_r2.json、/content/characters.json、/content/r2_common.py
輸出：/content/vox_out/、/content/vox_bundle.tar.gz
"""

import inspect
import json
import os
import re
import sys
import tarfile
import time
import traceback
from collections import Counter

import numpy as np
import soundfile as sf
import torch

sys.path.insert(0, "/content")
import r2_common  # noqa: E402
from r2_common import Evaluator, cos, gate, log, norm_text, prep_text, t2s  # noqa: E402

OUT = "/content/vox_out"
SMOKE = os.environ.get("R2_SMOKE") == "1"
MAX_ROUNDS = int(os.environ.get("VOX_MAX_ROUNDS", "3"))
FIRST_TAKES = 2


def prep_trad(s):
    s = re.sub(r"(^|(?<=[。！？!?；;]))\s*[…\.]{2,}\s*", r"\1", s)
    return re.sub(r"([^\s、，。！？…])、\1", r"\1，\1", s)


def main():
    cfg = json.load(open("/content/voices_r2.json", encoding="utf-8"))
    chars = {c["id"]: c for c in json.load(open("/content/characters.json", encoding="utf-8"))["characters"]}
    gates = cfg["gates"]
    os.makedirs(f"{OUT}/wav_all", exist_ok=True)
    os.makedirs(f"{OUT}/wav", exist_ok=True)

    from voxcpm import VoxCPM

    log("載入 VoxCPM2 …")
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
    sr = model.tts_model.sample_rate
    params = inspect.signature(model.generate).parameters
    log(f"VoxCPM.generate 參數：{list(params)}；sample_rate={sr}")
    ev = Evaluator()
    t_start = time.time()

    voices = cfg["voices"]
    if SMOKE:
        voices = [v for v in voices if v["id"] in ("hare_A",)]
    accent = cfg["accents"]["A"]

    result = {"model": "openbmb/VoxCPM2", "license": "Apache-2.0（HF model card 與 GitHub 皆標示，可商用）", "gpu": torch.cuda.get_device_name(0), "sample_rate": sr, "gates": gates, "accent_prompt": accent, "variants": {"t2s": "台詞與描述轉簡體字形", "trad": "保留繁體"}, "voices": []}
    embs = {}
    for v in voices:
        ch = chars[v["character"]]
        lines = ch["lines"][:2] if SMOKE else ch["lines"]
        vres = {"id": v["id"], "character": v["character"], "label": v["label"], "design": v["design"], "f0_range": v["f0"], "variants": {}}
        for variant in ("t2s", "trad"):
            conv = t2s if variant == "t2s" else (lambda x: x)
            ptext = prep_text if variant == "t2s" else prep_trad
            lines_out = []
            for ln in lines:
                text = ptext(ln["text"])
                nchar = len(norm_text(text))
                desc = conv(f"{v['design']}{accent}本句的語氣與情緒：{ln['emotion_instruct']}")
                desc = desc.replace("(", "（").replace(")", "）")
                tts_text = f"({desc}){text}"
                takes = []
                passed = False
                for attempt in range(FIRST_TAKES + MAX_ROUNDS):
                    if attempt >= FIRST_TAKES and passed:
                        break
                    torch.manual_seed(31000 + attempt * 17 + len(takes))
                    np.random.seed(31000 + attempt)
                    kw = dict(text=tts_text, cfg_value=2.0, inference_timesteps=10)
                    if "max_len" in params:
                        kw["max_len"] = int((gates["dur_cap"]["base_s"] + gates["dur_cap"]["per_char_s"] * nchar) * 6.25) + 20
                    t0 = time.time()
                    try:
                        wav = np.asarray(model.generate(**kw), dtype=np.float32)
                    except Exception as e:
                        log(f"VoxCPM 生成失敗：{type(e).__name__}: {str(e)[:150]}")
                        takes.append({"error": str(e)[:200], "round": 0 if attempt < FIRST_TAKES else attempt - FIRST_TAKES + 1, "passed": False, "fails": ["error"]})
                        continue
                    gen_s = time.time() - t0
                    name = f"vox__{v['id']}__{variant}__{ln['id']}__a{attempt}.wav"
                    sf.write(f"{OUT}/wav_all/{name}", wav, sr)
                    m = ev.measure(wav, sr, t2s(text))
                    embs[name] = m.pop("_emb")
                    ok, fails = gate(m, gates, v["f0"], nchar)
                    m.update({"file": name, "attempt": attempt, "round": 0 if attempt < FIRST_TAKES else attempt - FIRST_TAKES + 1, "gen_s": round(gen_s, 2), "rtf": round(gen_s / max(m["duration_s"], 1e-3), 2), "passed": ok, "fails": fails})
                    takes.append(m)
                    passed = passed or ok
                    log(f"  vox {v['id']}/{variant}/{ln['id']} a{attempt} dur={m['duration_s']} cer={m['cer']} yue={m['yue_prob']} f0={m['f0_median_hz']} {'PASS' if ok else 'FAIL ' + ','.join(fails)} asr='{m['asr_text']}'")
                okt = [t for t in takes if t.get("passed")]
                best = min(okt, key=lambda t: t["cer"]) if okt else None
                lines_out.append({"id": ln["id"], "text": ln["text"], "text_tts": text, "instruct_in_text": tts_text, "passed": passed, "attempts": len(takes), "chosen_file": best["file"] if best else None, "takes": takes})
            ces = [embs[l["chosen_file"]] for l in lines_out if l["chosen_file"]]
            sims = [cos(ces[i], ces[j]) for i in range(len(ces)) for j in range(i + 1, len(ces))]
            first = [t for l in lines_out for t in l["takes"] if t.get("round") == 0 and "passed" in t]
            fr = {"n": len(first), "pass_rate": round(sum(t["passed"] for t in first) / max(1, len(first)), 3), "yue_rate": round(sum("yue" in t["fails"] for t in first) / max(1, len(first)), 3), "fail_reasons": dict(Counter(f for t in first for f in t["fails"]))}
            vres["variants"][variant] = {"lines": lines_out, "consistency": round(float(np.mean(sims)), 4) if sims else None, "first_round": fr}
        result["voices"].append(vres)
        with open(f"{OUT}/metrics_voxcpm.json", "w", encoding="utf-8") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=1, default=str)
        log(f"PASS vox {v['id']} t2s={vres['variants']['t2s']['first_round']['pass_rate']} trad={vres['variants']['trad']['first_round']['pass_rate']} elapsed={(time.time() - t_start) / 60:.1f}min")

    for vres in result["voices"]:
        for var in vres["variants"].values():
            for l in var["lines"]:
                if l["chosen_file"]:
                    os.replace(f"{OUT}/wav_all/{l['chosen_file']}", f"{OUT}/wav/{l['chosen_file']}")
    result["total_minutes"] = round((time.time() - t_start) / 60, 1)
    with open(f"{OUT}/metrics_voxcpm.json", "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=1, default=str)
    with tarfile.open("/content/vox_bundle.tar.gz", "w:gz") as tar:
        tar.add(f"{OUT}/wav", arcname="vox_out/wav")
        tar.add(f"{OUT}/metrics_voxcpm.json", arcname="vox_out/metrics_voxcpm.json")
    log(f"DONE: vox {result['total_minutes']} min")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        print("Traceback: vox generation failed", flush=True)
        sys.exit(1)
