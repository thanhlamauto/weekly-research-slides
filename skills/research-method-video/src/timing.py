"""Transcript-driven timing for Manim scenes.

Scenes call ``timing.tail(scene_id, default)`` for their final comprehension
dwell and ``timing.beat_dwell(scene_id, beat_id, default)`` after a key reveal.
When transcript timing is not enabled the defaults are returned, so scenes still
render exactly as before.

Enable with ``render_scene.py --timing transcript`` (sets ``WRS_TRANSCRIPT``).
"""

from __future__ import annotations

import json
import os
import pathlib

_CACHE: dict | None = None
_LOADED = False


def _load() -> dict | None:
    global _CACHE, _LOADED
    if _LOADED:
        return _CACHE
    _LOADED = True
    path = os.environ.get("WRS_TRANSCRIPT")
    if not path:
        proj = os.environ.get("WRS_PROJECT")
        if proj:
            path = str(pathlib.Path(proj) / "transcript" / "transcript.json")
    if not path:
        return None
    p = pathlib.Path(path)
    if not p.exists():
        return None
    try:
        _CACHE = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        _CACHE = None
    return _CACHE


def enabled() -> bool:
    return _load() is not None


def _scene(sid: str) -> dict | None:
    data = _load()
    if not data:
        return None
    for s in data.get("scenes", []):
        if s["id"] == sid:
            return s
    return None


def scene_seconds(sid: str) -> float | None:
    s = _scene(sid)
    return s.get("duration_seconds") if s else None


def beat(sid: str, bid: str) -> dict | None:
    s = _scene(sid)
    if not s:
        return None
    for b in s.get("narration", []):
        if b["beat_id"] == bid:
            return b
    return None


def tail(sid: str, default: float, anim_estimate: float | None = None,
         max_hold: float = 6.0) -> float:
    """Final dwell for a scene, derived from its narration length.

    ``anim_estimate`` is the scene's approximate animation length in seconds.
    The hold fills the gap up to the narration duration, capped by ``max_hold``
    so a silent render never sits on a dead frame for too long.
    """
    s = _scene(sid)
    if not s:
        return default
    base = max(default, s.get("tail_dwell", default))
    if anim_estimate is None or not s.get("duration_seconds"):
        return round(base, 3)
    remaining = s["duration_seconds"] - anim_estimate
    return round(max(base, min(remaining, max_hold)), 3)


def beat_dwell(sid: str, bid: str, default: float) -> float:
    b = beat(sid, bid)
    if not b:
        return default
    return round(max(default, b.get("dwell_seconds", default)), 3)
