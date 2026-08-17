import { useEffect, useRef, useState } from "react";
import type { LyricsBlock, PingState, ReportData } from "./lib/types";
import { analyzeAudioFile, AnalysisError, type AudioAnalysisResult } from "./lib/audioEngine";
import { analyzeLyrics } from "./lib/lyricsEngine";
import { postToBackend } from "./lib/backend";
import { ConsolePanel, type EngineMode } from "./components/ConsolePanel";
import { ReportView } from "./components/ReportView";
import { Roadmap } from "./components/Roadmap";
import { EqBars, FlatlineBlip, Reveal, Scope, useReducedMotion } from "./components/ui";

const BROWSER_PLAN = [
  "Reading file",
  "Decoding audio",
  "Scanning levels & bands",
  "Estimating tempo (onset autocorrelation)",
  "Building chromagram",
  "Detecting section boundaries",
  "Scoring lyrics",
  "Assembling report",
];
const BACKEND_PLAN = ["Contacting backend", "Awaiting report", "Rendering"];

type Status = "idle" | "running" | "done";
type Tab = "bench" | "plan";

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

  // run state
  const [status, setStatus] = useState<Status>("idle");
  const [plan, setPlan] = useState<string[]>(BROWSER_PLAN);
  const [stage, setStage] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);
  const [fallbackNote, setFallbackNote] = useState<string | null>(null);

  // playback element for the uploaded file
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const reportWrapRef = useRef<HTMLDivElement>(null);

  // live backend reachability check (answers "why is it not working?" up front)
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

  const canRun = !!file || lyrics.trim().length > 0;

  useEffect(() => {
    try {
      localStorage.setItem("signal.engine", engine);
      localStorage.setItem("signal.endpoint", endpoint);
    } catch { /* ignore */ }
  }, [engine, endpoint]);

  useEffect(() => {
    if (!file) {
      setAudioEl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const el = new Audio(url);
    el.preload = "auto";
    setAudioEl(el);
    return () => {
      el.pause();
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const buildBrowserReport = async (): Promise<ReportData> => {
    setPlan(BROWSER_PLAN);
    const hasAudio = !!file;
    const hasLyrics = lyrics.trim().length > 0;

    let audio: AudioAnalysisResult | null = null;
    let audioError: string | null = null;
    if (hasAudio && file) {
      try {
        audio = await analyzeAudioFile(file, setStage);
      } catch (err) {
        audioError =
          err instanceof AnalysisError
            ? err.message
            : "Unexpected audio failure — the file may be corrupted.";
      }
    } else {
      audioError = "No audio file supplied — the audio section of this report is unavailable. Add a file and re-run.";
    }

    setStage("Scoring lyrics");
    await new Promise((r) => setTimeout(r, 60));

    let lyricsBlock: LyricsBlock | null = null;
    let lyricsError: string | null = null;
    let transcriptionError: string | null = null;
    if (hasLyrics) {
      try {
        lyricsBlock = analyzeLyrics(lyrics, { durationSec: audio?.durationSec ?? null, source: "pasted" });
      } catch (err) {
        lyricsError = err instanceof Error ? err.message : "Lyrics analysis failed.";
      }
    } else if (transcribe) {
      transcriptionError =
        "In-browser vocal transcription is unavailable. Paste lyrics instead — or run the Python backend with faster-whisper installed (pip install faster-whisper) and switch to BACKEND mode.";
    } else {
      lyricsError = "No lyrics supplied and transcription not requested — lyric metrics unavailable.";
    }

    setStage("Assembling report");
    await new Promise((r) => setTimeout(r, 60));

    return {
      meta: {
        title: title.trim() || "Untitled track",
        artist: artist.trim() || "Unknown artist",
        fileName: file?.name ?? "—",
        durationSec: audio?.durationSec ?? null,
        sampleRate: audio?.sampleRate ?? null,
        channels: audio?.channels ?? null,
        engine: "browser",
        analyzedAt: Date.now(),
      },
      tempo: audio?.tempo ?? { value: null, tier: "measured", source: "unavailable — no audio", note: audioError ?? undefined },
      keySig: audio?.keySig ?? { value: null, tier: "estimated", source: "unavailable — no audio" },
      energy: audio?.energy ?? null,
      texture: audio?.texture ?? null,
      sections: audio?.sections ?? [],
      lyrics: lyricsBlock,
      audioError,
      lyricsError,
      transcriptionError,
      warnings: audio?.notes ?? [],
      audioUrl: null,
    };
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
        try {
          const rep = await postToBackend(endpoint, { title, artist, lyrics, transcribe, file });
          // prefer real local duration for the timeline if the backend omitted it
          if (rep.meta.durationSec === null && rep.sections.length > 0) {
            rep.meta.durationSec = Math.max(...rep.sections.map((s) => s.end));
          }
          finalReport = rep;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Backend call failed.";
          setFallbackNote(`${msg} — fell back to the in-browser engine.`);
          setStage("");
          finalReport = await buildBrowserReport();
          finalReport.warnings = [`Backend attempt failed: ${msg}`, ...finalReport.warnings];
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

  const stageIdx = plan.indexOf(stage);

  return (
    <div className="relative z-10 min-h-screen">
      {/* ---------- header ---------- */}
      <header className="border-b border-line bg-panel/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber/50 bg-pit">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#f0a63f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12h3l2.5-6 3.5 12 2.5-8 1.5 3.5H22" />
              </svg>
            </span>
            <div>
              <div className="font-display text-lg leading-none tracking-wide text-ink">SIGNAL</div>
              <div className="mt-0.5 font-mono text-[9px] tracking-[0.28em] text-dim">SONG BREAKDOWN · MVP 0.1</div>
            </div>
          </div>

          <nav className="order-3 flex w-full gap-1 sm:order-none sm:ml-6 sm:w-auto">
            {(
              [
                { id: "bench", label: "WORKBENCH" },
                { id: "plan", label: "BUILD PLAN" },
              ] as { id: Tab; label: string }[]
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative rounded-md px-3.5 py-2 font-mono text-[11px] font-semibold tracking-[0.16em] transition-colors ${
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

          <div className="ml-auto flex items-center gap-2 rounded-full border border-line bg-pit px-3 py-1.5">
            <span
              className={`pulse-dot h-2 w-2 rounded-full ${engine === "browser" ? "bg-mint text-mint" : "bg-cyanx text-cyanx"}`}
            />
            <span className="max-w-[220px] truncate font-mono text-[9.5px] font-semibold tracking-[0.16em] text-dim">
              {engine === "browser" ? "ENGINE · BROWSER DSP" : `ENGINE · ${endpoint.replace(/^https?:\/\//, "").toUpperCase()}`}
            </span>
          </div>
        </div>
        <Scope className="h-9 border-t border-linesoft bg-pit/50" />
      </header>

      {/* ---------- body ---------- */}
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8">
        {tab === "plan" ? (
          <Roadmap />
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[400px_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-6">
              <ConsolePanel
                title={title}
                setTitle={setTitle}
                artist={artist}
                setArtist={setArtist}
                file={file}
                setFile={setFile}
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
              />
            </div>

            <div ref={reportWrapRef} className="min-w-0 scroll-mt-6">
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
                      Drop a track in the console and Signal will break it down — tempo, key, structure, energy and
                      lyric metrics — with every number labeled by how it was produced. Measured facts on the left,
                      guesses clearly on the right.
                    </p>

                    <div className="mt-6">
                      <FlatlineBlip />
                    </div>

                    <ol className="mt-8 flex max-w-xl flex-col gap-3">
                      {[
                        ["01", "Add an audio file", "WAV / MP3 / FLAC — decoded locally, never uploaded in browser mode."],
                        ["02", "Paste lyrics (or don’t)", "Text powers rhyme, flow and hook metrics. Fragments only, never full lyrics."],
                        ["03", "Run analysis", "Browser DSP works instantly; switch to the Python backend for transcription."],
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
            NO URL RIPS · NO FULL-LYRIC REDISPLAY · FAILURES STAY LOUD
          </p>
        </div>
      </footer>
    </div>
  );
}
