"""Local audio post-processing, contact-sheet triage, and MP3/spectrogram finalization.

Supports two modes:
  1. --mode triage:
     Processes all raw WAVs from Colab (plus optional synth backups for click/blip),
     measures acoustic metrics, and generates 8 contact-sheet PNGs + triage_summary.json.
  2. --mode finalize:
     Reads a selection JSON (4 candidates per SFX), exports final mono 44.1 kHz
     128 kbps LAME MP3s, re-measures decoded MP3 audio, renders per-candidate
     waveform+spectrogram PNGs, and outputs final_metrics.json.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import tempfile
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy import signal

TARGET_SR = 44100

FADE_OUT_MS = {
    "click": 24.0,
    "blip": 20.5,
    "choice": 50.0,
    "card": 45.0,
    "grow": 40.0,
    "bond": 45.0,
    "fail": 40.0,
    "win": 45.0,
}

# Target loudness profiles: click and blip are ~7.5 to 9 dB quieter than standard SFX.
LOUDNESS_PROFILE = {
    "standard": {
        "target_peak_dbfs": -3.0,
        "target_lkfs": -17.0,
        "max_lkfs": -15.5,
        "min_lkfs": -19.5,
    },
    "quiet_click": {
        "target_peak_dbfs": -9.5,
        "target_lkfs": -24.5,
        "max_lkfs": -23.0,
        "min_lkfs": -26.5,
    },
    "quiet_blip": {
        "target_peak_dbfs": -10.5,
        "target_lkfs": -26.0,
        "max_lkfs": -24.5,
        "min_lkfs": -28.0,
    },
}


def compute_k_weighting_sos(sr: int = TARGET_SR) -> tuple[np.ndarray, np.ndarray]:
    """Build ITU-R BS.1770-4 K-weighting Stage 1 (pre-filter) and Stage 2 (RLB) biquads."""
    # Exact coefficients from ITU-R BS.1770-4 for 48 kHz generalized via bilinear transform
    # Stage 1: high-shelf (+4 dB above ~1.5 kHz)
    f0 = 1681.974450955533
    g_db = 3.999843853973347
    q_s1 = 0.7071752369554196
    k = math.tan(math.pi * f0 / sr)
    vh = 10.0 ** (g_db / 20.0)
    vb = vh ** 0.4996667741545416
    a0_1 = 1.0 + k / q_s1 + k * k
    b0_1 = (vh + vb * k / q_s1 + k * k) / a0_1
    b1_1 = 2.0 * (k * k - vh) / a0_1
    b2_1 = (vh - vb * k / q_s1 + k * k) / a0_1
    a1_1 = 2.0 * (k * k - 1.0) / a0_1
    a2_1 = (1.0 - k / q_s1 + k * k) / a0_1
    sos1 = np.array([[b0_1, b1_1, b2_1, 1.0, a1_1, a2_1]], dtype=np.float64)

    # Stage 2: Revised Low-frequency B-weighting (RLB) high-pass
    f0_2 = 38.13547087602444
    q_s2 = 0.5003270373238773
    k2 = math.tan(math.pi * f0_2 / sr)
    a0_2 = 1.0 + k2 / q_s2 + k2 * k2
    b0_2 = 1.0 / a0_2
    b1_2 = -2.0 / a0_2
    b2_2 = 1.0 / a0_2
    a1_2 = 2.0 * (k2 * k2 - 1.0) / a0_2
    a2_2 = (1.0 - k2 / q_s2 + k2 * k2) / a0_2
    sos2 = np.array([[b0_2, b1_2, b2_2, 1.0, a1_2, a2_2]], dtype=np.float64)
    return sos1, sos2


K_SOS1, K_SOS2 = compute_k_weighting_sos(TARGET_SR)
HPF_SOS = signal.butter(2, 40.0, btype="highpass", fs=TARGET_SR, output="sos")


def k_weighted_lkfs(mono: np.ndarray, sr: int = TARGET_SR) -> float:
    """Compute ITU-R BS.1770-4 K-weighted loudness over the full clip (valid for short SFX)."""
    if mono.size == 0:
        return -120.0
    x = mono.astype(np.float64)
    y = signal.sosfilt(K_SOS1, x)
    y = signal.sosfilt(K_SOS2, y)
    ms = float(np.mean(y * y))
    if ms <= 1e-12:
        return -120.0
    return -0.691 + 10.0 * math.log10(ms)


def pyloudnorm_lufs(mono: np.ndarray, sr: int = TARGET_SR) -> tuple[float, str]:
    """Compute pyloudnorm integrated LUFS (or zero-padded 450ms short-term equivalent)."""
    meter = pyln.Meter(sr)
    min_samples = int(0.42 * sr)
    if len(mono) >= min_samples:
        lufs = float(meter.integrated_loudness(mono.astype(np.float64)))
        if math.isfinite(lufs):
            return round(lufs, 2), "integrated"
    # For clips < 400ms, report K-weighted active loudness (LKFS) directly and note method.
    return round(k_weighted_lkfs(mono, sr), 2), "k_weighted_short"


def to_mono_44k(data: np.ndarray, sr: int) -> np.ndarray:
    """Convert audio to mono 44.1 kHz float64, guarding against L/R phase cancellation."""
    arr = np.asarray(data, dtype=np.float64)
    if arr.ndim == 2:
        if arr.shape[1] == 1:
            mono = arr[:, 0]
        else:
            left = arr[:, 0]
            right = arr[:, 1]
            avg = 0.5 * (left + right)
            e_avg = float(np.sum(avg * avg))
            e_left = float(np.sum(left * left))
            e_right = float(np.sum(right * right))
            e_max = max(e_left, e_right)
            if e_max > 0 and e_avg < 0.5 * e_max:
                mono = left if e_left >= e_right else right
            else:
                mono = avg
    else:
        mono = arr

    if sr != TARGET_SR:
        g = math.gcd(sr, TARGET_SR)
        mono = signal.resample_poly(mono, TARGET_SR // g, sr // g)

    mono = np.nan_to_num(mono, nan=0.0, posinf=0.0, neginf=0.0)
    if len(mono) > 24:
        mono = signal.sosfiltfilt(HPF_SOS, mono)
    return mono


def rms_envelope(mono: np.ndarray, win_ms: float, hop_ms: float, sr: int = TARGET_SR) -> tuple[np.ndarray, int]:
    """Compute sliding RMS envelope in linear amplitude."""
    win = max(8, int(round(win_ms * sr / 1000.0)))
    hop = max(2, int(round(hop_ms * sr / 1000.0)))
    if len(mono) < win:
        return np.array([float(np.sqrt(np.mean(mono**2)))], dtype=np.float64), hop
    sq = mono * mono
    csum = np.concatenate(([0.0], np.cumsum(sq)))
    starts = np.arange(0, len(mono) - win + 1, hop)
    means = np.maximum(0.0, (csum[starts + win] - csum[starts]) / win)
    return np.sqrt(means), hop


def isolate_best_short_event(mono: np.ndarray, max_ms: float, sr: int = TARGET_SR) -> np.ndarray:
    """For click/blip, isolate the cleanest single transient if multiple hits appear."""
    env, hop = rms_envelope(mono, 2.0, 0.5, sr)
    peak_env = float(np.max(env)) if env.size else 0.0
    if peak_env < 1e-6:
        return mono

    # Identify active islands above -28 dB relative to peak envelope
    thresh = peak_env * 10 ** (-28.0 / 20.0)
    above = env >= thresh
    min_gap_frames = int(round(25.0 / 0.5))  # 25ms silence separates distinct events

    segments: list[tuple[int, int]] = []
    in_seg = False
    seg_start = 0
    low_count = 0
    last_high = 0
    for i, flag in enumerate(above):
        if flag:
            if not in_seg:
                in_seg = True
                seg_start = i
            last_high = i
            low_count = 0
        elif in_seg:
            low_count += 1
            if low_count >= min_gap_frames:
                segments.append((seg_start, last_high + 1))
                in_seg = False
    if in_seg:
        segments.append((seg_start, last_high + 1))

    if len(segments) <= 1:
        return mono

    best_score = -1e9
    best_slice = mono
    pad_pre = int(round(12.0 * sr / 1000.0))
    pad_post = int(round(20.0 * sr / 1000.0))
    for s_f, e_f in segments:
        s_idx = max(0, s_f * hop - pad_pre)
        e_idx = min(len(mono), e_f * hop + pad_post)
        seg = mono[s_idx:e_idx]
        if seg.size < int(0.015 * sr):
            continue
        seg_peak = float(np.max(np.abs(seg)))
        dur_ms = (e_f - s_f) * 0.5
        # Prefer strong peak, compact duration fitting max_ms, and crisp decay
        dur_penalty = max(0.0, dur_ms - max_ms * 0.85) * 0.08
        score = 20.0 * math.log10(max(seg_peak, 1e-6)) - dur_penalty
        if score > best_score:
            best_score = score
            best_slice = seg
    return best_slice


def trim_and_envelope(
    mono: np.ndarray,
    sfx_id: str,
    target_range_ms: tuple[float, float],
    sr: int = TARGET_SR,
    trim_adjust_ms: float = 0.0,
) -> tuple[np.ndarray, dict]:
    """Trim leading/trailing silence, keep 2-5ms pre-attack buffer, clamp duration, apply fade-out."""
    is_micro = sfx_id in ("click", "blip")
    work = isolate_best_short_event(mono, target_range_ms[1], sr) if is_micro else mono

    peak_abs = float(np.max(np.abs(work))) if work.size else 0.0
    if peak_abs < 1e-6:
        min_samples = int(round(target_range_ms[0] * sr / 1000.0))
        return np.zeros(min_samples, dtype=np.float64), {
            "pre_attack_buffer_ms": 0.0,
            "fade_out_ms": 0.0,
            "is_silent": True,
        }

    # Fine sliding peak (0.8 ms window) for precise attack detection
    atk_win = max(8, int(round(0.0008 * sr)))
    abs_w = np.abs(work)
    # Moving max via sliding stride or max pool on small blocks
    # Simple fast 0.5ms RMS for attack onset at -34 dB rel peak
    env_ms = 1.5 if is_micro else 4.0
    hop_ms = 0.25 if is_micro else 0.5
    env, hop = rms_envelope(work, env_ms, hop_ms, sr)
    env_peak = float(np.max(env))

    atk_thresh_env = env_peak * 10 ** (-30.0 / 20.0)
    atk_frames = np.where(env >= atk_thresh_env)[0]
    if atk_frames.size > 0:
        rough_start = int(atk_frames[0] * hop)
    else:
        rough_start = int(np.argmax(abs_w))

    # Refine exact sample where signal crosses -36 dB relative to peak_abs
    search_lo = max(0, rough_start - int(round(0.004 * sr)))
    search_hi = min(len(work), rough_start + int(round(0.008 * sr)))
    sample_thresh = peak_abs * 10 ** (-36.0 / 20.0)
    hits = np.where(abs_w[search_lo:search_hi] >= sample_thresh)[0]
    attack_idx = search_lo + int(hits[0]) if hits.size > 0 else rough_start

    # Keep 3.5 ms pre-attack buffer so measured pre-attack silence (-40 dB) sits cleanly in 2-5ms.
    pre_buf_ms = 3.5
    pre_buf_samples = int(round(pre_buf_ms * sr / 1000.0))
    if attack_idx >= pre_buf_samples:
        start_idx = attack_idx - pre_buf_samples
        core = work[start_idx:].copy()
        actual_pre = pre_buf_samples
    else:
        pad = pre_buf_samples - attack_idx
        core = np.concatenate((np.zeros(pad, dtype=np.float64), work)).copy()
        actual_pre = pre_buf_samples

    # Gently taper the first 2.0 ms of the pre-attack buffer so pre-attack floor never spikes above -40 dB.
    taper_len = min(int(round(0.0022 * sr)), max(8, actual_pre - int(round(0.0005 * sr))))
    if taper_len > 4:
        ramp = 0.5 * (1.0 - np.cos(np.pi * np.arange(taper_len) / taper_len))
        core[:taper_len] *= ramp

    # Tail detection (-45 dB relative to peak_abs)
    tail_env, tail_hop = rms_envelope(core, 4.0 if is_micro else 8.0, 0.5 if is_micro else 1.0, sr)
    tail_thresh = max(float(np.max(tail_env)) * 10 ** (-44.0 / 20.0), peak_abs * 10 ** (-45.0 / 20.0))
    tail_frames = np.where(tail_env >= tail_thresh)[0]
    if tail_frames.size > 0:
        natural_end = int((tail_frames[-1] + 1) * tail_hop + round((0.010 if is_micro else 0.025) * sr))
    else:
        natural_end = int(round(target_range_ms[0] * sr / 1000.0))

    min_samples = int(round(target_range_ms[0] * sr / 1000.0))
    max_samples = int(round(max(target_range_ms[0], target_range_ms[1] + trim_adjust_ms) * sr / 1000.0))
    end_samples = max(min_samples, min(max_samples, natural_end))

    if len(core) >= end_samples:
        trimmed = core[:end_samples].copy()
    else:
        pad_tail = end_samples - len(core)
        trimmed = np.concatenate((core, np.zeros(pad_tail, dtype=np.float64)))

    # Smooth raised-cosine fade-out (20-50 ms)
    fade_ms = FADE_OUT_MS[sfx_id]
    fade_samples = min(int(round(fade_ms * sr / 1000.0)), max(32, len(trimmed) - actual_pre - int(0.006 * sr)))
    if fade_samples > 16:
        fade_curve = 0.5 * (1.0 + np.cos(np.pi * np.arange(1, fade_samples + 1) / fade_samples))
        trimmed[-fade_samples:] *= fade_curve

    return trimmed, {
        "pre_attack_buffer_ms": round(actual_pre * 1000.0 / sr, 2),
        "fade_out_ms": round(fade_samples * 1000.0 / sr, 2),
        "is_silent": False,
    }


def apply_soft_limiter_for_loudness(mono: np.ndarray, target_lkfs: float, target_peak_dbfs: float) -> np.ndarray:
    """Apply gentle tanh soft-knee limiting only if peak-normalized signal is too quiet in LKFS."""
    peak = float(np.max(np.abs(mono)))
    if peak <= 1e-8:
        return mono
    target_peak_lin = 10.0 ** (target_peak_dbfs / 20.0)
    # Try mild drive factors until LKFS reaches min_lkfs or max drive 1.8x
    best = mono * (target_peak_lin / peak)
    for drive in (1.2, 1.45, 1.75, 2.1):
        driven = np.tanh(best * drive) / math.tanh(drive)
        p = float(np.max(np.abs(driven)))
        if p > 0:
            driven = driven * (target_peak_lin / p)
        best = driven
        if k_weighted_lkfs(best) >= target_lkfs:
            break
    return best


def normalize_audio(mono: np.ndarray, tier: str) -> np.ndarray:
    """Normalize peak and perceptual loudness according to the sound's tier."""
    prof = LOUDNESS_PROFILE[tier]
    peak = float(np.max(np.abs(mono))) if mono.size else 0.0
    if peak < 1e-7:
        return mono

    target_peak_lin = 10.0 ** (prof["target_peak_dbfs"] / 20.0)
    y = mono * (target_peak_lin / peak)
    lkfs = k_weighted_lkfs(y)

    if lkfs > prof["max_lkfs"]:
        gain_db = prof["target_lkfs"] - lkfs
        y = y * (10.0 ** (gain_db / 20.0))
    elif lkfs < prof["min_lkfs"]:
        if tier == "standard":
            y = apply_soft_limiter_for_loudness(y, prof["min_lkfs"], prof["target_peak_dbfs"])
        else:
            # For quiet UI sounds, allow slightly higher gain while capping peak well below -6 dBFS
            gain_db = min(prof["target_lkfs"] - lkfs, (-7.5) - (20.0 * math.log10(float(np.max(np.abs(y))))))
            if gain_db > 0:
                y = y * (10.0 ** (gain_db / 20.0))

    # Hard safety guard against clipping
    final_peak = float(np.max(np.abs(y)))
    ceil_lin = 10.0 ** (-0.5 / 20.0)
    if final_peak > ceil_lin:
        y = y * (ceil_lin / final_peak)
    return y


def encode_mp3_and_measure(
    mono: np.ndarray,
    mp3_path: Path,
    sfx_id: str,
    target_range_ms: tuple[float, float],
    sr: int = TARGET_SR,
) -> tuple[np.ndarray, dict]:
    """Encode WAV to 44.1kHz mono 128k LAME MP3, decode it back, and measure actual MP3 metrics."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_wav = Path(tmpdir) / "in.wav"
        dec_wav = Path(tmpdir) / "dec.wav"
        sf.write(str(tmp_wav), mono.astype(np.float32), sr, subtype="FLOAT")

        cmd_enc = [
            "ffmpeg", "-y", "-v", "error",
            "-i", str(tmp_wav),
            "-ac", "1", "-ar", str(sr),
            "-c:a", "libmp3lame", "-b:a", "128k",
            str(mp3_path),
        ]
        subprocess.run(cmd_enc, check=True)

        cmd_dec = [
            "ffmpeg", "-y", "-v", "error",
            "-i", str(mp3_path),
            "-ac", "1", "-ar", str(sr),
            "-c:a", "pcm_f32le",
            str(dec_wav),
        ]
        subprocess.run(cmd_dec, check=True)
        dec_data, dec_sr = sf.read(str(dec_wav), dtype="float32")
        dec = np.asarray(dec_data, dtype=np.float64)

    metrics = measure_signal_metrics(dec, dec_sr, sfx_id, target_range_ms)
    metrics["file_size_bytes"] = mp3_path.stat().st_size
    return dec, metrics


def measure_signal_metrics(
    mono: np.ndarray,
    sr: int,
    sfx_id: str,
    target_range_ms: tuple[float, float],
) -> dict:
    """Measure objective acoustic metrics from a decoded signal."""
    dur_ms = len(mono) * 1000.0 / sr
    abs_y = np.abs(mono)
    peak = float(np.max(abs_y)) if mono.size else 0.0
    rms = float(np.sqrt(np.mean(mono * mono))) if mono.size else 0.0
    peak_dbfs = 20.0 * math.log10(max(peak, 1e-9))
    rms_dbfs = 20.0 * math.log10(max(rms, 1e-9))
    lkfs = k_weighted_lkfs(mono, sr)
    lufs_val, lufs_method = pyloudnorm_lufs(mono, sr)

    clipped_samples = int(np.sum(abs_y >= 0.999))
    clipping = bool(peak_dbfs >= -0.1 or clipped_samples > 0)

    # Pre-attack silence: time from sample 0 until amplitude reaches peak - 40 dB (smoothed 0.4ms)
    if peak > 1e-6:
        w = max(4, int(round(0.0004 * sr)))
        sm = np.convolve(abs_y, np.ones(w) / w, mode="same")
        thresh = peak * 10 ** (-38.0 / 20.0)
        idx = np.where(sm >= thresh)[0]
        pre_silence_ms = float(idx[0] * 1000.0 / sr) if idx.size > 0 else dur_ms
    else:
        pre_silence_ms = dur_ms

    # Spectral centroid & SNR estimate
    if mono.size >= 128 and peak > 1e-6:
        win = np.hanning(len(mono))
        spec = np.abs(np.fft.rfft(mono * win))
        freqs = np.fft.rfftfreq(len(mono), 1.0 / sr)
        spec_sum = float(np.sum(spec))
        centroid_hz = float(np.sum(freqs * spec) / spec_sum) if spec_sum > 0 else 0.0
    else:
        centroid_hz = 0.0

    # Tail noise floor from final 12ms vs peak
    tail_n = min(len(mono), max(64, int(round(0.012 * sr))))
    tail_rms = float(np.sqrt(np.mean(mono[-tail_n:] ** 2))) if tail_n > 0 else 0.0
    tail_dbfs = 20.0 * math.log10(max(tail_rms, 1e-9))

    # Active core SNR vs quietest 15% of 2ms frames
    env, _ = rms_envelope(mono, 2.0, 0.5, sr)
    floor_rms = float(np.percentile(env, 10)) if env.size else 1e-9
    snr_db = peak_dbfs - (20.0 * math.log10(max(floor_rms, 1e-9)))

    # Level (dB re peak, 5 ms RMS) just before the fade-out starts: a low value means the sound
    # ended naturally; a high value means the clip was cut while still ringing.
    fade_start_n = int(round(max(0.0, dur_ms - FADE_OUT_MS[sfx_id]) * sr / 1000.0))
    cut_lo = max(0, fade_start_n - int(round(0.005 * sr)))
    cut_seg = mono[cut_lo:max(cut_lo + 8, fade_start_n)]
    cut_rms = float(np.sqrt(np.mean(cut_seg * cut_seg))) if cut_seg.size else 0.0
    pre_fade_level_db = 20.0 * math.log10(max(cut_rms, 1e-9) / max(peak, 1e-9))

    # Decay time: time from the peak until the 2 ms RMS envelope stays below -30 dB re peak.
    if env.size and peak > 1e-6:
        e_db = 20.0 * np.log10(np.maximum(env, 1e-9) / max(float(np.max(env)), 1e-9))
        k_peak = int(np.argmax(env))
        above_idx = np.where(e_db[k_peak:] > -30.0)[0]
        t30_ms = float((above_idx[-1] + 1) * 0.5) if above_idx.size else 0.0
    else:
        t30_ms = 0.0

    # Active time: how long the 2 ms RMS envelope stays above -40 dB re peak (detects zero-padded tails).
    if env.size and peak > 1e-6:
        act = np.where(20.0 * np.log10(np.maximum(env, 1e-9) / max(float(np.max(env)), 1e-9)) > -40.0)[0]
        active_ms = float((act[-1] - act[0] + 1) * 0.5) if act.size else 0.0
    else:
        active_ms = 0.0

    in_target_dur = bool(target_range_ms[0] - 2.0 <= dur_ms <= target_range_ms[1] + 4.5)
    return {
        "active_ms": round(active_ms, 1),
        "pre_fade_level_db": round(pre_fade_level_db, 1),
        "decay_t30_ms": round(t30_ms, 1),
        "duration_ms": round(dur_ms, 1),
        "peak_dbfs": round(peak_dbfs, 2),
        "rms_dbfs": round(rms_dbfs, 2),
        "loudness_lkfs": round(lkfs, 2),
        "lufs": lufs_val,
        "lufs_method": lufs_method,
        "clipping": clipping,
        "clipped_samples": clipped_samples,
        "pre_attack_silence_ms": round(pre_silence_ms, 2),
        "fade_out_ms": round(FADE_OUT_MS[sfx_id], 1),
        "spectral_centroid_hz": round(centroid_hz, 1),
        "tail_rms_dbfs": round(tail_dbfs, 2),
        "snr_db": round(snr_db, 1),
        "in_target_duration": in_target_dur,
    }


def synthesize_backup_candidates(sfx_id: str, sr: int = TARGET_SR) -> list[dict]:
    """Generate clean Python-synthesized backup candidates only for click/blip fallback."""
    out = []
    if sfx_id == "click":
        # Synth 1: Soft damped wooden tap (filtered short impulse + warm 520Hz/890Hz body)
        dur_s = 0.068
        n = int(round(dur_s * sr))
        t = np.arange(n) / sr
        pre = int(round(0.0035 * sr))
        tt = np.maximum(0.0, t - 0.0035)
        active = (t >= 0.0035).astype(np.float64)
        body = (
            0.70 * np.sin(2 * np.pi * 490.0 * tt) * np.exp(-tt / 0.009)
            + 0.40 * np.sin(2 * np.pi * 920.0 * tt) * np.exp(-tt / 0.005)
            + 0.25 * np.sin(2 * np.pi * 1550.0 * tt) * np.exp(-tt / 0.0025)
        ) * active
        # Gentle 1ms attack ramp
        atk_n = int(round(0.0012 * sr))
        env_atk = np.ones_like(t)
        env_atk[pre : pre + atk_n] = np.linspace(0.0, 1.0, atk_n)
        wave = body * env_atk
        out.append({
            "key": "click_synth_wood",
            "source": "synth",
            "prompt_id": "synth_wood",
            "seed": None,
            "prompt": "[Python 合成] 柔和阻尼木質輕敲（490 Hz + 920 Hz 指數衰減共振，68 ms）",
            "negative_prompt": "",
            "mono": wave,
        })

        # Synth 2: Soft tactile keycap tap (410Hz + 760Hz rounded pulse)
        dur_s = 0.062
        n = int(round(dur_s * sr))
        t = np.arange(n) / sr
        pre = int(round(0.0035 * sr))
        tt = np.maximum(0.0, t - 0.0035)
        active = (t >= 0.0035).astype(np.float64)
        body = (
            0.75 * np.sin(2 * np.pi * 410.0 * tt) * np.exp(-tt / 0.008)
            + 0.30 * np.sin(2 * np.pi * 1120.0 * tt) * np.exp(-tt / 0.003)
        ) * active
        atk_n = int(round(0.0015 * sr))
        env_atk = np.ones_like(t)
        env_atk[pre : pre + atk_n] = np.linspace(0.0, 1.0, atk_n)
        out.append({
            "key": "click_synth_keycap",
            "source": "synth",
            "prompt_id": "synth_keycap",
            "seed": None,
            "prompt": "[Python 合成] 溫潤消光按鍵輕觸（410 Hz + 1120 Hz 短阻尼，62 ms）",
            "negative_prompt": "",
            "mono": body * env_atk,
        })

    elif sfx_id == "blip":
        # Synth 1: Cozy anime dialogue sine/triangle pip (720 -> 780 Hz, 46ms)
        dur_s = 0.046
        n = int(round(dur_s * sr))
        t = np.arange(n) / sr
        pre = int(round(0.0035 * sr))
        tt = np.maximum(0.0, t - 0.0035)
        active = (t >= 0.0035).astype(np.float64)
        freq = 720.0 + 70.0 * (1.0 - np.exp(-tt / 0.012))
        phase = 2 * np.pi * np.cumsum(freq) / sr
        wave = (0.85 * np.sin(phase) + 0.15 * np.sin(2 * phase)) * np.exp(-tt / 0.016) * active
        atk_n = int(round(0.002 * sr))
        env_atk = np.ones_like(t)
        env_atk[pre : pre + atk_n] = 0.5 * (1.0 - np.cos(np.pi * np.arange(atk_n) / atk_n))
        out.append({
            "key": "blip_synth_sinepop",
            "source": "synth",
            "prompt_id": "synth_sinepop",
            "seed": None,
            "prompt": "[Python 合成] 溫柔對白小氣泡「嘀」聲（720→790 Hz 微上揚正弦波，46 ms）",
            "negative_prompt": "",
            "mono": wave * env_atk,
        })

        # Synth 2: Warm wooden marimba pip (640 Hz warm tone, 48ms)
        dur_s = 0.048
        n = int(round(dur_s * sr))
        t = np.arange(n) / sr
        pre = int(round(0.0035 * sr))
        tt = np.maximum(0.0, t - 0.0035)
        active = (t >= 0.0035).astype(np.float64)
        wave = (
            0.82 * np.sin(2 * np.pi * 640.0 * tt) * np.exp(-tt / 0.015)
            + 0.18 * np.sin(2 * np.pi * 1280.0 * tt) * np.exp(-tt / 0.007)
        ) * active
        atk_n = int(round(0.002 * sr))
        env_atk = np.ones_like(t)
        env_atk[pre : pre + atk_n] = 0.5 * (1.0 - np.cos(np.pi * np.arange(atk_n) / atk_n))
        out.append({
            "key": "blip_synth_marimba",
            "source": "synth",
            "prompt_id": "synth_marimba",
            "seed": None,
            "prompt": "[Python 合成] 柔和木琴微音高點滴聲（640 Hz + 輕柔泛音，48 ms）",
            "negative_prompt": "",
            "mono": wave * env_atk,
        })
    return out


def plot_waveform_and_spectrogram(
    mono: np.ndarray,
    metrics: dict,
    title: str,
    out_png: Path,
    sr: int = TARGET_SR,
) -> None:
    """Render a clean dual-panel Waveform + Spectrogram PNG for a candidate."""
    t_ms = np.arange(len(mono)) * 1000.0 / sr
    fig, (ax_wav, ax_spec) = plt.subplots(
        2, 1, figsize=(8.4, 4.4), dpi=140, gridspec_kw={"height_ratios": [1.0, 1.35]}
    )
    fig.patch.set_facecolor("#0f172a")

    # Waveform panel
    ax_wav.set_facecolor("#162033")
    ax_wav.plot(t_ms, mono, color="#38bdf8", linewidth=0.9)
    ax_wav.axhline(0.0, color="#475569", linewidth=0.6)
    ax_wav.axvline(metrics["pre_attack_silence_ms"], color="#f59e0b", linestyle="--", linewidth=0.9, label="Attack")
    fade_start = max(0.0, metrics["duration_ms"] - metrics["fade_out_ms"])
    ax_wav.axvspan(fade_start, metrics["duration_ms"], color="#a855f7", alpha=0.14, label="Fade-out")
    ax_wav.set_xlim(0.0, max(1.0, t_ms[-1]))
    y_lim = max(0.15, min(1.05, float(np.max(np.abs(mono))) * 1.25))
    ax_wav.set_ylim(-y_lim, y_lim)
    ax_wav.set_ylabel("Amp", color="#cbd5e1", fontsize=8.5)
    ax_wav.tick_params(colors="#94a3b8", labelsize=8)
    ax_wav.set_title(
        f"{title}  |  {metrics['duration_ms']:.1f} ms  |  Peak {metrics['peak_dbfs']:.1f} dBFS  |  "
        f"LKFS {metrics['loudness_lkfs']:.1f}  |  Pre {metrics['pre_attack_silence_ms']:.1f} ms",
        color="#f8fafc",
        fontsize=9.5,
        fontweight="bold",
        pad=7,
    )
    for spine in ax_wav.spines.values():
        spine.set_color("#334155")

    # Spectrogram panel (STFT)
    ax_spec.set_facecolor("#090d16")
    nfft = 256 if len(mono) < 4000 else 512
    if len(mono) < nfft:
        nfft = max(64, 2 ** int(math.floor(math.log2(max(64, len(mono))))))
    hop = max(8, nfft // 8)
    freqs, times, zxx = signal.stft(mono, fs=sr, nperseg=nfft, noverlap=nfft - hop, window="hann")
    mag_db = 20.0 * np.log10(np.maximum(np.abs(zxx), 1e-6))
    vmax = float(np.max(mag_db)) if mag_db.size else 0.0
    vmin = vmax - 75.0
    mask = freqs <= 12000.0
    ax_spec.pcolormesh(
        times * 1000.0,
        freqs[mask] / 1000.0,
        mag_db[mask, :],
        shading="auto",
        cmap="magma",
        vmin=vmin,
        vmax=vmax,
    )
    ax_spec.set_xlim(0.0, max(1.0, t_ms[-1]))
    ax_spec.set_ylim(0.0, 12.0)
    ax_spec.set_xlabel("Time (ms)", color="#cbd5e1", fontsize=8.5)
    ax_spec.set_ylabel("Freq (kHz)", color="#cbd5e1", fontsize=8.5)
    ax_spec.tick_params(colors="#94a3b8", labelsize=8)
    for spine in ax_spec.spines.values():
        spine.set_color("#334155")

    plt.tight_layout(pad=0.9)
    fig.savefig(out_png, facecolor=fig.get_facecolor())
    plt.close(fig)


def render_contact_sheet(sfx_id: str, items: list[dict], out_png: Path) -> None:
    """Render a grid contact sheet showing waveform + spectrogram for all candidates of one SFX."""
    n = len(items)
    cols = 4
    rows = max(1, math.ceil(n / cols))
    fig, axes = plt.subplots(rows * 2, cols, figsize=(16, 3.3 * rows), dpi=115)
    fig.patch.set_facecolor("#0b1120")

    if rows == 1:
        axes = np.array(axes).reshape(2, cols)
    else:
        axes = np.array(axes).reshape(rows * 2, cols)

    for idx, item in enumerate(items):
        r = (idx // cols) * 2
        c = idx % cols
        ax_w = axes[r, c]
        ax_s = axes[r + 1, c]
        y = item["mono"]
        m = item["metrics"]
        t_ms = np.arange(len(y)) * 1000.0 / TARGET_SR

        ax_w.set_facecolor("#162033")
        ax_w.plot(t_ms, y, color="#38bdf8" if item["source"] == "ai" else "#34d399", linewidth=0.75)
        ax_w.set_xlim(0, max(1.0, t_ms[-1]))
        ym = max(0.1, float(np.max(np.abs(y))) * 1.15)
        ax_w.set_ylim(-ym, ym)
        ax_w.set_xticks([])
        ax_w.set_yticks([])
        tag = f"[{idx+1}] {item['short_label']}"
        ax_w.set_title(
            f"{tag} | {m['duration_ms']:.0f}ms pk={m['peak_dbfs']:.1f} lkfs={m['loudness_lkfs']:.1f} snr={m['snr_db']:.0f}dB",
            color="#f1f5f9" if m["in_target_duration"] and not m["clipping"] else "#fca5a5",
            fontsize=7.6,
            pad=3,
        )

        ax_s.set_facecolor("#090d16")
        nfft = 256 if len(y) < 4000 else 512
        if len(y) < nfft:
            nfft = max(64, 2 ** int(math.floor(math.log2(max(64, len(y))))))
        hop = max(8, nfft // 8)
        freqs, times, zxx = signal.stft(y, fs=TARGET_SR, nperseg=nfft, noverlap=nfft - hop)
        mag_db = 20.0 * np.log10(np.maximum(np.abs(zxx), 1e-6))
        vmax = float(np.max(mag_db)) if mag_db.size else 0.0
        mask = freqs <= 12000.0
        ax_s.pcolormesh(times * 1000.0, freqs[mask] / 1000.0, mag_db[mask, :], shading="auto", cmap="magma", vmin=vmax - 70.0, vmax=vmax)
        ax_s.set_xlim(0, max(1.0, t_ms[-1]))
        ax_s.set_ylim(0, 12.0)
        ax_s.tick_params(colors="#94a3b8", labelsize=6.5)

    # Blank unused cells
    for idx in range(n, rows * cols):
        r = (idx // cols) * 2
        c = idx % cols
        axes[r, c].axis("off")
        axes[r + 1, c].axis("off")

    fig.suptitle(f"SFX Triage Contact Sheet: {sfx_id} ({n} candidates)", color="#f8fafc", fontsize=13, fontweight="bold", y=0.995)
    plt.tight_layout(rect=[0, 0, 1, 0.98], h_pad=0.6, w_pad=0.6)
    fig.savefig(out_png, facecolor=fig.get_facecolor())
    plt.close(fig)


def process_single_candidate(
    raw_mono: np.ndarray,
    sfx_id: str,
    tier: str,
    target_range_ms: tuple[float, float],
    mp3_path: Path | None = None,
) -> tuple[np.ndarray, dict]:
    """Full trim + normalization + optional MP3 round-trip check ensuring exact duration compliance."""
    adjust_ms = 0.0
    for attempt in range(4):
        trimmed, env_info = trim_and_envelope(raw_mono, sfx_id, target_range_ms, TARGET_SR, trim_adjust_ms=adjust_ms)
        normed = normalize_audio(trimmed, tier)
        if mp3_path is None:
            metrics = measure_signal_metrics(normed, TARGET_SR, sfx_id, target_range_ms)
            metrics["fade_out_ms"] = env_info["fade_out_ms"]
            return normed, metrics

        dec, metrics = encode_mp3_and_measure(normed, mp3_path, sfx_id, target_range_ms, TARGET_SR)
        metrics["fade_out_ms"] = env_info["fade_out_ms"]
        # Ensure decoded MP3 stays strictly within target bounds (respecting <= 120ms / <= 60ms hard caps)
        hard_max = 120.0 if sfx_id == "click" else (60.0 if sfx_id == "blip" else target_range_ms[1])
        if metrics["duration_ms"] > hard_max and attempt < 3:
            overshoot = metrics["duration_ms"] - hard_max + 2.0
            adjust_ms -= overshoot
            continue
        if metrics["duration_ms"] < target_range_ms[0] and attempt < 3:
            undershoot = target_range_ms[0] - metrics["duration_ms"] + 2.0
            adjust_ms += undershoot
            continue
        return dec, metrics
    return dec, metrics


def run_triage(raw_dir: Path, prompts_path: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(prompts_path.read_text(encoding="utf-8"))
    manifest = json.loads((raw_dir / "generation_manifest.json").read_text(encoding="utf-8"))
    entries_by_sfx: dict[str, list[dict]] = {}
    for e in manifest["entries"]:
        entries_by_sfx.setdefault(e["sfx_id"], []).append(e)

    summary = {"sounds": {}}
    for sound in cfg["sounds"]:
        sid = sound["id"]
        tier = sound["loudness_tier"]
        target_range = (float(sound["target_duration_ms"][0]), float(sound["target_duration_ms"][1]))
        items = []

        for entry in entries_by_sfx.get(sid, []):
            wav_path = raw_dir / entry["rel_path"]
            data, sr = sf.read(str(wav_path), dtype="float32")
            mono = to_mono_44k(data, sr)
            proc, metrics = process_single_candidate(mono, sid, tier, target_range, mp3_path=None)
            short_label = Path(entry["rel_path"]).stem.replace(f"{sid}_", "")
            items.append({
                "key": Path(entry["rel_path"]).stem,
                "short_label": short_label,
                "rel_path": entry["rel_path"],
                "source": "ai",
                "prompt_id": entry["prompt_id"],
                "seed": entry["seed"],
                "prompt": entry["prompt"],
                "negative_prompt": entry["negative_prompt"],
                "mono": proc,
                "metrics": metrics,
            })

        # Add synth backup evaluations for click/blip
        for sb in synthesize_backup_candidates(sid, TARGET_SR):
            proc, metrics = process_single_candidate(sb["mono"], sid, tier, target_range, mp3_path=None)
            items.append({
                "key": sb["key"],
                "short_label": sb["prompt_id"],
                "rel_path": None,
                "source": "synth",
                "prompt_id": sb["prompt_id"],
                "seed": None,
                "prompt": sb["prompt"],
                "negative_prompt": "",
                "mono": proc,
                "metrics": metrics,
            })

        contact_png = out_dir / f"triage_{sid}.png"
        render_contact_sheet(sid, items, contact_png)
        summary["sounds"][sid] = [
            {k: v for k, v in it.items() if k != "mono"}
            for it in items
        ]
        print(f"[triage] {sid}: {len(items)} candidates -> {contact_png}", flush=True)

    summary_path = out_dir / "triage_summary.json"
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[triage] Summary written to {summary_path}", flush=True)


def run_finalize(
    raw_dir: Path,
    prompts_path: Path,
    selection_path: Path,
    out_dir: Path,
    metrics_out: Path,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(prompts_path.read_text(encoding="utf-8"))
    manifest = json.loads((raw_dir / "generation_manifest.json").read_text(encoding="utf-8"))
    selection = json.loads(selection_path.read_text(encoding="utf-8"))
    entries_by_key = {Path(e["rel_path"]).stem: e for e in manifest["entries"]}
    sounds_by_id = {s["id"]: s for s in cfg["sounds"]}

    synth_lookup: dict[str, dict] = {}
    for sid in ("click", "blip"):
        for sb in synthesize_backup_candidates(sid, TARGET_SR):
            synth_lookup[sb["key"]] = sb

    final_data = {
        "model_id": manifest.get("model_id", cfg["model_id"]),
        "license": cfg.get("license", "Stability AI Community License"),
        "gpu_name": manifest.get("gpu_name", "unknown"),
        "dtype": manifest.get("dtype", "unknown"),
        "sounds": [],
    }

    for sound in cfg["sounds"]:
        sid = sound["id"]
        tier = sound["loudness_tier"]
        target_range = (float(sound["target_duration_ms"][0]), float(sound["target_duration_ms"][1]))
        sel = selection[sid]
        picked_keys: list[str] = sel["candidates"]
        if len(picked_keys) != 4:
            raise ValueError(f"{sid}: expected 4 selected candidates, got {len(picked_keys)}")

        cand_records = []
        for idx, key in enumerate(picked_keys, start=1):
            cid = f"c{idx}"
            mp3_name = f"{sid}_{cid}.mp3"
            png_name = f"{sid}_{cid}.png"
            mp3_path = out_dir / mp3_name
            png_path = out_dir / png_name

            if key in synth_lookup:
                sb = synth_lookup[key]
                mono = sb["mono"]
                source = "synth"
                prompt_text = sb["prompt"]
                neg_text = ""
                seed = None
                prompt_id = sb["prompt_id"]
                raw_rel = None
                raw_stats = None
            else:
                entry = entries_by_key[key]
                raw_path = raw_dir / entry["rel_path"]
                data, sr = sf.read(str(raw_path), dtype="float32")
                mono = to_mono_44k(data, sr)
                source = "ai"
                prompt_text = entry["prompt"]
                neg_text = entry["negative_prompt"]
                seed = entry["seed"]
                prompt_id = entry["prompt_id"]
                raw_rel = entry["rel_path"]
                raw_stats = entry.get("raw_stats")

            dec, metrics = process_single_candidate(mono, sid, tier, target_range, mp3_path=mp3_path)
            plot_waveform_and_spectrogram(
                dec, metrics, f"{sid}_{cid} ({'AI' if source == 'ai' else 'SYNTH'})", png_path, TARGET_SR
            )

            cand_records.append({
                "candidate_id": cid,
                "key": key,
                "file": mp3_name,
                "spectrogram_png": png_name,
                "source": source,
                "prompt_id": prompt_id,
                "seed": seed,
                "prompt": prompt_text,
                "negative_prompt": neg_text,
                "raw_file": raw_rel,
                "raw_stats": raw_stats,
                "recommended": (cid == sel["recommended"]),
                "note": sel.get("candidate_notes", {}).get(key, ""),
                "metrics": metrics,
            })
            print(
                f"[final] {mp3_name} ({source}): dur={metrics['duration_ms']}ms "
                f"pk={metrics['peak_dbfs']}dBFS lkfs={metrics['loudness_lkfs']} "
                f"pre={metrics['pre_attack_silence_ms']}ms clip={metrics['clipping']}",
                flush=True,
            )

        final_data["sounds"].append({
            "id": sid,
            "name": sound["name"],
            "usage": sound["usage"],
            "trigger": sound["trigger"],
            "target_duration_ms": sound["target_duration_ms"],
            "target_duration_label": sound["target_duration_label"],
            "loudness_tier": tier,
            "recommended_candidate": sel["recommended"],
            "recommendation_reason": sel["reason"],
            "candidates": cand_records,
        })

    metrics_out.parent.mkdir(parents=True, exist_ok=True)
    metrics_out.write_text(json.dumps(final_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[final] Wrote {metrics_out}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Post-process Stable Audio Open SFX candidates.")
    parser.add_argument("--mode", choices=["triage", "finalize"], required=True)
    parser.add_argument("--raw-dir", type=Path, required=True)
    parser.add_argument("--prompts", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--selection", type=Path)
    parser.add_argument("--metrics-out", type=Path)
    args = parser.parse_args()

    if args.mode == "triage":
        run_triage(args.raw_dir, args.prompts, args.out_dir)
    else:
        if not args.selection or not args.metrics_out:
            parser.error("--selection and --metrics-out are required for --mode finalize")
        run_finalize(args.raw_dir, args.prompts, args.selection, args.out_dir, args.metrics_out)


if __name__ == "__main__":
    main()
