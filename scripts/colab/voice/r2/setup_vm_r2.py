"""第二輪 Colab VM 環境準備：qwen-tts、funasr（Paraformer-zh）、opencc，並預先下載權重。

在 Colab 上由 `colab exec -f setup_vm_r2.py` 執行；設定環境變數 SETUP_VOX=1 時改為安裝並預載 VoxCPM2（備案）。
不需要 Hugging Face token（所用模型皆為公開、Apache-2.0／MIT）。若遇到 429／限流再另外處理，不要把 token 寫進這個檔案。
"""

import os
import shutil
import subprocess
import sys


def run(cmd, check=True):
    print("+", " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=check).returncode


def pip_install(packages):
    uv = shutil.which("uv")
    if uv:
        run([uv, "pip", "install", "--system", "--quiet", *packages])
    else:
        run([sys.executable, "-m", "pip", "install", "-q", *packages])


def main():
    import torch

    print("Python:", sys.version, flush=True)
    print("torch:", torch.__version__, "cuda:", torch.cuda.is_available(), flush=True)
    if not torch.cuda.is_available():
        raise RuntimeError("沒有 CUDA GPU")
    p = torch.cuda.get_device_properties(0)
    print(f"GPU {p.name} VRAM {p.total_memory / 1024**3:.1f} GiB", flush=True)
    from huggingface_hub import snapshot_download

    if os.environ.get("SETUP_VOX") == "1":
        pip_install(["voxcpm"])
        path = snapshot_download("openbmb/VoxCPM2")
        print("downloaded openbmb/VoxCPM2 ->", path, flush=True)
        print("SETUP_DONE_VOX", flush=True)
        return

    pip_install(["qwen-tts", "opencc-python-reimplemented", "sox", "funasr", "librosa"])
    import importlib.metadata as md

    for pkg in ["qwen-tts", "transformers", "accelerate", "torch", "funasr", "librosa"]:
        print(pkg, md.version(pkg), flush=True)
    if shutil.which("sox") is None:
        run(["apt-get", "install", "-y", "-qq", "sox"], check=False)

    for repo, patterns in [
        ("Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign", None),
        ("Qwen/Qwen3-TTS-12Hz-1.7B-Base", None),
        ("openai/whisper-large-v3", ["*.json", "model.safetensors", "*.txt"]),
        ("microsoft/wavlm-base-plus-sv", ["*.json", "*.bin", "*.safetensors", "*.txt"]),
    ]:
        path = snapshot_download(repo, allow_patterns=patterns)
        print("downloaded", repo, "->", path, flush=True)

    # 預先下載 Paraformer-zh 並做一次 smoke test
    from funasr import AutoModel

    try:
        asr = AutoModel(model="paraformer-zh", device="cuda:0", disable_update=True)
    except Exception as e:
        print("paraformer 預設 hub 失敗，改用 hf：", type(e).__name__, e, flush=True)
        asr = AutoModel(model="paraformer-zh", hub="hf", device="cuda:0", disable_update=True)
    import numpy as np

    print("paraformer 載入 OK：", asr.generate(input=np.zeros(16000, dtype=np.float32)), flush=True)
    print("SETUP_DONE", flush=True)


main()
