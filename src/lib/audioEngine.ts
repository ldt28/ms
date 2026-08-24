/**
 * Signal — in-browser audio analysis engine.
 * Real DSP on the decoded waveform: energy curve, onset envelope, tempo via
 * autocorrelation, chroma → key via Krumhansl–Kessler templates, spectral
 * texture, and energy-based section splitting. No fakes: every field carries
 * a confidence tier and its method.
 */

import type { Finding, Section } from "./types";

export class AnalysisError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AnalysisError";
    this.code = code;
  }
}

export interface AudioAnalysisResult {
  durationSec: number;
  sampleRate: number;
  channels: number;
  /** decoded PCM — reused by the in-browser vocal transcriber */
  buffer: AudioBuffer;
  tempo: Finding<number>;
  keySig: Finding<string>;
  energy: { curve: number[]; avg: number; peak: number; dynamicRangeDb: number };
  texture: {
    bassRatio: Finding<number>;
    brightnessHz: Finding<number>;
    onsetRate: Finding<number>;
  };
  sections: Section[];
  notes: string[];
}

type StageFn = (label: string) => void;
const tick = (ms = 20) => new Promise<void>((r) => setTimeout(r, ms));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/* ---------- iterative radix-2 FFT ---------- */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + half] * cr - im[i + k + half] * ci;
        const vi = re[i + k + half] * ci + im[i + k + half] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

const KEY_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb; da += xa * xa; db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

export async function analyzeAudioFile(file: File, onStage: StageFn): Promise<AudioAnalysisResult> {
  const notes: string[] = [];

  onStage("Reading file");
  if (file.size > 80 * 1024 * 1024) {
    throw new AnalysisError("audio_error", "File is over 80 MB. Export a smaller copy and retry.");
  }
  const raw = await file.arrayBuffer();
  await tick();

  onStage("Decoding audio");
  const AC: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  let audio: AudioBuffer;
  try {
    audio = await ctx.decodeAudioData(raw.slice(0));
  } catch {
    await ctx.close().catch(() => undefined);
    throw new AnalysisError(
      "audio_error",
      `Could not decode “${file.name}”. The browser handles WAV / MP3 / FLAC / OGG — for exotic containers, run the Python backend (FFmpeg).`
    );
  }
  await ctx.close().catch(() => undefined);

  const sr = audio.sampleRate;
  const channels = audio.numberOfChannels;
  const totalLen = audio.length;
  const durationSec = audio.duration;

  // mono mixdown
  const mono = new Float32Array(totalLen);
  for (let c = 0; c < channels; c++) {
    const data = audio.getChannelData(c);
    for (let i = 0; i < totalLen; i++) mono[i] += data[i] / channels;
  }

  onStage("Scanning levels & bands");
  await tick();

  /* ---- pass 1: energy curve (hop 4096) + band envelopes (hop 512) ---- */
  const hopE = 4096;
  const hopT = 512;
  const frameSecE = hopE / sr;
  const frameSecT = hopT / sr;
  const aLow = 1 - Math.exp((-2 * Math.PI * 160) / sr); // one-pole LPF ~160 Hz

  const rmsCurve: number[] = [];
  const lowFrames: number[] = [];
  const highFrames: number[] = [];

  let lowY = 0;
  let sumTotal = 0;
  let sumLow = 0;
  let accT = 0; let accL = 0; let accH = 0; let cntT = 0;
  let accE = 0; let cntE = 0;

  for (let i = 0; i < totalLen; i++) {
    const x = mono[i];
    lowY += aLow * (x - lowY);
    const h = x - lowY;
    sumTotal += x * x;
    sumLow += lowY * lowY;
    accT += x * x; accL += lowY * lowY; accH += h * h; cntT++;
    accE += x * x; cntE++;
    if (cntT === hopT) {
      lowFrames.push(Math.sqrt(accL / hopT));
      highFrames.push(Math.sqrt(accH / hopT));
      accT = 0; accL = 0; accH = 0; cntT = 0;
    }
    if (cntE === hopE) {
      rmsCurve.push(Math.sqrt(accE / hopE));
      accE = 0; cntE = 0;
    }
  }
  if (cntE > 0) rmsCurve.push(Math.sqrt(accE / cntE));

  /* ---- onset envelope + density ---- */
  const env = new Float32Array(Math.max(0, lowFrames.length - 1));
  for (let i = 1; i < lowFrames.length; i++) {
    env[i - 1] =
      Math.max(0, lowFrames[i] - lowFrames[i - 1]) +
      Math.max(0, highFrames[i] - highFrames[i - 1]);
  }

  let onsetRate = 0;
  if (env.length > 16) {
    let m = 0;
    for (let i = 0; i < env.length; i++) m += env[i];
    m /= env.length;
    let sd = 0;
    for (let i = 0; i < env.length; i++) sd += (env[i] - m) * (env[i] - m);
    sd = Math.sqrt(sd / env.length);
    const thr = m + 1.3 * sd;
    const minGap = Math.max(2, Math.round(0.07 / frameSecT));
    let count = 0;
    let last = -minGap;
    for (let i = 1; i < env.length - 1; i++) {
      if (env[i] > thr && env[i] >= env[i - 1] && env[i] > env[i + 1] && i - last >= minGap) {
        count++;
        last = i;
      }
    }
    onsetRate = count / durationSec;
  }

  onStage("Estimating tempo (onset autocorrelation)");
  await tick();

  /* ---- tempo ---- */
  const maxEnv = Math.min(env.length, Math.round(360 / frameSecT)); // cap ~6 min
  const e = new Float32Array(maxEnv);
  let em = 0;
  for (let i = 0; i < maxEnv; i++) em += env[i];
  em /= Math.max(1, maxEnv);
  for (let i = 0; i < maxEnv; i++) e[i] = env[i] - em;
  let eEnergy = 0;
  for (let i = 0; i < maxEnv; i++) eEnergy += e[i] * e[i];

  const lagMin = Math.max(4, Math.floor(60 / 200 / frameSecT));
  const lagMax = Math.min(maxEnv - 2, Math.ceil(60 / 50 / frameSecT));

  let bestLag = -1;
  let bestC = 0;
  const corr: number[] = [];
  if (eEnergy > 1e-9 && lagMax > lagMin) {
    for (let lag = lagMin; lag <= lagMax; lag++) {
      let s = 0;
      for (let i = 0; i + lag < maxEnv; i++) s += e[i] * e[i + lag];
      const c = s / eEnergy;
      corr.push(c);
      if (c > bestC) { bestC = c; bestLag = lag; }
    }
  }

  let tempoValue: number | null = null;
  let tempoScore = 0;
  let tempoNote: string | undefined;
  if (bestLag > 0) {
    const idx = bestLag - lagMin;
    const y1 = corr[Math.max(0, idx - 1)];
    const y2 = corr[idx];
    const y3 = corr[Math.min(corr.length - 1, idx + 1)];
    const denom = y1 - 2 * y2 + y3;
    const shift = denom !== 0 ? Math.max(-1, Math.min(1, (0.5 * (y1 - y3)) / denom)) : 0;
    let bpm = 60 / ((bestLag + shift) * frameSecT);
    if (!isFinite(bpm) || bpm <= 0) bpm = 60 / (bestLag * frameSecT);
    let folded = false;
    while (bpm < 70) { bpm *= 2; folded = true; }
    while (bpm > 180) { bpm /= 2; folded = true; }
    tempoValue = Math.round(bpm * 10) / 10;
    tempoScore = clamp01(bestC);
    if (durationSec < 10) { tempoScore *= 0.5; tempoNote = "Track under 10 s — confidence reduced."; }
    else if (folded) tempoNote = "Raw period folded into the 70–180 BPM range (octave ambiguity).";
  } else {
    tempoNote = "No periodic onsets found — could not estimate tempo.";
  }

  onStage("Building chromagram");
  await tick();

  /* ---- chroma → key ---- */
  const N = 4096;
  const hann = new Float32Array(N);
  for (let i = 0; i < N; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

  const spectralLen = Math.min(totalLen, sr * 420); // cap heavy DSP at 7 min
  if (spectralLen < totalLen) notes.push("Track longer than 7 min — spectral analysis used the first 7 minutes.");
  const totalFrames = Math.max(1, Math.floor((spectralLen - N) / N) + 1);
  const stride = Math.max(1, Math.ceil(totalFrames / 900));

  const chroma = new Array(12).fill(0) as number[];
  let centSum = 0;
  let centCount = 0;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  const kMax = Math.min(N / 2, Math.ceil((2200 * N) / sr));

  for (let f = 0; f < totalFrames; f += stride) {
    const off = f * N;
    for (let i = 0; i < N; i++) { re[i] = mono[off + i] * hann[i]; im[i] = 0; }
    fft(re, im);
    let magSum = 0;
    let weighted = 0;
    for (let k = 2; k < kMax; k++) {
      const mag = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      const freq = (k * sr) / N;
      if (freq < 55) continue;
      const midi = Math.round(69 + 12 * Math.log2(freq / 440));
      chroma[((midi % 12) + 12) % 12] += mag;
      magSum += mag;
      weighted += freq * mag;
    }
    if (magSum > 1e-6) {
      centSum += weighted / magSum;
      centCount++;
    }
  }

  let keyValue: string | null = null;
  let keyScore = 0;
  const chromaSum = chroma.reduce((a, b) => a + b, 0);
  if (chromaSum > 1e-6) {
    const norm = chroma.map((v) => (v / chromaSum) * 12);
    let best = -2; let second = -2; let bestName = "";
    for (let root = 0; root < 12; root++) {
      const rotated = norm.map((_, i) => norm[(i + root) % 12]);
      const cMaj = pearson(rotated, MAJOR_PROFILE);
      const cMin = pearson(rotated, MINOR_PROFILE);
      if (cMaj > best) { second = best; best = cMaj; bestName = `${KEY_NAMES[root]} major`; }
      else if (cMaj > second) second = cMaj;
      if (cMin > best) { second = best; best = cMin; bestName = `${KEY_NAMES[root]} minor`; }
      else if (cMin > second && cMin !== best) second = cMin;
    }
    keyValue = bestName;
    const margin = Math.max(0, best - second);
    keyScore = clamp01(0.7 * Math.max(0, best) + 4 * margin);
  }

  /* ---- texture ---- */
  const bassRatio = sumTotal > 0 ? clamp01(sumLow / sumTotal) : 0;
  const brightnessHz = centCount > 0 ? centSum / centCount : 0;

  onStage("Detecting section boundaries");
  await tick();

  /* ---- energy curve stats + display decimation ---- */
  const maxRms = Math.max(1e-9, ...rmsCurve);
  let rmsSum = 0;
  for (const v of rmsCurve) rmsSum += v;
  const rmsAvg = rmsCurve.length ? rmsSum / rmsCurve.length : 0;
  const rmsPeak = rmsCurve.length ? Math.max(...rmsCurve) : 0;
  const dynamicRangeDb = rmsAvg > 0 ? Math.min(42, Math.max(0, 20 * Math.log10(rmsPeak / rmsAvg))) : 0;

  const targetPts = 640;
  const curve: number[] = [];
  if (rmsCurve.length <= targetPts) {
    for (const v of rmsCurve) curve.push(v / maxRms);
  } else {
    const bucket = rmsCurve.length / targetPts;
    for (let b = 0; b < targetPts; b++) {
      const s = Math.floor(b * bucket);
      const eIdx = Math.min(rmsCurve.length, Math.floor((b + 1) * bucket) + 1);
      let mx = 0;
      for (let i = s; i < eIdx; i++) if (rmsCurve[i] > mx) mx = rmsCurve[i];
      curve.push(mx / maxRms);
    }
  }

  /* ---- sections via energy novelty ---- */
  const smoothW = Math.max(3, Math.round(1.2 / frameSecE));
  const smooth: number[] = new Array(rmsCurve.length).fill(0);
  let runSum = 0;
  for (let i = 0; i < rmsCurve.length; i++) {
    runSum += rmsCurve[i] / maxRms;
    if (i >= smoothW) runSum -= rmsCurve[i - smoothW] / maxRms;
    smooth[i] = runSum / Math.min(i + 1, smoothW);
  }

  const W = Math.max(8, Math.round(8 / frameSecE));
  const step = Math.max(2, Math.round(0.5 / frameSecE));
  const novelty: { t: number; s: number }[] = [];
  for (let t = W; t < smooth.length - W; t += step) {
    let before = 0; let after = 0;
    for (let i = t - W; i < t; i++) before += smooth[i];
    for (let i = t; i < t + W; i++) after += smooth[i];
    novelty.push({ t, s: Math.abs(after / W - before / W) });
  }

  const boundaries: number[] = [0];
  if (novelty.length > 4 && durationSec > 20) {
    let nm = 0;
    for (const n of novelty) nm += n.s;
    nm /= novelty.length;
    let nsd = 0;
    for (const n of novelty) nsd += (n.s - nm) * (n.s - nm);
    nsd = Math.sqrt(nsd / novelty.length);
    const thr = nm + 0.85 * nsd;
    const minGapF = Math.round(6 / frameSecE / step);
    const peaks = novelty
      .map((n, i) => ({ ...n, i }))
      .filter((n) => n.s > thr)
      .sort((a, b) => b.s - a.s);
    const chosen: number[] = [];
    for (const p of peaks) {
      if (chosen.length >= 6) break;
      if (chosen.every((c) => Math.abs(c - p.i) >= minGapF)) chosen.push(p.i);
    }
    for (const c of chosen.sort((a, b) => a - b)) {
      const tSec = novelty[c].t * frameSecE;
      if (tSec > 4 && tSec < durationSec - 4) boundaries.push(tSec);
    }
  }
  boundaries.push(durationSec);

  const overallMean = rmsAvg / maxRms;
  const sections: Section[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const s = boundaries[i];
    const eSec = boundaries[i + 1];
    const i0 = Math.floor(s / frameSecE);
    const i1 = Math.min(rmsCurve.length, Math.ceil(eSec / frameSecE));
    let segSum = 0; let segN = 0;
    for (let k = i0; k < i1; k++) { segSum += rmsCurve[k] / maxRms; segN++; }
    const avgE = segN ? segSum / segN : 0;

    let label = "Section";
    const isFirst = i === 0;
    const isLast = i === boundaries.length - 2;
    const totalSecs = boundaries.length - 1;

    if (isFirst && (avgE < overallMean * 0.95 || eSec - s < durationSec * 0.2)) {
      label = "Intro";
    } else if (isLast && (avgE < overallMean * 0.9 || eSec > durationSec * 0.85)) {
      label = "Outro";
    } else if (avgE > overallMean * 1.1) {
      label = i <= totalSecs / 2 ? "Chorus 1" : "Chorus 2";
    } else if (avgE < overallMean * 0.9) {
      label = i <= totalSecs / 2 ? "Verse 1" : "Verse 2";
    } else {
      // Transition / Bridge fallback with section counter
      if (i === 1) label = "Verse 1";
      else if (i === 2) label = "Bridge / Build";
      else if (i === totalSecs - 2) label = "Bridge";
      else label = `Verse ${Math.min(3, Math.ceil(i / 2))}`;
    }

    sections.push({ start: s, end: eSec, label, tier: "guessed", avgEnergy: avgE });
  }
  if (sections.length === 1) {
    sections[0].label = "Full track";
    notes.push("No strong energy changes found — reported as a single section.");
  } else {
    notes.push("Section labels come from energy level only — repetition-aware labeling is the next build layer.");
  }

  onStage("Assembling report");
  await tick();

  return {
    durationSec,
    sampleRate: sr,
    channels,
    buffer: audio,
    tempo: {
      value: tempoValue,
      tier: "measured",
      source: "onset-envelope autocorrelation",
      score: tempoScore,
      note: tempoNote,
    },
    keySig: {
      value: keyValue,
      tier: "estimated",
      source: "chromagram × Krumhansl–Kessler profiles",
      score: keyScore,
      note: keyValue ? undefined : "Chroma too weak to estimate a key.",
    },
    energy: {
      curve,
      avg: rmsAvg / maxRms,
      peak: 1,
      dynamicRangeDb: Math.round(dynamicRangeDb * 10) / 10,
    },
    texture: {
      bassRatio: {
        value: Math.round(bassRatio * 1000) / 1000,
        tier: "measured",
        source: "sub-160 Hz energy share (one-pole LPF)",
      },
      brightnessHz: {
        value: Math.round(brightnessHz),
        tier: "measured",
        source: "mean spectral centroid",
      },
      onsetRate: {
        value: Math.round(onsetRate * 100) / 100,
        tier: "measured",
        source: "adaptive-threshold onset count",
      },
    },
    sections,
    notes,
  };
}
