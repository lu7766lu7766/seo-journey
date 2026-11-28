"""第三輪／量產共用的 Colab VM 環境準備（由 `colab exec -f setup_vm_r3.py` 執行）。

做的事：
  1. 安裝 qwen-tts、funasr、opencc 等；預載 Qwen3-TTS、Whisper、WavLM（Hugging Face，速度快）。
  2. **ASR 權重快取**（Paraformer-zh、SenseVoiceSmall；第二輪從 ModelScope 下載約 16 分鐘）：
       a. 若 /content/asr-weights.tar 存在（本機快取上傳而來）→ 解到 ~/.cache，載入時不需要下載。
       b. 否則先試 Hugging Face（hub="hf"：funasr/paraformer-zh、FunAudioLLM/SenseVoiceSmall），失敗才退回 ModelScope。
       c. 環境變數 PACK_ASR_CACHE=1 時，載入成功後把這些快取目錄打包成 /content/asr-weights.tar，由 run 腳本下載到本機
          （~/.cache/seo-journey-voice/asr-weights.tar），下次可直接上傳。
  3. 載入一次 Paraformer 與 SenseVoice 並計時，結果寫到 /content/setup_report.json。
不需要 Hugging Face token（所用模型皆公開）。不要把 token 寫進這個檔案。
"""

import json
import os
import shutil
import subprocess
import sys
import tarfile
import time

REPORT = {}
HOME = os.path.expanduser("~")
CACHE_DIRS = [f"{HOME}/.cache/huggingface/hub/models--funasr--paraformer-zh", f"{HOME}/.cache/huggingface/hub/models--FunAudioLLM--SenseVoiceSmall", f"{HOME}/.cache/modelscope"]


def run(cmd, check=True):
    print("+", " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=check).returncode


def pip_install(packages):
    uv = shutil.which("uv")
    if uv:
        run([uv, "pip", "install", "--system", "--quiet", *packages])
    else:
        run([sys.executable, "-m", "pip", "install", "-q", *packages])


def timed(label, fn):
    t0 = time.time()
    r = fn()
    REPORT[label] = round(time.time() - t0, 1)
    print(f"[計時] {label}: {REPORT[label]}s", flush=True)
    return r


def main():
    import torch

    print("torch:", torch.__version__, "cuda:", torch.cuda.is_available(), flush=True)
    if not torch.cuda.is_available():
        raise RuntimeError("沒有 CUDA GPU")
    p = torch.cuda.get_device_properties(0)
    print(f"GPU {p.name} VRAM {p.total_memory / 1024**3:.1f} GiB", flush=True)
    REPORT["gpu"] = p.name

    timed("pip_install_s", lambda: pip_install(["qwen-tts", "opencc-python-reimplemented", "sox", "funasr", "librosa", "pypinyin"]))
    if shutil.which("sox") is None:
        run(["apt-get", "install", "-y", "-qq", "sox"], check=False)
    if shutil.which("ffmpeg") is None:  # produce.py 用 ffmpeg 把保留的失敗 take 與錨點轉成／讀成 mp3
        run(["apt-get", "install", "-y", "-qq", "ffmpeg"], check=False)
    import pypinyin  # noqa: F401  第四輪：守門改用無聲調拼音 CER；缺了這個套件守門會直接出錯，所以環境準備就檢查

    REPORT["pypinyin"] = pypinyin.__version__

    if os.path.exists("/content/asr-weights.tar"):
        def extract():
            with tarfile.open("/content/asr-weights.tar") as t:
                t.extractall("/")  # 內含絕對路徑去掉開頭 "/" 的 ~/.cache/...
        timed("asr_cache_extract_s", extract)
        REPORT["asr_cache"] = "restored"
    else:
        REPORT["asr_cache"] = "none"

    from huggingface_hub import snapshot_download

    for repo, patterns in [("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", None), ("openai/whisper-large-v3", ["*.json", "model.safetensors", "*.txt"]), ("microsoft/wavlm-base-plus-sv", ["*.json", "*.bin", "*.safetensors", "*.txt"])]:
        timed(f"download_{repo.split('/')[1]}_s", lambda r=repo, pt=patterns: snapshot_download(r, allow_patterns=pt))
    if os.environ.get("SETUP_BASE") == "1":  # 複製模式才需要，量產不用
        timed("download_Qwen3-TTS-Base_s", lambda: snapshot_download("Qwen/Qwen3-TTS-12Hz-1.7B-Base"))

    sys.path.insert(0, "/content")
    from funasr import AutoModel

    def load(label, candidates):
        for kw, why in candidates:
            t0 = time.time()
            try:
                m = AutoModel(device="cuda:0", disable_update=True, **kw)
                REPORT[f"load_{label}"] = {"source": why, "s": round(time.time() - t0, 1)}
                print(f"{label} 載入 OK（{why}，{time.time() - t0:.0f}s）", flush=True)
                return m
            except Exception as e:  # noqa: BLE001
                print(f"{label} 用 {why} 失敗：{type(e).__name__}: {str(e)[:150]}", flush=True)
        raise RuntimeError(f"{label} 載入失敗")

    import numpy as np

    asr = load("paraformer", [({"model": "paraformer-zh", "hub": "hf"}, "huggingface"), ({"model": "paraformer-zh"}, "modelscope")])
    sv = load("sensevoice", [({"model": "FunAudioLLM/SenseVoiceSmall", "hub": "hf"}, "huggingface"), ({"model": "iic/SenseVoiceSmall"}, "modelscope")])
    r = asr.generate(input=np.zeros(16000, dtype=np.float32))
    REPORT["paraformer_result_keys"] = sorted(r[0].keys()) if r else None
    print("paraformer 輸出欄位：", REPORT["paraformer_result_keys"], flush=True)
    print("sensevoice 試跑：", sv.generate(input=np.zeros(16000, dtype=np.float32), language="auto", use_itn=True), flush=True)

    if os.environ.get("PACK_ASR_CACHE") == "1":
        def pack():
            with tarfile.open("/content/asr-weights.tar", "w") as t:
                for d in CACHE_DIRS:
                    if os.path.isdir(d):
                        t.add(d, arcname=d.lstrip("/"))
        timed("asr_cache_pack_s", pack)
        REPORT["asr_cache_size_mb"] = round(os.path.getsize("/content/asr-weights.tar") / 1e6)
    with open("/content/setup_report.json", "w") as fh:
        json.dump(REPORT, fh, ensure_ascii=False, indent=1)
    print("SETUP_REPORT", json.dumps(REPORT, ensure_ascii=False), flush=True)
    print("SETUP_DONE", flush=True)


main()
