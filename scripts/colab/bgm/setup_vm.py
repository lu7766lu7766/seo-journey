"""Prepare Google Colab VM for ACE-Step inference and audio post-processing."""

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

    # Clone ACE-Step
    repo_dir = "/content/ACE-Step"
    if not os.path.exists(repo_dir):
        run(["git", "clone", "--depth", "1", "https://github.com/ace-step/ACE-Step.git", repo_dir])
    if repo_dir not in sys.path:
        sys.path.insert(0, repo_dir)
    sha = subprocess.check_output(["git", "-C", repo_dir, "rev-parse", "HEAD"], text=True).strip()
    print(f"ACE-Step commit SHA: {sha}", flush=True)

    # Editable install without overwriting Colab's preinstalled CUDA PyTorch stack
    run([sys.executable, "-m", "pip", "install", "-q", "--no-deps", "-e", repo_dir])

    # Install runtime + DSP dependencies without touching torch/torchaudio/torchvision
    deps = [
        "diffusers>=0.33.0",
        "transformers==4.50.0",
        "accelerate>=1.6.0",
        "datasets>=3.4.1",
        "loguru>=0.7.3",
        "librosa>=0.10.2",
        "soundfile>=0.12.1",
        "soxr>=0.3.7",
        "pyloudnorm>=0.1.1",
        "pypinyin>=0.53.0",
        "py3langid==0.2.2",
        "hangul-romanize>=0.1.0",
        "num2words>=0.5.14",
        "spacy>=3.7.0",
        "cutlet",
        "fugashi[unidic-lite]",
        "pytorch_lightning>=2.5.0",
        "click",
        "peft",
        "openai-whisper",
        "tiktoken",
        "matplotlib>=3.8.0",
        "scipy>=1.11.0",
    ]
    pip_install(deps)

    # Smoke-test ACE-Step imports; pin diffusers==0.33.1 if internal diffusers helpers moved
    try:
        from acestep.pipeline_ace_step import ACEStepPipeline  # noqa: F401
    except Exception as exc:
        print(f"Initial ACEStepPipeline import failed ({exc}); pinning diffusers==0.33.1...", flush=True)
        pip_install(["diffusers==0.33.1"])
        from acestep.pipeline_ace_step import ACEStepPipeline  # noqa: F401

    import torch as torch_after
    print("PyTorch after deps:", torch_after.__version__, "CUDA available:", torch_after.cuda.is_available(), flush=True)
    if not torch_after.cuda.is_available():
        raise RuntimeError("CUDA became unavailable after dependency installation")

    import librosa
    import matplotlib
    import pyloudnorm
    import soundfile
    import torchaudio
    import whisper

    print(
        "Package smoke-test OK:",
        f"librosa={librosa.__version__}",
        f"soundfile={soundfile.__version__}",
        f"matplotlib={matplotlib.__version__}",
        f"pyloudnorm={getattr(pyloudnorm, '__version__', 'ok')}",
        f"whisper={getattr(whisper, '__version__', 'ok')}",
        flush=True,
    )

    # Check torchaudio.save compatibility (torchaudio >= 2.9 drops backend='soundfile')
    test_wav = "/tmp/test_ta.wav"
    try:
        dummy = torch.zeros(2, 4800, dtype=torch.float32)
        torchaudio.save(test_wav, dummy, sample_rate=48000, format="wav", backend="soundfile")
        print("torchaudio.save(backend='soundfile'): OK", flush=True)
    except Exception as exc:
        print(f"torchaudio.save(backend='soundfile') unsupported ({exc}); soundfile.write patch required & enabled.", flush=True)
    finally:
        if os.path.exists(test_wav):
            os.remove(test_wav)

    print("SETUP_VM_COMPLETE", flush=True)


if __name__ == "__main__":
    main()
