import React, { useEffect, useRef, useState } from "react";
import type { ReportData } from "../lib/types";

interface AnimatedSocialExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ReportData;
  currentTime: number;
}

export function AnimatedSocialExportModal({
  isOpen,
  onClose,
  report,
  currentTime,
}: AnimatedSocialExportModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<"reel" | "story">("reel");
  const [downloading, setDownloading] = useState(false);

  const title = report.meta.title || "Track Title";
  const artist = report.meta.artist || "Artist Name";
  const bpm = report.tempo?.value ? Math.round(report.tempo.value) : 120;
  const keyDisplay = report.keySig?.value || "A minor";

  // Render 9:16 animated canvas
  useEffect(() => {
    if (!isOpen) return;
    let animId = 0;
    let rotation = 0;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Futuristic Background Gradient
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#080c14");
      grad.addColorStop(0.5, "#101626");
      grad.addColorStop(1, "#05070a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle ambient glowing circles
      ctx.fillStyle = "rgba(0, 240, 255, 0.12)";
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.35, 160, 0, Math.PI * 2);
      ctx.fill();

      // 2. Top Header HUD
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "bold 18px monospace";
      ctx.textAlign = "center";
      ctx.fillText("SIGNAL // AUDIO FORENSICS CARD", w / 2, 80);

      // 3. Spinning Holographic 3D Vinyl
      rotation += 0.02;
      const cx = w / 2;
      const cy = h * 0.38;
      const radius = 130;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      // Outer Vinyl Disc
      ctx.fillStyle = "#11141c";
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Vinyl Grooves
      [0.85, 0.7, 0.55].forEach((rPct) => {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, radius * rPct, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Center Label
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(0, 0, 45, 0, Math.PI * 2);
      ctx.fill();

      // Spindle hole
      ctx.fillStyle = "#05070a";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 4. Real-time Pulsing Neon Spectrum Visualizer
      const bars = 28;
      const barWidth = 10;
      const startX = (w - bars * (barWidth + 4)) / 2;
      const baseY = h * 0.62;

      for (let i = 0; i < bars; i++) {
        const barHeight = Math.sin(Date.now() * 0.005 + i * 0.4) * 25 + 35;
        const x = startX + i * (barWidth + 4);

        ctx.fillStyle = i % 2 === 0 ? "#00f0ff" : "#ffaa00";
        ctx.shadowColor = i % 2 === 0 ? "#00f0ff" : "#ffaa00";
        ctx.shadowBlur = 10;
        ctx.fillRect(x, baseY - barHeight, barWidth, barHeight);
      }
      ctx.shadowBlur = 0;

      // 5. Track Title & Artist
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(title, w / 2, h * 0.73);

      ctx.fillStyle = "#00f0ff";
      ctx.font = "bold 22px monospace";
      ctx.fillText(artist, w / 2, h * 0.78);

      // 6. Badges (BPM, Key, Verified)
      const badgeY = h * 0.85;
      ctx.fillStyle = "rgba(0, 255, 157, 0.15)";
      ctx.strokeStyle = "#00ff9d";
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.15, badgeY, w * 0.7, 55);
      ctx.fillRect(w * 0.15, badgeY, w * 0.7, 55);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 18px monospace";
      ctx.fillText(`⚡ ${bpm} BPM  ·  🎹 ${keyDisplay}`, w / 2, badgeY + 34);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, title, artist, bpm, keyDisplay]);

  if (!isOpen) return null;

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(true);
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${title.toLowerCase().replace(/\s+/g, "_")}_9x16_social_card.png`;
    a.click();
    setTimeout(() => setDownloading(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-mono select-none">
      <div className="hud-panel relative w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl border border-cyanx/30 bg-[#0a0e17] p-6 shadow-2xl flex flex-col gap-4 text-ink">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyanx/50 bg-cyanx/10 text-cyanx text-lg shadow-xs">
              📱
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="kicker text-cyanx tracking-[0.25em]">EXPORT.VIDEO // 9:16 SOCIAL REEL</span>
                <span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-pulse" />
              </div>
              <h2 className="font-display text-lg font-bold text-ink">
                9:16 3D Animated Social Card (TikTok / Reels / Shorts)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-pit text-faint hover:text-ink transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* 9:16 Preview Canvas */}
        <div className="flex justify-center my-2">
          <div className="relative rounded-2xl border-2 border-cyanx/40 overflow-hidden shadow-2xl bg-black">
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="w-[270px] h-[480px] sm:w-[315px] sm:h-[560px] block"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <span className="text-xs text-dim">
            ✓ 60 FPS Animated Canvas with Spinning 3D Vinyl & Live Spectrum
          </span>

          <button
            onClick={handleDownloadSnapshot}
            className="flex items-center gap-2 rounded-xl border border-cyanx/60 bg-cyanx/15 px-5 py-2.5 font-bold text-xs text-cyanx hover:bg-cyanx hover:text-black transition cursor-pointer shadow-md shadow-cyanx/20"
          >
            <span>{downloading ? "GENERATING…" : "⚡ DOWNLOAD 9:16 SOCIAL CARD"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
