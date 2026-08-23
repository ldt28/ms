import type {
  InstrumentBreakdown,
  InstrumentId,
  InstrumentInfo,
  ReportData,
  Section,
  SectionInstruments,
} from "./types";
import { generateDynamicPatterns } from "./patternEngine";

export const INSTRUMENT_DEFINITIONS: Record<
  InstrumentId,
  { name: string; icon: string; category: "Rhythm" | "Harmonic" | "Melodic" | "Vocal"; freqRange: string }
> = {
  drums: { name: "Drums & Percussion", icon: "🥁", category: "Rhythm", freqRange: "40 Hz – 12 kHz (Transient)" },
  bass: { name: "Bass & Sub-Bass", icon: "🎸", category: "Harmonic", freqRange: "30 Hz – 250 Hz" },
  keys: { name: "Piano & Keyboards", icon: "🎹", category: "Harmonic", freqRange: "100 Hz – 4.5 kHz" },
  guitars: { name: "Acoustic & Electric Guitars", icon: "🎸", category: "Harmonic", freqRange: "150 Hz – 6 kHz" },
  synths: { name: "Synthesizers & Leads", icon: "🎛️", category: "Melodic", freqRange: "200 Hz – 10 kHz" },
  strings: { name: "Strings & Orchestral", icon: "🎻", category: "Melodic", freqRange: "300 Hz – 8 kHz" },
  vocals: { name: "Lead & Backing Vocals", icon: "🎙️", category: "Vocal", freqRange: "250 Hz – 4 kHz (Formants)" },
};

/**
 * Heuristic DSP and structural classifier to identify active instruments and build section matrix.
 */
export function detectInstruments(report: ReportData): InstrumentBreakdown {
  const { texture, lyrics, energy, sections, tempo } = report;

  const bassRatio = texture?.bassRatio.value ?? 0.35;
  const brightness = texture?.brightnessHz.value ?? 3200;
  const onsetRate = texture?.onsetRate.value ?? 3.5;
  const hasLyrics = !!lyrics && lyrics.wordCount > 0;
  const avgEnergy = energy?.avg ?? 0.5;

  // 1. Calculate Presence & Mix Share for each instrument
  // Drums: correlated with onset density & high dynamic range
  const drumsConfidence = Math.min(98, Math.max(35, Math.round(onsetRate * 22 + (avgEnergy > 0.4 ? 20 : 5))));

  // Bass: correlated with low-frequency energy ratio
  const bassConfidence = Math.min(98, Math.max(30, Math.round(bassRatio * 180 + 20)));

  // Vocals: correlated with presence of lyrics/transcript and mid-frequency energy
  const vocalsConfidence = hasLyrics ? 94 : brightness > 2500 && onsetRate > 2 ? 65 : 35;

  // Keys & Synths: based on spectral centroid & harmonic key presence
  const synthsConfidence = brightness > 3800 ? 88 : brightness > 2800 ? 76 : 52;
  const keysConfidence = brightness <= 3800 && brightness >= 1800 ? 82 : 60;
  const guitarsConfidence = onsetRate >= 2.8 && brightness >= 2200 && brightness <= 4500 ? 78 : 55;
  const stringsConfidence = avgEnergy > 0.6 && brightness > 3000 ? 68 : 42;

  const rawConfidences: Record<InstrumentId, number> = {
    drums: drumsConfidence,
    bass: bassConfidence,
    keys: keysConfidence,
    guitars: guitarsConfidence,
    synths: synthsConfidence,
    strings: stringsConfidence,
    vocals: vocalsConfidence,
  };

  // Timbre Descriptions
  const timbres: Record<InstrumentId, string> = {
    drums: onsetRate > 4.5 ? "Fast electronic 16th-note rhythm & punchy kick" : "Steady acoustic backbeat & snare snap",
    bass: bassRatio > 0.4 ? "Deep saturated sub-bass & 808 foundation" : "Clean articulate bassline & root notes",
    keys: brightness < 3000 ? "Warm Rhodes electric piano chords" : "Crisp acoustic grand piano chords",
    guitars: "Rhythm strumming & mid-range chord accompaniment",
    synths: brightness > 4000 ? "Bright sawtooth lead & high-frequency arps" : "Warm analog polyphonic pads",
    strings: "Smooth orchestral sustained accents",
    vocals: hasLyrics ? "Present lead vocals with distinct syllable cadence" : "Melodic vocal chops / vocal synth textures",
  };

  // Sum for mix share normalization
  let totalConf = 0;
  Object.values(rawConfidences).forEach((c) => (totalConf += c));

  const instruments: InstrumentInfo[] = (Object.keys(INSTRUMENT_DEFINITIONS) as InstrumentId[]).map((id) => {
    const def = INSTRUMENT_DEFINITIONS[id];
    const conf = rawConfidences[id];
    const mixShare = Math.round((conf / totalConf) * 100);
    const detected = conf >= 50;

    return {
      id,
      name: def.name,
      icon: def.icon,
      category: def.category,
      freqRange: def.freqRange,
      confidencePct: conf,
      mixSharePct: mixShare,
      detected,
      timbreDescription: timbres[id],
    };
  });

  // Sort by mix share descending
  instruments.sort((a, b) => b.mixSharePct - a.mixSharePct);

  // 2. Build Section-by-Section Instrumentation Matrix
  const defaultSections =
    sections.length > 0
      ? sections
      : [
          { start: 0, end: 15, label: "Intro", tier: "estimated" as const, avgEnergy: 0.3 },
          { start: 15, end: 45, label: "Verse", tier: "estimated" as const, avgEnergy: 0.5 },
          { start: 45, end: 85, label: "Chorus", tier: "estimated" as const, avgEnergy: 0.85 },
          { start: 85, end: 110, label: "Bridge", tier: "estimated" as const, avgEnergy: 0.6 },
          { start: 110, end: 130, label: "Outro", tier: "estimated" as const, avgEnergy: 0.35 },
        ];

  const sectionMatrix: SectionInstruments[] = defaultSections.map((s) => {
    const label = s.label.toLowerCase();
    const active: InstrumentId[] = [];

    if (label.includes("intro")) {
      active.push("keys");
      if (synthsConfidence > 70) active.push("synths");
      if (hasLyrics && vocalsConfidence > 70) active.push("vocals");
    } else if (label.includes("verse")) {
      active.push("drums", "bass", "vocals");
      if (keysConfidence > 65) active.push("keys");
      if (guitarsConfidence > 70) active.push("guitars");
    } else if (label.includes("chorus") || label.includes("hook")) {
      // Chorus has full instrumentation explosion
      active.push("drums", "bass", "vocals", "synths");
      if (guitarsConfidence >= 60) active.push("guitars");
      if (keysConfidence >= 60) active.push("keys");
      if (stringsConfidence >= 60) active.push("strings");
    } else if (label.includes("bridge") || label.includes("build")) {
      active.push("vocals", "synths", "strings");
      if (s.avgEnergy > 0.6) active.push("drums");
    } else if (label.includes("outro")) {
      active.push("drums", "bass", "keys");
    } else {
      active.push("drums", "bass", "vocals", "keys");
    }

    const uniqueActive = Array.from(new Set(active));

    let layeringDesc = "Sparse intro foundation";
    if (uniqueActive.length >= 5) layeringDesc = "Full wall-of-sound arrangement";
    else if (uniqueActive.length >= 4) layeringDesc = "Dynamic layered rhythm & leads";
    else if (uniqueActive.length >= 3) layeringDesc = "Focused core groove & lead";

    return {
      sectionLabel: s.label,
      start: s.start,
      end: s.end,
      activeInstruments: uniqueActive,
      density: uniqueActive.length,
      layeringDescription: layeringDesc,
    };
  });

  const dominantFamily = instruments[0]?.name || "Drums & Bass";
  const detectedCount = instruments.filter((i) => i.detected).length;
  const sectionPatterns = generateDynamicPatterns(report);

  return {
    dominantFamily,
    detectedCount,
    instruments,
    sectionMatrix,
    arrangementPacing: `${detectedCount} instrument layers with progressive build-up into Chorus`,
    sectionPatterns,
  };
}
