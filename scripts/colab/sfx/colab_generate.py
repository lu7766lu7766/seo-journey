"""Colab GPU inference script for generating raw SFX candidates with Stable Audio Open 1.0.

Runs on the Colab VM (`/content`) with `/content/prompts.json` and `/content/.hf_token`.
Immediately deletes all Hugging Face token files after downloading the gated model snapshot,
verifies deletion, runs batched inference across prompts and seeds, performs an on-VM health check,
and packs `/content/sfx_raw/` into `/content/sfx_raw.tar.gz`.
"""

from __future__ import annotations

import gc
import inspect
import json
import os
import tarfile
import time
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from diffusers import StableAudioPipeline
from huggingface_hub import snapshot_download

PROMPTS_PATH = Path("/content/prompts.json")
TOKEN_PATHS = [
    Path("/content/.hf_token"),
    Path.home() / ".cache" / "huggingface" / "token",
    Path.home() / ".huggingface" / "token",
]
MODEL_PATH_CACHE = Path("/content/model_path.txt")
RAW_ROOT = Path("/content/sfx_raw")
MANIFEST_PATH = RAW_ROOT / "generation_manifest.json"
TAR_PATH = Path("/content/sfx_raw.tar.gz")


def scrub_token_files() -> None:
    """Delete any Hugging Face token files on the VM and verify none remain."""
    for p in TOKEN_PATHS:
        try:
            if p.exists() or p.is_symlink():
                p.unlink()
        except OSError as exc:
            raise RuntimeError(f"Failed to delete token file {p}: {exc}") from exc

    remaining = [str(p) for p in TOKEN_PATHS if p.exists() or p.is_symlink()]
    if remaining:
        raise RuntimeError(f"Token files still exist after cleanup: {remaining}")
    print("[security] Token files verified deleted.", flush=True)


def ensure_model_snapshot(model_id: str) -> Path:
    """Download the gated model snapshot once using /content/.hf_token, then scrub tokens."""
    if MODEL_PATH_CACHE.exists():
        cached = Path(MODEL_PATH_CACHE.read_text(encoding="utf-8").strip())
        if cached.exists():
            scrub_token_files()
            print(f"[model] Reusing cached snapshot at {cached}", flush=True)
            return cached

    token_file = Path("/content/.hf_token")
    if not token_file.exists():
        raise FileNotFoundError(
            "Missing /content/.hf_token for initial model download. Upload token first."
        )

    token = None
    try:
        token = token_file.read_text(encoding="utf-8").strip()
        if not token:
            raise ValueError("Token file is empty.")
        print(f"[model] Downloading snapshot for {model_id}...", flush=True)
        local_dir = snapshot_download(
            repo_id=model_id,
            token=token,
        )
        MODEL_PATH_CACHE.write_text(local_dir, encoding="utf-8")
        print(f"[model] Snapshot ready at {local_dir}", flush=True)
        return Path(local_dir)
    finally:
        token = None
        del token
        scrub_token_files()


def load_pipeline_with_check(model_dir: Path, defaults: dict) -> tuple[StableAudioPipeline, str, str]:
    """Load StableAudioPipeline from local files and verify numerical stability."""
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is required for Stable Audio Open 1.0 inference.")

    gpu_name = torch.cuda.get_device_name(0)
    vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    print(f"[gpu] Device: {gpu_name} ({vram_gb:.1f} GB VRAM)", flush=True)

    candidate_dtypes = [torch.float16, torch.float32]
    for dtype in candidate_dtypes:
        dtype_label = "float16" if dtype == torch.float16 else "float32"
        print(f"[model] Loading StableAudioPipeline ({dtype_label})...", flush=True)
        pipe = StableAudioPipeline.from_pretrained(
            str(model_dir),
            torch_dtype=dtype,
            local_files_only=True,
        )
        pipe = pipe.to("cuda")
        pipe.set_progress_bar_config(disable=True)

        if dtype == torch.float32:
            return pipe, gpu_name, dtype_label

        # Warmup sanity check to catch fp16 overflow / NaN / silent collapse early.
        gen = torch.Generator(device="cuda").manual_seed(42)
        with torch.inference_mode():
            out = pipe(
                prompt="Single soft wooden click sound effect, dry clean studio one-shot",
                negative_prompt=defaults["negative_prompt"],
                num_inference_steps=20,
                audio_end_in_s=1.0,
                num_waveforms_per_prompt=1,
                guidance_scale=7.0,
                generator=gen,
            )
        arr = out.audios[0].detach().float().cpu().numpy()
        peak = float(np.max(np.abs(arr))) if arr.size else 0.0
        finite = bool(np.isfinite(arr).all())
        print(f"[warmup] dtype={dtype_label} finite={finite} peak={peak:.5f}", flush=True)
        if finite and 0.005 < peak < 20.0:
            return pipe, gpu_name, dtype_label

        print(f"[warmup] {dtype_label} unstable; falling back to float32.", flush=True)
        del pipe, out, arr
        gc.collect()
        torch.cuda.empty_cache()

    raise RuntimeError("Failed to load a numerically stable pipeline.")


def estimate_raw_stats(audio_stereo_or_mono: np.ndarray, sr: int) -> dict:
    """Compute quick raw audio metrics on the VM for health check."""
    if audio_stereo_or_mono.ndim == 2:
        mono = np.mean(audio_stereo_or_mono, axis=1)
    else:
        mono = audio_stereo_or_mono
    mono = mono.astype(np.float64)
    abs_mono = np.abs(mono)
    peak = float(np.max(abs_mono)) if mono.size else 0.0
    rms = float(np.sqrt(np.mean(mono**2))) if mono.size else 0.0
    peak_dbfs = 20.0 * np.log10(max(peak, 1e-9))
    rms_dbfs = 20.0 * np.log10(max(rms, 1e-9))

    # Estimate active span above peak - 36 dB in 10ms frames
    hop = max(1, int(0.01 * sr))
    frames = [
        float(np.sqrt(np.mean(mono[i : i + hop] ** 2)))
        for i in range(0, len(mono), hop)
    ]
    frame_peaks = np.array(frames, dtype=np.float64)
    if frame_peaks.size == 0 or peak < 1e-6:
        return {
            "peak_dbfs": round(peak_dbfs, 2),
            "rms_dbfs": round(rms_dbfs, 2),
            "active_ms": 0.0,
            "noise_floor_dbfs": -120.0,
            "snr_est_db": 0.0,
            "healthy": False,
        }

    thresh = max(peak * 10 ** (-36.0 / 20.0), 1e-5)
    active_idx = np.where(frame_peaks >= thresh)[0]
    active_ms = float((active_idx[-1] - active_idx[0] + 1) * 10.0) if active_idx.size else 0.0
    noise_floor = float(np.percentile(frame_peaks, 15))
    noise_floor_dbfs = 20.0 * np.log10(max(noise_floor, 1e-9))
    snr_est = peak_dbfs - noise_floor_dbfs
    healthy = bool(np.isfinite(mono).all() and peak >= 0.02 and snr_est >= 20.0 and active_ms >= 10.0)
    return {
        "peak_dbfs": round(peak_dbfs, 2),
        "rms_dbfs": round(rms_dbfs, 2),
        "active_ms": round(active_ms, 1),
        "noise_floor_dbfs": round(noise_floor_dbfs, 2),
        "snr_est_db": round(snr_est, 1),
        "healthy": healthy,
    }


def load_existing_manifest() -> dict:
    if MANIFEST_PATH.exists():
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return {"entries": []}


def save_manifest(manifest: dict) -> None:
    RAW_ROOT.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    cfg = json.loads(PROMPTS_PATH.read_text(encoding="utf-8"))
    defaults = cfg["defaults"]
    model_id = cfg["model_id"]

    round_filter = os.environ.get("ROUND_TAG", "r1").strip()
    sfx_only_raw = os.environ.get("SFX_ONLY", "").strip()
    sfx_only = {s.strip() for s in sfx_only_raw.split(",") if s.strip()} if sfx_only_raw else None

    model_dir = ensure_model_snapshot(model_id)
    pipe, gpu_name, dtype_label = load_pipeline_with_check(model_dir, defaults)
    sr = int(getattr(pipe.vae, "sampling_rate", 44100))

    sig_params = inspect.signature(pipe.__call__).parameters
    supports_audio_start = "audio_start_in_s" in sig_params
    print(
        f"[config] sr={sr} supports_audio_start={supports_audio_start} "
        f"round={round_filter} sfx_only={sorted(sfx_only) if sfx_only else 'ALL'}",
        flush=True,
    )

    manifest = load_existing_manifest()
    manifest["model_id"] = model_id
    manifest["license"] = cfg.get("license", "")
    manifest["gpu_name"] = gpu_name
    manifest["dtype"] = dtype_label
    manifest["sample_rate"] = sr
    entries_by_rel: dict[str, dict] = {
        e["rel_path"]: e for e in manifest.get("entries", []) if "rel_path" in e
    }

    t_all = time.time()
    for sound in cfg["sounds"]:
        sfx_id = sound["id"]
        if sfx_only is not None and sfx_id not in sfx_only:
            continue

        out_dir = RAW_ROOT / sfx_id
        out_dir.mkdir(parents=True, exist_ok=True)

        for p_item in sound["prompts"]:
            p_round = p_item.get("round", "r1")
            if p_round != round_filter:
                continue

            p_id = p_item["id"]
            prompt_text = p_item["text"]
            neg_text = p_item.get("negative_prompt", defaults["negative_prompt"])
            steps = int(p_item.get("num_inference_steps", defaults["num_inference_steps"]))
            guidance = float(p_item.get("guidance_scale", defaults["guidance_scale"]))
            audio_start = float(p_item.get("audio_start_in_s", defaults.get("audio_start_in_s", 0.0)))
            audio_end = float(p_item.get("audio_end_in_s", sound["audio_end_in_s"]))
            seeds = [int(s) for s in p_item["seeds"]]

            generators = [torch.Generator(device="cuda").manual_seed(seed) for seed in seeds]
            kwargs = {
                "prompt": prompt_text,
                "negative_prompt": neg_text,
                "num_inference_steps": steps,
                "audio_end_in_s": audio_end,
                "num_waveforms_per_prompt": len(seeds),
                "guidance_scale": guidance,
                "generator": generators,
            }
            if supports_audio_start:
                kwargs["audio_start_in_s"] = audio_start

            t0 = time.time()
            with torch.inference_mode():
                result = pipe(**kwargs)
            elapsed = time.time() - t0

            audios = result.audios
            stats_summary = []
            for idx, seed in enumerate(seeds):
                wav_np = audios[idx].detach().float().cpu().numpy()
                if wav_np.ndim == 2 and wav_np.shape[0] <= 4 and wav_np.shape[1] > wav_np.shape[0]:
                    wav_np = wav_np.T  # (samples, channels)
                wav_np = np.nan_to_num(wav_np, nan=0.0, posinf=0.0, neginf=0.0)
                # Guard extreme outliers before writing raw float WAV
                max_val = float(np.max(np.abs(wav_np))) if wav_np.size else 0.0
                if max_val > 1.0:
                    wav_np = wav_np / max_val * 0.99

                filename = f"{sfx_id}_{p_round}_{p_id}_s{seed}.wav"
                rel_path = f"{sfx_id}/{filename}"
                out_path = out_dir / filename
                sf.write(str(out_path), wav_np, sr, subtype="FLOAT")

                stats = estimate_raw_stats(wav_np, sr)
                entry = {
                    "sfx_id": sfx_id,
                    "round": p_round,
                    "prompt_id": p_id,
                    "seed": seed,
                    "prompt": prompt_text,
                    "negative_prompt": neg_text,
                    "num_inference_steps": steps,
                    "guidance_scale": guidance,
                    "audio_end_in_s": audio_end,
                    "rel_path": rel_path,
                    "raw_stats": stats,
                }
                entries_by_rel[rel_path] = entry
                stats_summary.append(
                    f"s{seed}(pk={stats['peak_dbfs']}dB,snr={stats['snr_est_db']}dB,act={stats['active_ms']}ms,ok={stats['healthy']})"
                )

            manifest["entries"] = sorted(entries_by_rel.values(), key=lambda x: x["rel_path"])
            save_manifest(manifest)
            torch.cuda.empty_cache()
            print(
                f"[gen] {sfx_id}/{p_round}/{p_id} ({elapsed:.1f}s): " + " | ".join(stats_summary),
                flush=True,
            )

    print("\n=== VM Health Summary ===", flush=True)
    by_sfx: dict[str, list[dict]] = {}
    for e in manifest["entries"]:
        by_sfx.setdefault(e["sfx_id"], []).append(e)
    for sound in cfg["sounds"]:
        sid = sound["id"]
        items = by_sfx.get(sid, [])
        healthy_cnt = sum(1 for x in items if x["raw_stats"]["healthy"])
        avg_snr = (
            round(sum(x["raw_stats"]["snr_est_db"] for x in items) / len(items), 1)
            if items
            else 0.0
        )
        print(
            f"  {sid:6s}: total={len(items):2d}, healthy={healthy_cnt:2d}, avg_snr={avg_snr:.1f} dB",
            flush=True,
        )

    print(f"[pack] Creating {TAR_PATH}...", flush=True)
    with tarfile.open(TAR_PATH, "w:gz") as tf:
        tf.add(RAW_ROOT, arcname="sfx_raw")
    size_mb = TAR_PATH.stat().st_size / (1024 * 1024)
    print(
        f"[done] Archive ready: {TAR_PATH} ({size_mb:.2f} MB), total wall={time.time() - t_all:.1f}s",
        flush=True,
    )


if __name__ == "__main__":
    main()
