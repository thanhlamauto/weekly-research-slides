"""Transcript as a first-class artifact.

The narration script is authored before animation. Silent mode derives pacing
from the script deterministically; TTS and forced alignment can replace the
estimated timings without changing the canonical text.
"""

from __future__ import annotations

import copy
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


DWELL_SURPLUS_WEIGHT = {"introduction": 3.0, "aha": 4.0, "comparison": 2.5, "equation": 2.5,
                        "conclusion": 2.0, "normal": 1.0}


def apply_audio_timing(data: dict, scene_audio: dict[str, float],
                       chunk_map: dict[str, list[dict]] | None = None,
                       animations: dict[str, float] | None = None) -> dict:
    """Replace estimated timings with actual narration audio durations.

    ``scene_audio`` maps scene id -> synthesized scene audio seconds.
    ``chunk_map`` optionally maps scene id -> [{chunk_id, beat_ids, duration}]
    so speaking time is distributed per semantic chunk rather than per scene.
    ``animations`` (or ``data.timing.animation_seconds``) gives measured
    animation-only seconds per scene; when both are known, the surplus between
    audio and animation is distributed into the scene's ``timing.hooks`` beats,
    which the Manim scenes actually wait on. The words never change.
    """
    out = copy.deepcopy(data)
    out["mode"] = "tts"
    timing_cfg = out.get("timing") or {}
    hooks_cfg = timing_cfg.get("hooks") or {}
    anim_cfg = timing_cfg.get("animation_seconds") or {}
    cursor = 0.0
    for scene in out["scenes"]:
        beats = scene["narration"]
        actual = scene_audio.get(scene["id"])
        if actual is None:
            scene["start"] = round(cursor, 3)
            scene["end"] = round(cursor + scene.get("duration_seconds", 0.0), 3)
            cursor = scene["end"]
            continue
        for chunk in (chunk_map or {}).get(scene["id"], []):
            ids = set(chunk["beat_ids"])
            members = [b for b in beats if b["beat_id"] in ids]
            weights = [max(1, b.get("word_count") or len(words_of(b["text"]))) for b in members]
            total_w = sum(weights) or 1
            for b, w in zip(members, weights):
                b["speaking_seconds"] = round(chunk["duration"] * w / total_w, 3)
                b["audio"] = {"chunk_id": chunk["chunk_id"], "duration": round(chunk["duration"], 3)}
        hooks = [b for b in beats if b["beat_id"] in (hooks_cfg.get(scene["id"]) or [])]
        animation = (animations or {}).get(scene["id"]) or anim_cfg.get(scene["id"])
        duration_override = None
        # Reset dwells to their kind defaults so repeated applications are
        # idempotent (audio timing may be re-applied after a new TTS run).
        for b in beats:
            b["dwell_seconds"] = DWELL_BY_KIND.get(b.get("kind", "normal"), DWELL_BY_KIND["normal"])
            b.pop("dwell_source", None)
        if hooks and animation:
            # The scene lasts exactly as long as its audio: speaking fills the
            # timeline, and the surplus over the animation is spent in hook
            # beats (which the scene waits on) plus the default tail.
            weights = [max(1, b.get("word_count") or len(words_of(b["text"]))) for b in beats]
            total_w = sum(weights) or 1
            for b, w in zip(beats, weights):
                b["speaking_seconds"] = round(actual * w / total_w, 3)
            tail_default = max(0.25, beats[-1].get("dwell_seconds", 0.25))
            base_hook = sum(DWELL_BY_KIND.get(b.get("kind", "normal"), DWELL_BY_KIND["normal"]) for b in hooks)
            budget = max(0.0, actual - float(animation) - tail_default - base_hook)
            per = budget / len(hooks)
            for b in hooks:
                base = DWELL_BY_KIND.get(b.get("kind", "normal"), DWELL_BY_KIND["normal"])
                b["dwell_seconds"] = round(base + per, 3)
                b["dwell_source"] = "audio-budget"
            duration_override = actual
        else:
            base_speak = sum(b.get("speaking_seconds", 0.0) for b in beats)
            base_dwell = sum(b.get("dwell_seconds", 0.0) for b in beats)
            base_total = base_speak + base_dwell
            if actual >= base_total:
                surplus = actual - base_total
                weights = [DWELL_SURPLUS_WEIGHT.get(b.get("kind", "normal"), 1.0) for b in beats]
                total_w = sum(weights) or 1
                for b, w in zip(beats, weights):
                    b["dwell_seconds"] = round(b.get("dwell_seconds", 0.0) + surplus * w / total_w, 3)
                    b["dwell_source"] = "audio-surplus"
            elif base_speak > 0:
                factor = max(0.6, (actual - base_dwell) / base_speak)
                for b in beats:
                    b["speaking_seconds"] = round(b.get("speaking_seconds", 0.0) * factor, 3)
        t = cursor
        for b in beats:
            b["start"] = round(t, 3)
            t += b.get("speaking_seconds", 0.0)
            b["end"] = round(t, 3)
            t += b.get("dwell_seconds", 0.0)
            b["end_with_dwell"] = round(t, 3)
        scene_end = cursor + (duration_override if duration_override is not None else (t - cursor))
        scene["start"] = round(cursor, 3)
        scene["end"] = round(scene_end, 3)
        scene["duration_seconds"] = round(scene_end - cursor, 3)
        scene["audio_duration_seconds"] = round(actual, 3)
        scene["tail_dwell"] = round(beats[-1].get("dwell_seconds", 0.0) if beats else 0.0, 3)
        cursor = scene_end
    out["duration_seconds"] = round(cursor, 3)
    out["word_count"] = sum(s.get("word_count", 0) for s in out["scenes"])
    return out


def word_times_from_timings(data: dict) -> list[dict]:
    """Word times derived from audio-adjusted beat timings."""
    out: list[dict] = []
    for scene in data["scenes"]:
        for beat in scene["narration"]:
            words = beat.get("words") or words_of(beat["text"])
            out.extend([{**w, "scene_id": scene["id"], "beat_id": beat["beat_id"]}
                        for w in _distribute(words, beat.get("start", 0.0),
                                             max(0.1, beat.get("speaking_seconds", 0.1)))])
    return out


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
    narration_cfg = data.get("narration") or {}
    if narration_cfg:
        backend = narration_cfg.get("backend", "silent")
        voice = narration_cfg.get("voice")
        voice_name = voice.get("name") if isinstance(voice, dict) else voice
        profile = narration_cfg.get("profile")
        lines.append(f"- narration: backend `{backend}`"
                     + (f", voice `{voice_name}`" if voice_name else "")
                     + (f", profile `{profile}`" if profile else ""))
    if data.get("duration_seconds"):
        lines.append(f"- estimated duration: {data['duration_seconds']:.1f}s "
                     f"({data.get('word_count', 0)} words)")
    lines.append("")
    for scene in data["scenes"]:
        lines.append(f"## {scene['id']} — {scene.get('title', '')}".rstrip(" —"))
        if scene.get("purpose"):
            lines.append(f"*Purpose: {scene['purpose']}*")
        if scene.get("audio_duration_seconds"):
            lines.append(f"*Audio: {scene['audio_duration_seconds']:.1f}s "
                         f"(timing from synthesized narration)*")
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
            d = beat.get("delivery") or {}
            if d:
                bits = []
                if d.get("intent"):
                    bits.append(f"intent {d['intent']}")
                if d.get("tone"):
                    bits.append(d["tone"])
                if d.get("pace"):
                    bits.append(f"pace {d['pace']}")
                if d.get("pause_before_ms"):
                    bits.append(f"pause {d['pause_before_ms']}ms before")
                if d.get("pause_after_ms"):
                    bits.append(f"pause {d['pause_after_ms']}ms after")
                if bits:
                    lines.append("")
                    lines.append(f"*delivery: {'; '.join(bits)}*")
                if d.get("direction"):
                    lines.append(f"*direction: {d['direction']}*")
            lines.append("")
        if scene.get("takeaway"):
            lines.append(f"> Takeaway: {scene['takeaway']}")
            lines.append("")
    return "\n".join(lines).rstrip() + "\n"
