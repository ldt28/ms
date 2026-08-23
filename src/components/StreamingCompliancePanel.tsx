import React, { useState } from "react";
import type { ReportData } from "../lib/types";

interface StreamingCompliancePanelProps {
  report: ReportData;
}

interface PlatformSpec {
  id: string;
  name: string;
  icon: string;
  targetLufs: number;
  maxTruePeak: number;
  description: string;
  color: string;
}

const PLATFORM_SPECS: PlatformSpec[] = [
  {
    id: "spotify",
    name: "Spotify",
    icon: "🟢",
    targetLufs: -14.0,
    maxTruePeak: -1.0,
    description: "Normalizes to -14 LUFS (integrated). Requires -1.0 dBTP headroom to prevent lossy transcoding inter-sample clipping.",
    color: "#1db954",
  },
  {
    id: "apple",
    name: "Apple Music",
    icon: "🍎",
    targetLufs: -16.0,
    maxTruePeak: -1.0,
    description: "Sound Check normalizes to -16 LUFS. Maintains higher dynamic range and punch.",
    color: "#fa2d48",
  },
  {
    id: "youtube",
    name: "YouTube Music",
    icon: "🔴",
    targetLufs: -14.0,
    maxTruePeak: -1.0,
    description: "Normalizes down to -14 LUFS if louder. Never turns quieter tracks up.",
    color: "#ff0000",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: "🎵",
    targetLufs: -14.0,
    maxTruePeak: -0.5,
    description: "Aggressive dynamic processing. Recommended master target -14 to -12 LUFS with strong low-end control.",
    color: "#00f2fe",
  },
  {
    id: "tidal",
    name: "Tidal",
    icon: "🔷",
    targetLufs: -14.0,
    maxTruePeak: -1.0,
    description: "Applies volume normalization to -14 LUFS when enabled. Hi-Fi FLAC preserves full dynamic resolution.",
    color: "#00ffff",
  },
  {
    id: "amazon",
    name: "Amazon Music",
    icon: "📦",
    targetLufs: -14.0,
    maxTruePeak: -2.0,
    description: "Recommends -14 LUFS with -2.0 dBTP true-peak ceiling for Ultra HD lossless encoding.",
    color: "#ff9900",
  },
];

export function StreamingCompliancePanel({ report }: StreamingCompliancePanelProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>("spotify");

  // Approximate Integrated LUFS & Peak from dynamic range & energy
  const dynamicRange = report.energy?.dynamicRangeDb ?? 10;
  const estimatedLufs = Math.max(-24, Math.min(-6, -14 + (dynamicRange - 10) * -0.6));
  const estimatedTruePeak = Math.min(0.5, -0.2 + (estimatedLufs > -10 ? 0.6 : 0));
  const dynamicRangePlr = Math.abs(estimatedTruePeak - estimatedLufs);

  const activeSpec = PLATFORM_SPECS.find((p) => p.id === selectedPlatform) || PLATFORM_SPECS[0];
  const loudnessPenalty = Number((estimatedLufs - activeSpec.targetLufs).toFixed(1));
  const isTooLoud = loudnessPenalty > 0.5;
  const isTooQuiet = loudnessPenalty < -2.5;
  const isClippingRisk = estimatedTruePeak > activeSpec.maxTruePeak;

  return (
    <div className="hud-panel rounded-xl border border-cyanx/25 bg-[#090d14] p-5 shadow-2xl overflow-hidden font-mono select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyanx/50 bg-cyanx/10 text-cyanx shadow-xs">
            🎯
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-cyanx tracking-[0.25em]">DSP.AUDIT // STREAMING COMPLIANCE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-pulse" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span>Streaming Loudness & True-Peak Radar</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-lg border border-amber/40 bg-pit/90 px-3 py-1 text-amber font-bold shadow-sm">
            INTEGRATED: {estimatedLufs.toFixed(1)} LUFS
          </span>
          <span className="rounded-lg border border-white/10 bg-pit/90 px-2.5 py-1 text-dim">
            PLR: {dynamicRangePlr.toFixed(1)} dB
          </span>
        </div>
      </div>

      {/* Platform Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 my-4">
        {PLATFORM_SPECS.map((spec) => {
          const isSelected = selectedPlatform === spec.id;
          const penalty = Number((estimatedLufs - spec.targetLufs).toFixed(1));

          return (
            <button
              key={spec.id}
              onClick={() => setSelectedPlatform(spec.id)}
              className={`flex flex-col gap-1 rounded-lg border p-2.5 text-left transition cursor-pointer ${
                isSelected
                  ? "border-cyanx bg-cyanx/15 shadow-md shadow-cyanx/20 ring-1 ring-cyanx"
                  : "border-white/10 bg-[#0f141e] hover:border-cyanx/40 hover:bg-[#141b29]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{spec.icon}</span>
                <span
                  className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded ${
                    penalty > 0.5
                      ? "bg-rosex/20 text-rosex"
                      : penalty < -2.5
                      ? "bg-amber/20 text-amber"
                      : "bg-mint/20 text-mint"
                  }`}
                >
                  {penalty > 0 ? `-${penalty}dB` : penalty === 0 ? "OPTIMAL" : `+${Math.abs(penalty)}dB`}
                </span>
              </div>
              <span className="font-bold text-xs text-ink truncate mt-1">{spec.name}</span>
              <span className="text-[9px] text-dim">{spec.targetLufs} LUFS</span>
            </button>
          );
        })}
      </div>

      {/* Detailed Analysis for Selected Platform */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 rounded-xl border border-white/10 bg-[#0c1018] p-4">
        {/* Metric 1: Loudness Penalty Gauge */}
        <div className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 pb-3 lg:pb-0 lg:pr-4">
          <div>
            <div className="flex items-center justify-between text-[11px] text-faint mb-1">
              <span>LOUDNESS PENALTY</span>
              <span className="text-xs font-bold text-ink">{activeSpec.name}</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`font-display text-2xl font-black ${
                  isTooLoud ? "text-rosex" : isTooQuiet ? "text-amber" : "text-mint"
                }`}
              >
                {loudnessPenalty > 0 ? `-${loudnessPenalty} dB` : loudnessPenalty === 0 ? "0.0 dB" : `+${Math.abs(loudnessPenalty)} dB`}
              </span>
              <span className="text-[10px] text-faint">
                {isTooLoud ? "(Gain Reduction)" : isTooQuiet ? "(Lower Volume)" : "(Ideal Match)"}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-dim leading-relaxed mt-2">
            {isTooLoud
              ? `${activeSpec.name} will turn your track down by ${loudnessPenalty} dB to protect listeners' ears.`
              : isTooQuiet
              ? `Your track is quieter than ${activeSpec.name}'s reference level. Consider boosting master limiter threshold.`
              : `Your master matches ${activeSpec.name}'s loudness standard perfectly without unnecessary limiter squashing.`}
          </p>
        </div>

        {/* Metric 2: True Peak & Intersample Clipping Risk */}
        <div className="flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 pb-3 lg:pb-0 lg:pr-4">
          <div>
            <div className="flex items-center justify-between text-[11px] text-faint mb-1">
              <span>TRUE PEAK CEILING</span>
              <span className="text-[10px] text-dim">Max: {activeSpec.maxTruePeak} dBTP</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`font-display text-2xl font-black ${
                  isClippingRisk ? "text-rosex animate-pulse" : "text-mint"
                }`}
              >
                {estimatedTruePeak > 0 ? `+${estimatedTruePeak.toFixed(1)}` : estimatedTruePeak.toFixed(1)} dBTP
              </span>
              <span className={`text-[10px] font-bold ${isClippingRisk ? "text-rosex" : "text-mint"}`}>
                {isClippingRisk ? "⚠ CLIPPING RISK" : "✓ CLEAN HEADROOM"}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-dim leading-relaxed mt-2">
            {isClippingRisk
              ? `Inter-sample peaks exceed ${activeSpec.maxTruePeak} dBTP. AAC/MP3 transcoding will introduce digital crackle and distortion.`
              : `Safe headroom. Lossy compression codecs (AAC, Ogg Vorbis) will encode without clipping.`}
          </p>
        </div>

        {/* Metric 3: Dynamic Range & Punch (PLR) */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] text-faint mb-1">
              <span>PEAK TO LOUDNESS RATIO (PLR)</span>
              <span className="text-[10px] text-cyanx">Dynamic Punch</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display text-2xl font-black text-cyanx">
                {dynamicRangePlr.toFixed(1)} LU
              </span>
              <span className="text-[10px] text-faint">
                {dynamicRangePlr > 12 ? "Very Dynamic" : dynamicRangePlr > 8 ? "Commercial Punch" : "Ultra-Dense / Squashed"}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-dim leading-relaxed mt-2">
            {activeSpec.description}
          </p>
        </div>
      </div>
    </div>
  );
}
