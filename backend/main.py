"""Signal — Song Breakdown API.

Run it:
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /api/health            -> {"status": "ok", ...}
    GET  /api/stream_metadata   -> {"title": "...", "artist": "...", "duration": ...}
    GET  /api/stream_audio      -> streams extracted audio file directly
    POST /api/analyze           -> multipart form analysis (files, URLs, YouTube, SoundCloud)
"""

from __future__ import annotations

import os
import shutil
import tempfile
import urllib.request
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from audio_analysis import AudioAnalysisError, analyze_audio
from lyrics_analysis import LyricsError, analyze_lyrics
from report import build_report
from transcription import TranscriptionError, transcribe_audio
from youtube_fetch import (
    YouTubeFetchError,
    extract_stream_metadata,
    fetch_youtube_audio,
    is_stream_url,
)

app = FastAPI(title="Signal — Song Breakdown API", version="0.2.5")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BYTES = 80 * 1024 * 1024
REMOTE_NAME = "remote_audio"
AUDIO_CACHE_DIR = Path(tempfile.gettempdir()) / "signal_stream_cache"
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "service": "signal", "version": "0.2.5"}


@app.get("/api/stream_metadata")
def stream_metadata(url: str = Query(...)) -> dict:
    if not is_stream_url(url):
        raise HTTPException(status_code=400, detail="Unsupported streaming host")
    try:
        data = extract_stream_metadata(url)
        return {"status": "ok", "metadata": data}
    except YouTubeFetchError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@app.get("/api/stream_audio")
def stream_audio(url: str = Query(...)) -> FileResponse:
    if not is_stream_url(url):
        raise HTTPException(status_code=400, detail="Unsupported streaming host")
    try:
        path = fetch_youtube_audio(url, AUDIO_CACHE_DIR)
        media_type = "audio/mpeg" if path.suffix == ".mp3" else "audio/wav"
        return FileResponse(path=path, media_type=media_type, filename=path.name)
    except YouTubeFetchError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@app.post("/api/analyze")
async def analyze(
    title: str = Form(""),
    artist: str = Form(""),
    lyrics: str = Form(""),
    transcribe: str = Form("false"),
    audio: UploadFile | None = File(None),
    audio_url: str = Form(""),
) -> dict:
    tmp = Path(tempfile.mkdtemp(prefix="signal-"))
    warnings: list[str] = []
    audio_data: dict | None = None
    audio_error: str | None = None
    source_name: str | None = None
    path: Path | None = None

    try:
        # ---- 1) get audio bytes: upload first, then direct URL / streaming URL ----
        if audio is not None and audio.filename:
            data = await audio.read()
            if len(data) > MAX_BYTES:
                audio_error = "Upload is over 80 MB. Export a smaller copy and retry."
            elif len(data) == 0:
                audio_error = "The uploaded file is empty."
            else:
                source_name = audio.filename
                path = tmp / audio.filename
                path.write_bytes(data)
        elif audio_url.strip():
            source_name = audio_url.strip()
            path = tmp / REMOTE_NAME

            # YouTube / SoundCloud links go through yt-dlp converter
            if is_stream_url(source_name):
                try:
                    path = fetch_youtube_audio(source_name, tmp)
                    warnings.append(
                        "Audio was converted from a streaming URL via yt-dlp on your local backend."
                    )
                except YouTubeFetchError as exc:
                    audio_error = str(exc)
                    path = None
            else:
                try:
                    req = urllib.request.Request(source_name, headers={"User-Agent": "Signal/0.2"})
                    with urllib.request.urlopen(req, timeout=90) as resp, open(path, "wb") as out:
                        copied = 0
                        while True:
                            chunk = resp.read(1 << 16)
                            if not chunk:
                                break
                            copied += len(chunk)
                            if copied > MAX_BYTES:
                                raise ValueError("remote file is over 80 MB")
                            out.write(chunk)
                except Exception as exc:  # noqa: BLE001
                    audio_error = (
                        f"Could not download the audio URL: {exc}. "
                        "Direct audio links and streaming links (YouTube/SoundCloud) work with yt-dlp."
                    )
                    path = None

        # ---- 2) audio analysis ----
        if path is not None and audio_error is None:
            try:
                audio_data = analyze_audio(path)
            except AudioAnalysisError as exc:
                audio_error = str(exc)
            except Exception as exc:  # noqa: BLE001
                audio_error = f"Audio analysis crashed unexpectedly: {exc}"

        # ---- 3) lyrics metrics, or optional vocal transcription ----
        lyrics_block: dict | None = None
        lyrics_error: str | None = None
        transcription_error: str | None = None
        duration = audio_data.get("duration") if audio_data else None

        if lyrics.strip():
            try:
                lyrics_block = analyze_lyrics(lyrics, duration, "pasted")
            except LyricsError as exc:
                lyrics_error = str(exc)
        elif transcribe.strip().lower() in ("1", "true", "yes"):
            if path is None:
                transcription_error = "No audio available to transcribe."
            else:
                try:
                    transcript = transcribe_audio(path)
                    lyrics_block = analyze_lyrics(transcript, duration, "transcript")
                except TranscriptionError as exc:
                    transcription_error = str(exc)
                except LyricsError as exc:
                    lyrics_error = str(exc)
        else:
            lyrics_error = "No lyrics supplied and transcription not requested — lyric metrics unavailable."

        return build_report(
            title=title,
            artist=artist,
            file_name=source_name,
            audio=audio_data,
            audio_error=audio_error,
            lyrics=lyrics_block,
            lyrics_error=lyrics_error,
            transcription_error=transcription_error,
            warnings=warnings,
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
