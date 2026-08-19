"""Signal — OPTIONAL YouTube audio fetch via yt-dlp.

This is opt-in and runs only on YOUR machine, on YOUR backend. Use it solely
for content you own or are licensed to use — downloading other people's
content violates YouTube's Terms of Service.

Install:  pip install yt-dlp
The rest of Signal works perfectly without this module; when yt-dlp is
missing, failures are returned as explicit errors, never silently.
"""

from __future__ import annotations

from pathlib import Path


class YouTubeFetchError(Exception):
    """Explicit, user-facing fetch failure."""


def is_youtube_url(url: str) -> bool:
    return "youtube.com" in url or "youtu.be" in url


def fetch_youtube_audio(url: str, dest_dir: Path) -> Path:
    try:
        import yt_dlp  # type: ignore
    except ImportError:
        raise YouTubeFetchError(
            "yt-dlp is not installed in the backend virtualenv. Run: pip install yt-dlp — "
            "and only fetch content you own or are licensed to use."
        )

    out_template = str(dest_dir / "yt_audio.%(ext)s")
    opts = {
        "format": "bestaudio/best",
        "outtmpl": out_template,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 30,
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as exc:  # noqa: BLE001 — surface yt-dlp failures explicitly
        raise YouTubeFetchError(f"yt-dlp could not fetch that video: {exc}")

    for candidate in dest_dir.glob("yt_audio.*"):
        return candidate
    raise YouTubeFetchError("yt-dlp finished but produced no audio file.")
