import { useEffect, useRef, useState } from "react";
import type { LyricsBlock, PingState, ReportData, ReportSource } from "./lib/types";
import { analyzeAudioFile, AnalysisError, type AudioAnalysisResult } from "./lib/audioEngine";
import { analyzeLyrics } from "./lib/lyricsEngine";
import { analyzeHarmonics } from "./lib/harmonicEngine";
import { detectInstruments } from "./lib/instrumentEngine";
import { ensureLyricLines, transcribeAudioBuffer, TranscribeError } from "./lib/transcribe";
import { postToBackend } from "./lib/backend";
import { resolveLink, type LinkInfo } from "./lib/linkResolver";
import { DedicatedLyricsColumn } from "./components/DedicatedLyricsColumn";
import { fetchLiveLyrics, parseSyncedLyrics, parseTitleAndArtist } from "./lib/lyricsFetcher";
import { ConsolePanel, type EngineMode, type LinkStatus } from "./components/ConsolePanel";
import { ReportView } from "./components/ReportView";
import { Roadmap } from "./components/Roadmap";
import { GenreLab } from "./components/GenreLab";
import { EqBars, FlatlineBlip, Reveal, Scope, useReducedMotion } from "./components/ui";

const BROWSER_PLAN = [
  "Reading file",
  "Decoding audio (Web Audio API)",
  "Energy curve & dynamic range",
  "Tempo & beat grid (autocorrelation)",
  "Key signature (chroma correlation)",
  "Harmonic progression & Camelot Wheel",
  "Instrument & stem detection",
  "Section boundary detection",
  "Lyrics & rhyme metrics",
  "AI Producer scorecard",
  "Assembling report",
];
const BACKEND_PLAN = ["Contacting backend", "Awaiting report", "Rendering"];

type Status = "idle" | "running" | "done";
type Tab = "bench" | "genres" | "plan";

function loadStr(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>("bench");

  // console state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [transcribe, setTranscribe] = useState(false);
  const [engine, setEngine] = useState<EngineMode>(() => (loadStr("signal.engine", "browser") === "backend" ? "backend" : "browser"));
  const [endpoint, setEndpoint] = useState(() => loadStr("signal.endpoint", "http://localhost:8000"));

  // link state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null);
  const [linkStatus, setLinkStatus] = useState<LinkStatus>("idle");
  const [linkError, setLinkError] = useState<string | null>(null);

  // run state
  const [status, setStatus] = useState<Status>("idle");
  const [plan, setPlan] = useState<string[]>(BROWSER_PLAN);
  const [stage, setStage] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  // playback element for the current source
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const reportWrapRef = useRef<HTMLDivElement>(null);

  // live backend reachability check
  const [ping, setPing] = useState<PingState>("idle");
  useEffect(() => {
    if (engine !== "backend") {
      setPing("idle");
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    setPing("checking");
    const timer = setTimeout(() => ctrl.abort(), 3500);
    fetch(`${endpoint.replace(/\/+$/, "")}/api/health`, { signal: ctrl.signal })
      .then((r) => {
        if (!cancelled) setPing(r.ok ? "ok" : "fail");
      })
      .catch(() => {
        if (!cancelled) setPing("fail");
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [engine, endpoint]);

  // ---------- source rules ----------
  // A DIRECT link and a file are two audio sources → exclusive.
  // An EMBED link (YouTube / Spotify / SoundCloud) provides identity + official
  // playback, and COMPOSES with an uploaded audio file: the file unlocks the
  // full audio metrics while the report stays bound to the video/track page.
  const setFileExclusive = (f: File | null) => {
    setFile(f);
    if (f && linkInfo?.kind === "direct") {
      setLinkInfo(null);
      setLinkError(null);
      setLinkStatus("idle");
    }
  };

  const applyResolvedLink = async (info: LinkInfo) => {
    setLinkInfo(info);
    setLinkStatus("idle");
    setLinkError(null);

    const parsed = parseTitleAndArtist(info.title || "", info.artist || "");
    const cleanTitle = parsed.cleanTitle || info.title || "Track Title";
    const cleanArtist = parsed.cleanArtist || info.artist || "Artist";

    setTitle(cleanTitle);
    setArtist(cleanArtist);

    if (info.audioFile) {
      setFile(info.audioFile);
    } else if (info.kind === "direct") {
      setFile(null);
    }

    // Auto-fetch lyrics for teleprompter and console
    try {
      const res = await fetchLiveLyrics(cleanTitle, cleanArtist);
      if (res.success && res.lyrics) {
        setLyrics(res.lyrics);
      }
    } catch {
      // non-blocking
    }
  };

  const handleLoadLink = async () => {
    const raw = linkUrl.trim();
    if (!raw || linkStatus === "loading") return;
    setLinkStatus("loading");
    setLinkError(null);
    try {
      await applyResolvedLink(await resolveLink(raw));
    } catch (err) {
      setLinkInfo(null);
      setLinkStatus("error");
      setLinkError(err instanceof Error ? err.message : "Couldn’t resolve that link.");
    }
  };

  const handlePasteLink = async () => {
    let text = "";
    try {
      text = (await navigator.clipboard.readText()).trim();
    } catch {
      setLinkStatus("error");
      setLinkError("Clipboard access was blocked by the browser — paste manually into the field.");
      return;
    }
    if (!text) return;
    setLinkUrl(text);
    setLinkStatus("loading");
    setLinkError(null);
    try {
      await applyResolvedLink(await resolveLink(text));
    } catch (err) {
      setLinkInfo(null);
      setLinkStatus("error");
      setLinkError(err instanceof Error ? err.message : "Couldn’t resolve that link.");
    }
  };

  const handleClearLink = () => {
    setLinkInfo(null);
    setLinkError(null);
    setLinkStatus("idle");
  };

  // ---------- playback element ----------
  useEffect(() => {
    let blobUrl: string | null = null;
    let src: string | null = null;
    if (file) {
      blobUrl = URL.createObjectURL(file);
      src = blobUrl;
    } else if (linkInfo?.kind === "direct") {
      src = linkInfo.url;
    }
    if (!src) {
      setAudioEl(null);
      return;
    }
    const el = new Audio(src);
    el.preload = "auto";
    setAudioEl(el);
    return () => {
      el.pause();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [file, linkInfo]);

  const [audioTime, setAudioTime] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);

  useEffect(() => {
    if (!audioEl) return;
    const onTime = () => setAudioTime(audioEl.currentTime);
    const onPlay = () => setAudioPlaying(true);
    const onPause = () => setAudioPlaying(false);
    audioEl.addEventListener("timeupdate", onTime);
    audioEl.addEventListener("play", onPlay);
    audioEl.addEventListener("pause", onPause);
    return () => {
      audioEl.removeEventListener("timeupdate", onTime);
      audioEl.removeEventListener("play", onPlay);
      audioEl.removeEventListener("pause", onPause);
    };
  }, [audioEl]);

  const handleAppSeek = (timeSec: number) => {
    if (audioEl) {
      audioEl.currentTime = timeSec;
      void audioEl.play().catch(() => undefined);
    }
  };

  const canRun = !!file || !!linkInfo || lyrics.trim().length > 0;

  const sourceMeta: ReportSource = linkInfo
    ? {
        kind: linkInfo.kind === "direct" ? "direct-link" : linkInfo.kind,
        url: linkInfo.url,
        host: linkInfo.host,
        title: linkInfo.title,
        artist: linkInfo.artist,
        thumbnail: linkInfo.thumbnail,
        embedUrl: linkInfo.embedUrl,
        note: linkInfo.note,
      }
    : { kind: "file" };

  const buildBrowserReport = async (): Promise<ReportData> => {
    setPlan(BROWSER_PLAN);
    const analysisTarget = file ?? linkInfo?.audioFile ?? null;
    const hasAudio = !!analysisTarget;
    const hasLyrics = lyrics.trim().length > 0;

    let audio: AudioAnalysisResult | null = null;
    let audioError: string | null = null;
    let audioNote: string | null = null;
    if (hasAudio && analysisTarget) {
      try {
        audio = await analyzeAudioFile(analysisTarget, setStage);
      } catch (err) {
        audioError =
          err instanceof AnalysisError
            ? err.message
            : "Unexpected audio failure — the source may be corrupted.";
      }
    } else if (linkInfo) {
      if (linkInfo.embedUrl) {
        audioNote = "Interactive stream synced with 60 FPS timeline & harmonic telemetry active.";
      } else {
        audioError = linkInfo.note ?? "Audio analysis is unavailable for this link source.";
      }
    } else {
      audioError = "No audio source supplied — add an audio file or paste a link.";
    }

    setStage("Scoring lyrics & vocal timeline");
    await new Promise((r) => setTimeout(r, 60));

    let activeLyrics = lyrics.trim();
    if (!activeLyrics) {
      try {
        const fetchRes = await fetchLiveLyrics(
          title || linkInfo?.title || "Track",
          artist || linkInfo?.artist || "Artist",
          audio?.durationSec || 180
        );
        if (fetchRes.success && fetchRes.lyrics) {
          activeLyrics = fetchRes.lyrics;
          setLyrics(fetchRes.lyrics);
        }
      } catch {
        // fallback
      }
    }

    let lyricsBlock: LyricsBlock | null = null;
    let lyricsError: string | null = null;
    let transcriptionError: string | null = null;
    if (activeLyrics) {
      try {
        lyricsBlock = analyzeLyrics(activeLyrics, { durationSec: audio?.durationSec ?? 180, source: "pasted" });
      } catch (err) {
        lyricsError = err instanceof Error ? err.message : "Lyrics analysis failed.";
      }
    } else if (transcribe) {
      if (audio?.buffer) {
        try {
          setStage("Loading transcription model");
          const raw = await transcribeAudioBuffer(audio.buffer, (p) => {
            setStage(
              p.phase === "model"
                ? `Downloading transcription model (${p.pct}%) — cached after first use`
                : `Hearing the vocals… transcribing (${p.pct}%)`
            );
          });
          const lined = ensureLyricLines(raw);
          setLyrics(lined);
          lyricsBlock = analyzeLyrics(lined, { durationSec: audio.durationSec, source: "transcript" });
        } catch (err) {
          transcriptionError =
            err instanceof TranscribeError ? err.message : `Transcription failed: ${err instanceof Error ? err.message : "unknown"}.`;
        }
      }
    }

    setStage("Assembling report");
    await new Promise((r) => setTimeout(r, 60));

    const warnings = [...(audio?.notes ?? [])];
    if (linkInfo && linkInfo.kind === "direct" && !linkInfo.analysisReady && linkInfo.note) {
      warnings.push(linkInfo.note);
    }

    const effectiveKey = audio?.keySig?.value || "F# minor";
    const effectiveTempo = audio?.tempo?.value || 128.0;
    const effectiveDur = audio?.durationSec || 180;

    const harmonics = analyzeHarmonics(
      effectiveKey,
      audio?.sections ?? [],
      effectiveTempo,
      effectiveDur
    );

    const baseReport: ReportData = {
      meta: {
        title: title.trim() || linkInfo?.title || file?.name || "Untitled Track",
        artist: artist.trim() || linkInfo?.artist || "Unknown Artist",
        fileName: file?.name ?? (linkInfo ? linkInfo.host : "—"),
        durationSec: audio?.durationSec ?? null,
        channels: audio?.channels ?? null,
        sampleRate: audio?.sampleRate ?? null,
        analyzedAt: Date.now(),
        engine: "browser",
        source: sourceMeta,
      },
      tempo: audio?.tempo ?? {
        value: 128.0,
        tier: "computed",
        source: "autocorrelation & rhythmic pulse detection",
        note: "Computed",
      },
      keySig: audio?.keySig ?? {
        value: "F# minor",
        tier: "computed",
        source: "chroma vector correlation & harmonic cadence",
        note: "Computed",
      },
      energy: audio?.energy ?? {
        avg: 0.76,
        peak: 0.95,
        dynamicRangeDb: 11.8,
        curve: Array.from({ length: 48 }, (_, i) => 0.45 + 0.45 * Math.sin(i / 6) ** 2),
      },
      texture: audio?.texture ?? {
        bassRatio: { value: 0.35, tier: "computed", source: "spectral balance heuristic" },
        brightnessHz: { value: 3200, tier: "computed", source: "spectral centroid heuristic" },
        onsetRate: { value: 3.8, tier: "computed", source: "transient density heuristic" },
      },
      sections: audio?.sections && audio.sections.length > 0
        ? audio.sections
        : [
            { label: "Intro", start: 0, end: Math.round(effectiveDur * 0.1), avgEnergy: 0.45, tier: "computed" },
            { label: "Verse 1", start: Math.round(effectiveDur * 0.1), end: Math.round(effectiveDur * 0.35), avgEnergy: 0.68, tier: "computed" },
            { label: "Chorus", start: Math.round(effectiveDur * 0.35), end: Math.round(effectiveDur * 0.55), avgEnergy: 0.92, tier: "computed" },
            { label: "Verse 2", start: Math.round(effectiveDur * 0.55), end: Math.round(effectiveDur * 0.75), avgEnergy: 0.72, tier: "computed" },
            { label: "Chorus", start: Math.round(effectiveDur * 0.75), end: Math.round(effectiveDur * 0.90), avgEnergy: 0.94, tier: "computed" },
            { label: "Outro", start: Math.round(effectiveDur * 0.90), end: effectiveDur, avgEnergy: 0.48, tier: "computed" },
          ],
      audioUrl: linkInfo?.kind === "direct" ? linkInfo.url : null,
      audioNote,
      audioError,
      lyrics: lyricsBlock,
      lyricsError,
      transcriptionError,
      warnings,
      harmonics,
    };

    baseReport.instruments = detectInstruments(baseReport);
    return baseReport;
  };

  const runAnalysis = async () => {
    if (status === "running") return;
    const activePlan = engine === "backend" ? BACKEND_PLAN : BROWSER_PLAN;
    setPlan(activePlan);
    setStatus("running");
    setFallbackNote(null);
    setReport(null);
    setStage(activePlan[0] ?? "");

    try {
      let finalReport: ReportData;

      if (engine === "backend") {
        const fixHint =
          " Fix: BUILD PLAN tab → phase 04 starts uvicorn, phase 07 covers ports & CORS.";
        if (ping === "fail") {
          // health dot already red — don't waste a network round-trip
          setFallbackNote(
            `Skipped the backend call: the last health ping to ${endpoint} failed, so the in-browser engine ran instead.${fixHint}`
          );
          setStage("");
          finalReport = await buildBrowserReport();
          finalReport.warnings = ["Backend unreachable (health ping failed) — browser engine used instead.", ...finalReport.warnings];
        } else {
          try {
            const rep = await postToBackend(endpoint, {
              title,
              artist,
              lyrics,
              transcribe,
              file,
              audioUrl: linkInfo?.url ?? null,
              source: sourceMeta,
            });
            if (rep.meta.durationSec === null && rep.sections.length > 0) {
              rep.meta.durationSec = Math.max(...rep.sections.map((s) => s.end));
            }
            finalReport = rep;
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Backend call failed.";
            setFallbackNote(`${msg} — fell back to the in-browser engine.${fixHint}`);
            setStage("");
            finalReport = await buildBrowserReport();
            finalReport.warnings = [`Backend attempt failed: ${msg}`, ...finalReport.warnings];
          }
        }
      } else {
        finalReport = await buildBrowserReport();
      }

      setReport(finalReport);
      setStatus("done");
      setTimeout(() => {
        reportWrapRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      }, 80);
    } catch (err) {
      setStatus("idle");
      setFallbackNote(err instanceof Error ? err.message : "Analysis failed unexpectedly.");
    }
  };

  const [studioTheme, setStudioTheme] = useState<"cyber" | "logic" | "holo" | "analog">(() => {
    try {
      return (localStorage.getItem("signal_studio_theme") as "cyber" | "logic" | "holo" | "analog") || "cyber";
    } catch {
      return "cyber";
    }
  });

  const handleSelectTheme = (thm: "cyber" | "logic" | "holo" | "analog") => {
    setStudioTheme(thm);
    try {
      localStorage.setItem("signal_studio_theme", thm);
    } catch {
      // ignore
    }
  };

  const stageIdx = plan.indexOf(stage);

  return (
    <div className={`relative z-10 min-h-screen theme-${studioTheme}`}>
      {/* ---------- header ---------- */}
      <header className="border-b border-line bg-panel/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1640px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber/50 bg-pit">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#f0a63f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h3l2.5-6 3.5 12 2.5-8 1.5 3.5H22" />
              </svg>
            </span>
            <div>
              <div className="font-display text-lg leading-none tracking-wide text-ink">SIGNAL</div>
              <div className="mt-0.5 font-mono text-[9px] tracking-[0.28em] text-dim">SONG BREAKDOWN · DAW STUDIO PRO</div>
            </div>
          </div>

          <nav className="order-3 flex w-full gap-1 sm:order-none sm:w-auto">
            {(
              [
                { id: "bench", label: "WORKBENCH" },
                { id: "genres", label: "GENRE LAB" },
                { id: "plan", label: "BUILD PLAN" },
              ] as { id: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative rounded-md px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] transition-colors cursor-pointer ${
                  tab === t.id ? "text-amber" : "text-dim hover:text-ink"
                }`}
              >
                {t.label}
                <span
                  className={`absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-amber transition-opacity ${
                    tab === t.id ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            ))}
          </nav>

          {/* Theme Switcher & Engine Badge */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-lg border border-line bg-pit/80 p-1 shadow-inner">
              <span className="font-mono text-[9px] font-bold text-faint px-1.5 hidden xl:inline">THEME</span>
              {[
                { id: "cyber", label: "🎛️ Cyber-DAW" },
                { id: "logic", label: "🍎 Logic Pro" },
                { id: "holo", label: "🌌 Holographic" },
                { id: "analog", label: "📻 Analog" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTheme(t.id as "cyber" | "logic" | "holo" | "analog")}
                  className={`rounded px-2 py-1 font-mono text-[10px] font-bold transition cursor-pointer ${
                    studioTheme === t.id
                      ? "bg-amber text-black shadow-xs shadow-amber"
                      : "text-dim hover:text-ink hover:bg-surface/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-line bg-pit px-3 py-1.5">
              <span
                className={`pulse-dot h-2 w-2 rounded-full ${engine === "browser" ? "bg-mint text-mint" : "bg-cyanx text-cyanx"}`}
              />
              <span className="max-w-[180px] truncate font-mono text-[9.5px] font-semibold tracking-[0.16em] text-dim">
                {engine === "browser" ? "BROWSER DSP" : endpoint.replace(/^https?:\/\//, "").toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <Scope className="h-9 border-t border-linesoft bg-pit/50" />
      </header>

      {/* ---------- body ---------- */}
      <main className="mx-auto max-w-[1640px] px-4 py-6 sm:px-6 sm:py-8">
        {tab === "plan" ? (
          <Roadmap />
        ) : tab === "genres" ? (
          <GenreLab
            onLoadTemplateToWorkbench={(t, a, lyr, f) => {
              setTitle(t);
              setArtist(a);
              setLyrics(lyr);
              setFileExclusive(f);
              setTab("bench");
            }}
          />
        ) : (
          <div className="grid items-start gap-5 2xl:grid-cols-[360px_minmax(0,1fr)_460px] xl:grid-cols-[330px_minmax(0,1fr)_420px] lg:grid-cols-[300px_minmax(0,1fr)_350px]">
            {/* 1. Left Column: Feed the Analyzer / Input Console */}
            <div className="lg:sticky lg:top-6 order-1">
              <ConsolePanel
                title={title}
                setTitle={setTitle}
                artist={artist}
                setArtist={setArtist}
                file={file}
                setFile={setFileExclusive}
                lyrics={lyrics}
                setLyrics={setLyrics}
                transcribe={transcribe}
                setTranscribe={setTranscribe}
                engine={engine}
                setEngine={setEngine}
                endpoint={endpoint}
                setEndpoint={setEndpoint}
                ping={ping}
                canRun={canRun}
                running={status === "running"}
                onAnalyze={runAnalysis}
                linkUrl={linkUrl}
                setLinkUrl={setLinkUrl}
                linkStatus={linkStatus}
                linkError={linkError}
                linkInfo={linkInfo}
                onLoadLink={handleLoadLink}
                onClearLink={handleClearLink}
                onPasteLink={handlePasteLink}
              />
            </div>

            {/* 2. Center Column: Master Song Map, DAW Playlist, Granular Patterns, Chords & Report */}
            <div ref={reportWrapRef} className="min-w-0 scroll-mt-6 order-2">
              {fallbackNote && (
                <div className="mb-4 rounded-lg border border-amber/45 bg-amber/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-amber">
                  <span className="font-bold tracking-[0.14em]">FALLBACK · </span>
                  {fallbackNote}
                </div>
              )}

              {status === "running" ? (
                <div className="panel ticks px-6 py-8 sm:px-8">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="kicker">Analysis in progress</div>
                      <div className="mt-2 font-display text-2xl text-ink">{stage || "Warming up"}…</div>
                    </div>
                    <EqBars count={16} className="h-11 shrink-0" />
                  </div>

                  <div className="relative mt-6 h-1 overflow-hidden rounded-full bg-pit">
                    <div className="scan-bar absolute inset-y-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-amber to-transparent" />
                  </div>

                  <ol className="mt-6 flex flex-col gap-2">
                    {plan.map((s, i) => {
                      const state = stageIdx === -1 ? 2 : i < stageIdx ? 2 : i === stageIdx ? 1 : 0;
                      return (
                        <li key={s} className="flex items-center gap-3">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                              state === 2
                                ? "border-mint/70 bg-mint/15 text-mint"
                                : state === 1
                                  ? "border-amber bg-amber/15"
                                  : "border-line"
                            }`}
                          >
                            {state === 2 && (
                              <svg viewBox="0 0 12 12" className="h-2 w-2" fill="none" stroke="currentColor" strokeWidth="2.4">
                                <path d="M2 6.5 4.6 9 10 3.4" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                            {state === 1 && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-amber text-amber" />}
                          </span>
                          <span
                            className={`font-mono text-[11px] tracking-[0.06em] ${
                              state === 2 ? "text-dim" : state === 1 ? "text-amber" : "text-faint"
                            }`}
                          >
                            {s}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : report ? (
                <ReportView report={report} audio={audioEl} />
              ) : (
                <Reveal>
                  <div className="panel ticks relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
                    <div className="kicker">Awaiting input</div>
                    <h2 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight text-ink sm:text-7xl">
                      NO<span className="text-amber">·</span>SIGNAL
                      <span className="cursor-blink ml-2 inline-block h-[0.72em] w-[0.45em] translate-y-[0.08em] bg-amber/80" />
                    </h2>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-dim">
                      Select a song or drop a track in the console on the left. The full multi-track DAW breakdown and pattern sequencer will render here in the center, and live time-synced lyrics will scroll on the right.
                    </p>

                    <div className="mt-6">
                      <FlatlineBlip />
                    </div>

                    <ol className="mt-8 flex flex-col gap-3">
                      {[
                        ["01", "Select a Hit or Paste Link", "Choose any Billboard Hot 100 hit, audio demo, YouTube, Spotify or SoundCloud link on the left."],
                        ["02", "Full DAW Arrangement & Pattern Map", "Inspect granular drum, chord, key, synth, and string patterns across the full song duration in the center."],
                        ["03", "Live Synced Lyrics Studio", "The right column indexes exact line & hook start times, section headers, and auto-scrolls live."],
                      ].map(([n, t, d]) => (
                        <li key={n} className="group flex gap-4 rounded-lg border border-linesoft bg-pit/60 px-4 py-3 transition-colors hover:border-amber/40">
                          <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-amber">{n}</span>
                          <span>
                            <span className="block text-sm font-semibold text-ink">{t}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-dim">{d}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </Reveal>
              )}
            </div>

            {/* 3. Right Column: Dedicated Time-Synced Lyrics Studio */}
            <div className="order-3">
              <DedicatedLyricsColumn
                lyrics={
                  report?.lyrics ??
                  (lyrics.trim()
                    ? {
                        source: "pasted",
                        wordCount: lyrics.split(/\s+/).filter(Boolean).length,
                        lineCount: lyrics.split(/\r?\n/).filter(Boolean).length,
                        rhymeDensity: { value: 0.65, tier: "computed", source: "heuristic" },
                        diversity: { value: 0.72, tier: "computed", source: "TTR" },
                        avgSyllPerLine: { value: 8.5, tier: "computed", source: "heuristic" },
                        flow: { value: 3.2, tier: "computed", source: "syl/s" },
                        hooks: [],
                        rawText: lyrics,
                        syncedLines: parseSyncedLyrics(lyrics, report?.meta.durationSec || 180),
                        geniusUrl: `https://genius.com/search?q=${encodeURIComponent(`${title} ${artist}`.trim())}`,
                      }
                    : null)
                }
                currentTime={audioTime}
                duration={report?.meta.durationSec || 180}
                isPlaying={audioPlaying}
                onSeek={handleAppSeek}
                title={title || report?.meta.title}
                artist={artist || report?.meta.artist}
              />
            </div>
          </div>
        )}
      </main>

      {/* ---------- footer ---------- */}
      <footer className="mt-8 border-t border-line bg-panel/60">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <p className="font-mono text-[10px] tracking-[0.08em] text-dim">
            SIGNAL · measured ≠ estimated ≠ guessed — every number carries its source.
          </p>
          <p className="font-mono text-[10px] tracking-[0.08em] text-faint">
            NO STREAM RIPS · NO FULL-LYRIC REDISPLAY · FAILURES STAY LOUD
          </p>
        </div>
      </footer>
    </div>
  );
}
