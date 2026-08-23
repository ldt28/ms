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
 * Strips YouTube noise like (Official Video), [Audio], (Prod by ...), Prod@..., etc.
 */
export function stripMediaNoise(raw: string): string {
  return raw
    .replace(/\s*[([{\\/].*?(official|video|audio|lyrics|music video|hd|4k|remastered|visualizer|ft\.|feat\.|en vivo|letra|prod\.|prod\b|prod@).*?[)\]}\\/]/gi, "")
    .replace(/\s*-\s*(official|audio|video|lyrics|letra).*/gi, "")
    .replace(/\s*prod\s*@\s*[\w.-]+/gi, "")
    .replace(/\s*prod\s*by\s*[\w.-]+/gi, "")
    .replace(/\s*prod\.?\s*[\w.-]+/gi, "")
    .trim();
}

export interface ParsedTrackInfo {
  cleanTitle: string;
  cleanArtist: string;
  secondaryArtists: string[];
  searchQueries: string[];
}

/**
 * Intelligently separates Song Title from Artist names in YouTube / streaming titles.
 * Handles formats like:
 *   "ACTIVO – CORI PROBLEMA x EL ZOMBI 15 (Video Oficial) Prod@zzcocinalo" -> Title: "ACTIVO", Artist: "CORI PROBLEMA"
 *   "CORI PROBLEMA - ACTIVO (Official Video)" -> Title: "ACTIVO", Artist: "CORI PROBLEMA"
 *   "The Weeknd - Blinding Lights (Official Audio)" -> Title: "Blinding Lights", Artist: "The Weeknd"
 */
export function parseTitleAndArtist(rawTitle: string, rawArtist?: string): ParsedTrackInfo {
  const stripped = stripMediaNoise(rawTitle);
  let cleanTitle = stripped;
  let cleanArtist = rawArtist ? cleanArtistName(rawArtist) : "";
  const secondaryArtists: string[] = [];

  // Check for common separators: " - ", " – ", " — ", " | ", " // "
  const separatorMatch = stripped.match(/\s*(?:[-–—|]|(?:\/{2}))\s*/);
  if (separatorMatch && separatorMatch.index !== undefined) {
    const left = stripped.slice(0, separatorMatch.index).trim();
    const right = stripped.slice(separatorMatch.index + separatorMatch[0].length).trim();

    // Check if right part contains artist names or " x ", " feat ", " ft "
    const isRightArtistLike =
      (rawArtist && right.toLowerCase().includes(rawArtist.toLowerCase())) ||
      /\b(x|feat\.?|ft\.?|featuring|with|&)\b/i.test(right);

    const isLeftArtistLike =
      (rawArtist && left.toLowerCase().includes(rawArtist.toLowerCase())) ||
      /\b(x|feat\.?|ft\.?|featuring|with|&)\b/i.test(left);

    if (isRightArtistLike && !isLeftArtistLike) {
      cleanTitle = left;
      // parse artists from right
      const artistTokens = right.split(/\s*(?:\bx\b|feat\.?|ft\.?|featuring|&|,)\s*/i).map((t) => t.trim()).filter(Boolean);
      if (artistTokens.length > 0) {
        cleanArtist = cleanArtistName(artistTokens[0]);
        secondaryArtists.push(...artistTokens.slice(1));
      }
    } else {
      // Standard "Artist - Title" format
      cleanArtist = cleanArtistName(left);
      cleanTitle = right;
      const titleTokens = right.split(/\s*(?:\bx\b|feat\.?|ft\.?|featuring)\s*/i).map((t) => t.trim()).filter(Boolean);
      if (titleTokens.length > 1) {
        cleanTitle = titleTokens[0];
        secondaryArtists.push(...titleTokens.slice(1));
      }
    }
  }

  // Clean artist from title if still contained
  if (cleanArtist && cleanTitle.toLowerCase().includes(cleanArtist.toLowerCase())) {
    cleanTitle = cleanTitle.replace(new RegExp(cleanArtist, "gi"), "").replace(/^[-–—:\s]+|[-–—:\s]+$/g, "").trim();
  }

  // Generate robust fallback search query combinations
  const searchQueries: string[] = [];
  if (cleanTitle && cleanArtist) {
    searchQueries.push(`${cleanTitle} ${cleanArtist}`);
    searchQueries.push(`${cleanArtist} ${cleanTitle}`);
  }
  if (cleanTitle) {
    searchQueries.push(cleanTitle);
  }
  if (stripped && stripped !== cleanTitle) {
    searchQueries.push(stripped);
  }

  return {
    cleanTitle: cleanTitle || stripped || "Unknown Track",
    cleanArtist: cleanArtist || rawArtist || "Unknown Artist",
    secondaryArtists,
    searchQueries: [...new Set(searchQueries.filter(Boolean))],
  };
}

/**
 * Clean track title by stripping common YouTube suffixes like (Official Video), [Audio], etc.
 */
export function cleanSongTitle(raw: string): string {
  const parsed = parseTitleAndArtist(raw);
  return parsed.cleanTitle;
}

/**
 * Clean artist name by stripping " - Topic", "VEVO", etc.
 */
export function cleanArtistName(raw: string): string {
  return raw
    .replace(/\s*-\s*Topic/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s*Official\s*Channel/i, "")
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
  let explicitSectionCount = 0;

  // 1. First pass: parse lines and timestamps
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line is an explicit section header like [Verse 1], [Chorus], [Coro], [Verso 1], [Puente]
    const sectionMatch = trimmed.match(/^\[([^\\[\\]]+)\]$/);
    if (sectionMatch && !trimmed.match(/^\[\d+:\d+/)) {
      currentSection = sectionMatch[1].trim();
      explicitSectionCount++;
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

  // 2. If no LRC timestamps found, distribute plain text across song duration
  if (!hasLrcTimestamps || result.length === 0) {
    const validLines = lines.map((l) => l.trim()).filter(Boolean);
    const totalLines = validLines.filter((l) => !l.match(/^\[([^\\[\\]]+)\]$/)).length;
    const timeStep = totalLines > 0 ? Math.max(3, Math.min(6, (durationSec - 15) / Math.max(1, totalLines))) : 4;
    let currentTime = 10;
    const plainResult: SyncedLyricLine[] = [];
    currentSection = "Intro";

    for (const rawLine of validLines) {
      const sectionMatch = rawLine.match(/^\[([^\\[\\]]+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        explicitSectionCount++;
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
    return autoSegmentIfSingleSection(plainResult, durationSec, explicitSectionCount);
  }

  return autoSegmentIfSingleSection(result, durationSec, explicitSectionCount);
}

/**
 * If the lyrics came from LRC without explicit section headers, segment them into real musical sections.
 */
function autoSegmentIfSingleSection(
  lines: SyncedLyricLine[],
  durationSec: number,
  explicitSectionCount: number
): SyncedLyricLine[] {
  if (explicitSectionCount > 1 || lines.length === 0) {
    return lines;
  }

  const safeDuration = durationSec > 0 ? durationSec : 180;
  const segmented: SyncedLyricLine[] = [];
  let currentSecName = "";
  let lineCounter = 1000;

  for (const line of lines) {
    if (line.isSectionHeader) continue;

    const t = line.timeSec;
    let targetSection = "Verse 1";

    if (t < safeDuration * 0.12) {
      targetSection = "Intro";
    } else if (t < safeDuration * 0.38) {
      targetSection = "Verse 1";
    } else if (t < safeDuration * 0.58) {
      targetSection = "Chorus / Hook";
    } else if (t < safeDuration * 0.78) {
      targetSection = "Verse 2";
    } else if (t < safeDuration * 0.90) {
      targetSection = "Chorus / Hook";
    } else {
      targetSection = "Outro";
    }

    // When transitioning to a new section, insert section header
    if (targetSection !== currentSecName) {
      currentSecName = targetSection;
      segmented.push({
        id: lineCounter++,
        timeSec: line.timeSec,
        timeFormatted: formatTimeSec(line.timeSec),
        text: `[${currentSecName}]`,
        section: currentSecName,
        isSectionHeader: true,
      });
    }

    segmented.push({
      ...line,
      section: currentSecName,
    });
  }

  return segmented;
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
  durationSec = 180,
  youtubeVideoId?: string
): Promise<FetchLyricsResponse> {
  const parsed = parseTitleAndArtist(title, artist);
  const cleanTitle = parsed.cleanTitle;
  const cleanArtist = parsed.cleanArtist;

  if (!cleanTitle) {
    return { success: false, lyrics: null, source: "lrclib", error: "Track title is required." };
  }

  const geniusUrl = `https://genius.com/search?q=${encodeURIComponent(`${cleanTitle} ${cleanArtist}`.trim())}`;

  try {
    // 1. Try exact GET endpoint with clean track & clean artist
    if (cleanArtist && cleanArtist !== "Unknown Artist") {
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

    // 2. Iterate through all search query combinations
    for (const query of parsed.searchQueries) {
      let match = await queryLrclibSearch(query);

      // Fallback: search with diacritics removed
      if (!match) {
        const unaccented = removeDiacritics(query);
        if (unaccented !== query) {
          match = await queryLrclibSearch(unaccented);
        }
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
    }

    // 3. Fallback: If no online lyrics exist in database, generate a rhythmic musical structure for the track
    const syntheticLrc = generateFallbackSongStructure(cleanTitle, cleanArtist, durationSec);
    const syncedLines = parseSyncedLyrics(syntheticLrc, durationSec);

    return {
      success: true,
      lyrics: stripSyncedTimestamps(syntheticLrc),
      syncedLyricsRaw: syntheticLrc,
      syncedLines,
      geniusUrl,
      trackName: cleanTitle,
      artistName: cleanArtist,
      source: "fallback",
    };
  } catch (err) {
    const syntheticLrc = generateFallbackSongStructure(cleanTitle, cleanArtist, durationSec);
    const syncedLines = parseSyncedLyrics(syntheticLrc, durationSec);

    return {
      success: true,
      lyrics: stripSyncedTimestamps(syntheticLrc),
      syncedLyricsRaw: syntheticLrc,
      syncedLines,
      geniusUrl,
      source: "fallback",
      error: `Network warning: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Generates an interactive musical cadence framework when lyrics are unreleased on databases.
 */
function generateFallbackSongStructure(title: string, artist: string, durationSec: number): string {
  const safeDur = durationSec > 0 ? durationSec : 180;
  const t1 = formatTimeSec(safeDur * 0.05);
  const t2 = formatTimeSec(safeDur * 0.15);
  const t3 = formatTimeSec(safeDur * 0.25);
  const t4 = formatTimeSec(safeDur * 0.40);
  const t5 = formatTimeSec(safeDur * 0.50);
  const t6 = formatTimeSec(safeDur * 0.62);
  const t7 = formatTimeSec(safeDur * 0.72);
  const t8 = formatTimeSec(safeDur * 0.82);
  const t9 = formatTimeSec(safeDur * 0.92);

  return `[00:00.00] [Intro]
[${t1}.00] 🎛️ (Beat & Bass Groove Starts)
[${t2}.00] [Verse 1]
[${t2}.50] ${artist || "Lead Vocal"} — ${title}
[${t3}.00] Rhythmic vocal cadence & flow
[${t4}.00] [Chorus / Hook]
[${t4}.50] Main hook and harmonic drop
[${t5}.00] Full energy beat & 808 slides
[${t6}.00] [Verse 2]
[${t6}.50] Second verse vocal stanza
[${t7}.00] Dynamic bridge and melodic variation
[${t8}.00] [Chorus / Hook]
[${t8}.50] Final climax hook repetition
[${t9}.00] [Outro]
[${t9}.50] Beat fade & instrumental tail`;
}
