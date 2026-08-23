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

export interface SyncedLyricLine {
  id: number;
  timeSec: number;
  timeFormatted: string; // e.g. "00:15"
  text: string;
  section?: string; // e.g. "Verse 1", "Chorus", "Intro", "Bridge"
  isSectionHeader?: boolean;
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
  rawText?: string;
  syncedLines?: SyncedLyricLine[];
  geniusUrl?: string;
}

export interface ReportSource {
  kind: "file" | "direct-link" | "youtube" | "spotify" | "soundcloud" | "unsupported";
  url?: string;
  host?: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  /** playable official embed (YouTube / Spotify / SoundCloud) */
  embedUrl?: string;
  note?: string | null;
}

export interface ChordEvent {
  start: number;
  end: number;
  root: string; // e.g. "Bb", "F", "Db"
  quality: "maj" | "min" | "7" | "maj7" | "min7" | "dim" | "sus4";
  name: string; // e.g. "Bbm", "Gb", "Db", "Ab"
  roman: string; // e.g. "i", "VI", "III", "VII"
  notes: string[]; // e.g. ["Bb", "Db", "F"]
  confidence: number; // 0..1
}

export interface SectionHarmony {
  sectionLabel: string;
  start: number;
  end: number;
  progression: string[]; // e.g. ["Bbm", "Gb", "Db", "Ab"]
  romanProgression: string; // e.g. "i – VI – III – VII"
  patternName?: string; // e.g. "Aeolian 4-Chord Loop"
  chords: ChordEvent[];
}

export interface HarmonicBreakdown {
  key: string; // e.g. "Bb minor"
  scaleType: "minor" | "major" | "dorian" | "mixolydian";
  camelot: string; // e.g. "3A"
  relativeKey: string; // e.g. "Db major (3B)"
  dominantCadence: string; // e.g. "F7 -> Bbm (V - i)"
  progressionSummary: string; // e.g. "i – VI – III – VII"
  patternArchetype?: string; // e.g. "Modern Pop Minor Loop"
  sections: SectionHarmony[];
  overallChords: ChordEvent[];
}

export type InstrumentId = "drums" | "bass" | "keys" | "guitars" | "synths" | "strings" | "vocals";

export interface InstrumentInfo {
  id: InstrumentId;
  name: string;
  icon: string;
  category: "Rhythm" | "Harmonic" | "Melodic" | "Vocal";
  freqRange: string; // e.g. "30 Hz – 180 Hz"
  confidencePct: number; // 0..100
  mixSharePct: number; // 0..100
  detected: boolean;
  timbreDescription: string;
}

export interface SectionInstruments {
  sectionLabel: string;
  start: number;
  end: number;
  activeInstruments: InstrumentId[];
  density: number; // count of active instruments
  layeringDescription: string;
}

export interface ChannelPattern {
  id: string;
  num: string;
  name: string;
  category: "all" | "drums" | "chords" | "synths" | "strings";
  color: string;
  glow: string;
  pan: number;
  vol: number;
  family: string;
  steps: boolean[];
  description: string;
}

export interface SectionPatternMap {
  sectionLabel: string;
  patternNumber: string;
  channels: ChannelPattern[];
}

export interface InstrumentBreakdown {
  dominantFamily: string;
  detectedCount: number;
  instruments: InstrumentInfo[];
  sectionMatrix: SectionInstruments[];
  arrangementPacing: string;
  sectionPatterns?: Record<string, ChannelPattern[]>;
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
    source: ReportSource;
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
  harmonics?: HarmonicBreakdown | null;
  instruments?: InstrumentBreakdown | null;
  lyrics: LyricsBlock | null;
  audioError: string | null;
  /** Informational, by-design limitation (e.g. official embed, no stream decoding) — not a failure. */
  audioNote: string | null;
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
