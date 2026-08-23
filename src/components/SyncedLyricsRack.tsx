import { useEffect, useRef, useState } from "react";
import type { InstrumentBreakdown, LyricsBlock, SyncedLyricLine } from "../lib/types";
import { FLStudioChannelRack } from "./FLStudioChannelRack";

interface SyncedLyricsRackProps {
  lyrics: LyricsBlock;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (timeSec: number) => void;
  title?: string;
  artist?: string;
  instruments?: InstrumentBreakdown | null;
}

export function SyncedLyricsRack({
  lyrics,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  title,
  artist,
  instruments,
}: SyncedLyricsRackProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedView, setSelectedView] = useState<"both" | "lyrics" | "daw">("both");
  const listContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const syncedLines = lyrics.syncedLines || [];

  // Find currently active lyric line based on currentTime
  let activeIndex = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (currentTime >= syncedLines[i].timeSec) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const activeLine = activeIndex >= 0 ? syncedLines[activeIndex] : null;
  const currentSectionName = activeLine?.section || "Verse";

  // Auto-scroll to active line
  useEffect(() => {
    if (autoScroll && activeLineRef.current && listContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, autoScroll]);

  const geniusSearchUrl =
    lyrics.geniusUrl ||
    `https://genius.com/search?q=${encodeURIComponent(`${title || ""} ${artist || ""}`.trim())}`;

  return (
    <div className="panel ticks relative overflow-hidden p-4 sm:p-6 flex flex-col gap-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-linesoft pb-3">
        <div>
          <div className="kicker text-amber">Time-Synced Lyrics & Live DAW Channel Rack</div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
            <span>Lyrics & Instrument Breakdown</span>
            {activeLine?.section && (
              <span className="rounded-md border border-amber/40 bg-amber/10 px-2 py-0.5 font-mono text-[10px] font-bold text-amber uppercase">
                {activeLine.section}
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Genius Button */}
          <a
            href={geniusSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-[#ffff64]/40 bg-[#ffff64]/10 px-3 py-1.5 font-mono text-xs font-bold text-[#ffff64] hover:bg-[#ffff64]/20 transition"
            title="Read annotations and verified lyrics on Genius.com"
          >
            <span>🟡 Genius.com Reference ↗</span>
          </a>

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`rounded-lg border px-2.5 py-1.5 font-mono text-xs transition cursor-pointer ${
              autoScroll
                ? "border-mint/50 bg-mint/10 text-mint font-bold"
                : "border-linesoft bg-surface text-dim hover:text-ink"
            }`}
            title="Toggle automatic follow scrolling"
          >
            {autoScroll ? "● Auto-Scroll ON" : "○ Auto-Scroll OFF"}
          </button>
        </div>
      </div>

      {/* 1. FL Studio Live DAW Channel Rack */}
      <FLStudioChannelRack
        currentTime={currentTime}
        isPlaying={isPlaying}
        activeSectionName={currentSectionName}
        instruments={instruments}
      />

      {/* 2. Synced Lyrics List with Timestamp Badges & Section Headers */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between font-mono text-xs text-faint px-1">
          <span>Click any timestamp (e.g. 00:15) to seek the playback directly to that line:</span>
          <span>{syncedLines.length} lines indexed</span>
        </div>

        <div
          ref={listContainerRef}
          className="max-h-[380px] overflow-y-auto rounded-xl border border-linesoft bg-pit/90 p-3 sm:p-4 flex flex-col gap-1.5 scroll-smooth"
        >
          {syncedLines.length === 0 ? (
            <div className="py-8 text-center font-mono text-xs text-dim">
              No synced lines detected. Click <strong>⚡ Auto-Find Lyrics</strong> or paste lyrics with timestamps in the console.
            </div>
          ) : (
            syncedLines.map((line, idx) => {
              const isCurrent = idx === activeIndex;

              // Section Header render
              if (line.isSectionHeader) {
                return (
                  <div
                    key={line.id}
                    className="mt-3 mb-1.5 flex items-center gap-2 border-b border-linesoft/60 pb-1 pt-1"
                  >
                    <span className="rounded bg-amber/15 border border-amber/30 px-2 py-0.5 font-mono text-[10.5px] font-bold text-amber uppercase">
                      {line.section || line.text.replace(/[[\]]/g, "")}
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-amber/30 to-transparent" />
                  </div>
                );
              }

              return (
                <div
                  key={line.id}
                  ref={isCurrent ? activeLineRef : null}
                  onClick={() => onSeek(line.timeSec)}
                  className={`group flex items-start gap-3 rounded-lg px-3 py-2 transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-amber/15 border border-amber/40 shadow-md shadow-amber/5 ring-1 ring-amber/30 scale-[1.01]"
                      : "hover:bg-surface/60 border border-transparent hover:border-linesoft"
                  }`}
                >
                  {/* Clickable Seek Timestamp Pill */}
                  <button
                    className={`shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-bold transition ${
                      isCurrent
                        ? "bg-amber text-black shadow-xs shadow-amber"
                        : "bg-surface border border-line text-cyanx group-hover:border-cyanx group-hover:bg-cyanx/10"
                    }`}
                    title={`Jump to ${line.timeFormatted}`}
                  >
                    ▶ {line.timeFormatted}
                  </button>

                  {/* Section Label Tag (if defined) */}
                  {line.section && (
                    <span className="hidden sm:inline-block shrink-0 rounded bg-pit border border-linesoft px-1.5 py-0.5 font-mono text-[9.5px] text-faint">
                      {line.section}
                    </span>
                  )}

                  {/* Lyric Text */}
                  <span
                    className={`font-sans text-sm sm:text-base leading-relaxed transition-colors flex-1 ${
                      isCurrent ? "font-bold text-amber" : "text-ink/85 group-hover:text-ink"
                    }`}
                  >
                    {line.text}
                  </span>

                  {/* Active playing indicator */}
                  {isCurrent && (
                    <span className="shrink-0 flex items-center gap-1 font-mono text-[10px] text-amber animate-pulse">
                      <span>SINGING</span>
                      <span className="h-2 w-2 rounded-full bg-amber" />
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
