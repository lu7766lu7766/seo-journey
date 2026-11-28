"""Prepare Google Colab VM for ACE-Step 1.5 (and Stable Audio Open 1.0) inference and audio DSP."""

import os
import shutil
import subprocess
import sys


def run(cmd, check=True):
    print(f"+ {' '.join(cmd)}", flush=True)
    proc = subprocess.run(cmd, check=check)
    return proc.returncode


def pip_install(packages):
    uv_bin = shutil.which("uv")
    if uv_bin:
        cmd = [uv_bin, "pip", "install", "--system", "--quiet", *packages]
    else:
        cmd = [sys.executable, "-m", "pip", "install", "-q", "--upgrade-strategy", "only-if-needed", *packages]
    run(cmd)


def main():
    print("=== System & Hardware ===", flush=True)
    print("Python:", sys.version, flush=True)
    run(["nvidia-smi"], check=False)

    import torch

    print("PyTorch:", torch.__version__, "CUDA available:", torch.cuda.is_available(), flush=True)
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is not available on this Colab runtime")
    props = torch.cuda.get_device_properties(0)
    print(f"GPU: {props.name}, VRAM: {props.total_memory / (1024 ** 3):.2f} GiB", flush=True)

    # Check ffmpeg & libmp3lame
    ffmpeg_ok = shutil.which("ffmpeg") is not None
    if ffmpeg_ok:
        enc = subprocess.run(["ffmpeg", "-encoders"], capture_output=True, text=True, check=False)
        ffmpeg_ok = "libmp3lame" in (enc.stdout or "")
    if not ffmpeg_ok:
        print("Installing ffmpeg via apt-get...", flush=True)
        run(["apt-get", "update", "-qq"])
        run(["apt-get", "install", "-y", "-qq", "ffmpeg"])
    run(["ffmpeg", "-version"], check=True)

    # Clone ACE-Step 1.5
    repo_dir = "/content/ACE-Step-1.5"
    if not os.path.exists(repo_dir):
        run(["git", "clone", "--depth", "1", "https://github.com/ace-step/ACE-Step-1.5.git", repo_dir])
    if repo_dir not in sys.path:
        sys.path.insert(0, repo_dir)
    sha = subprocess.check_output(["git", "-C", repo_dir, "rev-parse", "HEAD"], text=True).strip()
    print(f"ACE-Step 1.5 commit SHA: {sha}", flush=True)

    # Register repo on Python path via .pth (avoids pyproject requires-python <3.13 pip block on Colab Py3.13)
    import site
    pth_targets = list(site.getsitepackages()) + ["/usr/local/lib/python3.13/dist-packages"]
    for sp in pth_targets:
        if os.path.isdir(sp):
            pth_file = os.path.join(sp, "acestep_v15.pth")
            with open(pth_file, "w", encoding="utf-8") as f:
                f.write(repo_dir + "\n")
            print(f"Registered {repo_dir} in {pth_file}", flush=True)
            break

    # Install ACE-Step 1.5 + Stable Audio Open + DSP dependencies without touching torch/torchaudio/torchvision
    deps = [
        "transformers>=4.51.0,<4.58.0",
        "diffusers>=0.37.0",
        "accelerate>=1.12.0",
        "huggingface_hub>=0.28.0",
        "loguru>=0.7.3",
        "einops>=0.8.1",
        "librosa>=0.10.2",
        "soundfile>=0.12.1",
        "soxr>=0.3.7",
        "pyloudnorm>=0.1.1",
        "numba>=0.60.0",
        "vector-quantize-pytorch>=1.27.0",
        "diskcache",
        "toml",
        "typer-slim>=0.15.0",
        "pywavelets>=1.5.0",
        "peft>=0.14.0",
        "openai-whisper",
        "tiktoken",
        "matplotlib>=3.8.0",
        "scipy>=1.11.0",
        "torchsde",
        "modelscope",
    ]
    pip_install(deps)

    import torch as torch_after
    print("PyTorch after deps:", torch_after.__version__, "CUDA available:", torch_after.cuda.is_available(), flush=True)
    if not torch_after.cuda.is_available():
        raise RuntimeError("CUDA became unavailable after dependency installation")

    # Smoke-test ACE-Step 1.5 imports
    from acestep.constants import VALID_KEYSCALES, VALID_TIME_SIGNATURES
    from acestep.handler import AceStepHandler
    from acestep.inference import GenerationConfig, GenerationParams, generate_music
    from acestep.llm_inference import LLMHandler
    from acestep.model_downloader import download_main_model
    from diffusers import StableAudioPipeline  # noqa: F401
    import librosa
    import matplotlib
    import pyloudnorm
    import soundfile
    import whisper

    print("VALID_TIME_SIGNATURES:", VALID_TIME_SIGNATURES, flush=True)
    print("Sample VALID_KEYSCALES:", sorted(VALID_KEYSCALES)[:8], flush=True)
    print(
        "Package smoke-test OK:",
        f"librosa={librosa.__version__}",
        f"soundfile={soundfile.__version__}",
        f"matplotlib={matplotlib.__version__}",
        f"pyloudnorm={getattr(pyloudnorm, '__version__', 'ok')}",
        f"whisper={getattr(whisper, '__version__', 'ok')}",
        flush=True,
    )
    print("SETUP_VM_COMPLETE", flush=True)


if __name__ == "__main__":
    main()
