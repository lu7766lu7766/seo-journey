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
    "choice": 65.0,
    "card": 45.0,
    "grow": 40.0,
    "bond": 45.0,
    "fail": 55.0,
    "win": 45.0,
    "shock": 60.0,
}

# 4 kHz zero-phase 4th-order Butterworth low-pass for micro UI sounds (click/blip)
LPF_4K_SOS = signal.butter(4, 4000.0, btype="lowpass", fs=TARGET_SR, output="sos")

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

    # Estimate pitch movement between first half and second half of active region (for choice/fail)
    f0_trend_semitones = 0.0
    if env.size and peak > 1e-6:
        act_e = np.where(20.0 * np.log10(np.maximum(env, 1e-9) / max(float(np.max(env)), 1e-9)) > -32.0)[0]
        if act_e.size >= 8:
            hop_samples = max(2, int(round(0.5 * sr / 1000.0)))
            s_idx = int(act_e[0] * hop_samples)
            e_idx = min(len(mono), int((act_e[-1] + 1) * hop_samples))
            mid_idx = s_idx + (e_idx - s_idx) // 2
            def _dom_freq(seg: np.ndarray) -> float:
                if len(seg) < 128:
                    return 0.0
                w_seg = seg * np.hanning(len(seg))
                sp = np.abs(np.fft.rfft(w_seg))
                fr = np.fft.rfftfreq(len(seg), 1.0 / sr)
                mask = (fr >= 120.0) & (fr <= 4500.0)
                if not np.any(mask):
                    return 0.0
                sp_m = sp[mask]
                fr_m = fr[mask]
                # Weighted spectral geometric mean around top peaks for stable perceived pitch
                top_thr = float(np.max(sp_m)) * 0.35
                sel = sp_m >= top_thr
                if not np.any(sel):
                    return float(fr_m[int(np.argmax(sp_m))])
                w_p = sp_m[sel] ** 2
                return float(np.sum(fr_m[sel] * w_p) / max(1e-12, float(np.sum(w_p))))
            f1 = _dom_freq(mono[s_idx:mid_idx])
            f2 = _dom_freq(mono[mid_idx:e_idx])
            if f1 > 50.0 and f2 > 50.0:
                f0_trend_semitones = 12.0 * math.log2(f2 / f1)

    band_above_4k_ratio = 0.0
    if mono.size >= 128 and peak > 1e-6:
        win = np.hanning(len(mono))
        spec2 = np.abs(np.fft.rfft(mono * win)) ** 2
        freqs = np.fft.rfftfreq(len(mono), 1.0 / sr)
        tot_e = float(np.sum(spec2))
        if tot_e > 0:
            band_above_4k_ratio = float(np.sum(spec2[freqs > 4000.0]) / tot_e)

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
        "band_above_4k_ratio": round(band_above_4k_ratio, 4),
        "f0_trend_semitones": round(f0_trend_semitones, 2),
        "tail_rms_dbfs": round(tail_dbfs, 2),
        "snr_db": round(snr_db, 1),
        "in_target_duration": in_target_dur,
    }


def _synth_damped_wood(
    sr: int,
    dur_s: float,
    partials: list[tuple[float, float, float]],
    atk_ms: float = 2.0,
    noise_amp: float = 0.0,
    noise_fc: float = 800.0,
    pitch_glide_hz: tuple[float, float, float] | None = None,
) -> np.ndarray:
    """Physical-modeling-inspired damped resonator with soft mallet onset and zero-phase 4 kHz low-pass."""
    n = int(round(dur_s * sr))
    t = np.arange(n, dtype=np.float64) / sr
    pre_s = 0.0035
    tt = np.maximum(0.0, t - pre_s)
    active = (t >= pre_s).astype(np.float64)

    body = np.zeros(n, dtype=np.float64)
    if pitch_glide_hz is not None:
        f_start, f_end, tau_g = pitch_glide_hz
        freq_curve = f_end + (f_start - f_end) * np.exp(-tt / max(1e-4, tau_g))
        phase = 2.0 * np.pi * np.cumsum(freq_curve * active) / sr
        amp0, _, tau0 = partials[0]
        body += amp0 * np.sin(phase) * np.exp(-tt / tau0) * active
        for amp, freq, tau in partials[1:]:
            body += amp * np.sin(2.0 * np.pi * freq * tt) * np.exp(-tt / tau) * active
    else:
        for amp, freq, tau in partials:
            body += amp * np.sin(2.0 * np.pi * freq * tt) * np.exp(-tt / tau) * active

    if noise_amp > 0.0:
        rng = np.random.default_rng(int(round(partials[0][1] * 17 + dur_s * 1000)))
        wn = rng.standard_normal(n) * np.exp(-tt / 0.0045) * active
        bp = signal.butter(2, [max(180.0, noise_fc * 0.65), min(3200.0, noise_fc * 1.45)], btype="bandpass", fs=sr, output="sos")
        wn_filt = signal.sosfilt(bp, wn)
        wn_peak = float(np.max(np.abs(wn_filt))) or 1.0
        body += noise_amp * (wn_filt / wn_peak)

    # Raised-cosine mallet attack (eliminates click/glitch at onset)
    pre_n = int(round(pre_s * sr))
    atk_n = max(16, int(round((atk_ms / 1000.0) * sr)))
    env_atk = np.ones_like(t)
    end_atk = min(n, pre_n + atk_n)
    env_atk[pre_n:end_atk] = 0.5 * (1.0 - np.cos(np.pi * np.arange(end_atk - pre_n) / max(1, end_atk - pre_n)))
    wave = body * env_atk

    if len(wave) > 36:
        wave = signal.sosfiltfilt(LPF_4K_SOS, wave)
    # Re-zero pre-roll before 1.5 ms to keep pre-attack clean
    pre_clean = int(round(0.0018 * sr))
    if pre_clean > 8:
        wave[:pre_clean] *= np.linspace(0.0, 1.0, pre_clean)
    return wave


def _apply_short_room(wave: np.ndarray, sr: int, wet: float = 0.14, cutoff_hz: float = 4000.0) -> np.ndarray:
    """Apply subtle warm studio early-reflections + damped tail so synth tones sound acoustic."""
    if wave.size < 64 or wet <= 0.0:
        return wave
    taps = [
        (0.011, 0.55),
        (0.017, -0.45),
        (0.024, 0.36),
        (0.033, -0.28),
        (0.043, 0.20),
        (0.056, -0.13),
        (0.072, 0.08),
    ]
    rev = np.zeros_like(wave)
    n = len(wave)
    for d_s, g in taps:
        d_n = int(round(d_s * sr))
        if 0 < d_n < n:
            rev[d_n:] += wave[: n - d_n] * g
    if len(rev) > 36:
        lpf = signal.butter(2, min(cutoff_hz, sr * 0.45), btype="lowpass", fs=sr, output="sos")
        rev = signal.sosfiltfilt(lpf, rev)
    return wave + wet * rev


def _synth_mallet_note(
    n: int,
    sr: int,
    onset_s: float,
    freq_hz: float,
    partials: list[tuple[float, float, float]],
    atk_ms: float = 2.2,
    glide_to_hz: float | None = None,
    glide_tau_s: float = 0.09,
    fm_ratio: float = 2.0,
    fm_index: float = 0.0,
    fm_tau_s: float = 0.012,
    noise_amp: float = 0.02,
    noise_fc: float = 1100.0,
    detune_hz: float = 0.0,
) -> np.ndarray:
    """Synthesize a single physical-modeled acoustic note (celesta/marimba/kalimba/piano/pizz)."""
    t = np.arange(n, dtype=np.float64) / sr
    tt = np.maximum(0.0, t - onset_s)
    active = (t >= onset_s).astype(np.float64)
    note = np.zeros(n, dtype=np.float64)

    if glide_to_hz is not None:
        freq_curve = glide_to_hz + (freq_hz - glide_to_hz) * np.exp(-tt / max(1e-4, glide_tau_s))
        phase0 = 2.0 * np.pi * np.cumsum(freq_curve * active) / sr
    else:
        phase0 = 2.0 * np.pi * freq_hz * tt

    fm_mod = 0.0
    if fm_index > 0.0:
        fm_mod = fm_index * np.exp(-tt / max(1e-4, fm_tau_s)) * np.sin(2.0 * np.pi * (freq_hz * fm_ratio) * tt)

    for idx, (amp, ratio, tau) in enumerate(partials):
        ph = phase0 * ratio if idx == 0 else (2.0 * np.pi * (freq_hz * ratio) * tt)
        if idx == 0:
            ph = ph + fm_mod
        s = np.sin(ph)
        if detune_hz > 0.0 and idx == 0:
            s = 0.65 * s + 0.35 * np.sin(ph + 2.0 * np.pi * detune_hz * tt)
        note += amp * s * np.exp(-tt / max(1e-4, tau)) * active

    if noise_amp > 0.0:
        rng = np.random.default_rng(int(round(freq_hz * 31 + onset_s * 10000)))
        wn = rng.standard_normal(n) * np.exp(-tt / 0.0038) * active
        lo = max(160.0, noise_fc * 0.6)
        hi = min(sr * 0.42, noise_fc * 1.55)
        bp = signal.butter(2, [lo, hi], btype="bandpass", fs=sr, output="sos")
        wn_f = signal.sosfilt(bp, wn)
        pk = float(np.max(np.abs(wn_f))) or 1.0
        note += noise_amp * (wn_f / pk)

    # Raised-cosine attack
    onset_n = int(round(onset_s * sr))
    atk_n = max(16, int(round((atk_ms / 1000.0) * sr)))
    end_atk = min(n, onset_n + atk_n)
    if end_atk > onset_n:
        note[onset_n:end_atk] *= 0.5 * (1.0 - np.cos(np.pi * np.arange(end_atk - onset_n) / (end_atk - onset_n)))
    return note


def _finalize_synth_wave(wave: np.ndarray, sr: int, lpf_hz: float = 4800.0, wet: float = 0.14) -> np.ndarray:
    """Apply subtle room reflections, warm Butterworth low-pass, and clean pre-attack taper."""
    out = _apply_short_room(wave, sr, wet=wet, cutoff_hz=min(4200.0, lpf_hz))
    if len(out) > 36:
        lpf = signal.butter(4, min(lpf_hz, sr * 0.45), btype="lowpass", fs=sr, output="sos")
        out = signal.sosfiltfilt(lpf, out)
    pre_clean = int(round(0.0018 * sr))
    if pre_clean > 8:
        out[:pre_clean] *= np.linspace(0.0, 1.0, pre_clean)
    return out


def _synth_choice_candidates(sr: int) -> list[dict]:
    """Generate 6 physical-modeled two-note ascending choice confirmation chimes (<=550ms)."""
    out: list[dict] = []
    pre_s = 0.0035

    # Brighter, crystal-clear VN celesta/glock/musicbox/kalimba partial templates
    celesta_p = [(0.78, 1.0, 0.115), (0.38, 2.0, 0.075), (0.20, 3.0, 0.044), (0.09, 4.02, 0.024)]
    marimba_p = [(0.82, 1.0, 0.105), (0.34, 2.0, 0.060), (0.22, 3.98, 0.025), (0.08, 6.0, 0.010)]
    musicbox_p = [(0.72, 1.0, 0.118), (0.42, 2.0, 0.082), (0.24, 2.99, 0.048), (0.11, 5.40, 0.022)]
    kalimba_p = [(0.78, 1.0, 0.110), (0.36, 2.0, 0.060), (0.20, 2.95, 0.032), (0.08, 4.5, 0.014)]
    epiano_p = [(0.80, 1.0, 0.120), (0.36, 2.0, 0.085), (0.18, 3.0, 0.048), (0.08, 4.0, 0.022)]

    specs = [
        (
            "choice_synth_celesta_fifth",
            "synth_celesta_fifth",
            "[Python 物理合成] 清亮鋼片琴＋柔木琴上行純五度確認音（C5→G5，465 ms）",
            0.470,
            523.25,
            783.99,
            0.098,
            celesta_p,
            [(0.18, 2.0, 0.055), (0.07, 4.0, 0.020)],
            1.8,
            0.42,
            0.022,
            0.65,
            6200.0,
            0.15,
        ),
        (
            "choice_synth_marimba_fourth",
            "synth_marimba_fourth",
            "[Python 物理合成] 暖木馬林巴＋清亮鐘琴上行純四度（G4→C5，455 ms）",
            0.460,
            392.00,
            523.25,
            0.100,
            marimba_p,
            [(0.24, 2.0, 0.058), (0.11, 3.0, 0.032)],
            2.0,
            0.30,
            0.030,
            0.0,
            5500.0,
            0.13,
        ),
        (
            "choice_synth_musicbox_third",
            "synth_musicbox_third",
            "[Python 物理合成] 晶透八音盒＋Felt 鋼琴大三度（C5→E5，470 ms）",
            0.480,
            523.25,
            659.25,
            0.095,
            musicbox_p,
            [(0.16, 1.0, 0.060), (0.12, 3.0, 0.030)],
            1.7,
            0.38,
            0.018,
            0.70,
            6400.0,
            0.16,
        ),
        (
            "choice_synth_kalimba_fifth",
            "synth_kalimba_fifth",
            "[Python 物理合成] 清脆拇指琴＋鐘琴泛音純五度（D5→A5，460 ms）",
            0.465,
            587.33,
            880.00,
            0.094,
            kalimba_p,
            [(0.20, 2.0, 0.052), (0.09, 4.0, 0.020)],
            1.8,
            0.36,
            0.026,
            0.40,
            6000.0,
            0.14,
        ),
        (
            "choice_synth_piano_bell",
            "synth_piano_bell",
            "[Python 物理合成] 清澈電鋼琴＋鋼片琴微亮純四度（E5→A5，475 ms）",
            0.485,
            659.25,
            880.00,
            0.102,
            epiano_p,
            [(0.22, 2.0, 0.065), (0.10, 3.0, 0.030)],
            2.0,
            0.55,
            0.020,
            0.80,
            6000.0,
            0.15,
        ),
        (
            "choice_synth_woodbell_sixth",
            "synth_woodbell_sixth",
            "[Python 物理合成] 溫潤木鈴＋清亮鐘琴大六度確認音（C5→A5，470 ms）",
            0.480,
            523.25,
            880.00,
            0.096,
            [(0.78, 1.0, 0.110), (0.34, 2.0, 0.065), (0.16, 3.02, 0.032)],
            [(0.18, 2.0, 0.060), (0.09, 3.98, 0.022)],
            1.9,
            0.32,
            0.024,
            0.45,
            5800.0,
            0.14,
        ),
    ]

    for key, pid, desc, dur_s, f1, f2, gap_s, p1, warm_layer, atk_ms, fm_idx, n_amp, det_hz, lpf_hz, wet in specs:
        n = int(round(dur_s * sr))
        w1 = _synth_mallet_note(
            n, sr, pre_s, f1, p1 + warm_layer, atk_ms=atk_ms, fm_ratio=2.0, fm_index=fm_idx,
            noise_amp=n_amp, noise_fc=f1 * 2.1, detune_hz=det_hz,
        )
        p2 = [(a * 1.18, r, t_s * 1.08) for a, r, t_s in p1] + [(a * 0.90, r, t_s) for a, r, t_s in warm_layer]
        w2 = _synth_mallet_note(
            n, sr, pre_s + gap_s, f2, p2, atk_ms=atk_ms, fm_ratio=2.0, fm_index=fm_idx * 0.9,
            noise_amp=n_amp * 0.9, noise_fc=f2 * 1.8, detune_hz=det_hz,
        )
        wave = _finalize_synth_wave(0.70 * w1 + 1.05 * w2, sr, lpf_hz=lpf_hz, wet=wet)
        out.append({
            "key": key,
            "source": "synth",
            "prompt_id": pid,
            "seed": None,
            "prompt": desc,
            "negative_prompt": "",
            "mono": wave,
        })
    return out


def _synth_fail_candidates(sr: int) -> list[dict]:
    """Generate 6 cute, warm, clearly articulated two-note descending fail 'pu-don' cues (500-750ms)."""
    out: list[dict] = []
    pre_s = 0.0035

    specs = [
        (
            "fail_synth_marimba_plop",
            "synth_marimba_plop",
            "[Python 物理合成] 暖木馬林巴＋撥弦可愛下行「噗咚」（G4→D4 微墜，640 ms）",
            0.650,
            392.00,
            293.66,
            262.0,
            0.175,
            [(0.78, 1.0, 0.075), (0.48, 2.0, 0.048), (0.22, 3.0, 0.024), (0.10, 4.0, 0.012)],
            [(0.84, 1.0, 0.122), (0.52, 2.0, 0.076), (0.26, 3.0, 0.042), (0.11, 4.0, 0.020)],
            2.2,
            0.42,
            0.045,
            0.0,
            3600.0,
            0.13,
        ),
        (
            "fail_synth_woodbass_drop",
            "synth_woodbass_drop",
            "[Python 物理合成] 圓潤木魚馬林巴雙音下行「咚咚」（F4→C4，635 ms）",
            0.645,
            349.23,
            261.63,
            238.0,
            0.180,
            [(0.76, 1.0, 0.072), (0.52, 2.0, 0.050), (0.26, 3.0, 0.026), (0.12, 3.98, 0.014)],
            [(0.82, 1.0, 0.125), (0.56, 2.0, 0.080), (0.28, 3.0, 0.044), (0.12, 3.98, 0.020)],
            2.0,
            0.35,
            0.050,
            0.0,
            3500.0,
            0.12,
        ),
        (
            "fail_synth_felt_sigh",
            "synth_felt_sigh",
            "[Python 物理合成] Felt 鋼琴＋木琴輕喜感嘆氣下行（A4→E4→Eb4，670 ms）",
            0.680,
            440.00,
            329.63,
            306.0,
            0.182,
            [(0.76, 1.0, 0.088), (0.42, 2.0, 0.056), (0.18, 3.0, 0.028)],
            [(0.84, 1.0, 0.132), (0.48, 2.0, 0.082), (0.22, 3.0, 0.042), (0.14, 0.5, 0.095)],
            2.5,
            0.45,
            0.025,
            0.55,
            3600.0,
            0.15,
        ),
        (
            "fail_synth_kalimba_blunder",
            "synth_kalimba_blunder",
            "[Python 物理合成] 溫潤拇指琴小笨拙兩音下行（G4→C#4，620 ms）",
            0.630,
            392.00,
            277.18,
            255.0,
            0.168,
            [(0.74, 1.0, 0.078), (0.46, 2.0, 0.048), (0.24, 2.95, 0.024)],
            [(0.82, 1.0, 0.118), (0.50, 2.0, 0.072), (0.26, 2.95, 0.036)],
            2.1,
            0.38,
            0.035,
            0.35,
            3800.0,
            0.14,
        ),
        (
            "fail_synth_bassoon_marimba",
            "synth_bassoon_marimba",
            "[Python 物理合成] 俏皮低音木管＋馬林巴滑稽失誤（A4→D4，645 ms）",
            0.655,
            440.00,
            293.66,
            272.0,
            0.172,
            [(0.72, 1.0, 0.080), (0.44, 2.0, 0.052), (0.34, 3.0, 0.038), (0.14, 5.0, 0.018)],
            [(0.80, 1.0, 0.125), (0.48, 2.0, 0.076), (0.36, 3.0, 0.052), (0.15, 5.0, 0.024)],
            3.0,
            0.28,
            0.025,
            0.0,
            3400.0,
            0.13,
        ),
        (
            "fail_synth_pizz_plop",
            "synth_pizz_plop",
            "[Python 物理合成] 大提琴撥弦＋暖木琴雙音噗咚（E4→A3，660 ms）",
            0.670,
            329.63,
            220.00,
            202.0,
            0.185,
            [(0.76, 1.0, 0.080), (0.50, 2.0, 0.052), (0.26, 3.0, 0.028), (0.12, 4.0, 0.014)],
            [(0.84, 1.0, 0.130), (0.56, 2.0, 0.082), (0.30, 3.0, 0.044), (0.14, 4.0, 0.022)],
            2.4,
            0.35,
            0.042,
            0.0,
            3200.0,
            0.12,
        ),
    ]

    for key, pid, desc, dur_s, f1, f2, f2_end, gap_s, p1, p2, atk_ms, fm_idx, n_amp, det_hz, lpf_hz, wet in specs:
        n = int(round(dur_s * sr))
        w1 = _synth_mallet_note(
            n, sr, pre_s, f1, p1, atk_ms=atk_ms, glide_to_hz=f1 * 0.97, glide_tau_s=0.065,
            fm_ratio=2.0, fm_index=fm_idx, noise_amp=n_amp, noise_fc=900.0, detune_hz=det_hz,
        )
        w2 = _synth_mallet_note(
            n, sr, pre_s + gap_s, f2, p2, atk_ms=atk_ms + 0.5, glide_to_hz=f2_end, glide_tau_s=0.075,
            fm_ratio=2.0, fm_index=fm_idx * 0.75, noise_amp=n_amp * 0.9, noise_fc=750.0, detune_hz=det_hz,
        )
        wave = _finalize_synth_wave(0.92 * w1 + 1.05 * w2, sr, lpf_hz=lpf_hz, wet=wet)
        out.append({
            "key": key,
            "source": "synth",
            "prompt_id": pid,
            "seed": None,
            "prompt": desc,
            "negative_prompt": "",
            "mono": wave,
        })
    return out


def _synth_shock_candidates(sr: int) -> list[dict]:
    """Generate 6 crisp, dramatic campus-mystery shock stings (500-800ms, non-horror)."""
    out: list[dict] = []
    pre_s = 0.0035

    pizz_p = [(0.65, 1.0, 0.140), (0.55, 2.0, 0.100), (0.38, 3.0, 0.068), (0.22, 4.0, 0.042), (0.12, 5.0, 0.024)]
    piano_p = [(0.68, 1.0, 0.175), (0.52, 2.0, 0.130), (0.34, 3.0, 0.088), (0.20, 4.0, 0.052), (0.10, 5.0, 0.028)]
    bell_p = [(0.72, 1.0, 0.115), (0.45, 2.0, 0.075), (0.24, 2.76, 0.042), (0.10, 4.10, 0.020)]

    def _add_chord(
        n: int,
        notes: list[tuple[float, float, float, list[tuple[float, float, float]], float]],
        atk: float = 1.6,
        fm: float = 0.75,
        n_amp: float = 0.04,
    ) -> np.ndarray:
        buf = np.zeros(n, dtype=np.float64)
        for onset, freq, amp, parts, glide in notes:
            w = _synth_mallet_note(
                n, sr, onset, freq, parts, atk_ms=atk,
                glide_to_hz=(glide if glide > 0 else None), glide_tau_s=0.032,
                fm_ratio=2.0, fm_index=fm, fm_tau_s=0.018,
                noise_amp=n_amp, noise_fc=1450.0, detune_hz=0.9,
            )
            buf += amp * w
        return buf

    # 1. shock_synth_piano_pizz: crisp flam into minor b5 piano+pizz chord + high alert bell
    n1 = int(round(0.710 * sr))
    w_s1 = _add_chord(n1, [
        (pre_s, 146.83, 0.48, pizz_p, 0.0),              # crisp pickup flam D3
        (pre_s + 0.020, 73.42, 0.55, pizz_p, 78.0),      # D2 punch
        (pre_s + 0.020, 293.66, 0.78, piano_p, 0.0),     # D4
        (pre_s + 0.022, 349.23, 0.72, piano_p, 0.0),     # F4
        (pre_s + 0.024, 415.30, 0.70, piano_p, 0.0),     # Ab4 dramatic tritone
        (pre_s + 0.026, 587.33, 0.65, bell_p, 0.0),      # D5 crisp top accent
        (pre_s + 0.030, 622.25, 0.52, bell_p, 0.0),      # Eb5 tense minor 2nd rub
    ], atk=1.5, fm=0.85, n_amp=0.045)
    out.append({
        "key": "shock_synth_piano_pizz",
        "source": "synth",
        "prompt_id": "synth_piano_pizz",
        "seed": None,
        "prompt": "[Python 物理合成] 緊湊小調鋼琴重擊＋大提琴撥弦＋清脆鐘點警示（700 ms）",
        "negative_prompt": "",
        "mono": _finalize_synth_wave(w_s1, sr, lpf_hz=5800.0, wet=0.17),
    })

    # 2. shock_synth_cello_alert: taut cello pizz + sharp 2-note digital crystal warning
    n2 = int(round(0.680 * sr))
    w_s2 = _add_chord(n2, [
        (pre_s, 65.41, 0.52, pizz_p, 70.0),              # C2
        (pre_s + 0.002, 196.00, 0.65, pizz_p, 0.0),      # G3
        (pre_s + 0.004, 311.13, 0.72, piano_p, 0.0),     # Eb4
        (pre_s + 0.006, 493.88, 0.58, piano_p, 0.0),     # B4 dramatic minor-maj7
        (pre_s + 0.008, 880.00, 0.55, bell_p, 0.0),      # A5 ping 1
        (pre_s + 0.068, 783.99, 0.62, bell_p, 0.0),      # G5 ping 2 (alert drop)
    ], atk=1.4, fm=0.75, n_amp=0.04)
    out.append({
        "key": "shock_synth_cello_alert",
        "source": "synth",
        "prompt_id": "synth_cello_alert",
        "seed": None,
        "prompt": "[Python 物理合成] 緊繃大提琴撥弦＋清脆雙音數位警報（670 ms）",
        "negative_prompt": "",
        "mono": _finalize_synth_wave(w_s2, sr, lpf_hz=6000.0, wet=0.16),
    })

    # 3. shock_synth_harp_sting: punchy bass + dramatic rapid downward shock arpeggio
    n3 = int(round(0.720 * sr))
    w_s3 = _add_chord(n3, [
        (pre_s, 73.42, 0.52, pizz_p, 78.0),              # D2 punch
        (pre_s, 146.83, 0.58, pizz_p, 0.0),              # D3
        (pre_s + 0.004, 830.61, 0.52, bell_p, 0.0),      # G#5
        (pre_s + 0.032, 659.25, 0.56, bell_p, 0.0),      # E5
        (pre_s + 0.060, 440.00, 0.65, piano_p, 0.0),     # A4
        (pre_s + 0.088, 293.66, 0.78, piano_p, 0.0),     # D4
        (pre_s + 0.088, 349.23, 0.62, piano_p, 0.0),     # F4
    ], atk=1.5, fm=0.65, n_amp=0.035)
    out.append({
        "key": "shock_synth_harp_sting",
        "source": "synth",
        "prompt_id": "synth_harp_sting",
        "seed": None,
        "prompt": "[Python 物理合成] 低音撥弦頓挫＋急促戲劇下行豎琴與鋼琴重擊（710 ms）",
        "negative_prompt": "",
        "mono": _finalize_synth_wave(w_s3, sr, lpf_hz=5800.0, wet=0.18),
    })

    # 4. shock_synth_mystery_chord: sharp detective revelation double-hit
    n4 = int(round(0.690 * sr))
    w_s4 = _add_chord(n4, [
        (pre_s, 246.94, 0.45, pizz_p, 0.0),              # B3 pickup
        (pre_s + 0.036, 82.41, 0.55, pizz_p, 87.0),      # E2 hit
        (pre_s + 0.036, 329.63, 0.76, piano_p, 0.0),     # E4
        (pre_s + 0.038, 392.00, 0.72, piano_p, 0.0),     # G4
        (pre_s + 0.040, 466.16, 0.70, piano_p, 0.0),     # Bb4 tritone
        (pre_s + 0.042, 739.99, 0.55, bell_p, 0.0),      # F#5 sharp mystery overtone
    ], atk=1.4, fm=0.90, n_amp=0.05)
    out.append({
        "key": "shock_synth_mystery_chord",
        "source": "synth",
        "prompt_id": "synth_mystery_chord",
        "seed": None,
        "prompt": "[Python 物理合成] 偵探懸疑「驚覺」雙連擊減和弦重音（680 ms）",
        "negative_prompt": "",
        "mono": _finalize_synth_wave(w_s4, sr, lpf_hz=5600.0, wet=0.16),
    })

    # 5. shock_synth_rain_sting: soft thunderous drum drop + crisp minor celesta stab
    n5 = int(round(0.700 * sr))
    drum_p = [(0.62, 1.0, 0.130), (0.35, 1.52, 0.065), (0.16, 2.15, 0.030)]
    w_s5 = _add_chord(n5, [
        (pre_s, 108.0, 0.65, drum_p, 56.0),              # timpani drop
        (pre_s + 0.006, 392.00, 0.68, piano_p, 0.0),     # G4
        (pre_s + 0.010, 466.16, 0.66, bell_p, 0.0),      # Bb4
        (pre_s + 0.014, 554.37, 0.62, bell_p, 0.0),      # C#5 diminished stab
        (pre_s + 0.018, 783.99, 0.52, bell_p, 0.0),      # G5 flash highlight
    ], atk=1.8, fm=0.70, n_amp=0.04)
    out.append({
        "key": "shock_synth_rain_sting",
        "source": "synth",
        "prompt_id": "synth_rain_sting",
        "seed": None,
        "prompt": "[Python 物理合成] 閃白雷雨低音頓挫＋減七鋼片琴突襲和弦（690 ms）",
        "negative_prompt": "",
        "mono": _finalize_synth_wave(w_s5, sr, lpf_hz=5500.0, wet=0.17),
    })

    # 6. shock_synth_cyber_hit: taut bass + piano stab + clean downward SERP drop chime
    n6 = int(round(0.670 * sr))
    t6 = np.arange(n6, dtype=np.float64) / sr
    tt6 = np.maximum(0.0, t6 - (pre_s + 0.015))
    act6 = (t6 >= (pre_s + 0.015)).astype(np.float64)
    f_drop = 440.0 + (1174.66 - 440.0) * np.exp(-tt6 / 0.068)
    ph_drop = 2.0 * np.pi * np.cumsum(f_drop * act6) / sr
    cyber_sweep = (0.36 * np.sin(ph_drop) + 0.16 * np.sin(2.0 * ph_drop)) * np.exp(-tt6 / 0.105) * act6
    atk6_n = int(round(0.002 * sr))
    p6_n = int(round((pre_s + 0.015) * sr))
    cyber_sweep[p6_n : p6_n + atk6_n] *= 0.5 * (1.0 - np.cos(np.pi * np.arange(atk6_n) / atk6_n))
    w_s6 = _add_chord(n6, [
        (pre_s, 110.00, 0.52, pizz_p, 116.0),            # A2 pizz
        (pre_s + 0.004, 220.00, 0.65, piano_p, 0.0),     # A3
        (pre_s + 0.008, 392.00, 0.65, piano_p, 0.0),     # G4
        (pre_s + 0.010, 493.88, 0.58, bell_p, 0.0),      # B4
        (pre_s + 0.012, 622.25, 0.50, bell_p, 0.0),      # Eb5
    ], atk=1.5, fm=0.75, n_amp=0.04) + cyber_sweep
    out.append({
        "key": "shock_synth_cyber_hit",
        "source": "synth",
        "prompt_id": "synth_cyber_hit",
        "seed": None,
        "prompt": "[Python 物理合成] 小調鋼琴撥弦撞擊＋數據暴跌晶鈴下行提示（660 ms）",
        "negative_prompt": "",
        "mono": _finalize_synth_wave(w_s6, sr, lpf_hz=5800.0, wet=0.15),
    })

    return out


def synthesize_backup_candidates(sfx_id: str, sr: int = TARGET_SR) -> list[dict]:
    """Generate clean physical-modeled Python-synthesized candidates for click, blip, choice, fail, and shock."""
    out: list[dict] = []
    if sfx_id == "choice":
        return _synth_choice_candidates(sr)
    if sfx_id == "fail":
        return _synth_fail_candidates(sr)
    if sfx_id == "shock":
        return _synth_shock_candidates(sr)
    if sfx_id == "click":
        specs = [
            (
                "click_synth_cedar",
                "synth_cedar",
                "[Python 物理合成] 溫潤雪松木輕敲（480 Hz + 890 Hz 雙模態阻尼＋4 kHz 低通，68 ms）",
                0.068,
                [(0.78, 480.0, 0.010), (0.36, 890.0, 0.0055), (0.14, 1420.0, 0.0028)],
                2.2,
                0.06,
                760.0,
                None,
            ),
            (
                "click_synth_woodblock",
                "synth_woodblock",
                "[Python 物理合成] 日式社辦溫潤木魚輕「篤」（540 Hz + 1080 Hz＋4 kHz 低通，64 ms）",
                0.064,
                [(0.82, 540.0, 0.0095), (0.34, 1080.0, 0.0045), (0.10, 1620.0, 0.0022)],
                1.8,
                0.04,
                880.0,
                (585.0, 535.0, 0.006),
            ),
            (
                "click_synth_keycap",
                "synth_keycap",
                "[Python 物理合成] 消光 PBT 機械鍵帽觸底輕叩（400 Hz + 940 Hz＋4 kHz 低通，62 ms）",
                0.062,
                [(0.80, 400.0, 0.0085), (0.32, 940.0, 0.0038), (0.12, 1520.0, 0.0020)],
                2.0,
                0.08,
                680.0,
                None,
            ),
            (
                "click_synth_marimba",
                "synth_marimba",
                "[Python 物理合成] 柔毛氈馬林巴短木敲（520 Hz + 1040 Hz 溫厚共鳴＋4 kHz 低通，74 ms）",
                0.074,
                [(0.84, 520.0, 0.0125), (0.28, 1040.0, 0.0055), (0.08, 1780.0, 0.0025)],
                2.5,
                0.03,
                700.0,
                None,
            ),
            (
                "click_synth_bamboo",
                "synth_bamboo",
                "[Python 物理合成] 輕盈竹節短敲（610 Hz + 1220 Hz＋4 kHz 低通，58 ms）",
                0.058,
                [(0.78, 610.0, 0.0085), (0.34, 1220.0, 0.0042), (0.12, 1890.0, 0.0020)],
                1.9,
                0.05,
                950.0,
                None,
            ),
            (
                "click_synth_paper",
                "synth_paper",
                "[Python 物理合成] 手帳紙頁柔和輕點（450 Hz 木墊＋柔帶通紙觸＋4 kHz 低通，70 ms）",
                0.070,
                [(0.72, 450.0, 0.010), (0.28, 840.0, 0.0048)],
                2.6,
                0.14,
                740.0,
                None,
            ),
            (
                "click_synth_pebble",
                "synth_pebble",
                "[Python 物理合成] 溫和低頻鵝卵石輕叩（430 Hz + 780 Hz 消光共振＋4 kHz 低通，60 ms）",
                0.060,
                [(0.84, 430.0, 0.0082), (0.26, 780.0, 0.0040)],
                2.3,
                0.04,
                620.0,
                None,
            ),
            (
                "click_synth_felt",
                "synth_felt",
                "[Python 物理合成] 極柔和毛氈木鍵輕觸（465 Hz + 835 Hz 柔化起音＋4 kHz 低通，72 ms）",
                0.072,
                [(0.82, 465.0, 0.011), (0.24, 835.0, 0.0052)],
                3.0,
                0.02,
                600.0,
                None,
            ),
        ]
        for key, pid, desc, dur_s, parts, atk_ms, n_amp, n_fc, glide in specs:
            wave = _synth_damped_wood(sr, dur_s, parts, atk_ms=atk_ms, noise_amp=n_amp, noise_fc=n_fc, pitch_glide_hz=glide)
            out.append({
                "key": key,
                "source": "synth",
                "prompt_id": pid,
                "seed": None,
                "prompt": desc,
                "negative_prompt": "",
                "mono": wave,
            })

    elif sfx_id == "blip":
        specs = [
            (
                "blip_synth_marimba640",
                "synth_marimba640",
                "[Python 物理合成] 柔和木琴點滴（640 Hz + 微量泛音，2.5 ms 柔起音＋4 kHz 低通，48 ms）",
                0.048,
                [(0.85, 640.0, 0.014), (0.16, 1280.0, 0.0055)],
                2.5,
                0.0,
                700.0,
                None,
            ),
            (
                "blip_synth_bubble_up",
                "synth_bubble_up",
                "[Python 物理合成] 溫潤水滴微上揚「嘀」（660→735 Hz 柔升餘弦＋4 kHz 低通，46 ms）",
                0.046,
                [(0.88, 660.0, 0.015), (0.12, 1340.0, 0.0050)],
                2.4,
                0.0,
                700.0,
                (660.0, 735.0, 0.012),
            ),
            (
                "blip_synth_kalimba",
                "synth_kalimba",
                "[Python 物理合成] 拇指琴溫潤短撥（700 Hz + 1400 Hz 快速阻尼＋4 kHz 低通，48 ms）",
                0.048,
                [(0.82, 700.0, 0.014), (0.20, 1400.0, 0.0045), (0.06, 2100.0, 0.0022)],
                2.2,
                0.02,
                900.0,
                None,
            ),
            (
                "blip_synth_feltpip",
                "synth_feltpip",
                "[Python 物理合成] Felt 柔音鋼琴點滴（590 Hz + 1180 Hz 溫厚低噪＋4 kHz 低通，50 ms）",
                0.050,
                [(0.86, 590.0, 0.015), (0.14, 1180.0, 0.0060)],
                2.8,
                0.01,
                650.0,
                None,
            ),
            (
                "blip_synth_wooddrop",
                "synth_wooddrop",
                "[Python 物理合成] 軟木圓潤微音點（580→555 Hz 柔和下沉＋4 kHz 低通，46 ms）",
                0.046,
                [(0.86, 580.0, 0.013), (0.14, 1140.0, 0.0048)],
                2.5,
                0.02,
                680.0,
                (585.0, 555.0, 0.010),
            ),
            (
                "blip_synth_celesta",
                "synth_celesta",
                "[Python 物理合成] 霧面柔化鋼片琴微點（740 Hz + 1480 Hz 弱泛音＋4 kHz 低通，50 ms）",
                0.050,
                [(0.82, 740.0, 0.015), (0.18, 1480.0, 0.0055)],
                2.6,
                0.0,
                750.0,
                None,
            ),
            (
                "blip_synth_woodbell",
                "synth_woodbell",
                "[Python 物理合成] 溫和木鈴點滴（780 Hz + 1560 Hz＋4 kHz 低通，44 ms）",
                0.044,
                [(0.84, 780.0, 0.012), (0.16, 1560.0, 0.0045)],
                2.2,
                0.0,
                800.0,
                None,
            ),
            (
                "blip_synth_duopip",
                "synth_duopip",
                "[Python 物理合成] 柔暖雙音微階點滴（620→695 Hz 輕階＋4 kHz 低通，52 ms）",
                0.052,
                [(0.84, 620.0, 0.016), (0.16, 1240.0, 0.0055)],
                2.5,
                0.0,
                700.0,
                (620.0, 695.0, 0.009),
            ),
        ]
        for key, pid, desc, dur_s, parts, atk_ms, n_amp, n_fc, glide in specs:
            wave = _synth_damped_wood(sr, dur_s, parts, atk_ms=atk_ms, noise_amp=n_amp, noise_fc=n_fc, pitch_glide_hz=glide)
            out.append({
                "key": key,
                "source": "synth",
                "prompt_id": pid,
                "seed": None,
                "prompt": desc,
                "negative_prompt": "",
                "mono": wave,
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
    work_mono = raw_mono
    if sfx_id in ("click", "blip") and len(work_mono) > 36:
        work_mono = signal.sosfiltfilt(LPF_4K_SOS, work_mono)

    adjust_ms = 0.0
    for attempt in range(4):
        trimmed, env_info = trim_and_envelope(work_mono, sfx_id, target_range_ms, TARGET_SR, trim_adjust_ms=adjust_ms)
        if sfx_id in ("click", "blip") and len(trimmed) > 36:
            trimmed = signal.sosfiltfilt(LPF_4K_SOS, trimmed)
        normed = normalize_audio(trimmed, tier)
        if mp3_path is None:
            metrics = measure_signal_metrics(normed, TARGET_SR, sfx_id, target_range_ms)
            metrics["fade_out_ms"] = env_info["fade_out_ms"]
            return normed, metrics

        dec, metrics = encode_mp3_and_measure(normed, mp3_path, sfx_id, target_range_ms, TARGET_SR)
        metrics["fade_out_ms"] = env_info["fade_out_ms"]
        # Ensure decoded MP3 stays strictly within target bounds
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


def render_burst_preview_mp3(single_pcm: np.ndarray, interval_ms: float, count: int, out_mp3: Path, sr: int = TARGET_SR) -> None:
    """Render a 10-hit burst MP3 (e.g. 65 ms for blip, 400 ms for click) for direct ear testing."""
    step = int(round(interval_ms * sr / 1000.0))
    total_len = step * (count - 1) + len(single_pcm) + int(round(0.15 * sr))
    buf = np.zeros(total_len, dtype=np.float64)
    for idx in range(count):
        pos = idx * step
        buf[pos : pos + len(single_pcm)] += single_pcm
    peak = float(np.max(np.abs(buf))) if buf.size else 0.0
    if peak > 0.9:
        buf *= 0.9 / peak
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_wav = Path(tmpdir) / "burst.wav"
        sf.write(str(tmp_wav), buf.astype(np.float32), sr, subtype="FLOAT")
        subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(tmp_wav), "-ac", "1", "-ar", str(sr), "-c:a", "libmp3lame", "-b:a", "128k", str(out_mp3)],
            check=True,
        )


def run_synth_local(prompts_path: Path, out_dir: Path, sfx_only: set[str] | None = None) -> None:
    """Generate all local physical-modeled SFX candidates (click, blip, choice, fail, shock) as MP3s + PNGs."""
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(prompts_path.read_text(encoding="utf-8"))
    summary_path = out_dir / "synth_local_summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8")) if (sfx_only and summary_path.exists()) else {"sounds": {}}
    for sound in cfg["sounds"]:
        sid = sound["id"]
        if sid not in ("click", "blip", "choice", "fail", "shock"):
            continue
        if sfx_only is not None and sid not in sfx_only:
            continue
        tier = sound["loudness_tier"]
        target_range = (float(sound["target_duration_ms"][0]), float(sound["target_duration_ms"][1]))
        has_burst = sid in ("click", "blip")
        interval_ms = 65.0 if sid == "blip" else 400.0
        items = []
        for sb in synthesize_backup_candidates(sid, TARGET_SR):
            mp3_path = out_dir / f"{sb['key']}.mp3"
            burst_path = (out_dir / f"{sb['key']}_burst.mp3") if has_burst else None
            png_path = out_dir / f"{sb['key']}.png"
            dec, metrics = process_single_candidate(sb["mono"], sid, tier, target_range, mp3_path=mp3_path)
            if burst_path is not None:
                render_burst_preview_mp3(dec, interval_ms, 10, burst_path, TARGET_SR)
            plot_waveform_and_spectrogram(dec, metrics, f"{sb['key']} (SYNTH)", png_path, TARGET_SR)
            items.append({
                "key": sb["key"],
                "short_label": sb["prompt_id"],
                "rel_path": None,
                "mp3_file": mp3_path.name,
                "burst_mp3": burst_path.name if burst_path is not None else None,
                "source": "synth",
                "prompt_id": sb["prompt_id"],
                "seed": None,
                "prompt": sb["prompt"],
                "negative_prompt": "",
                "metrics": metrics,
            })
            print(
                f"[synth-local] {sb['key']}: dur={metrics['duration_ms']}ms "
                f"cent={metrics['spectral_centroid_hz']}Hz >4k={metrics['band_above_4k_ratio']*100:.2f}% "
                f"lkfs={metrics['loudness_lkfs']} pre={metrics['pre_attack_silence_ms']}ms "
                f"preFade={metrics['pre_fade_level_db']}dB f0={metrics.get('f0_trend_semitones', 0):+.1f}st",
                flush=True,
            )
        summary["sounds"][sid] = items

    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[synth-local] Wrote {summary_path}", flush=True)


def run_triage(raw_dir: Path | None, prompts_path: Path, out_dir: Path, sfx_only: set[str] | None = None, export_mp3: bool = False) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(prompts_path.read_text(encoding="utf-8"))
    entries_by_sfx: dict[str, list[dict]] = {}
    if raw_dir and (raw_dir / "generation_manifest.json").exists():
        manifest = json.loads((raw_dir / "generation_manifest.json").read_text(encoding="utf-8"))
        for e in manifest["entries"]:
            entries_by_sfx.setdefault(e["sfx_id"], []).append(e)

    summary = {"sounds": {}}
    for sound in cfg["sounds"]:
        sid = sound["id"]
        if sfx_only is not None and sid not in sfx_only:
            continue
        tier = sound["loudness_tier"]
        target_range = (float(sound["target_duration_ms"][0]), float(sound["target_duration_ms"][1]))
        items = []

        for entry in entries_by_sfx.get(sid, []):
            wav_path = raw_dir / entry["rel_path"]
            data, sr = sf.read(str(wav_path), dtype="float32")
            mono = to_mono_44k(data, sr)
            mp3_out = (out_dir / "mp3" / f"{Path(entry['rel_path']).stem}.mp3") if export_mp3 else None
            if mp3_out is not None:
                mp3_out.parent.mkdir(parents=True, exist_ok=True)
            proc, metrics = process_single_candidate(mono, sid, tier, target_range, mp3_path=mp3_out)
            short_label = Path(entry["rel_path"]).stem.replace(f"{sid}_", "")
            items.append({
                "key": Path(entry["rel_path"]).stem,
                "short_label": short_label,
                "rel_path": entry["rel_path"],
                "mp3_file": mp3_out.name if mp3_out else None,
                "source": "ai",
                "prompt_id": entry["prompt_id"],
                "seed": entry["seed"],
                "prompt": entry["prompt"],
                "negative_prompt": entry["negative_prompt"],
                "mono": proc,
                "metrics": metrics,
            })

        # Add synth candidates for click/blip
        for sb in synthesize_backup_candidates(sid, TARGET_SR):
            mp3_out = (out_dir / "mp3" / f"{sb['key']}.mp3") if export_mp3 else None
            if mp3_out is not None:
                mp3_out.parent.mkdir(parents=True, exist_ok=True)
            proc, metrics = process_single_candidate(sb["mono"], sid, tier, target_range, mp3_path=mp3_out)
            items.append({
                "key": sb["key"],
                "short_label": sb["prompt_id"],
                "rel_path": None,
                "mp3_file": mp3_out.name if mp3_out else None,
                "source": "synth",
                "prompt_id": sb["prompt_id"],
                "seed": None,
                "prompt": sb["prompt"],
                "negative_prompt": "",
                "mono": proc,
                "metrics": metrics,
            })

        if not items:
            continue
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
    raw_dir: Path | None,
    prompts_path: Path,
    selection_path: Path,
    out_dir: Path,
    metrics_out: Path,
    sfx_only: set[str] | None = None,
) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(prompts_path.read_text(encoding="utf-8"))
    manifest: dict = {}
    entries_by_key: dict[str, dict] = {}
    if raw_dir and (raw_dir / "generation_manifest.json").exists():
        manifest = json.loads((raw_dir / "generation_manifest.json").read_text(encoding="utf-8"))
        entries_by_key = {Path(e["rel_path"]).stem: e for e in manifest["entries"]}
    selection = json.loads(selection_path.read_text(encoding="utf-8"))

    synth_lookup: dict[str, dict] = {}
    for sid in ("click", "blip", "choice", "fail", "shock"):
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
        if sfx_only is not None and sid not in sfx_only:
            continue
        if sid not in selection:
            continue
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
                f"cent={metrics['spectral_centroid_hz']}Hz pre={metrics['pre_attack_silence_ms']}ms clip={metrics['clipping']}",
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
    parser = argparse.ArgumentParser(description="Post-process SFX candidates.")
    parser.add_argument("--mode", choices=["synth-local", "triage", "finalize"], required=True)
    parser.add_argument("--raw-dir", type=Path, default=None)
    parser.add_argument("--prompts", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--selection", type=Path)
    parser.add_argument("--metrics-out", type=Path)
    parser.add_argument("--sfx-only", default="", help="Comma-separated sfx IDs to process")
    parser.add_argument("--export-mp3", action="store_true", help="Also export MP3s during triage for direct ear listening")
    args = parser.parse_args()

    sfx_only = {s.strip() for s in args.sfx_only.split(",") if s.strip()} if args.sfx_only else None

    if args.mode == "synth-local":
        run_synth_local(args.prompts, args.out_dir, sfx_only=sfx_only)
    elif args.mode == "triage":
        run_triage(args.raw_dir, args.prompts, args.out_dir, sfx_only=sfx_only, export_mp3=args.export_mp3)
    else:
        if not args.selection or not args.metrics_out:
            parser.error("--selection and --metrics-out are required for --mode finalize")
        run_finalize(args.raw_dir, args.prompts, args.selection, args.out_dir, args.metrics_out, sfx_only=sfx_only)


if __name__ == "__main__":
    main()
