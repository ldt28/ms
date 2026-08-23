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

  // Smoothly auto-scroll container only without hijacking browser window
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
    <div className="hud-panel flex flex-col h-full max-h-[calc(100vh-100px)] overflow-hidden p-4 sm:p-5 select-none sticky top-6 shadow-2xl border border-cyanx/20">
      {/* Header Bar with Sci-Fi Telemetry */}
      <div className="border-b border-white/10 pb-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyanx animate-pulse shadow-sm shadow-cyanx" />
            <span className="kicker text-cyanx tracking-[0.25em]">HOLOGRAPHIC // TELEPROMPTER HUD</span>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-mint font-bold">
            <span className={`h-1.5 w-1.5 rounded-full ${isPlaying ? "bg-mint animate-ping" : "bg-dim"}`} />
            {isPlaying ? "PHONETIC LOCK" : "STANDBY"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl font-black text-ink truncate drop-shadow">
              {title || "Track Lyrics"}
            </h3>
            {artist && <p className="font-mono text-xs text-dim truncate font-semibold">{artist}</p>}
          </div>

          <a
            href={geniusSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-[#ffff64]/50 bg-[#ffff64]/10 px-3 py-1.5 font-mono text-[10.5px] font-extrabold text-[#ffff64] hover:bg-[#ffff64]/20 transition flex items-center gap-1.5 shadow-sm"
            title="Open verified lyrics on Genius.com"
          >
            <span>🟡 Genius ↗</span>
          </a>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-faint">
          <span className="text-cyanx/80 font-bold">{sectionGroups.length} SECTIONS · {rawSyncedLines.length} LINES</span>
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`cursor-pointer transition hover:text-ink font-bold ${
              autoScroll ? "text-mint drop-shadow" : "text-dim"
            }`}
          >
            {autoScroll ? "● AUTO-SCROLL ON" : "○ AUTO-SCROLL OFF"}
          </button>
        </div>
      </div>

      {/* Main Lyrics Feed */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto mt-4 pr-1.5 flex flex-col gap-5 scroll-smooth"
      >
        {!lyrics || sectionGroups.length === 0 ? (
          <div className="py-16 px-4 text-center font-mono text-xs text-dim leading-relaxed">
            <div className="text-4xl mb-3 animate-pulse">📡</div>
            <p className="font-bold text-ink text-sm">NO VOCAL SIGNAL LOADED</p>
            <p className="mt-2 text-xs text-faint max-w-xs mx-auto">
              Select a song on the left or paste a link to render real-time time-synced lyrics with automated section segmentation.
            </p>
          </div>
        ) : (
          sectionGroups.map((group, gIdx) => {
            const isGroupActive = gIdx === activeGroupIdx;

            return (
              <div
                key={group.id}
                className={`rounded-xl border transition-all p-3.5 sm:p-4 relative overflow-hidden ${
                  isGroupActive
                    ? "border-amber/60 bg-amber/[0.05] shadow-lg shadow-amber/10"
                    : "border-white/10 bg-[#0a0d14]/70"
                }`}
              >
                {/* Section Header with Section Start Timestamp */}
                <div
                  onClick={() => onSeek(group.startTimeSec)}
                  className="flex items-center justify-between pb-2.5 border-b border-white/10 cursor-pointer group/header"
                  title={`Seek to ${group.title} at ${group.startTimeFormatted}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-amber/20 border border-amber/50 px-2.5 py-0.5 font-mono text-xs font-black text-amber tracking-wider uppercase shadow-xs group-hover/header:bg-amber group-hover/header:text-black transition">
                      [{group.title}]
                    </span>
                  </div>

                  <button
                    className="flex items-center gap-1.5 rounded-full border border-cyanx/50 bg-cyanx/10 px-3 py-1 font-mono text-xs font-bold text-cyanx group-hover/header:bg-cyanx group-hover/header:text-black transition shadow-xs cursor-pointer"
                  >
                    <span>▶</span>
                    <span>{group.startTimeFormatted}</span>
                  </button>
                </div>

                {/* Section Lyric Lines */}
                <div className="mt-3 flex flex-col gap-2">
                  {group.lines.map((line, lIdx) => {
                    const isLineActive = line.id === activeLineId;

                    return (
                      <div
                        key={line.id}
                        ref={isLineActive ? activeLineRef : null}
                        onClick={() => onSeek(line.timeSec)}
                        className={`group flex items-start gap-2.5 rounded-lg px-2.5 py-1.5 transition-all cursor-pointer ${
                          isLineActive
                            ? "bg-amber/20 border-l-4 border-amber shadow-md shadow-amber/15 pl-3"
                            : "hover:bg-white/[0.04] border-l-4 border-transparent"
                        }`}
                      >
                        {/* Digital Line Counter */}
                        <span className={`font-mono text-[9px] font-bold mt-1 shrink-0 ${
                          isLineActive ? "text-amber" : "text-faint/50 group-hover:text-faint"
                        }`}>
                          {String(lIdx + 1).padStart(2, "0")}
                        </span>

                        {/* Lyric Text */}
                        <p
                          className={`font-sans text-sm sm:text-[14.5px] leading-snug transition-all flex-1 ${
                            isLineActive
                              ? "font-extrabold text-amber text-[15px] drop-shadow"
                              : "text-ink/85 group-hover:text-ink"
                          }`}
                        >
                          {line.text}
                        </p>

                        {/* Active Singing Indicator */}
                        {isLineActive && (
                          <span className="h-2 w-2 rounded-full bg-amber shrink-0 animate-ping mt-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Metrics Snippet */}
      {lyrics && (
        <div className="border-t border-white/10 pt-2.5 mt-2 flex items-center justify-between font-mono text-[11px] text-dim">
          <span className="flex items-center gap-1">
            <span className="text-faint">RHYME:</span>
            <span className="text-amber font-bold">{Math.round((lyrics.rhymeDensity.value ?? 0) * 100)}%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-faint">DIVERSITY:</span>
            <span className="text-cyanx font-bold">{(lyrics.diversity.value ?? 0).toFixed(2)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="text-faint">FLOW:</span>
            <span className="text-mint font-bold">{lyrics.flow.value ? `${lyrics.flow.value} syl/s` : "—"}</span>
          </span>
        </div>
      )}
    </div>
  );
}
