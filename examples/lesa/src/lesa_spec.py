"""Bind scene labels to scene_spec.yaml so text stays a single source of truth.

Labels used in the Manim scenes are read from the scene spec where practical,
so renaming an actor in YAML updates the video.
"""

from __future__ import annotations

import pathlib

from spec import load_scene_spec

_SPEC_PATH = pathlib.Path(__file__).resolve().parents[1] / "scene_spec.yaml"
_SPEC = load_scene_spec(_SPEC_PATH)


def scene(sid: str) -> dict:
    for s in _SPEC["scenes"]:
        if s["id"] == sid:
            return s
    raise KeyError(sid)


def label(sid: str, actor_id: str, default: str | None = None) -> str:
    for actor in scene(sid).get("actors", []):
        if actor["id"] == actor_id:
            return actor.get("label", default or actor_id)
    return default or actor_id


def video_title() -> str:
    return _SPEC["video"]["title"]
