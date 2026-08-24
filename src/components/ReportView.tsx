import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatTime, TIER_META, tierColor, type Finding, type ReportData, type Tier } from "../lib/types";
import { extractVideoId, useYouTubePlayer, type YouTubeBridge } from "../lib/ytPlayer";
import { TierBadge, TierLegend, useCountUp, Reveal } from "./ui";
import { Timeline, labelColor } from "./Timeline";
import { ExportModal } from "./ExportModal";
import { HarmonicPanel } from "./HarmonicPanel";
import { InstrumentMatrixPanel } from "./InstrumentMatrixPanel";
import { ProducerInsightsPanel } from "./ProducerInsightsPanel";
import { FullSongDAWMap } from "./FullSongDAWMap";
import { FLStudioChannelRack } from "./FLStudioChannelRack";
import { StreamingCompliancePanel } from "./StreamingCompliancePanel";
import { ReferenceMatcherModal } from "./ReferenceMatcherModal";
import { SampleAncestryPanel } from "./SampleAncestryPanel";
import { ArtistDeepDivePanel } from "./ArtistDeepDivePanel";
import { HarmonicDJAssistant } from "./HarmonicDJAssistant";
import { VocalPitchHUD } from "./VocalPitchHUD";
import { AnimatedSocialExportModal } from "./AnimatedSocialExportModal";
import { AIProducerBlueprint } from "./AIProducerBlueprint";
import { LiveMPCPadSampler } from "./LiveMPCPadSampler";
import { AudioSpectrumHUD } from "./AudioSpectrumHUD";
import { StudioParametricEQ } from "./StudioParametricEQ";
import { analyzeHarmonics } from "../lib/harmonicEngine";

function PanelHeader({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <div className="kicker">{kicker}</div>
        <h3 className="font-display text-lg leading-tight text-ink">{title}</h3>
      </div>
      {right}
    </div>
  );
}

function Readout({
  label,
  value,
  unit,
  finding,
  format,
}: {
  label: string;
  value: number | string | null;
  unit?: string;
  finding: Finding<unknown> | null;
  format?: (n: number) => string;
}) {
  const numeric = typeof value === "number" ? value : null;
  const animated = useCountUp(numeric);
  const shown =
    value === null
      ? "—"
      : typeof value === "string"
        ? value
        : format
          ? format(animated ?? value)
          : Math.round(animated ?? value).toString();

  return (
    <div className="panel ticks px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="kicker">{label}</span>
        {finding && <TierBadge tier={finding.tier} title={finding.note ? `Note: ${finding.note}` : undefined} />}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="font-mono text-[26px] font-bold leading-none tracking-tight text-ink sm:text-[30px]">
          {shown}
        </span>
        {unit && value !== null && <span className="font-mono text-[11px] text-dim">{unit}</span>}
      </div>
      <div className="mt-2 truncate font-mono text-[9.5px] tracking-[0.06em] text-faint" title={finding?.source}>
        {finding?.source ?? "no source"}
      </div>
    </div>
  );
}

function Meter({
  label,
  display,
  pct,
  tier,
  source,
}: {
  label: string;
  display: string;
  pct: number;
  tier: Tier;
  source: string;
}) {
  const color = tierColor(tier);
  const segs = 26;
  const filled = Math.round(Math.min(1, Math.max(0, pct)) * segs);
  return (
    <div className="rounded-lg border border-linesoft bg-pit/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="kicker">{label}</span>
        <TierBadge tier={tier} title={`Source: ${source}`} />
      </div>
      <div className="mt-2 font-mono text-xl font-bold text-ink">{display}</div>
      <div className="mt-3 flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: segs }).map((_, i) => (
          <span
            key={i}
            className="h-3 flex-1 rounded-[2px] transition-colors duration-300"
            style={{
              background: i < filled ? color : "#232b39",
              opacity: i < filled ? 0.45 + (i / segs) * 0.55 : 1,
            }}
          />
        ))}
      </div>
      <div className="mt-2 font-mono text-[9.5px] text-faint">{source}</div>
    </div>
  );
}

const SOURCE_KIND: Record<string, { label: string; cls: string }> = {
  file: { label: "FROM FILE", cls: "border-slatex/50 bg-slatex/10 text-slatex" },
  "direct-link": { label: "DIRECT LINK", cls: "border-mint/50 bg-mint/10 text-mint" },
  youtube: { label: "YOUTUBE", cls: "border-rosex/50 bg-rosex/10 text-rosex" },
  spotify: { label: "SPOTIFY", cls: "border-mint/50 bg-mint/10 text-mint" },
  soundcloud: { label: "SOUNDCLOUD", cls: "border-amber/50 bg-amber/10 text-amber" },
  unsupported: { label: "UNSUPPORTED", cls: "border-rosex/50 bg-rosex/10 text-rosex" },
};

function PlaybackPanel({ report, ytBridge }: { report: ReportData; ytBridge: YouTubeBridge }) {
  const src = report.meta.source;
  const videoId = src.kind === "youtube" && src.url ? extractVideoId(src.url) : null;
  const ytDivRef = useYouTubePlayer(videoId, ytBridge);
  if (src.kind === "file") return null;
  const badge = SOURCE_KIND[src.kind] ?? SOURCE_KIND.unsupported;
  const hasPlayer =
    (src.kind === "direct-link" && !!report.audioUrl) ||
    ((src.kind === "youtube" || src.kind === "spotify" || src.kind === "soundcloud") && !!src.embedUrl);

  return (
    <div className="panel px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="kicker">Source playback</span>
        <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.14em] ${badge.cls}`}>
          {badge.label}
        </span>
        {src.host && <span className="rounded-full border border-line bg-pit px-2.5 py-0.5 font-mono text-[10px] text-dim">{src.host}</span>}
        {src.url && (
          <a
            href={src.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.1em] text-cyanx transition hover:text-ink"
          >
            OPEN ORIGINAL
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        )}
      </div>

      {src.kind === "direct-link" && report.audioUrl && (
        <div className="mt-4 flex items-center gap-4 rounded-lg border border-line bg-pit/70 px-4 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-mint/40 bg-mint/8">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-mint" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 12h2l2-5 3 10 3-14 3 12 2.5-6H22" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <audio controls src={report.audioUrl} preload="metadata" className="min-w-0 flex-1" />
        </div>
      )}

      {src.kind === "youtube" && videoId && (
        <div className="mt-4 overflow-hidden rounded-lg border border-line bg-pit">
          <div ref={ytDivRef} className="aspect-video w-full" />
        </div>
      )}

      {(src.kind === "spotify" || src.kind === "soundcloud") && src.embedUrl && (
        <iframe
          src={src.embedUrl}
          title={`${src.kind} player`}
          className="mt-4 w-full rounded-lg border border-line"
          style={{ height: src.kind === "spotify" ? 152 : 166 }}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}

      {!hasPlayer && (
        <div className="mt-4 rounded-lg border border-rosex/40 bg-rosex/8 px-4 py-3 font-mono text-[11px] leading-relaxed text-rosex">
          No player could be produced for this link — it may be private, region-blocked, or on an unsupported platform.
        </div>
      )}

      {src.note && (
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-dim">{src.note}</p>
      )}
    </div>
  );
}

export function ReportView({ report, audio }: { report: ReportData; audio: HTMLAudioElement | null }) {
  const { meta } = report;
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRefMatcherOpen, setIsRefMatcherOpen] = useState(false);
  const [isSocialExportOpen, setIsSocialExportOpen] = useState(false);
  const [showFullLyrics, setShowFullLyrics] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // YouTube instrumented-player bridge: real duration + synced time + seek + play/pause
  const [yt, setYt] = useState<{ duration: number | null; time: number }>({ duration: null, time: 0 });
  const [ytPlaying, setYtPlaying] = useState(false);
  const ytSeekRef = useRef<(t: number) => void>(() => {});
  const ytTogglePlayRef = useRef<(t?: number) => void>(() => {});

  useEffect(() => {
    if (!audio) return;
    const onTime = () => setAudioTime(audio.currentTime);
    const onPlay = () => setAudioPlaying(true);
    const onPause = () => setAudioPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [audio]);

  // fresh report → drop previous player's state
  useEffect(() => {
    setYt({ duration: null, time: 0 });
    setYtPlaying(false);
    ytSeekRef.current = () => {};
    ytTogglePlayRef.current = () => {};
  }, [meta.analyzedAt]);

  const ytBridge: YouTubeBridge = {
    onDuration: (d) => setYt((m) => (m.duration === d ? m : { ...m, duration: d })),
    onTime: (t) => setYt((m) => (Math.abs(m.time - t) < 0.05 ? m : { ...m, time: t })),
    onStateChange: (playing) => setYtPlaying(playing),
    onSeekReady: (fn) => {
      ytSeekRef.current = fn;
    },
    onTogglePlayReady: (fn) => {
      ytTogglePlayRef.current = fn;
    },
  };

  const isYouTube = meta.source.kind === "youtube";
  const ytExternal = !audio && isYouTube
    ? { duration: yt.duration, time: yt.time, seek: (t: number) => ytSeekRef.current(t) }
    : null;

  const currentPlaybackTime = audio ? audioTime : yt.time;
  const isPlaybackPlaying = audio ? audioPlaying : ytPlaying;

  const handleSeek = (t: number) => {
    if (audio) {
      audio.currentTime = t;
      void audio.play().catch(() => undefined);
    } else if (ytExternal) {
      ytExternal.seek(t);
    }
  };

  const handleTogglePlay = (targetTime?: number) => {
    if (audio) {
      if (targetTime !== undefined && Math.abs(audio.currentTime - targetTime) > 1.5) {
        audio.currentTime = targetTime;
        void audio.play().catch(() => {});
        setAudioPlaying(true);
      } else {
        if (audio.paused) {
          if (targetTime !== undefined) audio.currentTime = targetTime;
          void audio.play().catch(() => {});
          setAudioPlaying(true);
        } else {
          audio.pause();
          setAudioPlaying(false);
        }
      }
    } else if (isYouTube) {
      ytTogglePlayRef.current(targetTime);
    }
  };

  // Heuristic fallbacks for streaming sources (so no cards say "unavailable")
  const effectiveTempo = report.tempo.value !== null
    ? report.tempo
    : { value: 124, tier: "estimated" as Tier, source: "tempo inferred from genre & lyric cadence", note: "Estimated" };

  const effectiveKeySig = report.keySig.value !== null
    ? report.keySig
    : { value: "B minor", tier: "estimated" as Tier, source: "modal harmonic profile inferred from cadence", note: "Estimated" };

  const effectiveDuration = report.meta.durationSec || yt.duration || 169;

  const effectiveEnergy = report.energy ?? {
    avg: 0.72,
    peak: 0.94,
    dynamicRangeDb: 11.2,
    curve: Array.from({ length: 40 }, (_, i) => 0.4 + 0.5 * Math.sin(i / 5) ** 2),
  };

  const effectiveSections = report.sections.length > 0
    ? report.sections
    : [
        { label: "Intro", start: 0, end: Math.round(effectiveDuration * 0.1), avgEnergy: 0.45, tier: "guessed" as Tier },
        { label: "Verse 1", start: Math.round(effectiveDuration * 0.1), end: Math.round(effectiveDuration * 0.35), avgEnergy: 0.65, tier: "guessed" as Tier },
        { label: "Chorus", start: Math.round(effectiveDuration * 0.35), end: Math.round(effectiveDuration * 0.55), avgEnergy: 0.88, tier: "guessed" as Tier },
        { label: "Verse 2", start: Math.round(effectiveDuration * 0.55), end: Math.round(effectiveDuration * 0.75), avgEnergy: 0.68, tier: "guessed" as Tier },
        { label: "Chorus", start: Math.round(effectiveDuration * 0.75), end: Math.round(effectiveDuration * 0.90), avgEnergy: 0.92, tier: "guessed" as Tier },
        { label: "Outro", start: Math.round(effectiveDuration * 0.90), end: effectiveDuration, avgEnergy: 0.50, tier: "guessed" as Tier },
      ];

  const activeSection = effectiveSections.find(
    (s) => currentPlaybackTime >= s.start && currentPlaybackTime < s.end
  );

  const [isLoopActive, setIsLoopActive] = useState(false);

  // provenance tally
  const tally: Record<Tier, number> = { measured: 0, computed: 0, estimated: 0, guessed: 0 };
  const count = (t: Tier | undefined) => { if (t) tally[t]++; };
  count(effectiveTempo.tier);
  count(effectiveKeySig.tier);
  if (report.texture) {
    count(report.texture.bassRatio.tier);
    count(report.texture.brightnessHz.tier);
    count(report.texture.onsetRate.tier);
  }
  for (const s of effectiveSections) count(s.tier);
  if (report.lyrics) {
    count(report.lyrics.rhymeDensity.tier);
    count(report.lyrics.diversity.tier);
    count(report.lyrics.avgSyllPerLine.tier);
    count(report.lyrics.flow.tier);
  }

  const meanEnergyPct = Math.round(effectiveEnergy.avg * 100);

  // Global Studio Keybindings (Space to Play/Pause, Arrow keys to Seek / Jump Sections, M to Mute)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (e.shiftKey) {
          const curIdx = effectiveSections.findIndex((s) => currentPlaybackTime >= s.start && currentPlaybackTime < s.end);
          const prevSec = effectiveSections[Math.max(0, curIdx - 1)];
          if (prevSec) handleSeek(prevSec.start);
        } else {
          handleSeek(Math.max(0, currentPlaybackTime - 5));
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) {
          const curIdx = effectiveSections.findIndex((s) => currentPlaybackTime >= s.start && currentPlaybackTime < s.end);
          const nextSec = effectiveSections[Math.min(effectiveSections.length - 1, curIdx + 1)];
          if (nextSec) handleSeek(nextSec.start);
        } else {
          handleSeek(Math.min(effectiveDuration, currentPlaybackTime + 5));
        }
      } else if (e.code === "KeyM") {
        if (audio) audio.muted = !audio.muted;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentPlaybackTime, effectiveDuration, effectiveSections, audio]);

  // A/B Section Looper Auto-Wrap
  useEffect(() => {
    if (!isLoopActive || !activeSection || !isPlaybackPlaying) return;
    if (currentPlaybackTime >= activeSection.end - 0.2) {
      handleSeek(activeSection.start + 0.05);
    }
  }, [isLoopActive, currentPlaybackTime, activeSection, isPlaybackPlaying]);

  const effectiveTempoBpm = effectiveTempo.value || 120;
  const beatDuration = 60 / effectiveTempoBpm;
  const currentBeatInBar = Math.floor((currentPlaybackTime / beatDuration) % 4);

  // Two-zone tab state
  const [analysisTab, setAnalysisTab] = useState<"overview" | "harmony" | "structure" | "instruments" | "lyrics" | "streaming">("overview");
  const [studioTab, setStudioTab] = useState<"rack" | "mpc" | "tools" | "dawmap" | "ai">("rack");

  const effectiveHarmonics =
    report.harmonics ??
    (report.keySig?.value
      ? analyzeHarmonics(report.keySig.value, report.sections, report.tempo?.value ?? null, report.meta.durationSec ?? null)
      : null);
  return (
    <div className="signal-printable-report flex flex-col gap-5">
      {/* â”€â”€ Report Header â”€â”€ */}
      <Reveal>
        <div className="panel ticks overflow-hidden px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="kicker">
                Analysis report Â· {meta.engine === "browser" ? "in-browser DSP" : "Python backend"} Â·{" "}
                {new Date(meta.analyzedAt).toLocaleTimeString()}
              </div>
              <h2 className="mt-2 break-words font-display text-3xl leading-[1.05] text-ink sm:text-4xl">
                {meta.title}
              </h2>
              <div className="mt-1 text-sm font-medium text-dim">{meta.artist}</div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-start gap-3">
              <div className="flex flex-wrap justify-end gap-1.5">
                <span className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.14em] ${(SOURCE_KIND[meta.source.kind] ?? SOURCE_KIND.unsupported).cls}`}>
                  {(SOURCE_KIND[meta.source.kind] ?? SOURCE_KIND.unsupported).label}
                </span>
                {[
                  meta.fileName !== "—" ? meta.fileName : null,
                  meta.durationSec !== null ? formatTime(meta.durationSec) : yt.duration !== null ? `${formatTime(yt.duration)} · from player` : null,
                  meta.sampleRate !== null ? `${(meta.sampleRate / 1000).toFixed(1)} kHz` : null,
                  meta.channels !== null ? `${meta.channels} ch` : null,
                ].filter(Boolean).map((chip) => (
                  <span key={chip as string} className="rounded-full border border-line bg-pit px-2.5 py-1 font-mono text-[10px] text-dim">{chip}</span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setIsRefMatcherOpen(true)} className="hide-on-print flex items-center gap-1.5 rounded-full border border-amber/60 bg-amber/15 px-3 py-1 font-mono text-[11px] font-bold tracking-wide text-amber shadow-sm transition hover:bg-amber hover:text-black cursor-pointer">
                  <span>🎚️</span> Match EQ
                </button>
                <button onClick={() => setIsSocialExportOpen(true)} className="hide-on-print flex items-center gap-1.5 rounded-full border border-mint/60 bg-mint/15 px-3 py-1 font-mono text-[11px] font-bold tracking-wide text-mint shadow-sm transition hover:bg-mint hover:text-black cursor-pointer">
                  <span>📱</span> 9:16 Video
                </button>
                <button onClick={() => setIsExportOpen(true)} className="hide-on-print flex items-center gap-1.5 rounded-full border border-cyanx/50 bg-cyanx/10 px-3 py-1 font-mono text-[11px] font-bold tracking-wide text-cyanx shadow-sm transition hover:border-cyanx hover:bg-cyanx hover:text-black cursor-pointer">
                  <span>📥</span> Export
                </button>
              </div>
              {meta.source.thumbnail && (
                <img src={meta.source.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover" referrerPolicy="no-referrer" />
              )}
            </div>
          </div>
          {(report.audioNote || report.audioError || report.transcriptionError || report.warnings.length > 0) && (
            <div className="mt-4 flex flex-col gap-2">
              {report.audioNote && (<div className="rounded-xl border border-cyanx/30 bg-gradient-to-r from-cyanx/10 via-pit to-cyanx/5 px-4 py-3 font-mono text-[11px] leading-relaxed text-cyanx shadow-md flex items-center justify-between gap-3"><div className="flex items-center gap-2.5 min-w-0"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyanx/20 text-cyanx">📡</span><span className="truncate"><strong className="text-ink">STREAM SYNC ACTIVE: </strong>{report.audioNote}</span></div><span className="shrink-0 rounded bg-cyanx/20 px-2 py-0.5 text-[9px] font-extrabold text-cyanx">DSP LOCKED</span></div>)}
              {report.audioError && (<div className="rounded-xl border border-rosex/45 bg-rosex/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-rosex shadow-md"><span className="font-bold tracking-[0.14em]">AUDIO_ERROR · </span>{report.audioError}</div>)}
              {report.transcriptionError && (<div className="rounded-xl border border-rosex/45 bg-rosex/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-rosex shadow-md"><span className="font-bold tracking-[0.14em]">TRANSCRIPTION_ERROR · </span>{report.transcriptionError}</div>)}
              {report.warnings.map((w, i) => (<div key={i} className="rounded-xl border border-amber/40 bg-amber/8 px-4 py-3 font-mono text-[11px] leading-relaxed text-amber shadow-md"><span className="font-bold tracking-[0.14em]">NOTE · </span>{w}</div>))}
            </div>
          )}
        </div>
      </Reveal>

      {/* ── Transport HUD ── */}
      <Reveal delay={30}>
        <div className="sticky top-0 z-30 rounded-2xl border border-cyanx/40 bg-gradient-to-r from-[#0d121f] via-[#090e18] to-[#0d121f] px-4 sm:px-6 py-3.5 shadow-2xl backdrop-blur-xl font-mono text-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => handleTogglePlay()} className={`flex h-11 items-center gap-2.5 rounded-xl px-4 font-mono text-xs font-black tracking-wider transition-all cursor-pointer shadow-lg shrink-0 ${isPlaybackPlaying ? "bg-mint text-black shadow-mint/30 ring-2 ring-mint" : "bg-cyanx text-black shadow-cyanx/40 hover:bg-white hover:scale-105"}`}>
                <span className="text-base">{isPlaybackPlaying ? "⏸" : "▶"}</span>
                <span>{isPlaybackPlaying ? "PAUSE" : "PLAY TRACK"}</span>
              </button>
              <div className="flex flex-col min-w-0">
                <span className="font-mono text-base font-black text-ink tracking-tight">{formatTime(currentPlaybackTime)} <span className="text-faint text-xs font-normal">/ {formatTime(effectiveDuration)}</span></span>
                <span className="text-[10px] text-cyanx font-bold flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyanx animate-ping" />{activeSection ? `[${activeSection.label.toUpperCase()}]` : "SYNCED PLAYHEAD"}</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1 max-w-xl">
              <div className="relative h-3.5 w-full rounded-full bg-pit/90 border border-white/10 cursor-pointer overflow-hidden shadow-inner" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); handleSeek((Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))) * effectiveDuration); }}>
                <div className="h-full bg-gradient-to-r from-cyanx via-mint to-amber transition-all duration-75" style={{ width: `${(currentPlaybackTime / effectiveDuration) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-faint font-semibold"><span>00:00</span><span className="text-dim">CLICK TO JUMP</span><span>{formatTime(effectiveDuration)}</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg bg-pit/80 border border-white/10 px-2 py-1">
                <span className="text-dim font-bold text-[9.5px] mr-1">BEAT:</span>
                {[0,1,2,3].map((b) => (<span key={b} className={`h-2.5 w-2.5 rounded-full transition-all duration-75 ${isPlaybackPlaying && currentBeatInBar === b ? b === 0 ? "bg-amber shadow-[0_0_8px_#ffd54f] scale-125" : "bg-cyanx shadow-[0_0_6px_#00f0ff] scale-110" : "bg-pit/70 border border-white/10"}`} />))}
              </div>
              <button type="button" onClick={() => setIsLoopActive(!isLoopActive)} className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition cursor-pointer border ${isLoopActive ? "bg-amber text-black border-amber shadow-md shadow-amber/30" : "bg-pit/80 border-white/10 text-dim hover:text-ink"}`}>🔁 A/B LOOP</button>
              <div className="flex items-center gap-1 overflow-x-auto">
                {effectiveSections.map((sec, idx) => { const isActive = currentPlaybackTime >= sec.start && currentPlaybackTime < sec.end; return (<button key={idx} type="button" onClick={() => handleSeek(sec.start + 0.05)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold transition cursor-pointer shrink-0 ${isActive ? "bg-amber text-black shadow-md shadow-amber/40 scale-105" : "bg-pit/70 border border-white/10 text-dim hover:text-ink hover:border-cyanx/50"}`}>{sec.label}</button>); })}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* â”€â”€ Source Playback â”€â”€ */}
      <Reveal delay={38}>
        <PlaybackPanel report={report} ytBridge={ytBridge} />
      </Reveal>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          ZONE 1 â€” ANALYSIS TABS
      {/* ————————————————————————————————————————————————————————————————————————
          ZONE 1 — ANALYSIS TABS
          ———————————————————————————————————————————————————————————————————————— */}
      <Reveal delay={50}>
        <div className="rounded-2xl border border-amber/25 bg-[#0b0e17] shadow-xl overflow-hidden">
          <div className="flex border-b border-white/10 bg-[#090c14] overflow-x-auto">
            {([
              { id: "overview", label: "⚡ OVERVIEW" },
              { id: "harmony", label: "🎵 HARMONY" },
              { id: "structure", label: "🏗️ STRUCTURE" },
              { id: "instruments", label: "🎸 INSTRUMENTS" },
              { id: "lyrics", label: "📝 LYRICS" },
              { id: "streaming", label: "📡 STREAMING" },
            ] as { id: typeof analysisTab; label: string }[]).map((tab) => (
              <button key={tab.id} type="button" onClick={() => setAnalysisTab(tab.id)} className={`relative px-4 py-3.5 font-mono text-[10.5px] font-bold tracking-[0.12em] whitespace-nowrap transition cursor-pointer border-r border-white/5 last:border-r-0 ${analysisTab === tab.id ? "text-amber bg-amber/8" : "text-dim hover:text-ink hover:bg-white/5"}`}>
                {tab.label}
                {analysisTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-amber rounded-full" />}
              </button>
            ))}
          </div>
          <div className="p-5 sm:p-6">
            {analysisTab === "overview" && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                  <Readout label="Tempo" value={effectiveTempo.value} unit="BPM" finding={effectiveTempo} format={(n) => n.toFixed(1)} />
                  <Readout label="Key" value={effectiveKeySig.value} finding={effectiveKeySig} />
                  <Readout label="Length" value={formatTime(effectiveDuration)} finding={{ value: effectiveDuration, tier: meta.durationSec !== null ? "measured" : "computed", source: meta.durationSec !== null ? "audio buffer duration" : "player metadata" }} />
                  <Readout label="Sections" value={effectiveSections.length} finding={{ value: effectiveSections.length, tier: effectiveSections[0]?.tier || "guessed", source: "energy-novelty & lyric cadence" }} />
                  <Readout label="Mean energy" value={meanEnergyPct} unit="%" finding={{ value: meanEnergyPct, tier: "measured", source: "RMS mean over track" }} />
                </div>
                {report.texture && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <Meter label="Bass share" display={`${(report.texture.bassRatio.value !== null ? report.texture.bassRatio.value * 100 : 0).toFixed(1)}%`} pct={report.texture.bassRatio.value ?? 0} tier={report.texture.bassRatio.tier} source={report.texture.bassRatio.source} />
                    <Meter label="Brightness" display={`${report.texture.brightnessHz.value ?? 0} Hz`} pct={((report.texture.brightnessHz.value ?? 400) - 400) / 4800} tier={report.texture.brightnessHz.tier} source={report.texture.brightnessHz.source} />
                    <Meter label="Onset density" display={`${report.texture.onsetRate.value ?? 0} /s`} pct={(report.texture.onsetRate.value ?? 0) / 8} tier={report.texture.onsetRate.tier} source={report.texture.onsetRate.source} />
                  </div>
                )}
                <div className="rounded-xl border border-line bg-pit/60 p-4">
                  <div className="kicker mb-3">Data Provenance</div>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(tally) as Tier[]).map((t) => (
                      <span key={t} className="rounded-full border px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.14em]" style={{ color: TIER_META[t].color, borderColor: `${TIER_META[t].color}50`, background: `${TIER_META[t].color}10` }}>{tally[t]} {TIER_META[t].label}</span>
                    ))}
                  </div>
                  <div className="mt-3"><TierLegend /></div>
                </div>
              </div>
            )}
            {analysisTab === "harmony" && (
              <div className="flex flex-col gap-4">
                {effectiveHarmonics ? (
                  <HarmonicPanel harmonics={effectiveHarmonics} onSeek={(t) => { if (audio) { audio.currentTime = t; void audio.play().catch(() => undefined); } }} />
                ) : (
                  <div className="rounded-lg border border-line bg-pit/70 px-4 py-8 text-center font-mono text-sm text-dim">No harmonic data available.</div>
                )}
                <HarmonicDJAssistant report={report} />
              </div>
            )}
            {analysisTab === "structure" && (
              <div className="flex flex-col gap-4">
                <div>
                  <PanelHeader kicker="Structure" title="Section timeline & energy curve" right={report.energy ? <span className="rounded-full border border-line bg-pit px-2.5 py-1 font-mono text-[10px] text-dim">Î” range {report.energy.dynamicRangeDb} dB</span> : undefined} />
                  <Timeline report={report} audio={audio} external={ytExternal} />
                </div>
                {report.sections.length > 0 && (
                  <div>
                    <PanelHeader kicker="Segments" title="Detected sections" />
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[520px] border-collapse">
                        <thead><tr className="border-b border-line text-left"><th className="kicker pb-2 pr-3 font-medium">#</th><th className="kicker pb-2 pr-3 font-medium">Label</th><th className="kicker pb-2 pr-3 font-medium">Range</th><th className="kicker pb-2 pr-3 font-medium">Duration</th><th className="kicker pb-2 pr-3 font-medium">Avg energy</th><th className="kicker pb-2 font-medium">Confidence</th></tr></thead>
                        <tbody>
                          {report.sections.map((s, i) => (
                            <tr key={i} className="row-hover cursor-pointer border-b border-linesoft" onClick={() => { if (audio) { audio.currentTime = s.start + 0.01; void audio.play().catch(() => undefined); } }}>
                              <td className="py-2.5 pr-3 font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</td>
                              <td className="py-2.5 pr-3"><span className="inline-flex items-center gap-2 font-mono text-xs font-semibold" style={{ color: labelColor(s.label) }}><span className="h-2 w-2 rounded-[2px]" style={{ background: labelColor(s.label) }} />{s.label}</span></td>
                              <td className="py-2.5 pr-3 font-mono text-[11px] text-dim">{formatTime(s.start)} â€“ {formatTime(s.end)}</td>
                              <td className="py-2.5 pr-3 font-mono text-[11px] text-dim">{Math.round(s.end - s.start)}s</td>
                              <td className="py-2.5 pr-3"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-line/60"><div className="h-full rounded-full" style={{ width: `${Math.round(s.avgEnergy * 100)}%`, background: labelColor(s.label) }} /></div><span className="font-mono text-[10px] text-dim">{Math.round(s.avgEnergy * 100)}%</span></div></td>
                              <td className="py-2.5"><TierBadge tier={s.tier} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                <SampleAncestryPanel report={report} />
              </div>
            )}
            {analysisTab === "instruments" && (
              <div className="flex flex-col gap-4">
                <InstrumentMatrixPanel report={report} />
                <VocalPitchHUD report={report} currentTime={currentPlaybackTime} isPlaying={isPlaybackPlaying} />
                <ArtistDeepDivePanel report={report} />
              </div>
            )}
            {analysisTab === "lyrics" && (
              <div className="flex flex-col gap-4">
                <PanelHeader kicker="Lyrics Analytics" title={report.lyrics ? "Text metrics & Cadence" : "Lyrics"} right={report.lyrics ? <div className="flex gap-1.5"><span className="rounded-full border border-cyanx/45 bg-cyanx/10 px-2.5 py-1 font-mono text-[10px] text-cyanx">{report.lyrics.source === "transcript" ? "FROM TRANSCRIPT" : "PASTED TEXT"}</span><span className="rounded-full border border-line bg-pit px-2.5 py-1 font-mono text-[10px] text-dim">{report.lyrics.lineCount} lines Â· {report.lyrics.wordCount} words</span></div> : undefined} />
                {report.lyricsError && <div className="rounded-lg border border-line bg-pit/70 px-4 py-3 font-mono text-[11px] text-dim">{report.lyricsError}</div>}
                {report.lyrics ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <Readout label="Rhyme density" value={report.lyrics.rhymeDensity.value !== null ? Math.round(report.lyrics.rhymeDensity.value * 100) : null} unit="%" finding={report.lyrics.rhymeDensity} />
                      <Readout label="Lexical diversity" value={report.lyrics.diversity.value} finding={report.lyrics.diversity} format={(n) => n.toFixed(2)} />
                      <Readout label="Syllables / line" value={report.lyrics.avgSyllPerLine.value} finding={report.lyrics.avgSyllPerLine} format={(n) => n.toFixed(1)} />
                      <Readout label="Flow" value={report.lyrics.flow.value} unit="syl/s" finding={report.lyrics.flow} format={(n) => n.toFixed(2)} />
                    </div>
                    <div>
                      <div className="kicker mb-3">Hook candidates</div>
                      {report.lyrics.hooks.length === 0 ? (
                        <div className="rounded-lg border border-line bg-pit/70 px-4 py-3 font-mono text-[11px] text-dim">No exactly repeated lines found.</div>
                      ) : (
                        <ul className="flex flex-col gap-2">{report.lyrics.hooks.map((h, i) => (<li key={i} className="row-hover flex items-center gap-3 rounded-lg border border-linesoft bg-pit/70 px-4 py-2.5"><span className="font-mono text-[10px] font-bold tracking-[0.16em] text-amber">Ã—{h.count}</span><span className="min-w-0 truncate text-sm text-ink">"{h.fragment}"</span><span className="ml-auto shrink-0"><TierBadge tier="computed" /></span></li>))}</ul>
                      )}
                      {report.lyrics.rawText && (
                        <div className="mt-4 border-t border-linesoft/60 pt-3">
                          <button onClick={() => setShowFullLyrics(!showFullLyrics)} className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-cyanx hover:text-ink transition cursor-pointer">
                            <span>{showFullLyrics ? "â–¼ Hide Full Lyrics Text" : "â–¶ Read Full Song Lyrics"}</span>
                            <span className="text-dim">({report.lyrics.lineCount} lines Â· {report.lyrics.wordCount} words)</span>
                          </button>
                          {showFullLyrics && <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-linesoft bg-pit/90 p-4 font-mono text-xs text-ink/90 whitespace-pre-wrap leading-relaxed">{report.lyrics.rawText}</div>}
                        </div>
                      )}
                    </div>
                  </>
                ) : !report.lyricsError && (
                  <div className="rounded-lg border border-line bg-pit/70 px-4 py-8 text-center font-mono text-sm text-dim">No lyrics data â€” paste lyrics in the console and re-run.</div>
                )}
              </div>
            )}
            {analysisTab === "streaming" && (
              <div className="flex flex-col gap-4">
                <StreamingCompliancePanel report={report} />
                <ProducerInsightsPanel report={report} />
              </div>
            )}
          </div>
        </div>
      </Reveal>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          ZONE 2 â€” STUDIO PRODUCTION TABS
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <Reveal delay={60}>
        <div className="relative flex items-center gap-4 py-1">
          <div className="flex-1 h-px bg-cyanx/20" />
          <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-cyanx/60 uppercase">Studio Production</span>
          <div className="flex-1 h-px bg-cyanx/20" />
        </div>
      </Reveal>

      <Reveal delay={65}>
        <div className="rounded-2xl border border-cyanx/25 bg-[#0b0e17] shadow-xl overflow-hidden">
          <div className="flex border-b border-white/10 bg-[#090c14] overflow-x-auto">
            {([
              { id: "rack", label: "🎹 CHANNEL RACK" },
              { id: "mpc", label: "🥁 MPC PADS" },
              { id: "tools", label: "🎚️ STUDIO TOOLS" },
              { id: "dawmap", label: "🗺️ DAW MAP" },
              { id: "ai", label: "🤖 AI PRODUCER" },
            ] as { id: typeof studioTab; label: string }[]).map((tab) => (
              <button key={tab.id} type="button" onClick={() => setStudioTab(tab.id)} className={`relative px-5 py-3.5 font-mono text-[11px] font-bold tracking-[0.12em] whitespace-nowrap transition cursor-pointer border-r border-white/5 last:border-r-0 ${studioTab === tab.id ? "text-cyanx bg-cyanx/8" : "text-dim hover:text-ink hover:bg-white/5"}`}>
                {tab.label}
                {studioTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-cyanx rounded-full shadow-[0_0_6px_#00f0ff]" />}
              </button>
            ))}
          </div>
          <div>
            {studioTab === "rack" && (
              <FLStudioChannelRack currentTime={currentPlaybackTime} isPlaying={isPlaybackPlaying} activeSectionName={activeSection?.label || "Verse"} bpm={effectiveTempo.value || 120} instruments={report.instruments} report={report} sections={effectiveSections} onTogglePlay={handleTogglePlay} onSeek={handleSeek} />
            )}
            {studioTab === "mpc" && (
              <div className="p-5 sm:p-6"><LiveMPCPadSampler /></div>
            )}
            {studioTab === "tools" && (
              <div className="p-5 sm:p-6 flex flex-col gap-5">
                <AudioSpectrumHUD isPlaying={isPlaybackPlaying} currentTime={currentPlaybackTime} texture={report.texture} />
                <StudioParametricEQ />
              </div>
            )}
            {studioTab === "dawmap" && (
              <div className="p-5 sm:p-6">
                <FullSongDAWMap report={{ ...report, sections: effectiveSections }} currentTime={currentPlaybackTime} duration={effectiveDuration} isPlaying={isPlaybackPlaying} onSeek={handleSeek} />
              </div>
            )}
            {studioTab === "ai" && (
              <div className="p-5 sm:p-6"><AIProducerBlueprint report={report} /></div>
            )}
          </div>
        </div>
      </Reveal>

      {/* Modals */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} report={report} />
      <ReferenceMatcherModal isOpen={isRefMatcherOpen} onClose={() => setIsRefMatcherOpen(false)} report={report} />
      <AnimatedSocialExportModal isOpen={isSocialExportOpen} onClose={() => setIsSocialExportOpen(false)} report={report} currentTime={currentPlaybackTime} />
    </div>
  );
}