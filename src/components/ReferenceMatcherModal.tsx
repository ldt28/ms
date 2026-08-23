import React, { useState } from "react";
import type { ReportData } from "../lib/types";
import { liveAudioGraph, type EqBands } from "../lib/liveAudioGraph";

interface ReferenceMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportData;
}

interface ReferencePreset {
  id: string;
  name: string;
  artist: string;
  genre: string;
  targetBands: EqBands;
  targetLufs: number;
  description: string;
}

const REFERENCE_PRESETS: ReferencePreset[] = [
  {
    id: "billboard_pop",
    name: "Modern Billboard Pop Hit",
    artist: "Dua Lipa / The Weeknd Reference",
    genre: "Pop / Dance",
    targetBands: { bass: 2.0, lowMid: -1.0, vocalMid: 2.0, treble: 3.5 },
    targetLufs: -8.5,
    description: "Punchy, clean low-end with tight 808s and crystal-clear airy top end vocals.",
  },
  {
    id: "metro_trap",
    name: "Heavy 808 Trap Master",
    artist: "Metro Boomin / Travis Scott Reference",
    genre: "Hip-Hop / Trap",
    targetBands: { bass: 5.5, lowMid: -2.5, vocalMid: 1.0, treble: 2.5 },
    targetLufs: -7.8,
    description: "Maximum sub-bass saturation, hollowed low-mids for vocal room, sharp hi-hat presence.",
  },
  {
    id: "synthwave_retro",
    name: "Cyberpunk Synthwave Master",
    artist: "Daft Punk / Kavinsky Reference",
    genre: "Synthwave / Electronic",
    targetBands: { bass: 3.0, lowMid: 1.5, vocalMid: 1.5, treble: 2.0 },
    targetLufs: -9.0,
    description: "Warm analog warmth, wide stereo chorus pads, and vintage tape saturation curves.",
  },
  {
    id: "indie_rock",
    name: "Modern Indie & Alt-Rock",
    artist: "Arctic Monkeys / Tame Impala Reference",
    genre: "Indie / Rock",
    targetBands: { bass: 1.0, lowMid: 2.0, vocalMid: 0.5, treble: 1.0 },
    targetLufs: -10.5,
    description: "Rich drum dynamics, gritty guitar midrange, and natural, uncompressed transients.",
  },
];

export function ReferenceMatcherModal({
  isOpen,
  onClose,
  report,
}: ReferenceMatcherModalProps) {
  const [selectedRefId, setSelectedRefId] = useState<string>("billboard_pop");
  const [appliedMsg, setAppliedMsg] = useState(false);

  if (!isOpen) return null;

  const currentRef = REFERENCE_PRESETS.find((r) => r.id === selectedRefId) || REFERENCE_PRESETS[0];

  const dynamicRange = report.energy?.dynamicRangeDb ?? 10;
  const userCurrentBands: EqBands = {
    bass: Number(((12 - dynamicRange) * 0.4).toFixed(1)),
    lowMid: 0.0,
    vocalMid: 0.5,
    treble: 1.0,
  };

  // Compute Match EQ Delta
  const matchEqBands: EqBands = {
    bass: Number((currentRef.targetBands.bass - userCurrentBands.bass).toFixed(1)),
    lowMid: Number((currentRef.targetBands.lowMid - userCurrentBands.lowMid).toFixed(1)),
    vocalMid: Number((currentRef.targetBands.vocalMid - userCurrentBands.vocalMid).toFixed(1)),
    treble: Number((currentRef.targetBands.treble - userCurrentBands.treble).toFixed(1)),
  };

  const handleApplyMatchEq = () => {
    liveAudioGraph.setBands(matchEqBands);
    setAppliedMsg(true);
    setTimeout(() => setAppliedMsg(false), 2500);
  };

  const bandDefs = [
    { key: "bass" as const, label: "Sub & Bass (100Hz)", user: userCurrentBands.bass, ref: currentRef.targetBands.bass, delta: matchEqBands.bass, color: "#ff3366" },
    { key: "lowMid" as const, label: "Low-Mid & Mud (500Hz)", user: userCurrentBands.lowMid, ref: currentRef.targetBands.lowMid, delta: matchEqBands.lowMid, color: "#00f0ff" },
    { key: "vocalMid" as const, label: "Vocal Clarity (2.5kHz)", user: userCurrentBands.vocalMid, ref: currentRef.targetBands.vocalMid, delta: matchEqBands.vocalMid, color: "#00ff9d" },
    { key: "treble" as const, label: "High & Air (8kHz)", user: userCurrentBands.treble, ref: currentRef.targetBands.treble, delta: matchEqBands.treble, color: "#ffaa00" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono select-none">
      <div className="hud-panel relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyanx/30 bg-[#0a0e17] p-6 shadow-2xl flex flex-col gap-5 text-ink">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyanx/50 bg-cyanx/10 text-cyanx text-lg shadow-xs">
              🎚️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="kicker text-cyanx tracking-[0.25em]">REFERENCE.ENGINE // A/B MATCH EQ</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-pulse" />
              </div>
              <h2 className="font-display text-xl font-bold text-ink">
                Reference Track A/B Matcher & Spectral Balancing
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-pit text-faint hover:text-ink hover:border-white/30 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Reference Preset Selector */}
        <div>
          <span className="kicker mb-2 block text-dim">1. SELECT COMMERCIAL REFERENCE TARGET</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {REFERENCE_PRESETS.map((preset) => {
              const isSelected = selectedRefId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedRefId(preset.id)}
                  className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition cursor-pointer ${
                    isSelected
                      ? "border-cyanx bg-cyanx/15 ring-1 ring-cyanx shadow-md shadow-cyanx/20"
                      : "border-white/10 bg-[#0d121c] hover:border-cyanx/40 hover:bg-[#121824]"
                  }`}
                >
                  <span className="font-bold text-xs text-ink truncate">{preset.name}</span>
                  <span className="text-[10px] text-cyanx truncate">{preset.artist}</span>
                  <span className="text-[9px] text-dim">{preset.genre} · {preset.targetLufs} LUFS</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* A/B Frequency Band Split Comparison */}
        <div className="rounded-xl border border-white/10 bg-[#070a10] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <span className="kicker text-amber tracking-wider">2. FREQUENCY BAND ENERGY DEFICIT & MATCH EQ DELTA</span>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyanx" />
                <span className="text-dim">Your Mix</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber" />
                <span className="text-dim">Reference Target</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 my-1">
            {bandDefs.map((b) => {
              const isBoost = b.delta > 0;
              const isCut = b.delta < 0;

              return (
                <div key={b.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[#0e131d] border border-white/5">
                  <div className="w-56 shrink-0">
                    <span className="font-bold text-xs block text-ink">{b.label}</span>
                    <span className="text-[9.5px] text-dim">Current: {b.user > 0 ? `+${b.user}` : b.user}dB · Target: {b.ref > 0 ? `+${b.ref}` : b.ref}dB</span>
                  </div>

                  {/* Visual delta bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <div className="flex-1 h-3 bg-[#05070a] rounded-full overflow-hidden relative border border-white/10 flex items-center">
                      <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/30 z-10" />
                      <div
                        style={{
                          left: b.delta < 0 ? `calc(50% + ${b.delta * 7}%)` : "50%",
                          width: `${Math.min(50, Math.abs(b.delta) * 7)}%`,
                          background: b.color,
                          boxShadow: `0 0 10px ${b.color}`,
                        }}
                        className="h-full rounded-xs transition-all duration-300"
                      />
                    </div>

                    <span
                      className={`w-20 text-right font-bold text-xs ${
                        isBoost ? "text-mint" : isCut ? "text-rosex" : "text-faint"
                      }`}
                    >
                      {b.delta > 0 ? `+${b.delta} dB` : b.delta === 0 ? "0.0 dB" : `${b.delta} dB`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Mix Recommendation Card */}
        <div className="rounded-xl border border-amber/30 bg-amber/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="kicker text-amber flex items-center gap-1.5">
              <span>💡</span>
              <span>AI PRODUCER MIX MATCH RECOMMENDATION</span>
            </span>
            <p className="text-xs text-dim mt-1 leading-relaxed">
              To match <strong className="text-ink">{currentRef.name}</strong>, apply <strong className="text-mint">{matchEqBands.treble > 0 ? `+${matchEqBands.treble}dB Treble` : `${matchEqBands.treble}dB Treble`}</strong> and <strong className="text-rosex">{matchEqBands.lowMid < 0 ? `${matchEqBands.lowMid}dB Low-Mid Cut` : `+${matchEqBands.lowMid}dB Low-Mid`}</strong> to clear mud and enhance radio presence.
            </p>
          </div>

          <button
            onClick={handleApplyMatchEq}
            className="shrink-0 flex items-center gap-2 rounded-xl border border-mint/60 bg-mint/15 px-4 py-2.5 font-bold text-xs text-mint shadow-md shadow-mint/20 hover:bg-mint hover:text-black transition cursor-pointer"
          >
            <span>{appliedMsg ? "✓ APPLIED TO LIVE EQ" : "⚡ APPLY MATCH EQ CURVE"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
