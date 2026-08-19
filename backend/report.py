"""Signal — report assembly.

All keys are trimmed (the early draft had accidental trailing spaces that
broke the frontend). Every block that could not be produced carries an
explicit *_error field; missing data is never invented.
"""

from __future__ import annotations


def build_report(
    title: str,
    artist: str,
    file_name: str | None,
    audio: dict | None,
    audio_error: str | None,
    lyrics: dict | None,
    lyrics_error: str | None,
    transcription_error: str | None,
    warnings: list[str],
) -> dict:
    return {
        "title": title.strip() or "Untitled track",
        "artist": artist.strip() or "Unknown artist",
        "file_name": file_name,
        "duration": audio.get("duration") if audio else None,
        "sample_rate": audio.get("sample_rate") if audio else None,
        "channels": audio.get("channels") if audio else None,
        "tempo": audio.get("tempo") if audio else {
            "value": None,
            "confidence": "none",
            "source": "unavailable — no decodable audio",
        },
        "key": audio.get("key") if audio else {
            "value": None,
            "confidence": "none",
            "source": "unavailable — no decodable audio",
        },
        "sections": audio.get("sections", []) if audio else [],
        "energy_curve": audio.get("energy_curve", []) if audio else [],
        "energy": audio.get("energy") if audio else None,
        "texture": audio.get("texture") if audio else None,
        "lyrics": lyrics,
        "audio_error": audio_error,
        "lyrics_error": lyrics_error,
        "transcription_error": transcription_error,
        "warnings": warnings,
    }
