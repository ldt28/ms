/**
 * Live Lyrics Fetcher using LRCLIB open-source lyrics database API.
 * Free, zero-API-key required, CORS-friendly open database of synced and plain lyrics.
 */

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
  trackName?: string;
  artistName?: string;
  source: "lrclib" | "fallback";
  error?: string;
}

/**
 * Clean track title by stripping common YouTube suffixes like (Official Video), [Audio], etc.
 */
export function cleanSongTitle(raw: string): string {
  return raw
    .replace(/\s*[([{\\/].*?(official|video|audio|lyrics|music video|hd|4k|remastered|visualizer|ft\.|feat\.).*?[)\]}\\/]/gi, "")
    .replace(/\s*-\s*(official|audio|video|lyrics).*/gi, "")
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

/**
 * Fetch lyrics by Track Title and Artist Name.
 */
export async function fetchLiveLyrics(
  title: string,
  artist?: string
): Promise<FetchLyricsResponse> {
  const cleanTitle = cleanSongTitle(title);
  const cleanArtist = artist ? cleanArtistName(artist) : "";

  if (!cleanTitle) {
    return { success: false, lyrics: null, source: "lrclib", error: "Track title is required." };
  }

  try {
    // 1. Try exact get endpoint if both title and artist are present
    if (cleanArtist) {
      const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      const resp = await fetch(getUrl, {
        headers: { "User-Agent": "SignalAudioBreakdown/1.0 (https://github.com)" },
      });

      if (resp.ok) {
        const data = (await resp.json()) as LyricsSearchResult;
        const lyrics = data.plainLyrics || stripSyncedTimestamps(data.syncedLyrics);
        if (lyrics && lyrics.trim().length > 0) {
          return {
            success: true,
            lyrics: lyrics.trim(),
            trackName: data.trackName,
            artistName: data.artistName,
            source: "lrclib",
          };
        }
      }
    }

    // 2. Search endpoint fallback (searches title + artist combined query)
    const searchQuery = cleanArtist ? `${cleanTitle} ${cleanArtist}` : cleanTitle;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`;
    const searchResp = await fetch(searchUrl, {
      headers: { "User-Agent": "SignalAudioBreakdown/1.0 (https://github.com)" },
    });

    if (searchResp.ok) {
      const results = (await searchResp.json()) as LyricsSearchResult[];
      if (Array.isArray(results) && results.length > 0) {
        // Find best match with plainLyrics or syncedLyrics
        const match = results.find((r) => r.plainLyrics || r.syncedLyrics);
        if (match) {
          const lyrics = match.plainLyrics || stripSyncedTimestamps(match.syncedLyrics);
          if (lyrics && lyrics.trim().length > 0) {
            return {
              success: true,
              lyrics: lyrics.trim(),
              trackName: match.trackName,
              artistName: match.artistName,
              source: "lrclib",
            };
          }
        }
      }
    }

    return {
      success: false,
      lyrics: null,
      source: "lrclib",
      error: `No lyrics found online for "${cleanTitle}"${cleanArtist ? ` by ${cleanArtist}` : ""}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      lyrics: null,
      source: "lrclib",
      error: err.message || "Failed to reach live lyrics service.",
    };
  }
}

/**
 * Strips [00:12.34] timestamp tags from synced LRC text into clean lyrics.
 */
function stripSyncedTimestamps(synced?: string): string | undefined {
  if (!synced) return undefined;
  return synced
    .split("\n")
    .map((line) => line.replace(/^\[\d{2}:\d{2}\.\d{2,3}\]\s*/, ""))
    .filter((line) => line.trim().length > 0)
    .join("\n");
}
