"""Colab VM 環境準備：安裝 qwen-tts、評測用 ASR / 說話人嵌入依賴，並預先下載模型權重。

在 Colab 上由 `colab exec -f setup_vm.py` 執行。不會動到 Colab 預裝的 torch。
"""

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

    # qwen-tts 釘 transformers==4.57.3、accelerate==1.12.0（官方 pyproject）
    pip_install(["qwen-tts", "opencc-python-reimplemented", "sox"])

    import importlib.metadata as md

    for pkg in ["qwen-tts", "transformers", "accelerate", "torch", "torchaudio"]:
        print(pkg, md.version(pkg), flush=True)

    if shutil.which("sox") is None:
        run(["apt-get", "install", "-y", "-qq", "sox"], check=False)

    # 預先下載權重（避免生成時才卡網路）
    from huggingface_hub import snapshot_download

    for repo in [
        "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "Qwen/Qwen3-TTS-12Hz-1.7B-Base",
        "openai/whisper-large-v3",
        "microsoft/wavlm-base-plus-sv",
    ]:
        path = snapshot_download(repo)
        print("downloaded", repo, "->", path, flush=True)
    print("SETUP_DONE", flush=True)


main()
