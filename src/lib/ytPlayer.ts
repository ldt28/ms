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
  onStateChange?: (isPlaying: boolean) => void;
  onSeekReady: (seek: (t: number) => void) => void;
  onTogglePlayReady?: (toggle: (targetTime?: number) => void) => void;
  onPlayReady?: (play: () => void) => void;
  onPauseReady?: (pause: () => void) => void;
}

/**
 * Mounts the official YT player into a div and streams duration/time/state back
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
          onStateChange: (event: any) => {
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            const isPlaying = event.data === 1 || event.data === 3;
            bridgeRef.current.onStateChange?.(isPlaying);
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

      bridgeRef.current.onPlayReady?.(() => {
        try {
          player?.playVideo?.();
        } catch {
          /* ignore */
        }
      });

      bridgeRef.current.onPauseReady?.(() => {
        try {
          player?.pauseVideo?.();
        } catch {
          /* ignore */
        }
      });

      bridgeRef.current.onTogglePlayReady?.((targetTime?: number) => {
        try {
          const state = player?.getPlayerState?.();
          if (state === 1) {
            // Currently playing
            if (targetTime !== undefined) {
              const cur = player?.getCurrentTime?.() ?? 0;
              if (Math.abs(cur - targetTime) > 2) {
                player?.seekTo?.(targetTime, true);
                player?.playVideo?.();
                return;
              }
            }
            player?.pauseVideo?.();
          } else {
            // Currently paused or unstarted
            if (targetTime !== undefined) {
              player?.seekTo?.(targetTime, true);
            }
            player?.playVideo?.();
          }
        } catch {
          /* ignore */
        }
      });

      pollId = window.setInterval(() => {
        try {
          const t = player?.getCurrentTime?.();
          if (typeof t === "number" && t >= 0) bridgeRef.current.onTime(t);
          if (!durationSent) {
            const d = player?.getDuration?.() ?? 0;
            if (d > 0 && Number.isFinite(d)) {
              durationSent = true;
              bridgeRef.current.onDuration(d);
            }
          }
        } catch {
          /* ignore mid-destroy reads */
        }
      }, 200);
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
