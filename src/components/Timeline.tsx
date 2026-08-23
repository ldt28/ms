import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { formatTime, type ReportData, type Section } from "../lib/types";
import { TierBadge, useReducedMotion } from "./ui";
import { SpectrumVisualizer } from "./SpectrumVisualizer";
import { ChordTrack } from "./ChordTrack";
import { analyzeHarmonics } from "../lib/harmonicEngine";

export function labelColor(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("chorus")) return "#f0a63f";
  if (l.includes("verse")) return "#58c7d8";
  if (l.includes("intro") || l.includes("outro") || l.includes("full")) return "#8b95a9";
  if (l.includes("bridge") || l.includes("build")) return "#e56a54";
  return "#93a0b4";
}

function curvePath(curve: number[]): { area: string; line: string } {
  if (curve.length < 2) return { area: "", line: "" };
  const n = curve.length;
  let line = "";
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 1000;
    const y = 96 - curve[i] * 88;
    line += `${i === 0 ? "M" : " L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  const area = `${line} L1000 100 L0 100 Z`;
  return { area, line };
}

export interface ExternalPlayback {
  duration: number | null;
  time: number;
  seek: (t: number) => void;
}

export function Timeline({
  report,
  audio,
  external,
}: {
  report: ReportData;
  audio: HTMLAudioElement | null;
  external?: ExternalPlayback | null;
}) {
  const hasPlayback = !!audio || !!external;
  const duration = report.meta.durationSec ?? external?.duration ?? 0;
  const sections = report.sections;
  const curve = report.energy?.curve ?? null;
  const reduced = useReducedMotion();

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null); // hover or selected
  const bodyRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!audio) return;
    const onTime = () => setTime(audio.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onPause);
    };
  }, [audio]);

  useEffect(() => {
    if (!audio || !playing || reduced) return;
    const loop = () => {
      setTime(audio.currentTime);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audio, playing, reduced]);

  const seekTo = (t: number) => {
    const target = Math.max(0, Math.min(duration - 0.05, t));
    if (audio) {
      audio.currentTime = target;
      setTime(audio.currentTime);
    } else if (external) {
      external.seek(target);
    }
  };

  const onBodyClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (!hasPlayback || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    seekTo(ratio * duration);
  };

  const togglePlay = () => {
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  };

  const paths = curve ? curvePath(curve) : null;
  const playTime = audio ? time : (external?.time ?? 0);
  const pct = duration > 0 ? (playTime / duration) * 100 : 0;
  const activeSection = active !== null ? sections[active] : null;

  return (
    <div>
      {/* 60 FPS Real-time Spectrum & Parametric EQ */}
      <SpectrumVisualizer audio={audio} isPlaying={playing} className="mb-4" />

      {/* timeline body */}
      <div
        ref={bodyRef}
        onClick={onBodyClick}
        className={`relative h-28 overflow-hidden rounded-lg border border-linesoft bg-pit ${
          hasPlayback ? "cursor-crosshair" : "opacity-90"
        }`}
        role="slider"
        aria-label="Seek position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(playTime)}
        tabIndex={hasPlayback ? 0 : -1}
        onKeyDown={(e) => {
          if (!hasPlayback) return;
          if (e.key === "ArrowRight") seekTo(playTime + 5);
          if (e.key === "ArrowLeft") seekTo(playTime - 5);
        }}
      >
        {/* energy curve */}
        {paths && (
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <path d={paths.area} fill="rgba(240,166,63,0.10)" />
            <path d={paths.line} fill="none" stroke="rgba(240,166,63,0.45)" strokeWidth="1.2" />
          </svg>
        )}

        {/* section blocks */}
        {duration > 0 &&
          sections.map((s: Section, i: number) => {
            const left = (s.start / duration) * 100;
            const width = ((s.end - s.start) / duration) * 100;
            const color = labelColor(s.label);
            const isActive = active === i;
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setActive(i);
                  seekTo(s.start + 0.01);
                }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                className="absolute inset-y-0 border-l text-left transition-[filter,background] duration-150 first:border-l-0"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  borderColor: "#27303f",
                  background: isActive ? `${color}24` : `${color}0d`,
                }}
                title={`${s.label} — ${formatTime(s.start)} to ${formatTime(s.end)}`}
              >
                {width > 7 && (
                  <span
                    className="absolute left-1.5 top-1.5 truncate font-mono text-[9px] font-semibold tracking-[0.12em]"
                    style={{ color, maxWidth: "calc(100% - 10px)" }}
                  >
                    {s.label.toUpperCase()}
                  </span>
                )}
              </button>
            );
          })}

        {/* playhead */}
        {hasPlayback && duration > 0 && (
          <div
            className="pointer-events-none absolute inset-y-0 z-10"
            style={{ left: `${pct}%` }}
            aria-hidden="true"
          >
            <div className="h-full w-px bg-ink shadow-[0_0_8px_rgba(240,166,63,0.9)]" />
            <div
              className="absolute -left-[5px] top-0 h-0 w-0"
              style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "7px solid #f0a63f" }}
            />
          </div>
        )}

        {!hasPlayback && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full border border-line bg-panel px-3 py-1 font-mono text-[10px] tracking-[0.14em] text-dim">
              {sections.length > 0 ? "HOVER TO INSPECT — NO PLAYBACK SOURCE" : "NO PLAYBACK SOURCE"}
            </span>
          </div>
        )}
      </div>

      {/* transport */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={togglePlay}
          disabled={!audio}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-amber/60 bg-amber/10 text-amber transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-current"><rect x="3" y="2" width="4" height="12" rx="1" /><rect x="9" y="2" width="4" height="12" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5 fill-current"><path d="M4 2.5v11l9-5.5z" /></svg>
          )}
        </button>

        <span className="font-mono text-xs text-dim">
          <span className="text-ink">{formatTime(playTime)}</span> / {formatTime(duration)}
        </span>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          {activeSection ? (
            <>
              <span className="truncate font-mono text-[11px] text-dim">
                <span style={{ color: labelColor(activeSection.label) }}>{activeSection.label}</span>
                {" · "}
                {formatTime(activeSection.start)}–{formatTime(activeSection.end)} · energy{" "}
                {Math.round(activeSection.avgEnergy * 100)}%
              </span>
              <TierBadge tier={activeSection.tier} />
            </>
          ) : (
            <span className="font-mono text-[10px] tracking-[0.12em] text-faint">
              {audio
                ? "HOVER OR CLICK A SECTION"
                : external
                  ? "CLICK TIMELINE OR SECTIONS — THE VIDEO JUMPS"
                  : "SECTIONS FROM BACKEND REPORT"}
            </span>
          )}
        </div>
      </div>

      {/* Chord Progression Track */}
      {(() => {
        const effectiveHarmonics =
          report.harmonics ??
          (report.keySig?.value
            ? analyzeHarmonics(report.keySig.value, sections, report.tempo?.value ?? null, duration)
            : null);
        return effectiveHarmonics ? (
          <ChordTrack
            harmonics={effectiveHarmonics}
            duration={duration}
            playTime={playTime}
            onSeek={seekTo}
          />
        ) : null;
      })()}
    </div>
  );
}
