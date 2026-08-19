"""Signal — lyrics metrics.

Deterministic text statistics, identical in spirit to the browser engine:
end-rhyme density (suffix heuristic), lexical diversity (type-token ratio),
syllable flow, and repeated-line hook detection.

House rule: full lyrics are never echoed back. Hooks return short fragments
(64 chars max) only.
"""

from __future__ import annotations

import re

_VOWELS = re.compile(r"[aeiouy]+")
_TOKENS = re.compile(r"[a-z']+")


class LyricsError(Exception):
    """Explicit, user-facing lyrics failure."""


def _syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    n = len(_VOWELS.findall(w)) or 1
    if w.endswith("e") and not w.endswith("le") and n > 1:
        n -= 1
    if w.endswith("ed") and n > 1 and len(w) > 3:
        n -= 1
    return max(1, n)


def _end_sound(line: str) -> str:
    """Naive end-rhyme signature: stripped spelling tail of the last word."""
    words = [w for w in re.sub(r"[^a-z'\s]", "", line.lower()).split() if w]
    w = words[-1] if words else ""
    if len(w) <= 3:
        return w
    if w.endswith("es"):
        w = w[:-2]
    elif w.endswith("s") and not w.endswith("ss"):
        w = w[:-1]
    if w.endswith("e") and not w.endswith("ee"):
        w = w[:-1]
    return w[-3:]


def _truncate(s: str, limit: int = 64) -> str:
    return s if len(s) <= limit else s[:limit].rstrip() + "\u2026"


def analyze_lyrics(text: str, duration_sec: float | None, source: str) -> dict:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        raise LyricsError("Need at least two non-empty lines of lyrics to compute metrics.")

    total_words = 0
    total_syll = 0
    tokens = set()
    end_groups: dict[str, int] = {}
    line_counts: dict[str, dict] = {}

    for line in lines:
        toks = _TOKENS.findall(line.lower())
        total_words += len(toks)
        line_syll = 0
        for t in toks:
            tokens.add(t)
            line_syll += _syllables(t)
        total_syll += line_syll

        sig = _end_sound(line)
        if sig:
            end_groups[sig] = end_groups.get(sig, 0) + 1

        norm = re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", "", line.lower())).strip()
        if norm:
            if norm in line_counts:
                line_counts[norm]["count"] += 1
            else:
                line_counts[norm] = {"count": 1, "display": line}

    rhyming = sum(1 for ln in lines if end_groups.get(_end_sound(ln), 0) >= 2)
    rhyme_density = round(rhyming / len(lines), 3) if lines else 0.0
    diversity = round(len(tokens) / total_words, 3) if total_words else 0.0
    avg_syll = round(total_syll / len(lines), 2) if lines else 0.0
    flow = round(total_syll / duration_sec, 2) if duration_sec and duration_sec > 0 else None

    hooks = [
        {"fragment": _truncate(v["display"]), "count": v["count"]}
        for v in sorted(line_counts.values(), key=lambda v: -v["count"])
        if v["count"] >= 2
    ][:6]

    return {
        "source": source,
        "word_count": total_words,
        "line_count": len(lines),
        "rhyme_density": rhyme_density,
        "lexical_diversity": diversity,
        "avg_syllables_per_line": avg_syll,
        "syllables_per_second": flow,
        "hooks": hooks,
    }
