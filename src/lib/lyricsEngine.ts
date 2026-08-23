/**
 * Signal — lyrics metrics engine.
 * Deterministic text statistics: rhyme density (suffix heuristic), lexical
 * diversity, syllable flow, and repeated-line hook detection.
 * Full lyrics are NEVER redisplayed — hooks return short fragments only.
 */

import type { Finding, Hook, LyricsBlock } from "./types";

export class LyricsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "LyricsError";
    this.code = code;
  }
}

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 1;
  if (w.endsWith("e") && !w.endsWith("le") && n > 1) n--;
  if (w.endsWith("ed") && n > 1 && w.length > 3) n--;
  return Math.max(1, n);
}

/** Naive end-rhyme signature: stripped spelling tail of the last word. */
function endSound(line: string): string {
  const words = line.toLowerCase().replace(/[^a-z'\s]/g, "").split(/\s+/).filter(Boolean);
  let w = words[words.length - 1] ?? "";
  if (w.length <= 3) return w;
  if (w.endsWith("es")) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.endsWith("e") && !w.endsWith("ee")) w = w.slice(0, -1);
  return w.slice(-3);
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max).trimEnd()}…` : s;
}

export function analyzeLyrics(
  text: string,
  opts: { durationSec: number | null; source: "pasted" | "transcript" }
): LyricsBlock {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new LyricsError("lyrics_error", "Need at least two non-empty lines of lyrics to compute metrics.");
  }

  let totalWords = 0;
  let totalSyll = 0;
  const tokenSet = new Set<string>();
  const endGroups = new Map<string, number>();
  const lineCounts = new Map<string, { count: number; display: string }>();
  const perLineSyll: number[] = [];

  for (const line of lines) {
    const tokens = line.toLowerCase().match(/[a-z']+/g) ?? [];
    totalWords += tokens.length;
    let lineSyll = 0;
    for (const t of tokens) {
      tokenSet.add(t);
      lineSyll += syllables(t);
    }
    totalSyll += lineSyll;
    perLineSyll.push(lineSyll);

    const sig = endSound(line);
    if (sig) endGroups.set(sig, (endGroups.get(sig) ?? 0) + 1);

    const norm = line.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    if (norm) {
      const prev = lineCounts.get(norm);
      if (prev) prev.count++;
      else lineCounts.set(norm, { count: 1, display: line });
    }
  }

  let rhymingLines = 0;
  for (const line of lines) {
    const sig = endSound(line);
    if (sig && (endGroups.get(sig) ?? 0) >= 2) rhymingLines++;
  }
  const rhymeDensity = lines.length ? rhymingLines / lines.length : 0;

  const diversity = totalWords ? tokenSet.size / totalWords : 0;
  const avgSyll = lines.length ? totalSyll / lines.length : 0;

  const flowValue =
    opts.durationSec && opts.durationSec > 0 ? Math.round((totalSyll / opts.durationSec) * 100) / 100 : null;

  const hooks: Hook[] = [...lineCounts.values()]
    .filter((v) => v.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((v) => ({ fragment: truncate(v.display, 64), count: v.count }));

  const mk = (value: number, source: string, note?: string): Finding<number> => ({
    value,
    tier: "computed",
    source,
    note,
  });

  return {
    source: opts.source,
    wordCount: totalWords,
    lineCount: lines.length,
    rhymeDensity: {
      ...mk(Math.round(rhymeDensity * 1000) / 1000, "end-rhyme suffix heuristic"),
      note: "Matches spelling endings, not phonetics — treat as an approximation.",
    },
    diversity: mk(Math.round(diversity * 1000) / 1000, "type–token ratio", "Unique words ÷ total words."),
    avgSyllPerLine: mk(Math.round(avgSyll * 100) / 100, "vowel-group syllable count"),
    flow: {
      value: flowValue,
      tier: "computed",
      source: "syllables ÷ track duration",
      note: flowValue === null ? "Needs an audio duration." : undefined,
    },
    hooks,
    rawText: text,
  };
}
