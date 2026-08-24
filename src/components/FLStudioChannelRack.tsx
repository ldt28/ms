import React, { useEffect, useMemo, useRef, useState } from "react";
import type { ChannelPattern, InstrumentBreakdown, ReportData, Section } from "../lib/types";
import { generateDynamicPatterns, playAuditionSound } from "../lib/patternEngine";
import { PianoRollModal } from "./PianoRollModal";
import { exportChannelsToMidi } from "../lib/midiExport";

interface FLStudioChannelRackProps {
  currentTime: number;
  isPlaying: boolean;
  activeSectionName?: string;
  bpm?: number;
  instruments?: InstrumentBreakdown | null;
  report?: Partial<ReportData> | null;
  sections?: Section[];
  onTogglePlay?: (targetTime?: number) => void;
  onSeek?: (time: number) => void;
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
  sections = [],
  onTogglePlay,
  onSeek,
}: FLStudioChannelRackProps) {
  const [selectedCategory, setSelectedCategory] = useState<PatternCategory>("all");
  const [selectedPatternMode, setSelectedPatternMode] = useState<string>("auto");
  const [mutedChannels, setMutedChannels] = useState<Record<string, boolean>>({});
  const [soloChannel, setSoloChannel] = useState<string | null>(null);
  const [channelPans, setChannelPans] = useState<Record<string, number>>({});
  const [channelVols, setChannelVols] = useState<Record<string, number>>({});
  const [activePianoRollTrack, setActivePianoRollTrack] = useState<{
    id: string;
    name: string;
    notes?: (string | null)[];
  } | null>(null);
  const [copiedStatus, setCopiedStatus] = useState(false);
  const [customBpm, setCustomBpm] = useState<number | null>(null);
  const detectedBpm = bpm && bpm > 40 && bpm < 260 ? bpm : 120;
  // If detected BPM is half-time trap (60-95 BPM), default to 2x double-time for snappy 16th grid rhythm
  const [bpmMultiplier, setBpmMultiplier] = useState<number>(detectedBpm < 95 ? 2 : 1);
  const [phaseNudgeMs, setPhaseNudgeMs] = useState(0);
  const [soundAudioEnabled, setSoundAudioEnabled] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localStep, setLocalStep] = useState(0);

  // High-precision smooth interpolated audio clock
  const [smoothTime, setSmoothTime] = useState(currentTime);
  const lastReportedTimeRef = useRef(currentTime);
  const lastPerfTimeRef = useRef(performance.now());

  useEffect(() => {
    lastReportedTimeRef.current = currentTime;
    lastPerfTimeRef.current = performance.now();
  }, [currentTime]);

  const isMasterPlaying = isPlaying || localPlaying;

  useEffect(() => {
    if (!isMasterPlaying) {
      setSmoothTime(currentTime);
      return;
    }

    let animId: number;
    const tick = () => {
      const now = performance.now();
      const elapsedSec = (now - lastPerfTimeRef.current) / 1000;
      const interpolated = isPlaying
        ? lastReportedTimeRef.current + elapsedSec
        : smoothTime;
      setSmoothTime(interpolated);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isMasterPlaying, isPlaying, currentTime]);

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

  // Effective BPM & Bar Duration
  const activeBaseBpm = customBpm || detectedBpm;
  const effectiveBpm = activeBaseBpm * bpmMultiplier;
  const barDuration = (60 / effectiveBpm) * 4;

  // Real-time active step calculation with phase nudge
  const nudgedTime = Math.max(0, smoothTime + phaseNudgeMs / 1000);
  const activeStep = isPlaying && barDuration > 0
    ? Math.floor(((nudgedTime % barDuration) / barDuration) * 16)
    : localPlaying
    ? localStep
    : 0;

  // Standalone loop timer if local playing is active
  useEffect(() => {
    if (!localPlaying || isPlaying) return;
    const stepIntervalMs = (barDuration / 16) * 1000;
    const timer = setInterval(() => {
      setLocalStep((prev) => (prev + 1) % 16);
    }, stepIntervalMs);
    return () => clearInterval(timer);
  }, [localPlaying, isPlaying, barDuration]);

  // Handle master Play/Pause button inside the Step Sequencer
  const handleSequencerPlayToggle = () => {
    if (onTogglePlay) {
      onTogglePlay();
    } else {
      setLocalPlaying((p) => !p);
    }
  };

  // Switch pattern and jump to song section if available
  const handleSelectPattern = (patternId: string) => {
    setSelectedPatternMode(patternId);

    if (patternId !== "auto" && (onSeek || onTogglePlay)) {
      const matched = sections.find((s) => s.label.toLowerCase().includes(patternId.toLowerCase()));
      if (matched) {
        if (onSeek) onSeek(matched.start + 0.05);
        if (!isMasterPlaying && onTogglePlay) onTogglePlay(matched.start + 0.05);
      }
    }
  };

  const toggleStep = (channelId: string, stepIdx: number) => {
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

  const fillFourOnFloor = () => {
    setPatternBank((prev) => {
      const sectionChans = prev[effectiveSectionKey] || [];
      const updated = sectionChans.map((ch) => {
        if (ch.id === "kick_punch") {
          const newSteps = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
          return { ...ch, steps: newSteps };
        }
        if (ch.id === "snare_acoustic" || ch.id === "clap_snap") {
          const newSteps = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
          return { ...ch, steps: newSteps };
        }
        return ch;
      });
      return { ...prev, [effectiveSectionKey]: updated };
    });
  };

  const randomizeTrapHats = () => {
    setPatternBank((prev) => {
      const sectionChans = prev[effectiveSectionKey] || [];
      const updated = sectionChans.map((ch) => {
        if (ch.id === "hat_closed" || ch.id === "hat_triplet_rolls") {
          const newSteps = [...Array(16)].map((_, i) => (i % 2 === 0 ? true : Math.random() > 0.4));
          return { ...ch, steps: newSteps };
        }
        return ch;
      });
      return { ...prev, [effectiveSectionKey]: updated };
    });
  };

  const clearCurrentPattern = () => {
    setPatternBank((prev) => {
      const sectionChans = prev[effectiveSectionKey] || [];
      const updated = sectionChans.map((ch) => ({
        ...ch,
        steps: Array(16).fill(false),
      }));
      return { ...prev, [effectiveSectionKey]: updated };
    });
  };

  const copyPatternJson = () => {
    const dataStr = JSON.stringify(currentChannels, null, 2);
    navigator.clipboard.writeText(dataStr);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const downloadMidiFile = () => {
    const midiBytes = exportChannelsToMidi(currentChannels, effectiveBpm, `${effectiveSectionKey}-Groove`);
    const blob = new Blob([midiBytes.buffer as ArrayBuffer], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${effectiveSectionKey.toLowerCase()}-pattern-${Math.round(effectiveBpm)}bpm.mid`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const keySignature = report?.keySig?.value || "F minor";

  const toggleMute = (id: string) => {
    setMutedChannels((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSolo = (id: string) => {
    setSoloChannel((prev) => (prev === id ? null : id));
  };

  useEffect(() => {
    if (!isMasterPlaying || !soundAudioEnabled) return;
    currentChannels.forEach((ch) => {
      const isMuted = soloChannel ? soloChannel !== ch.id : !!mutedChannels[ch.id];
      const isStemDetected = instruments?.instruments
        ? instruments.instruments.some((inst) => inst.id.toLowerCase().includes(ch.family.toLowerCase()) && inst.detected)
        : true;
      if (ch.steps[activeStep] && !isMuted && isStemDetected) {
        playAuditionSound(ch.id, ch.stepNotes?.[activeStep]);
      }
    });
  }, [activeStep, isMasterPlaying, soundAudioEnabled, currentChannels, soloChannel, mutedChannels, instruments]);

  const filteredChannels: ChannelPattern[] = currentChannels.filter(
    (ch) => selectedCategory === "all" || ch.category === selectedCategory || ch.category === "all"
  );

  return (
    <div className="hud-panel rounded-xl border border-cyanx/20 bg-[#0d1017] shadow-2xl overflow-hidden font-mono text-xs select-none relative">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 bg-[#121622] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSequencerPlayToggle}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-mono text-xs font-black tracking-wider transition-all cursor-pointer shadow-lg shrink-0 ${
              isMasterPlaying
                ? "bg-mint text-black ring-2 ring-mint shadow-mint/40 animate-pulse"
                : "bg-cyanx text-black hover:bg-white hover:scale-105 shadow-cyanx/40"
            }`}
            title={isMasterPlaying ? "Pause Sequencer & Song (Space)" : "Play Sequencer & Song (Space)"}
          >
            <span className="text-sm">{isMasterPlaying ? "⏸" : "▶"}</span>
            <span>{isMasterPlaying ? "PAUSE RACK" : "PLAY RACK"}</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${isMasterPlaying ? "bg-mint animate-ping" : "bg-cyanx"}`} />
            <span className="font-display text-xs font-black tracking-widest text-ink">
              STEP.SEQUENCER // RACK MATRIX
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-pit border border-cyanx/40 px-2.5 py-1 text-[10.5px] font-extrabold text-cyanx shadow-inner">
            <span className="text-amber">{effectiveBpm.toFixed(1)} BPM</span>
            <div className="flex items-center gap-1 ml-1 border-l border-white/20 pl-1.5 text-[9.5px]">
              {[
                { mult: 2, label: "⚡ 2X (FAST)" },
                { mult: 1, label: "1X" },
                { mult: 0.5, label: "0.5X" },
              ].map(({ mult, label }) => (
                <button
                  key={mult}
                  type="button"
                  onClick={() => setBpmMultiplier(mult)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition font-bold ${
                    bpmMultiplier === mult
                      ? "bg-cyanx text-black font-black shadow-xs shadow-cyanx"
                      : "text-faint hover:text-ink bg-white/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-pit border border-white/10 px-2 py-1 text-[9.5px] text-faint">
            <span className="font-bold text-dim">ALIGN:</span>
            <button
              type="button"
              onClick={() => setPhaseNudgeMs((p) => p - 25)}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-ink cursor-pointer"
            >
              -25ms
            </button>
            <span className="font-mono text-cyanx font-bold min-w-8 text-center">{phaseNudgeMs > 0 ? `+${phaseNudgeMs}` : phaseNudgeMs}ms</span>
            <button
              type="button"
              onClick={() => setPhaseNudgeMs((p) => p + 25)}
              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-ink cursor-pointer"
            >
              +25ms
            </button>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {AVAILABLE_PATTERNS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPattern(p.id)}
                className={`rounded px-2.5 py-1 text-[10px] font-extrabold transition cursor-pointer shrink-0 ${
                  selectedPatternMode === p.id
                    ? "bg-amber text-black shadow-md font-black scale-105"
                    : "bg-pit/70 border border-white/10 text-dim hover:text-ink hover:border-amber/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setSoundAudioEnabled(!soundAudioEnabled)}
            className={`rounded-md px-2.5 py-1 text-[10px] font-extrabold transition shrink-0 cursor-pointer border ${
              soundAudioEnabled
                ? "border-mint bg-mint/20 text-mint animate-pulse"
                : "border-white/10 bg-pit/60 text-faint hover:text-dim"
            }`}
          >
            {soundAudioEnabled ? "🔊 SYNTH SOUNDS: ON" : "🔇 SYNTH SOUNDS: OFF"}
          </button>

          {PATTERN_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
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

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-[#0a0d16] border-b border-white/5 text-[9.5px]">
        <div className="flex items-center gap-2 text-faint">
          <span className="font-bold text-cyanx">QUICK PATTERN TOOLS:</span>
          <button
            type="button"
            onClick={fillFourOnFloor}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-cyanx/20 hover:text-cyanx border border-white/10 transition cursor-pointer"
          >
            ⚡ 4-on-Floor Beat
          </button>
          <button
            type="button"
            onClick={randomizeTrapHats}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-amber/20 hover:text-amber border border-white/10 transition cursor-pointer"
          >
            🎲 Trap Hat Rolls
          </button>
          <button
            type="button"
            onClick={clearCurrentPattern}
            className="px-2 py-0.5 rounded bg-white/5 hover:bg-rosex/20 hover:text-rosex border border-white/10 transition cursor-pointer"
          >
            🧹 Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadMidiFile}
            className="px-2.5 py-0.5 rounded bg-amber/20 hover:bg-amber/30 text-amber border border-amber/40 font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
            title="Download standard MIDI file (.mid) to drag & drop into FL Studio, Ableton, or Logic Pro"
          >
            <span>🎹</span> EXPORT MIDI (.MID)
          </button>
          <button
            type="button"
            onClick={copyPatternJson}
            className="px-2.5 py-0.5 rounded bg-cyanx/10 hover:bg-cyanx/20 text-cyanx border border-cyanx/30 font-bold transition cursor-pointer"
          >
            {copiedStatus ? "✓ COPIED JSON" : "📋 COPY JSON"}
          </button>
        </div>
      </div>

      {/* Contained Horizontal Scroll Container for Stem Tracks & 16-Step Grid */}
      <div className="overflow-x-auto min-w-0">
        <div className="min-w-[660px]">
          <div className="hidden sm:flex items-center gap-2.5 px-4 py-1.5 bg-[#090b12] border-b border-white/5 text-[9.5px] text-faint">
            <div className="w-52 shrink-0 font-bold uppercase tracking-wider text-cyanx/80">
              Instrument Stems ({filteredChannels.length})
            </div>
            <div className="w-14 shrink-0 text-center">Peak VU</div>
            <div className="flex-1 grid grid-cols-16 gap-1 text-center font-bold relative">
              {[...Array(16)].map((_, i) => (
                <span
                  key={i}
                  className={`transition-colors duration-75 ${
                    activeStep === i && isMasterPlaying
                      ? "text-white font-black scale-125 drop-shadow-[0_0_8px_#fff]"
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

          <div className="p-2.5 flex flex-col gap-3 bg-[#080a10] relative">
            <div className={`absolute top-0 bottom-0 w-0.5 bg-white/10 z-0 pointer-events-none transition-all duration-75`} 
                 style={{ left: `${(activeStep / 16) * 100}%` }} />
        {[
          { id: "drums", title: "🥁 SECTION 01 · DRUMS & PERCUSSION MATRIX", color: "#ff3366" },
          { id: "chords", title: "🎹 SECTION 02 · HARMONIC CHORDS, PIANO & 808 GLIDES", color: "#b026ff" },
          { id: "synths", title: "⚡ SECTION 03 · SYNTHS, LEADS & ARPEGGIATORS", color: "#00ff9d" },
          { id: "all", title: "🎙️ SECTION 04 · VOCALS, AD-LIBS & PRODUCER TAGS", color: "#ff007f" },
          { id: "strings", title: "🎻 SECTION 05 · STRINGS & TRANSITION FX", color: "#ffd54f" },
        ]
          .filter((cat) => selectedCategory === "all" || selectedCategory === cat.id)
          .map((sec) => {
            const sectionChannels = filteredChannels.filter((ch) =>
              selectedCategory !== "all" ? true : ch.category === sec.id
            );

            if (sectionChannels.length === 0) return null;

            return (
              <div key={sec.id} className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-[#0a0d15] p-2">
                {selectedCategory === "all" && (
                  <div
                    className="flex items-center justify-between px-2.5 py-1 rounded bg-[#0f1422] border-l-2 text-[10px] font-bold tracking-wider uppercase"
                    style={{ borderColor: sec.color, color: sec.color }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{sec.title}</span>
                      <span className="rounded bg-black/40 px-1.5 py-0.2 text-[8.5px] font-mono text-faint">
                        {sectionChannels.length} tracks
                      </span>
                    </div>
                  </div>
                )}

                {sectionChannels.map((ch) => {
                  const isMuted = soloChannel ? soloChannel !== ch.id : !!mutedChannels[ch.id];
                  const isSoloed = soloChannel === ch.id;
                  const isStemDetected = instruments?.instruments
                    ? instruments.instruments.some((inst) => inst.id.toLowerCase().includes(ch.family.toLowerCase()) && inst.detected)
                    : true;
                  const isStepTriggered = ch.steps[activeStep] && isMasterPlaying && !isMuted && isStemDetected;
                  const peakLevel = isStepTriggered
                    ? Math.min(100, Math.floor(ch.vol * (0.9 + Math.random() * 0.1)))
                    : isMasterPlaying && !isMuted
                    ? Math.floor(Math.random() * 20)
                    : 0;

                  const isMelodicChannel = ch.category === "chords" || ch.category === "synths" || ch.id.includes("piano") || ch.id.includes("rhodes");

                  return (
                    <div
                      key={ch.id}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-75 ${
                        isMuted
                          ? "opacity-35 bg-[#0c0e14]"
                          : isStepTriggered
                          ? "bg-[#182035] border border-cyanx/40 shadow-lg shadow-cyanx/20"
                          : "bg-[#111520] hover:bg-[#161c2b] border border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleMute(ch.id)}
                          className={`h-4 w-4 rounded border transition-all cursor-pointer ${
                            isMuted
                              ? "border-white/10 bg-pit text-faint"
                              : "border-mint bg-mint/20 text-mint"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isMuted ? "bg-faint" : "bg-mint"}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSolo(ch.id)}
                          className={`h-4 px-1 rounded border text-[8px] font-black transition-all cursor-pointer ${
                            isSoloed
                              ? "border-amber bg-amber text-black"
                              : "border-white/10 bg-pit text-faint hover:text-ink"
                          }`}
                        >
                          S
                        </button>
                      </div>

                      <div
                        onClick={() => playAuditionSound(ch.id, ch.stepNotes?.[activeStep])}
                        className={`flex items-center gap-1.5 w-44 shrink-0 cursor-pointer group px-1.5 py-1 rounded transition-all duration-75 ${
                          isStepTriggered
                            ? "scale-[1.04] bg-white/20"
                            : "hover:bg-white/5"
                        }`}
                        style={
                          isStepTriggered
                            ? {
                                boxShadow: `0 0 16px 2px ${ch.glow}`,
                                backgroundColor: `${ch.color}35`,
                              }
                            : undefined
                        }
                      >
                        <span className={`font-mono text-[9px] font-bold tracking-wider ${isStepTriggered ? "text-white" : "text-faint"}`}>
                          {ch.num}
                        </span>
                        <span
                          className={`font-black text-[11px] truncate transition-all duration-75 flex-1 ${
                            isStepTriggered ? "text-white drop-shadow-[0_0_10px_#fff]" : "drop-shadow"
                          }`}
                          style={{ color: isStepTriggered ? "#ffffff" : ch.color }}
                        >
                          {ch.name}
                        </span>
                        {isMelodicChannel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePianoRollTrack({
                                id: ch.id,
                                name: ch.name,
                                notes: ch.stepNotes,
                              });
                            }}
                            className="px-1 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-[8px] font-bold text-purple-300 hover:bg-purple-500 hover:text-black transition"
                          >
                            ROLL
                          </button>
                        )}
                      </div>

                      <div className="w-14 shrink-0 flex items-center gap-0.5 px-1 bg-[#05070a] rounded py-1 border border-white/10 shadow-inner">
                        {[...Array(10)].map((_, segIdx) => {
                          const segThreshold = (segIdx / 10) * 100;
                          const isLit = peakLevel > segThreshold;
                          return (
                            <div
                              key={segIdx}
                              className={`h-2.5 flex-1 rounded-[1px] ${
                                isLit ? "bg-[#00ff9d]" : "bg-[#181e2b]"
                              }`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex-1 grid grid-cols-16 gap-1 min-w-[160px] relative">
                        {ch.steps.map((isActiveStep, sIdx) => {
                          const isBeatQuarter = sIdx % 4 === 0;
                          const isCurrentlyPlayingThisStep = activeStep === sIdx && isMasterPlaying;
                          const stepNote = ch.stepNotes?.[sIdx];

                          return (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => toggleStep(ch.id, sIdx)}
                              style={
                                isActiveStep && isCurrentlyPlayingThisStep
                                  ? {
                                      boxShadow: `0 0 22px 5px ${ch.color}`,
                                      backgroundColor: "#ffffff",
                                      borderColor: ch.color,
                                    }
                                  : undefined
                              }
                              className={`h-6 rounded-[2px] border transition-all duration-75 cursor-pointer ${
                                isActiveStep
                                  ? isBeatQuarter
                                    ? "bg-[#ff3366] border-[#ff6688]"
                                    : "bg-[#8899aa] border-[#aabbcc]"
                                  : isBeatQuarter
                                  ? "bg-[#1c2230] border-white/10"
                                  : "bg-[#10141d] border-white/5"
                              }`}
                            >
                              {isActiveStep && stepNote ? (
                                <span className="font-mono text-[7px] text-white font-bold">{stepNote}</span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[#0a0c12] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-faint">
        <div className="flex items-center gap-2">
          <span className="text-cyanx font-bold">ACTIVE SECTION: {effectiveSectionKey.toUpperCase()}</span>
          <span>·</span>
          <span>{filteredChannels.length} Stems Loaded</span>
          <span>·</span>
          <span className="text-amber">Key: {keySignature}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Click pads to program notes · Click channel name to audition sound</span>
        </div>
      </div>

      {activePianoRollTrack && (
        <PianoRollModal
          isOpen={!!activePianoRollTrack}
          onClose={() => setActivePianoRollTrack(null)}
          channelName={activePianoRollTrack.name}
          keySignature={keySignature}
          stepNotes={activePianoRollTrack.notes}
        />
      )}
    </div>
  );
}
