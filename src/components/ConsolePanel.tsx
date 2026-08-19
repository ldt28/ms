import { useMemo, useRef, useState } from "react";
import { formatBytes, type PingState } from "../lib/types";
import type { LinkInfo } from "../lib/linkResolver";

function TerminalExplainer() {
  const [open, setOpen] = useState(false);
  const os = useMemo(() => {
    const ua = navigator.userAgent;
    if (/Win/i.test(ua)) return "windows";
    if (/Mac/i.test(ua)) return "mac";
    return "linux";
  }, []);

  const steps =
    os === "windows"
      ? [
          "Press the Windows key (bottom-left of your keyboard).",
          "Type “PowerShell” and click it when it appears.",
          "Type each command from the box above, pressing Enter after every line.",
        ]
      : os === "mac"
        ? [
            "Press ⌘ Command + Space at the same time.",
            "Type “Terminal” and press Enter.",
            "Type each command from the box above, pressing Enter after every line.",
          ]
        : [
            "Press Ctrl + Alt + T to open a terminal.",
            "Type each command from the box above, pressing Enter after every line.",
          ];

  return (
    <span className="mt-2 block">
      <button
        onClick={() => setOpen(!open)}
        className="font-mono text-[10px] text-cyanx underline decoration-cyanx/50 underline-offset-2 transition hover:text-ink"
      >
        {open ? "Hide terminal help" : "What's a terminal? How do I open one?"}
      </button>
      {open && (
        <span className="mt-2 block rounded-md border border-cyanx/30 bg-pit px-3 py-2.5 text-left">
          <span className="block text-[11px] leading-relaxed text-dim">
            A terminal is just a plain text window on your computer where you type commands and press Enter. It is the
            only part of Signal that can't live inside this webpage.
          </span>
          <span className="mt-2 block font-mono text-[9.5px] font-bold tracking-[0.16em] text-cyanx">
            ON {os.toUpperCase()}:
          </span>
          <span className="mt-1 flex flex-col gap-1">
            {steps.map((s, i) => (
              <span key={i} className="flex gap-2 text-[11px] leading-snug text-dim">
                <span className="font-mono text-[10px] font-bold text-cyanx">{i + 1}.</span>
                {s}
              </span>
            ))}
          </span>
          <span className="mt-2 block font-mono text-[9.5px] leading-relaxed text-faint">
            Honestly though — you don't need any of this. BROWSER DSP mode is the whole app.
          </span>
        </span>
      )}
    </span>
  );
}

export const SAMPLE_LYRICS = `Neon rain on the boulevard screen,
I been chasing down a drum machine,
Every heartbeat hits like a magazine,
You're the sharpest static I have seen.

Turn it up until the speakers blow,
We don't stop when the lights go low,
Say my name on the radio,
Turn it up until the speakers blow.

Half-lit hallway, midnight choir,
Telephone wires hum like fire,
If the signal drops then we rewind,
Play it back until we lose our minds.`;

export type EngineMode = "browser" | "backend";

const START_CMDS = ["cd backend", "source venv/bin/activate", "uvicorn main:app --reload --port 8000"];

function StartCommands() {
  const [copied, setCopied] = useState(false);
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(START_CMDS.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };
  return (
    <span className="mt-2 block rounded-md border border-line bg-pit px-3 py-2.5">
      <span className="flex flex-col gap-1">
        {START_CMDS.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-faint">{i + 1}.</span>
            <code className="font-mono text-[10.5px] text-mint">{c}</code>
          </span>
        ))}
        <span className="font-mono text-[9px] leading-relaxed text-faint">
          Windows: venv\Scripts\activate — or just run backend/start.sh / start.bat once.
        </span>
      </span>
      <button
        onClick={copyAll}
        className="mt-2 rounded border border-line px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-dim transition hover:border-amber/60 hover:text-amber"
      >
        {copied ? "COPIED — PASTE IN TERMINAL" : "COPY ALL 3"}
      </button>
    </span>
  );
}
export type LinkStatus = "idle" | "loading" | "error";

const KIND_BADGE: Record<string, { label: string; cls: string }> = {
  direct: { label: "DIRECT AUDIO", cls: "border-mint/50 bg-mint/10 text-mint" },
  youtube: { label: "YOUTUBE", cls: "border-rosex/50 bg-rosex/10 text-rosex" },
  spotify: { label: "SPOTIFY", cls: "border-mint/50 bg-mint/10 text-mint" },
  soundcloud: { label: "SOUNDCLOUD", cls: "border-amber/50 bg-amber/10 text-amber" },
  unsupported: { label: "BLOCKED", cls: "border-slatex/50 bg-slatex/10 text-slatex" },
};

export function ConsolePanel(props: {
  title: string;
  setTitle: (v: string) => void;
  artist: string;
  setArtist: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  lyrics: string;
  setLyrics: (v: string) => void;
  transcribe: boolean;
  setTranscribe: (v: boolean) => void;
  engine: EngineMode;
  setEngine: (v: EngineMode) => void;
  endpoint: string;
  setEndpoint: (v: string) => void;
  ping: PingState;
  canRun: boolean;
  running: boolean;
  onAnalyze: () => void;
  linkUrl: string;
  setLinkUrl: (v: string) => void;
  linkStatus: LinkStatus;
  linkError: string | null;
  linkInfo: LinkInfo | null;
  onLoadLink: () => void;
  onClearLink: () => void;
  onPasteLink: () => void;
}) {
  const {
    title, setTitle, artist, setArtist, file, setFile, lyrics, setLyrics,
    transcribe, setTranscribe, engine, setEngine, endpoint, setEndpoint, ping, canRun, running, onAnalyze,
    linkUrl, setLinkUrl, linkStatus, linkError, linkInfo, onLoadLink, onClearLink, onPasteLink,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return;
    setFile(f);
  };

  const badge = linkInfo ? KIND_BADGE[linkInfo.kind] ?? KIND_BADGE.unsupported : null;

  return (
    <div className="panel ticks flex flex-col gap-5 px-5 py-5 sm:px-6">
      <div>
        <div className="kicker">Input console</div>
        <h2 className="font-display text-xl text-ink">Feed the analyzer</h2>
      </div>

      {/* metadata */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="kicker mb-1.5 block">Track title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled track" maxLength={80} />
        </label>
        <label className="block">
          <span className="kicker mb-1.5 block">Artist</span>
          <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Unknown artist" maxLength={80} />
        </label>
      </div>

      {/* ---------- source link ---------- */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="kicker">Source link (optional)</span>
          <button
            onClick={onPasteLink}
            disabled={linkStatus === "loading"}
            className="inline-flex items-center gap-1 font-mono text-[9.5px] tracking-[0.12em] text-cyanx transition hover:text-ink disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="8" y="2.5" width="8" height="4.5" rx="1" />
              <path d="M16 5h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" strokeLinejoin="round" />
            </svg>
            PASTE
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onLoadLink(); }}
            placeholder="https://… audio URL, YouTube, Spotify, SoundCloud"
            spellCheck={false}
          />
          <button
            onClick={onLoadLink}
            disabled={linkStatus === "loading" || !linkUrl.trim()}
            className="shrink-0 rounded-lg border border-amber/55 bg-amber/10 px-3 font-mono text-[10px] font-bold tracking-[0.14em] text-amber transition hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {linkStatus === "loading" ? "…" : "LOAD"}
          </button>
        </div>
        <p className="mt-1.5 font-mono text-[9.5px] leading-relaxed text-faint">
          Direct audio URLs are fetched & analyzed locally · YouTube / Spotify / SoundCloud play via official embeds — never ripped.
        </p>

        {linkStatus === "loading" && (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-line bg-pit px-3 py-2">
            <span className="pulse-dot h-2 w-2 rounded-full bg-amber text-amber" />
            <span className="font-mono text-[10px] tracking-[0.08em] text-dim">Resolving link…</span>
          </div>
        )}

        {linkStatus === "error" && linkError && (
          <div className="mt-2 rounded-md border border-rosex/45 bg-rosex/8 px-3 py-2 font-mono text-[10px] leading-relaxed text-rosex">
            {linkError}
          </div>
        )}

        {linkInfo && badge && (
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-pit/80 px-3 py-2.5">
            {linkInfo.thumbnail ? (
              <img
                src={linkInfo.thumbnail}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md border border-line object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-panel">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M10 13.5a4 4 0 0 0 6 .5l3-3a4 4 0 0 0-5.7-5.6L11.6 7" strokeLinecap="round" />
                  <path d="M14 10.5a4 4 0 0 0-6-.5l-3 3a4 4 0 0 0 5.7 5.6l1.7-1.6" strokeLinecap="round" />
                </svg>
              </span>
            )}
            <div className="min-w-0 flex-1">
              <span className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.14em] ${badge.cls}`}>
                {badge.label}
              </span>
              <div className="mt-1 truncate font-mono text-[11px] font-semibold text-ink">
                {linkInfo.title ?? linkInfo.host}
              </div>
              <div className="truncate font-mono text-[9.5px] text-dim">
                {linkInfo.artist ? `${linkInfo.artist} · ` : ""}
                {linkInfo.host}
                {linkInfo.bytes ? ` · ${formatBytes(linkInfo.bytes)}` : ""}
                {linkInfo.kind === "unsupported" ? " · not readable" : ""}
              </div>
            </div>
            <button
              onClick={onClearLink}
              className="shrink-0 rounded-md border border-line px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-dim transition hover:border-rosex/60 hover:text-rosex"
            >
              REMOVE
            </button>
          </div>
        )}
      </div>

      {/* audio dropzone */}
      <div>
        <span className="kicker mb-1.5 block">Audio file</span>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            acceptFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          className={`cursor-pointer rounded-lg border border-dashed px-4 py-5 text-center transition-colors duration-150 ${
            dragOver ? "border-amber bg-amber/10" : file ? "border-mint/60 bg-mint/5" : "border-line bg-pit hover:border-amber/60"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.flac,.m4a,.ogg,.aac,.aiff"
            className="hidden"
            onChange={(e) => acceptFile(e.target.files?.[0])}
          />
          {file ? (
            <div className="flex items-center justify-between gap-3 text-left">
              <div className="flex min-w-0 items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0 text-mint" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 18V6l10-2v11" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6.5" cy="18" r="2.5" />
                  <circle cx="16.5" cy="15" r="2.5" />
                </svg>
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs font-semibold text-ink">{file.name}</div>
                  <div className="font-mono text-[10px] text-dim">{formatBytes(file.size)}</div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                className="shrink-0 rounded-md border border-line px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-dim transition hover:border-rosex/60 hover:text-rosex"
              >
                REMOVE
              </button>
            </div>
          ) : linkInfo && linkInfo.kind !== "direct" && linkInfo.analysisReady === false ? (
            <div>
              <div className="font-mono text-xs font-semibold text-mint">Drop this track’s audio file here</div>
              <div className="mt-1 font-mono text-[10px] leading-relaxed text-dim">
                Unlocks tempo, key, energy & sections for{" "}
                <span className="text-ink">{linkInfo.title ?? "this link"}</span> — the report stays bound to the video.
              </div>
            </div>
          ) : (
            <div>
              <div className="font-mono text-xs text-ink">Drop audio here or click to browse</div>
              <div className="mt-1 font-mono text-[10px] text-faint">WAV · MP3 · FLAC · M4A · OGG — up to 80 MB</div>
            </div>
          )}
        </div>
        {linkInfo?.kind === "direct" && (
          <p className="mt-1.5 font-mono text-[9.5px] text-cyanx/80">
            Direct audio link active — uploading a file will replace it.
          </p>
        )}
        {linkInfo && linkInfo.kind !== "direct" && linkInfo.analysisReady === false && (
          <p className="mt-1.5 font-mono text-[9.5px] text-mint/80">
            Video link bound — add its audio file above for the full breakdown, or paste lyrics / transcript for text metrics.
          </p>
        )}
      </div>

      {/* lyrics */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="kicker">Lyrics (optional)</span>
          <div className="flex gap-2">
            <button
              onClick={() => setLyrics(SAMPLE_LYRICS)}
              className="font-mono text-[9.5px] tracking-[0.12em] text-cyanx transition hover:text-ink"
            >
              + SAMPLE
            </button>
            <button
              onClick={() => setLyrics("")}
              className="font-mono text-[9.5px] tracking-[0.12em] text-faint transition hover:text-rosex"
            >
              CLEAR
            </button>
          </div>
        </div>
        <textarea
          className="input min-h-[140px] resize-y leading-relaxed"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder={"Paste lyrics here…\nUsed only for metrics — never redisplayed in full."}
          spellCheck={false}
        />
        <div className="mt-1 flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={transcribe}
              onChange={(e) => setTranscribe(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#f0a63f]"
            />
            <span className="font-mono text-[10px] text-dim">No lyrics — transcribe vocals instead</span>
          </label>
          <span className="font-mono text-[9.5px] text-faint">{lyrics.length} chars</span>
        </div>
        {transcribe && engine === "browser" && (
          <p className="mt-2 rounded-md border border-mint/35 bg-mint/8 px-3 py-2 font-mono text-[10px] leading-relaxed text-mint">
            Whisper-tiny runs right in this tab — nothing is uploaded. First use downloads a ~45 MB model (cached
            after that); a 3-minute song transcribes in roughly 1–3 minutes. Works on uploads and direct audio links.
            Expect misheard words — the transcript lands in the box above so you can fix it before re-running.
          </p>
        )}
      </div>

      {/* engine */}
      <div>
        <span className="kicker mb-1.5 block">Analysis engine</span>
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-line">
          {(["browser", "backend"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setEngine(m)}
              className={`seg-btn relative px-3 py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] ${
                engine === m ? "bg-amber text-[#221503]" : "bg-pit text-dim hover:text-ink"
              }`}
            >
              {m === "browser" ? "BROWSER DSP" : "PYTHON BACKEND"}
              {m === "browser" && (
                <span className="absolute -top-0 right-2 top-0 rounded-b-sm bg-mint px-1 py-px font-mono text-[7.5px] font-bold tracking-[0.08em] text-[#06231a]">
                  RECOMMENDED
                </span>
              )}
            </button>
          ))}
        </div>
        {engine === "browser" ? (
          <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-faint">
            No setup, no terminal — this IS the whole app. Real DSP in this tab: decode → tempo autocorrelation →
            chroma key → sections. Nothing leaves your machine.
          </p>
        ) : (
          <>
            <input
              className="input mt-2"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="http://localhost:8000"
              spellCheck={false}
            />
            <div
              className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 font-mono text-[10px] leading-relaxed ${
                ping === "ok"
                  ? "border-mint/40 bg-mint/8 text-mint"
                  : ping === "fail"
                    ? "border-rosex/40 bg-rosex/8 text-rosex"
                    : "border-line bg-pit text-dim"
              }`}
            >
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  ping === "ok" ? "bg-mint text-mint pulse-dot" : ping === "fail" ? "bg-rosex text-rosex" : "bg-amber text-amber pulse-dot"
                }`}
              />
              <span>
                {ping === "checking" && "Checking connection to /api/health…"}
                {ping === "ok" && "Backend reachable — reports will come from your Python server."}
                {ping === "fail" && (
                  <span className="block">
                    Not reachable — nothing is listening there. <strong className="text-ink">That's okay:</strong>{" "}
                    BROWSER DSP mode does everything without a server.
                    <span className="mt-2 block">
                      <button
                        onClick={() => setEngine("browser")}
                        className="rounded-md border border-mint/50 bg-mint/12 px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.12em] text-mint transition hover:bg-mint/20"
                      >
                        USE BROWSER ENGINE INSTEAD →
                      </button>
                    </span>
                    <TerminalExplainer />
                    <span className="mt-2 block text-[10px] leading-relaxed text-dim/80">
                      Only if you want the optional extras (vocal transcription, server-side DSP): start uvicorn from
                      the project's <code className="text-ink">backend/</code> folder —
                      <StartCommands />
                      Still red? Check the port and BUILD PLAN → phase 07 (CORS, busy ports).
                    </span>
                  </span>
                )}
              </span>
            </div>
          </>
        )}
      </div>

      <button onClick={onAnalyze} disabled={running || !canRun} className="btn-analyze w-full px-4 py-3.5 text-sm">
        {running ? "ANALYZING…" : "RUN ANALYSIS"}
      </button>
      <p className="-mt-2 text-center font-mono text-[9.5px] text-faint">
        {!canRun
          ? "⚠ add a file, a link, or lyrics first — then run analysis"
          : "file / link + lyrics → full report · stream links → embed + text metrics"}
      </p>
    </div>
  );
}
