import React, { useEffect, useMemo, useRef, useState } from "react";
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

interface LyricSectionGroup {
  id: string;
  title: string;
  startTimeSec: number;
  startTimeFormatted: string;
  lines: SyncedLyricLine[];
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
  const activeLineRef = useRef<HTMLDivElement>(null);

  const rawSyncedLines = lyrics?.syncedLines || [];

  // Group synced lines by sections with section-level timestamps
  const sectionGroups = useMemo<LyricSectionGroup[]>(() => {
    if (!rawSyncedLines || rawSyncedLines.length === 0) return [];

    const groups: LyricSectionGroup[] = [];
    let currentGroup: LyricSectionGroup = {
      id: "sec-0",
      title: "Intro",
      startTimeSec: 0,
      startTimeFormatted: "00:00",
      lines: [],
    };

    rawSyncedLines.forEach((line, idx) => {
      if (line.isSectionHeader) {
        // Start a new group if current group has lines
        if (currentGroup.lines.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = {
          id: `sec-${idx}`,
          title: line.section || line.text.replace(/[[\]]/g, "").trim(),
          startTimeSec: line.timeSec,
          startTimeFormatted: line.timeFormatted,
          lines: [],
        };
      } else {
        if (currentGroup.lines.length === 0 && currentGroup.startTimeSec === 0) {
          currentGroup.startTimeSec = line.timeSec;
          currentGroup.startTimeFormatted = line.timeFormatted;
        }
        currentGroup.lines.push(line);
      }
    });

    if (currentGroup.lines.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }, [rawSyncedLines]);

  // Find active line across all groups
  let activeLineId: number | null = null;
  let activeGroupIdx = -1;

  for (let gIdx = 0; gIdx < sectionGroups.length; gIdx++) {
    const group = sectionGroups[gIdx];
    for (const line of group.lines) {
      if (currentTime >= line.timeSec) {
        activeLineId = line.id;
        activeGroupIdx = gIdx;
      }
    }
  }

  // Smoothly auto-scroll container only without hijacking the browser window
  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const target = activeLineRef.current;
      const targetOffset = target.offsetTop - container.offsetTop;
      container.scrollTo({
        top: Math.max(0, targetOffset - container.clientHeight / 3),
        behavior: "smooth",
      });
    }
  }, [activeLineId, autoScroll]);

  const geniusSearchUrl =
    lyrics?.geniusUrl ||
    `https://genius.com/search?q=${encodeURIComponent(`${title || ""} ${artist || ""}`.trim())}`;

  return (
    <div className="panel ticks flex flex-col h-full max-h-[calc(100vh-100px)] overflow-hidden p-4 sm:p-6 select-none sticky top-6 shadow-2xl">
      {/* Header Bar */}
      <div className="border-b border-linesoft pb-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="kicker text-amber">Lyrics Studio · Teleprompter</div>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-mint font-semibold">
            <span className={`h-2 w-2 rounded-full ${isPlaying ? "bg-mint animate-ping" : "bg-dim"}`} />
            {isPlaying ? "LIVE SYNC" : "READY"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-bold text-ink truncate">
              {title || "Track Lyrics"}
            </h3>
            {artist && <p className="font-mono text-xs text-dim truncate">{artist}</p>}
          </div>

          <a
            href={geniusSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-[#ffff64]/40 bg-[#ffff64]/10 px-3 py-1.5 font-mono text-[11px] font-bold text-[#ffff64] hover:bg-[#ffff64]/20 transition flex items-center gap-1 shadow-xs"
            title="Read verified lyrics & annotations on Genius.com"
          >
            <span>🟡 Genius ↗</span>
          </a>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-faint">
          <span>{sectionGroups.length} sections · {rawSyncedLines.length} lines</span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`cursor-pointer transition hover:text-ink font-semibold ${
              autoScroll ? "text-mint" : "text-dim"
            }`}
          >
            {autoScroll ? "● Auto-Scroll ON" : "○ Auto-Scroll OFF"}
          </button>
        </div>
      </div>

      {/* Main Lyrics Feed (Spacious, clean, section timestamps only) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto mt-4 pr-2 flex flex-col gap-6 scroll-smooth"
      >
        {!lyrics || sectionGroups.length === 0 ? (
          <div className="py-16 px-4 text-center font-mono text-xs text-dim leading-relaxed">
            <div className="text-3xl mb-3">📝</div>
            <p className="font-bold text-ink text-sm">No Lyrics Loaded</p>
            <p className="mt-2 text-xs text-faint max-w-xs mx-auto">
              Select any song from the console or click <strong>⚡ Auto-Find</strong> to load full time-synced lyrics with section timestamps.
            </p>
          </div>
        ) : (
          sectionGroups.map((group, gIdx) => {
            const isGroupActive = gIdx === activeGroupIdx;

            return (
              <div
                key={group.id}
                className={`rounded-xl border transition-all p-3.5 sm:p-4.5 ${
                  isGroupActive
                    ? "border-amber/40 bg-amber/[0.04] shadow-lg shadow-amber/5"
                    : "border-[#222731] bg-[#12151b]/60"
                }`}
              >
                {/* 🎯 Section Header with Section-Level Timestamp ONLY */}
                <div
                  onClick={() => onSeek(group.startTimeSec)}
                  className="flex items-center justify-between pb-3 border-b border-linesoft/60 cursor-pointer group/header"
                  title={`Jump to ${group.title} at ${group.startTimeFormatted}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber/20 border border-amber/50 px-2.5 py-1 font-mono text-xs font-bold text-amber tracking-wider uppercase shadow-xs group-hover/header:bg-amber group-hover/header:text-black transition">
                      [{group.title}]
                    </span>
                  </div>

                  {/* Section Start Timestamp Pill */}
                  <button
                    className="flex items-center gap-1.5 rounded-full border border-cyanx/50 bg-cyanx/10 px-3 py-1 font-mono text-xs font-bold text-cyanx group-hover/header:bg-cyanx group-hover/header:text-black transition shadow-xs cursor-pointer"
                  >
                    <span>▶</span>
                    <span>{group.startTimeFormatted}</span>
                  </button>
                </div>

                {/* Section Lyric Lines (Clean, no individual line timestamp clutter!) */}
                <div className="mt-3 flex flex-col gap-2.5">
                  {group.lines.map((line) => {
                    const isLineActive = line.id === activeLineId;

                    return (
                      <div
                        key={line.id}
                        ref={isLineActive ? activeLineRef : null}
                        onClick={() => onSeek(line.timeSec)}
                        className={`group flex items-start gap-3 rounded-lg px-3 py-2 transition-all cursor-pointer ${
                          isLineActive
                            ? "bg-amber/15 border-l-4 border-amber shadow-md shadow-amber/10 pl-3.5"
                            : "hover:bg-surface/60 border-l-4 border-transparent"
                        }`}
                      >
                        {/* Active Line Glow Indicator */}
                        {isLineActive ? (
                          <span className="h-2 w-2 rounded-full bg-amber shrink-0 animate-ping mt-1.5" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-dim/20 group-hover:bg-dim shrink-0 mt-2 transition-colors" />
                        )}

                        {/* Lyric Text (Spacious & Readable all the way through) */}
                        <p
                          className={`font-sans text-sm sm:text-[15px] leading-relaxed transition-colors flex-1 ${
                            isLineActive
                              ? "font-bold text-amber text-[15.5px]"
                              : "text-ink/85 group-hover:text-ink"
                          }`}
                        >
                          {line.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Rhyme & Cadence Analytics */}
      {lyrics && (
        <div className="border-t border-linesoft pt-3 mt-3 flex items-center justify-between font-mono text-xs text-dim">
          <span className="flex items-center gap-1">
            <span className="text-faint">Rhyme:</span>
            <span className="text-amber font-bold">{Math.round((lyrics.rhymeDensity.value ?? 0) * 100)}%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-faint">Diversity:</span>
            <span className="text-cyanx font-bold">{(lyrics.diversity.value ?? 0).toFixed(2)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-faint">Flow:</span>
            <span className="text-mint font-bold">{lyrics.flow.value ? `${lyrics.flow.value} syl/s` : "—"}</span>
          </span>
        </div>
      )}
    </div>
  );
}
