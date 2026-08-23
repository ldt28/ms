/**
 * Live Lyrics Fetcher using LRCLIB open-source lyrics database API.
 * Free, zero-API-key required, CORS-friendly open database of synced and plain lyrics.
 * Full multilingual support for English, Spanish, Portuguese, French, and international tracks.
 */

import type { SyncedLyricLine } from "./types";

export interface LyricsSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  plainLyrics?: string;
  syncedLyrics?: string;
}

export interface FetchLyricsResponse {
  success: boolean;
  lyrics: string | null;
  syncedLyricsRaw?: string;
  syncedLines?: SyncedLyricLine[];
  geniusUrl?: string;
  trackName?: string;
  artistName?: string;
  source: "lrclib" | "fallback";
  error?: string;
}

/**
 * Remove accent marks and diacritics for fallback search (e.g. "Tití Me Preguntó" -> "Titi Me Pregunto").
 */
export function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Clean track title by stripping common YouTube suffixes like (Official Video), [Audio], etc.
 */
export function cleanSongTitle(raw: string): string {
  return raw
    .replace(/\s*[([{\\/].*?(official|video|audio|lyrics|music video|hd|4k|remastered|visualizer|ft\.|feat\.|en vivo|letra).*?[)\]}\\/]/gi, "")
    .replace(/\s*-\s*(official|audio|video|lyrics|letra).*/gi, "")
    .trim();
}

/**
 * Clean artist name by stripping " - Topic", "VEVO", etc.
 */
export function cleanArtistName(raw: string): string {
  return raw
    .replace(/\s*-\s*Topic/i, "")
    .replace(/VEVO$/i, "")
    .trim();
}

export function formatTimeSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Parses raw synced LRC strings or plain text lyrics into structured timestamped lines with section tags.
 * Supports English & Spanish section headers ([Verse], [Chorus], [Verso], [Coro], [Puente], [Estribillo], etc.)
 */
export function parseSyncedLyrics(rawText: string, durationSec = 180): SyncedLyricLine[] {
  const lines = rawText.split(/\r?\n/);
  const result: SyncedLyricLine[] = [];
  let currentSection = "Intro";
  let hasLrcTimestamps = false;
  let lineIdCounter = 1;

  // 1. First pass: check for [mm:ss.xx] timestamps
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line is a section header like [Verse 1], [Chorus], [Coro], [Verso 1], [Puente]
    const sectionMatch = trimmed.match(/^\[([^\\[\\]]+)\]$/);
    if (sectionMatch && !trimmed.match(/^\[\d+:\d+/)) {
      currentSection = sectionMatch[1].trim();
      result.push({
        id: lineIdCounter++,
        timeSec: result.length > 0 ? result[result.length - 1].timeSec : 0,
        timeFormatted: formatTimeSec(result.length > 0 ? result[result.length - 1].timeSec : 0),
        text: `[${currentSection}]`,
        section: currentSection,
        isSectionHeader: true,
      });
      continue;
    }

    const timestampMatch = trimmed.match(/^\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/);
    if (timestampMatch) {
      hasLrcTimestamps = true;
      const minutes = parseInt(timestampMatch[1], 10);
      const seconds = parseInt(timestampMatch[2], 10);
      const ms = timestampMatch[3] ? parseFloat(`0.${timestampMatch[3]}`) : 0;
      const timeSec = minutes * 60 + seconds + ms;
      const text = timestampMatch[4].trim();

      if (text) {
        result.push({
          id: lineIdCounter++,
          timeSec,
          timeFormatted: formatTimeSec(timeSec),
          text,
          section: currentSection,
          isSectionHeader: false,
        });
      }
    }
  }

  // 2. If no LRC timestamps found, distribute plain text across the song duration
  if (!hasLrcTimestamps || result.length === 0) {
    currentSection = "Intro";
    const plainResult: SyncedLyricLine[] = [];

    // Filter valid lines
    const validLines = lines.map((l) => l.trim()).filter(Boolean);
    const totalLines = validLines.filter((l) => !l.match(/^\[([^\\[\\]]+)\]$/)).length;
    const timeStep = totalLines > 0 ? Math.max(3, Math.min(6, (durationSec - 15) / Math.max(1, totalLines))) : 4;
    let currentTime = 10; // start 10s into the track

    for (const rawLine of validLines) {
      const sectionMatch = rawLine.match(/^\[([^\\[\\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        plainResult.push({
          id: lineIdCounter++,
          timeSec: currentTime,
          timeFormatted: formatTimeSec(currentTime),
          text: `[${currentSection}]`,
          section: currentSection,
          isSectionHeader: true,
        });
      } else {
        plainResult.push({
          id: lineIdCounter++,
          timeSec: Math.min(durationSec, currentTime),
          timeFormatted: formatTimeSec(currentTime),
          text: rawLine,
          section: currentSection,
          isSectionHeader: false,
        });
        currentTime += timeStep;
      }
    }
    return plainResult;
  }

  return result;
}

/**
 * Strips LRC timestamps like [00:12.34] from lyrics for clean reading view.
 */
export function stripSyncedTimestamps(syncedLyrics?: string): string {
  if (!syncedLyrics) return "";
  return syncedLyrics
    .replace(/^\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]\s*/gm, "")
    .replace(/\r?\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Helper to query LRCLIB search endpoint.
 */
async function queryLrclibSearch(query: string): Promise<LyricsSearchResult | null> {
  try {
    const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "SignalAudioBreakdown/1.0 (https://github.com)" },
    });
    if (!resp.ok) return null;
    const results = (await resp.json()) as LyricsSearchResult[];
    if (Array.isArray(results) && results.length > 0) {
      return results.find((r) => r.plainLyrics || r.syncedLyrics) ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch lyrics by Track Title and Artist Name with Spanish & international diacritic fallbacks.
 */
export async function fetchLiveLyrics(
  title: string,
  artist?: string,
  durationSec = 180
): Promise<FetchLyricsResponse> {
  const cleanTitle = cleanSongTitle(title);
  const cleanArtist = artist ? cleanArtistName(artist) : "";

  if (!cleanTitle) {
    return { success: false, lyrics: null, source: "lrclib", error: "Track title is required." };
  }

  const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim())}`;

  try {
    // 1. Try exact GET endpoint
    if (cleanArtist) {
      const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      const resp = await fetch(getUrl, {
        headers: { "User-Agent": "SignalAudioBreakdown/1.0 (https://github.com)" },
      });

      if (resp.ok) {
        const data = (await resp.json()) as LyricsSearchResult;
        const rawSynced = data.syncedLyrics || "";
        const rawPlain = data.plainLyrics || stripSyncedTimestamps(rawSynced);
        
        if (rawPlain && rawPlain.trim().length > 0) {
          const syncedLines = parseSyncedLyrics(rawSynced || rawPlain, data.duration || durationSec);
          return {
            success: true,
            lyrics: rawPlain.trim(),
            syncedLyricsRaw: rawSynced,
            syncedLines,
            geniusUrl,
            trackName: data.trackName,
            artistName: data.artistName,
            source: "lrclib",
          };
        }
      }
    }

    // 2. Search with Title + Artist
    let match = await queryLrclibSearch(cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle);

    // 3. Fallback: Search with Diacritics Removed (e.g. "Tití Me Preguntó" -> "Titi Me Pregunto")
    if (!match) {
      const unaccentedTitle = removeDiacritics(cleanTitle);
      const unaccentedArtist = removeDiacritics(cleanArtist);
      if (unaccentedTitle !== cleanTitle || unaccentedArtist !== cleanArtist) {
        match = await queryLrclibSearch(unaccentedArtist ? `${unaccentedTitle} ${unaccentedArtist}` : unaccentedTitle);
      }
    }

    // 4. Fallback: Search Title only
    if (!match && cleanTitle.length > 3) {
      match = await queryLrclibSearch(cleanTitle);
    }

    if (match) {
      const rawSynced = match.syncedLyrics || "";
      const rawPlain = match.plainLyrics || stripSyncedTimestamps(rawSynced);
      if (rawPlain && rawPlain.trim().length > 0) {
        const syncedLines = parseSyncedLyrics(rawSynced || rawPlain, match.duration || durationSec);
        return {
          success: true,
          lyrics: rawPlain.trim(),
          syncedLyricsRaw: rawSynced,
          syncedLines,
          geniusUrl,
          trackName: match.trackName,
          artistName: match.artistName,
          source: "lrclib",
        };
      }
    }

    return {
      success: false,
      lyrics: null,
      geniusUrl,
      source: "lrclib",
      error: `No lyrics found for "${cleanTitle}". You can search Genius.com directly or paste them into the box.`,
    };
  } catch (err) {
    return {
      success: false,
      lyrics: null,
      geniusUrl,
      source: "fallback",
      error: `Network error querying lyrics: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
