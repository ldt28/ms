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
  category: "all" | "drums" | "chords" | "synths" | "strings";
  color: string;
  pan: number;
  vol: number;
  family: string;
  steps: boolean[];
  description: string;
}

const PATTERN_CATEGORIES = [
  { id: "all", label: "🎛️ ALL STEMS" },
  { id: "drums", label: "🥁 DRUM PATTERNS" },
  { id: "chords", label: "🎹 CHORDS & KEYS" },
  { id: "synths", label: "⚡ SYNTHS & LEADS" },
  { id: "strings", label: "🎻 STRINGS & FX" },
] as const;

type PatternCategory = (typeof PATTERN_CATEGORIES)[number]["id"];

const MASTER_CHANNELS: ChannelDef[] = [
  // 1. Drums
  {
    id: "kick_808",
    num: "01",
    name: "Kick & 808",
    category: "drums",
    color: "#ff5555",
    pan: 0,
    vol: 90,
    family: "drums",
    steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    description: "4-on-the-floor / Trap punch on beats 1 & 3",
  },
  {
    id: "snare_clap",
    num: "02",
    name: "Snare & Clap",
    category: "drums",
    color: "#ffaa00",
    pan: 0,
    vol: 85,
    family: "drums",
    steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    description: "Main backbeat on beats 2 & 4",
  },
  {
    id: "hihat_roll",
    num: "03",
    name: "Hi-Hat Rolls",
    category: "drums",
    color: "#00d2be",
    pan: 15,
    vol: 78,
    family: "drums",
    steps: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    description: "16th note division with triplet velocity rolls",
  },
  {
    id: "perc_open",
    num: "04",
    name: "Open Hat & Perc",
    category: "drums",
    color: "#ffcc00",
    pan: -15,
    vol: 70,
    family: "drums",
    steps: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    description: "Syncopated off-beat groove accents",
  },

  // 2. Chords & Bass
  {
    id: "sub_bass",
    num: "05",
    name: "Sub-Bass & Slides",
    category: "chords",
    color: "#00e5ff",
    pan: 0,
    vol: 92,
    family: "bass",
    steps: [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, false],
    description: "Diatonic root bassline with 808 glides",
  },
  {
    id: "piano_chords",
    num: "06",
    name: "Piano Progression",
    category: "chords",
    color: "#b388ff",
    pan: -20,
    vol: 80,
    family: "keys",
    steps: [true, false, false, false, false, false, true, false, false, false, true, false, false, false, false, false],
    description: "Triad / 7th harmonic progression loop",
  },
  {
    id: "rhodes_keys",
    num: "07",
    name: "Electric Keys",
    category: "chords",
    color: "#d1c4e9",
    pan: 20,
    vol: 75,
    family: "keys",
    steps: [false, true, false, false, true, false, false, true, false, true, false, false, true, false, false, true],
    description: "Warm syncopated chord stabs",
  },

  // 3. Synths & Leads
  {
    id: "hook_lead",
    num: "08",
    name: "Hook Lead Synth",
    category: "synths",
    color: "#00ff88",
    pan: 0,
    vol: 86,
    family: "synths",
    steps: [true, false, true, true, false, true, true, false, true, true, false, true, false, true, true, false],
    description: "Topline chorus melody earworm",
  },
  {
    id: "arp_pluck",
    num: "09",
    name: "Pluck Arpeggiator",
    category: "synths",
    color: "#18ffff",
    pan: -30,
    vol: 74,
    family: "synths",
    steps: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    description: "1/16 rhythmic counter-melody",
  },

  // 4. Vocals
  {
    id: "lead_vocal",
    num: "10",
    name: "Lead Vocal Track",
    category: "all",
    color: "#ff4081",
    pan: 0,
    vol: 90,
    family: "vocals",
    steps: [true, true, true, false, true, true, false, true, true, true, true, false, true, false, true, false],
    description: "Center-panned vocal cadence & singing",
  },

  // 5. Strings & FX
  {
    id: "strings_pad",
    num: "11",
    name: "Orchestral Strings",
    category: "strings",
    color: "#ffd54f",
    pan: 0,
    vol: 72,
    family: "strings",
    steps: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
    description: "Sustained emotional background swells",
  },
  {
    id: "fx_riser",
    num: "12",
    name: "Riser & Impact FX",
    category: "strings",
    color: "#ff6e40",
    pan: 0,
    vol: 78,
    family: "strings",
    steps: [false, false, false, false, false, false, false, false, false, false, false, false, true, true, true, true],
    description: "Tension build-up before the chorus drop",
  },
];

export function FLStudioChannelRack({
  currentTime,
  isPlaying,
  activeSectionName = "Verse",
  instruments,
}: FLStudioChannelRackProps) {
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory>("all");
  const [mutedChannels, setMutedChannels] = useState<Record<string, boolean>>({});
  const [activeStep, setActiveStep] = useState(0);

  // 120 BPM = 8 steps/sec
  useEffect(() => {
    if (!isPlaying) return;
    const step = Math.floor((currentTime * 8) % 16);
    setActiveStep(step);
  }, [currentTime, isPlaying]);

  const toggleMute = (id: string) => {
    setMutedChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredChannels = MASTER_CHANNELS.filter(
    (ch) => selectedCategory === "all" || ch.category === selectedCategory || ch.category === "all"
  );

  return (
    <div className="rounded-xl border border-line bg-[#16191e] shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Top FL Studio DAW Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#282d37] bg-[#1d2128] px-3.5 py-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff7b00] shadow-sm shadow-[#ff7b00]" />
            <span className="font-display text-[11px] font-bold tracking-wider text-ink">
              FL STUDIO · GRANULAR PATTERN SEQUENCER
            </span>
          </div>
          <span className="rounded bg-[#282d37] px-1.5 py-0.5 text-[9.5px] font-bold text-amber">
            PAT 1 · {activeSectionName.toUpperCase()}
          </span>
        </div>

        {/* Pattern Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {PATTERN_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded px-2 py-1 text-[9.5px] font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-amber text-black shadow-xs shadow-amber"
                  : "bg-surface/50 border border-linesoft text-dim hover:text-ink"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Pattern Rows */}
      <div className="divide-y divide-[#222730] p-2 flex flex-col gap-1">
        {filteredChannels.map((ch) => {
          const isMuted = !!mutedChannels[ch.id];
          const isStemDetected = instruments?.instruments
            ? instruments.instruments.some((inst) => inst.id.toLowerCase().includes(ch.family.toLowerCase()) && inst.detected)
            : true;

          const isStepTriggered = ch.steps[activeStep] && isPlaying && !isMuted && isStemDetected;
          const peakLevel = isStepTriggered
            ? Math.min(100, Math.floor(ch.vol * (0.75 + Math.random() * 0.3)))
            : isPlaying && !isMuted
            ? Math.floor(Math.random() * 20)
            : 0;

          return (
            <div
              key={ch.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                isMuted ? "opacity-35 bg-[#121418]" : "bg-[#1a1e24] hover:bg-[#20252d]"
              }`}
            >
              {/* Mute/Solo LED */}
              <button
                onClick={() => toggleMute(ch.id)}
                title={isMuted ? "Unmute Pattern" : "Mute Pattern"}
                className={`h-3.5 w-3.5 rounded-full border border-black/50 transition-all cursor-pointer ${
                  isMuted
                    ? "bg-dim/30 shadow-none"
                    : "bg-mint shadow-sm shadow-mint ring-1 ring-mint/40"
                }`}
              />

              {/* Track Number & Name */}
              <div className="flex items-center gap-1.5 w-32 shrink-0">
                <span className="text-[10px] text-faint font-bold">{ch.num}</span>
                <span
                  className="font-bold text-[11px] truncate"
                  style={{ color: ch.color }}
                  title={ch.description}
                >
                  {ch.name}
                </span>
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

              {/* 16-Step Beat Trigger Grid */}
              <div className="flex-1 grid grid-cols-16 gap-1 min-w-[140px]">
                {ch.steps.map((isActiveStep, sIdx) => {
                  const isBeatQuarter = sIdx % 4 === 0;
                  const isCurrentlyPlayingThisStep = activeStep === sIdx && isPlaying;

                  return (
                    <div
                      key={sIdx}
                      className={`h-4 rounded-[2px] border transition-all ${
                        isCurrentlyPlayingThisStep ? "ring-2 ring-white scale-105 z-10" : ""
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
        <span>16-Step Pattern Grid · Active Stem Breakdown</span>
        <span className="text-mint">● Synchronized with Master Song Map</span>
      </div>
    </div>
  );
}
