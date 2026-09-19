"""SRT / VTT generation from the structured transcript.

Captions are readable: at most two lines, wrapped at word boundaries, split
preferring sentence and comma boundaries, with a configurable line width.
"""

from __future__ import annotations

import math
import re

from transcript import SENTENCE_SPLIT, words_of

DEFAULT_MAX_CHARS = 42


def _format_time(seconds: float, comma: bool) -> str:
    seconds = max(0.0, seconds)
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    sep = "," if comma else "."
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def _lines(text: str, max_chars: int) -> list[str]:
    """Greedy word wrap; every line is at most max_chars unless a word is longer."""
    lines: list[str] = []
    cur = ""
    for w in text.split():
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= max_chars:
            cur += " " + w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def cues_from_transcript(data: dict, max_chars: int = DEFAULT_MAX_CHARS,
                         max_lines: int = 2) -> list[dict]:
    """Split narration into readable cues: <= max_lines lines of <= max_chars.

    A long sentence becomes several cues rather than an over-long line.
    """
    cues = []
    for scene in data["scenes"]:
        for beat in scene["narration"]:
            sentences = [s.strip() for s in SENTENCE_SPLIT.split(beat["text"].strip()) if s.strip()]
            if not sentences:
                continue
            total_words = sum(len(words_of(s)) for s in sentences) or 1
            start = beat.get("start", 0.0)
            span = max(0.1, beat.get("end", start + 1.0) - start)
            t = start
            for s in sentences:
                lines = _lines(s, max_chars)
                for gi in range(0, len(lines), max_lines):
                    chunk = lines[gi:gi + max_lines]
                    w = len(" ".join(chunk).split()) or 1
                    d = span * w / total_words
                    cues.append({"start": round(t, 3), "end": round(t + d, 3),
                                 "text": "\n".join(chunk), "scene_id": scene["id"],
                                 "beat_id": beat["beat_id"]})
                    t += d
    return cues


def to_srt(cues: list[dict]) -> str:
    out = []
    for i, c in enumerate(cues, 1):
        out.append(str(i))
        out.append(f"{_format_time(c['start'], True)} --> {_format_time(c['end'], True)}")
        out.append(c["text"])
        out.append("")
    return "\n".join(out)


def to_vtt(cues: list[dict]) -> str:
    out = ["WEBVTT", ""]
    for i, c in enumerate(cues, 1):
        out.append(str(i))
        out.append(f"{_format_time(c['start'], False)} --> {_format_time(c['end'], False)}")
        out.append(c["text"])
        out.append("")
    return "\n".join(out)


def max_line_length(cues: list[dict]) -> int:
    return max((len(line) for c in cues for line in c["text"].split("\n")), default=0)
