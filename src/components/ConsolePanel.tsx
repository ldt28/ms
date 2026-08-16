import { useRef, useState } from "react";
import { formatBytes } from "../lib/types";

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
  running: boolean;
  onAnalyze: () => void;
}) {
  const {
    title, setTitle, artist, setArtist, file, setFile, lyrics, setLyrics,
    transcribe, setTranscribe, engine, setEngine, endpoint, setEndpoint, running, onAnalyze,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("audio/") && !/\.(wav|mp3|flac|m4a|ogg|aac|aiff|webm)$/i.test(f.name)) {
      setFile(f); // still allow attempt — decode error will be explicit
      return;
    }
    setFile(f);
  };

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
          ) : (
            <div>
              <div className="font-mono text-xs text-ink">Drop audio here or click to browse</div>
              <div className="mt-1 font-mono text-[10px] text-faint">WAV · MP3 · FLAC · M4A · OGG — up to 80 MB</div>
            </div>
          )}
        </div>
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
          <p className="mt-2 rounded-md border border-amber/35 bg-amber/8 px-3 py-2 font-mono text-[10px] leading-relaxed text-amber">
            Vocal transcription needs the Python backend with faster-whisper. In browser mode this returns an explicit
            transcription_error — that is the honest path.
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
              className={`seg-btn px-3 py-2 font-mono text-[10.5px] font-semibold tracking-[0.14em] ${
                engine === m ? "bg-amber text-[#221503]" : "bg-pit text-dim hover:text-ink"
              }`}
            >
              {m === "browser" ? "BROWSER DSP" : "PYTHON BACKEND"}
            </button>
          ))}
        </div>
        {engine === "browser" ? (
          <p className="mt-2 font-mono text-[9.5px] leading-relaxed text-faint">
            Real DSP in this tab: decode → onset envelope → tempo autocorrelation → chroma key → sections. Nothing leaves your machine.
          </p>
        ) : (
          <input
            className="input mt-2"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="http://localhost:8000"
            spellCheck={false}
          />
        )}
      </div>

      <button onClick={onAnalyze} disabled={running} className="btn-analyze w-full px-4 py-3.5 text-sm">
        {running ? "ANALYZING…" : "RUN ANALYSIS"}
      </button>
      <p className="-mt-2 text-center font-mono text-[9.5px] text-faint">
        audio + lyrics → full report · audio only → audio facts · lyrics only → text metrics
      </p>
    </div>
  );
}
