import React, { useRef, useState } from "react";
import type { InstrumentBreakdown, ReportData, Section } from "../lib/types";
import { formatTime } from "../lib/types";
import { labelColor } from "./Timeline";

interface FullSongDAWMapProps {
  report: ReportData;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (timeSec: number) => void;
}

interface TrackLaneDef {
  id: string;
  num: string;
  name: string;
  icon: string;
  color: string;
  bgGrad: string;
  activeSections: (sectionLabel: string) => boolean;
  patternName: (sectionLabel: string) => string;
}

const DAW_LANES: TrackLaneDef[] = [
  {
    id: "drums",
    num: "TRK 01",
    name: "Drums & 808",
    icon: "🥁",
    color: "#ff5555",
    bgGrad: "from-[#ff5555]/30 to-[#ff5555]/10",
    activeSections: (label) => !/intro|bridge|outro/i.test(label) || /drop|chorus|hook/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "Full 808 & Kick Drop" : "Main Trap / Drum Beat"),
  },
  {
    id: "bass",
    num: "TRK 02",
    name: "Sub-Bass & 808",
    icon: "🎸",
    color: "#00e5ff",
    bgGrad: "from-[#00e5ff]/30 to-[#00e5ff]/10",
    activeSections: (label) => !/intro/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "Heavy Sub & Slide 808" : "Verse Bassline Groove"),
  },
  {
    id: "keys",
    num: "TRK 03",
    name: "Keys & Chords",
    icon: "🎹",
    color: "#b388ff",
    bgGrad: "from-[#b388ff]/30 to-[#b388ff]/10",
    activeSections: () => true,
    patternName: (label) => (/verse/i.test(label) ? "Piano Arp & Pad" : "Full Harmonic Chords"),
  },
  {
    id: "synths",
    num: "TRK 04",
    name: "Synths & Leads",
    icon: "🎛️",
    color: "#00d2be",
    bgGrad: "from-[#00d2be]/30 to-[#00d2be]/10",
    activeSections: (label) => /chorus|hook|drop|outro/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "Main Hook Lead Synth" : "Pluck & Counter Melody"),
  },
  {
    id: "vocals",
    num: "TRK 05",
    name: "Lead Vocals",
    icon: "🎙️",
    color: "#ff4081",
    bgGrad: "from-[#ff4081]/30 to-[#ff4081]/10",
    activeSections: (label) => !/intro|outro/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "Hook / Main Stanza" : "Verse Vocal Cadence"),
  },
  {
    id: "fx",
    num: "TRK 06",
    name: "Strings & FX",
    icon: "🎻",
    color: "#ffb300",
    bgGrad: "from-[#ffb300]/30 to-[#ffb300]/10",
    activeSections: (label) => /intro|pre|bridge|outro/i.test(label),
    patternName: (label) => (/pre|build/i.test(label) ? "Riser & Sweep FX" : "Ambient String Pad"),
  },
];

export function FullSongDAWMap({
  report,
  currentTime,
  duration,
  isPlaying,
  onSeek,
}: FullSongDAWMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const safeDuration = duration > 0 ? duration : 180;
  const sections: Section[] =
    report.sections && report.sections.length > 0
      ? report.sections
      : [
          { label: "Intro", start: 0, end: safeDuration * 0.1, avgEnergy: 0.4, tier: "guessed" },
          { label: "Verse 1", start: safeDuration * 0.1, end: safeDuration * 0.35, avgEnergy: 0.65, tier: "guessed" },
          { label: "Chorus", start: safeDuration * 0.35, end: safeDuration * 0.55, avgEnergy: 0.9, tier: "guessed" },
          { label: "Verse 2", start: safeDuration * 0.55, end: safeDuration * 0.75, avgEnergy: 0.7, tier: "guessed" },
          { label: "Chorus", start: safeDuration * 0.75, end: safeDuration * 0.9, avgEnergy: 0.92, tier: "guessed" },
          { label: "Outro", start: safeDuration * 0.9, end: safeDuration, avgEnergy: 0.5, tier: "guessed" },
        ];

  const currentPlayPct = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const targetSec = (x / rect.width) * safeDuration;
    onSeek(targetSec);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverTime((x / rect.width) * safeDuration);
  };

  return (
    <div className="panel ticks relative overflow-hidden p-4 sm:p-6 flex flex-col gap-4 select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-linesoft pb-3">
        <div>
          <div className="kicker text-cyanx">FL Studio Playlist · Full Song Arrangement Map</div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
            <span>Multi-Track Stem & Section Arrangement</span>
            <span className="rounded-full bg-surface border border-line px-2.5 py-0.5 font-mono text-xs text-dim">
              0:00 – {formatTime(safeDuration)}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-linesoft bg-pit px-3 py-1.5 text-dim">
            <span className="h-2 w-2 rounded-full bg-mint animate-pulse" />
            <span>PLAYHEAD: {formatTime(currentTime)}</span>
          </div>
          <span className="text-[10px] text-faint hidden md:inline">Click timeline anywhere to seek</span>
        </div>
      </div>

      {/* Main DAW Multi-Track Arrangement View */}
      <div className="flex rounded-xl border border-[#262c37] bg-[#12151b] shadow-2xl overflow-hidden">
        {/* Left Track Headers Column */}
        <div className="w-36 sm:w-44 shrink-0 border-r border-[#262c37] bg-[#171b22] flex flex-col">
          {/* Top ruler placeholder */}
          <div className="h-9 border-b border-[#262c37] px-3 flex items-center font-mono text-[10px] font-bold text-faint tracking-wider">
            TRACK / STEM
          </div>

          {/* Lane Labels */}
          {DAW_LANES.map((lane) => (
            <div
              key={lane.id}
              className="h-11 border-b border-[#222731] px-2.5 sm:px-3 flex items-center justify-between transition-colors hover:bg-[#1f242d]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{lane.icon}</span>
                <div className="min-w-0">
                  <div className="font-mono text-[9px] text-faint font-semibold">{lane.num}</div>
                  <div className="font-mono text-[11px] font-bold truncate text-ink">
                    {lane.name}
                  </div>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: lane.color }} />
            </div>
          ))}
        </div>

        {/* Right Arrangement Playlist Grid */}
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          className="relative flex-1 overflow-x-hidden flex flex-col cursor-crosshair"
        >
          {/* 1. Top Section & Time Ruler */}
          <div className="relative h-9 border-b border-[#262c37] bg-[#1a1f27] flex items-center">
            {sections.map((sec, idx) => {
              const startPct = (sec.start / safeDuration) * 100;
              const widthPct = ((sec.end - sec.start) / safeDuration) * 100;
              const isCurrentSection = currentTime >= sec.start && currentTime < sec.end;

              return (
                <div
                  key={idx}
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  className={`absolute inset-y-0 border-r border-[#2b3340] px-2 flex items-center justify-between text-[10px] font-mono font-bold transition-colors ${
                    isCurrentSection ? "bg-amber/20 text-amber" : "text-dim hover:text-ink"
                  }`}
                >
                  <span className="truncate uppercase">[{sec.label}]</span>
                  <span className="text-[8.5px] text-faint hidden sm:inline">{formatTime(sec.start)}</span>
                </div>
              );
            })}
          </div>

          {/* 2. Multi-Track Lane Rows */}
          {DAW_LANES.map((lane) => (
            <div
              key={lane.id}
              className="relative h-11 border-b border-[#222731] bg-[#12151b] flex items-center overflow-hidden"
            >
              {/* Subtle background measure beat grid */}
              <div className="absolute inset-0 grid grid-cols-12 pointer-events-none opacity-10 divide-x divide-white" />

              {/* Section Pattern Blocks */}
              {sections.map((sec, sIdx) => {
                const startPct = (sec.start / safeDuration) * 100;
                const widthPct = ((sec.end - sec.start) / safeDuration) * 100;
                const isActive = lane.activeSections(sec.label);

                if (!isActive) {
                  return (
                    <div
                      key={sIdx}
                      style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                      className="absolute inset-y-1 rounded border border-dashed border-[#262c37]/50 bg-transparent flex items-center justify-center pointer-events-none"
                    >
                      <span className="font-mono text-[8.5px] text-faint/30">MUTE</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={sIdx}
                    style={{
                      left: `calc(${startPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      borderColor: `${lane.color}70`,
                    }}
                    className={`absolute inset-y-1 rounded-md border bg-gradient-to-r ${lane.bgGrad} px-2 flex items-center justify-between overflow-hidden shadow-xs transition-all`}
                  >
                    {/* Simulated mini waveform or sequencer blocks */}
                    <div className="flex items-center gap-0.5 opacity-60 pointer-events-none">
                      <span className="h-3 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-5 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-2 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-4 w-1 rounded-xs" style={{ background: lane.color }} />
                    </div>

                    <span
                      className="font-mono text-[9.5px] font-bold truncate ml-1.5"
                      style={{ color: lane.color }}
                    >
                      {lane.patternName(sec.label)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* 3. Sweeping Playhead Line */}
          <div
            style={{ left: `${currentPlayPct}%` }}
            className="absolute inset-y-0 w-[2px] bg-amber shadow-lg shadow-amber/60 z-20 pointer-events-none transition-all duration-75"
          >
            <div className="absolute top-0 -left-6 bg-amber text-black font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* 4. Mouse Hover Timestamp Indicator */}
          {hoverTime !== null && (
            <div
              style={{ left: `${(hoverTime / safeDuration) * 100}%` }}
              className="absolute inset-y-0 w-[1px] bg-cyanx/70 z-10 pointer-events-none"
            >
              <div className="absolute bottom-1 -left-5 bg-pit border border-cyanx text-cyanx font-mono text-[9px] px-1 py-0.5 rounded">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Breakdown Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-linesoft pt-2 font-mono text-xs text-dim">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#ff5555]" />
            <span className="text-[11px]">Rhythm Stems</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#00e5ff]" />
            <span className="text-[11px]">Bass / 808</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#b388ff]" />
            <span className="text-[11px]">Chords & Keys</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#ff4081]" />
            <span className="text-[11px]">Vocal Tracks</span>
          </span>
        </div>

        <span className="text-mint font-bold text-[11px]">
          ● 60 FPS Real-Time Playhead Tracking
        </span>
      </div>
    </div>
  );
}
