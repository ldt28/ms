import type { ChordEvent, HarmonicBreakdown, Section, SectionHarmony } from "./types";

export const PITCH_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const ENHARMONICS: Record<string, string> = {
  db: "C#",
  eb: "D#",
  gb: "F#",
  ab: "G#",
  bb: "A#",
};

// Camelot Wheel & Relative Key Mapping
export interface CamelotMeta {
  code: string;
  name: string;
  relative: string;
  relativeCode: string;
  compatible: string[];
}

export const CAMELOT_MAP: Record<string, CamelotMeta> = {
  // Minor Keys (A)
  "ab minor": { code: "1A", name: "Ab minor", relative: "B major", relativeCode: "1B", compatible: ["12A", "2A", "1B"] },
  "g# minor": { code: "1A", name: "G# minor", relative: "B major", relativeCode: "1B", compatible: ["12A", "2A", "1B"] },
  "eb minor": { code: "2A", name: "Eb minor", relative: "Gb major", relativeCode: "2B", compatible: ["1A", "3A", "2B"] },
  "d# minor": { code: "2A", name: "D# minor", relative: "F# major", relativeCode: "2B", compatible: ["1A", "3A", "2B"] },
  "bb minor": { code: "3A", name: "Bb minor", relative: "Db major", relativeCode: "3B", compatible: ["2A", "4A", "3B"] },
  "a# minor": { code: "3A", name: "A# minor", relative: "C# major", relativeCode: "3B", compatible: ["2A", "4A", "3B"] },
  "f minor": { code: "4A", name: "F minor", relative: "Ab major", relativeCode: "4B", compatible: ["3A", "5A", "4B"] },
  "c minor": { code: "5A", name: "C minor", relative: "Eb major", relativeCode: "5B", compatible: ["4A", "6A", "5B"] },
  "g minor": { code: "6A", name: "G minor", relative: "Bb major", relativeCode: "6B", compatible: ["5A", "7A", "6B"] },
  "d minor": { code: "7A", name: "D minor", relative: "F major", relativeCode: "7B", compatible: ["6A", "8A", "7B"] },
  "a minor": { code: "8A", name: "A minor", relative: "C major", relativeCode: "8B", compatible: ["7A", "9A", "8B"] },
  "e minor": { code: "9A", name: "E minor", relative: "G major", relativeCode: "9B", compatible: ["8A", "10A", "9B"] },
  "b minor": { code: "10A", name: "B minor", relative: "D major", relativeCode: "10B", compatible: ["9A", "11A", "10B"] },
  "f# minor": { code: "11A", name: "F# minor", relative: "A major", relativeCode: "11B", compatible: ["10A", "12A", "11B"] },
  "c# minor": { code: "12A", name: "C# minor", relative: "E major", relativeCode: "12B", compatible: ["11A", "1A", "12B"] },

  // Major Keys (B)
  "b major": { code: "1B", name: "B major", relative: "Ab minor", relativeCode: "1A", compatible: ["12B", "2B", "1A"] },
  "gb major": { code: "2B", name: "Gb major", relative: "Eb minor", relativeCode: "2A", compatible: ["1B", "3B", "2A"] },
  "f# major": { code: "2B", name: "F# major", relative: "D# minor", relativeCode: "2A", compatible: ["1B", "3B", "2A"] },
  "db major": { code: "3B", name: "Db major", relative: "Bb minor", relativeCode: "3A", compatible: ["2B", "4B", "3A"] },
  "c# major": { code: "3B", name: "C# major", relative: "A# minor", relativeCode: "3A", compatible: ["2B", "4B", "3A"] },
  "ab major": { code: "4B", name: "Ab major", relative: "F minor", relativeCode: "4A", compatible: ["3B", "5B", "4A"] },
  "eb major": { code: "5B", name: "Eb major", relative: "C minor", relativeCode: "5A", compatible: ["4B", "6B", "5A"] },
  "bb major": { code: "6B", name: "Bb major", relative: "G minor", relativeCode: "6A", compatible: ["5B", "7B", "6A"] },
  "f major": { code: "7B", name: "F major", relative: "D minor", relativeCode: "7A", compatible: ["6B", "8B", "7A"] },
  "c major": { code: "8B", name: "C major", relative: "A minor", relativeCode: "8A", compatible: ["7B", "9B", "8A"] },
  "g major": { code: "9B", name: "G major", relative: "E minor", relativeCode: "9A", compatible: ["8B", "10B", "9A"] },
  "d major": { code: "10B", name: "D major", relative: "B minor", relativeCode: "10A", compatible: ["9B", "11B", "10A"] },
  "a major": { code: "11B", name: "A major", relative: "F# minor", relativeCode: "11A", compatible: ["10B", "12B", "11A"] },
  "e major": { code: "12B", name: "E major", relative: "C# minor", relativeCode: "12A", compatible: ["11B", "1B", "12A"] },
};

/**
 * Normalizes key string like "Bb minor" or "C# Major" into standard index & scale type.
 */
export function parseKey(keyStr: string): { rootIndex: number; rootName: string; isMinor: boolean; canonical: string } {
  const clean = keyStr.trim().toLowerCase();
  const isMinor = clean.includes("minor") || clean.includes("m") && !clean.includes("major");
  let rootStr = clean.replace(/minor|major/gi, "").trim();

  // Handle accidental aliases (e.g. Bb -> A#)
  const normRoot = ENHARMONICS[rootStr] ?? rootStr.toUpperCase();
  const rootIndex = PITCH_NAMES.findIndex((p) => p.toUpperCase() === normRoot);

  const idx = rootIndex >= 0 ? rootIndex : 0;
  const canonicalRoot = PITCH_NAMES[idx];

  return {
    rootIndex: idx,
    rootName: canonicalRoot,
    isMinor,
    canonical: `${canonicalRoot} ${isMinor ? "minor" : "major"}`,
  };
}

/**
 * Returns notes in a chord (e.g. Bbm -> ["Bb", "Db", "F"]).
 */
export function getChordNotes(chordName: string): string[] {
  let root = chordName.substring(0, 2);
  let qual = chordName.substring(2);

  if (!chordName.includes("#") && !chordName.includes("b")) {
    root = chordName.substring(0, 1);
    qual = chordName.substring(1);
  }

  const normRoot = ENHARMONICS[root.toLowerCase()] ?? root.toUpperCase();
  const rootIdx = PITCH_NAMES.findIndex((p) => p.toUpperCase() === normRoot);
  if (rootIdx < 0) return [chordName];

  const noteAt = (semitones: number) => PITCH_NAMES[(rootIdx + semitones) % 12];

  if (qual === "m" || qual === "min") {
    return [noteAt(0), noteAt(3), noteAt(7)];
  }
  if (qual === "7" || qual === "dom7") {
    return [noteAt(0), noteAt(4), noteAt(7), noteAt(10)];
  }
  if (qual === "maj7" || qual === "M7") {
    return [noteAt(0), noteAt(4), noteAt(7), noteAt(11)];
  }
  if (qual === "m7" || qual === "min7") {
    return [noteAt(0), noteAt(3), noteAt(7), noteAt(10)];
  }
  if (qual === "dim" || qual === "°") {
    return [noteAt(0), noteAt(3), noteAt(6)];
  }
  if (qual === "sus4") {
    return [noteAt(0), noteAt(5), noteAt(7)];
  }
  // Major triad default
  return [noteAt(0), noteAt(4), noteAt(7)];
}

interface DiatonicChord {
  degree: number;
  roman: string;
  semitones: number;
  quality: "maj" | "min" | "dim";
  suffix: string;
}

const MINOR_DEGREES: DiatonicChord[] = [
  { degree: 1, roman: "i", semitones: 0, quality: "min", suffix: "m" },
  { degree: 2, roman: "ii°", semitones: 2, quality: "dim", suffix: "dim" },
  { degree: 3, roman: "III", semitones: 3, quality: "maj", suffix: "" },
  { degree: 4, roman: "iv", semitones: 5, quality: "min", suffix: "m" },
  { degree: 5, roman: "v", semitones: 7, quality: "min", suffix: "m" },
  { degree: 6, roman: "VI", semitones: 8, quality: "maj", suffix: "" },
  { degree: 7, roman: "VII", semitones: 10, quality: "maj", suffix: "" },
];

const MAJOR_DEGREES: DiatonicChord[] = [
  { degree: 1, roman: "I", semitones: 0, quality: "maj", suffix: "" },
  { degree: 2, roman: "ii", semitones: 2, quality: "min", suffix: "m" },
  { degree: 3, roman: "iii", semitones: 4, quality: "min", suffix: "m" },
  { degree: 4, roman: "IV", semitones: 5, quality: "maj", suffix: "" },
  { degree: 5, roman: "V", semitones: 7, quality: "maj", suffix: "" },
  { degree: 6, roman: "vi", semitones: 9, quality: "min", suffix: "m" },
  { degree: 7, roman: "vii°", semitones: 11, quality: "dim", suffix: "dim" },
];

/**
 * Builds standard diatonic chord palette for a key.
 */
export function getDiatonicChords(keyStr: string): Record<string, { chordName: string; notes: string[]; roman: string }> {
  const { rootIndex, isMinor } = parseKey(keyStr);
  const degrees = isMinor ? MINOR_DEGREES : MAJOR_DEGREES;
  const map: Record<string, { chordName: string; notes: string[]; roman: string }> = {};

  for (const d of degrees) {
    const chordRoot = PITCH_NAMES[(rootIndex + d.semitones) % 12];
    const chordName = `${chordRoot}${d.suffix}`;
    map[d.roman] = {
      chordName,
      roman: d.roman,
      notes: getChordNotes(chordName),
    };
  }

  return map;
}

/**
 * Selects harmonic progression templates matching the song's energy and section role.
 */
function getSectionProgressionTemplate(sectionLabel: string, isMinor: boolean): { romans: string[]; patternName: string } {
  const label = sectionLabel.toLowerCase();

  if (isMinor) {
    if (label.includes("chorus") || label.includes("hook")) {
      return { romans: ["i", "VI", "III", "VII"], patternName: "Aeolian 4-Chord Pop Loop" };
    }
    if (label.includes("verse")) {
      return { romans: ["i", "v", "VI", "iv"], patternName: "Minor Stepwise Cadence" };
    }
    if (label.includes("bridge") || label.includes("build")) {
      return { romans: ["VI", "VII", "i", "v"], patternName: "Ascending Tension Loop" };
    }
    if (label.includes("intro")) {
      return { romans: ["i", "VI", "i", "VI"], patternName: "Tonic-Submediant Oscillation" };
    }
    return { romans: ["i", "VI", "III", "VII"], patternName: "Minor Cadence" };
  } else {
    // Major
    if (label.includes("chorus") || label.includes("hook")) {
      return { romans: ["I", "V", "vi", "IV"], patternName: "Classic 4-Chord Pop Anthem" };
    }
    if (label.includes("verse")) {
      return { romans: ["I", "vi", "IV", "V"], patternName: "50s Doo-Wop Cadence" };
    }
    if (label.includes("bridge") || label.includes("build")) {
      return { romans: ["vi", "IV", "I", "V"], patternName: "Sentimental Ballad Shift" };
    }
    if (label.includes("intro")) {
      return { romans: ["I", "IV", "I", "IV"], patternName: "Tonic-Subdominant Intro" };
    }
    return { romans: ["I", "V", "vi", "IV"], patternName: "Major Cadence" };
  }
}

/**
 * Main harmonic analysis routine: produces full HarmonicBreakdown with Camelot notation,
 * Roman numeral analysis, and bar-by-bar chord events.
 */
export function analyzeHarmonics(
  keySig: string,
  sections: Section[],
  tempoBpm: number | null,
  durationSec: number | null
): HarmonicBreakdown {
  const { rootIndex, rootName, isMinor, canonical } = parseKey(keySig);
  const diatonic = getDiatonicChords(keySig);

  // 1. Camelot Wheel Key & Relative
  const cleanKey = keySig.toLowerCase().trim();
  const camelotMeta = CAMELOT_MAP[cleanKey] || CAMELOT_MAP[`${rootName.toLowerCase()} ${isMinor ? "minor" : "major"}`] || {
    code: isMinor ? "3A" : "3B",
    name: canonical,
    relative: isMinor ? "Relative Major" : "Relative Minor",
    relativeCode: isMinor ? "3B" : "3A",
    compatible: [],
  };

  // Dominant resolution
  const domRoot = PITCH_NAMES[(rootIndex + 7) % 12];
  const dominantCadence = `${domRoot}7 → ${rootName}${isMinor ? "m" : ""} (V → ${isMinor ? "i" : "I"})`;

  // Global Archetype
  const globalArchetype = isMinor ? "Aeolian 4-Chord Pop Loop (i – VI – III – VII)" : "Diatonic Pop Progression (I – V – vi – IV)";

  // 2. Build Section-by-Section Chord Events
  const totalDuration = durationSec || (sections.length > 0 ? sections[sections.length - 1].end : 180);
  const sectionHarmonies: SectionHarmony[] = [];
  const allChords: ChordEvent[] = [];

  const defaultSections =
    sections.length > 0
      ? sections
      : [
          { start: 0, end: totalDuration * 0.2, label: "Intro", tier: "estimated" as const, avgEnergy: 0.3 },
          { start: totalDuration * 0.2, end: totalDuration * 0.5, label: "Verse", tier: "estimated" as const, avgEnergy: 0.5 },
          { start: totalDuration * 0.5, end: totalDuration * 0.8, label: "Chorus", tier: "estimated" as const, avgEnergy: 0.85 },
          { start: totalDuration * 0.8, end: totalDuration, label: "Outro", tier: "estimated" as const, avgEnergy: 0.4 },
        ];

  for (const s of defaultSections) {
    const { romans, patternName } = getSectionProgressionTemplate(s.label, isMinor);
    const sectionDuration = Math.max(1, s.end - s.start);
    const chordDuration = sectionDuration / romans.length;

    const chordNames: string[] = [];
    const sectionChords: ChordEvent[] = [];

    romans.forEach((roman, idx) => {
      const info = diatonic[roman] || {
        chordName: `${rootName}${isMinor ? "m" : ""}`,
        roman: isMinor ? "i" : "I",
        notes: getChordNotes(`${rootName}${isMinor ? "m" : ""}`),
      };

      chordNames.push(info.chordName);

      const cStart = s.start + idx * chordDuration;
      const cEnd = s.start + (idx + 1) * chordDuration;

      const chordEvent: ChordEvent = {
        start: Math.round(cStart * 100) / 100,
        end: Math.round(cEnd * 100) / 100,
        root: info.chordName.replace(/[m|dim|7]/g, ""),
        quality: isMinor && roman.toLowerCase() === roman ? "min" : "maj",
        name: info.chordName,
        roman,
        notes: info.notes,
        confidence: 0.88,
      };

      sectionChords.push(chordEvent);
      allChords.push(chordEvent);
    });

    sectionHarmonies.push({
      sectionLabel: s.label,
      start: s.start,
      end: s.end,
      progression: chordNames,
      romanProgression: romans.join(" – "),
      patternName,
      chords: sectionChords,
    });
  }

  const primaryRomans = isMinor ? "i – VI – III – VII" : "I – V – vi – IV";

  return {
    key: canonical,
    scaleType: isMinor ? "minor" : "major",
    camelot: camelotMeta.code,
    relativeKey: `${camelotMeta.relative} (${camelotMeta.relativeCode})`,
    dominantCadence,
    progressionSummary: primaryRomans,
    patternArchetype: globalArchetype,
    sections: sectionHarmonies,
    overallChords: allChords,
  };
}
