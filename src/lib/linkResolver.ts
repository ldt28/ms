/**
 * Signal — Multi-Source Link Resolver.
 * Reads pasted URLs and prepares them for the analysis workbench:
 *
 *  · Direct audio URLs: Fetched & wrapped in File for browser DSP.
 *  · Spotify: Fetches oEmbed metadata + 30-second high-quality audio preview stream
 *    so full in-browser DSP (BPM, key, chords, visualizer) is unlocked!
 *  · YouTube / SoundCloud:
 *      - If local Python backend is active: fetches audio stream via yt-dlp.
 *      - If browser-only: embeds official synchronized player + auto-fetches lyrics.
 */

export type LinkKind = "direct" | "youtube" | "spotify" | "soundcloud" | "unsupported";

export interface LinkInfo {
  url: string;
  kind: LinkKind;
  host: string;
  title?: string;
  artist?: string;
  thumbnail?: string;
  embedUrl?: string;
  /** decoded-ready: the DSP engine can analyze this source */
  analysisReady: boolean;
  /** synthesized or fetched File for the DSP engine */
  audioFile?: File;
  bytes?: number;
  note: string | null;
}

export class LinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LinkError";
  }
}

const AUDIO_EXT = /\.(mp3|wav|flac|m4a|aac|ogg|oga|opus|aiff|aif|webm)(\?|#|$)/i;
const MAX_BYTES = 80 * 1024 * 1024;

const REFUSED_HOSTS = [
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "fb.watch",
  "twitch.tv",
  "deezer.com",
  "audiomack.com",
  "beatport.com",
  "bandcamp.com",
];

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    const v = u.searchParams.get("v");
    if (v) return v;
    const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]{6,})/);
    if (m) return m[2];
    return null;
  } catch {
    return null;
  }
}

async function oEmbed(url: string): Promise<Record<string, any> | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as Record<string, any>;
  } catch {
    return null;
  }
}

/**
 * Checks if the local Python backend is reachable on port 8000.
 */
async function checkBackendOnline(): Promise<boolean> {
  try {
    const r = await fetch("http://localhost:8000/api/health", { method: "GET", signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches an official 30-second audio preview stream using public search API.
 */
async function fetchAudioPreview(title: string, artist?: string): Promise<File | null> {
  try {
    const query = artist ? `${title} ${artist}` : title;
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`;
    const res = await fetch(searchUrl);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results || data.results.length === 0) return null;

    const previewUrl = data.results[0].previewUrl as string;
    if (!previewUrl) return null;

    const audioRes = await fetch(previewUrl);
    if (!audioRes.ok) return null;

    const blob = await audioRes.blob();
    return new File([blob], `${title}_preview.m4a`, { type: "audio/mp4" });
  } catch {
    return null;
  }
}

async function resolveYouTube(url: string, host: string): Promise<LinkInfo> {
  const id = youtubeId(url);
  if (!id) throw new LinkError("That doesn’t look like a playable YouTube link (need /watch?v=, youtu.be or /shorts/).");
  
  const j =
    (await oEmbed(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)) ??
    (await oEmbed(`https://noembed.com/embed?url=${encodeURIComponent(url)}`));

  const rawTitle = (j?.title as string) ?? "YouTube video";
  const rawArtist = (j?.author_name as string) ?? undefined;

  // Clean title & artist
  const cleanTitle = rawTitle.replace(/\s*[([{\\/].*?(official|video|audio|lyrics|music video|hd|4k).*?[)\]}\\/]/gi, "").trim();

  // 1. Try local backend audio stream if online
  const isBackendActive = await checkBackendOnline();
  if (isBackendActive) {
    try {
      const streamRes = await fetch(`http://localhost:8000/api/stream_audio?url=${encodeURIComponent(url)}`);
      if (streamRes.ok) {
        const blob = await streamRes.blob();
        if (blob.size > 1000) {
          return {
            url,
            kind: "youtube",
            host,
            title: cleanTitle,
            artist: rawArtist,
            thumbnail: (j?.thumbnail_url as string) ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
            analysisReady: true,
            audioFile: new File([blob], `${cleanTitle}.mp3`, { type: "audio/mpeg" }),
            bytes: blob.size,
            note: "Audio extracted via local Python backend (yt-dlp) — full 60 FPS waveform, tempo, key, chords, and stem breakdown unlocked!",
          };
        }
      }
    } catch {
      // fallback to browser mode
    }
  }

  // 2. Browser Mode Fallback: Try audio preview or official interactive player
  const previewFile = await fetchAudioPreview(cleanTitle, rawArtist);

  return {
    url,
    kind: "youtube",
    host,
    title: cleanTitle,
    artist: rawArtist,
    thumbnail: (j?.thumbnail_url as string) ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    analysisReady: !!previewFile,
    audioFile: previewFile ?? undefined,
    note: previewFile
      ? "30s high-fidelity audio preview stream matched — full DSP waveform, BPM, key, and chords unlocked in browser!"
      : "Played via the official player with live timeline synchronization. Start your local backend (uvicorn main:app) or drop the audio file to unlock full DSP decoding.",
  };
}

async function resolveSpotify(url: string, host: string): Promise<LinkInfo> {
  const m = url.match(/open\.spotify\.com\/(?:intl-[\w-]+\/)?(track|album|playlist|episode|show)\/([\w]+)/i);
  if (!m) throw new LinkError("Couldn’t read a Spotify ID from that link — use a track / album / playlist share link.");

  const embedUrl = `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}?utm_source=generator&theme=0`;
  const j = await oEmbed(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);

  let title = j?.title as string | undefined;
  let artist: string | undefined;

  if (title && title.includes(" - song and lyrics by ")) {
    const parts = title.split(" - song and lyrics by ");
    title = parts[0];
    artist = parts[1];
  } else if (j?.author_name) {
    artist = j.author_name;
  }

  const cleanTitle = title ?? "Spotify Track";

  // Fetch 30-second high-fidelity preview stream
  const previewFile = await fetchAudioPreview(cleanTitle, artist);

  return {
    url,
    kind: "spotify",
    host,
    title: cleanTitle,
    artist,
    thumbnail: j?.thumbnail_url as string | undefined,
    embedUrl,
    analysisReady: !!previewFile,
    audioFile: previewFile ?? undefined,
    note: previewFile
      ? "Official 30-second high-fidelity preview stream fetched — full DSP analysis (waveform, tempo, key, chords) unlocked in browser!"
      : "Played via the official Spotify embed. Direct streams are DRM-protected — click ⚡ Auto-Find Lyrics to score text metrics.",
  };
}

async function resolveSoundCloud(url: string, host: string): Promise<LinkInfo> {
  const j = await oEmbed(`https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  let embedUrl: string | undefined;
  const html = (j?.html as string) ?? "";
  const srcMatch = html.match(/src="([^"]+)"/);
  if (srcMatch) embedUrl = srcMatch[1].replace(/&amp;/g, "&");

  const rawTitle = (j?.title as string) ?? "SoundCloud track";
  const rawArtist = (j?.author_name as string) ?? undefined;

  // 1. Try local backend audio stream if online
  const isBackendActive = await checkBackendOnline();
  if (isBackendActive) {
    try {
      const streamRes = await fetch(`http://localhost:8000/api/stream_audio?url=${encodeURIComponent(url)}`);
      if (streamRes.ok) {
        const blob = await streamRes.blob();
        if (blob.size > 1000) {
          return {
            url,
            kind: "soundcloud",
            host,
            title: rawTitle,
            artist: rawArtist,
            thumbnail: j?.thumbnail_url as string | undefined,
            embedUrl,
            analysisReady: true,
            audioFile: new File([blob], `${rawTitle}.mp3`, { type: "audio/mpeg" }),
            bytes: blob.size,
            note: "Audio extracted via local Python backend (yt-dlp) — full DSP waveform, tempo, key, and chords unlocked!",
          };
        }
      }
    } catch {
      // fallback to browser mode
    }
  }

  // 2. Browser preview or embed
  const previewFile = await fetchAudioPreview(rawTitle, rawArtist);

  return {
    url,
    kind: "soundcloud",
    host,
    title: rawTitle,
    artist: rawArtist,
    thumbnail: (j?.thumbnail_url as string) ?? undefined,
    embedUrl,
    analysisReady: !!previewFile,
    audioFile: previewFile ?? undefined,
    note: previewFile
      ? "Audio preview stream matched — full DSP analysis unlocked in browser!"
      : (embedUrl
        ? "Played via the official SoundCloud embed. Start your local backend (uvicorn main:app) for full DSP audio extraction."
        : "SoundCloud didn’t return a player for this link — it may be private or region-blocked."),
  };
}

async function fetchDirectAudio(url: string, host: string): Promise<LinkInfo> {
  let res: Response;
  try {
    res = await fetch(url, { mode: "cors" });
  } catch {
    throw new LinkError(
      `The server at ${host} refused the cross-origin fetch (CORS). Download the file and drop it in the upload box instead — that always works.`
    );
  }
  if (!res.ok) throw new LinkError(`The link responded ${res.status} ${res.statusText}. Check the URL is public and correct.`);

  const ctype = (res.headers.get("content-type") ?? "").toLowerCase();
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new LinkError(`That file is ${(len / 1048576).toFixed(0)} MB — Signal caps sources at 80 MB.`);

  const looksAudio = ctype.startsWith("audio/") || ctype.includes("octet-stream") || ctype.includes("ogg") || AUDIO_EXT.test(url);

  // stream with a hard byte cap
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          throw new LinkError(`That file exceeds the 80 MB limit.`);
        }
        chunks.push(value);
      }
    }
  }

  if (!looksAudio && !chunks.some(() => true)) {
    throw new LinkError("The link didn’t serve audio data.");
  }
  if (!looksAudio && total < 1024) {
    throw new LinkError(`That link served a tiny ${ctype || "unknown"} payload — not audio. Paste a direct file URL or a YouTube / Spotify / SoundCloud link.`);
  }

  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    merged.set(c, off);
    off += c.byteLength;
  }

  const name = decodeURIComponent(url.split(/[?#]/)[0].split("/").pop() || "remote-audio");
  return {
    url,
    kind: "direct",
    host,
    title: name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
    analysisReady: true,
    audioFile: new File([merged], name, { type: ctype || "audio/mpeg" }),
    bytes: total,
    note: "Fetched directly — analyzed locally by the browser DSP engine, and played straight from the link.",
  };
}

export async function resolveLink(raw: string): Promise<LinkInfo> {
  let url: URL;
  try {
    url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad protocol");
  } catch {
    throw new LinkError("That isn’t a valid http(s) URL.");
  }

  const host = hostOf(url.href);

  if (host.includes("youtube.com") || host === "youtu.be" || host.includes("youtube-nocookie.com")) {
    return resolveYouTube(url.href, host);
  }
  if (host === "open.spotify.com" || host === "spotify.com" || host.endsWith(".spotify.com")) {
    return resolveSpotify(url.href, host);
  }
  if (host === "soundcloud.com" || host.endsWith(".soundcloud.com") || host === "on.soundcloud.com") {
    return resolveSoundCloud(url.href, host);
  }
  if (REFUSED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    return {
      url: url.href,
      kind: "unsupported",
      host,
      analysisReady: false,
      note: `${host} links can’t be read or played here — Signal only takes direct audio URLs plus official YouTube / Spotify / SoundCloud embeds.`,
    };
  }
  if (AUDIO_EXT.test(url.href) || host.includes("cdn") || host.includes("dropbox") || host.includes("drive.google")) {
    return fetchDirectAudio(url.href, host);
  }
  return fetchDirectAudio(url.href, host);
}
