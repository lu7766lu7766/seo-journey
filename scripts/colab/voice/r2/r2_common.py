"""第二輪共用：文字預處理、評測器（語種偵測 / 純普通話 ASR / F0 / 說話人嵌入）、守門判定。

在 Colab VM 上被 generate_r2.py 與 generate_voxcpm.py 匯入；其中 prep_text / build_instruct 不依賴 GPU，本機也可用。
"""

import re
import time

import numpy as np

# ---------------------------------------------------------------- 文字預處理
_cc = None


def t2s(s):
    """OpenCC t2s：只轉字形（網站→网站、資訊→资讯），不轉成大陸用語（不是 tw2sp）。"""
    global _cc
    if _cc is None:
        from opencc import OpenCC

        _cc = OpenCC("t2s")
    return _cc.convert(s)


def prep_text(s):
    """送進 TTS 的台詞：去句首「……」→ 結巴「別、別」改「別，別」→ t2s。遊戲顯示文字不變。"""
    s = re.sub(r"(^|(?<=[。！？!?；;]))\s*[…\.]{2,}\s*", r"\1", s)  # 句首（含句號後）的省略號
    s = re.sub(r"([^\s、，。！？…])、\1", r"\1，\1", s)  # 結巴頓號 → 逗號
    return t2s(s)


def prep_instruct(s):
    return t2s(s)


def build_instruct(design, accent, emotion):
    """聲音描述（基底）+ 口音正向描述 + 本句情緒。情緒只在這裡出現。"""
    base = design + (accent or "")
    return prep_instruct(f"{base}\n本句的語氣與情緒：{emotion}")


def norm_text(s):
    s = t2s(s)
    return re.sub(r"[\s，。！？、…：；「」『』“”‘’（）()\-—,.!?:;'\"~·,]", "", s).upper()


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


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def cos(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


# ---------------------------------------------------------------- 評測器
class Evaluator:
    """Whisper-large-v3 語種偵測（含 yue）、Paraformer-zh 純普通話 ASR、pyin F0、WavLM x-vector。"""

    def __init__(self):
        import torch
        from transformers import AutoFeatureExtractor, WavLMForXVector, WhisperForConditionalGeneration, WhisperProcessor

        self.torch = torch
        log("載入 Whisper-large-v3（只用語種偵測）…")
        self.wproc = WhisperProcessor.from_pretrained("openai/whisper-large-v3")
        self.wmodel = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3", torch_dtype=torch.float16).cuda().eval()
        lang_to_id = self.wmodel.generation_config.lang_to_id  # {"<|zh|>": id, ...}
        self.lang_codes = [k.strip("<|>") for k in lang_to_id]
        self.lang_ids = [lang_to_id[k] for k in lang_to_id]
        self.sot = self.wmodel.generation_config.decoder_start_token_id
        assert "yue" in self.lang_codes, "此 Whisper 沒有 yue 語種"

        log("載入 Paraformer-zh（純普通話 ASR）…")
        from funasr import AutoModel

        try:
            self.asr = AutoModel(model="paraformer-zh", device="cuda:0", disable_update=True)
        except Exception as e:  # 少數環境 modelscope 下載失敗，改用 HF hub
            log(f"paraformer 預設 hub 失敗（{type(e).__name__}），改用 hf")
            self.asr = AutoModel(model="paraformer-zh", hub="hf", device="cuda:0", disable_update=True)

        log("載入 SenseVoiceSmall（第二個語種偵測器，粵語敏感度高於 Whisper）…")
        self.sv_lid = None
        try:
            self.sv_lid = AutoModel(model="iic/SenseVoiceSmall", device="cuda:0", disable_update=True)
        except Exception as e:
            log(f"SenseVoice 預設 hub 失敗（{type(e).__name__}），改用 hf")
            try:
                self.sv_lid = AutoModel(model="FunAudioLLM/SenseVoiceSmall", hub="hf", device="cuda:0", disable_update=True)
            except Exception as e2:
                log(f"SenseVoice 載入失敗，語種守門退回只用 Whisper：{type(e2).__name__}")

        log("載入 WavLM x-vector …")
        self.fe = AutoFeatureExtractor.from_pretrained("microsoft/wavlm-base-plus-sv")
        self.sv = WavLMForXVector.from_pretrained("microsoft/wavlm-base-plus-sv").cuda().eval()

    @staticmethod
    def to16k(wav, sr):
        import librosa

        return librosa.resample(np.asarray(wav, dtype=np.float32), orig_sr=sr, target_sr=16000)

    def detect_language(self, w16):
        torch = self.torch
        w = w16[: 16000 * 30]
        with torch.no_grad():
            feats = self.wproc(w, sampling_rate=16000, return_tensors="pt").input_features.cuda().half()
            dec = torch.tensor([[self.sot]]).cuda()
            logits = self.wmodel(input_features=feats, decoder_input_ids=dec).logits[0, -1].float()
            p = torch.softmax(logits[self.lang_ids], dim=-1).cpu().numpy()
        order = np.argsort(-p)
        probs = {self.lang_codes[i]: float(p[i]) for i in order[:4]}
        return {"top": self.lang_codes[order[0]], "yue": float(p[self.lang_codes.index("yue")]), "zh": float(p[self.lang_codes.index("zh")]), "top4": {k: round(v, 3) for k, v in probs.items()}}

    def transcribe(self, w16):
        try:
            res = self.asr.generate(input=w16[: 16000 * 30].astype(np.float32), batch_size_s=60)
            return (res[0]["text"] if res else "").strip()
        except Exception as e:
            log(f"ASR 失敗：{type(e).__name__}: {str(e)[:120]}")
            return ""

    def sv_language(self, w16):
        """SenseVoiceSmall 的語種標籤（zh / yue / en / ja / ko / nospeech）與轉寫；載入失敗回傳 (None, "")。"""
        if self.sv_lid is None:
            return None, ""
        try:
            res = self.sv_lid.generate(input=w16[: 16000 * 30].astype(np.float32), language="auto", use_itn=True)
            raw = res[0]["text"] if res else ""
            tag = re.match(r"<\|(\w+)\|>", raw)
            return (tag.group(1) if tag else None), re.sub(r"<\|[^|]*\|>", "", raw)
        except Exception as e:
            log(f"SenseVoice 失敗：{type(e).__name__}: {str(e)[:100]}")
            return None, ""

    def embed(self, w16):
        torch = self.torch
        with torch.no_grad():
            inp = self.fe(w16, sampling_rate=16000, return_tensors="pt", padding=True)
            e = self.sv(**{k: v.cuda() for k, v in inp.items()}).embeddings[0]
            e = torch.nn.functional.normalize(e, dim=-1)
        return e.cpu().numpy()

    @staticmethod
    def pitch_and_shape(w16):
        """F0 中位數（yin，只看有能量的幀；pyin 在氣聲／嘎裂聲上有聲幀太少，不當主要依據）、
        句首「有能量但無音高」的長度 lead_s（喘氣／氣聲前導）、尾端能量比 tail_ratio。"""
        import librosa

        hop = 256
        rms = librosa.feature.rms(y=w16, frame_length=1024, hop_length=hop)[0]
        yin = librosa.yin(w16, fmin=65, fmax=450, sr=16000, frame_length=2048, hop_length=hop)
        n = min(len(rms), len(yin))
        act = rms[:n] > 0.15 * np.max(rms)
        f0_med = float(np.median(yin[:n][act])) if act.sum() >= 3 else 0.0
        f0p, voiced, vprob = librosa.pyin(w16, fmin=65, fmax=450, sr=16000, frame_length=2048, hop_length=hop)
        ok = voiced & ~np.isnan(f0p) & (vprob > 0.5)
        n_voiced = int(ok.sum())

        def first_run(flags, k=3):
            run = 0
            for i, flag in enumerate(flags):
                run = run + 1 if flag else 0
                if run >= k:
                    return (i - k + 1) * hop / 16000
            return None

        t_energy = first_run(rms > 0.1 * np.max(rms))
        t_voiced = first_run(ok)
        lead = (t_voiced - t_energy) if (t_voiced is not None and t_energy is not None and n_voiced >= 15) else None
        speech = rms[rms > 0.25 * np.max(rms)] if len(rms) else rms
        tail_ratio = float(np.mean(rms[-3:]) / (np.median(speech) + 1e-9)) if len(speech) else 0.0
        f0p_med = float(np.median(f0p[ok])) if n_voiced >= 3 else 0.0
        return f0_med, lead, tail_ratio, f0p_med, n_voiced

    def measure(self, wav, sr, text_tts, expect=None):
        """一個 take 的完整機器指標。expect 供口頭禪（已 t2s 的期望字串）使用。"""
        w16 = self.to16k(wav, sr)
        dur = len(wav) / sr
        lang = self.detect_language(w16)
        hyp = self.transcribe(w16)
        sv_lang, sv_text = self.sv_language(w16)
        ref = expect if expect is not None else text_tts
        f0, lead, tail, f0p, n_voiced = self.pitch_and_shape(w16)
        return {
            "duration_s": round(dur, 3),
            "chars_per_s": round(max(1, len(norm_text(ref))) / max(dur, 1e-3), 2),
            "asr_text": hyp,
            "cer": round(cer(ref, hyp), 4),
            "lang_top": lang["top"],
            "yue_prob": round(lang["yue"], 4),
            "zh_prob": round(lang["zh"], 4),
            "lang_top4": lang["top4"],
            "sv_lang": sv_lang,
            "sv_text": sv_text,
            "f0_median_hz": round(f0, 1),
            "f0_pyin_hz": round(f0p, 1),
            "voiced_frames": n_voiced,
            "lead_s": None if lead is None else round(lead, 2),
            "tail_ratio": round(tail, 2),
            "_emb": self.embed(w16),
        }


# ---------------------------------------------------------------- 守門
def dur_cap(gates, nchar):
    return gates["dur_cap"]["base_s"] + gates["dur_cap"]["per_char_s"] * nchar


def gate(m, gates, f0_range, nchar, catchphrase=False):
    """回傳 (通過, [失敗原因])。原因：yue / cer / f0_low / f0_high / long / lead / tail / empty。"""
    fails = []
    if m["lang_top"] == "yue" or m["yue_prob"] > gates["yue_prob_max"] or m.get("sv_lang") == "yue":
        fails.append("yue")
    cmax = gates["cer_max_catchphrase"] if catchphrase else gates["cer_max"]
    if m["cer"] > cmax:
        fails.append("cer")
    lo, hi = f0_range
    if m["f0_median_hz"] <= 0:
        fails.append("f0_none")
    elif m["f0_median_hz"] < lo:
        fails.append("f0_low")
    elif m["f0_median_hz"] > hi:
        fails.append("f0_high")
    if m["duration_s"] > dur_cap(gates, nchar):
        fails.append("long")
    if m["lead_s"] is not None and m["lead_s"] > gates["lead_s_max"]:
        fails.append("lead")
    if m["tail_ratio"] > 0.7:
        fails.append("tail")
    return (not fails), fails
