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
  glow: string;
  pan: number;
  vol: number;
  family: string;
  steps: boolean[];
  description: string;
}

const PATTERN_CATEGORIES = [
  { id: "all", label: "🎛️ ALL STEMS" },
  { id: "drums", label: "🥁 DRUMS & 808" },
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
    color: "#ff3366",
    glow: "rgba(255, 51, 102, 0.7)",
    pan: 0,
    vol: 92,
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
    glow: "rgba(255, 170, 0, 0.7)",
    pan: 0,
    vol: 86,
    family: "drums",
    steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
    description: "Main backbeat on beats 2 & 4",
  },
  {
    id: "hihat_roll",
    num: "03",
    name: "Hi-Hat Rolls",
    category: "drums",
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.7)",
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
    glow: "rgba(255, 204, 0, 0.7)",
    pan: -15,
    vol: 72,
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
    color: "#00f0ff",
    glow: "rgba(0, 240, 255, 0.7)",
    pan: 0,
    vol: 94,
    family: "bass",
    steps: [true, false, true, false, false, true, false, true, true, false, true, false, false, true, false, false],
    description: "Diatonic root bassline with 808 glides",
  },
  {
    id: "piano_chords",
    num: "06",
    name: "Piano Progression",
    category: "chords",
    color: "#b026ff",
    glow: "rgba(176, 38, 255, 0.7)",
    pan: -20,
    vol: 82,
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
    glow: "rgba(209, 196, 233, 0.7)",
    pan: 20,
    vol: 76,
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
    color: "#00ff9d",
    glow: "rgba(0, 255, 157, 0.7)",
    pan: 0,
    vol: 88,
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
    glow: "rgba(24, 255, 255, 0.7)",
    pan: -30,
    vol: 76,
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
    color: "#ff007f",
    glow: "rgba(255, 0, 127, 0.7)",
    pan: 0,
    vol: 92,
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
    glow: "rgba(255, 213, 79, 0.7)",
    pan: 0,
    vol: 74,
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
    glow: "rgba(255, 110, 64, 0.7)",
    pan: 0,
    vol: 80,
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
    <div className="hud-panel rounded-xl border border-cyanx/20 bg-[#0d1017] shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Top Futuristic DAW Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/10 bg-[#121622] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyanx shadow-md shadow-cyanx animate-pulse" />
            <span className="font-display text-xs font-black tracking-widest text-ink">
              STEP.SEQUENCER // RACK MATRIX
            </span>
          </div>
          <span className="rounded bg-pit border border-white/10 px-2 py-0.5 text-[10px] font-extrabold text-amber shadow-inner">
            PAT 01 · {activeSectionName.toUpperCase()}
          </span>
        </div>

        {/* Pattern Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {PATTERN_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-cyanx text-black shadow-md shadow-cyanx/40 font-black"
                  : "bg-pit/80 border border-white/10 text-dim hover:text-ink hover:border-cyanx/40"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Pattern Rows */}
      <div className="divide-y divide-white/5 p-2.5 flex flex-col gap-1.5 bg-[#080a10]">
        {filteredChannels.map((ch) => {
          const isMuted = !!mutedChannels[ch.id];
          const isStemDetected = instruments?.instruments
            ? instruments.instruments.some((inst) => inst.id.toLowerCase().includes(ch.family.toLowerCase()) && inst.detected)
            : true;

          const isStepTriggered = ch.steps[activeStep] && isPlaying && !isMuted && isStemDetected;
          const peakLevel = isStepTriggered
            ? Math.min(100, Math.floor(ch.vol * (0.8 + Math.random() * 0.25)))
            : isPlaying && !isMuted
            ? Math.floor(Math.random() * 25)
            : 0;

          return (
            <div
              key={ch.id}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all ${
                isMuted ? "opacity-30 bg-[#0c0e14]" : "bg-[#111520] hover:bg-[#161c2b] border border-white/5"
              }`}
            >
              {/* Sci-Fi Mute/Solo Switch */}
              <button
                onClick={() => toggleMute(ch.id)}
                title={isMuted ? "Unmute Channel" : "Mute Channel"}
                className={`h-4 w-4 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                  isMuted
                    ? "border-white/10 bg-pit text-faint"
                    : "border-mint bg-mint/20 text-mint shadow-xs shadow-mint ring-1 ring-mint/50"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isMuted ? "bg-faint" : "bg-mint"}`} />
              </button>

              {/* Track Number & Name */}
              <div className="flex items-center gap-2 w-36 shrink-0">
                <span className="font-mono text-[9px] text-faint font-bold tracking-wider">{ch.num}</span>
                <span
                  className="font-bold text-[11.5px] truncate drop-shadow"
                  style={{ color: ch.color }}
                  title={ch.description}
                >
                  {ch.name}
                </span>
              </div>

              {/* Calibrated 10-Segment LED Meter */}
              <div className="w-16 shrink-0 flex items-center gap-0.5 px-1 bg-[#05070a] rounded py-1 border border-white/10 shadow-inner">
                {[...Array(10)].map((_, segIdx) => {
                  const segThreshold = (segIdx / 10) * 100;
                  const isLit = peakLevel > segThreshold;
                  const isRed = segIdx >= 8;
                  const isYellow = segIdx >= 5 && segIdx < 8;

                  return (
                    <div
                      key={segIdx}
                      className={`h-2.5 flex-1 rounded-[1px] transition-all duration-75 ${
                        isLit
                          ? isRed
                            ? "bg-[#ff0055] shadow-xs shadow-[#ff0055]"
                            : isYellow
                            ? "bg-[#ffaa00] shadow-xs shadow-[#ffaa00]"
                            : "bg-[#00ff9d] shadow-xs shadow-[#00ff9d]"
                          : "bg-[#181e2b]"
                      }`}
                    />
                  );
                })}
              </div>

              {/* 16-Step Illuminated Touch Trigger Pads */}
              <div className="flex-1 grid grid-cols-16 gap-1 min-w-[150px]">
                {ch.steps.map((isActiveStep, sIdx) => {
                  const isBeatQuarter = sIdx % 4 === 0;
                  const isCurrentlyPlayingThisStep = activeStep === sIdx && isPlaying;

                  return (
                    <div
                      key={sIdx}
                      style={
                        isActiveStep && isCurrentlyPlayingThisStep
                          ? { boxShadow: `0 0 14px 2px ${ch.color}` }
                          : undefined
                      }
                      className={`h-5 rounded-[2px] border transition-all duration-75 ${
                        isCurrentlyPlayingThisStep
                          ? "ring-2 ring-white scale-110 z-10"
                          : ""
                      } ${
                        isActiveStep
                          ? isBeatQuarter
                            ? "bg-[#ff3366] border-[#ff6688] shadow-sm shadow-[#ff3366]/40"
                            : "bg-[#8899aa] border-[#aabbcc]"
                          : isBeatQuarter
                          ? "bg-[#1c2230] border-white/10"
                          : "bg-[#10141d] border-white/5"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Status Readout */}
      <div className="border-t border-white/10 bg-[#0a0c12] px-4 py-2 flex items-center justify-between text-[10px] text-faint">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyanx" />
          <span>16-STEP POLYSYNTH & STEM TRIGGER ENGINE</span>
        </span>
        <span className="text-cyanx font-bold">
          [DSP SYNC ACTIVE · 96kHz 32-BIT FLOAT]
        </span>
      </div>
    </div>
  );
}
