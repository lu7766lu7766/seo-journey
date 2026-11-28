"""第三輪共用函式庫（r3 重跑與量產 `produce/` 共用）：文字預處理 v3、評測器（SenseVoice 為必要守門）、守門 v3、批次生成。

在 Colab VM 上與 voices_r3.json、asr_equiv.json 放在同一個資料夾（/content）；
`prep_text`、`norm_text`、`cer_equiv`、`gate` 不依賴 GPU，本機也能跑（需 opencc-python-reimplemented），見 tests_r3_common.py。

和第二輪（r2/r2_common.py）的差異：
  * prep_text：妳→你；句中「……／——」→「，」、句末→「。」、句首移除；阿拉伯數字轉成中文念法。
  * 守門：SenseVoice 載入失敗就直接中止（不再默默退回只用 Whisper）；語種必須是 zh；事件標籤（Breath/Cough/…）視為雜訊淘汰。
  * CER 上限 0.08（≤12 字的句子等於「一個字都不能錯」）；≤4 字的短句與口頭禪 = 0；已知 ASR 偏見詞走白名單（asr_equiv.json）。
  * 句首前導用 ASR 首字時間戳判定（取不到才退回 pyin 啟發式）。
  * F0 區間、lead 上限依聲音設定（voices_r3.json）。
"""

import json
import os
import re
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def load_json(name):
    """先找同資料夾，再找 /content（VM 上上傳的位置）。"""
    for d in (HERE, "/content"):
        p = os.path.join(d, name)
        if os.path.exists(p):
            with open(p, encoding="utf-8") as fh:
                return json.load(fh)
    raise FileNotFoundError(name)


# ---------------------------------------------------------------- 文字預處理
_cc = None


def t2s(s):
    """OpenCC t2s：只轉字形（網站→网站），不是 tw2sp，不換成大陸用語。"""
    global _cc
    if _cc is None:
        from opencc import OpenCC

        _cc = OpenCC("t2s")
    return _cc.convert(s)


_CN = "零一二三四五六七八九"


def _cardinal(n):
    if n < 10:
        return _CN[n]
    if n < 20:
        return "十" + (_CN[n - 10] if n > 10 else "")
    if n < 100:
        t, u = divmod(n, 10)
        return _CN[t] + "十" + (_CN[u] if u else "")
    return "".join(_CN[int(c)] for c in str(n))


def digits_to_cn(s):
    """阿拉伯數字 → 中文念法：1～2 位數用一般數字讀法（82→八十二、12→十二），3 位以上或 0 開頭逐字讀（1985→一九八五）。"""

    def rep(m):
        d = m.group(0)
        if len(d) >= 3 or d[0] == "0":
            return "".join(_CN[int(c)] for c in d)
        return _cardinal(int(d))

    return re.sub(r"\d+", rep, s)


_PAUSE_TOKEN = "…—"  # 省略號與破折號：句首移除、句中→「，」、句末→「。」
_SENT_END = "。！？!?；;"
_COMMA = "，、；：,;:"
_CLOSERS = "」』）)”’"


def pause_marks(s):
    """「……」「——」的處理：句首（含句號後）直接移除；句末改成「。」；後面緊跟標點或收尾引號的直接吃掉；其餘（句中）改成「，」。"""
    s = re.sub(r"…+|\.{3,}|⋯+", "…", s)
    s = re.sub(r"[—─]+", "—", s)
    out = []
    n = len(s)
    for i, ch in enumerate(s):
        if ch not in _PAUSE_TOKEN:
            out.append(ch)
            continue
        prev = next((c for c in reversed(out) if not c.isspace()), "")
        nxt = next((c for c in s[i + 1 :] if not c.isspace()), "")
        if prev == "" or prev in _SENT_END:
            continue  # 句首
        if nxt == "":
            out.append("。")  # 句末
        elif nxt in _SENT_END or nxt in _COMMA or nxt in _CLOSERS or nxt in _PAUSE_TOKEN:
            continue
        elif prev in _COMMA:
            continue
        else:
            out.append("，")
    return "".join(out)


def prep_text(s):
    """送進 TTS 的台詞（遊戲顯示文字不變）：妳→你 → 省略號／破折號 → 結巴頓號→逗號 → 數字轉中文 → 去 CJK 之間的空白 → t2s。"""
    s = s.replace("妳", "你")
    s = pause_marks(s)
    s = re.sub(r"([^\s、，。！？…])、\1", r"\1，\1", s)  # 結巴「別、別」→「別，別」
    s = digits_to_cn(s)
    s = re.sub(r"(?<=[一-鿿]) +(?=[一-鿿])", "", s)
    return t2s(s).strip()


def prep_instruct(s):
    return t2s(s)


def banned_hits(instruct, banned):
    """情緒指令中的禁用字眼（氣音／破音／極快／響亮…）。前 4 個字內有「不」的否定用法（「不結巴破音」「不破音不尖叫」）放行。"""
    hits = []
    for w in banned:
        for m in re.finditer(re.escape(w), instruct):
            if "不" not in instruct[max(0, m.start() - 4) : m.start()]:
                hits.append(w)
    return hits


def build_instruct(design, accent, emotion):
    """聲音描述（基底）＋口音正向描述＋本句情緒。情緒只在這裡出現。"""
    return prep_instruct(f"{design}{accent or ''}\n本句的語氣與情緒：{emotion}")


# ---------------------------------------------------------------- CER 與白名單
_PUNCT = r"[\s，。！？、…—：；「」『』“”‘’（）()\-,.!?:;'\"~·《》〈〉\[\]]"


def norm_text(s):
    s = digits_to_cn(t2s(s))
    return re.sub(_PUNCT, "", s).upper()


def edit_distance(a, b):
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


_EQUIV = None


def equiv_entries():
    """asr_equiv.json → [(canonical_norm, [variant_norm…])]，皆已 t2s／正規化。"""
    global _EQUIV
    if _EQUIV is None:
        cfg = load_json("asr_equiv.json")
        _EQUIV = [(norm_text(e["canonical"]), [norm_text(v) for v in e["variants"]]) for e in cfg["entries"]]
    return _EQUIV


def apply_equiv(ref_n, hyp_n):
    """已知 ASR 偏見白名單：只有當「參考文字含該正規詞」時，才把轉寫裡的白名單變體換回正規詞。回傳 (hyp, 被換掉的變體清單)。"""
    applied = []
    for canon, variants in equiv_entries():
        if canon and canon in ref_n:
            for v in sorted(variants, key=len, reverse=True):
                if v and v in hyp_n:
                    hyp_n = hyp_n.replace(v, canon)
                    applied.append(v)
    return hyp_n, applied


def cer_equiv(ref, hyp):
    """(CER, 白名單替換清單, 正規化後的 hyp)。含拉丁字母的句子（SEO、FAQ、alt…）只比對非拉丁部分：ASR 對英文縮寫的寫法不穩定。"""
    r, h = norm_text(ref), norm_text(hyp)
    h, applied = apply_equiv(r, h)
    if re.search(r"[A-Z]", r):
        r, h = re.sub(r"[A-Z]+", "", r), re.sub(r"[A-Z]+", "", h)
    if not r:
        return 0.0, applied, h
    return edit_distance(r, h) / len(r), applied, h


def cos(a, b):
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))


# ---------------------------------------------------------------- 評測器
SV_EVENTS = {"BGM", "Speech", "Applause", "Laughter", "Cry", "Sneeze", "Breath", "Cough"}
SV_EMOTIONS = {"HAPPY", "SAD", "ANGRY", "NEUTRAL", "FEARFUL", "DISGUSTED", "SURPRISED"}
SV_LANGS = {"zh", "en", "yue", "ja", "ko", "nospeech"}


def _funasr_load(label, candidates):
    """依序嘗試 (kwargs, 說明)：先 Hugging Face（快），再 ModelScope（慢，第二輪實測下載約 16 分鐘）。"""
    from funasr import AutoModel

    last = None
    for kw, why in candidates:
        t0 = time.time()
        try:
            m = AutoModel(device="cuda:0", disable_update=True, **kw)
            log(f"{label} 載入完成（{why}，{time.time() - t0:.0f}s）")
            return m
        except Exception as e:  # noqa: BLE001
            last = e
            log(f"{label} 用 {why} 載入失敗（{type(e).__name__}: {str(e)[:100]}），換下一個")
    raise RuntimeError(f"{label} 所有來源都載入失敗：{last}")


class Evaluator:
    """Whisper-large-v3 語種偵測（含 yue）、Paraformer-zh 純普通話 ASR（含字級時間戳）、SenseVoiceSmall（語種／事件標籤，**必要**）、WavLM x-vector、yin/pyin 音高。"""

    def __init__(self, use_whisper=True):
        import torch
        from transformers import AutoFeatureExtractor, WavLMForXVector

        self.torch = torch
        self.wmodel = None
        if use_whisper:
            from transformers import WhisperForConditionalGeneration, WhisperProcessor

            log("載入 Whisper-large-v3（輔助語種偵測）…")
            self.wproc = WhisperProcessor.from_pretrained("openai/whisper-large-v3")
            self.wmodel = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3", torch_dtype=torch.float16).cuda().eval()
            lang_to_id = self.wmodel.generation_config.lang_to_id
            self.lang_codes = [k.strip("<|>") for k in lang_to_id]
            self.lang_ids = [lang_to_id[k] for k in lang_to_id]
            self.sot = self.wmodel.generation_config.decoder_start_token_id
            assert "yue" in self.lang_codes

        log("載入 Paraformer-zh（純普通話 ASR，要字級時間戳）…")
        self.asr = _funasr_load("Paraformer-zh", [({"model": "paraformer-zh", "hub": "hf"}, "HF funasr/paraformer-zh"), ({"model": "paraformer-zh"}, "ModelScope")])
        log("載入 SenseVoiceSmall（語種守門，必要）…")
        self.sv_lid = _funasr_load("SenseVoiceSmall", [({"model": "FunAudioLLM/SenseVoiceSmall", "hub": "hf"}, "HF FunAudioLLM/SenseVoiceSmall"), ({"model": "iic/SenseVoiceSmall"}, "ModelScope")])

        log("載入 WavLM x-vector …")
        self.fe = AutoFeatureExtractor.from_pretrained("microsoft/wavlm-base-plus-sv")
        self.sv = WavLMForXVector.from_pretrained("microsoft/wavlm-base-plus-sv").cuda().eval()

    @staticmethod
    def to16k(wav, sr):
        import librosa

        return librosa.resample(np.asarray(wav, dtype=np.float32), orig_sr=sr, target_sr=16000)

    def detect_language(self, w16):
        if self.wmodel is None:
            return {"top": None, "yue": 0.0, "zh": 0.0, "top4": {}}
        torch = self.torch
        with torch.no_grad():
            feats = self.wproc(w16[: 16000 * 30], sampling_rate=16000, return_tensors="pt").input_features.cuda().half()
            logits = self.wmodel(input_features=feats, decoder_input_ids=torch.tensor([[self.sot]]).cuda()).logits[0, -1].float()
            p = torch.softmax(logits[self.lang_ids], dim=-1).cpu().numpy()
        order = np.argsort(-p)
        return {"top": self.lang_codes[order[0]], "yue": float(p[self.lang_codes.index("yue")]), "zh": float(p[self.lang_codes.index("zh")]), "top4": {self.lang_codes[i]: round(float(p[i]), 3) for i in order[:4]}}

    def transcribe(self, w16):
        """回傳 (轉寫, 第一個字的起點秒數或 None, 時間戳筆數)。"""
        try:
            res = self.asr.generate(input=w16[: 16000 * 30].astype(np.float32), batch_size_s=60)
            if not res:
                return "", None, 0
            ts = res[0].get("timestamp") or []
            first = float(ts[0][0]) / 1000.0 if ts else None
            return (res[0].get("text") or "").strip(), first, len(ts)
        except Exception as e:  # noqa: BLE001
            log(f"ASR 失敗：{type(e).__name__}: {str(e)[:120]}")
            return "", None, 0

    def sense_voice(self, w16):
        """SenseVoice：(語種, 事件, 情緒標籤, 轉寫)。語種標籤解析不到回傳 None（守門視為失敗）。"""
        try:
            res = self.sv_lid.generate(input=w16[: 16000 * 30].astype(np.float32), language="auto", use_itn=True)
            raw = res[0]["text"] if res else ""
        except Exception as e:  # noqa: BLE001
            log(f"SenseVoice 失敗：{type(e).__name__}: {str(e)[:100]}")
            return None, None, None, ""
        tags = re.findall(r"<\|([^|]*)\|>", raw)
        lang = next((t for t in tags if t in SV_LANGS), None)
        event = next((t for t in tags if t in SV_EVENTS), None)
        emo = next((t for t in tags if t in SV_EMOTIONS), None)
        return lang, event, emo, re.sub(r"<\|[^|]*\|>", "", raw)

    def embed(self, w16):
        torch = self.torch
        with torch.no_grad():
            inp = self.fe(w16, sampling_rate=16000, return_tensors="pt", padding=True)
            e = self.sv(**{k: v.cuda() for k, v in inp.items()}).embeddings[0]
            return torch.nn.functional.normalize(e, dim=-1).cpu().numpy()

    @staticmethod
    def pitch_and_shape(w16):
        """yin F0 中位數（有能量的幀）、pyin 句首前導 lead_pyin、尾端能量比、第一個「有聲能量」起點 t_onset（rms > 2% 峰值）。"""
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
        t_onset = first_run(rms > 0.02 * np.max(rms))
        lead_pyin = (t_voiced - t_energy) if (t_voiced is not None and t_energy is not None and n_voiced >= 15) else None
        speech = rms[rms > 0.25 * np.max(rms)] if len(rms) else rms
        tail_ratio = float(np.mean(rms[-3:]) / (np.median(speech) + 1e-9)) if len(speech) else 0.0
        return {"f0": f0_med, "f0_pyin": float(np.median(f0p[ok])) if n_voiced >= 3 else 0.0, "voiced_frames": n_voiced, "lead_pyin": lead_pyin, "tail_ratio": tail_ratio, "t_onset": t_onset}

    def measure(self, wav, sr, ref_text):
        """一個 take 的完整機器指標。ref_text = 已 prep_text 的送進 TTS 的文字。"""
        w16 = self.to16k(wav, sr)
        dur = len(wav) / sr
        lang = self.detect_language(w16)
        hyp, first_tok, n_ts = self.transcribe(w16)
        sv_lang, sv_event, sv_emo, sv_text = self.sense_voice(w16)
        shape = self.pitch_and_shape(w16)
        cer, applied, _ = cer_equiv(ref_text, hyp)
        lead_asr = None
        if first_tok is not None and shape["t_onset"] is not None:
            lead_asr = max(0.0, first_tok - shape["t_onset"])
        lead = lead_asr if lead_asr is not None else shape["lead_pyin"]
        return {
            "duration_s": round(dur, 3),
            "chars_per_s": round(max(1, len(norm_text(ref_text))) / max(dur, 1e-3), 2),
            "asr_text": hyp,
            "cer": round(cer, 4),
            "equiv_applied": applied,
            "lang_top": lang["top"],
            "yue_prob": round(lang["yue"], 4),
            "zh_prob": round(lang["zh"], 4),
            "sv_lang": sv_lang,
            "sv_event": sv_event,
            "sv_emotion": sv_emo,
            "sv_text": sv_text,
            "f0_median_hz": round(shape["f0"], 1),
            "f0_pyin_hz": round(shape["f0_pyin"], 1),
            "voiced_frames": shape["voiced_frames"],
            "first_token_s": None if first_tok is None else round(first_tok, 3),
            "onset_s": None if shape["t_onset"] is None else round(shape["t_onset"], 3),
            "lead_asr_s": None if lead_asr is None else round(lead_asr, 2),
            "lead_pyin_s": None if shape["lead_pyin"] is None else round(shape["lead_pyin"], 2),
            "lead_s": None if lead is None else round(lead, 2),
            "tail_ratio": round(shape["tail_ratio"], 2),
            "_hyp_norm": norm_text(hyp),
            "_emb": self.embed(w16),
        }


# ---------------------------------------------------------------- 守門 v3
def dur_cap(gates, nchar):
    return gates["dur_cap"]["base_s"] + gates["dur_cap"]["per_char_s"] * nchar


def cer_limit(gates, nchar, catchphrase=False):
    return 0.0 if (catchphrase or nchar <= gates["short_chars"]) else gates["cer_max"]


def gate(m, gates, voice, nchar, catchphrase=False, must_have=()):
    """回傳 (通過, [失敗原因])。

    yue（Whisper 或 SenseVoice 判粵語）／sv_lang（SenseVoice 語種不是 zh，含解析失敗）／sv_event（Breath、Cough 等雜訊事件）／
    cer／phrase（必須出現的口頭禪沒念對）／f0_none、f0_low、f0_high／long／lead／tail。
    """
    fails = []
    if m["lang_top"] == "yue" or m["yue_prob"] > gates["yue_prob_max"] or m.get("sv_lang") == "yue":
        fails.append("yue")
    elif m.get("sv_lang") not in gates["sv_lang_ok"]:
        fails.append("sv_lang")
    if m.get("sv_event") in gates["sv_event_reject"]:
        fails.append("sv_event")
    if m["cer"] > cer_limit(gates, nchar, catchphrase):
        fails.append("cer")
    if must_have:
        hyp_n = m.get("_hyp_norm") or norm_text(m["asr_text"])
        hyp_n, _ = apply_equiv(" ".join(norm_text(p) for p in must_have), hyp_n)
        if any(norm_text(p) not in hyp_n for p in must_have):
            fails.append("phrase")
    lo, hi = voice["f0"]
    if m["f0_median_hz"] <= 0:
        fails.append("f0_none")
    elif m["f0_median_hz"] < lo:
        fails.append("f0_low")
    elif m["f0_median_hz"] > hi:
        fails.append("f0_high")
    if m["duration_s"] > dur_cap(gates, nchar):
        fails.append("long")
    lead_max = voice.get("lead_s_max", gates["lead_s_max"])
    if m["lead_s"] is not None and m["lead_s"] > lead_max:
        fails.append("lead")
    if m["tail_ratio"] > gates["tail_ratio_max"]:
        fails.append("tail")
    return (not fails), fails


def penalty(m, fails):
    """失敗 take 的「有多糟」：用來在全部失敗時挑最接近通過的一個給人看。"""
    w = {"yue": 100, "sv_lang": 50, "sv_event": 5, "phrase": 20, "cer": 10, "f0_none": 20, "long": 30, "tail": 10, "lead": 2, "f0_low": 3, "f0_high": 3}
    return sum(w.get(f, 5) for f in fails) + m["cer"] * 10


# ---------------------------------------------------------------- 批次生成
GEN_KW = dict(do_sample=True, top_k=50, top_p=1.0, temperature=0.9, repetition_penalty=1.05)
TOK_PER_S = 12.5


def set_seed(s):
    import random

    import torch

    random.seed(s)
    np.random.seed(s)
    torch.manual_seed(s)
    torch.cuda.manual_seed_all(s)


def tok_budget(items):
    return int(max(it["cap"] for it in items) * TOK_PER_S) + 12


def design_batch(model, items, lang, seed):
    """一批（instruct, text）一起生成；OOM 折半重試。items: [{text_tts, instruct, cap}] → [(wav, sr)]。"""
    import torch

    set_seed(seed)
    try:
        wavs, sr = model.generate_voice_design(text=[it["text_tts"] for it in items], language=[lang] * len(items), instruct=[it["instruct"] for it in items], max_new_tokens=tok_budget(items), **GEN_KW)
        return [(np.asarray(w, dtype=np.float32), sr) for w in wavs]
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        if len(items) == 1:
            raise
        h = len(items) // 2
        return design_batch(model, items[:h], lang, seed) + design_batch(model, items[h:], lang, seed + 1)


def chunks(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]
