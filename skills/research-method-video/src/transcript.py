"""Transcript as a first-class artifact.

The narration script is authored before animation. Silent mode derives pacing
from the script deterministically; TTS and forced alignment can replace the
estimated timings without changing the canonical text.
"""

from __future__ import annotations

import json
import pathlib
import re
from typing import Any

import yaml
from jsonschema import Draft7Validator

SCHEMA_DIR = pathlib.Path(__file__).resolve().parents[1] / "schemas"

# Speech-rate guidance, not rigid constants.
AUDIENCE_PROFILES = {
    "expert": {"wpm": 160, "base_dwell": 0.4, "jargon_budget": 99},
    "adjacent-researcher": {"wpm": 140, "base_dwell": 0.7, "jargon_budget": 6},
    "general-technical": {"wpm": 128, "base_dwell": 1.0, "jargon_budget": 3},
}

DWELL_BY_KIND = {
    "normal": 0.25,
    "introduction": 0.8,
    "equation": 1.0,
    "comparison": 0.8,
    "aha": 1.3,
    "conclusion": 0.6,
}

SENTENCE_SPLIT = re.compile(r"(?<=[.!?])\s+")
WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9'’\-_.]*")
PAPER_PROSE = re.compile(
    r"\b(as shown|as depicted|in this paper|we propose|respectively|thereby|herein|"
    r"aforementioned|utilize|leverage the|it should be noted|as illustrated)\b", re.I)
ACRONYM = re.compile(r"\b[A-Z][A-Z0-9]{1,}\b")


class TranscriptError(Exception):
    pass


def _read(path: pathlib.Path) -> Any:
    if not path.exists():
        raise TranscriptError(f"transcript not found: {path}")
    try:
        if path.suffix == ".json":
            return json.loads(path.read_text(encoding="utf-8"))
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except (yaml.YAMLError, json.JSONDecodeError) as exc:
        raise TranscriptError(f"invalid {path.suffix} in {path.name}: {exc}") from exc


def validate(data: Any, label: str = "transcript") -> None:
    schema = json.loads((SCHEMA_DIR / "transcript.schema.json").read_text(encoding="utf-8"))
    errors = sorted(Draft7Validator(schema).iter_errors(data), key=lambda e: list(e.path))
    if errors:
        lines = [f"  - {'/'.join(str(x) for x in e.path) or '<root>'}: {e.message}" for e in errors[:8]]
        raise TranscriptError(f"{label} failed transcript schema validation:\n" + "\n".join(lines))


def check_ids(data: dict) -> None:
    scenes = set()
    for scene in data["scenes"]:
        if scene["id"] in scenes:
            raise TranscriptError(f"duplicate scene id: {scene['id']}")
        scenes.add(scene["id"])
        beats = set()
        for beat in scene["narration"]:
            if beat["beat_id"] in beats:
                raise TranscriptError(f"scene {scene['id']}: duplicate beat id {beat['beat_id']}")
            beats.add(beat["beat_id"])


def load(path: str | pathlib.Path) -> dict:
    data = _read(pathlib.Path(path))
    validate(data, pathlib.Path(path).name)
    check_ids(data)
    return data


def words_of(text: str) -> list[str]:
    return WORD_RE.findall(text)


def sentence_count(text: str) -> int:
    return max(1, len([s for s in SENTENCE_SPLIT.split(text.strip()) if s]))


def speaking_seconds(words: list[str], text: str, wpm: float) -> float:
    base = len(words) / max(1.0, wpm) * 60.0
    pauses = 0.12 * text.count(",") + 0.28 * (text.count(".") + text.count(";") + text.count(":"))
    return max(0.8, base + pauses)


def _distribute(words: list[str], start: float, duration: float) -> list[dict]:
    weights = [max(1, len(w)) for w in words]
    total = sum(weights) or 1
    out = []
    t = start
    for w, wt in zip(words, weights):
        d = duration * wt / total
        out.append({"word": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d
    return out


def estimate(data: dict) -> tuple[dict, list[dict]]:
    """Attach deterministic timings to the transcript and build word times."""
    audience = data["audience"]
    profile = AUDIENCE_PROFILES[audience["level"]]
    wpm = audience.get("target_wpm") or profile["wpm"]
    cursor = 0.0
    word_times: list[dict] = []
    scenes_out = []
    for scene in data["scenes"]:
        s_start = cursor
        beats_out = []
        for beat in scene["narration"]:
            words = words_of(beat["text"])
            speak = speaking_seconds(words, beat["text"], wpm)
            kind = beat.get("kind", "normal")
            dwell = beat.get("dwell_seconds", DWELL_BY_KIND.get(kind, DWELL_BY_KIND["normal"]))
            b_start, b_end = cursor, cursor + speak
            beats_out.append({**beat, "words": words, "word_count": len(words),
                              "speaking_seconds": round(speak, 3), "dwell_seconds": round(dwell, 3),
                              "start": round(b_start, 3), "end": round(b_end, 3),
                              "end_with_dwell": round(b_end + dwell, 3)})
            word_times.extend([{**w, "scene_id": scene["id"], "beat_id": beat["beat_id"]}
                               for w in _distribute(words, b_start, speak)])
            cursor = b_end + dwell
        scene_dwell = scene.get("dwell_seconds", 0.0)
        tail = max(scene_dwell, beats_out[-1]["dwell_seconds"] if beats_out else profile["base_dwell"])
        s_end = cursor + scene_dwell
        scenes_out.append({**scene, "narration": beats_out, "start": round(s_start, 3),
                           "end": round(s_end, 3), "duration_seconds": round(s_end - s_start, 3),
                           "tail_dwell": round(tail, 3),
                           "word_count": sum(b["word_count"] for b in beats_out)})
        cursor = s_end
    enriched = {**data, "scenes": scenes_out, "duration_seconds": round(cursor, 3),
                "word_count": sum(s["word_count"] for s in scenes_out),
                "target_wpm": wpm}
    return enriched, word_times


def link_check(data: dict, scene_spec: dict | None) -> list[dict]:
    findings = []
    if not scene_spec:
        return findings
    spec_scenes = {s["id"]: s for s in scene_spec.get("scenes", [])}
    for scene in data["scenes"]:
        spec = spec_scenes.get(scene["id"])
        if not spec:
            findings.append({"level": "error", "where": scene["id"],
                             "message": "transcript scene has no matching scene_spec scene"})
            continue
        beat_ids = {b["id"] for b in spec.get("beats", [])}
        for beat in scene["narration"]:
            cue = beat.get("visual_cue")
            if cue and cue not in beat_ids and cue not in ("", None):
                findings.append({"level": "warning", "where": f"{scene['id']}/{beat['beat_id']}",
                                 "message": f"visual_cue '{cue}' does not match a scene_spec beat id"})
    for sid in spec_scenes:
        if sid not in {s["id"] for s in data["scenes"]}:
            findings.append({"level": "warning", "where": sid,
                             "message": "scene_spec scene has no narration"})
    return findings


def narration_markdown(data: dict) -> str:
    lines = [f"# Narration — {data['video'].get('title', data['video']['id'])}", ""]
    aud = data["audience"]
    lines.append(f"- audience: `{aud['level']}` (target ~{data.get('target_wpm', '?')} wpm)")
    lines.append(f"- mode: `{data.get('mode', 'silent')}`")
    if data.get("duration_seconds"):
        lines.append(f"- estimated duration: {data['duration_seconds']:.1f}s "
                     f"({data.get('word_count', 0)} words)")
    lines.append("")
    for scene in data["scenes"]:
        lines.append(f"## {scene['id']} — {scene.get('title', '')}".rstrip(" —"))
        if scene.get("purpose"):
            lines.append(f"*Purpose: {scene['purpose']}*")
        lines.append("")
        for beat in scene["narration"]:
            meta = []
            if beat.get("visual_cue"):
                meta.append(f"cue: `{beat['visual_cue']}`")
            if beat.get("kind") and beat["kind"] != "normal":
                meta.append(beat["kind"])
            if beat.get("dwell_seconds"):
                meta.append(f"dwell {beat['dwell_seconds']}s")
            suffix = f"  ({'; '.join(meta)})" if meta else ""
            lines.append(f"**{beat['beat_id']}**{suffix}")
            lines.append("")
            lines.append(beat["text"].strip())
            if beat.get("emphasis"):
                lines.append("")
                lines.append(f"*emphasis: {', '.join(beat['emphasis'])}*")
            lines.append("")
        if scene.get("takeaway"):
            lines.append(f"> Takeaway: {scene['takeaway']}")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"
