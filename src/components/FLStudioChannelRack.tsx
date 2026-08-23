import React, { useEffect, useMemo, useState } from "react";
import type { ChannelPattern, InstrumentBreakdown, ReportData } from "../lib/types";
import { generateDynamicPatterns, playAuditionSound } from "../lib/patternEngine";

interface FLStudioChannelRackProps {
  currentTime: number;
  isPlaying: boolean;
  activeSectionName?: string;
  bpm?: number;
  instruments?: InstrumentBreakdown | null;
  report?: Partial<ReportData> | null;
  onToggleTrack?: (trackName: string) => void;
}

const PATTERN_CATEGORIES = [
  { id: "all", label: "🎛️ ALL STEMS" },
  { id: "drums", label: "🥁 DRUMS & 808" },
  { id: "chords", label: "🎹 CHORDS & KEYS" },
  { id: "synths", label: "⚡ SYNTHS & LEADS" },
  { id: "strings", label: "🎻 STRINGS & FX" },
] as const;

type PatternCategory = (typeof PATTERN_CATEGORIES)[number]["id"];

const AVAILABLE_PATTERNS = [
  { id: "auto", label: "⚡ AUTO-SYNC", section: "" },
  { id: "Intro", label: "PAT 01 · INTRO", section: "Intro" },
  { id: "Verse", label: "PAT 02 · VERSE", section: "Verse" },
  { id: "Chorus", label: "PAT 03 · CHORUS", section: "Chorus" },
  { id: "Bridge", label: "PAT 04 · BRIDGE", section: "Bridge" },
  { id: "Outro", label: "PAT 05 · OUTRO", section: "Outro" },
];

export function FLStudioChannelRack({
  currentTime,
  isPlaying,
  activeSectionName = "Verse",
  bpm = 120,
  instruments,
  report,
}: FLStudioChannelRackProps) {
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory>("all");
  const [selectedPatternMode, setSelectedPatternMode] = useState<string>("auto");
  const [mutedChannels, setMutedChannels] = useState<Record<string, boolean>>({});
  const [soloChannel, setSoloChannel] = useState<string | null>(null);

  // Generate dynamic patterns bank from audio DSP features
  const basePatterns = useMemo(() => {
    if (instruments?.sectionPatterns) {
      return instruments.sectionPatterns;
    }
    return generateDynamicPatterns(report || { tempo: { value: bpm, tier: "computed", source: "tempo" } });
  }, [instruments, report, bpm]);

  // Local editable step patterns so the user can tweak and program steps in real time
  const [patternBank, setPatternBank] = useState<Record<string, ChannelPattern[]>>(basePatterns);

  useEffect(() => {
    setPatternBank(basePatterns);
  }, [basePatterns]);

  // Resolve current active pattern section key
  const effectiveSectionKey = useMemo(() => {
    if (selectedPatternMode !== "auto") return selectedPatternMode;
    const norm = activeSectionName.toLowerCase();
    if (norm.includes("intro")) return "Intro";
    if (norm.includes("chorus") || norm.includes("hook")) return "Chorus";
    if (norm.includes("bridge") || norm.includes("build")) return "Bridge";
    if (norm.includes("outro")) return "Outro";
    return "Verse";
  }, [selectedPatternMode, activeSectionName]);

  const currentChannels = patternBank[effectiveSectionKey] || patternBank["Verse"] || [];

  // Tempo-locked playhead calculation:
  // 1 bar = 4 beats. 1 beat = 60 / BPM seconds.
  // 1 bar = (60 / BPM) * 4 seconds = 16 steps.
  const effectiveBpm = bpm && bpm > 40 && bpm < 260 ? bpm : 120;
  const barDuration = (60 / effectiveBpm) * 4;
  const activeStep = isPlaying && barDuration > 0
    ? Math.floor(((currentTime % barDuration) / barDuration) * 16)
    : 0;

  const toggleStep = (channelId: string, stepIdx: number) => {
    // Play real-time synthesized audition sound
    playAuditionSound(channelId);

    setPatternBank((prev) => {
      const sectionChans = prev[effectiveSectionKey] || [];
      const updated = sectionChans.map((ch) => {
        if (ch.id === channelId) {
          const newSteps = [...ch.steps];
          newSteps[stepIdx] = !newSteps[stepIdx];
          return { ...ch, steps: newSteps };
        }
        return ch;
      });
      return { ...prev, [effectiveSectionKey]: updated };
    });
  };

  const toggleMute = (id: string) => {
    setMutedChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolo = (id: string) => {
    setSoloChannel((prev) => (prev === id ? null : id));
  };

  const [soundAudioEnabled, setSoundAudioEnabled] = useState(false);

  // Play synthesized drum/instrument audio on step trigger if soundAudioEnabled is active
  useEffect(() => {
    if (!isPlaying || !soundAudioEnabled) return;
    currentChannels.forEach((ch) => {
      const isMuted = soloChannel ? soloChannel !== ch.id : !!mutedChannels[ch.id];
      const isStemDetected = instruments?.instruments
        ? instruments.instruments.some((inst) => inst.id.toLowerCase().includes(ch.family.toLowerCase()) && inst.detected)
        : true;
      if (ch.steps[activeStep] && !isMuted && isStemDetected) {
        playAuditionSound(ch.id);
      }
    });
  }, [activeStep, isPlaying, soundAudioEnabled, currentChannels, soloChannel, mutedChannels, instruments]);

  const filteredChannels: ChannelPattern[] = currentChannels.filter(
    (ch) => selectedCategory === "all" || ch.category === selectedCategory || ch.category === "all"
  );

  return (
    <div className="hud-panel rounded-xl border border-cyanx/20 bg-[#0d1017] shadow-2xl overflow-hidden font-mono text-xs select-none">
      {/* Top Futuristic DAW Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-white/10 bg-[#121622] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-cyanx shadow-md shadow-cyanx animate-pulse" />
            <span className="font-display text-xs font-black tracking-widest text-ink">
              STEP.SEQUENCER // RACK MATRIX
            </span>
          </div>

          <span className="rounded bg-pit border border-cyanx/40 px-2 py-0.5 text-[10px] font-extrabold text-cyanx shadow-inner">
            {effectiveBpm.toFixed(1)} BPM · 16 STEPS
          </span>

          {/* Section Pattern Switcher */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {AVAILABLE_PATTERNS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPatternMode(p.id)}
                className={`rounded px-2 py-0.5 text-[9.5px] font-extrabold transition cursor-pointer shrink-0 ${
                  selectedPatternMode === p.id
                    ? "bg-amber text-black shadow-sm font-black"
                    : "bg-pit/60 border border-white/10 text-dim hover:text-ink hover:border-amber/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stem Category Filter Tabs & Synth Audio Preview Toggle */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setSoundAudioEnabled(!soundAudioEnabled)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-extrabold transition shrink-0 cursor-pointer border ${
              soundAudioEnabled
                ? "border-mint bg-mint/20 text-mint animate-pulse"
                : "border-white/10 bg-pit/60 text-faint hover:text-dim"
            }`}
            title="Toggle synthesized drum clicks in sync with step playhead"
          >
            {soundAudioEnabled ? "🔊 SYNTH SOUNDS: ON" : "🔇 SYNTH SOUNDS: OFF"}
          </button>

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

      {/* 16-Step Beat Grid Header (1, 2, 3, 4) */}
      <div className="hidden sm:flex items-center gap-2.5 px-4 py-1.5 bg-[#090b12] border-b border-white/5 text-[9.5px] text-faint">
        <div className="w-40 shrink-0 font-bold uppercase tracking-wider text-cyanx/80">
          Instrument Stems ({filteredChannels.length})
        </div>
        <div className="w-16 shrink-0 text-center">Peak VU</div>
        <div className="flex-1 grid grid-cols-16 gap-1 text-center font-bold">
          {[...Array(16)].map((_, i) => (
            <span
              key={i}
              className={`transition-colors duration-75 ${
                activeStep === i && isPlaying
                  ? "text-white font-black scale-110 drop-shadow-[0_0_6px_#fff]"
                  : i % 4 === 0
                  ? "text-amber font-extrabold"
                  : "text-faint/60"
              }`}
            >
              {i % 4 === 0 ? `B${Math.floor(i / 4) + 1}` : i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Channel Pattern Rows */}
      <div className="divide-y divide-white/5 p-2.5 flex flex-col gap-1.5 bg-[#080a10]">
        {filteredChannels.map((ch) => {
          const isMuted = soloChannel ? soloChannel !== ch.id : !!mutedChannels[ch.id];
          const isSoloed = soloChannel === ch.id;

          const isStemDetected = instruments?.instruments
            ? instruments.instruments.some((inst) => inst.id.toLowerCase().includes(ch.family.toLowerCase()) && inst.detected)
            : true;

          const isStepTriggered = ch.steps[activeStep] && isPlaying && !isMuted && isStemDetected;
          const peakLevel = isStepTriggered
            ? Math.min(100, Math.floor(ch.vol * (0.9 + Math.random() * 0.1)))
            : isPlaying && !isMuted
            ? Math.floor(Math.random() * 20)
            : 0;

          return (
            <div
              key={ch.id}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-75 ${
                isMuted
                  ? "opacity-35 bg-[#0c0e14]"
                  : isStepTriggered
                  ? "bg-[#182035] border border-cyanx/40 shadow-lg shadow-cyanx/10"
                  : "bg-[#111520] hover:bg-[#161c2b] border border-white/5"
              }`}
            >
              {/* Mute & Solo Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleMute(ch.id)}
                  title={isMuted ? "Unmute Channel" : "Mute Channel"}
                  className={`h-4 w-4 rounded border transition-all cursor-pointer flex items-center justify-center ${
                    isMuted
                      ? "border-white/10 bg-pit text-faint"
                      : "border-mint bg-mint/20 text-mint shadow-xs shadow-mint ring-1 ring-mint/50"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isMuted ? "bg-faint" : "bg-mint"}`} />
                </button>

                <button
                  onClick={() => toggleSolo(ch.id)}
                  title={isSoloed ? "Un-solo" : "Solo Channel"}
                  className={`h-4 px-1 rounded border text-[8px] font-black transition-all cursor-pointer ${
                    isSoloed
                      ? "border-amber bg-amber text-black"
                      : "border-white/10 bg-pit text-faint hover:text-ink"
                  }`}
                >
                  S
                </button>
              </div>

              {/* Track Number & Name (Click to Audition Sound, Flashes on Step Hit) */}
              <div
                onClick={() => playAuditionSound(ch.id)}
                className={`flex items-center gap-2 w-36 shrink-0 cursor-pointer group px-1.5 py-1 rounded transition-all duration-75 ${
                  isStepTriggered
                    ? "scale-[1.03]"
                    : "hover:bg-white/5"
                }`}
                style={
                  isStepTriggered
                    ? {
                        boxShadow: `0 0 14px 2px ${ch.glow}`,
                        backgroundColor: `${ch.color}25`,
                      }
                    : undefined
                }
                title={`Click to preview ${ch.name} sound · ${ch.description}`}
              >
                <span className={`font-mono text-[9px] font-bold tracking-wider ${isStepTriggered ? "text-white" : "text-faint"}`}>
                  {ch.num}
                </span>
                <span
                  className={`font-black text-[11.5px] truncate transition-all duration-75 ${
                    isStepTriggered ? "text-white drop-shadow-[0_0_8px_#fff]" : "drop-shadow"
                  }`}
                  style={{ color: isStepTriggered ? "#ffffff" : ch.color }}
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

              {/* 16-Step Illuminated Touch Trigger Pads (Clickable to program notes) */}
              <div className="flex-1 grid grid-cols-16 gap-1 min-w-[150px]">
                {ch.steps.map((isActiveStep, sIdx) => {
                  const isBeatQuarter = sIdx % 4 === 0;
                  const isCurrentlyPlayingThisStep = activeStep === sIdx && isPlaying;

                  return (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => toggleStep(ch.id, sIdx)}
                      title={`Step ${sIdx + 1} (${isBeatQuarter ? "Beat downbeat" : "16th note"}) — Click to toggle`}
                      style={
                        isActiveStep && isCurrentlyPlayingThisStep
                          ? {
                              boxShadow: `0 0 20px 4px ${ch.color}, 0 0 10px #fff`,
                              backgroundColor: "#ffffff",
                              borderColor: ch.color,
                            }
                          : undefined
                      }
                      className={`h-5 rounded-[2px] border transition-all duration-75 cursor-pointer ${
                        isCurrentlyPlayingThisStep
                          ? isActiveStep
                            ? "ring-4 ring-white scale-125 z-20 brightness-200"
                            : "ring-2 ring-white/60 scale-110 z-10"
                          : "hover:brightness-125"
                      } ${
                        isActiveStep
                          ? isBeatQuarter
                            ? "bg-[#ff3366] border-[#ff6688] shadow-sm shadow-[#ff3366]/40"
                            : "bg-[#8899aa] border-[#aabbcc]"
                          : isBeatQuarter
                          ? "bg-[#1c2230] border-white/10 hover:bg-[#252d40]"
                          : "bg-[#10141d] border-white/5 hover:bg-[#181e2a]"
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
      <div className="border-t border-white/10 bg-[#0a0c12] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-faint">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyanx" />
          <span>PATTERN: <strong className="text-amber">{effectiveSectionKey.toUpperCase()}</strong> · CLICK PADS TO AUDITION & EDIT</span>
        </div>
        <span className="text-cyanx font-bold">
          [TEMPO-LOCKED QUANTIZER · {effectiveBpm.toFixed(0)} BPM · 16TH GRID]
        </span>
      </div>
    </div>
  );
}
