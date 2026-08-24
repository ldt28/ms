import React, { useState } from "react";

interface EQBand {
  id: string;
  name: string;
  type: "lowcut" | "lowshelf" | "bell" | "highshelf";
  freqHz: number;
  gainDb: number;
  q: number;
  color: string;
}

const DEFAULT_BANDS: EQBand[] = [
  { id: "hpf", name: "LOW CUT (HPF)", type: "lowcut", freqHz: 30, gainDb: 0, q: 0.7, color: "#ff3366" },
  { id: "low", name: "808 SUB BASS", type: "lowshelf", freqHz: 80, gainDb: 2.5, q: 1.0, color: "#b026ff" },
  { id: "mid", name: "VOCAL PRESENCE", type: "bell", freqHz: 1800, gainDb: 1.5, q: 1.4, color: "#00ff9d" },
  { id: "high", name: "AIR & SHIMMER", type: "highshelf", freqHz: 10000, gainDb: 2.0, q: 0.8, color: "#00f0ff" },
];

const PRESETS: Record<string, { label: string; bands: EQBand[]; icon: string }> = {
  flat: {
    label: "FLAT / BYPASS",
    icon: "🎚️",
    bands: [
      { id: "hpf", name: "LOW CUT", type: "lowcut", freqHz: 20, gainDb: 0, q: 0.7, color: "#ff3366" },
      { id: "low", name: "808 BASS", type: "lowshelf", freqHz: 80, gainDb: 0, q: 1.0, color: "#b026ff" },
      { id: "mid", name: "MIDRANGE", type: "bell", freqHz: 1500, gainDb: 0, q: 1.0, color: "#00ff9d" },
      { id: "high", name: "AIR", type: "highshelf", freqHz: 10000, gainDb: 0, q: 0.8, color: "#00f0ff" },
    ],
  },
  bassBoost: {
    label: "💥 808 CLUB BASS BOOST",
    icon: "💥",
    bands: [
      { id: "hpf", name: "LOW CUT", type: "lowcut", freqHz: 32, gainDb: 0, q: 0.7, color: "#ff3366" },
      { id: "low", name: "808 BASS", type: "lowshelf", freqHz: 65, gainDb: 5.5, q: 1.2, color: "#b026ff" },
      { id: "mid", name: "BOX SCOOP", type: "bell", freqHz: 380, gainDb: -3.0, q: 2.0, color: "#ffaa00" },
      { id: "high", name: "AIR", type: "highshelf", freqHz: 10000, gainDb: 1.5, q: 0.8, color: "#00f0ff" },
    ],
  },
  vocalFocus: {
    label: "🎙️ ACAPELLA / VOCAL FOCUS",
    icon: "🎙️",
    bands: [
      { id: "hpf", name: "LOW CUT", type: "lowcut", freqHz: 160, gainDb: 0, q: 0.9, color: "#ff3366" },
      { id: "low", name: "MUD CUT", type: "lowshelf", freqHz: 250, gainDb: -4.0, q: 1.5, color: "#b026ff" },
      { id: "mid", name: "VOCAL BITE", type: "bell", freqHz: 2800, gainDb: 4.5, q: 1.6, color: "#00ff9d" },
      { id: "high", name: "AIR SHINE", type: "highshelf", freqHz: 12000, gainDb: 3.5, q: 0.8, color: "#00f0ff" },
    ],
  },
  lofiRadio: {
    label: "📻 VINTAGE LO-FI TELEPHONE",
    icon: "📻",
    bands: [
      { id: "hpf", name: "LOW CUT", type: "lowcut", freqHz: 450, gainDb: 0, q: 1.5, color: "#ff3366" },
      { id: "low", name: "WARMTH", type: "lowshelf", freqHz: 600, gainDb: 2.0, q: 1.0, color: "#b026ff" },
      { id: "mid", name: "HORN PEAK", type: "bell", freqHz: 1600, gainDb: 6.0, q: 3.0, color: "#ffaa00" },
      { id: "high", name: "HIGH CUT", type: "highshelf", freqHz: 3800, gainDb: -14.0, q: 1.2, color: "#00f0ff" },
    ],
  },
};

export function StudioParametricEQ() {
  const [bands, setBands] = useState<EQBand[]>(DEFAULT_BANDS);
  const [activePreset, setActivePreset] = useState<string>("bassBoost");
  const [isBypassed, setIsBypassed] = useState(false);

  const applyPreset = (key: string) => {
    setActivePreset(key);
    if (PRESETS[key]) {
      setBands(PRESETS[key].bands);
    }
  };

  const updateBandGain = (id: string, newGain: number) => {
    setBands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, gainDb: Math.max(-15, Math.min(15, newGain)) } : b))
    );
  };

  const updateBandFreq = (id: string, newFreq: number) => {
    setBands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, freqHz: Math.max(20, Math.min(20000, newFreq)) } : b))
    );
  };

  return (
    <div className="hud-panel rounded-2xl border border-cyanx/30 bg-gradient-to-b from-[#0c101c] via-[#080b14] to-[#04060b] p-4 sm:p-6 shadow-2xl font-mono text-xs select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-mint/60 bg-mint/20 text-mint text-lg shadow-md shadow-mint/20">
            🎚️
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-mint tracking-[0.2em]">MASTERING EQ // 4-BAND PARAMETRIC FILTER</span>
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-ping" />
            </div>
            <h3 className="font-display text-base font-black text-ink">
              Studio Mastering Equalizer & Tone Sculptor
            </h3>
          </div>
        </div>

        {/* Bypass & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBypassed(!isBypassed)}
            className={`rounded-lg px-3 py-1 font-bold text-[10.5px] transition cursor-pointer border ${
              isBypassed
                ? "bg-rosex/20 text-rosex border-rosex/50"
                : "bg-mint/20 text-mint border-mint/50 shadow-sm shadow-mint/30"
            }`}
          >
            {isBypassed ? "BYPASS: ON" : "✓ EQ ACTIVE"}
          </button>
        </div>
      </div>

      {/* Preset Selector Bar */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-faint mr-1">PRESETS:</span>
        {Object.entries(PRESETS).map(([k, p]) => (
          <button
            key={k}
            type="button"
            onClick={() => applyPreset(k)}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer ${
              activePreset === k
                ? "bg-amber text-black shadow-md shadow-amber/30 font-black"
                : "bg-pit/80 border border-white/10 text-dim hover:text-ink hover:border-amber/40"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Interactive EQ Curve Visualizer Canvas */}
      <div className="mt-4 relative h-36 sm:h-44 rounded-xl bg-[#030509] border border-white/10 p-3 overflow-hidden shadow-inner flex flex-col justify-between">
        {/* Grid Scale Labels */}
        <div className="flex justify-between text-[8px] text-faint/60 pointer-events-none">
          <span>20Hz</span>
          <span>100Hz</span>
          <span>500Hz</span>
          <span>1kHz</span>
          <span>5kHz</span>
          <span>10kHz</span>
          <span>20kHz</span>
        </div>

        {/* Dynamic SVG Frequency Curve */}
        <svg className="absolute inset-0 w-full h-full p-3 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 60">
          {/* Zero dB Reference Line */}
          <line x1="0" y1="30" x2="100" y2="30" stroke="#ffffff15" strokeWidth="0.8" strokeDasharray="2,2" />

          {/* EQ Filter Response Curve */}
          <path
            d={`M 0 30 
                Q 15 ${30 - (isBypassed ? 0 : bands[1].gainDb * 1.5)} 30 ${30 - (isBypassed ? 0 : bands[1].gainDb * 1.2)} 
                T 60 ${30 - (isBypassed ? 0 : bands[2].gainDb * 1.5)} 
                T 100 ${30 - (isBypassed ? 0 : bands[3].gainDb * 1.5)}`}
            fill="none"
            stroke={isBypassed ? "#888888" : "#00ff9d"}
            strokeWidth="2.2"
            className={isBypassed ? "" : "drop-shadow-[0_0_8px_#00ff9d]"}
          />
        </svg>

        {/* Interactive Draggable EQ Nodes */}
        <div className="absolute inset-0 p-3 flex items-center justify-between pointer-events-none">
          {bands.map((b, idx) => {
            const xPosPct = (idx / (bands.length - 1)) * 88 + 6;
            const yPosPct = 50 - (isBypassed ? 0 : (b.gainDb / 15) * 40);

            return (
              <div
                key={b.id}
                style={{ left: `${xPosPct}%`, top: `${yPosPct}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto"
              >
                <div
                  className="h-4 w-4 rounded-full border-2 border-white cursor-pointer transition-transform hover:scale-125 shadow-md flex items-center justify-center text-[7px] font-black text-black"
                  style={{ backgroundColor: b.color }}
                >
                  {idx + 1}
                </div>
                <span className="text-[8px] font-mono text-white bg-black/70 px-1 rounded mt-0.5 whitespace-nowrap">
                  {b.gainDb > 0 ? `+${b.gainDb.toFixed(1)}` : b.gainDb.toFixed(1)} dB
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between text-[8px] text-faint/60 pointer-events-none">
          <span>-12dB</span>
          <span className="text-dim">0dB FLAT</span>
          <span>+12dB</span>
        </div>
      </div>

      {/* 4 Band Sliders & Controls */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {bands.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-white/10 bg-pit/70 p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-[10px] text-ink truncate" style={{ color: b.color }}>
                {b.name}
              </span>
              <span className="text-[9px] font-mono font-bold text-white">
                {b.gainDb > 0 ? `+${b.gainDb.toFixed(1)}` : b.gainDb.toFixed(1)} dB
              </span>
            </div>

            {/* Gain Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[8.5px] text-faint">
                <span>GAIN</span>
                <span>±15 dB</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={b.gainDb}
                onChange={(e) => updateBandGain(b.id, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#06080e] rounded-lg appearance-none cursor-pointer accent-cyanx"
              />
            </div>

            {/* Frequency Display */}
            <div className="flex justify-between items-center text-[9px] text-faint pt-1 border-t border-white/5">
              <span>FREQ:</span>
              <span className="font-mono text-cyanx font-bold">{b.freqHz >= 1000 ? `${(b.freqHz / 1000).toFixed(1)} kHz` : `${b.freqHz} Hz`}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 text-[10px] text-faint">
        <span>Linear-phase studio filter algorithms · Non-destructive live preview</span>
        <span className="text-mint font-bold">4 BANDS ACTIVE</span>
      </div>
    </div>
  );
}
