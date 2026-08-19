"""Signal — optional vocal transcription.

faster-whisper is an OPTIONAL dependency. If it is missing, we raise an
explicit, actionable error instead of silently returning nothing — that is
the product rule: failures stay loud.

The raw transcript is used only to compute lyrics metrics. It is never
returned to the frontend.
"""

from __future__ import annotations

from pathlib import Path


class TranscriptionError(Exception):
    """Explicit, user-facing transcription failure."""


def transcribe_audio(path: Path) -> str:
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError:
        raise TranscriptionError(
            "faster-whisper is not installed in this virtualenv. Run: pip install faster-whisper — then retry. "
            "First run downloads the 'tiny' model (~75 MB), which can take a minute."
        )

    try:
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        segments, _info = model.transcribe(str(path), beam_size=1)
        text = " ".join(seg.text for seg in segments).strip()
    except TranscriptionError:
        raise
    except Exception as exc:  # noqa: BLE001 — surface anything as an explicit error
        raise TranscriptionError(f"Whisper failed on this file: {exc}")

    if not text:
        raise TranscriptionError("No vocals detected — the recording appears to be instrumental.")
    return text
