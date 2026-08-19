/**
 * Signal — YouTube IFrame Player integration (official API, no scraping).
 * Gives the report a real instrumented player: exact duration, current time,
 * and programmatic seeking — so the section timeline can drive the video
 * itself. Works only through youtube.com's own player; the stream is never
 * touched, which is exactly the point.
 */

import { useEffect, useRef } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */

let apiPromise: Promise<any> | null = null;

function loadYouTubeAPI(): Promise<any> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const w = window as any;
    if (w.YT && w.YT.Player) {
      resolve(w.YT);
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(w.YT);
    };
    if (!document.getElementById("signal-yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "signal-yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}

export interface YouTubeBridge {
  onDuration: (d: number) => void;
  onTime: (t: number) => void;
  onSeekReady: (seek: (t: number) => void) => void;
}

/**
 * Mounts the official YT player into a div and streams duration/time back
 * through the bridge. Returns a ref to attach to the container div.
 */
export function useYouTubePlayer(videoId: string | null, bridge: YouTubeBridge) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const bridgeRef = useRef(bridge);
  bridgeRef.current = bridge;

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    let pollId = 0;
    let player: any = null;
    let durationSent = false;

    loadYouTubeAPI().then((YT) => {
      if (cancelled || !divRef.current) return;
      player = new YT.Player(divRef.current, {
        videoId,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => {
            const d = player?.getDuration?.() ?? 0;
            if (d > 0 && !durationSent) {
              durationSent = true;
              bridgeRef.current.onDuration(d);
            }
          },
        },
      });
      bridgeRef.current.onSeekReady((t: number) => {
        try {
          player?.seekTo?.(t, true);
        } catch {
          /* player not ready yet */
        }
      });
      pollId = window.setInterval(() => {
        try {
          const t = player?.getCurrentTime?.();
          if (typeof t === "number" && t >= 0) bridgeRef.current.onTime(t);
          if (!durationSent) {
            const d = player?.getDuration?.() ?? 0;
            if (d > 0) {
              durationSent = true;
              bridgeRef.current.onDuration(d);
            }
          }
        } catch {
          /* ignore mid-destroy reads */
        }
      }, 250);
    });

    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      try {
        player?.destroy?.();
      } catch {
        /* already gone */
      }
    };
  }, [videoId]);

  return divRef;
}

export function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
