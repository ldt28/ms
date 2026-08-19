"""Signal — server-side audio analysis.

Pure numpy DSP (no librosa needed): decode via the wave module or FFmpeg,
onset-flux tempo autocorrelation, chroma x Krumhansl-Kessler key estimation,
RMS energy curve, spectral texture, and repetition-aware section grouping.

Every result carries a confidence label ("high" / "medium" / "low") and its
source method, per the product rule: measured facts are labeled, guesses are
flagged, failures are raised — never faked.
"""

from __future__ import annotations

import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 22050  # analysis sample rate (mono)

PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


class AudioAnalysisError(Exception):
    """Explicit, user-facing audio failure."""


def decode_to_mono(path: Path) -> tuple[np.ndarray, int]:
    """Return (mono float32 samples, sample rate)."""
    if path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path), "rb") as w:
                if w.getsampwidth() == 2:
                    raw = w.readframes(w.getnframes())
                    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
                    if w.getnchannels() > 1:
                        x = x.reshape(-1, w.getnchannels()).mean(axis=1)
                    return np.ascontiguousarray(x), w.getframerate()
        except (wave.Error, EOFError):
            pass  # exotic WAV — fall through to FFmpeg

    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", str(path), "-f", "f32le", "-acodec", "pcm_f32le",
        "-ac", "1", "-ar", str(SR), "pipe:1",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=300)
    except FileNotFoundError:
        raise AudioAnalysisError(
            "FFmpeg not found on this machine. Install it (brew install ffmpeg / apt install ffmpeg), restart the backend, retry."
        )
    if proc.returncode != 0:
        detail = proc.stderr.decode(errors="ignore").strip()[:200]
        raise AudioAnalysisError(f"FFmpeg could not decode this file ({detail or 'unknown codec'}).")
    x = np.frombuffer(proc.stdout, dtype=np.float32)
    if x.size == 0:
        raise AudioAnalysisError("FFmpeg decoded zero samples — the file appears to be empty or corrupt.")
    return np.ascontiguousarray(x), SR


def _stft_magnitudes(x: np.ndarray, nfft: int = 2048, hop: int = 512) -> np.ndarray:
    window = np.hanning(nfft)
    n_frames = max(1, 1 + (len(x) - nfft) // hop)
    mags = np.zeros((n_frames, nfft // 2 + 1), dtype=np.float32)
    for i in range(n_frames):
        seg = x[i * hop:i * hop + nfft]
        if seg.size < nfft:
            seg = np.pad(seg, (0, nfft - seg.size))
        mags[i] = np.abs(np.fft.rfft(seg * window))
    return mags


def _estimate_tempo(flux: np.ndarray, frame_rate: float) -> dict:
    lag_min = int(frame_rate * 60 / 200)  # 200 BPM
    lag_max = int(frame_rate * 60 / 60)   # 60 BPM
    if len(flux) < lag_max + 2:
        return {"value": None, "confidence": "none", "source": "onset autocorrelation (track too short)", "confidence_score": 0.0}

    f = flux - flux.mean()
    lags = np.arange(lag_min, lag_max + 1)
    corr = np.array([np.dot(f[:-l], f[l:]) for l in lags])
    best = int(np.argmax(corr))

    # parabolic interpolation for sub-frame precision
    if 0 < best < len(corr) - 1:
        y1, y2, y3 = corr[best - 1], corr[best], corr[best + 1]
        denom = y1 - 2 * y2 + y3
        shift = (0.5 * (y1 - y3)) / denom if denom != 0 else 0.0
        shift = max(-1.0, min(1.0, shift))
    else:
        shift = 0.0

    lag = lags[best] + shift
    bpm = 60.0 * frame_rate / lag if lag > 0 else 0.0
    while bpm and bpm < 70:
        bpm *= 2
    while bpm and bpm > 180:
        bpm /= 2

    sharpness = corr[best] / (np.median(corr) + 1e-9)
    confidence = "high" if sharpness > 3.0 else "medium" if sharpness > 1.8 else "low"
    return {
        "value": round(bpm, 1) if bpm else None,
        "confidence": confidence,
        "source": "onset autocorrelation (numpy)",
        "confidence_score": round(float(min(1.0, sharpness / 4.0)), 3),
    }


def _estimate_key(mags: np.ndarray, sr: int, nfft: int = 2048) -> dict:
    freqs = np.fft.rfftfreq(nfft, d=1.0 / sr)
    valid = freqs > 50.0
    midi = 69 + 12 * np.log2(freqs[valid] / 440.0)
    pc = np.round(midi).astype(int) % 12

    chroma = np.zeros((mags.shape[0], 12), dtype=np.float64)
    w = mags[:, valid]
    np.add.at(chroma, (slice(None), pc), w)
    mean_chroma = chroma.mean(axis=0)
    if mean_chroma.sum() <= 0:
        return {"value": None, "confidence": "none", "source": "chroma x Krumhansl-Kessler (silence)"}
    mean_chroma = mean_chroma / mean_chroma.sum()

    def pearson(a: np.ndarray, b: np.ndarray) -> float:
        return float(np.corrcoef(a, b)[0, 1])

    best_score, best_pc, best_mode = -2.0, 0, "major"
    scores = []
    for rot in range(12):
        rotated = np.roll(mean_chroma, -rot)
        scores.append(pearson(rotated, MAJOR_PROFILE))
        scores.append(pearson(rotated, MINOR_PROFILE))
    idx = int(np.argmax(scores))
    best_score = scores[idx]
    best_pc, best_mode = idx // 2, ("major" if idx % 2 == 0 else "minor")
    margin = best_score - sorted(scores)[-2]

    confidence = "high" if margin > 0.20 else "medium" if margin > 0.08 else "low"
    return {
        "value": f"{PITCH_NAMES[best_pc]} {best_mode}",
        "confidence": confidence,
        "source": "chroma x Krumhansl-Kessler templates",
    }


def _detect_sections(flux: np.ndarray, rms: np.ndarray, chroma: np.ndarray,
                     frame_rate: float, duration: float) -> list[dict]:
    """Boundary picking via flux peaks, then repetition-aware grouping."""
    if len(flux) < 16 or duration < 12:
        return []

    smoothed = np.convolve(flux, np.ones(5) / 5, mode="same")
    thr = smoothed.mean() + 0.8 * smoothed.std()
    min_gap = int(8 * frame_rate)

    candidates = []
    for i in range(2, len(smoothed) - 2):
        if smoothed[i] > thr and smoothed[i] >= smoothed[i - 1] and smoothed[i] >= smoothed[i + 1]:
            candidates.append((float(smoothed[i]), i))
    candidates.sort(reverse=True)

    boundaries: list[int] = []
    for _, i in candidates:
        if all(abs(i - b) >= min_gap for b in boundaries):
            boundaries.append(i)
        if len(boundaries) >= 10:
            break
    boundaries = sorted(boundaries)

    edges = [0] + boundaries + [len(rms) - 1]
    seg_chromas, seg_energies, seg_times = [], [], []
    for a, b in zip(edges[:-1], edges[1:]):
        if b <= a:
            continue
        c = chroma[a:b].mean(axis=0)
        seg_chromas.append(c / (c.sum() + 1e-9))
        seg_energies.append(float(rms[a:b].mean()))
        seg_times.append((a / frame_rate, b / frame_rate))

    def cosine(u: np.ndarray, v: np.ndarray) -> float:
        return float(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))

    groups: list[list[int]] = []
    for i, c in enumerate(seg_chromas):
        placed = False
        for g in groups:
            if cosine(c, seg_chromas[g[0]]) >= 0.92:
                g.append(i)
                placed = True
                break
        if not placed:
            groups.append([i])

    group_energy = {g[0]: float(np.mean([seg_energies[i] for i in g])) for g in groups}
    repeat_groups = [g for g in groups if len(g) >= 2]
    chorus_rep = max(repeat_groups, key=lambda g: group_energy[g[0]])[0] if repeat_groups else None
    chorus_lead = (
        group_energy[chorus_rep] - max((group_energy[g[0]] for g in repeat_groups if g[0] != chorus_rep), default=0.0)
        if chorus_rep is not None else 0.0
    )

    sections: list[dict] = []
    letters = iter("ABCDEFGH")
    for gi, g in enumerate(groups):
        start, end = seg_times[g[0]][0], seg_times[g[-1]][1]
        avg_energy = float(np.mean([seg_energies[i] for i in g]))
        dur = end - start
        if g[0] == chorus_rep:
            label, conf = "Chorus (guess)", ("medium" if chorus_lead >= 0.1 else "low")
        elif len(g) >= 2:
            label, conf = f"Verse {next(letters, '?')} (guess)", "low"
        elif gi == 0 and dur <= 25:
            label, conf = "Intro (guess)", "medium"
        elif gi == len(groups) - 1 and dur <= 25:
            label, conf = "Outro (guess)", "medium"
        else:
            label, conf = "Bridge (guess)", "low"
        sections.append({
            "start": round(start, 2),
            "end": round(end, 2),
            "label": label,
            "confidence": conf,
            "energy": round(min(1.0, avg_energy / (max(seg_energies) + 1e-9)), 3),
        })
    return sections


def analyze_audio(path: Path) -> dict:
    x, sr = decode_to_mono(path)
    if x.size < sr:
        raise AudioAnalysisError("Audio is under one second — too short to analyze.")

    nfft, hop = 2048, 512
    mags = _stft_magnitudes(x, nfft, hop)
    frame_rate = sr / hop
    duration = float(len(x) / sr)

    flux = np.maximum(0.0, np.diff(mags, axis=0)).sum(axis=1)
    rms = np.sqrt((mags ** 2).mean(axis=1) + 1e-12)

    tempo = _estimate_tempo(flux, frame_rate)
    key = _estimate_key(mags, sr, nfft)

    # energy curve, downsampled to ~240 points, normalized at p95
    norm = rms / (np.percentile(rms, 95) + 1e-9)
    idx = np.linspace(0, len(norm) - 1, min(240, len(norm))).astype(int)
    curve = [round(float(min(1.0, v)), 4) for v in norm[idx]]
    p95 = float(np.percentile(rms, 95)) + 1e-9
    p25 = float(np.percentile(rms, 25)) + 1e-9
    dynamic_range_db = round(20 * float(np.log10(p95 / p25)), 1)

    # texture
    freqs = np.fft.rfftfreq(nfft, d=1.0 / sr)
    bass_mask = freqs <= 250.0
    total_energy = float((mags ** 2).sum()) + 1e-9
    bass_ratio = float((mags[:, bass_mask] ** 2).sum()) / total_energy
    centroid = float((freqs[None, :] * mags).sum() / (mags.sum() + 1e-9))

    thr_on = flux.mean() + 1.5 * flux.std()
    onsets = sum(
        1 for i in range(1, len(flux) - 1)
        if flux[i] > thr_on and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]
    )
    onset_rate = round(onsets / duration, 2) if duration > 0 else 0.0

    # chroma for grouping
    valid = freqs > 50.0
    midi = 69 + 12 * np.log2(freqs[valid] / 440.0)
    pc = np.round(midi).astype(int) % 12
    chroma = np.zeros((mags.shape[0], 12), dtype=np.float64)
    np.add.at(chroma, (slice(None), pc), mags[:, valid])

    sections = _detect_sections(flux, rms, chroma, frame_rate, duration)

    return {
        "duration": round(duration, 2),
        "sample_rate": sr,
        "channels": 1,
        "tempo": tempo,
        "key": key,
        "sections": sections,
        "energy_curve": curve,
        "energy": {"dynamic_range_db": dynamic_range_db},
        "texture": {
            "bass_ratio": round(bass_ratio, 4),
            "brightness_hz": round(centroid, 1),
            "onset_rate": onset_rate,
        },
    }
