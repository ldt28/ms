import React from "react";
import { playAuditionSound } from "../lib/patternEngine";

interface PianoRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
  keySignature: string;
  stepNotes?: (string | null)[];
}

const PIANO_OCTAVES = [5, 4, 3, 2];
const NOTE_NAMES = ["B", "A#", "A", "G#", "G", "F#", "F", "E", "D#", "D", "C#", "C"];

export function PianoRollModal({
  isOpen,
  onClose,
  channelName,
  keySignature,
  stepNotes = [],
}: PianoRollModalProps) {
  if (!isOpen) return null;

  const handlePlayKey = (noteWithOctave: string) => {
    playAuditionSound("piano_chords", noteWithOctave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none font-mono">
      <div className="hud-panel w-full max-w-4xl rounded-2xl border border-cyanx/40 bg-[#0a0d16] p-5 sm:p-7 shadow-2xl flex flex-col gap-4 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-purple-500/50 bg-purple-500/20 text-purple-400 text-lg shadow-md">
              🎹
            </span>
            <div>
              <span className="kicker text-cyanx">FL STUDIO PIANO ROLL // CHORD & NOTE INSPECTOR</span>
              <h3 className="font-display text-lg font-black text-ink">{channelName}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded bg-pit border border-amber/40 px-2.5 py-1 text-[11px] font-bold text-amber">
              KEY: {keySignature}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg border border-white/10 bg-pit text-faint hover:text-ink hover:border-rosex transition cursor-pointer flex items-center justify-center font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 16-Step Grid Active Chord / Note Summary */}
        <div className="rounded-xl border border-white/10 bg-[#06080e] p-3">
          <div className="text-[10px] font-bold text-faint mb-2 uppercase tracking-wider">
            16-Step Pattern Notes Layout
          </div>
          <div className="grid grid-cols-16 gap-1 text-center text-[9px]">
            {[...Array(16)].map((_, idx) => {
              const note = stepNotes[idx];
              const isDownbeat = idx % 4 === 0;
              return (
                <div
                  key={idx}
                  onClick={() => note && handlePlayKey(note)}
                  className={`h-10 rounded border flex flex-col items-center justify-center transition cursor-pointer ${
                    note
                      ? "border-purple-500 bg-purple-500/20 text-white font-bold shadow-md shadow-purple-500/20 hover:scale-105 hover:bg-purple-500/40"
                      : isDownbeat
                      ? "border-white/10 bg-pit/80 text-faint"
                      : "border-white/5 bg-pit/40 text-faint/50"
                  }`}
                >
                  <span className="text-[8px] text-faint">{idx + 1}</span>
                  <span className="truncate max-w-full px-0.5">{note || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Virtual Keyboard & Piano Roll Grid */}
        <div className="rounded-xl border border-white/10 bg-[#05070c] p-3 max-h-72 overflow-y-auto flex flex-col gap-1">
          {PIANO_OCTAVES.flatMap((oct) =>
            NOTE_NAMES.map((n) => {
              const fullNote = `${n}${oct}`;
              const isSharp = n.includes("#");
              const isRoot = keySignature.toLowerCase().includes(n.toLowerCase());
              const isHitInSteps = stepNotes.some((s) => s && s.includes(n));

              return (
                <div
                  key={fullNote}
                  onClick={() => handlePlayKey(fullNote)}
                  className={`flex items-center gap-2 px-2 py-1 rounded transition cursor-pointer ${
                    isHitInSteps
                      ? "bg-purple-900/30 border border-purple-500/40 shadow-xs"
                      : "hover:bg-white/5"
                  }`}
                >
                  {/* Piano Key */}
                  <div
                    className={`w-14 shrink-0 rounded px-2 py-0.5 text-center font-bold text-[10px] border transition ${
                      isSharp
                        ? "bg-[#161a24] text-dim border-white/10 hover:bg-[#202738]"
                        : "bg-[#e5e9f0] text-black border-white/80 hover:bg-white"
                    } ${isRoot ? "ring-2 ring-amber font-black" : ""}`}
                  >
                    {fullNote}
                  </div>

                  {/* 16-Step Velocity Lane */}
                  <div className="flex-1 grid grid-cols-16 gap-1">
                    {[...Array(16)].map((_, sIdx) => {
                      const noteOnThisStep = stepNotes[sIdx];
                      const isMatchingStep = noteOnThisStep && noteOnThisStep.includes(n);

                      return (
                        <div
                          key={sIdx}
                          className={`h-4 rounded-[2px] transition ${
                            isMatchingStep
                              ? "bg-purple-500 border border-purple-300 shadow-sm shadow-purple-500/50"
                              : sIdx % 4 === 0
                              ? "bg-white/5"
                              : "bg-white/[0.02]"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-[10.5px] text-faint">
          <span>Click any key or step to audition polyphonic notes with WebAudio synthesis</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cyanx px-4 py-1.5 font-bold text-black hover:bg-white transition cursor-pointer"
          >
            CLOSE INSPECTOR
          </button>
        </div>
      </div>
    </div>
  );
}
