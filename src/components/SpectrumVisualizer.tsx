import { useEffect, useRef, useState } from "react";
import {
  EQ_PRESETS,
  liveAudioGraph,
  type EqBands,
  type EqPresetKey,
} from "../lib/liveAudioGraph";

export type VisualizerMode = "spectrum" | "oscilloscope" | "dual";

interface SpectrumVisualizerProps {
  audio: HTMLAudioElement | null;
  isPlaying: boolean;
  className?: string;
}

export function SpectrumVisualizer({
  audio,
  isPlaying,
  className = "",
}: SpectrumVisualizerProps) {
  const [mode, setMode] = useState<VisualizerMode>("spectrum");
  const [showEqRack, setShowEqRack] = useState(false);
  const [bands, setBands] = useState<EqBands>(() => liveAudioGraph.getBands());
  const [activePreset, setActivePreset] = useState<EqPresetKey>(() => liveAudioGraph.getActivePreset());

  // HUD stats
  const [fps, setFps] = useState(60);
  const [peakFreqHz, setPeakFreqHz] = useState<number>(0);
  const [currentRms, setCurrentRms] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const peakHoldRef = useRef<number[]>([]);
  const lastFpsUpdateRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  // Initialize Web Audio graph when audio element is present
  useEffect(() => {
    if (audio) {
      liveAudioGraph.init(audio);
      setBands(liveAudioGraph.getBands());
      setActivePreset(liveAudioGraph.getActivePreset());
    }
  }, [audio]);

  // Main 60 FPS Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const binCount = liveAudioGraph.getFrequencyBinCount();
    const freqData = new Uint8Array(binCount);
    const timeData = new Uint8Array(binCount);

    // Initialize peak hold buffer
    const barCount = 64;
    if (peakHoldRef.current.length !== barCount) {
      peakHoldRef.current = new Array(barCount).fill(0);
    }

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Measure FPS
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsUpdateRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      // 2. Fetch Audio Data
      const hasAudioData = isPlaying && (liveAudioGraph.getFrequencyData(freqData) && liveAudioGraph.getTimeDomainData(timeData));

      // Calculate simulated fallback if no real audio element connected or paused
      if (!hasAudioData) {
        freqData.fill(0);
        timeData.fill(128);
      }

      // 3. Calculate Peak Frequency & RMS Level
      let maxVal = 0;
      let maxIdx = 0;
      let sumSquares = 0;

      for (let i = 0; i < binCount; i++) {
        const val = freqData[i];
        if (val > maxVal) {
          maxVal = val;
          maxIdx = i;
        }
        const norm = (timeData[i] - 128) / 128;
        sumSquares += norm * norm;
      }

      const rms = Math.sqrt(sumSquares / binCount);
      if (frameCountRef.current % 4 === 0) {
        // Approximate Nyquist frequency ~ 22050 Hz across bins
        const approxHz = Math.round((maxIdx / binCount) * 22050);
        setPeakFreqHz(maxVal > 20 ? approxHz : 0);
        setCurrentRms(Math.round(rms * 100));
      }

      // 4. Clear Canvas & Draw Background Grid
      ctx.fillStyle = "#090d14";
      ctx.fillRect(0, 0, width, height);

      // Subtle Cyber Grid
      ctx.strokeStyle = "rgba(88, 199, 216, 0.05)";
      ctx.lineWidth = 1;
      const gridGap = 28;
      for (let x = 0; x < width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center zero-line for oscilloscope
      ctx.strokeStyle = "rgba(240, 166, 63, 0.12)";
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // 5. Draw FFT Spectrum Bars
      if (mode === "spectrum" || mode === "dual") {
        const padX = 12;
        const availW = width - padX * 2;
        const barW = Math.max(2, availW / barCount - 2.5);
        const maxBarHeight = height - 24;

        for (let i = 0; i < barCount; i++) {
          // Logarithmic bin mapping for psychoacoustic frequency balance
          const logIdx = Math.floor(Math.pow(i / barCount, 1.6) * (binCount - 4));
          const val = freqData[logIdx] / 255;
          const barH = Math.max(3, val * maxBarHeight);

          // Update Peak Hold
          if (val >= peakHoldRef.current[i]) {
            peakHoldRef.current[i] = val;
          } else {
            peakHoldRef.current[i] = Math.max(0, peakHoldRef.current[i] - 0.015);
          }

          const bx = padX + i * (barW + 2.5);
          const by = height - 12 - barH;

          // Color Gradient by frequency zone (Bass = Amber/Red, Mids = Cyan/Teal, Highs = Violet/Pink)
          const grad = ctx.createLinearGradient(0, height - 12, 0, by);
          if (i < 12) {
            grad.addColorStop(0, "#f0a63f");
            grad.addColorStop(1, "#ffc069");
          } else if (i < 38) {
            grad.addColorStop(0, "#45d498");
            grad.addColorStop(1, "#58c7d8");
          } else {
            grad.addColorStop(0, "#58c7d8");
            grad.addColorStop(1, "#a855f7");
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(bx, by, barW, barH, [2, 2, 0, 0]);
          ctx.fill();

          // Peak drop cap
          const peakY = height - 12 - peakHoldRef.current[i] * maxBarHeight;
          if (peakHoldRef.current[i] > 0.04) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(bx, Math.max(6, peakY - 2), barW, 2);
          }
        }
      }

      // 6. Draw Oscilloscope Waveform Line
      if (mode === "oscilloscope" || mode === "dual") {
        ctx.save();
        ctx.shadowColor = "#58c7d8";
        ctx.shadowBlur = mode === "dual" ? 6 : 10;
        ctx.strokeStyle = mode === "dual" ? "rgba(88, 199, 216, 0.85)" : "#58c7d8";
        ctx.lineWidth = mode === "dual" ? 1.8 : 2.4;

        ctx.beginPath();
        const sliceWidth = width / binCount;
        let x = 0;

        for (let i = 0; i < binCount; i++) {
          const v = timeData[i] / 128.0; // 0..2
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, isPlaying]);

  const handlePresetSelect = (presetKey: EqPresetKey) => {
    liveAudioGraph.ensureRunning();
    liveAudioGraph.applyPreset(presetKey);
    setActivePreset(presetKey);
    setBands(liveAudioGraph.getBands());
  };

  const handleBandChange = (band: keyof EqBands, value: number) => {
    liveAudioGraph.ensureRunning();
    liveAudioGraph.setBand(band, value);
    setActivePreset("flat");
    setBands(liveAudioGraph.getBands());
  };

  const handleResetBands = () => {
    handlePresetSelect("flat");
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-linesoft bg-pit/90 shadow-xl ${className}`}>
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linesoft/80 px-4 py-2.5 bg-pit">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPlaying ? "bg-mint shadow-sm shadow-mint animate-pulse" : "bg-faint"
              }`}
            />
            <span className="font-mono text-[11px] font-bold tracking-wider text-ink uppercase">
              DSP SPECTRUM & EQ
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-md border border-line bg-surface p-0.5">
            {(["spectrum", "oscilloscope", "dual"] as VisualizerMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded px-2.5 py-0.5 font-mono text-[10px] font-semibold transition ${
                  mode === m ? "bg-cyanx/20 text-cyanx" : "text-dim hover:text-ink"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Live HUD telemetry readouts & EQ Toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 font-mono text-[10px] text-faint">
            <span>
              PEAK: <strong className="text-amber">{peakFreqHz ? `${peakFreqHz} Hz` : "—"}</strong>
            </span>
            <span>
              RMS: <strong className="text-cyanx">{currentRms}%</strong>
            </span>
            <span>
              FPS: <strong className="text-mint">{fps}</strong>
            </span>
          </div>

          <button
            onClick={() => setShowEqRack(!showEqRack)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 font-mono text-[10.5px] font-bold tracking-wide transition ${
              showEqRack || activePreset !== "flat"
                ? "border-amber bg-amber/15 text-amber shadow-sm shadow-amber/20"
                : "border-line bg-surface text-dim hover:border-cyanx/50 hover:text-cyanx"
            }`}
          >
            <span>🎛️</span>
            <span>EQ RACK</span>
            {activePreset !== "flat" && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Canvas Screen */}
      <div className="relative h-[160px] sm:h-[190px] w-full bg-[#090d14]">
        <canvas
          ref={canvasRef}
          width={760}
          height={190}
          className="h-full w-full object-cover"
        />

        {/* Frequency Band Legend Overlay */}
        <div className="pointer-events-none absolute bottom-1.5 left-3 right-3 flex justify-between font-mono text-[8.5px] text-faint tracking-wider">
          <span>SUB (30Hz)</span>
          <span>BASS (120Hz)</span>
          <span>LOW-MID (500Hz)</span>
          <span>VOCALS (2.5kHz)</span>
          <span>PRESENCE (8kHz)</span>
          <span>AIR (16kHz)</span>
        </div>

        {!isPlaying && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <span className="rounded-full border border-line bg-pit/80 px-4 py-1.5 font-mono text-xs text-dim shadow-lg">
              ▶ Press Play on the timeline to engage real-time DSP stream
            </span>
          </div>
        )}
      </div>

      {/* Collapsible Parametric EQ Rack Drawer */}
      {showEqRack && (
        <div className="border-t border-linesoft bg-pit/95 p-4 sm:p-5 transition-all animate-fadeIn">
          {/* Preset Selectors */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="kicker">Live Audio Filters & Presets</span>
              <h4 className="font-display text-sm font-bold text-ink">Parametric EQ Engine</h4>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EQ_PRESETS) as EqPresetKey[]).map((key) => {
                const p = EQ_PRESETS[key];
                const isActive = activePreset === key;
                return (
                  <button
                    key={key}
                    onClick={() => handlePresetSelect(key)}
                    title={p.desc}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition ${
                      isActive
                        ? "border-amber bg-amber/20 text-amber shadow-sm shadow-amber/20 font-bold"
                        : "border-linesoft bg-surface text-dim hover:border-line hover:text-ink"
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Interactive Band Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-xl border border-linesoft bg-surface/60 p-4">
            {/* 1. Bass */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber">100 Hz (Bass)</span>
                <span className="font-mono text-xs font-bold text-ink">
                  {bands.bass > 0 ? `+${bands.bass.toFixed(1)}` : bands.bass.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={bands.bass}
                onChange={(e) => handleBandChange("bass", parseFloat(e.target.value))}
                className="accent-amber cursor-pointer h-2 bg-line rounded-lg"
              />
              <span className="font-mono text-[9px] text-faint">Kick, 808s, Sub resonance</span>
            </div>

            {/* 2. Low-Mid */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyanx">500 Hz (Low Mid)</span>
                <span className="font-mono text-xs font-bold text-ink">
                  {bands.lowMid > 0 ? `+${bands.lowMid.toFixed(1)}` : bands.lowMid.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={bands.lowMid}
                onChange={(e) => handleBandChange("lowMid", parseFloat(e.target.value))}
                className="accent-cyanx cursor-pointer h-2 bg-line rounded-lg"
              />
              <span className="font-mono text-[9px] text-faint">Snare body, Bass guitar warmth</span>
            </div>

            {/* 3. Vocal Mid */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-mint">2.5 kHz (Vocal Mid)</span>
                <span className="font-mono text-xs font-bold text-ink">
                  {bands.vocalMid > 0 ? `+${bands.vocalMid.toFixed(1)}` : bands.vocalMid.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={bands.vocalMid}
                onChange={(e) => handleBandChange("vocalMid", parseFloat(e.target.value))}
                className="accent-mint cursor-pointer h-2 bg-line rounded-lg"
              />
              <span className="font-mono text-[9px] text-faint">Lead vocals, Speech intelligibility</span>
            </div>

            {/* 4. Treble */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-[#a855f7]">8.0 kHz (Treble)</span>
                <span className="font-mono text-xs font-bold text-ink">
                  {bands.treble > 0 ? `+${bands.treble.toFixed(1)}` : bands.treble.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={bands.treble}
                onChange={(e) => handleBandChange("treble", parseFloat(e.target.value))}
                className="accent-[#a855f7] cursor-pointer h-2 bg-line rounded-lg"
              />
              <span className="font-mono text-[9px] text-faint">Hi-hats, Cymbals, Air shimmer</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-faint">
              Direct real-time Web Audio biquad filtering · Zero latency
            </span>
            <button
              onClick={handleResetBands}
              className="font-mono text-xs text-dim hover:text-ink underline decoration-line transition"
            >
              Reset All Bands to 0 dB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
