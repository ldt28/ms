"""Signal — Stream Audio Fetch via yt-dlp.

Supports YouTube, YouTube Music, and SoundCloud audio extraction.
Runs locally on your own machine.
"""

from __future__ import annotations

from pathlib import Path
from typing import TypedDict


class StreamMetadata(TypedDict, total=False):
    title: str
    artist: str
    duration: float
    thumbnail: str
    url: str


class YouTubeFetchError(Exception):
    """Explicit, user-facing fetch failure."""


def is_stream_url(url: str) -> bool:
    lower = url.lower()
    return any(host in lower for host in ["youtube.com", "youtu.be", "music.youtube.com", "soundcloud.com"])


def is_youtube_url(url: str) -> bool:
    return is_stream_url(url)


def extract_stream_metadata(url: str) -> StreamMetadata:
    try:
        import yt_dlp  # type: ignore
    except ImportError:
        raise YouTubeFetchError("yt-dlp is not installed. Run: pip install yt-dlp")

    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise YouTubeFetchError("Could not retrieve stream metadata.")
            return {
                "title": info.get("title") or info.get("track") or "Untitled Track",
                "artist": info.get("artist") or info.get("uploader") or info.get("channel") or "Unknown Artist",
                "duration": float(info.get("duration") or 0),
                "thumbnail": info.get("thumbnail") or "",
                "url": url,
            }
    except Exception as exc:
        raise YouTubeFetchError(f"Failed to extract stream metadata: {exc}")


def fetch_youtube_audio(url: str, dest_dir: Path) -> Path:
    try:
        import yt_dlp  # type: ignore
    except ImportError:
        raise YouTubeFetchError(
            "yt-dlp is not installed in the backend virtualenv. Run: pip install yt-dlp"
        )

    out_template = str(dest_dir / "stream_audio.%(ext)s")
    opts = {
        "format": "bestaudio/best",
        "outtmpl": out_template,
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "socket_timeout": 30,
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception:
        # Fallback without postprocessor if ffmpeg isn't installed
        opts_no_ffmpeg = {
            "format": "bestaudio/best",
            "outtmpl": out_template,
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "socket_timeout": 30,
        }
        try:
            with yt_dlp.YoutubeDL(opts_no_ffmpeg) as ydl:
                ydl.download([url])
        except Exception as exc2:
            raise YouTubeFetchError(f"yt-dlp could not fetch audio: {exc2}")

    for candidate in dest_dir.glob("stream_audio.*"):
        return candidate
    for candidate in dest_dir.glob("yt_audio.*"):
        return candidate
    raise YouTubeFetchError("yt-dlp finished but produced no audio file.")
