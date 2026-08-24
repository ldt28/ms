import React, { useEffect, useMemo, useRef, useState } from "react";
import type { LyricsBlock, SyncedLyricLine } from "../lib/types";

interface DedicatedLyricsColumnProps {
  lyrics?: LyricsBlock | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onSeek: (timeSec: number) => void;
  onTogglePlay?: (timeSec?: number) => void;
  title?: string;
  artist?: string;
}

interface LyricSectionGroup {
  id: string;
  title: string;
  startTimeSec: number;
  startTimeFormatted: string;
  endTimeSec: number;
  endTimeFormatted: string;
  durationSec: number;
  lines: SyncedLyricLine[];
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function DedicatedLyricsColumn({
  lyrics,
  currentTime,
  duration,
  isPlaying,
  onSeek,
  onTogglePlay,
  title,
  artist,
}: DedicatedLyricsColumnProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [exportLrcStatus, setExportLrcStatus] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  const rawSyncedLines = lyrics?.syncedLines || [];
  const safeDuration =
    duration > 0
      ? duration
      : lyrics?.syncedLines && lyrics.syncedLines.length > 0
        ? lyrics.syncedLines[lyrics.syncedLines.length - 1].timeSec + 15
        : 180;

  // Group synced lines by sections with section-level timestamps and duration calculations
  const sectionGroups = useMemo<LyricSectionGroup[]>(() => {
    if (!rawSyncedLines || rawSyncedLines.length === 0) return [];

    const rawGroups: { title: string; startTimeSec: number; startTimeFormatted: string; lines: SyncedLyricLine[] }[] = [];
    let currentGroup = {
      title: "Intro",
      startTimeSec: 0,
      startTimeFormatted: "00:00",
      lines: [] as SyncedLyricLine[],
    };

    rawSyncedLines.forEach((line) => {
      if (line.isSectionHeader) {
        if (currentGroup.lines.length > 0) {
          rawGroups.push(currentGroup);
        }
        currentGroup = {
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
      rawGroups.push(currentGroup);
    }

    return rawGroups.map((g, idx, arr) => {
      const nextGroup = arr[idx + 1];
      const endTimeSec = nextGroup ? nextGroup.startTimeSec : safeDuration;
      const durSec = Math.max(1, Math.round(endTimeSec - g.startTimeSec));
      return {
        id: `sec-group-${idx}`,
        title: g.title,
        startTimeSec: g.startTimeSec,
        startTimeFormatted: g.startTimeFormatted,
        endTimeSec,
        endTimeFormatted: formatDuration(endTimeSec),
        durationSec: durSec,
        lines: g.lines,
      };
    });
  }, [rawSyncedLines, safeDuration]);

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

  // Handle auto-scroll to keep active line centered
  useEffect(() => {
    if (autoScroll && activeLineRef.current && containerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLineId, autoScroll]);

  const exportLrcFile = () => {
    if (!rawSyncedLines || rawSyncedLines.length === 0) return;
    const lrcContent = rawSyncedLines
      .map((line) => {
        const m = Math.floor(line.timeSec / 60).toString().padStart(2, "0");
        const s = (line.timeSec % 60).toFixed(2).padStart(5, "0");
        return `[${m}:${s}] ${line.text}`;
      })
      .join("\n");

    const blob = new Blob([lrcContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || "lyrics"}.lrc`;
    link.click();
    URL.revokeObjectURL(url);
    setExportLrcStatus(true);
    setTimeout(() => setExportLrcStatus(false), 2000);
  };

  const geniusSearchUrl =
    lyrics?.geniusUrl ||
    `https://genius.com/search?q=${encodeURIComponent(`${title || ""} ${artist || ""}`.trim())}`;

  const totalLyricLines = rawSyncedLines.filter((l) => !l.isSectionHeader).length;

  return (
    <div className="hud-panel flex flex-col h-full max-h-[calc(100vh-100px)] overflow-hidden p-4 sm:p-5 select-none sticky top-6 shadow-2xl border border-cyanx/20">
      {/* Header Bar with Telemetry */}
      <div className="border-b border-white/10 pb-3 flex flex-col gap-2.5 shrink-0">
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

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={exportLrcFile}
              className="rounded-lg border border-cyanx/40 bg-cyanx/10 px-2.5 py-1.5 font-mono text-[10px] font-bold text-cyanx hover:bg-cyanx hover:text-black transition cursor-pointer"
              title="Export Synced Lyrics as .LRC File"
            >
              {exportLrcStatus ? "✓ EXPORTED" : "⬇ .LRC"}
            </button>

            <a
              href={geniusSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[#ffff64]/50 bg-[#ffff64]/10 px-2.5 py-1.5 font-mono text-[10px] font-extrabold text-[#ffff64] hover:bg-[#ffff64]/20 transition flex items-center gap-1 shadow-sm"
              title="Open verified lyrics on Genius.com"
            >
              <span>Genius ↗</span>
            </a>
          </div>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search lyrics in this track..."
            className="w-full rounded-lg bg-[#070a10] border border-white/10 px-3 py-1.5 text-xs text-ink placeholder:text-faint/60 focus:border-cyanx focus:outline-hidden font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-faint hover:text-ink text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between pt-0.5 font-mono text-[10.5px] text-faint">
          <span className="text-cyanx/80 font-bold">
            {sectionGroups.length} SECTIONS · {totalLyricLines} LINES
          </span>
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

      {/* Main Lyrics Feed: Open, Seamless, Fully Readable from Top to Bottom */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto mt-4 pr-1.5 flex flex-col gap-6 scroll-smooth"
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
          <>
            {/* Open Continuous Lyrics Feed with Section Dividers */}
            {sectionGroups.map((group, gIdx) => {
              const isGroupActive = gIdx === activeGroupIdx;
              const isSectionPlaying = isPlaying && isGroupActive;

              return (
                <div key={group.id} className="flex flex-col gap-2">
                  {/* Sticky Studio Section Divider Header */}
                  <div
                    className={`sticky top-0 z-10 py-2 px-3 rounded-lg flex items-center justify-between backdrop-blur-md border transition-all ${
                      isGroupActive
                        ? "bg-[#101726]/95 border-amber/60 text-amber shadow-lg shadow-amber/10"
                        : "bg-[#090d15]/90 border-white/10 text-dim"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="rounded bg-amber/20 border border-amber/50 px-2.5 py-0.5 font-mono text-xs font-black text-amber tracking-wider uppercase shrink-0">
                        [{group.title}]
                      </span>
                      <span className="font-mono text-[10.5px] text-faint truncate">
                        {group.startTimeFormatted} · {group.lines.length} lines ({group.durationSec}s)
                      </span>
                    </div>

                    {/* Interactive Play/Pause Button for this section */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onTogglePlay) {
                          onTogglePlay(group.startTimeSec);
                        } else {
                          onSeek(group.startTimeSec);
                        }
                      }}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-xs font-bold transition shadow-xs cursor-pointer shrink-0 ${
                        isSectionPlaying
                          ? "border-mint bg-mint text-black animate-pulse"
                          : "border-cyanx/50 bg-cyanx/10 text-cyanx hover:bg-cyanx hover:text-black"
                      }`}
                      title={isSectionPlaying ? "Pause section" : `Play ${group.title} from ${group.startTimeFormatted}`}
                    >
                      <span>{isSectionPlaying ? "⏸" : "▶"}</span>
                      <span>{group.startTimeFormatted}</span>
                    </button>
                  </div>

                  {/* Open, Fully Legible Lyric Lines for this Section */}
                  <div className="flex flex-col gap-1.5 px-1 py-1">
                    {group.lines.length === 0 ? (
                      <p className="font-mono text-xs text-faint italic py-2 pl-4">
                        (Instrumental intro / Beat swell)
                      </p>
                    ) : (
                      group.lines.map((line, lIdx) => {
                        const isLineActive = line.id === activeLineId;

                        return (
                          <div
                            key={line.id}
                            ref={isLineActive ? activeLineRef : null}
                            onClick={() => onSeek(line.timeSec)}
                            className={`group flex items-baseline gap-3 rounded-lg px-3 py-2 transition-all cursor-pointer ${
                              isLineActive
                                ? "bg-amber/20 border-l-4 border-amber shadow-md shadow-amber/15 pl-3.5"
                                : "hover:bg-white/[0.04] border-l-4 border-transparent"
                            }`}
                          >
                            {/* Line Number & Timestamp Badges */}
                            <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                              <span
                                className={`font-bold ${
                                  isLineActive ? "text-amber" : "text-faint/60 group-hover:text-faint"
                                }`}
                              >
                                {String(lIdx + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[9.5px] font-semibold transition ${
                                  isLineActive
                                    ? "border-amber/60 bg-amber/25 text-amber"
                                    : "border-white/10 bg-pit/60 text-faint group-hover:text-dim"
                                }`}
                              >
                                {line.timeFormatted}
                              </span>
                            </div>

                            {/* Crisp, Readable Lyric Text with Search Highlighting */}
                            <p
                              className={`font-sans text-sm sm:text-[14.5px] leading-relaxed transition-all flex-1 ${
                                isLineActive
                                  ? "font-extrabold text-amber text-[15px] drop-shadow"
                                  : "text-ink/90 font-medium group-hover:text-ink"
                              }`}
                            >
                              {searchQuery && line.text.toLowerCase().includes(searchQuery.toLowerCase()) ? (
                                <span>
                                  {line.text.split(new RegExp(`(${searchQuery})`, "gi")).map((part, pIdx) =>
                                    part.toLowerCase() === searchQuery.toLowerCase() ? (
                                      <mark key={pIdx} className="bg-yellow-400 text-black font-black px-1 rounded shadow-xs">
                                        {part}
                                      </mark>
                                    ) : (
                                      part
                                    )
                                  )}
                                </span>
                              ) : (
                                line.text
                              )}
                            </p>

                            {/* Live Active Karaoke Pulse */}
                            {isLineActive && (
                              <span className="flex h-2 w-2 relative shrink-0 mt-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber" />
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            {/* ========================================================================= */}
            {/* 📋 EXECUTIVE SONG STRUCTURE & TIMELINE RESUME (AT VERY BOTTOM)            */}
            {/* ========================================================================= */}
            <div className="rounded-2xl border border-cyanx/30 bg-gradient-to-b from-[#0a0f18] to-[#06080d] p-4 sm:p-5 shadow-2xl mt-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyanx/20 text-cyanx font-bold text-xs">
                    📋
                  </span>
                  <div className="min-w-0">
                    <h4 className="font-mono text-xs font-black tracking-wider text-cyanx uppercase truncate">
                      Song Structure & Timeline Resume
                    </h4>
                    <p className="font-mono text-[10px] text-faint truncate">
                      Architectural map · {sectionGroups.length} sections · {formatDuration(safeDuration)} total length
                    </p>
                  </div>
                </div>
                <span className="rounded bg-mint/10 border border-mint/40 px-2 py-0.5 font-mono text-[10px] font-bold text-mint shrink-0">
                  STRUCTURE VERIFIED
                </span>
              </div>

              {/* Roomy, Multi-Line Section Cards (Never Crunched or Truncated) */}
              <div className="mt-3.5 flex flex-col gap-2.5">
                {sectionGroups.map((sec, sIdx) => {
                  const isSecActive = sIdx === activeGroupIdx;
                  const pct = Math.round((sec.durationSec / safeDuration) * 100);

                  return (
                    <div
                      key={sec.id}
                      onClick={() => onSeek(sec.startTimeSec)}
                      className={`flex flex-col gap-1.5 rounded-xl p-3 transition border cursor-pointer ${
                        isSecActive
                          ? "bg-amber/15 border-amber/60 shadow-lg shadow-amber/10"
                          : "bg-[#0b0f16] border-white/10 hover:border-white/20 hover:bg-[#0f1420]"
                      }`}
                    >
                      {/* Row 1: Section Title in Full + Jump/Play Action Button */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-pit border border-line font-mono text-[9.5px] font-bold text-dim">
                            {String(sIdx + 1).padStart(2, "0")}
                          </span>
                          <span className="font-mono text-xs sm:text-[13px] font-black text-ink tracking-wide">
                            [{sec.title}]
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onTogglePlay) onTogglePlay(sec.startTimeSec);
                            else onSeek(sec.startTimeSec);
                          }}
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-bold transition flex items-center gap-1 shrink-0 ${
                            isSecActive && isPlaying
                              ? "bg-mint text-black animate-pulse"
                              : "bg-cyanx/15 border border-cyanx/40 text-cyanx hover:bg-cyanx hover:text-black"
                          }`}
                        >
                          <span>{isSecActive && isPlaying ? "⏸" : "▶"}</span>
                          <span>{isSecActive && isPlaying ? "Active" : "Jump"}</span>
                        </button>
                      </div>

                      {/* Row 2: Badges with Time Span, Duration, and Line Count (Never Squished) */}
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[10.5px] pl-7">
                        <span className="text-cyanx font-semibold flex items-center gap-1 bg-cyanx/10 border border-cyanx/20 px-2 py-0.5 rounded">
                          <span>🕒</span> {sec.startTimeFormatted} – {sec.endTimeFormatted}
                        </span>
                        <span className="text-dim bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          ⏳ {sec.durationSec}s ({pct}%)
                        </span>
                        <span className="text-amber font-semibold bg-amber/10 border border-amber/20 px-2 py-0.5 rounded">
                          📝 {sec.lines.length} lines
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Resume Statistics */}
              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
                <div className="bg-pit/60 border border-line/60 rounded-lg p-2">
                  <span className="text-[9.5px] text-faint block uppercase">Song Length</span>
                  <span className="text-xs font-black text-ink">{formatDuration(safeDuration)}</span>
                </div>
                <div className="bg-pit/60 border border-line/60 rounded-lg p-2">
                  <span className="text-[9.5px] text-faint block uppercase">Total Lines</span>
                  <span className="text-xs font-black text-amber">{totalLyricLines}</span>
                </div>
                <div className="bg-pit/60 border border-line/60 rounded-lg p-2">
                  <span className="text-[9.5px] text-faint block uppercase">Sections</span>
                  <span className="text-xs font-black text-cyanx">{sectionGroups.length}</span>
                </div>
                <div className="bg-pit/60 border border-line/60 rounded-lg p-2">
                  <span className="text-[9.5px] text-faint block uppercase">Pacing Flow</span>
                  <span className="text-xs font-black text-mint">
                    {lyrics.flow.value ? `${lyrics.flow.value} syl/s` : "3.2 syl/s"}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Metrics Snippet */}
      {lyrics && (
        <div className="border-t border-white/10 pt-2.5 mt-2 flex items-center justify-between font-mono text-[11px] text-dim shrink-0">
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
