"""Generate ACE-Step BGM candidates, apply seamless-loop & loudness DSP, run QA, and pack bundle."""

import gc
import json
import math
import os
import re
import subprocess
import sys
import tarfile
import time
import types
from pathlib import Path

# 在 Colab 上 editable install 不一定被 kernel 認得，直接把 repo 加進 sys.path
if "/content/ACE-Step" not in sys.path:
    sys.path.insert(0, "/content/ACE-Step")

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

from acestep.pipeline_ace_step import ACEStepPipeline


CONFIG_PATH = Path("/content/tracks.json")
RAW_DIR = Path("/content/bgm_raw")
OUT_DIR = Path("/content/bgm_out")
STATE_PATH = OUT_DIR / "state.json"
CANDIDATES_JSON_PATH = OUT_DIR / "candidates.json"
BUNDLE_PATH = Path("/content/bgm_bundle.tar.gz")
CHECKPOINT_DIR = "/content/acestep_checkpoints"
MAX_ATTEMPTS = 6

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


def safe_save_wav_file(self, target_wav, idx, save_path=None, sample_rate=48000, format="wav"):
    """Replacement for ACEStepPipeline.save_wav_file using soundfile directly (avoids torchaudio>=2.9 issues)."""
    if save_path is None:
        os.makedirs("./outputs", exist_ok=True)
        output_path_wav = f"./outputs/output_{time.strftime('%Y%m%d%H%M%S')}_{idx}.wav"
    elif os.path.isdir(save_path):
        os.makedirs(save_path, exist_ok=True)
        output_path_wav = os.path.join(save_path, f"output_{time.strftime('%Y%m%d%H%M%S')}_{idx}.wav")
    else:
        parent = os.path.dirname(save_path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        output_path_wav = save_path

    wav_np = target_wav.detach().cpu().float().numpy()
    if wav_np.ndim == 3 and wav_np.shape[0] == 1:
        wav_np = wav_np[0]
    if wav_np.ndim == 2 and wav_np.shape[0] <= 8 and wav_np.shape[1] > wav_np.shape[0]:
        wav_np = wav_np.T
    sf.write(output_path_wav, wav_np, sample_rate, subtype="PCM_24")
    return output_path_wav


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

    # First consider 4x oversampled envelope mapped back to sample grid
    oversampled = signal.resample_poly(sig, up=4, down=1, axis=1)
    os_peak = np.max(np.abs(oversampled), axis=0)
    pad = (-len(os_peak)) % 4
    if pad:
        os_peak = np.pad(os_peak, (0, pad), mode="edge")
    sample_peak = np.max(os_peak.reshape(-1, 4), axis=1)[: sig.shape[1]]
    sample_peak = np.maximum(sample_peak, np.max(np.abs(sig), axis=0))

    lookahead = max(16, int(0.005 * sr))
    peak_env = ndimage.maximum_filter1d(sample_peak, size=lookahead * 2 + 1, mode="nearest")

    # Smooth release envelope (~60 ms)
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

    # Smooth attack (~3 ms) on gain reduction
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


def encode_mp3(audio: np.ndarray, sr: int, mp3_path: Path, bitrate: str = "160k") -> None:
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
) -> dict:
    """Detect beats/bars, pick optimal seamless loop [S, E], and return metadata."""
    n_samples = audio.shape[1]
    mono = np.mean(audio, axis=0).astype(np.float32)

    # Frame-level features for bar downbeat and loop similarity
    hop = 512
    onset_env = librosa.onset.onset_strength(y=mono, sr=sr, hop_length=hop)
    tempo, beat_samples = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, hop_length=hop, units="samples",
        start_bpm=float(np.mean(target_bpm)),  # 以提示詞的目標速度當先驗，降低 2:3 倍頻誤判
    )
    bpm_estimated = float(np.atleast_1d(tempo)[0]) if np.size(tempo) > 0 else float(np.mean(target_bpm))
    if not np.isfinite(bpm_estimated) or bpm_estimated <= 20.0:
        bpm_estimated = float(np.mean(target_bpm))
    bpm_musical = fold_bpm_to_target(bpm_estimated, target_bpm)

    # Determine active end before any trailing fade-out
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
    max_e_limit = min(n_samples - int(0.8 * sr), int(active_end))

    # Build 4-beat bar starts (fallback to uniform beat grid if tracker finds too few beats)
    bar_starts = None
    if len(beat_samples) >= 20:
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
        if len(cand_bars) >= 12:
            bar_starts = np.asarray(cand_bars, dtype=np.int64)

    if bar_starts is None:
        bar_dur_sec = 4.0 * 60.0 / max(40.0, bpm_musical)
        bar_step = int(round(bar_dur_sec * sr))
        bar_starts = np.arange(0, n_samples, bar_step, dtype=np.int64)

    bar_diffs = np.diff(bar_starts)
    valid_diffs = bar_diffs[(bar_diffs >= int(1.0 * sr)) & (bar_diffs <= int(5.0 * sr))]
    bar_samples = int(np.median(valid_diffs)) if len(valid_diffs) > 0 else int(round(2.4 * sr))
    bar_samples = max(int(1.4 * sr), min(int(4.0 * sr), bar_samples))
    xfade_samples = bar_samples

    # Precompute chroma + MFCC + RMS frames
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

    min_s = max(int(4.0 * sr), xfade_samples + int(0.5 * sr))
    max_s = min(int(28.0 * sr), max_e_limit - int(loop_min_sec * sr))

    s_indices = [
        idx for idx, s in enumerate(bar_starts) if min_s <= s <= max_s
    ]
    e_indices = [
        idx for idx, e in enumerate(bar_starts)
        if max(min_s + int(loop_min_sec * sr), int(min_loop_end_sec * sr)) <= e <= max_e_limit
    ]
    if not e_indices:  # 有效區間不足 min_loop_end_sec 時退回較寬鬆的下限
        e_indices = [
            idx for idx, e in enumerate(bar_starts) if (min_s + int(loop_min_sec * sr)) <= e <= max_e_limit
        ]

    # Relax bounds gracefully if a track had short active region
    if not s_indices or not e_indices:
        s_indices = [idx for idx, s in enumerate(bar_starts) if s >= xfade_samples + int(0.25 * sr) and s <= int(35.0 * sr)]
        e_indices = [idx for idx, e in enumerate(bar_starts) if e <= n_samples - int(0.5 * sr)]

    best_pair = None
    best_cost = float("inf")
    s_feats = {i: bar_window_features(int(bar_starts[i])) for i in s_indices}
    e_feats = {j: bar_window_features(int(bar_starts[j])) for j in e_indices}

    # 實際接縫為 audio[S-50ms:S] -> audio[S:S+50ms]（crossfade 尾端等於 S 前的原音），
    # 先量測各候選 S 的 50ms 能量跳動，選點時避開落在強烈瞬態上的 S。
    w50 = int(0.050 * sr)
    seam_jump_pen = {}
    for i_s in s_indices:
        sp = int(bar_starts[i_s])
        seam_jump_pen[i_s] = abs(rms_db(mono[sp : sp + w50]) - rms_db(mono[max(0, sp - w50) : sp]))

    for i_s in s_indices:
        s_pos = int(bar_starts[i_s])
        sc, sm, sr_db = s_feats[i_s]
        # Energy right after loopStart S
        s_after_f0 = int(s_pos // hop)
        s_after_f1 = min(len(frame_rms), int((s_pos + xfade_samples) // hop) + 1)
        s_after_db = lin_to_db(float(np.mean(frame_rms[s_after_f0:s_after_f1])))
        if s_after_db < med_rms - 10.0:
            continue

        for i_e in e_indices:
            e_pos = int(bar_starts[i_e])
            loop_sec = (e_pos - s_pos) / sr
            if loop_sec < loop_min_sec or loop_sec > loop_max_sec:
                continue
            ec, em, er_db = e_feats[i_e]
            if er_db < med_rms - 10.0:
                continue

            chroma_dist = 1.0 - float(np.dot(sc, ec))
            mfcc_dist = 1.0 - float(np.dot(sm, em))
            rms_diff = abs(sr_db - er_db) / 6.0
            seam_level_diff = abs(s_after_db - er_db) / 6.0

            bar_span = i_e - i_s
            phrase_bonus = 0.0
            if bar_span % 8 == 0:
                phrase_bonus = -0.18
            elif bar_span % 4 == 0:
                phrase_bonus = -0.10

            # Gentle preference for 75-105s loop and early-ish loopStart (8-22s)
            dur_penalty = abs(loop_sec - 95.0) / 180.0 * 0.12
            start_sec = s_pos / sr
            start_penalty = max(0.0, (start_sec - 22.0) / 20.0) * 0.08

            cost = (
                0.5 * seam_jump_pen[i_s]
                + 1.8 * chroma_dist
                + 1.0 * mfcc_dist
                + 0.45 * rms_diff
                + 0.35 * seam_level_diff
                + dur_penalty
                + start_penalty
                + phrase_bonus
            )
            if cost < best_cost:
                best_cost = cost
                best_pair = (s_pos, e_pos, bar_span)

    if best_pair is None:
        # Fallback deterministic grid alignment
        s_pos = max(xfade_samples + int(0.5 * sr), int(12.0 * sr))
        target_loop_bars = max(16, int(round(90.0 * sr / bar_samples)))
        e_pos = min(n_samples - int(1.0 * sr), s_pos + target_loop_bars * bar_samples)
        if (e_pos - s_pos) / sr < loop_min_sec:
            e_pos = min(n_samples - int(0.5 * sr), s_pos + int(loop_min_sec * sr))
        if (e_pos - s_pos) / sr > loop_max_sec:
            e_pos = s_pos + int(loop_max_sec * sr)
        best_pair = (s_pos, e_pos, int(round((e_pos - s_pos) / bar_samples)))
        best_cost = 999.0

    s_pos, e_pos, bar_span = best_pair
    return {
        "loop_start_sample": int(s_pos),
        "loop_end_sample": int(e_pos),
        "xfade_samples": int(xfade_samples),
        "bar_samples": int(bar_samples),
        "loop_bars": int(bar_span),
        "bpm_estimated": round(bpm_estimated, 2),
        "bpm_musical": round(bpm_musical, 2),
        "selection_cost": round(float(best_cost), 4),
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
    """Run all objective QA checks on the final decoded MP3."""
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

    # Seam continuity check (+/- 50 ms across wrap boundary E -> S)
    s = loop_info["loop_start_sample"]
    e = min(loop_info["loop_end_sample"], n_samples)
    w50 = int(0.050 * sr)
    pre_seam_db = rms_db(mono[max(0, e - w50) : e])
    post_seam_db = rms_db(mono[s : min(n_samples, s + w50)])
    seam_jump_db = abs(post_seam_db - pre_seam_db)
    seam_signed_jump_db = post_seam_db - pre_seam_db

    # 1s dynamic stability & dialogue-friendliness descriptors
    win_1s = sr
    rms_1s_vals = [rms_db(mono[p : p + win_1s]) for p in range(0, max(1, n_samples - win_1s + 1), sr // 2)]
    rms_1s_arr = np.asarray(rms_1s_vals, dtype=np.float64) if rms_1s_vals else np.asarray([lufs])
    lra_approx_db = float(np.percentile(rms_1s_arr, 95) - np.percentile(rms_1s_arr, 10))
    max_1s_above_lufs_db = float(np.max(rms_1s_arr) - lufs)
    centroid_hz = float(np.mean(librosa.feature.spectral_centroid(y=mono, sr=sr)))
    harm, perc = librosa.effects.hpss(mono[: min(len(mono), 45 * sr)])
    h_energy = float(np.sum(np.square(harm)))
    p_energy = float(np.sum(np.square(perc)))
    harmonic_ratio = h_energy / max(1e-12, h_energy + p_energy)

    # Re-estimate BPM on final loop MP3 for accurate reporting
    tempo_final, _ = librosa.beat.beat_track(y=mono, sr=sr, start_bpm=float(np.mean(track_spec["target_bpm"])))
    bpm_est = float(np.atleast_1d(tempo_final)[0]) if np.size(tempo_final) > 0 else loop_info["bpm_estimated"]
    bpm_musical = fold_bpm_to_target(bpm_est, track_spec["target_bpm"])

    # Vocal screening
    vocal_info = screen_vocals_whisper(whisper_model, mono, sr=sr)

    loop_start_sec = s / sr
    loop_end_sec = e / sr
    loop_dur_sec = (e - s) / sr

    failures = []
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
    if seam_jump_db > float(pp_cfg["max_seam_jump_db"]):
        failures.append(f"seam_jump_db {seam_jump_db:.2f} > {pp_cfg['max_seam_jump_db']}")
    if duration_sec < 95.0 or duration_sec > 155.0:
        failures.append(f"duration {duration_sec:.1f}s out of ~100-150s")
    if vocal_info["has_vocals"]:
        failures.append(f"vocals detected ({vocal_info['filtered_text']})")
    if not (float(pp_cfg["loop_min_sec"]) - 0.5 <= loop_dur_sec <= float(pp_cfg["loop_max_sec"]) + 0.5):
        failures.append(f"loop_dur {loop_dur_sec:.2f}s out of 60-120s")

    # 速度檢查：折算後（×1／×½／×2）的 BPM 需落在目標區間 ±15%（相對區間中點）內
    t_min, t_max = track_spec["target_bpm"]
    bpm_dist = 0.0
    if bpm_musical < t_min:
        bpm_dist = t_min - bpm_musical
    elif bpm_musical > t_max:
        bpm_dist = bpm_musical - t_max
    bpm_tol = float(pp_cfg.get("bpm_tolerance_ratio", 0.15)) * 0.5 * (t_min + t_max)
    if bpm_dist > bpm_tol:
        failures.append(f"bpm_musical {bpm_musical:.1f} too far from {t_min}-{t_max} (tol {bpm_tol:.1f})")

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
        "seam_signed_jump_db": round(seam_signed_jump_db, 2),
        "bpm_estimated": round(bpm_est, 1),
        "bpm_musical": round(bpm_musical, 1),
        "lra_approx_db": round(lra_approx_db, 2),
        "max_1s_above_lufs_db": round(max_1s_above_lufs_db, 2),
        "spectral_centroid_hz": round(centroid_hz, 1),
        "harmonic_ratio": round(harmonic_ratio, 3),
        "vocal_check": vocal_info,
        "qa_passed": len(failures) == 0,
        "qa_failures": failures,
    }
    return (len(failures) == 0), failures, metrics, pcm


def render_plot(pcm: np.ndarray, sr: int, track_id: str, slot: str, seed: int, metrics: dict, png_path: Path) -> None:
    mono = np.mean(pcm, axis=0)
    duration = len(mono) / sr
    # Downsample waveform envelope to ~2400 columns for crisp plotting
    n_bins = min(2400, len(mono))
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

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 4.833), dpi=120, sharex=True, gridspec_kw={"height_ratios": [1.0, 1.35]})
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
        f"{track_id}_{slot} | seed={seed} | BPM={metrics['bpm_musical']} (raw {metrics['bpm_estimated']}) | "
        f"LUFS={metrics['lufs']} | TP={metrics['true_peak_dbtp']} dBTP | SeamΔ={metrics['seam_jump_db']} dB",
        color="#e0e6ff",
        fontsize=9.5,
        pad=8,
    )

    ax2.set_facecolor("#181b24")
    librosa.display.specshow(
        mel_db,
        sr=sr,
        hop_length=1024,
        x_axis="time",
        y_axis="mel",
        fmax=16000,
        cmap="magma",
        ax=ax2,
    )
    ax2.axvline(s_sec, color="#73daca", linestyle="--", linewidth=1.4)
    ax2.axvline(e_sec, color="#ff9e64", linestyle="--", linewidth=1.4)
    ax2.set_xlabel("Time (s)", color="#c0caf5", fontsize=9)
    ax2.set_ylabel("Hz", color="#c0caf5", fontsize=9)
    ax2.tick_params(colors="#a9b1d6", labelsize=8)

    plt.tight_layout()
    fig.savefig(str(png_path), dpi=120, facecolor=fig.get_facecolor())
    plt.close(fig)


def compute_objective_score(track_id: str, metrics: dict, target_bpm: list[int]) -> float:
    """Deterministic objective quality & VN-dialogue-friendliness score (higher is better)."""
    score = 100.0
    score -= abs(metrics["lufs"] - (-18.0)) * 5.0
    score -= metrics["seam_jump_db"] * 6.0
    score -= metrics["silence_ratio"] * 120.0
    score -= max(0.0, metrics["max_1s_above_lufs_db"] - 4.0) * 3.0
    score -= max(0.0, metrics["lra_approx_db"] - 9.0) * 1.5

    t_mid = 0.5 * (target_bpm[0] + target_bpm[1])
    score -= abs(metrics["bpm_musical"] - t_mid) * 0.45

    # Prefer brighter/percussive vs calm harmonic balance according to track role
    if track_id in ("title", "warm"):
        score += metrics["harmonic_ratio"] * 8.0
        score -= max(0.0, metrics["spectral_centroid_hz"] - 2200.0) / 300.0
    elif track_id == "daily":
        score += metrics["harmonic_ratio"] * 4.0
    elif track_id == "tense":
        score -= max(0.0, metrics["spectral_centroid_hz"] - 2600.0) / 300.0
    return round(score, 2)


def main():
    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    gen_def = cfg["generation_defaults"]
    pp_cfg = cfg["postprocess_defaults"]
    sr = int(pp_cfg["target_sr"])

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    state = {}
    if STATE_PATH.exists():
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))

    props = torch.cuda.get_device_properties(0)
    gpu_name = props.name
    vram_gb = round(props.total_memory / (1024 ** 3), 2)
    use_overlapped = vram_gb < 20.0
    log(f"GPU: {gpu_name} ({vram_gb} GiB), overlapped_decode={use_overlapped}")

    log("Initializing ACEStepPipeline...")
    pipe = ACEStepPipeline(
        checkpoint_dir=CHECKPOINT_DIR,
        dtype="bfloat16",
        torch_compile=False,
        cpu_offload=False,
        overlapped_decode=use_overlapped,
    )
    pipe.save_wav_file = types.MethodType(safe_save_wav_file, pipe)

    t0 = time.time()
    pipe.load_checkpoint(CHECKPOINT_DIR)
    log(f"Checkpoint loaded in {time.time() - t0:.1f}s")

    log("Loading Whisper base model for vocal-leakage screening...")
    whisper_model = whisper.load_model("base", device="cuda" if torch.cuda.is_available() else "cpu")

    results_tracks = []
    rejected_attempts = []
    total_passed = 0

    for track in cfg["tracks"]:
        tid = track["id"]
        base_backups = list(track.get("backup_seeds", []))
        # 備援 seed 不夠用時，以固定步長衍生，確保重跑時順序可重現
        backup_iter = iter(base_backups + [base_backups[0] + 7919 * k for k in range(1, 25)] if base_backups else [])
        track_candidates = []

        for cand in track["candidates"]:
            slot = cand["slot"]
            cid = f"{tid}_{slot}"
            mp3_path = OUT_DIR / f"{cid}.mp3"
            seam_path = OUT_DIR / f"{cid}_seam.mp3"
            png_path = OUT_DIR / f"{cid}.png"

            if cid in state and mp3_path.exists() and seam_path.exists() and png_path.exists():
                log(f"Skipping already completed {cid}")
                track_candidates.append(state[cid])
                total_passed += 1
                continue

            # 第 1 次用候選自己的 seed，其後最多 3 次才（惰性）向該曲共用的備援 seed 取用
            chosen_record = None
            for attempt_idx in range(1, MAX_ATTEMPTS + 1):
                seed = cand["seed"] if attempt_idx == 1 else next(backup_iter, None)
                if seed is None:
                    break
                raw_wav = RAW_DIR / f"{cid}_s{seed}.wav"
                log(f"Generating {cid} (attempt {attempt_idx}, seed={seed})...")
                t_gen = time.time()

                prompt_used = cand["prompt"]
                if attempt_idx >= 3:
                    prompt_used = f"{cand['prompt']}, pure instrumental soundtrack, solo instruments, strictly no voice"

                try:
                    pipe(
                        format="wav",
                        audio_duration=float(gen_def["audio_duration"]),
                        prompt=prompt_used,
                        lyrics=gen_def["lyrics"],
                        infer_step=int(gen_def["infer_step"]),
                        guidance_scale=float(gen_def["guidance_scale"]),
                        scheduler_type=gen_def["scheduler_type"],
                        cfg_type=gen_def["cfg_type"],
                        omega_scale=float(gen_def["omega_scale"]),
                        manual_seeds=[int(seed)],
                        guidance_interval=float(gen_def["guidance_interval"]),
                        guidance_interval_decay=float(gen_def["guidance_interval_decay"]),
                        min_guidance_scale=float(gen_def["min_guidance_scale"]),
                        use_erg_tag=bool(gen_def["use_erg_tag"]),
                        use_erg_lyric=bool(gen_def["use_erg_lyric"]),
                        use_erg_diffusion=bool(gen_def["use_erg_diffusion"]),
                        save_path=str(raw_wav),
                        batch_size=1,
                    )
                except torch.cuda.OutOfMemoryError:
                    log("CUDA OOM hit; enabling overlapped_decode=True and retrying...")
                    pipe.overlapped_decode = True
                    pipe.cleanup_memory()
                    pipe(
                        format="wav",
                        audio_duration=float(gen_def["audio_duration"]),
                        prompt=prompt_used,
                        lyrics=gen_def["lyrics"],
                        infer_step=int(gen_def["infer_step"]),
                        guidance_scale=float(gen_def["guidance_scale"]),
                        scheduler_type=gen_def["scheduler_type"],
                        cfg_type=gen_def["cfg_type"],
                        omega_scale=float(gen_def["omega_scale"]),
                        manual_seeds=[int(seed)],
                        guidance_interval=float(gen_def["guidance_interval"]),
                        guidance_interval_decay=float(gen_def["guidance_interval_decay"]),
                        min_guidance_scale=float(gen_def["min_guidance_scale"]),
                        use_erg_tag=bool(gen_def["use_erg_tag"]),
                        use_erg_lyric=bool(gen_def["use_erg_lyric"]),
                        use_erg_diffusion=bool(gen_def["use_erg_diffusion"]),
                        save_path=str(raw_wav),
                        batch_size=1,
                    )

                gen_sec = round(time.time() - t_gen, 2)
                log(f"Generated {raw_wav.name} in {gen_sec}s; running DSP post-processing...")

                # Load raw audio -> (C, N)
                raw_data, raw_sr = sf.read(str(raw_wav), always_2d=True, dtype="float64")
                x = raw_data.T
                if x.shape[0] == 1:
                    x = np.repeat(x, 2, axis=0)
                elif x.shape[0] > 2:
                    x = x[:2, :]

                # DC removal + 20 Hz 2nd-order HPF
                x = x - np.mean(x, axis=1, keepdims=True)
                sos = signal.butter(2, 20.0, btype="highpass", fs=raw_sr, output="sos")
                x = signal.sosfiltfilt(sos, x, axis=1)

                # Resample 48k -> 44.1k
                if raw_sr != sr:
                    try:
                        x = np.vstack([
                            librosa.resample(x[ch], orig_sr=raw_sr, target_sr=sr, res_type="soxr_hq")
                            for ch in range(2)
                        ])
                    except Exception:
                        x = np.vstack([
                            librosa.resample(x[ch], orig_sr=raw_sr, target_sr=sr)
                            for ch in range(2)
                        ])

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

                # Beat / bar detection & seamless loop selection
                loop_info = detect_bars_and_select_loop(
                    x,
                    sr=sr,
                    target_bpm=track["target_bpm"],
                    loop_min_sec=float(pp_cfg["loop_min_sec"]),
                    loop_max_sec=float(pp_cfg["loop_max_sec"]),
                    min_loop_end_sec=float(pp_cfg.get("min_loop_end_sec", 0.0)),
                )
                looped = apply_seamless_loop_crossfade(x, loop_info)

                # Loudness normalize (-18 LUFS) + true peak limit (-1.5 dBTP pre-MP3)
                normed = normalize_lufs_and_limit(
                    looped,
                    sr=sr,
                    target_lufs=float(pp_cfg["target_lufs"]),
                    ceiling_dbtp=float(pp_cfg["pre_mp3_ceiling_dbtp"]),
                )

                # Encode main MP3 and check decoded true peak
                encode_mp3(normed, sr, mp3_path, bitrate=pp_cfg["mp3_bitrate"])
                decoded_tmp = decode_mp3(mp3_path, sr=sr)
                mp3_tp = compute_true_peak_dbtp(decoded_tmp)
                if mp3_tp > float(pp_cfg["max_true_peak_dbtp"]) - 0.05:
                    adjust_db = float(pp_cfg["max_true_peak_dbtp"]) - 0.25 - mp3_tp
                    normed = normed * db_to_lin(adjust_db)
                    encode_mp3(normed, sr, mp3_path, bitrate=pp_cfg["mp3_bitrate"])

                # Build 8s seam preview (4s before E + 4s from S) from normalized PCM
                half_n = int(float(pp_cfg["seam_preview_half_sec"]) * sr)
                s_idx = loop_info["loop_start_sample"]
                e_idx = min(loop_info["loop_end_sample"], normed.shape[1])
                pre_seg = normed[:, max(0, e_idx - half_n) : e_idx]
                post_seg = normed[:, s_idx : min(normed.shape[1], s_idx + half_n)]
                seam_pcm = np.concatenate([pre_seg, post_seg], axis=1)
                micro_n = min(int(0.020 * sr), seam_pcm.shape[1] // 4)
                if micro_n > 0:
                    seam_pcm[:, :micro_n] *= np.linspace(0.0, 1.0, micro_n)[None, :]
                    seam_pcm[:, -micro_n:] *= np.linspace(1.0, 0.0, micro_n)[None, :]
                encode_mp3(seam_pcm, sr, seam_path, bitrate=pp_cfg["mp3_bitrate"])

                # Objective QA on final MP3
                passed, failures, metrics, final_pcm = evaluate_mp3_qa(
                    mp3_path, loop_info, track, pp_cfg, whisper_model
                )

                # 最後一次嘗試若僅剩「速度偏離」一項未過，附警告收下（避免整批中止）
                if (
                    not passed
                    and attempt_idx == MAX_ATTEMPTS
                    and failures
                    and all(f.startswith("bpm_musical") for f in failures)
                ):
                    metrics["qa_warnings"] = list(failures)
                    metrics["qa_passed"] = True
                    metrics["qa_failures"] = []
                    passed = True

                if passed:
                    render_plot(final_pcm, sr, tid, slot, seed, metrics, png_path)
                    metrics["objective_score"] = compute_objective_score(tid, metrics, track["target_bpm"])
                    chosen_record = {
                        "id": cid,
                        "track_id": tid,
                        "slot": slot,
                        "filename": mp3_path.name,
                        "seam_filename": seam_path.name,
                        "plot_filename": png_path.name,
                        "seed": int(seed),
                        "prompt": prompt_used,
                        "generation_sec": gen_sec,
                        "metrics": metrics,
                    }
                    log(
                        f"PASS {cid} (seed={seed}): dur={metrics['duration_sec']}s, "
                        f"loop=[{metrics['loop_start_sec']:.2f}, {metrics['loop_end_sec']:.2f}], "
                        f"LUFS={metrics['lufs']}, TP={metrics['true_peak_dbtp']} dBTP, "
                        f"seamΔ={metrics['seam_jump_db']} dB, BPM={metrics['bpm_musical']}"
                    )
                    break
                else:
                    log(f"REJECT {cid} (seed={seed}): {failures}")
                    rejected_attempts.append(
                        {
                            "id": cid,
                            "track_id": tid,
                            "slot": slot,
                            "seed": int(seed),
                            "failures": failures,
                            "metrics": metrics,
                        }
                    )
                    for p in (mp3_path, seam_path, png_path):
                        if p.exists():
                            p.unlink()

                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

            if chosen_record is None:
                raise RuntimeError(f"Failed to generate a passing candidate for {cid} after retries!")

            state[cid] = chosen_record
            STATE_PATH.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
            track_candidates.append(chosen_record)
            total_passed += 1

        # Rank candidates within track by objective score
        ranked = sorted(track_candidates, key=lambda c: c["metrics"]["objective_score"], reverse=True)
        recommended_id = ranked[0]["id"]
        results_tracks.append(
            {
                "id": tid,
                "title_zh": track["title_zh"],
                "usage_zh": track["usage_zh"],
                "style_zh": track["style_zh"],
                "target_bpm": track["target_bpm"],
                "recommended_id": recommended_id,
                "candidates": track_candidates,
            }
        )

    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "project": cfg["project"],
        "model": cfg["model"],
        "environment": {
            "gpu_name": gpu_name,
            "vram_gib": vram_gb,
            "overlapped_decode": bool(pipe.overlapped_decode),
        },
        "generation_defaults": gen_def,
        "postprocess_defaults": pp_cfg,
        "total_passing_candidates": total_passed,
        "rejected_attempts": rejected_attempts,
        "tracks": results_tracks,
    }
    CANDIDATES_JSON_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # Package output bundle
    log(f"Packing bundle to {BUNDLE_PATH}...")
    with tarfile.open(BUNDLE_PATH, "w:gz") as tar:
        for item in sorted(OUT_DIR.iterdir()):
            if item.name == "state.json" or item.name.endswith(".tmp.wav"):
                continue
            tar.add(item, arcname=item.name)

    log(f"DONE: {total_passed}/15 passing candidates, bundle size={BUNDLE_PATH.stat().st_size / (1024*1024):.2f} MiB")


if __name__ == "__main__":
    main()
