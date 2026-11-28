"""Generate ACE-Step 1.5 (or Stable Audio Open 1.0) BGM candidates, apply seamless-loop & loudness DSP, run QA, and pack bundle."""

from __future__ import annotations

import argparse
import gc
import json
import math
import os
import re
import subprocess
import sys
import tarfile
import tempfile
import time
from pathlib import Path

ACE_REPO_DIR = Path("/content/ACE-Step-1.5")
if ACE_REPO_DIR.exists() and str(ACE_REPO_DIR) not in sys.path:
    sys.path.insert(0, str(ACE_REPO_DIR))

import librosa
import librosa.display
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
import torch
import whisper
from scipy import ndimage, signal

CONFIG_PATH = Path("/content/tracks.json")
RAW_DIR = Path("/content/bgm_v2_raw")
OUT_DIR = Path("/content/bgm_v2_out")
STATE_PATH = OUT_DIR / "state.json"
CATALOG_JSON_PATH = OUT_DIR / "raw_catalog.json"
BUNDLE_PATH = Path("/content/bgm_v2_bundle.tar.gz")
MAX_ATTEMPTS = 2

HALLUCINATION_RE = re.compile(
    r"^(?:"
    r"thank(?:s| you)(?: for watching| for listening| very much)?|"
    r"subscribe(?: to my channel)?|"
    r"subtitles? by .*|"
    r"mbc.*|"
    r"bye+|goodbye|"
    r"\[?(?:music|instrumental|applause|laughter|silence|background music)\]?|"
    r"\(?(?:music|upbeat music|soft music|piano music|instrumental)\)?|"
    r"♪+|♫+|you|the|a|"
    r"ご視聴ありがとうございました|チャンネル登録.*"
    r")[\s\.\!\?,\-♪♫]*$",
    re.IGNORECASE,
)


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def db_to_lin(db: float) -> float:
    return float(10.0 ** (db / 20.0))


def lin_to_db(lin: float, floor_db: float = -120.0) -> float:
    if lin <= 0.0:
        return floor_db
    return float(max(floor_db, 20.0 * math.log10(lin)))


def rms_db(arr: np.ndarray, floor_db: float = -100.0) -> float:
    if arr.size == 0:
        return floor_db
    val = float(np.sqrt(np.mean(np.square(arr, dtype=np.float64))))
    return lin_to_db(val, floor_db=floor_db)


def compute_true_peak_dbtp(audio: np.ndarray) -> float:
    """4x oversampled true peak across all channels (audio shape: [channels, samples])."""
    oversampled = signal.resample_poly(audio.astype(np.float64), up=4, down=1, axis=1)
    peak = float(np.max(np.abs(oversampled)))
    return lin_to_db(peak, floor_db=-120.0)


def apply_lookahead_limiter(audio: np.ndarray, sr: int, ceiling_dbtp: float = -1.5) -> np.ndarray:
    """Smooth stereo-linked lookahead peak limiter + 4x true-peak safety trim."""
    sig = audio.astype(np.float64).copy()
    ceiling = db_to_lin(ceiling_dbtp)

    oversampled = signal.resample_poly(sig, up=4, down=1, axis=1)
    os_peak = np.max(np.abs(oversampled), axis=0)
    pad = (-len(os_peak)) % 4
    if pad:
        os_peak = np.pad(os_peak, (0, pad), mode="edge")
    sample_peak = np.max(os_peak.reshape(-1, 4), axis=1)[: sig.shape[1]]
    sample_peak = np.maximum(sample_peak, np.max(np.abs(sig), axis=0))

    lookahead = max(16, int(0.005 * sr))
    peak_env = ndimage.maximum_filter1d(sample_peak, size=lookahead * 2 + 1, mode="nearest")

    release_alpha = math.exp(-1.0 / (0.060 * sr))
    smooth_env = np.empty_like(peak_env)
    prev = 0.0
    for i in range(len(peak_env)):
        v = peak_env[i]
        if v >= prev:
            prev = v
        else:
            prev = release_alpha * prev + (1.0 - release_alpha) * v
        smooth_env[i] = max(prev, v)

    target_gain = np.minimum(1.0, ceiling / np.maximum(smooth_env, 1e-12))
    attack_k = max(3, int(0.003 * sr))
    if attack_k % 2 == 0:
        attack_k += 1
    gain = ndimage.uniform_filter1d(target_gain, size=attack_k, mode="nearest")
    gain = np.minimum(gain, target_gain)

    limited = sig * gain[None, :]
    tp = compute_true_peak_dbtp(limited)
    if tp > ceiling_dbtp:
        limited *= db_to_lin(ceiling_dbtp - tp - 0.05)
    return limited


def normalize_lufs_and_limit(audio: np.ndarray, sr: int, target_lufs: float, ceiling_dbtp: float) -> np.ndarray:
    meter = pyln.Meter(sr)
    sig = audio.astype(np.float64).copy()
    for _ in range(3):
        lufs = float(meter.integrated_loudness(sig.T))
        if not np.isfinite(lufs):
            raise RuntimeError("Measured non-finite LUFS")
        gain_db = target_lufs - lufs
        sig = sig * db_to_lin(gain_db)
        sig = apply_lookahead_limiter(sig, sr, ceiling_dbtp=ceiling_dbtp)
        lufs_after = float(meter.integrated_loudness(sig.T))
        if abs(lufs_after - target_lufs) <= 0.25:
            break
    return sig


def encode_mp3(audio: np.ndarray, sr: int, mp3_path: Path, bitrate: str = "128k") -> None:
    tmp_wav = mp3_path.with_suffix(".tmp.wav")
    sf.write(str(tmp_wav), audio.T.astype(np.float32), sr, subtype="PCM_24")
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(tmp_wav),
                "-ar",
                str(sr),
                "-ac",
                "2",
                "-c:a",
                "libmp3lame",
                "-b:a",
                bitrate,
                "-write_xing",
                "1",
                str(mp3_path),
            ],
            check=True,
        )
    finally:
        if tmp_wav.exists():
            tmp_wav.unlink()


def decode_mp3(mp3_path: Path, sr: int = 44100) -> np.ndarray:
    """Decode MP3 back to float32 [2, N] PCM at sr using ffmpeg (matches real playback decoding)."""
    proc = subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(mp3_path),
            "-f",
            "f32le",
            "-acodec",
            "pcm_f32le",
            "-ac",
            "2",
            "-ar",
            str(sr),
            "-",
        ],
        capture_output=True,
        check=True,
    )
    pcm = np.frombuffer(proc.stdout, dtype=np.float32)
    if pcm.size % 2 != 0:
        pcm = pcm[: pcm.size - 1]
    return pcm.reshape(-1, 2).T.copy()


def fold_bpm_to_target(bpm: float, target_range: list[int]) -> float:
    mid = 0.5 * (target_range[0] + target_range[1])
    candidates = [bpm, bpm * 0.5, bpm * 2.0]
    return float(min(candidates, key=lambda c: abs(c - mid)))


def detect_bars_and_select_loop(
    audio: np.ndarray,
    sr: int,
    target_bpm: list[int],
    loop_min_sec: float,
    loop_max_sec: float,
    min_loop_end_sec: float = 0.0,
    max_loop_end_sec: float = 999.0,
    max_seam_500ms_jump_db: float = 1.5,
) -> dict:
    """Detect beats/bars and select optimal seamless loop [S, E] enforcing <=1.5 dB ±500ms seam continuity."""
    n_samples = audio.shape[1]
    mono = np.mean(audio, axis=0).astype(np.float32)

    hop = 512
    onset_env = librosa.onset.onset_strength(y=mono, sr=sr, hop_length=hop)
    tempo, beat_samples = librosa.beat.beat_track(
        onset_envelope=onset_env,
        sr=sr,
        hop_length=hop,
        units="samples",
        start_bpm=float(np.mean(target_bpm)),
    )
    bpm_estimated = float(np.atleast_1d(tempo)[0]) if np.size(tempo) > 0 else float(np.mean(target_bpm))
    if not np.isfinite(bpm_estimated) or bpm_estimated <= 20.0:
        bpm_estimated = float(np.mean(target_bpm))
    bpm_musical = fold_bpm_to_target(bpm_estimated, target_bpm)

    # Determine active end before trailing fade-out
    win_1s = sr
    step_025s = sr // 4
    rms_1s = []
    for pos in range(0, max(1, n_samples - win_1s + 1), step_025s):
        rms_1s.append((pos + win_1s, rms_db(mono[pos : pos + win_1s])))
    if rms_1s:
        med_rms = float(np.median([r for _, r in rms_1s]))
        active_positions = [end_pos for end_pos, r in rms_1s if r >= med_rms - 12.0]
        active_end = max(active_positions) if active_positions else n_samples - sr
    else:
        med_rms = rms_db(mono)
        active_end = n_samples - sr
    max_e_limit = min(n_samples - int(0.6 * sr), int(active_end), int(max_loop_end_sec * sr))

    # Build 4-beat bar starts (fallback to uniform beat grid)
    bar_starts = None
    if len(beat_samples) >= 16:
        best_p = 0
        best_score = -1.0
        for p in range(4):
            idxs = beat_samples[p::4] // hop
            idxs = idxs[(idxs >= 0) & (idxs < len(onset_env))]
            if len(idxs) >= 4:
                score = float(np.mean(onset_env[idxs]))
                if score > best_score:
                    best_score = score
                    best_p = p
        cand_bars = beat_samples[best_p::4]
        if len(cand_bars) >= 10:
            bar_starts = np.asarray(cand_bars, dtype=np.int64)

    if bar_starts is None:
        bar_dur_sec = 4.0 * 60.0 / max(40.0, bpm_musical)
        bar_step = int(round(bar_dur_sec * sr))
        bar_starts = np.arange(0, n_samples, bar_step, dtype=np.int64)

    bar_diffs = np.diff(bar_starts)
    valid_diffs = bar_diffs[(bar_diffs >= int(1.0 * sr)) & (bar_diffs <= int(5.0 * sr))]
    bar_samples = int(np.median(valid_diffs)) if len(valid_diffs) > 0 else int(round(2.2 * sr))
    bar_samples = max(int(1.2 * sr), min(int(4.0 * sr), bar_samples))
    xfade_samples = bar_samples

    chroma = librosa.feature.chroma_stft(y=mono, sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=mono, sr=sr, n_mfcc=13, hop_length=hop)
    frame_rms = librosa.feature.rms(y=mono, hop_length=hop)[0]

    def bar_window_features(end_sample: int):
        f1 = max(1, int(end_sample // hop))
        f0 = max(0, int((end_sample - xfade_samples) // hop))
        if f1 <= f0:
            f1 = f0 + 1
        c_vec = np.mean(chroma[:, f0:f1], axis=1)
        c_norm = c_vec / (np.linalg.norm(c_vec) + 1e-9)
        m_vec = np.mean(mfcc[1:, f0:f1], axis=1)
        m_norm = m_vec / (np.linalg.norm(m_vec) + 1e-9)
        r_db = lin_to_db(float(np.mean(frame_rms[f0:f1])))
        return c_norm, m_norm, r_db

    min_s = max(int(8.0 * sr), xfade_samples + int(2.0 * sr))
    max_s = min(int(24.0 * sr), max_e_limit - int(loop_min_sec * sr))

    s_indices = [idx for idx, s in enumerate(bar_starts) if min_s <= s <= max_s]
    e_indices = [
        idx
        for idx, e in enumerate(bar_starts)
        if max(min_s + int(loop_min_sec * sr), int(min_loop_end_sec * sr)) <= e <= max_e_limit
    ]
    if not e_indices:
        e_indices = [
            idx for idx, e in enumerate(bar_starts) if (min_s + int(loop_min_sec * sr)) <= e <= max_e_limit
        ]
    if not s_indices or not e_indices:
        s_indices = [idx for idx, s in enumerate(bar_starts) if xfade_samples + int(0.5 * sr) <= s <= int(28.0 * sr)]
        e_indices = [idx for idx, e in enumerate(bar_starts) if e <= min(n_samples - int(0.4 * sr), int(max_loop_end_sec * sr))]

    w50 = int(0.050 * sr)
    w500 = int(0.500 * sr)

    s_feats = {i: bar_window_features(int(bar_starts[i])) for i in s_indices}
    e_feats = {j: bar_window_features(int(bar_starts[j])) for j in e_indices}

    # Precompute 50ms & 500ms windows around S and E
    s_post_500 = {}
    s_pre_500 = {}
    s_post_chroma = {}
    seam_50ms_pen = {}
    for i_s in s_indices:
        sp = int(bar_starts[i_s])
        seam_50ms_pen[i_s] = abs(rms_db(mono[sp : sp + w50]) - rms_db(mono[max(0, sp - w50) : sp]))
        s_post_500[i_s] = rms_db(mono[sp : min(n_samples, sp + w500)])
        s_pre_500[i_s] = rms_db(mono[max(0, sp - w500) : sp])
        cf0 = int(sp // hop)
        cf1 = max(cf0 + 1, min(chroma.shape[1], int((sp + w500) // hop)))
        cv = np.mean(chroma[:, cf0:cf1], axis=1)
        s_post_chroma[i_s] = cv / (np.linalg.norm(cv) + 1e-9)

    e_pre_500 = {}
    e_pre_chroma = {}
    for i_e in e_indices:
        ep = int(bar_starts[i_e])
        e_pre_500[i_e] = rms_db(mono[max(0, ep - w500) : ep])
        cf1 = max(1, int(ep // hop))
        cf0 = max(0, int((ep - w500) // hop))
        if cf1 <= cf0:
            cf1 = cf0 + 1
        cv = np.mean(chroma[:, cf0:cf1], axis=1)
        e_pre_chroma[i_e] = cv / (np.linalg.norm(cv) + 1e-9)

    # Target ideal loop end around 65s for <=45MB total MP3 budget
    ideal_end_sec = 66.0 if max_loop_end_sec >= 65.0 else (min_loop_end_sec + max_loop_end_sec) * 0.5
    ideal_loop_sec = 55.0 if loop_max_sec >= 55.0 else (loop_min_sec + loop_max_sec) * 0.5

    scored_pairs = []

    for i_s in s_indices:
        s_pos = int(bar_starts[i_s])
        sc, sm, sr_db = s_feats[i_s]
        s_after_f0 = int(s_pos // hop)
        s_after_f1 = min(len(frame_rms), int((s_pos + xfade_samples) // hop) + 1)
        s_after_db = lin_to_db(float(np.mean(frame_rms[s_after_f0:s_after_f1])))
        if s_after_db < med_rms - 12.0:
            continue

        for i_e in e_indices:
            e_pos = int(bar_starts[i_e])
            loop_sec = (e_pos - s_pos) / sr
            if loop_sec < loop_min_sec or loop_sec > loop_max_sec:
                continue
            ec, em, er_db = e_feats[i_e]
            if er_db < med_rms - 12.0:
                continue

            seam_500_s_own = abs(s_post_500[i_s] - s_pre_500[i_s])
            seam_500_cross = abs(s_post_500[i_s] - e_pre_500[i_e])
            seam_500_est = max(seam_500_s_own, 0.5 * seam_500_s_own + 0.5 * seam_500_cross)

            chroma_dist = 1.0 - float(np.dot(sc, ec))
            chroma_500_dist = 1.0 - float(np.dot(s_post_chroma[i_s], e_pre_chroma[i_e]))
            mfcc_dist = 1.0 - float(np.dot(sm, em))
            rms_diff = abs(sr_db - er_db) / 5.0
            seam_level_diff = abs(s_after_db - er_db) / 5.0

            bar_span = i_e - i_s
            phrase_bonus = -0.20 if bar_span % 8 == 0 else (-0.10 if bar_span % 4 == 0 else 0.0)
            dur_penalty = abs(loop_sec - ideal_loop_sec) / 140.0 * 0.10
            end_penalty = abs((e_pos / sr) - ideal_end_sec) / 100.0 * 0.10
            start_penalty = max(0.0, ((s_pos / sr) - 18.0) / 20.0) * 0.08
            seam_500_hard_pen = 20.0 * max(0.0, seam_500_est - (max_seam_500ms_jump_db - 0.15))

            cost = (
                0.20 * seam_50ms_pen[i_s]
                + 1.8 * seam_500_est
                + seam_500_hard_pen
                + 1.8 * chroma_dist
                + 1.4 * chroma_500_dist
                + 1.0 * mfcc_dist
                + 0.45 * rms_diff
                + 0.35 * seam_level_diff
                + dur_penalty
                + end_penalty
                + start_penalty
                + phrase_bonus
            )
            scored_pairs.append((float(cost), s_pos, e_pos, bar_span))

    scored_pairs.sort(key=lambda x: x[0])
    if not scored_pairs:
        s_pos = max(xfade_samples + int(0.5 * sr), int(8.0 * sr))
        target_loop_bars = max(12, int(round(ideal_loop_sec * sr / bar_samples)))
        e_pos = min(n_samples - int(0.8 * sr), int(max_loop_end_sec * sr), s_pos + target_loop_bars * bar_samples)
        if (e_pos - s_pos) / sr < loop_min_sec:
            e_pos = min(n_samples - int(0.4 * sr), s_pos + int(loop_min_sec * sr))
        if (e_pos - s_pos) / sr > loop_max_sec:
            e_pos = s_pos + int(loop_max_sec * sr)
        scored_pairs = [(999.0, s_pos, e_pos, int(round((e_pos - s_pos) / bar_samples)))]

    best_cost, s_pos, e_pos, bar_span = scored_pairs[0]
    top_pairs = [
        {"loop_start_sample": int(sp), "loop_end_sample": int(ep), "loop_bars": int(bs), "cost": round(c, 4)}
        for c, sp, ep, bs in scored_pairs[:8]
    ]
    return {
        "loop_start_sample": int(s_pos),
        "loop_end_sample": int(e_pos),
        "xfade_samples": int(xfade_samples),
        "bar_samples": int(bar_samples),
        "loop_bars": int(bar_span),
        "bpm_estimated": round(bpm_estimated, 2),
        "bpm_musical": round(bpm_musical, 2),
        "selection_cost": round(float(best_cost), 4),
        "top_pairs": top_pairs,
    }


def apply_seamless_loop_crossfade(audio: np.ndarray, loop_info: dict) -> np.ndarray:
    """Apply equal-power 1-bar crossfade of pre-loopStart tail into loopEnd."""
    s = loop_info["loop_start_sample"]
    e = loop_info["loop_end_sample"]
    x_len = loop_info["xfade_samples"]
    assert s >= x_len and e - x_len >= s, f"Invalid loop geometry: s={s}, e={e}, x_len={x_len}"

    out = audio[:, :e].copy()
    theta = np.linspace(0.0, np.pi / 2.0, x_len, endpoint=False, dtype=np.float64)
    fade_out = np.cos(theta)
    fade_in = np.sin(theta)
    out[:, e - x_len : e] = audio[:, e - x_len : e] * fade_out + audio[:, s - x_len : s] * fade_in
    return out


def screen_vocals_whisper(whisper_model, mono_44k: np.ndarray, sr: int = 44100) -> dict:
    mono_16k = librosa.resample(mono_44k.astype(np.float32), orig_sr=sr, target_sr=16000)
    result = whisper_model.transcribe(
        mono_16k,
        fp16=torch.cuda.is_available(),
        task="transcribe",
        condition_on_previous_text=False,
        verbose=False,
    )
    segments = result.get("segments") or []
    kept_segments = []
    no_speech_probs = []
    for seg in segments:
        txt = (seg.get("text") or "").strip()
        nsp = float(seg.get("no_speech_prob", 1.0))
        alp = float(seg.get("avg_logprob", -5.0))
        no_speech_probs.append(nsp)
        if not txt or HALLUCINATION_RE.match(txt):
            continue
        if nsp < 0.45 and alp > -1.0:
            kept_segments.append(
                {
                    "start": round(float(seg.get("start", 0.0)), 2),
                    "end": round(float(seg.get("end", 0.0)), 2),
                    "text": txt,
                    "no_speech_prob": round(nsp, 3),
                    "avg_logprob": round(alp, 3),
                }
            )

    filtered_text = " ".join(s["text"] for s in kept_segments).strip()
    word_count = len([w for w in re.split(r"\s+", filtered_text) if w])
    has_vocals = len(kept_segments) >= 2 or word_count >= 8
    avg_nsp = float(np.mean(no_speech_probs)) if no_speech_probs else 1.0
    return {
        "has_vocals": bool(has_vocals),
        "speech_segment_count": len(kept_segments),
        "filtered_word_count": word_count,
        "filtered_text": filtered_text[:200],
        "whisper_avg_no_speech_prob": round(avg_nsp, 4),
    }


def evaluate_mp3_qa(
    mp3_path: Path,
    loop_info: dict,
    track_spec: dict,
    pp_cfg: dict,
    whisper_model,
) -> tuple[bool, list[str], dict, np.ndarray]:
    """Run comprehensive objective QA checks on the final decoded MP3."""
    sr = int(pp_cfg["target_sr"])
    pcm = decode_mp3(mp3_path, sr=sr)
    n_samples = pcm.shape[1]
    duration_sec = n_samples / sr
    mono = np.mean(pcm, axis=0)

    meter = pyln.Meter(sr)
    lufs = float(meter.integrated_loudness(pcm.T))
    true_peak_dbtp = compute_true_peak_dbtp(pcm)
    clipped_samples = int(np.sum(np.abs(pcm) >= 0.999))

    # Silence check (50 ms frames below threshold, excluding leading/trailing 0.1s)
    frame_len = int(0.050 * sr)
    margin = int(0.100 * sr)
    silence_thresh = float(pp_cfg["silence_threshold_db"])
    silent_flags = []
    for pos in range(margin, max(margin, n_samples - margin - frame_len + 1), frame_len):
        silent_flags.append(rms_db(mono[pos : pos + frame_len]) < silence_thresh)

    silence_ratio = float(np.mean(silent_flags)) if silent_flags else 0.0
    max_run = 0
    cur_run = 0
    long_silence_count = 0
    min_long_frames = int(round(float(pp_cfg["max_silence_sec"]) / 0.050))
    for flag in silent_flags:
        if flag:
            cur_run += 1
            if cur_run > max_run:
                max_run = cur_run
        else:
            if cur_run > min_long_frames:
                long_silence_count += 1
            cur_run = 0
    if cur_run > min_long_frames:
        long_silence_count += 1
    max_silence_sec = round(max_run * 0.050, 3)

    # Seam continuity checks: +/- 50 ms AND +/- 500 ms across wrap boundary E -> S
    s = loop_info["loop_start_sample"]
    e = min(loop_info["loop_end_sample"], n_samples)
    w50 = int(0.050 * sr)
    w500 = int(0.500 * sr)
    pre_seam_50 = rms_db(mono[max(0, e - w50) : e])
    post_seam_50 = rms_db(mono[s : min(n_samples, s + w50)])
    seam_jump_db = abs(post_seam_50 - pre_seam_50)

    pre_seam_500 = rms_db(mono[max(0, e - w500) : e])
    post_seam_500 = rms_db(mono[s : min(n_samples, s + w500)])
    seam_500ms_jump_db = abs(post_seam_500 - pre_seam_500)
    seam_500ms_signed_db = post_seam_500 - pre_seam_500

    # Chroma cosine similarity across +/- 500 ms seam
    pre_seg_500 = mono[max(0, e - w500) : e]
    post_seg_500 = mono[s : min(n_samples, s + w500)]
    if len(pre_seg_500) >= 2048 and len(post_seg_500) >= 2048:
        c_pre = np.mean(librosa.feature.chroma_stft(y=pre_seg_500, sr=sr), axis=1)
        c_post = np.mean(librosa.feature.chroma_stft(y=post_seg_500, sr=sr), axis=1)
        seam_500ms_cosine = float(np.dot(c_pre, c_post) / ((np.linalg.norm(c_pre) * np.linalg.norm(c_post)) + 1e-9))
    else:
        seam_500ms_cosine = 1.0

    # Dynamic stability: 1s LRA & max adjacent 2s jump
    win_1s = sr
    rms_1s_vals = [rms_db(mono[p : p + win_1s]) for p in range(0, max(1, n_samples - win_1s + 1), sr // 2)]
    rms_1s_arr = np.asarray(rms_1s_vals, dtype=np.float64) if rms_1s_vals else np.asarray([lufs])
    lra_approx_db = float(np.percentile(rms_1s_arr, 95) - np.percentile(rms_1s_arr, 10))
    max_1s_above_lufs_db = float(np.max(rms_1s_arr) - lufs)

    win_2s = 2 * sr
    rms_2s_vals = [rms_db(mono[p : p + win_2s]) for p in range(0, max(1, n_samples - win_2s + 1), win_2s)]
    max_2s_jump_db = float(np.max(np.abs(np.diff(rms_2s_vals)))) if len(rms_2s_vals) >= 2 else 0.0

    # 5-band spectral energy distribution
    nfft = 8192
    stft_mag2 = np.mean(np.abs(librosa.stft(mono, n_fft=nfft, hop_length=2048)) ** 2, axis=1)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=nfft)
    tot_e = max(1e-12, float(np.sum(stft_mag2[(freqs >= 20.0) & (freqs <= 16000.0)])))
    band_sub_bass = float(np.sum(stft_mag2[(freqs >= 20.0) & (freqs < 120.0)]) / tot_e)
    band_low_mid = float(np.sum(stft_mag2[(freqs >= 120.0) & (freqs < 500.0)]) / tot_e)
    band_mid = float(np.sum(stft_mag2[(freqs >= 500.0) & (freqs < 2500.0)]) / tot_e)
    band_hi_mid = float(np.sum(stft_mag2[(freqs >= 2500.0) & (freqs < 6000.0)]) / tot_e)
    band_high = float(np.sum(stft_mag2[(freqs >= 6000.0) & (freqs <= 16000.0)]) / tot_e)

    centroid_hz = float(np.mean(librosa.feature.spectral_centroid(y=mono, sr=sr)))
    harm, perc = librosa.effects.hpss(mono[: min(len(mono), 45 * sr)])
    h_energy = float(np.sum(np.square(harm)))
    p_energy = float(np.sum(np.square(perc)))
    harmonic_ratio = h_energy / max(1e-12, h_energy + p_energy)

    tempo_final, _ = librosa.beat.beat_track(y=mono, sr=sr, start_bpm=float(np.mean(track_spec["target_bpm"])))
    bpm_est = float(np.atleast_1d(tempo_final)[0]) if np.size(tempo_final) > 0 else loop_info["bpm_estimated"]
    bpm_musical = fold_bpm_to_target(bpm_est, track_spec["target_bpm"])

    vocal_info = screen_vocals_whisper(whisper_model, mono, sr=sr)

    loop_start_sec = s / sr
    loop_end_sec = e / sr
    loop_dur_sec = (e - s) / sr

    failures = []
    warnings = []

    if clipped_samples > 0:
        failures.append(f"clipping ({clipped_samples} samples)")
    if true_peak_dbtp > float(pp_cfg["max_true_peak_dbtp"]):
        failures.append(f"true_peak {true_peak_dbtp:.2f} > {pp_cfg['max_true_peak_dbtp']}")
    if abs(lufs - float(pp_cfg["target_lufs"])) > float(pp_cfg["lufs_tolerance"]):
        failures.append(f"lufs {lufs:.2f} outside {pp_cfg['target_lufs']}±{pp_cfg['lufs_tolerance']}")
    if long_silence_count > 0:
        failures.append(f"long_silence_count={long_silence_count} (max={max_silence_sec}s)")
    if silence_ratio > float(pp_cfg["max_silence_ratio"]):
        failures.append(f"silence_ratio {silence_ratio:.3f} > {pp_cfg['max_silence_ratio']}")
    if seam_500ms_jump_db > float(pp_cfg.get("max_seam_500ms_jump_db", 1.5)):
        failures.append(f"seam_500ms_jump_db {seam_500ms_jump_db:.2f} > {pp_cfg.get('max_seam_500ms_jump_db', 1.5)}")
    if seam_jump_db > float(pp_cfg.get("max_seam_50ms_jump_db", 6.0)):
        warnings.append(f"seam_50ms_jump {seam_jump_db:.2f} > {pp_cfg.get('max_seam_50ms_jump_db', 6.0)}")
    if vocal_info["has_vocals"]:
        failures.append(f"vocals detected ({vocal_info['filtered_text']})")
    if not (float(pp_cfg["loop_min_sec"]) - 0.5 <= loop_dur_sec <= float(pp_cfg["loop_max_sec"]) + 0.5):
        failures.append(f"loop_dur {loop_dur_sec:.2f}s out of [{pp_cfg['loop_min_sec']}, {pp_cfg['loop_max_sec']}]")

    # Non-blocking descriptors / warnings for listening review
    is_dialogue = track_spec.get("role", "dialogue") == "dialogue"
    max_lra = float(pp_cfg.get("dialogue_max_lra_db", 7.5) if is_dialogue else pp_cfg.get("showcase_max_lra_db", 9.5))
    max_2s = float(pp_cfg.get("dialogue_max_2s_jump_db", 4.0) if is_dialogue else pp_cfg.get("showcase_max_2s_jump_db", 5.0))
    if lra_approx_db > max_lra:
        warnings.append(f"lra {lra_approx_db:.1f} > {max_lra}")
    if max_2s_jump_db > max_2s:
        warnings.append(f"max_2s_jump {max_2s_jump_db:.1f} > {max_2s}")
    if band_sub_bass > float(pp_cfg.get("max_sub_bass_ratio", 0.48)):
        warnings.append(f"sub_bass {band_sub_bass*100:.0f}% > 48%")
    if seam_500ms_cosine < float(pp_cfg.get("min_seam_500ms_cosine", 0.72)):
        warnings.append(f"seam_500ms_cosine {seam_500ms_cosine:.2f} < 0.72")

    metrics = {
        "duration_sec": round(duration_sec, 3),
        "loop_start_sec": round(loop_start_sec, 4),
        "loop_end_sec": round(loop_end_sec, 4),
        "loop_duration_sec": round(loop_dur_sec, 4),
        "xfade_sec": round(loop_info["xfade_samples"] / sr, 4),
        "loop_bars": int(loop_info["loop_bars"]),
        "lufs": round(lufs, 2),
        "true_peak_dbtp": round(true_peak_dbtp, 2),
        "clipped_samples": clipped_samples,
        "silence_ratio": round(silence_ratio, 4),
        "max_silence_sec": max_silence_sec,
        "long_silence_count": long_silence_count,
        "seam_jump_db": round(seam_jump_db, 2),
        "seam_500ms_jump_db": round(seam_500ms_jump_db, 2),
        "seam_500ms_signed_db": round(seam_500ms_signed_db, 2),
        "seam_500ms_cosine": round(seam_500ms_cosine, 3),
        "bpm_estimated": round(bpm_est, 1),
        "bpm_musical": round(bpm_musical, 1),
        "lra_approx_db": round(lra_approx_db, 2),
        "max_2s_jump_db": round(max_2s_jump_db, 2),
        "max_1s_above_lufs_db": round(max_1s_above_lufs_db, 2),
        "spectral_centroid_hz": round(centroid_hz, 1),
        "harmonic_ratio": round(harmonic_ratio, 3),
        "band_ratios": {
            "20_120": round(band_sub_bass, 3),
            "120_500": round(band_low_mid, 3),
            "500_2500": round(band_mid, 3),
            "2500_6000": round(band_hi_mid, 3),
            "6000_16000": round(band_high, 3),
        },
        "vocal_check": vocal_info,
        "qa_passed": len(failures) == 0,
        "qa_failures": failures,
        "qa_warnings": warnings,
        "file_size_bytes": mp3_path.stat().st_size,
    }
    return (len(failures) == 0), failures, metrics, pcm


def render_plot(pcm: np.ndarray, sr: int, cid: str, seed: int, metrics: dict, png_path: Path) -> None:
    mono = np.mean(pcm, axis=0)
    duration = len(mono) / sr
    n_bins = min(2200, len(mono))
    step = max(1, len(mono) // n_bins)
    trimmed = mono[: (len(mono) // step) * step].reshape(-1, step)
    env_max = np.max(trimmed, axis=1)
    env_min = np.min(trimmed, axis=1)
    t_wave = np.linspace(0.0, duration, len(env_max))

    s_sec = metrics["loop_start_sec"]
    e_sec = metrics["loop_end_sec"]
    xf_start = max(s_sec, e_sec - metrics["xfade_sec"])

    mel = librosa.feature.melspectrogram(y=mono, sr=sr, n_fft=2048, hop_length=1024, n_mels=128, fmax=16000)
    mel_db = librosa.power_to_db(mel, ref=np.max, top_db=80.0)

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 4.6), dpi=115, sharex=True, gridspec_kw={"height_ratios": [1.0, 1.35]})
    fig.patch.set_facecolor("#11131a")

    ax1.set_facecolor("#181b24")
    ax1.fill_between(t_wave, env_min, env_max, color="#7dcfff", alpha=0.85, linewidth=0.3)
    ax1.axhline(0.0, color="#3b4261", linewidth=0.6)
    ax1.axvspan(xf_start, e_sec, color="#ff9e64", alpha=0.18, label="Crossfade (1 bar)")
    ax1.axvline(s_sec, color="#73daca", linestyle="--", linewidth=1.4, label=f"loopStart {s_sec:.2f}s")
    ax1.axvline(e_sec, color="#ff9e64", linestyle="--", linewidth=1.4, label=f"loopEnd {e_sec:.2f}s")
    ax1.set_ylim(-1.05, 1.05)
    ax1.set_ylabel("Amp", color="#c0caf5", fontsize=9)
    ax1.tick_params(colors="#a9b1d6", labelsize=8)
    ax1.legend(loc="upper right", fontsize=7.5, framealpha=0.6, facecolor="#1a1d28", edgecolor="#3b4261", labelcolor="#c0caf5")
    ax1.set_title(
        f"{cid} | seed={seed} | BPM={metrics['bpm_musical']} | LUFS={metrics['lufs']} | "
        f"Seam500ms={metrics['seam_500ms_jump_db']}dB (cos={metrics['seam_500ms_cosine']}) | LRA={metrics['lra_approx_db']}dB",
        color="#e0e6ff",
        fontsize=9.0,
        pad=8,
    )

    ax2.set_facecolor("#181b24")
    librosa.display.specshow(mel_db, sr=sr, hop_length=1024, x_axis="time", y_axis="mel", fmax=16000, cmap="magma", ax=ax2)
    ax2.axvline(s_sec, color="#73daca", linestyle="--", linewidth=1.4)
    ax2.axvline(e_sec, color="#ff9e64", linestyle="--", linewidth=1.4)
    ax2.set_xlabel("Time (s)", color="#c0caf5", fontsize=9)
    ax2.set_ylabel("Hz", color="#c0caf5", fontsize=9)
    ax2.tick_params(colors="#a9b1d6", labelsize=8)

    plt.tight_layout()
    fig.savefig(str(png_path), dpi=115, facecolor=fig.get_facecolor())
    plt.close(fig)


def compute_objective_score(track_spec: dict, metrics: dict) -> float:
    """Objective sorting aid ONLY; final selection and default MUST be verified by human/agent listening."""
    score = 100.0
    score -= abs(metrics["lufs"] - (-18.0)) * 5.0
    score -= metrics["seam_500ms_jump_db"] * 12.0
    score -= metrics["seam_jump_db"] * 4.0
    score -= max(0.0, 0.85 - metrics["seam_500ms_cosine"]) * 25.0
    score -= metrics["silence_ratio"] * 120.0
    score -= max(0.0, metrics["max_2s_jump_db"] - 3.5) * 4.0
    score -= max(0.0, metrics["lra_approx_db"] - 7.0) * 2.0
    score -= max(0.0, metrics["band_ratios"]["20_120"] - 0.40) * 40.0
    t_mid = 0.5 * (track_spec["target_bpm"][0] + track_spec["target_bpm"][1])
    score -= abs(metrics["bpm_musical"] - t_mid) * 0.3
    return round(score, 2)


def generate_acestep15_wav(
    dit_handler,
    llm_handler,
    gen_def: dict,
    track: dict,
    prompt_text: str,
    seed: int,
    raw_wav: Path,
    dit_config: str,
    thinking: bool,
) -> float:
    from acestep.inference import GenerationConfig, GenerationParams, generate_music

    steps = int(gen_def.get("inference_steps", 8))
    guidance = float(gen_def.get("guidance_scale", 7.0))
    if "sft" in dit_config or "base" in dit_config:
        steps = int(track.get("sft_steps", 40))
        guidance = float(track.get("sft_guidance", 7.0))

    params = GenerationParams(
        task_type="text2music",
        caption=prompt_text,
        lyrics=str(gen_def.get("lyrics", "[Instrumental]")),
        instrumental=bool(gen_def.get("instrumental", True)),
        vocal_language=str(gen_def.get("vocal_language", "unknown")),
        bpm=int(track["bpm"]),
        keyscale=str(track["keyscale"]),
        timesignature=str(track["timesignature"]),
        duration=float(track.get("duration", gen_def.get("duration", 82.0))),
        inference_steps=steps,
        guidance_scale=guidance,
        shift=float(gen_def.get("shift", 3.0)),
        infer_method=str(gen_def.get("infer_method", "ode")),
        seed=int(seed),
        thinking=bool(thinking),
        use_cot_metas=bool(gen_def.get("use_cot_metas", False)),
        use_cot_caption=bool(gen_def.get("use_cot_caption", False)),
        use_cot_language=bool(gen_def.get("use_cot_language", False)),
        use_cot_lyrics=bool(gen_def.get("use_cot_lyrics", False)),
        lm_temperature=float(gen_def.get("lm_temperature", 0.85)),
        lm_cfg_scale=float(gen_def.get("lm_cfg_scale", 2.2)),
        lm_top_p=float(gen_def.get("lm_top_p", 0.9)),
        lm_negative_prompt=str(track.get("negative_prompt", "NO USER INPUT")),
    )
    config = GenerationConfig(
        batch_size=1,
        allow_lm_batch=False,
        use_random_seed=False,
        seeds=[int(seed)],
        audio_format="wav",
    )

    t0 = time.time()
    with tempfile.TemporaryDirectory() as tmpdir:
        res = generate_music(dit_handler, llm_handler, params, config, save_dir=tmpdir)
        if not res.success or not res.audios:
            raise RuntimeError(f"ACE-Step 1.5 generation failed: {res.error} | {res.status_message}")
        aud = res.audios[0]
        if aud.get("tensor") is not None:
            ten = aud["tensor"].detach().cpu().float().numpy()
            if ten.ndim == 2 and ten.shape[0] <= 4 and ten.shape[1] > ten.shape[0]:
                ten = ten.T
            sf.write(str(raw_wav), ten, int(aud.get("sample_rate", 48000)), subtype="PCM_24")
        elif aud.get("path") and Path(aud["path"]).exists():
            data, r_sr = sf.read(aud["path"], always_2d=True, dtype="float32")
            sf.write(str(raw_wav), data, r_sr, subtype="PCM_24")
        else:
            raise RuntimeError("No audio tensor or path returned by generate_music")
    return round(time.time() - t0, 2)


def generate_stable_audio_wav(
    sa_pipe,
    track: dict,
    prompt_text: str,
    seed: int,
    raw_wav: Path,
    duration_sec: float = 46.0,
) -> float:
    t0 = time.time()
    gen = torch.Generator(device="cuda").manual_seed(int(seed))
    neg = track.get(
        "negative_prompt",
        "vocals, singing, electric guitar, distortion, heavy drums, rock, EDM, static hiss, harsh",
    )
    with torch.inference_mode():
        out = sa_pipe(
            prompt=prompt_text,
            negative_prompt=neg,
            num_inference_steps=100,
            audio_start_in_s=0.0,
            audio_end_in_s=float(duration_sec),
            num_waveforms_per_prompt=1,
            guidance_scale=7.0,
            generator=gen,
        )
    arr = out.audios[0].detach().float().cpu().numpy()
    if arr.ndim == 2 and arr.shape[0] <= 4 and arr.shape[1] > arr.shape[0]:
        arr = arr.T
    arr = np.nan_to_num(arr, nan=0.0, posinf=0.0, neginf=0.0)
    pk = float(np.max(np.abs(arr))) if arr.size else 0.0
    if pk > 0.99:
        arr = arr / pk * 0.98
    sr = int(getattr(sa_pipe.vae, "sampling_rate", 44100))
    sf.write(str(raw_wav), arr, sr, subtype="PCM_24")
    return round(time.time() - t0, 2)


def postprocess_wav_to_mp3(
    raw_wav: Path,
    mp3_path: Path,
    seam_path: Path,
    png_path: Path,
    track: dict,
    pp_cfg: dict,
    whisper_model,
    cid: str,
    seed: int,
    override_loop_cfg: dict | None = None,
) -> tuple[bool, list[str], dict]:
    eff_pp = dict(pp_cfg)
    if override_loop_cfg:
        eff_pp.update(override_loop_cfg)
    sr = int(eff_pp["target_sr"])

    raw_data, raw_sr = sf.read(str(raw_wav), always_2d=True, dtype="float64")
    x = raw_data.T
    if x.shape[0] == 1:
        x = np.repeat(x, 2, axis=0)
    elif x.shape[0] > 2:
        x = x[:2, :]

    x = x - np.mean(x, axis=1, keepdims=True)
    sos = signal.butter(2, 20.0, btype="highpass", fs=raw_sr, output="sos")
    x = signal.sosfiltfilt(sos, x, axis=1)

    if raw_sr != sr:
        x = np.vstack([librosa.resample(x[ch], orig_sr=raw_sr, target_sr=sr, res_type="soxr_hq") for ch in range(2)])

    # Trim excessive leading silence (>0.15s below -50 dBFS), keep 30ms pre-roll + 15ms micro fade-in
    mono_tmp = np.mean(x, axis=0)
    win_10ms = int(0.010 * sr)
    thresh_lin = db_to_lin(-50.0)
    first_active = 0
    for idx_s in range(0, min(len(mono_tmp), int(8.0 * sr)), win_10ms):
        if np.sqrt(np.mean(mono_tmp[idx_s : idx_s + win_10ms] ** 2)) >= thresh_lin:
            first_active = idx_s
            break
    if first_active > int(0.15 * sr):
        trim_start = max(0, first_active - int(0.030 * sr))
        x = x[:, trim_start:]
    fade_in_n = min(int(0.015 * sr), x.shape[1])
    x[:, :fade_in_n] *= np.linspace(0.0, 1.0, fade_in_n)[None, :]

    loop_info = detect_bars_and_select_loop(
        x,
        sr=sr,
        target_bpm=track["target_bpm"],
        loop_min_sec=float(eff_pp["loop_min_sec"]),
        loop_max_sec=float(eff_pp["loop_max_sec"]),
        min_loop_end_sec=float(eff_pp.get("min_loop_end_sec", 0.0)),
        max_loop_end_sec=float(eff_pp.get("max_loop_end_sec", 999.0)),
        max_seam_500ms_jump_db=float(eff_pp.get("max_seam_500ms_jump_db", 1.5)),
    )
    # Test top_pairs with actual crossfade PCM so the 500ms seam threshold is guaranteed before MP3 encoding
    w500 = int(0.500 * sr)
    best_looped = None
    best_pair_info = None
    best_500_diff = float("inf")
    for cand_pair in loop_info.get("top_pairs", [loop_info]):
        trial_info = dict(loop_info)
        trial_info["loop_start_sample"] = cand_pair["loop_start_sample"]
        trial_info["loop_end_sample"] = cand_pair["loop_end_sample"]
        trial_info["loop_bars"] = cand_pair["loop_bars"]
        trial_pcm = apply_seamless_loop_crossfade(x, trial_info)
        mono_trial = np.mean(trial_pcm, axis=0)
        s_t = trial_info["loop_start_sample"]
        e_t = trial_info["loop_end_sample"]
        diff_500 = abs(rms_db(mono_trial[s_t : min(len(mono_trial), s_t + w500)]) - rms_db(mono_trial[max(0, e_t - w500) : e_t]))
        if diff_500 < best_500_diff:
            best_500_diff = diff_500
            best_looped = trial_pcm
            best_pair_info = trial_info
        if diff_500 <= 1.35:
            best_looped = trial_pcm
            best_pair_info = trial_info
            break
    loop_info = best_pair_info
    looped = best_looped

    normed = normalize_lufs_and_limit(
        looped,
        sr=sr,
        target_lufs=float(eff_pp["target_lufs"]),
        ceiling_dbtp=float(eff_pp["pre_mp3_ceiling_dbtp"]),
    )

    encode_mp3(normed, sr, mp3_path, bitrate=eff_pp["mp3_bitrate"])
    decoded_tmp = decode_mp3(mp3_path, sr=sr)
    mp3_tp = compute_true_peak_dbtp(decoded_tmp)
    if mp3_tp > float(eff_pp["max_true_peak_dbtp"]) - 0.05:
        adjust_db = float(eff_pp["max_true_peak_dbtp"]) - 0.25 - mp3_tp
        normed = normed * db_to_lin(adjust_db)
        encode_mp3(normed, sr, mp3_path, bitrate=eff_pp["mp3_bitrate"])

    half_n = int(float(eff_pp["seam_preview_half_sec"]) * sr)
    s_idx = loop_info["loop_start_sample"]
    e_idx = min(loop_info["loop_end_sample"], normed.shape[1])
    pre_seg = normed[:, max(0, e_idx - half_n) : e_idx]
    post_seg = normed[:, s_idx : min(normed.shape[1], s_idx + half_n)]
    seam_pcm = np.concatenate([pre_seg, post_seg], axis=1)
    micro_n = min(int(0.020 * sr), seam_pcm.shape[1] // 4)
    if micro_n > 0:
        seam_pcm[:, :micro_n] *= np.linspace(0.0, 1.0, micro_n)[None, :]
        seam_pcm[:, -micro_n:] *= np.linspace(1.0, 0.0, micro_n)[None, :]
    encode_mp3(seam_pcm, sr, seam_path, bitrate=eff_pp["mp3_bitrate"])

    passed, failures, metrics, final_pcm = evaluate_mp3_qa(mp3_path, loop_info, track, eff_pp, whisper_model)
    if passed:
        render_plot(final_pcm, sr, cid, seed, metrics, png_path)
        metrics["objective_score"] = compute_objective_score(track, metrics)
    return passed, failures, metrics


def main():
    parser = argparse.ArgumentParser(description="Generate BGM candidates on Colab VM.")
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument("--bundle", type=Path, default=BUNDLE_PATH)
    parser.add_argument("--tracks", default="", help="Comma-separated track IDs (default: all)")
    parser.add_argument("--per-track", type=int, default=8, help="Raw candidates per track")
    parser.add_argument("--engine", choices=["acestep15", "stable-audio"], default="acestep15")
    parser.add_argument("--dit-config", default="", help="Override ACE-Step 1.5 DiT config (e.g. acestep-v15-turbo or acestep-v15-sft)")
    parser.add_argument("--no-thinking", action="store_true", help="Disable 5Hz LM planner")
    parser.add_argument("--tag", default="r1", help="Batch tag prefix for raw candidate filenames")
    args = parser.parse_args()

    cfg = json.loads(args.config.read_text(encoding="utf-8"))
    gen_def = cfg["generation_defaults"]
    pp_cfg = cfg["postprocess_defaults"]

    out_dir = args.out_dir
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    state_path = out_dir / "state.json"
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {}

    track_filter = {t.strip() for t in args.tracks.split(",") if t.strip()} if args.tracks else None

    props = torch.cuda.get_device_properties(0)
    gpu_name = props.name
    vram_gb = round(props.total_memory / (1024 ** 3), 2)
    log(f"GPU: {gpu_name} ({vram_gb} GiB) | engine={args.engine}")

    dit_handler = None
    llm_handler = None
    sa_pipe = None
    dit_config = args.dit_config or gen_def.get("dit_config", "acestep-v15-turbo")
    thinking = (not args.no_thinking) and bool(gen_def.get("thinking", True))

    if args.engine == "acestep15":
        from acestep.handler import AceStepHandler
        from acestep.llm_inference import LLMHandler
        from acestep.model_downloader import (
            check_main_model_exists,
            check_model_exists,
            download_main_model,
            download_submodel,
        )

        ckpt_dir = ACE_REPO_DIR / "checkpoints"
        ckpt_dir.mkdir(parents=True, exist_ok=True)
        if not check_main_model_exists(ckpt_dir):
            log("Downloading ACE-Step 1.5 main model components (MIT, public HF)...")
            ok_dl, msg_dl = download_main_model(checkpoints_dir=ckpt_dir, prefer_source="huggingface")
            if not ok_dl:
                raise RuntimeError(f"Main model download failed: {msg_dl}")
        if dit_config != "acestep-v15-turbo" and not check_model_exists(dit_config, ckpt_dir):
            log(f"Downloading ACE-Step 1.5 submodel {dit_config}...")
            ok_dl, msg_dl = download_submodel(dit_config, checkpoints_dir=ckpt_dir, prefer_source="huggingface")
            if not ok_dl:
                raise RuntimeError(f"Submodel download failed: {msg_dl}")

        log(f"Initializing AceStepHandler ({dit_config})...")
        dit_handler = AceStepHandler()
        msg, ok = dit_handler.initialize_service(
            project_root=str(ACE_REPO_DIR),
            config_path=dit_config,
            device="cuda",
            offload_to_cpu=False,
            offload_dit_to_cpu=False,
        )
        if not ok:
            raise RuntimeError(f"AceStepHandler init failed: {msg}")

        if thinking:
            lm_model = gen_def.get("lm_model", "acestep-5Hz-lm-1.7B")
            log(f"Initializing LLMHandler ({lm_model}, backend=pt)...")
            llm_handler = LLMHandler()
            lm_msg, lm_ok = llm_handler.initialize(
                checkpoint_dir=str(ckpt_dir),
                lm_model_path=lm_model,
                backend=gen_def.get("lm_backend", "pt"),
                device="cuda",
                offload_to_cpu=False,
            )
            if not lm_ok:
                raise RuntimeError(f"LLMHandler init failed: {lm_msg}")
    else:
        from diffusers import StableAudioPipeline
        from huggingface_hub import snapshot_download

        token_file = Path("/content/.hf_token")
        model_cache_txt = Path("/content/sa_model_path.txt")
        if model_cache_txt.exists() and Path(model_cache_txt.read_text().strip()).exists():
            sa_dir = Path(model_cache_txt.read_text().strip())
        else:
            if not token_file.exists():
                raise FileNotFoundError("Missing /content/.hf_token for Stable Audio Open 1.0")
            tok = token_file.read_text(encoding="utf-8").strip()
            sa_dir = Path(snapshot_download(repo_id="stabilityai/stable-audio-open-1.0", token=tok))
            model_cache_txt.write_text(str(sa_dir), encoding="utf-8")
            del tok
        for tp in (token_file, Path.home() / ".cache/huggingface/token", Path.home() / ".huggingface/token"):
            if tp.exists() or tp.is_symlink():
                tp.unlink()
        log("Stable Audio token deleted & verified; loading StableAudioPipeline (float16)...")
        sa_pipe = StableAudioPipeline.from_pretrained(str(sa_dir), torch_dtype=torch.float16, local_files_only=True).to("cuda")
        sa_pipe.set_progress_bar_config(disable=True)

    log("Loading Whisper base model for vocal-leakage screening...")
    whisper_model = whisper.load_model("base", device="cuda" if torch.cuda.is_available() else "cpu")

    override_loop = None
    if args.engine == "stable-audio":
        override_loop = {
            "loop_min_sec": 26.0,
            "loop_max_sec": 38.0,
            "min_loop_end_sec": 32.0,
            "max_loop_end_sec": 44.0,
        }

    catalog_tracks = []
    rejected_attempts = []
    total_passed = 0

    for track in cfg["tracks"]:
        tid = track["id"]
        if track_filter is not None and tid not in track_filter:
            continue

        prompts_list = track["prompts"]
        base_seeds = list(track["seeds"])[: args.per_track]
        backups = list(track.get("backup_seeds", []))
        backup_iter = iter(backups + [backups[0] + 7919 * k for k in range(1, 30)] if backups else [])

        track_cands = []
        for idx, init_seed in enumerate(base_seeds, start=1):
            cid = f"{tid}_{args.tag}_n{idx:02d}"
            mp3_path = out_dir / f"{cid}.mp3"
            seam_path = out_dir / f"{cid}_seam.mp3"
            png_path = out_dir / f"{cid}.png"

            if cid in state and mp3_path.exists() and seam_path.exists() and png_path.exists():
                log(f"Skipping already completed {cid}")
                track_cands.append(state[cid])
                total_passed += 1
                continue

            prompt_text = prompts_list[(idx - 1) % len(prompts_list)]
            chosen = None

            for attempt in range(1, MAX_ATTEMPTS + 1):
                seed = init_seed if attempt == 1 else next(backup_iter, None)
                if seed is None:
                    break
                raw_wav = RAW_DIR / f"{cid}_s{seed}.wav"
                log(f"Generating {cid} (attempt {attempt}, seed={seed}, p={(idx-1)%len(prompts_list)+1})...")
                if args.engine == "acestep15":
                    gen_sec = generate_acestep15_wav(
                        dit_handler, llm_handler, gen_def, track, prompt_text, int(seed), raw_wav, dit_config, thinking
                    )
                else:
                    gen_sec = generate_stable_audio_wav(sa_pipe, track, prompt_text, int(seed), raw_wav, duration_sec=46.0)

                passed, failures, metrics = postprocess_wav_to_mp3(
                    raw_wav, mp3_path, seam_path, png_path, track, pp_cfg, whisper_model, cid, int(seed), override_loop
                )

                if passed:
                    chosen = {
                        "id": cid,
                        "track_id": tid,
                        "filename": mp3_path.name,
                        "seam_filename": seam_path.name,
                        "plot_filename": png_path.name,
                        "engine": args.engine,
                        "dit_config": dit_config if args.engine == "acestep15" else "stable-audio-open-1.0",
                        "thinking": thinking if args.engine == "acestep15" else None,
                        "seed": int(seed),
                        "prompt": prompt_text,
                        "negative_prompt": track.get("negative_prompt", ""),
                        "generation_sec": gen_sec,
                        "metrics": metrics,
                    }
                    log(
                        f"PASS {cid} (seed={seed}): dur={metrics['duration_sec']}s "
                        f"seam500={metrics['seam_500ms_jump_db']}dB cos={metrics['seam_500ms_cosine']} "
                        f"LRA={metrics['lra_approx_db']}dB sub={metrics['band_ratios']['20_120']} "
                        f"BPM={metrics['bpm_musical']} warn={metrics['qa_warnings']}"
                    )
                    break
                else:
                    log(f"REJECT {cid} (seed={seed}): {failures}")
                    rejected_attempts.append({"id": cid, "track_id": tid, "seed": int(seed), "failures": failures, "metrics": metrics})
                    for p in (mp3_path, seam_path, png_path):
                        if p.exists():
                            p.unlink()

                gc.collect()
                torch.cuda.empty_cache()

            if chosen is not None:
                state[cid] = chosen
                state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
                track_cands.append(chosen)
                total_passed += 1

        catalog_tracks.append({
            "id": tid,
            "role": track.get("role", "dialogue"),
            "title_zh": track["title_zh"],
            "usage_zh": track["usage_zh"],
            "style_zh": track["style_zh"],
            "target_bpm": track["target_bpm"],
            "candidates": sorted(track_cands, key=lambda c: c["metrics"]["objective_score"], reverse=True),
        })

    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "project": cfg["project"],
        "model": cfg["model"],
        "engine": args.engine,
        "dit_config": dit_config if args.engine == "acestep15" else "stable-audio-open-1.0",
        "thinking": thinking if args.engine == "acestep15" else None,
        "environment": {"gpu_name": gpu_name, "vram_gib": vram_gb},
        "generation_defaults": gen_def,
        "postprocess_defaults": pp_cfg,
        "total_passing_candidates": total_passed,
        "rejected_attempts": rejected_attempts,
        "tracks": catalog_tracks,
    }
    catalog_path = out_dir / "raw_catalog.json"
    catalog_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    log(f"Packing bundle to {args.bundle}...")
    with tarfile.open(args.bundle, "w:gz") as tar:
        for item in sorted(out_dir.iterdir()):
            if item.name == "state.json" or item.name.endswith(".tmp.wav"):
                continue
            tar.add(item, arcname=item.name)

    log(f"DONE: {total_passed} passing candidates, bundle={args.bundle.stat().st_size / (1024*1024):.2f} MiB")


if __name__ == "__main__":
    main()
