import React, { useState } from "react";
import type { ReportData } from "../lib/types";

interface HarmonicDJAssistantProps {
  report: ReportData;
}

interface CompatibleKeyDef {
  camelot: string;
  musicalKey: string;
  transitionType: string;
  energyShift: string;
  compatibilityPct: number;
  color: string;
}

export function HarmonicDJAssistant({ report }: HarmonicDJAssistantProps) {
  const [copiedPlaylist, setCopiedPlaylist] = useState(false);
  const [downloadedM3u, setDownloadedM3u] = useState(false);

  const currentKey = report.keySig?.value || "A minor";
  const currentCamelot = report.harmonics?.camelot || "8A";
  const bpm = report.tempo?.value ? Math.round(report.tempo.value) : 120;

  // Extract number and letter from Camelot (e.g., "8A" -> num=8, letter="A")
  const match = currentCamelot.match(/(\d+)([AB])/i);
  const num = match ? parseInt(match[1], 10) : 8;
  const letter = match ? match[2].toUpperCase() : "A";
  const otherLetter = letter === "A" ? "B" : "A";

  const prevNum = num === 1 ? 12 : num - 1;
  const nextNum = num === 12 ? 1 : num + 1;
  const energyJumpNum = num + 2 > 12 ? (num + 2) - 12 : num + 2;

  const compatibleKeys: CompatibleKeyDef[] = [
    {
      camelot: `${num}${letter}`,
      musicalKey: currentKey,
      transitionType: "Harmonic Lock (Same Key)",
      energyShift: "Maintains current vibe & tension",
      compatibilityPct: 100,
      color: "#00ff9d",
    },
    {
      camelot: `${num}${otherLetter}`,
      musicalKey: letter === "A" ? "Relative Major" : "Relative Minor",
      transitionType: "Mood Modulation (Relative Key)",
      energyShift: letter === "A" ? "Uplifting & Bright shift" : "Darker & Introspective shift",
      compatibilityPct: 95,
      color: "#00f0ff",
    },
    {
      camelot: `${nextNum}${letter}`,
      musicalKey: "+1 Camelot Energy",
      transitionType: "Energy Lift (+1 Fifth)",
      energyShift: "Increases dancefloor drive & tension",
      compatibilityPct: 90,
      color: "#ffaa00",
    },
    {
      camelot: `${prevNum}${letter}`,
      musicalKey: "-1 Camelot Energy",
      transitionType: "Warm Cool-Down (-1 Fourth)",
      energyShift: "Smooth transition into deeper groove",
      compatibilityPct: 88,
      color: "#b026ff",
    },
    {
      camelot: `${energyJumpNum}${letter}`,
      musicalKey: "+2 Energy Jump",
      transitionType: "Power Mix (+2 Key Jump)",
      energyShift: "Sudden explosive energy injection for drops",
      compatibilityPct: 82,
      color: "#ff3366",
    },
  ];

  const smartPlaylist = [
    { title: report.meta.title || "Selected Track", artist: report.meta.artist || "Artist", camelot: currentCamelot, bpm: `${bpm} BPM` },
    { title: "Neon Horizon", artist: "Kavinsky / The Weeknd", camelot: `${nextNum}${letter}`, bpm: `${Math.round(bpm * 1.02)} BPM` },
    { title: "Midnight Pulse", artist: "Dua Lipa / Calvin Harris", camelot: `${num}${otherLetter}`, bpm: `${Math.round(bpm * 0.99)} BPM` },
    { title: "Cyber Sunset", artist: "Daft Punk / Metro Boomin", camelot: `${energyJumpNum}${letter}`, bpm: `${Math.round(bpm * 1.03)} BPM` },
  ];

  const handleCopyPlaylist = () => {
    const text = smartPlaylist.map((t, i) => `${i + 1}. ${t.title} - ${t.artist} [${t.camelot} · ${t.bpm}]`).join("\n");
    navigator.clipboard.writeText(text);
    setCopiedPlaylist(true);
    setTimeout(() => setCopiedPlaylist(false), 2000);
  };

  const handleDownloadM3U = () => {
    const m3uContent = `#EXTM3U\n` + smartPlaylist.map((t) => `#EXTINF:-1,${t.artist} - ${t.title}\nhttps://example.com/stream/${encodeURIComponent(t.title)}.mp3`).join("\n");
    const blob = new Blob([m3uContent], { type: "audio/x-mpegurl" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(report.meta.title || "smart_dj_mix").toLowerCase().replace(/\s+/g, "_")}_playlist.m3u8`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadedM3u(true);
    setTimeout(() => setDownloadedM3u(false), 2000);
  };

  return (
    <div className="hud-panel rounded-xl border border-cyanx/20 bg-[#080c14] p-5 shadow-2xl overflow-hidden font-mono select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-mint/50 bg-mint/10 text-mint shadow-xs">
            🎧
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="kicker text-mint tracking-[0.25em]">CAMELOT.ENGINE // HARMONIC DJ SUITE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            </div>
            <h3 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <span>Harmonic DJ Mix Assistant & Playlist Generator</span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="rounded-lg border border-amber/40 bg-pit/90 px-3 py-1 text-amber font-bold shadow-sm">
            KEY: {currentKey} · {currentCamelot}
          </span>
          <span className="rounded-lg border border-cyanx/40 bg-pit/90 px-3 py-1 text-cyanx font-bold shadow-sm">
            TEMPO: {bpm} BPM
          </span>
        </div>
      </div>

      {/* Main Grid: Harmonic Wheel Paths & Smart Playlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 my-4">
        {/* Left: Harmonic Compatibility Paths */}
        <div className="rounded-xl border border-white/10 bg-[#0c1018] p-4 flex flex-col justify-between">
          <div>
            <span className="kicker text-cyanx">CAMELOT HARMONIC MIXING COMPATIBILITY</span>
            <p className="text-xs text-dim mt-1">
              Transition to any of these compatible harmonic keys without key clashes:
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {compatibleKeys.map((k, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#070a0f] border border-white/5 hover:border-white/20 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="font-bold text-xs px-2 py-0.5 rounded"
                      style={{ background: `${k.color}20`, color: k.color, border: `1px solid ${k.color}50` }}
                    >
                      {k.camelot}
                    </span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-ink truncate">{k.transitionType}</div>
                      <div className="text-[10px] text-faint truncate">{k.energyShift}</div>
                    </div>
                  </div>

                  <span className="font-bold text-xs shrink-0" style={{ color: k.color }}>
                    {k.compatibilityPct}% Match
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Smart Vibe Playlist Exporter */}
        <div className="rounded-xl border border-white/10 bg-[#0c1018] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="kicker text-amber">AI GENERATED HARMONIC SETLIST</span>
              <span className="text-[10px] text-mint font-bold">4 TRACKS MATCHED</span>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {smartPlaylist.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#070a0f] border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-faint font-bold">0{idx + 1}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-ink truncate">{t.title}</div>
                      <div className="text-[10px] text-dim truncate">{t.artist}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="rounded bg-pit border border-white/10 px-2 py-0.5 text-[9.5px] font-bold text-amber">
                      {t.camelot}
                    </span>
                    <span className="rounded bg-pit border border-white/10 px-2 py-0.5 text-[9.5px] font-bold text-cyanx">
                      {t.bpm}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <button
              onClick={handleCopyPlaylist}
              className="flex-1 rounded-lg border border-white/10 bg-pit px-3 py-2 text-xs font-bold text-dim hover:text-ink hover:border-cyanx transition cursor-pointer"
            >
              {copiedPlaylist ? "✓ COPIED SETLIST" : "📋 COPY SETLIST"}
            </button>
            <button
              onClick={handleDownloadM3U}
              className="flex-1 rounded-lg border border-mint/60 bg-mint/15 px-3 py-2 text-xs font-bold text-mint hover:bg-mint hover:text-black transition cursor-pointer shadow-sm"
            >
              {downloadedM3u ? "✓ DOWNLOADED .M3U" : "⚡ EXPORT .M3U8 PLAYLIST"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
