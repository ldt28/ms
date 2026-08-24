import React, { useEffect, useState } from "react";
import { playAuditionSound } from "../lib/patternEngine";

interface MPCPad {
  id: string;
  name: string;
  key: string;
  category: "drum" | "synth" | "vocal" | "fx";
  color: string;
  note?: string;
}

const MPC_PADS: MPCPad[] = [
  { id: "kick_punch", name: "KICK PUNCH", key: "1", category: "drum", color: "#ff3366" },
  { id: "sub_808", name: "808 SUB (F1)", key: "2", category: "drum", color: "#b026ff", note: "F1" },
  { id: "snare_acoustic", name: "SNARE WOOD", key: "3", category: "drum", color: "#00f0ff" },
  { id: "clap_snap", name: "HAND CLAP", key: "4", category: "drum", color: "#ffd54f" },

  { id: "hat_closed", name: "CLOSED HAT", key: "Q", category: "drum", color: "#00ff9d" },
  { id: "hat_triplet_rolls", name: "TRIPLET ROLL", key: "W", category: "drum", color: "#00ff9d" },
  { id: "hat_open", name: "OPEN SIZZLE", key: "E", category: "drum", color: "#00ff9d" },
  { id: "perc_rim", name: "PERC / RIM", key: "R", category: "drum", color: "#ff007f" },

  { id: "piano_chords", name: "PIANO (Fm)", key: "A", category: "synth", color: "#b026ff", note: "Fm" },
  { id: "rhodes_keys", name: "RHODES (Db)", key: "S", category: "synth", color: "#b026ff", note: "Dbmaj7" },
  { id: "lead_synth", name: "LEAD SYNTH", key: "D", category: "synth", color: "#00f0ff", note: "C5" },
  { id: "pluck_arp", name: "PLUCK ARP", key: "F", category: "synth", color: "#00ff9d", note: "Ab5" },

  { id: "slide_808", name: "808 GLIDE", key: "Z", category: "drum", color: "#b026ff", note: "F1➔Ab1" },
  { id: "vocal_adlib", name: "SHABANG! TAG", key: "X", category: "vocal", color: "#ff007f", note: "Shabang!" },
  { id: "strings_orchestral", name: "STRINGS SWELL", key: "C", category: "synth", color: "#ffd54f" },
  { id: "riser_fx", name: "WHITE NOISE FX", key: "V", category: "fx", color: "#ff3366" },
];

export function LiveMPCPadSampler() {
  const [activePads, setActivePads] = useState<Record<string, boolean>>({});
  const [padHitCounts, setPadHitCounts] = useState<Record<string, number>>({});
  const [isExpanded, setIsExpanded] = useState(false);

  const triggerPad = (pad: MPCPad) => {
    playAuditionSound(pad.id, pad.note);

    setActivePads((prev) => ({ ...prev, [pad.id]: true }));
    setPadHitCounts((prev) => ({ ...prev, [pad.id]: (prev[pad.id] || 0) + 1 }));

    setTimeout(() => {
      setActivePads((prev) => ({ ...prev, [pad.id]: false }));
    }, 120);
  };

  // Keyboard Event Listeners for Finger Drumming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const pressedKey = e.key.toUpperCase();
      const matched = MPC_PADS.find((p) => p.key === pressedKey);
      if (matched) {
        e.preventDefault();
        triggerPad(matched);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="hud-panel rounded-2xl border border-cyanx/30 bg-gradient-to-b from-[#0e1322] via-[#090d17] to-[#06080e] p-4 sm:p-6 shadow-2xl font-mono text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyanx/60 bg-cyanx/20 text-cyanx text-lg shadow-md shadow-cyanx/20">
            🎛️
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-cyanx tracking-[0.2em]">LIVE MPC SAMPLER // FINGER DRUMMING HUD</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-ping" />
            </div>
            <h3 className="font-display text-base font-black text-ink">
              16-Pad Velocity Drum Machine & Soundboard
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline rounded bg-pit border border-white/10 px-2.5 py-1 text-[10px] text-faint">
            KEYBOARD HOTKEYS: <strong className="text-cyanx">[1-4] [Q-R] [A-F] [Z-V]</strong>
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg border border-white/10 bg-pit/80 px-2.5 py-1 text-[10.5px] font-bold text-dim hover:text-ink transition cursor-pointer"
          >
            {isExpanded ? "▲ COLLAPSE" : "▼ EXPAND PADS"}
          </button>
        </div>
      </div>

      {/* 4x4 MPC Trigger Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {MPC_PADS.map((pad) => {
          const isHit = !!activePads[pad.id];
          const hitCount = padHitCounts[pad.id] || 0;

          return (
            <button
              key={pad.id}
              type="button"
              onClick={() => triggerPad(pad)}
              style={
                isHit
                  ? {
                      boxShadow: `0 0 25px 4px ${pad.color}, 0 0 10px #fff`,
                      borderColor: "#ffffff",
                      backgroundColor: `${pad.color}40`,
                    }
                  : undefined
              }
              className={`relative h-20 sm:h-24 rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-75 cursor-pointer text-left overflow-hidden ${
                isHit
                  ? "scale-95 brightness-150 z-10"
                  : "bg-[#0b0f19] border-white/10 hover:border-white/30 hover:bg-[#121828] active:scale-95"
              }`}
            >
              {/* Hotkey Indicator & Category Tag */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded font-mono text-[10px] font-black border transition ${
                    isHit
                      ? "bg-white text-black border-white shadow-sm"
                      : "bg-black/50 text-white border-white/20"
                  }`}
                >
                  {pad.key}
                </span>

                <span
                  className="rounded px-1.5 py-0.2 text-[8px] font-bold uppercase tracking-wider"
                  style={{ color: pad.color, backgroundColor: `${pad.color}15` }}
                >
                  {pad.category}
                </span>
              </div>

              {/* Pad Title & Note */}
              <div className="min-w-0">
                <div
                  className="font-display text-xs font-black truncate"
                  style={{ color: isHit ? "#ffffff" : pad.color }}
                >
                  {pad.name}
                </div>
                <div className="text-[9px] text-faint flex items-center justify-between mt-0.5 font-mono">
                  <span>{pad.note || "Drum Hit"}</span>
                  {hitCount > 0 && <span className="text-[8px] text-dim">{hitCount}x</span>}
                </div>
              </div>

              {/* Bottom Glow Indicator Bar */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1 transition-all"
                style={{
                  backgroundColor: pad.color,
                  opacity: isHit ? 1 : 0.4,
                  boxShadow: isHit ? `0 0 8px ${pad.color}` : "none",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2.5 text-[10px] text-faint">
        <span>Zero-latency WebAudio synthesized DSP engines · Touch or tap computer keyboard to perform live</span>
        <span className="text-cyanx font-bold">16 STEM SAMPLES ACTIVE</span>
      </div>
    </div>
  );
}
