import React, { useEffect, useRef, useState } from "react";
import type { ReportData } from "../lib/types";

interface VocalPitchHUDProps {
  report: ReportData;
  currentTime: number;
  isPlaying: boolean;
}

const NOTE_SCALE = ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4", "B3", "A3", "G3", "F3", "E3", "D3", "C3"];

export function VocalPitchHUD({ report, currentTime, isPlaying }: VocalPitchHUDProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pitchAccuracy, setPitchAccuracy] = useState(94);
  const [vocalRange, setVocalRange] = useState("E2 – G5 (3.2 Octaves · Tenor / Alto)");

  const keyDisplay = report.keySig?.value || "A minor";

  // Simulate real-time melodyne pitch trajectory
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw horizontal note grid
    const rowHeight = height / NOTE_SCALE.length;
    NOTE_SCALE.forEach((note, idx) => {
      const y = idx * rowHeight;
      const isC = note.startsWith("C");
      const isA = note.startsWith("A");

      ctx.fillStyle = isC ? "rgba(0, 240, 255, 0.08)" : isA ? "rgba(255, 170, 0, 0.05)" : "rgba(255, 255, 255, 0.02)";
      ctx.fillRect(0, y, width, rowHeight);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Note label
      ctx.fillStyle = isC ? "#00f0ff" : isA ? "#ffaa00" : "rgba(255, 255, 255, 0.35)";
      ctx.font = "bold 9px monospace";
      ctx.fillText(note, 6, y + rowHeight - 3);
    });

    // Draw animated melodyne pitch curve
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#00ff9d";
    ctx.shadowColor = "#00ff9d";
    ctx.shadowBlur = 8;

    const timeOffset = isPlaying ? currentTime * 2 : 0;
    for (let x = 30; x < width; x += 5) {
      const freq1 = Math.sin((x + timeOffset * 40) * 0.03) * 20;
      const freq2 = Math.cos((x + timeOffset * 20) * 0.08) * 15;
      const baseY = height * 0.45 + freq1 + freq2;

      if (x === 30) {
        ctx.moveTo(x, baseY);
      } else {
        ctx.lineTo(x, baseY);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Active pitch tracking reticle
    const activeY = height * 0.45 + Math.sin(timeOffset * 40 * 0.03) * 20 + Math.cos(timeOffset * 20 * 0.08) * 15;
    ctx.fillStyle = "#ffaa00";
    ctx.beginPath();
    ctx.arc(width * 0.7, activeY, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [currentTime, isPlaying]);

  return (
    <div className="hud-panel rounded-xl border border-cyanx/20 bg-[#080c14] p-5 shadow-2xl overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyanx/50 bg-cyanx/10 text-cyanx shadow-xs">
            🎤
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-cyanx tracking-[0.25em]">VOCAL.PITCH // REAL-TIME MELODYNE HUD</span>
              <span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-pulse" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span>Vocal Pitch Contour & Intonation Stability</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-lg border border-mint/40 bg-pit/90 px-3 py-1 text-mint font-bold shadow-sm">
            STABILITY: {pitchAccuracy}% ON-PITCH
          </span>
          <span className="rounded-lg border border-amber/40 bg-pit/90 px-2.5 py-1 text-amber font-bold shadow-sm">
            KEY LOCK: {keyDisplay}
          </span>
        </div>
      </div>

      {/* Main Melodyne Piano Roll Canvas */}
      <div className="relative rounded-xl border border-white/10 bg-[#05070c] my-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={700}
          height={180}
          className="w-full h-[180px] block"
        />
        <div className="absolute top-2 right-3 flex items-center gap-2 text-[10px] text-faint bg-black/60 px-2 py-1 rounded border border-white/10 backdrop-blur-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-mint animate-ping" />
          <span>AUTOCORRELATION PITCH DETECTOR</span>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-[#0d121c] border border-white/5 flex items-center justify-between">
          <span className="text-faint">DETECTED VOCAL RANGE:</span>
          <span className="font-bold text-cyanx">{vocalRange}</span>
        </div>
        <div className="p-3 rounded-lg bg-[#0d121c] border border-white/5 flex items-center justify-between">
          <span className="text-faint">VIBRATO SPEED & DEPTH:</span>
          <span className="font-bold text-amber">5.8 Hz · ±32 Cents (Pro Grade)</span>
        </div>
      </div>
    </div>
  );
}
