"""在 Colab VM 上用 Qwen3-TTS VoiceDesign 生成角色試聽樣本，並做客觀評測與挑選。

流程（每個聲音候選 voice）：
  1. 對每句台詞，用「聲音描述 + 本句情緒」當 instruct，以 seed = voice.seed + 句序*100 + take 生成 K 個 take。
  2. 以 Whisper-large-v3 轉寫計算 CER（用 OpenCC 轉簡體後比對），以 WavLM x-vector 算說話人嵌入，
     以 librosa.yin 估算 F0 中位數，計算語速（字/秒）。
  3. 挑選：score = CER + 0.5 * (1 - 與該聲音所有 take 中心的餘弦相似度) + 語速異常懲罰，取最低者。
  4. 另做「設計→複製」實驗：先用同一聲音描述生成中性參考句，再用 Base 模型 create_voice_clone_prompt
     唸同 4 句，比較兩種做法的跨句說話人一致性（餘弦相似度）。

只使用 VoiceDesign 生成的音訊當參考音；不載入任何外部人聲。

輸入：/content/characters.json   輸出：/content/voice_out/、/content/voice_bundle.tar.gz
"""

import json
import os
import random
import re
import sys
import tarfile
import time
import traceback

import numpy as np
import soundfile as sf
import torch

CFG_PATH = "/content/characters.json"
OUT = "/content/voice_out"
TAKES = int(os.environ.get("VOICE_TAKES", "3"))
SMOKE = os.environ.get("VOICE_SMOKE") == "1"
MAX_NEW_TOKENS = 300  # 12Hz → 約 25 秒上限；偶爾會有不收尾的失控 take，上限壓低並在挑選時懲罰
GEN_KW = dict(do_sample=True, top_k=50, top_p=1.0, temperature=0.9, repetition_penalty=1.05, max_new_tokens=MAX_NEW_TOKENS)
SEED_TAG = "seed 設定：random / numpy / torch / cuda 同時 manual_seed"


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def set_seed(s):
    random.seed(s)
    np.random.seed(s)
    torch.manual_seed(s)
    torch.cuda.manual_seed_all(s)


def build_instruct(voice_design, emotion):
    return f"{voice_design}\n本句的語氣與情緒：{emotion}"


# ---------- 評測工具 ----------
_cc = None


def to_simplified(s):
    global _cc
    if _cc is None:
        from opencc import OpenCC

        _cc = OpenCC("t2s")
    return _cc.convert(s)


def norm_text(s):
    s = to_simplified(s)
    return re.sub(r"[\s，。！？、…：；「」『』“”‘’（）()\-—,.!?:;'\"~·]", "", s).upper()


def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cer(ref, hyp):
    r, h = norm_text(ref), norm_text(hyp)
    if not r:
        return 0.0
    return edit_distance(r, h) / len(r)


class Evaluator:
    def __init__(self):
        from transformers import AutoFeatureExtractor, WavLMForXVector, pipeline

        log("載入 Whisper-large-v3 …")
        self.asr = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3", torch_dtype=torch.float16, device=0)
        log("載入 WavLM x-vector …")
        self.fe = AutoFeatureExtractor.from_pretrained("microsoft/wavlm-base-plus-sv")
        self.sv = WavLMForXVector.from_pretrained("microsoft/wavlm-base-plus-sv").cuda().eval()

    def transcribe(self, wav, sr):
        import librosa

        w16 = librosa.resample(wav.astype(np.float32), orig_sr=sr, target_sr=16000)[: 16000 * 25]  # 失控的長 take 只轉前 25 秒
        try:
            out = self.asr({"raw": w16, "sampling_rate": 16000}, generate_kwargs={"language": "chinese", "task": "transcribe"}, return_timestamps=True)
            return out["text"].strip()
        except Exception as e:  # 評測失敗不應中斷生成
            log(f"ASR 失敗：{type(e).__name__}: {str(e)[:120]}")
            return ""

    @torch.no_grad()
    def embed(self, wav, sr):
        import librosa

        w16 = librosa.resample(wav.astype(np.float32), orig_sr=sr, target_sr=16000)
        inp = self.fe(w16, sampling_rate=16000, return_tensors="pt", padding=True)
        inp = {k: v.cuda() for k, v in inp.items()}
        e = self.sv(**inp).embeddings[0]
        e = torch.nn.functional.normalize(e, dim=-1)
        return e.cpu().numpy()

    @staticmethod
    def f0_median(wav, sr):
        import librosa

        y = wav.astype(np.float32)
        f0 = librosa.yin(y, fmin=65, fmax=500, sr=sr, frame_length=2048)
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
        n = min(len(f0), len(rms))
        voiced = rms[:n] > (0.25 * np.median(rms[:n][rms[:n] > 1e-4]) if np.any(rms[:n] > 1e-4) else 1e-3)
        sel = f0[:n][voiced]
        return float(np.median(sel)) if len(sel) else 0.0


def cos(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


def measure(ev, wav, sr, text):
    hyp = ev.transcribe(wav, sr)
    dur = len(wav) / sr
    nchar = max(1, len(norm_text(text)))
    return {
        "duration_s": round(dur, 3),
        "chars_per_s": round(nchar / max(dur, 1e-3), 2),
        "asr_text": hyp,
        "cer": round(cer(text, hyp), 4),
        "f0_median_hz": round(ev.f0_median(wav, sr), 1),
    }


def main():
    cfg = json.load(open(CFG_PATH, encoding="utf-8"))
    lang = cfg["language"]
    os.makedirs(f"{OUT}/wav", exist_ok=True)

    from qwen_tts import Qwen3TTSModel

    log("載入 Qwen3-TTS VoiceDesign …")
    design = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
    log("載入 Qwen3-TTS Base（複製實驗用）…")
    base = Qwen3TTSModel.from_pretrained("Qwen/Qwen3-TTS-12Hz-1.7B-Base", device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa")
    ev = Evaluator()

    import importlib.metadata as md

    result = {
        "model": {"design": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", "clone": "Qwen/Qwen3-TTS-12Hz-1.7B-Base", "license": "Apache-2.0", "qwen_tts": md.version("qwen-tts"), "transformers": md.version("transformers"), "torch": torch.__version__},
        "gpu": torch.cuda.get_device_name(0),
        "gen_params": GEN_KW,
        "takes_per_line": TAKES,
        "seed_rule": f"seed = voice.seed + 行序號(0起)*100 + take(0起)；{SEED_TAG}",
        "language": lang,
        "ref_text": cfg["ref_text"],
        "voices": [],
    }
    t_start = time.time()
    if os.environ.get("VOICE_RESUME") == "1" and os.path.exists(f"{OUT}/metrics.json"):
        prev = json.load(open(f"{OUT}/metrics.json", encoding="utf-8"))
        result["voices"] = [v for v in prev["voices"] if v.get("clone_mode", {}).get("consistency") is not None]
        log("RESUME：保留已完成的聲音 " + ", ".join(v["id"] for v in result["voices"]))
    done_ids = {v["id"] for v in result["voices"]}
    chars = cfg["characters"]
    if SMOKE:
        chars = chars[:1]
    for ch in chars:
        for voice in ch["voices"]:
            if voice["id"] in done_ids:
                continue
            vres = {"id": voice["id"], "character": ch["id"], "label": voice["label"], "seed": voice["seed"], "design": voice["design"], "lines": []}
            lines = ch["lines"][:2] if SMOKE else ch["lines"]
            all_embs = []
            takes_by_line = []
            for li, line in enumerate(lines):
                instruct = build_instruct(voice["design"], line["emotion_instruct"])
                takes = []
                for k in range(TAKES):
                    seed = voice["seed"] + li * 100 + k
                    set_seed(seed)
                    t0 = time.time()
                    wavs, sr = design.generate_voice_design(text=line["text"], language=lang, instruct=instruct, **GEN_KW)
                    wav = np.asarray(wavs[0], dtype=np.float32)
                    gen_s = time.time() - t0
                    name = f"{voice['id']}__{line['id']}__t{k}.wav"
                    sf.write(f"{OUT}/wav/{name}", wav, sr)
                    m = measure(ev, wav, sr, line["text"])
                    m.update({"take": k, "seed": seed, "file": name, "gen_s": round(gen_s, 2), "rtf": round(gen_s / max(m["duration_s"], 1e-3), 2)})
                    emb = ev.embed(wav, sr)
                    all_embs.append(emb)
                    takes.append((m, emb))
                    log(f"{voice['id']} {line['id']} t{k} dur={m['duration_s']}s cer={m['cer']} f0={m['f0_median_hz']} rtf={m['rtf']} asr='{m['asr_text']}'")
                takes_by_line.append(takes)
            # 挑選
            center = np.mean(all_embs, axis=0)
            chosen_embs = []
            for li, (line, takes) in enumerate(zip(lines, takes_by_line)):
                best = None
                for m, emb in takes:
                    sim = cos(emb, center)
                    pace_pen = 0.0
                    if m["chars_per_s"] > 9.0 or m["chars_per_s"] < 1.5:
                        pace_pen = 0.5
                    if m["duration_s"] > 25:
                        pace_pen += 1.0
                    score = m["cer"] + 0.5 * (1 - sim) + pace_pen
                    m["center_sim"] = round(sim, 4)
                    m["score"] = round(score, 4)
                    if best is None or score < best[0]:
                        best = (score, m, emb)
                chosen_embs.append(best[2])
                vres["lines"].append(
                    {
                        "id": line["id"],
                        "text": line["text"],
                        "emotion": line["emotion"],
                        "face": line["face"],
                        "emotion_instruct": line["emotion_instruct"],
                        "instruct": build_instruct(voice["design"], line["emotion_instruct"]),
                        "chosen_take": best[1]["take"],
                        "chosen_seed": best[1]["seed"],
                        "chosen_file": best[1]["file"],
                        "takes": [t[0] for t in takes],
                    }
                )
            sims = [cos(chosen_embs[i], chosen_embs[j]) for i in range(len(chosen_embs)) for j in range(i + 1, len(chosen_embs))]
            vres["design_mode_consistency"] = round(float(np.mean(sims)), 4) if sims else None
            vres["center_emb"] = [round(float(x), 5) for x in (center / np.linalg.norm(center))]
            vres["chosen_embs"] = [[round(float(x), 5) for x in e] for e in chosen_embs]

            # ---- 設計→複製 實驗 ----
            try:
                ref_seed = voice["seed"] + 90
                ref_instruct = build_instruct(voice["design"], cfg["ref_emotion_instruct"])
                for attempt in range(4):
                    set_seed(ref_seed + attempt)
                    rw, rsr = design.generate_voice_design(text=cfg["ref_text"], language=lang, instruct=ref_instruct, **GEN_KW)
                    rw = np.asarray(rw[0], dtype=np.float32)
                    if len(rw) / rsr <= 12:
                        break
                ref_seed += attempt
                ref_name = f"{voice['id']}__ref.wav"
                sf.write(f"{OUT}/wav/{ref_name}", rw, rsr)
                prompt = base.create_voice_clone_prompt(ref_audio=(rw, rsr), ref_text=cfg["ref_text"])
                clone = []
                cl_embs = []
                for li, line in enumerate(lines):
                    expected = max(1.5, len(norm_text(line["text"])) / 2.5)  # 粗估合理長度上限（秒）
                    for attempt in range(4):  # 偶發失控（不收尾）就換 seed 重試
                        cseed = voice["seed"] + li * 100 + 50 + attempt
                        set_seed(cseed)
                        t0 = time.time()
                        wavs, sr = base.generate_voice_clone(text=line["text"], language=lang, voice_clone_prompt=prompt, **GEN_KW)
                        wav = np.asarray(wavs[0], dtype=np.float32)
                        if len(wav) / sr <= expected * 2:
                            break
                        log(f"{voice['id']} {line['id']} clone 失控（{len(wav) / sr:.1f}s），重試 seed {cseed + 1}")
                    name = f"{voice['id']}__{line['id']}__clone.wav"
                    sf.write(f"{OUT}/wav/{name}", wav, sr)
                    m = measure(ev, wav, sr, line["text"])
                    m.update({"seed": cseed, "file": name, "gen_s": round(time.time() - t0, 2)})
                    cl_embs.append(ev.embed(wav, sr))
                    clone.append({"id": line["id"], **m})
                    log(f"{voice['id']} {line['id']} clone dur={m['duration_s']}s cer={m['cer']} f0={m['f0_median_hz']}")
                csims = [cos(cl_embs[i], cl_embs[j]) for i in range(len(cl_embs)) for j in range(i + 1, len(cl_embs))]
                ref_emb = ev.embed(rw, rsr)
                vres["clone_mode"] = {
                    "ref_file": ref_name,
                    "ref_seed": ref_seed,
                    "consistency": round(float(np.mean(csims)), 4) if csims else None,
                    "sim_to_ref": round(float(np.mean([cos(e, ref_emb) for e in cl_embs])), 4),
                    "design_sim_to_ref": round(float(np.mean([cos(e, ref_emb) for e in chosen_embs])), 4),
                    "lines": clone,
                }
            except Exception:
                traceback.print_exc()
                vres["clone_mode"] = {"error": traceback.format_exc()}
            result["voices"].append(vres)
            with open(f"{OUT}/metrics.json", "w", encoding="utf-8") as fh:
                json.dump(result, fh, ensure_ascii=False, indent=1)
            log(f"PASS {voice['id']} design_consistency={vres['design_mode_consistency']} clone_consistency={vres.get('clone_mode', {}).get('consistency')} elapsed={(time.time() - t_start) / 60:.1f}min")

    # 跨聲音區分度：各聲音中心嵌入兩兩餘弦相似度
    centers = {v["id"]: np.array(v["center_emb"]) for v in result["voices"]}
    ids = list(centers)
    result["cross_voice_cosine"] = {f"{a}|{b}": round(cos(centers[a], centers[b]), 4) for i, a in enumerate(ids) for b in ids[i + 1 :]}
    result["total_minutes"] = round((time.time() - t_start) / 60, 1)
    json.dump(result, open(f"{OUT}/metrics.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with tarfile.open("/content/voice_bundle.tar.gz", "w:gz") as tar:
        tar.add(OUT, arcname="voice_out")
    log(f"DONE: {len(result['voices'])} voices in {result['total_minutes']} min")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        print("Traceback: generation failed", flush=True)
        sys.exit(1)
