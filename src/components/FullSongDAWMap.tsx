import React, { useRef, useState } from "react";
import type { ReportData, Section } from "../lib/types";
import { formatTime } from "../lib/types";

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
  glowColor: string;
  bgGrad: string;
  activeSections: (sectionLabel: string) => boolean;
  patternName: (sectionLabel: string) => string;
}

const DAW_LANES: TrackLaneDef[] = [
  {
    id: "drums",
    num: "01",
    name: "Drums & 808",
    icon: "🥁",
    color: "#ff3366",
    glowColor: "rgba(255, 51, 102, 0.6)",
    bgGrad: "from-[#ff3366]/35 via-[#ff3366]/20 to-[#ff3366]/5",
    activeSections: (label) => !/intro|bridge|outro/i.test(label) || /drop|chorus|hook/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "HEAVY 808 & TRAP DROP" : "DRUM BEAT PATTERN 1"),
  },
  {
    id: "bass",
    num: "02",
    name: "Sub-Bass & 808",
    icon: "🎸",
    color: "#00f0ff",
    glowColor: "rgba(0, 240, 255, 0.6)",
    bgGrad: "from-[#00f0ff]/35 via-[#00f0ff]/20 to-[#00f0ff]/5",
    activeSections: (label) => !/intro/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "SUB GLIDE & 808 SLIDES" : "VERSE BASSLINE GROOVE"),
  },
  {
    id: "keys",
    num: "03",
    name: "Keys & Chords",
    icon: "🎹",
    color: "#b026ff",
    glowColor: "rgba(176, 38, 255, 0.6)",
    bgGrad: "from-[#b026ff]/35 via-[#b026ff]/20 to-[#b026ff]/5",
    activeSections: () => true,
    patternName: (label) => (/verse/i.test(label) ? "PIANO ARPEGGIO & VOICINGS" : "FULL 7TH CHORD PROGRESSION"),
  },
  {
    id: "synths",
    num: "04",
    name: "Synths & Leads",
    icon: "⚡",
    color: "#00ff9d",
    glowColor: "rgba(0, 255, 157, 0.6)",
    bgGrad: "from-[#00ff9d]/35 via-[#00ff9d]/20 to-[#00ff9d]/5",
    activeSections: (label) => /chorus|hook|drop|outro/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "MAIN TOPLINE LEAD SYNTH" : "1/16 PLUCK COUNTER-MELODY"),
  },
  {
    id: "vocals",
    num: "05",
    name: "Lead Vocals",
    icon: "🎙️",
    color: "#ff007f",
    glowColor: "rgba(255, 0, 127, 0.6)",
    bgGrad: "from-[#ff007f]/35 via-[#ff007f]/20 to-[#ff007f]/5",
    activeSections: (label) => !/intro|outro/i.test(label),
    patternName: (label) => (/chorus|hook/i.test(label) ? "MAIN HOOK VOCAL STACK" : "VERSE VOCAL CADENCE"),
  },
  {
    id: "fx",
    num: "06",
    name: "Strings & FX",
    icon: "🎻",
    color: "#ffaa00",
    glowColor: "rgba(255, 170, 0, 0.6)",
    bgGrad: "from-[#ffaa00]/35 via-[#ffaa00]/20 to-[#ffaa00]/5",
    activeSections: (label) => /intro|pre|bridge|outro/i.test(label),
    patternName: (label) => (/pre|build/i.test(label) ? "TENSION RISER & SWEEP" : "ORCHESTRAL STRING SWELL"),
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
    <div className="hud-panel relative overflow-hidden p-4 sm:p-6 flex flex-col gap-4 select-none border border-cyanx/20 shadow-2xl">
      {/* Sci-Fi HUD Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-cyanx/50 bg-cyanx/10 text-cyanx shadow-xs">
            🎛️
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-cyanx tracking-[0.25em]">ARRANGE.MATRIX // STEM ROUTING</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-pulse" />
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-ink flex items-center gap-2.5">
              <span>Full-Song Multi-Track DAW Matrix</span>
              <span className="rounded-full bg-pit border border-white/10 px-2.5 py-0.5 font-mono text-[11px] text-cyanx font-bold shadow-inner">
                0:00 – {formatTime(safeDuration)}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-2 rounded-lg border border-amber/40 bg-pit/90 px-3 py-1.5 text-amber shadow-sm shadow-amber/10">
            <span className="h-2 w-2 rounded-full bg-amber animate-ping" />
            <span className="font-bold tracking-wider">POS: {formatTime(currentTime)}</span>
          </div>
          <span className="text-[10px] text-faint hidden md:inline font-mono">
            [CLICK ANY BAR TO SEEK]
          </span>
        </div>
      </div>

      {/* Main Futuristic DAW Arrangement Matrix */}
      <div className="flex rounded-xl border border-white/10 bg-[#090c12] shadow-2xl overflow-hidden relative">
        {/* Left Track Headers Column */}
        <div className="w-36 sm:w-48 shrink-0 border-r border-white/10 bg-[#0e121a] flex flex-col">
          {/* Top ruler placeholder */}
          <div className="h-10 border-b border-white/10 px-3 flex items-center justify-between font-mono text-[10px] font-bold text-faint tracking-widest bg-[#131722]">
            <span>STEM / CH</span>
            <span className="text-[9px] text-cyanx/70">ROUTING</span>
          </div>

          {/* Lane Labels */}
          {DAW_LANES.map((lane) => (
            <div
              key={lane.id}
              className="h-12 border-b border-white/5 px-3 flex items-center justify-between transition-all hover:bg-white/[0.03] group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm drop-shadow">{lane.icon}</span>
                <div className="min-w-0">
                  <div className="font-mono text-[9px] text-faint font-bold tracking-wider">
                    CH {lane.num}
                  </div>
                  <div
                    className="font-mono text-xs font-bold truncate transition-colors"
                    style={{ color: lane.color }}
                  >
                    {lane.name}
                  </div>
                </div>
              </div>

              {/* Glowing LED status dot */}
              <span
                className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                style={{ background: lane.color, boxShadow: `0 0 8px ${lane.color}` }}
              />
            </div>
          ))}
        </div>

        {/* Right Arrangement Playlist Grid */}
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          className="relative flex-1 overflow-x-hidden flex flex-col cursor-crosshair bg-[#06080d]"
        >
          {/* 1. Top Section & Time Ruler */}
          <div className="relative h-10 border-b border-white/10 bg-[#10141d] flex items-center">
            {sections.map((sec, idx) => {
              const startPct = (sec.start / safeDuration) * 100;
              const widthPct = ((sec.end - sec.start) / safeDuration) * 100;
              const isCurrentSection = currentTime >= sec.start && currentTime < sec.end;

              return (
                <div
                  key={idx}
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  className={`absolute inset-y-0 border-r border-white/10 px-2.5 flex items-center justify-between text-[10px] font-mono font-bold transition-all ${
                    isCurrentSection
                      ? "bg-amber/25 text-amber shadow-inner border-t-2 border-t-amber"
                      : "text-dim hover:text-ink hover:bg-white/[0.02]"
                  }`}
                >
                  <span className="truncate uppercase tracking-wider font-extrabold flex items-center gap-1">
                    {isCurrentSection && <span className="h-1.5 w-1.5 rounded-full bg-amber animate-ping" />}
                    [{sec.label}]
                  </span>
                  <span className="text-[9px] text-faint hidden lg:inline font-normal">
                    {formatTime(sec.start)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 2. Multi-Track Lane Rows */}
          {DAW_LANES.map((lane) => (
            <div
              key={lane.id}
              className="relative h-12 border-b border-white/5 bg-[#070a0f] flex items-center overflow-hidden"
            >
              {/* Subtle background beat grid */}
              <div className="absolute inset-0 grid grid-cols-16 pointer-events-none opacity-15 divide-x divide-white/20" />

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
                      className="absolute inset-y-1.5 rounded border border-dashed border-white/10 bg-black/20 flex items-center justify-center pointer-events-none"
                    >
                      <span className="font-mono text-[8.5px] text-faint/40 tracking-widest">MUTE</span>
                    </div>
                  );
                }

                return (
                  <div
                    key={sIdx}
                    style={{
                      left: `calc(${startPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      borderColor: lane.color,
                      boxShadow: `0 0 12px -2px ${lane.glowColor}`,
                    }}
                    className={`absolute inset-y-1.5 rounded-lg border bg-gradient-to-r ${lane.bgGrad} px-2.5 flex items-center justify-between overflow-hidden shadow-lg transition-all backdrop-blur-xs`}
                  >
                    {/* Simulated laser step velocity lines */}
                    <div className="flex items-end gap-0.5 opacity-80 pointer-events-none h-4">
                      <span className="h-2 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-4 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-3 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-5 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-3 w-1 rounded-xs" style={{ background: lane.color }} />
                      <span className="h-4 w-1 rounded-xs" style={{ background: lane.color }} />
                    </div>

                    <span
                      className="font-mono text-[10px] font-extrabold truncate ml-2 tracking-wide drop-shadow"
                      style={{ color: lane.color }}
                    >
                      {lane.patternName(sec.label)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}

          {/* 3. Sweeping Laser Playhead Line */}
          <div
            style={{
              left: `${currentPlayPct}%`,
              boxShadow: "0 0 16px 2px #ffaa00, 0 0 30px 4px rgba(255, 170, 0, 0.4)",
            }}
            className="absolute inset-y-0 w-[2px] bg-amber shadow-2xl z-30 pointer-events-none transition-all duration-75"
          >
            <div className="absolute top-0 -left-6 bg-amber text-black font-mono text-[9px] font-black px-1.5 py-0.5 rounded shadow-lg tracking-wider">
              {formatTime(currentTime)}
            </div>
          </div>

          {/* 4. Mouse Hover Timestamp Indicator */}
          {hoverTime !== null && (
            <div
              style={{
                left: `${(hoverTime / safeDuration) * 100}%`,
                boxShadow: "0 0 10px 1px #00f0ff",
              }}
              className="absolute inset-y-0 w-[1px] bg-cyanx/80 z-20 pointer-events-none"
            >
              <div className="absolute bottom-1.5 -left-6 bg-pit border border-cyanx text-cyanx font-mono text-[9.5px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Breakdown Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 font-mono text-xs text-dim">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#ff3366] shadow-xs shadow-[#ff3366]" />
            <span className="text-[11px] font-bold">Rhythm & 808</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#00f0ff] shadow-xs shadow-[#00f0ff]" />
            <span className="text-[11px] font-bold">Sub & Glides</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#b026ff] shadow-xs shadow-[#b026ff]" />
            <span className="text-[11px] font-bold">Keys & Chords</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#ff007f] shadow-xs shadow-[#ff007f]" />
            <span className="text-[11px] font-bold">Vocal Stacks</span>
          </span>
        </div>

        <span className="text-mint font-bold text-[11px] flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-mint animate-ping" />
          <span>60 FPS HARDWARE ACCELERATED PLAYHEAD</span>
        </span>
      </div>
    </div>
  );
}
