import { useState } from "react";
import type { ChordEvent, HarmonicBreakdown } from "../lib/types";
import { formatTime } from "../lib/types";

interface ChordTrackProps {
  harmonics: HarmonicBreakdown;
  duration: number;
  playTime: number;
  onSeek: (time: number) => void;
}

export function ChordTrack({ harmonics, duration, playTime, onSeek }: ChordTrackProps) {
  const [hoveredChord, setHoveredChord] = useState<ChordEvent | null>(null);

  const chords = harmonics.overallChords;
  if (!chords || chords.length === 0 || duration <= 0) return null;

  return (
    <div className="relative mt-2">
      {/* Chord Track Label & Summary */}
      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px]">
        <span className="flex items-center gap-1.5 text-dim font-bold tracking-wider uppercase">
          <span>🎹</span>
          <span>ESTIMATED CHORD PROGRESSION</span>
        </span>
        <span className="text-amber font-semibold">
          {harmonics.progressionSummary} ({harmonics.key})
        </span>
      </div>

      {/* Interactive Chord Sequence Bar */}
      <div className="relative flex h-11 w-full overflow-hidden rounded-lg border border-line bg-pit/90 select-none">
        {chords.map((chord, i) => {
          const chordDuration = chord.end - chord.start;
          const leftPct = (chord.start / duration) * 100;
          const widthPct = (chordDuration / duration) * 100;
          const isActive = playTime >= chord.start && playTime < chord.end;

          const colorTheme = getChordColor(chord.roman);

          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(chord.start);
              }}
              onMouseEnter={() => setHoveredChord(chord)}
              onMouseLeave={() => setHoveredChord(null)}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
              }}
              className={`absolute top-0 bottom-0 flex flex-col items-center justify-center border-r border-line/70 px-1 transition-all cursor-pointer ${
                isActive
                  ? "bg-amber/25 shadow-inner shadow-amber/40 border-amber/80 z-10"
                  : "hover:bg-surface/90 hover:brightness-110"
              }`}
              title={`${chord.name} (${chord.roman}) · ${formatTime(chord.start)} – ${formatTime(chord.end)}\nNotes: ${chord.notes.join(" – ")}`}
            >
              {/* Active Indicator Pip */}
              {isActive && (
                <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-amber shadow-sm shadow-amber animate-pulse" />
              )}

              {/* Chord Name */}
              <span
                className={`font-mono text-xs font-bold leading-tight truncate ${
                  isActive ? "text-ink scale-105" : colorTheme.text
                }`}
              >
                {chord.name}
              </span>

              {/* Roman Numeral */}
              <span className="font-mono text-[9px] font-semibold text-dim tracking-tight">
                {chord.roman}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hovered Chord Note Voicing Tooltip */}
      {hoveredChord && (
        <div className="mt-1.5 flex items-center justify-between rounded-md border border-cyanx/30 bg-cyanx/10 px-3 py-1.5 font-mono text-[11px] text-cyanx animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">{hoveredChord.name} ({hoveredChord.roman})</span>
            <span className="text-dim">·</span>
            <span>Notes: <strong className="text-white">{hoveredChord.notes.join(" – ")}</strong></span>
          </div>
          <span className="text-[10px] text-faint">
            {formatTime(hoveredChord.start)} – {formatTime(hoveredChord.end)} · Click to jump
          </span>
        </div>
      )}
    </div>
  );
}

function getChordColor(roman: string): { text: string } {
  const r = roman.toLowerCase();
  if (r === "i") return { text: "text-mint font-bold" };
  if (r === "iv" || r === "vi") return { text: "text-cyanx" };
  if (r === "v" || r === "vii") return { text: "text-amber" };
  if (r === "iii") return { text: "text-[#a855f7]" };
  return { text: "text-ink" };
}
