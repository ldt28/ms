/**
 * Signal — Python backend client.
 * POSTs the same payload the FastAPI MVP expects, and defensively maps the
 * report JSON (keys are trimmed — the early report.py had trailing spaces).
 */

import type { Finding, ReportData, Section, Tier } from "./types";

function trimKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(trimKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k.trim()] = trimKeys(val);
    }
    return out;
  }
  return v;
}

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length ? v : null);

function confTier(confidence: unknown): Tier {
  const c = str(confidence)?.toLowerCase() ?? "";
  if (c.includes("high") || c.includes("measured")) return "measured";
  if (c.includes("medium") || c.includes("computed")) return "computed";
  if (c.includes("low") || c.includes("guess")) return "guessed";
  return "estimated";
}

export interface BackendPayload {
  title: string;
  artist: string;
  lyrics: string;
  transcribe: boolean;
  file: File | null;
}

export async function postToBackend(endpoint: string, payload: BackendPayload): Promise<ReportData> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 150000);

  let res: Response;
  try {
    const fd = new FormData();
    fd.append("title", payload.title);
    fd.append("artist", payload.artist);
    fd.append("lyrics", payload.lyrics);
    fd.append("transcribe", payload.transcribe ? "true" : "false");
    if (payload.file) fd.append("audio", payload.file);
    res = await fetch(`${endpoint.replace(/\/$/, "")}/api/analyze`, {
      method: "POST",
      body: fd,
      signal: ctrl.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new Error(
      err instanceof DOMException && err.name === "AbortError"
        ? "Backend timed out after 150 s."
        : `Backend unreachable at ${endpoint} — is uvicorn running?`
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`Backend responded ${res.status} ${res.statusText}`);

  const j = trimKeys(await res.json()) as Record<string, any>;

  const tempo = num(j.tempo?.value) ?? num(j.tempo) ?? num(j.bpm) ?? num(j.audio?.bpm);
  const key = str(j.key?.value) ?? str(j.key) ?? str(j.key_mode) ?? str(j.audio?.key);
  const duration = num(j.duration) ?? num(j.duration_seconds) ?? num(j.audio?.duration);

  if (tempo === null && key === null && duration === null) {
    throw new Error("Backend returned an unexpected report shape — no tempo, key or duration found.");
  }

  const sectionsRaw: any[] = Array.isArray(j.sections) ? j.sections : Array.isArray(j.structure) ? j.structure : [];
  const sections: Section[] = sectionsRaw
    .map((s) => ({
      start: num(s.start) ?? num(s.start_time) ?? 0,
      end: num(s.end) ?? num(s.end_time) ?? (num(s.start) ?? 0) + 10,
      label: str(s.label) ?? str(s.name) ?? "Section",
      tier: confTier(s.confidence),
      avgEnergy: num(s.energy) ?? num(s.avg_energy) ?? 0.5,
    }))
    .sort((a, b) => a.start - b.start);

  const curveRaw = Array.isArray(j.energy_curve) ? j.energy_curve : Array.isArray(j.energy?.curve) ? j.energy.curve : [];
  const curve = curveRaw.map((v: unknown) => Math.min(1, Math.max(0, num(v) ?? 0)));

  const L = j.lyrics ?? null;
  const mkC = (v: number | null, source: string): Finding<number> => ({
    value: v,
    tier: "computed",
    source: `${source} (backend)`,
  });

  const warnings: string[] = [];
  if (Array.isArray(j.warnings)) for (const w of j.warnings) { const s = str(w); if (s) warnings.push(s); }

  return {
    meta: {
      title: payload.title || str(j.title) || "Untitled track",
      artist: payload.artist || str(j.artist) || "Unknown artist",
      fileName: payload.file?.name ?? str(j.file_name) ?? "—",
      durationSec: duration,
      sampleRate: num(j.sample_rate) ?? null,
      channels: num(j.channels) ?? null,
      engine: "backend",
      analyzedAt: Date.now(),
    },
    tempo: {
      value: tempo !== null ? Math.round(tempo * 10) / 10 : null,
      tier: confTier(j.tempo?.confidence),
      source: str(j.tempo?.source) ?? "Python backend",
      score: num(j.tempo?.confidence_score) ?? undefined,
    },
    keySig: {
      value: key,
      tier: confTier(j.key?.confidence),
      source: str(j.key?.source) ?? "Python backend",
    },
    energy: curve.length
      ? {
          curve,
          avg: curve.reduce((a: number, b: number) => a + b, 0) / curve.length,
          peak: 1,
          dynamicRangeDb: num(j.energy?.dynamic_range_db) ?? 0,
        }
      : null,
    texture: j.texture
      ? {
          bassRatio: { value: num(j.texture.bass_ratio), tier: "estimated", source: "Python backend" },
          brightnessHz: { value: num(j.texture.brightness_hz ?? j.texture.spectral_centroid), tier: "estimated", source: "Python backend" },
          onsetRate: { value: num(j.texture.onset_rate ?? j.texture.density), tier: "estimated", source: "Python backend" },
        }
      : null,
    sections,
    lyrics: L
      ? {
          source: str(L.source) === "transcript" ? "transcript" : "pasted",
          wordCount: num(L.word_count) ?? 0,
          lineCount: num(L.line_count) ?? 0,
          rhymeDensity: mkC(num(L.rhyme_density), "rhyme analysis"),
          diversity: mkC(num(L.lexical_diversity ?? L.diversity), "lexical diversity"),
          avgSyllPerLine: mkC(num(L.avg_syllables_per_line), "syllable count"),
          flow: {
            value: num(L.syllables_per_second ?? L.flow),
            tier: "computed",
            source: "flow estimate (backend)",
          },
          hooks: Array.isArray(L.hooks)
            ? L.hooks
                .map((h: any) => ({ fragment: str(h.fragment) ?? str(h) ?? "", count: num(h.count) ?? 2 }))
                .filter((h: { fragment: string }) => h.fragment.length > 0)
                .slice(0, 6)
            : [],
        }
      : null,
    audioError: str(j.audio_error),
    lyricsError: str(j.lyrics_error),
    transcriptionError: str(j.transcription_error),
    warnings,
    audioUrl: null,
  };
}
