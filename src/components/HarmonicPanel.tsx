import { useState } from "react";
import type { HarmonicBreakdown } from "../lib/types";
import { formatTime } from "../lib/types";
import { TierBadge } from "./ui";

interface HarmonicPanelProps {
  harmonics: HarmonicBreakdown;
  onSeek?: (time: number) => void;
}

export function HarmonicPanel({ harmonics, onSeek }: HarmonicPanelProps) {
  const [selectedChord, setSelectedChord] = useState<string | null>(null);

  return (
    <div className="panel ticks overflow-hidden px-5 py-5 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="kicker">03 · Harmonic Analysis & Chords</div>
          <h3 className="font-display text-lg leading-tight text-ink">
            Chord Progression & Musical Theory
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-amber/40 bg-amber/10 px-3 py-1 font-mono text-[11px] font-bold text-amber">
            CAMELOT: {harmonics.camelot}
          </span>
          <TierBadge tier="estimated" title="Diatonic progression inferred from DSP key signature and chromagram" />
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* 1. Key & Relative */}
        <div className="rounded-xl border border-linesoft bg-pit/70 p-4 flex flex-col justify-between">
          <div className="kicker">Diatonic Key & Relative</div>
          <div className="mt-2 font-mono text-2xl font-bold text-ink">{harmonics.key}</div>
          <div className="mt-2 font-mono text-xs text-dim">
            Relative: <strong className="text-cyanx">{harmonics.relativeKey}</strong>
          </div>
        </div>

        {/* 2. Primary Progression Archetype */}
        <div className="rounded-xl border border-linesoft bg-pit/70 p-4 flex flex-col justify-between">
          <div className="kicker">Harmonic Archetype</div>
          <div className="mt-2 font-mono text-xl font-bold text-amber">
            {harmonics.progressionSummary}
          </div>
          <div className="mt-2 font-mono text-[11px] text-dim truncate" title={harmonics.patternArchetype}>
            {harmonics.patternArchetype ?? "Pop Diatonic Cadence"}
          </div>
        </div>

        {/* 3. DJ Harmonic Mixing & Cadence */}
        <div className="rounded-xl border border-linesoft bg-pit/70 p-4 flex flex-col justify-between">
          <div className="kicker">Harmonic Mixing & Cadence</div>
          <div className="mt-2 font-mono text-sm font-bold text-mint">
            {harmonics.dominantCadence}
          </div>
          <div className="mt-2 font-mono text-[10.5px] text-faint">
            Wheel matches: ±1 Camelot semitone
          </div>
        </div>
      </div>

      {/* Section by Section Progression List */}
      <div>
        <div className="kicker mb-3">Section-by-Section Harmonic Breakdown</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {harmonics.sections.map((sec, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-linesoft bg-pit/80 p-4 transition hover:border-line"
            >
              <div className="flex items-center justify-between gap-2 border-b border-linesoft pb-2 mb-3">
                <span className="font-display text-sm font-bold text-ink tracking-wide">
                  {sec.sectionLabel.toUpperCase()}
                </span>
                <span className="font-mono text-xs text-dim">
                  {formatTime(sec.start)} – {formatTime(sec.end)}
                </span>
              </div>

              {/* Chords Sequence Chips */}
              <div className="flex flex-wrap gap-2 mb-2">
                {sec.chords.map((chord, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => {
                      setSelectedChord(chord.name);
                      if (onSeek) onSeek(chord.start);
                    }}
                    className={`flex flex-col items-center rounded-lg border px-3 py-1.5 font-mono transition cursor-pointer ${
                      selectedChord === chord.name
                        ? "border-amber bg-amber/20 text-amber shadow-sm shadow-amber/20"
                        : "border-line bg-surface text-ink hover:border-cyanx hover:text-cyanx"
                    }`}
                    title={`Click to jump to ${formatTime(chord.start)}\nNotes: ${chord.notes.join(" – ")}`}
                  >
                    <span className="text-xs font-bold leading-none">{chord.name}</span>
                    <span className="text-[9px] text-dim">{chord.roman}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-faint">
                <span>{sec.patternName || "Standard loop"}</span>
                <span>{sec.romanProgression}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
