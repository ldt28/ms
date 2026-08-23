import React, { useEffect, useRef, useState } from "react";
import type { LyricsBlock, SyncedLyricLine } from "../lib/types";

interface DedicatedLyricsColumnProps {
  lyrics?: LyricsBlock | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (timeSec: number) => void;
  title?: string;
  artist?: string;
}

export function DedicatedLyricsColumn({
  lyrics,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  title,
  artist,
}: DedicatedLyricsColumnProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const syncedLines = lyrics?.syncedLines || [];

  // Find currently active line index
  let activeIndex = -1;
  for (let i = 0; i < syncedLines.length; i++) {
    if (currentTime >= syncedLines[i].timeSec) {
      activeIndex = i;
    } else {
      break;
    }
  }

  const activeLine = activeIndex >= 0 ? syncedLines[activeIndex] : null;

  // Auto-scroll down smoothly as playback advances
  useEffect(() => {
    if (autoScroll && activeItemRef.current && containerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeIndex, autoScroll]);

  const geniusSearchUrl =
    lyrics?.geniusUrl ||
    `https://genius.com/search?q=${encodeURIComponent(`${title || ""} ${artist || ""}`.trim())}`;

  return (
    <div className="panel ticks flex flex-col h-full max-h-[calc(100vh-120px)] overflow-hidden p-4 sm:p-5 select-none sticky top-6">
      {/* Header */}
      <div className="border-b border-linesoft pb-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="kicker text-amber">Lyrics Studio · Teleprompter</div>
          <span className="flex items-center gap-1 font-mono text-[10px] text-mint">
            <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-mint animate-ping" : "bg-dim"}`} />
            {isPlaying ? "LIVE SYNC" : "IDLE"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display text-base font-bold text-ink truncate">
              {title || "Track Lyrics"}
            </h3>
            {artist && <p className="font-mono text-[11px] text-dim truncate">{artist}</p>}
          </div>

          <a
            href={geniusSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-[#ffff64]/40 bg-[#ffff64]/10 px-2.5 py-1 font-mono text-[10px] font-bold text-[#ffff64] hover:bg-[#ffff64]/20 transition flex items-center gap-1"
            title="Read full annotations on Genius.com"
          >
            <span>🟡 Genius ↗</span>
          </a>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between pt-1 font-mono text-[10px] text-faint">
          <span>{syncedLines.length} lines indexed</span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`cursor-pointer transition hover:text-ink ${
              autoScroll ? "text-mint font-bold" : "text-dim"
            }`}
          >
            {autoScroll ? "● Auto-Scroll ON" : "○ Auto-Scroll OFF"}
          </button>
        </div>
      </div>

      {/* Main Lyrics Feed (Scrolls Down) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto mt-3 pr-1 flex flex-col gap-1.5 scroll-smooth divide-y divide-linesoft/30"
      >
        {!lyrics || syncedLines.length === 0 ? (
          <div className="py-12 px-2 text-center font-mono text-xs text-dim leading-relaxed">
            <div className="text-2xl mb-2">📝</div>
            <p className="font-bold text-ink">No Lyrics Loaded Yet</p>
            <p className="mt-1 text-[11px] text-faint">
              Paste a YouTube or Spotify link in the console on the right, or click <strong>⚡ Auto-Find</strong> to fetch full lyrics.
            </p>
          </div>
        ) : (
          syncedLines.map((line, idx) => {
            const isCurrent = idx === activeIndex;

            // Section Header (e.g. [VERSE 1], [CHORUS], [PUENTE])
            if (line.isSectionHeader) {
              return (
                <div
                  key={line.id}
                  className="pt-3 pb-1 flex items-center justify-between font-mono text-xs"
                >
                  <span className="rounded bg-amber/20 border border-amber/40 px-2 py-0.5 text-[10px] font-bold text-amber uppercase tracking-wider">
                    {line.section || line.text.replace(/[[\]]/g, "")}
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-amber/30 to-transparent ml-2" />
                </div>
              );
            }

            return (
              <div
                key={line.id}
                ref={isCurrent ? activeItemRef : null}
                onClick={() => onSeek(line.timeSec)}
                className={`group flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-amber/15 border border-amber/40 shadow-md shadow-amber/10 ring-1 ring-amber/30 scale-[1.01]"
                    : "hover:bg-surface/70 border border-transparent"
                }`}
              >
                {/* Time Jump Pill */}
                <button
                  className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold transition ${
                    isCurrent
                      ? "bg-amber text-black shadow-xs shadow-amber"
                      : "bg-surface border border-line text-cyanx group-hover:border-cyanx group-hover:bg-cyanx/10"
                  }`}
                  title={`Jump playback to ${line.timeFormatted}`}
                >
                  ▶ {line.timeFormatted}
                </button>

                {/* Lyric Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-sans text-xs sm:text-[13px] leading-snug transition-colors ${
                      isCurrent
                        ? "font-bold text-amber"
                        : "text-ink/80 group-hover:text-ink"
                    }`}
                  >
                    {line.text}
                  </p>
                </div>

                {/* Playing Indicator */}
                {isCurrent && (
                  <span className="h-2 w-2 rounded-full bg-amber shrink-0 animate-ping mt-1" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Metrics Snippet */}
      {lyrics && (
        <div className="border-t border-linesoft pt-2.5 mt-2 flex items-center justify-between font-mono text-[10px] text-faint">
          <span>Rhyme: {Math.round((lyrics.rhymeDensity.value ?? 0) * 100)}%</span>
          <span>Diversity: {(lyrics.diversity.value ?? 0).toFixed(2)}</span>
          <span>Flow: {lyrics.flow.value ? `${lyrics.flow.value} syl/s` : "—"}</span>
        </div>
      )}
    </div>
  );
}
