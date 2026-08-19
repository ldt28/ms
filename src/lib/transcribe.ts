/**
 * Signal — in-browser vocal transcription.
 * Runs Whisper-tiny (multilingual) entirely in this tab via transformers.js —
 * nothing is uploaded anywhere. The model (~45 MB quantized) downloads once
 * and is then cached in the browser. Long audio is transcribed in 30 s chunks
 * so the UI can show real progress.
 */

export class TranscribeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranscribeError";
  }
}

export interface TranscribeProgress {
  phase: "model" | "transcribe";
  pct: number;
}

const TARGET_SR = 16000;
const CHUNK_SEC = 30;

async function toMono16k(buffer: AudioBuffer): Promise<Float32Array> {
  const frames = Math.max(1, Math.ceil(buffer.duration * TARGET_SR));
  const off = new OfflineAudioContext(1, frames, TARGET_SR);
  const src = off.createBufferSource();
  src.buffer = buffer;
  src.connect(off.destination);
  src.start(0);
  const rendered = await off.startRendering();
  return rendered.getChannelData(0);
}

export async function transcribeAudioBuffer(
  buffer: AudioBuffer,
  onProgress: (p: TranscribeProgress) => void
): Promise<string> {
  if (buffer.duration > 20 * 60) {
    throw new TranscribeError("Track is over 20 minutes — export a shorter excerpt and retry.");
  }

  const mono = await toMono16k(buffer);

  // Dynamic import: the ML stack (~1.5 MB) is only fetched when actually needed.
  const { pipeline, env } = await import("@xenova/transformers");
  env.allowLocalModels = false;
  const backends = (env as unknown as { backends?: { onnx?: { wasm?: { numThreads?: number } } } }).backends;
  if (backends?.onnx?.wasm) backends.onnx.wasm.numThreads = 1; // no SharedArrayBuffer headers required

  let transcriber: (audio: Float32Array, opts?: Record<string, unknown>) => Promise<unknown>;
  try {
    transcriber = (await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", {
      quantized: true,
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p.status === "progress" && typeof p.progress === "number") {
          onProgress({ phase: "model", pct: Math.round(p.progress) });
        } else if (p.status === "done" || p.status === "ready") {
          onProgress({ phase: "model", pct: 100 });
        }
      },
    })) as typeof transcriber;
  } catch (err) {
    throw new TranscribeError(
      `Couldn't load the transcription model: ${err instanceof Error ? err.message : "unknown error"}. Check your connection — the model downloads once, then is cached.`
    );
  }

  const step = CHUNK_SEC * TARGET_SR;
  const lines: string[] = [];
  let pos = 0;

  while (pos < mono.length) {
    const end = Math.min(pos + step, mono.length);
    const slice = mono.subarray(pos, end);
    // skip a trailing fragment under 1 s
    if (slice.length < TARGET_SR && lines.length > 0) break;

    const out = (await transcriber(slice, { return_timestamps: true })) as {
      text?: string;
      chunks?: { text?: string }[];
    };

    const chunkLines = Array.isArray(out?.chunks)
      ? out.chunks.map((c) => String(c?.text ?? "").trim()).filter(Boolean)
      : [];
    if (chunkLines.length) lines.push(...chunkLines);
    else if (out?.text && out.text.trim()) lines.push(out.text.trim());

    pos = end;
    onProgress({ phase: "transcribe", pct: Math.min(100, Math.round((pos / mono.length) * 100)) });
    await new Promise((r) => setTimeout(r, 0)); // let the UI repaint between chunks
  }

  const text = lines.join("\n").replace(/[ \t]+/g, " ").trim();
  if (!text) {
    throw new TranscribeError("No vocals detected — the recording seems instrumental, or the singing was too soft for Whisper-tiny.");
  }
  return text;
}

/** Whisper emits flowing text; give the lyrics engine line breaks to work with. */
export function ensureLyricLines(text: string): string {
  if (text.split("\n").filter((l) => l.trim()).length >= 2) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += 8) lines.push(words.slice(i, i + 8).join(" "));
  return lines.join("\n");
}
