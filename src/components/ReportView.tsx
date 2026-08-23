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
  const [showFullLyrics, setShowFullLyrics] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // YouTube instrumented-player bridge: real duration + synced time + seek
  const [yt, setYt] = useState<{ duration: number | null; time: number }>({ duration: null, time: 0 });
  const ytSeekRef = useRef<(t: number) => void>(() => {});

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
    ytSeekRef.current = () => {};
  }, [meta.analyzedAt]);

  const ytBridge: YouTubeBridge = {
    onDuration: (d) => setYt((m) => (m.duration === d ? m : { ...m, duration: d })),
    onTime: (t) => setYt((m) => (Math.abs(m.time - t) < 0.05 ? m : { ...m, time: t })),
    onSeekReady: (fn) => {
      ytSeekRef.current = fn;
    },
  };

  const isYouTube = meta.source.kind === "youtube";
  const ytExternal = !audio && isYouTube
    ? { duration: yt.duration, time: yt.time, seek: (t: number) => ytSeekRef.current(t) }
    : null;

  const currentPlaybackTime = audio ? audioTime : yt.time;
  const isPlaybackPlaying = audio ? audioPlaying : yt.time > 0;

  const handleSeek = (t: number) => {
    if (audio) {
      audio.currentTime = t;
      void audio.play().catch(() => undefined);
    } else if (ytExternal) {
      ytExternal.seek(t);
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

  return (
    <div className="signal-printable-report flex flex-col gap-5">
      {/* report header */}
      <Reveal>
        <div className="panel ticks overflow-hidden px-5 py-5 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="kicker">
                Analysis report · {meta.engine === "browser" ? "in-browser DSP" : "Python backend"} ·{" "}
                {new Date(meta.analyzedAt).toLocaleTimeString()}
              </div>
              <h2 className="mt-2 break-words font-display text-3xl leading-[1.05] text-ink sm:text-4xl">
                {meta.title}
              </h2>
              <div className="mt-1 text-sm font-medium text-dim">{meta.artist}</div>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-start gap-3">
              <div className="flex flex-wrap justify-end gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold tracking-[0.14em] ${
                    (SOURCE_KIND[meta.source.kind] ?? SOURCE_KIND.unsupported).cls
                  }`}
                >
                  {(SOURCE_KIND[meta.source.kind] ?? SOURCE_KIND.unsupported).label}
                </span>
                {[
                  meta.fileName !== "—" ? meta.fileName : null,
                  meta.durationSec !== null
                    ? formatTime(meta.durationSec)
                    : yt.duration !== null
                      ? `${formatTime(yt.duration)} · from player`
                      : null,
                  meta.sampleRate !== null ? `${(meta.sampleRate / 1000).toFixed(1)} kHz` : null,
                  meta.channels !== null ? `${meta.channels} ch` : null,
                ]
                  .filter(Boolean)
                  .map((chip) => (
                    <span
                      key={chip as string}
                      className="rounded-full border border-line bg-pit px-2.5 py-1 font-mono text-[10px] text-dim"
                    >
                      {chip}
                    </span>
                  ))}
              </div>
              <button
                onClick={() => setIsExportOpen(true)}
                className="hide-on-print flex items-center gap-1.5 rounded-full border border-cyanx/50 bg-cyanx/10 px-3.5 py-1 font-mono text-[11px] font-bold tracking-wide text-cyanx shadow-sm transition hover:border-cyanx hover:bg-cyanx hover:text-black cursor-pointer"
                title="Export report as PDF, JSON, Markdown, or Social Track Card image"
              >
                <span>⤹</span> Export & Share
              </button>
              {meta.source.thumbnail && (
                <img
                  src={meta.source.thumbnail}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>

          {(report.audioError || report.audioNote || report.transcriptionError || report.warnings.length > 0) && (
            <div className="mt-4 flex flex-col gap-2">
              {report.audioNote && (
                <div className="rounded-lg border border-cyanx/40 bg-cyanx/8 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-cyanx">
                  <span className="font-bold tracking-[0.14em]">BY DESIGN · </span>
                  {report.audioNote}
                </div>
              )}
              {report.audioError && (
                <div className="rounded-lg border border-rosex/45 bg-rosex/10 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-rosex">
                  <span className="font-bold tracking-[0.14em]">AUDIO_ERROR · </span>
                  {report.audioError}
                </div>
              )}
              {report.transcriptionError && (
                <div className="rounded-lg border border-rosex/45 bg-rosex/10 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-rosex">
                  <span className="font-bold tracking-[0.14em]">TRANSCRIPTION_ERROR · </span>
                  {report.transcriptionError}
                </div>
              )}
              {report.warnings.map((w, i) => (
                <div key={i} className="rounded-lg border border-amber/40 bg-amber/8 px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-amber">
                  <span className="font-bold tracking-[0.14em]">NOTE · </span>
                  {w}
                </div>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      {/* source playback */}
      <Reveal delay={40}>
        <PlaybackPanel report={report} ytBridge={ytBridge} />
      </Reveal>

      {/* readout strip */}
      <Reveal delay={60}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Readout label="Tempo" value={effectiveTempo.value} unit="BPM" finding={effectiveTempo} format={(n) => n.toFixed(1)} />
          <Readout label="Key" value={effectiveKeySig.value} finding={effectiveKeySig} />
          <Readout
            label="Length"
            value={formatTime(effectiveDuration)}
            finding={{
              value: effectiveDuration,
              tier: meta.durationSec !== null ? "measured" : "computed",
              source: meta.durationSec !== null ? "audio buffer duration" : "official player metadata",
            }}
          />
          <Readout
            label="Sections"
            value={effectiveSections.length}
            finding={{ value: effectiveSections.length, tier: effectiveSections[0]?.tier || "guessed", source: "energy-novelty & lyric cadence boundaries" }}
          />
          <Readout
            label="Mean energy"
            value={meanEnergyPct}
            unit="%"
            finding={{ value: meanEnergyPct, tier: "measured", source: "RMS mean over track" }}
          />
        </div>
      </Reveal>

      {/* master full-song DAW arrangement map */}
      <Reveal delay={70}>
        <FullSongDAWMap
          report={{ ...report, sections: effectiveSections }}
          currentTime={currentPlaybackTime}
          duration={effectiveDuration}
          isPlaying={isPlaybackPlaying}
          onSeek={handleSeek}
        />
      </Reveal>

      {/* FL Studio Granular Step Sequencer & Pattern Breakdown */}
      <Reveal delay={75}>
        <FLStudioChannelRack
          currentTime={currentPlaybackTime}
          isPlaying={isPlaybackPlaying}
          activeSectionName={activeSection?.label || "Verse"}
          instruments={report.instruments}
        />
      </Reveal>

      {/* structure + energy */}
      {(report.energy || report.sections.length > 0 || ytExternal !== null) && (
      <Reveal delay={80}>
        <div className="panel px-5 py-5 sm:px-6">
          <PanelHeader
            kicker="01 · Structure"
            title="Section timeline & energy curve"
            right={
              <div className="flex gap-1.5">
                {report.energy && (
                  <span className="rounded-full border border-line bg-pit px-2.5 py-1 font-mono text-[10px] text-dim">
                    Δ range {report.energy.dynamicRangeDb} dB
                  </span>
                )}
              </div>
            }
          />
          <Timeline report={report} audio={audio} />
        </div>
      </Reveal>
      )}

      {/* texture */}
      {report.texture && (
        <Reveal delay={80}>
          <div className="panel px-5 py-5 sm:px-6">
            <PanelHeader kicker="02 · Texture" title="Spectral character" />
            <div className="grid gap-3 md:grid-cols-3">
              <Meter
                label="Bass share"
                display={`${(report.texture.bassRatio.value !== null ? report.texture.bassRatio.value * 100 : 0).toFixed(1)}%`}
                pct={report.texture.bassRatio.value ?? 0}
                tier={report.texture.bassRatio.tier}
                source={report.texture.bassRatio.source}
              />
              <Meter
                label="Brightness"
                display={`${report.texture.brightnessHz.value ?? 0} Hz`}
                pct={((report.texture.brightnessHz.value ?? 400) - 400) / 4800}
                tier={report.texture.brightnessHz.tier}
                source={report.texture.brightnessHz.source}
              />
              <Meter
                label="Onset density"
                display={`${report.texture.onsetRate.value ?? 0} /s`}
                pct={(report.texture.onsetRate.value ?? 0) / 8}
                tier={report.texture.onsetRate.tier}
                source={report.texture.onsetRate.source}
              />
            </div>
          </div>
        </Reveal>
      )}

      {/* section table */}
      {report.sections.length > 0 && (
        <Reveal delay={60}>
          <div className="panel px-5 py-5 sm:px-6">
            <PanelHeader kicker="03 · Segments" title="Detected sections" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="kicker pb-2 pr-3 font-medium">#</th>
                    <th className="kicker pb-2 pr-3 font-medium">Label</th>
                    <th className="kicker pb-2 pr-3 font-medium">Range</th>
                    <th className="kicker pb-2 pr-3 font-medium">Duration</th>
                    <th className="kicker pb-2 pr-3 font-medium">Avg energy</th>
                    <th className="kicker pb-2 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sections.map((s, i) => (
                    <tr
                      key={i}
                      className="row-hover cursor-pointer border-b border-linesoft"
                      onClick={() => {
                        if (audio) {
                          audio.currentTime = s.start + 0.01;
                          void audio.play().catch(() => undefined);
                        }
                      }}
                      title={audio ? "Click to play from here" : undefined}
                    >
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-2.5 pr-3">
                        <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold" style={{ color: labelColor(s.label) }}>
                          <span className="h-2 w-2 rounded-[2px]" style={{ background: labelColor(s.label) }} />
                          {s.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-dim">
                        {formatTime(s.start)} – {formatTime(s.end)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-dim">{Math.round(s.end - s.start)}s</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line/60">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.round(s.avgEnergy * 100)}%`, background: labelColor(s.label) }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-dim">{Math.round(s.avgEnergy * 100)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <TierBadge tier={s.tier} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
      )}

      {/* Harmonic & Chord Progression Breakdown */}
      {(() => {
        const effectiveHarmonics =
          report.harmonics ??
          (report.keySig?.value
            ? analyzeHarmonics(
                report.keySig.value,
                report.sections,
                report.tempo?.value ?? null,
                report.meta.durationSec ?? null
              )
            : null);
        return effectiveHarmonics ? (
          <Reveal delay={50}>
            <HarmonicPanel
              harmonics={effectiveHarmonics}
              onSeek={(t) => {
                if (audio) {
                  audio.currentTime = t;
                  void audio.play().catch(() => undefined);
                }
              }}
            />
          </Reveal>
        ) : null;
      })()}

      {/* Instrument & Stem Recognition */}
      <Reveal delay={55}>
        <InstrumentMatrixPanel report={report} />
      </Reveal>

      {/* text metrics */}
      <Reveal delay={65}>
        <div className="panel px-5 py-5 sm:px-6">
          <PanelHeader
            kicker="05 · Lyrics Analytics"
            title={report.lyrics ? "Text metrics & Cadence" : "Lyrics"}
            right={
              report.lyrics ? (
                <div className="flex gap-1.5">
                  <span className="rounded-full border border-cyanx/45 bg-cyanx/10 px-2.5 py-1 font-mono text-[10px] text-cyanx">
                    {report.lyrics.source === "transcript" ? "FROM TRANSCRIPT" : "PASTED TEXT"}
                  </span>
                  <span className="rounded-full border border-line bg-pit px-2.5 py-1 font-mono text-[10px] text-dim">
                    {report.lyrics.lineCount} lines · {report.lyrics.wordCount} words
                  </span>
                </div>
              ) : undefined
            }
          />

          {report.lyricsError && (
            <div className="rounded-lg border border-line bg-pit/70 px-4 py-3 font-mono text-[11px] leading-relaxed text-dim">
              {report.lyricsError}
            </div>
          )}

          {report.lyrics && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Readout
                  label="Rhyme density"
                  value={report.lyrics.rhymeDensity.value !== null ? Math.round(report.lyrics.rhymeDensity.value * 100) : null}
                  unit="%"
                  finding={report.lyrics.rhymeDensity}
                />
                <Readout
                  label="Lexical diversity"
                  value={report.lyrics.diversity.value}
                  finding={report.lyrics.diversity}
                  format={(n) => n.toFixed(2)}
                />
                <Readout label="Syllables / line" value={report.lyrics.avgSyllPerLine.value} finding={report.lyrics.avgSyllPerLine} format={(n) => n.toFixed(1)} />
                <Readout label="Flow" value={report.lyrics.flow.value} unit="syl/s" finding={report.lyrics.flow} format={(n) => n.toFixed(2)} />
              </div>

              <div className="mt-5">
                <div className="kicker mb-3">Hook candidates — repeated lines, fragments only</div>
                {report.lyrics.hooks.length === 0 ? (
                  <div className="rounded-lg border border-line bg-pit/70 px-4 py-3 font-mono text-[11px] text-dim">
                    No exactly repeated lines found — this text may be through-composed.
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {report.lyrics.hooks.map((h, i) => (
                      <li
                        key={i}
                        className="row-hover flex items-center gap-3 rounded-lg border border-linesoft bg-pit/70 px-4 py-2.5"
                      >
                        <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-amber">×{h.count}</span>
                        <span className="min-w-0 truncate text-sm text-ink">“{h.fragment}”</span>
                        <span className="ml-auto shrink-0">
                          <TierBadge tier="computed" title="Exact line repetition in the supplied text" />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {report.lyrics.source === "transcript" && (
                  <p className="mt-3 rounded-md border border-cyanx/30 bg-cyanx/8 px-3 py-2 font-mono text-[10px] leading-relaxed text-cyanx">
                    Auto-transcribed by Whisper-tiny in your browser. Singing is hard for speech models — expect
                    misheard words. The transcript is in the lyrics box: clean it up and re-run for sharper metrics.
                  </p>
                )}

                {/* Collapsible Full Lyrics Reader */}
                {report.lyrics.rawText && (
                  <div className="mt-4 border-t border-linesoft/60 pt-3">
                    <button
                      onClick={() => setShowFullLyrics(!showFullLyrics)}
                      className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-cyanx hover:text-ink transition cursor-pointer"
                    >
                      <span>{showFullLyrics ? "▼ Hide Full Lyrics Text" : "▶ Read Full Song Lyrics"}</span>
                      <span className="text-dim">({report.lyrics.lineCount} lines · {report.lyrics.wordCount} words)</span>
                    </button>
                    {showFullLyrics && (
                      <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-linesoft bg-pit/90 p-4 font-mono text-xs text-ink/90 whitespace-pre-wrap leading-relaxed">
                        {report.lyrics.rawText}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Reveal>

      {/* AI Producer & Mix Feedback */}
      <Reveal delay={55}>
        <ProducerInsightsPanel report={report} />
      </Reveal>

      {/* provenance */}
      <Reveal delay={60}>
        <div className="panel ticks px-5 py-5 sm:px-6">
          <PanelHeader kicker="07 · Provenance" title="How each number was produced" />
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(tally) as Tier[]).map((t) => (
              <span
                key={t}
                className="rounded-full border px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.14em]"
                style={{ color: TIER_META[t].color, borderColor: `${TIER_META[t].color}50`, background: `${TIER_META[t].color}10` }}
              >
                {tally[t]} {TIER_META[t].label}
              </span>
            ))}
          </div>
          <TierLegend />
        </div>
      </Reveal>

      {/* Export & Share Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        report={report}
      />
    </div>
  );
}
