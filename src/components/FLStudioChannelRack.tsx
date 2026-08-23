import { useEffect, useState } from "react";
import type { InstrumentBreakdown } from "../lib/types";

interface FLStudioChannelRackProps {
  currentTime: number;
  isPlaying: boolean;
  activeSectionName?: string;
  instruments?: InstrumentBreakdown | null;
  onToggleTrack?: (trackName: string) => void;
}

interface ChannelDef {
  id: string;
  num: string;
  name: string;
  color: string;
  pan: number; // -100 to 100
  vol: number; // 0 to 100
  family: string;
  steps: boolean[]; // 16 steps
}

const DEFAULT_CHANNELS: ChannelDef[] = [
  {
    id: "drums_kick",
    num: "01",
    name: "Kick & 808",
    color: "#ff5555",
    pan: 0,
    vol: 85,
    family: "drums",
    steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  },
  {
    id: "drums_snare",
    num: "02",
    name: "Snare & Clap",
    color: "#ffb300",
    pan: 0,
    vol: 80,
    family: "drums",
    steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
  },
  {
    id: "drums_hat",
    num: "03",
    name: "Hi-Hat Roll",
    color: "#00d2be",
    pan: 15,
    vol: 75,
    family: "drums",
    steps: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
  },
  {
    id: "bass",
    num: "04",
    name: "Bassline / Sub",
    color: "#00e5ff",
    pan: 0,
    vol: 90,
    family: "bass",
    steps: [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, false],
  },
  {
    id: "harmony",
    num: "05",
    name: "Keys & Synth",
    color: "#b388ff",
    pan: -20,
    vol: 78,
    family: "keys",
    steps: [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false],
  },
  {
    id: "vocals",
    num: "06",
    name: "Lead Vocal",
    color: "#ff4081",
    pan: 0,
    vol: 88,
    family: "vocals",
    steps: [true, true, true, false, true, true, false, true, true, true, true, false, true, false, true, false],
  },
];

export function FLStudioChannelRack({
  currentTime,
  isPlaying,
  activeSectionName = "Verse",
  instruments,
}: FLStudioChannelRackProps) {
  const [mutedChannels, setMutedChannels] = useState<Record<string, boolean>>({});
  const [activeStep, setActiveStep] = useState(0);

  // Animate step sequencer based on playback time (approx 120 BPM = 2 beats/sec = 8 steps/sec)
  useEffect(() => {
    if (!isPlaying) return;
    const step = Math.floor((currentTime * 8) % 16);
    setActiveStep(step);
  }, [currentTime, isPlaying]);

  const toggleMute = (id: string) => {
    setMutedChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="rounded-xl border border-line bg-[#16191e] shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Top FL Studio DAW Toolbar */}
      <div className="flex items-center justify-between border-b border-[#282d37] bg-[#1d2128] px-3.5 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff7b00] shadow-sm shadow-[#ff7b00]" />
            <span className="font-display text-[11px] font-bold tracking-wider text-ink">
              FL STUDIO · CHANNEL RACK
            </span>
          </div>
          <span className="rounded bg-[#282d37] px-1.5 py-0.5 text-[9.5px] font-bold text-amber">
            PAT 1
          </span>
          <span className="rounded bg-[#282d37] px-1.5 py-0.5 text-[9.5px] text-cyanx">
            {activeSectionName.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-dim">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            <span>LIVE STEM MATRIX</span>
          </div>
        </div>
      </div>

      {/* Channel Rows */}
      <div className="divide-y divide-[#222730] p-2 flex flex-col gap-1.5">
        {DEFAULT_CHANNELS.map((ch) => {
          const isMuted = !!mutedChannels[ch.id];
          const isStemDetected = instruments?.instruments
            ? instruments.instruments.some((inst) => inst.id.toLowerCase().includes(ch.family.toLowerCase()) && inst.detected)
            : true;

          // Compute simulated live peak meter level
          const isStepTriggered = ch.steps[activeStep] && isPlaying && !isMuted && isStemDetected;
          const peakLevel = isStepTriggered
            ? Math.min(100, Math.floor(ch.vol * (0.75 + Math.random() * 0.3)))
            : isPlaying && !isMuted
            ? Math.floor(Math.random() * 25)
            : 0;

          return (
            <div
              key={ch.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                isMuted ? "opacity-40 bg-[#121418]" : "bg-[#1a1e24] hover:bg-[#20252d]"
              }`}
            >
              {/* Mute/Solo LED */}
              <button
                onClick={() => toggleMute(ch.id)}
                title={isMuted ? "Unmute Channel" : "Mute Channel"}
                className={`h-3.5 w-3.5 rounded-full border border-black/50 transition-all cursor-pointer ${
                  isMuted
                    ? "bg-dim/30 shadow-none"
                    : "bg-mint shadow-sm shadow-mint ring-1 ring-mint/40"
                }`}
              />

              {/* Track Number & Name */}
              <div className="flex items-center gap-1.5 w-28 shrink-0">
                <span className="text-[10px] text-faint font-bold">{ch.num}</span>
                <span
                  className="font-bold text-[11px] truncate"
                  style={{ color: ch.color }}
                >
                  {ch.name}
                </span>
              </div>

              {/* Pan & Vol dials representation */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-0.5" title={`Pan: ${ch.pan}`}>
                  <span className="text-[8.5px] text-faint">PAN</span>
                  <div className="h-3 w-3 rounded-full border border-line bg-pit flex items-center justify-center">
                    <div
                      className="h-1.5 w-0.5 bg-amber"
                      style={{ transform: `rotate(${ch.pan * 1.2}deg)` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-0.5" title={`Vol: ${ch.vol}%`}>
                  <span className="text-[8.5px] text-faint">VOL</span>
                  <div className="w-8 h-1.5 rounded-full bg-pit overflow-hidden border border-linesoft">
                    <div className="h-full bg-cyanx" style={{ width: `${ch.vol}%` }} />
                  </div>
                </div>
              </div>

              {/* Live LED Peak Meter */}
              <div className="w-14 shrink-0 flex items-center gap-0.5 px-1 bg-pit rounded py-1 border border-[#2b303c]">
                {[...Array(8)].map((_, segIdx) => {
                  const segThreshold = (segIdx / 8) * 100;
                  const isLit = peakLevel > segThreshold;
                  const isRed = segIdx >= 6;
                  const isYellow = segIdx >= 4 && segIdx < 6;

                  return (
                    <div
                      key={segIdx}
                      className={`h-2 flex-1 rounded-[1px] transition-all duration-75 ${
                        isLit
                          ? isRed
                            ? "bg-[#ff3333] shadow-xs shadow-[#ff3333]"
                            : isYellow
                            ? "bg-[#ffcc00] shadow-xs shadow-[#ffcc00]"
                            : "bg-[#00ff88] shadow-xs shadow-[#00ff88]"
                          : "bg-[#252a33]"
                      }`}
                    />
                  );
                })}
              </div>

              {/* 16-Step Trigger Sequencer Pad Strip */}
              <div className="flex-1 grid grid-cols-16 gap-1 min-w-[140px]">
                {ch.steps.map((isActiveStep, sIdx) => {
                  const isBeatQuarter = sIdx % 4 === 0;
                  const isCurrentlyPlayingThisStep = activeStep === sIdx && isPlaying;

                  return (
                    <div
                      key={sIdx}
                      className={`h-4 rounded-[2px] border transition-all ${
                        isCurrentlyPlayingThisStep
                          ? "ring-2 ring-white scale-105 z-10"
                          : ""
                      } ${
                        isActiveStep
                          ? isBeatQuarter
                            ? "bg-[#ff5555] border-[#ff7777] shadow-xs shadow-[#ff5555]/30"
                            : "bg-[#777777] border-[#888888]"
                          : isBeatQuarter
                          ? "bg-[#2c323d] border-[#383f4d]"
                          : "bg-[#1d2128] border-[#252a33]"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Notes */}
      <div className="border-t border-[#282d37] bg-[#12151a] px-3.5 py-1.5 flex items-center justify-between text-[10px] text-faint">
        <span>Channel Rack 120 BPM · 16 Steps / Beat</span>
        <span className="text-mint">● Dynamic Stem Separation Active</span>
      </div>
    </div>
  );
}
