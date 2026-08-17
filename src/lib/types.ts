/**
 * Signal — shared report types.
 * The core product rule: every value declares HOW it was produced.
 */

export type Tier = "measured" | "computed" | "estimated" | "guessed";

/** Live reachability of the Python backend (/api/health ping). */
export type PingState = "idle" | "checking" | "ok" | "fail";

export interface Finding<T> {
  value: T | null;
  tier: Tier;
  source: string;
  note?: string;
  /** 0..1 internal confidence score */
  score?: number;
}

export interface Section {
  start: number;
  end: number;
  label: string;
  tier: Tier;
  avgEnergy: number; // 0..1
}

export interface Hook {
  fragment: string;
  count: number;
}

export interface LyricsBlock {
  source: "pasted" | "transcript";
  wordCount: number;
  lineCount: number;
  rhymeDensity: Finding<number>;
  diversity: Finding<number>;
  avgSyllPerLine: Finding<number>;
  flow: Finding<number | null>; // syllables per second (needs duration)
  hooks: Hook[];
}

export interface ReportData {
  meta: {
    title: string;
    artist: string;
    fileName: string;
    durationSec: number | null;
    sampleRate: number | null;
    channels: number | null;
    engine: "browser" | "backend";
    analyzedAt: number;
  };
  tempo: Finding<number>;
  keySig: Finding<string>;
  energy: {
    curve: number[]; // normalized 0..1
    avg: number;
    peak: number;
    dynamicRangeDb: number;
  } | null;
  texture: {
    bassRatio: Finding<number>;
    brightnessHz: Finding<number>;
    onsetRate: Finding<number>;
  } | null;
  sections: Section[];
  lyrics: LyricsBlock | null;
  audioError: string | null;
  lyricsError: string | null;
  transcriptionError: string | null;
  warnings: string[];
  audioUrl: string | null;
}

export const TIER_META: Record<Tier, { label: string; color: string; blurb: string }> = {
  measured: {
    label: "MEASURED",
    color: "#45d498",
    blurb: "Extracted directly from the audio signal by DSP — a fact about this recording.",
  },
  computed: {
    label: "COMPUTED",
    color: "#58c7d8",
    blurb: "Deterministic math on text you supplied — exact for the input given.",
  },
  estimated: {
    label: "ESTIMATED",
    color: "#f0a63f",
    blurb: "Statistical inference (templates, correlation). Probably right — verify by ear.",
  },
  guessed: {
    label: "GUESSED",
    color: "#8b95a9",
    blurb: "Pattern heuristic. A hypothesis to check, never a fact.",
  },
};

export function tierColor(t: Tier): string {
  return TIER_META[t].color;
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
