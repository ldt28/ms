/**
 * Signal — link resolver.
 * Reads a pasted URL and turns it into something the workbench can use:
 *
 *  · Direct audio URLs (and unknown hosts that actually serve audio) are
 *    fetched, size-guarded and wrapped in a File so the existing DSP engine
 *    analyzes them exactly like uploads. Playback uses the URL natively.
 *  · YouTube / SoundCloud metadata is read through their official oEmbed
 *    endpoints; playback happens in official embeds.
 *  · Spotify links become official iframe embeds.
 *  · Stream-ripping is never attempted — unsupported platforms get an
 *    explicit refusal, per the house rules.
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
  /** synthesized File for the DSP engine (direct links only) */
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

async function resolveYouTube(url: string, host: string): Promise<LinkInfo> {
  const id = youtubeId(url);
  if (!id) throw new LinkError("That doesn’t look like a playable YouTube link (need /watch?v=, youtu.be or /shorts/).");
  const j =
    (await oEmbed(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)) ??
    (await oEmbed(`https://noembed.com/embed?url=${encodeURIComponent(url)}`));
  return {
    url,
    kind: "youtube",
    host,
    title: (j?.title as string) ?? "YouTube video",
    artist: (j?.author_name as string) ?? undefined,
    thumbnail: (j?.thumbnail_url as string) ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    analysisReady: false,
    note: "Played via the official player — the timeline below jumps the video, and the length is read from YouTube itself. Streams are encrypted, so no tool can decode audio from this URL: drop the track’s audio file into the console to unlock tempo / key / sections (the report stays bound to this video), or paste the video’s transcript (⋯ under the video → Show transcript) for lyric metrics.",
  };
}

async function resolveSpotify(url: string, host: string): Promise<LinkInfo> {
  const m = url.match(/open\.spotify\.com\/(?:intl-[\w-]+\/)?(track|album|playlist|episode|show)\/([\w]+)/i);
  if (!m) throw new LinkError("Couldn’t read a Spotify ID from that link — use a track / album / playlist share link.");
  const embedUrl = `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}?utm_source=generator&theme=0`;
  return {
    url,
    kind: "spotify",
    host,
    embedUrl,
    analysisReady: false,
    note: "Played via the official Spotify embed. Spotify streams can’t be decoded in the browser, so audio metrics are unavailable for this source — paste lyrics for text metrics.",
  };
}

async function resolveSoundCloud(url: string, host: string): Promise<LinkInfo> {
  const j = await oEmbed(`https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  let embedUrl: string | undefined;
  const html = (j?.html as string) ?? "";
  const srcMatch = html.match(/src="([^"]+)"/);
  if (srcMatch) embedUrl = srcMatch[1].replace(/&amp;/g, "&");
  return {
    url,
    kind: "soundcloud",
    host,
    title: (j?.title as string) ?? "SoundCloud track",
    artist: (j?.author_name as string) ?? undefined,
    thumbnail: (j?.thumbnail_url as string) ?? undefined,
    embedUrl,
    analysisReady: false,
    note: embedUrl
      ? "Played via the official SoundCloud embed. Stream audio can’t be decoded in the browser, so audio metrics are unavailable — paste lyrics for text metrics."
      : "SoundCloud didn’t return a player for this link — it may be private or region-blocked.",
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

  // stream with a hard byte cap (handles extensionless CDN links too)
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel().catch(() => undefined);
          throw new LinkError("Stream exceeded the 80 MB cap — Signal stopped reading.");
        }
        chunks.push(value);
      }
    }
  } else {
    const buf = await res.arrayBuffer();
    total = buf.byteLength;
    if (total > MAX_BYTES) throw new LinkError("Stream exceeded the 80 MB cap — Signal stopped reading.");
    chunks.push(new Uint8Array(buf));
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
      note: `${host} links can’t be read or played here — Signal only takes direct audio URLs plus official YouTube / Spotify / SoundCloud embeds. No stream ripping, ever.`,
    };
  }
  if (AUDIO_EXT.test(url.href) || host.includes("cdn") || host.includes("dropbox") || host.includes("drive.google")) {
    return fetchDirectAudio(url.href, host);
  }
  // unknown host — probe it; if it serves audio we take it, otherwise refuse loudly
  return fetchDirectAudio(url.href, host);
}
