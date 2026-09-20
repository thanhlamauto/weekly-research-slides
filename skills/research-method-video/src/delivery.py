"""Delivery / prosody model for narration.

The canonical transcript says *what* is said. The delivery plan says *how* it is
delivered: intent, tone, pace, energy, semantic pauses, emphasis and a
beat-specific director note. It is provider-independent; a Gemini prompt is
derived from it, never the other way around, so the scientific explanation
survives a change of voice or provider.
"""

from __future__ import annotations

import json
import pathlib

DEFAULT_PROFILE = "research-explainer"

# ---------------------------------------------------------------------------
# Voice profiles
# ---------------------------------------------------------------------------
PROFILES = {
    "research-explainer": {
        "summary": "a clear, thoughtful researcher explaining an idea to another strong researcher",
        "style": "Conversational academic explanation. Calm, curious, precise, and intellectually engaged.",
        "pacing": (
            "Moderate natural pace. Slow down slightly when introducing a new technical "
            "concept. Use brief pauses before contrasts and conclusions. Allow the listener "
            "time to understand important visual transitions."
        ),
        "prosody": (
            "Natural pitch variation. Avoid a flat or repetitive cadence. Emphasize contrast "
            "words when scientifically meaningful: 'but', 'however', 'instead', 'the key "
            "point', 'this is the problem'. Do not exaggerate emphasis."
        ),
        "delivery": (
            "Speak as if explaining a diagram on a whiteboard. The animation shows what "
            "changes; your voice explains why the change matters."
        ),
        "avoid": [
            "advertisement or promotional voice",
            "documentary trailer voice",
            "exaggerated excitement or constant upbeat intonation",
            "monotone textbook reading",
            "the same sentence-ending cadence every time",
            "artificially slow speech",
        ],
    },
}

# ---------------------------------------------------------------------------
# Intent defaults (strong sensible defaults; every field is optional)
# ---------------------------------------------------------------------------
INTENT_BY_KIND = {
    "introduction": "define",
    "equation": "derive",
    "comparison": "contrast",
    "aha": "reveal",
    "conclusion": "conclude",
    "normal": "explain",
}

INTENT_DEFAULTS = {
    "explain": {"tone": "calm-explanatory", "pace": "moderate", "energy": "medium",
                "pause_before_ms": 0, "pause_after_ms": 250},
    "define": {"tone": "precise-introducing", "pace": "slightly-slower", "energy": "medium",
               "pause_before_ms": 150, "pause_after_ms": 500},
    "contrast": {"tone": "curious-explanatory", "pace": "moderate", "energy": "medium",
                 "pause_before_ms": 300, "pause_after_ms": 450},
    "reveal-problem": {"tone": "curious-explanatory", "pace": "moderate", "energy": "medium",
                       "pause_before_ms": 300, "pause_after_ms": 550},
    "reveal": {"tone": "intellectually-engaged", "pace": "slightly-slower", "energy": "medium",
               "pause_before_ms": 350, "pause_after_ms": 650},
    "derive": {"tone": "precise", "pace": "slower", "energy": "medium",
               "pause_before_ms": 200, "pause_after_ms": 500},
    "conclude": {"tone": "confident-restrained", "pace": "moderate", "energy": "medium",
                 "pause_before_ms": 250, "pause_after_ms": 550},
    "recap": {"tone": "warm-confident", "pace": "moderate", "energy": "medium",
              "pause_before_ms": 150, "pause_after_ms": 500},
}

DWELL_WEIGHT = {"introduction": 3.0, "aha": 4.0, "comparison": 2.5, "equation": 2.5,
                "conclusion": 2.0, "normal": 1.0}

PAUSE_CAP_MS = 1200


class DeliveryError(Exception):
    pass


def _clamp_pause(value, default=0):
    try:
        ms = int(value)
    except (TypeError, ValueError):
        ms = default
    return max(0, min(PAUSE_CAP_MS, ms))


def delivery_for(beat: dict, profile: str = DEFAULT_PROFILE, narration_cfg: dict | None = None) -> dict:
    """Resolve the delivery metadata for one beat.

    Explicit `beat.delivery` fields win; intent defaults fill the rest; the
    profile supplies the shared director language.
    """
    if profile not in PROFILES:
        raise DeliveryError(f"unknown voice profile '{profile}' (have: {', '.join(PROFILES)})")
    explicit = dict(beat.get("delivery") or {})
    intent = explicit.get("intent") or INTENT_BY_KIND.get(beat.get("kind", "normal"), "explain")
    defaults = INTENT_DEFAULTS.get(intent, INTENT_DEFAULTS["explain"])
    narration_cfg = narration_cfg or {}
    pacing = narration_cfg.get("pacing") or {}
    min_dwell_ms = int(pacing.get("min_concept_dwell_ms", 500))

    out = {
        "intent": intent,
        "tone": explicit.get("tone", defaults["tone"]),
        "pace": explicit.get("pace", defaults["pace"]),
        "energy": explicit.get("energy", defaults["energy"]),
        "pause_before_ms": _clamp_pause(explicit.get("pause_before_ms"), defaults["pause_before_ms"]),
        "pause_after_ms": _clamp_pause(explicit.get("pause_after_ms"), defaults["pause_after_ms"]),
        "emphasis": [str(e) for e in (explicit.get("emphasis") or beat.get("emphasis") or [])],
        "direction": (explicit.get("direction") or "").strip(),
    }
    # A new concept deserves at least the configured dwell after it.
    if beat.get("kind") in ("introduction", "equation") and out["pause_after_ms"] < min_dwell_ms:
        out["pause_after_ms"] = min_dwell_ms
    return out


# ---------------------------------------------------------------------------
# Semantic chunking: one coherent explanatory thought per TTS request
# ---------------------------------------------------------------------------
def _beat_seconds(beat: dict, wpm: float) -> float:
    words = beat.get("word_count") or len(str(beat.get("text", "")).split())
    return max(0.8, words / max(1.0, wpm) * 60.0)


def chunk_beats(beats: list[dict], *, min_seconds: float = 8.0, max_seconds: float = 25.0,
                wpm: float = 140.0) -> list[list[dict]]:
    """Group consecutive beats into semantic chunks (8-25s by default).

    Chunk boundaries use a stable text-derived estimate, not whatever timing the
    last audio backend produced, so the plan (and its cache keys) does not drift
    when narration is regenerated. A beat is never split. A too-small trailing
    chunk is merged into its predecessor to avoid a prosody reset on a fragment.
    """
    if not beats:
        return []
    chunks: list[list[dict]] = []
    current: list[dict] = []
    current_s = 0.0
    for beat in beats:
        seconds = _beat_seconds(beat, wpm)
        if current and current_s + seconds > max_seconds:
            chunks.append(current)
            current, current_s = [], 0.0
        current.append(beat)
        current_s += seconds
        if current_s >= min_seconds:
            chunks.append(current)
            current, current_s = [], 0.0
    if current:
        chunks.append(current)
    if len(chunks) >= 2:
        last_s = sum(_beat_seconds(b, wpm) for b in chunks[-1])
        prev_s = sum(_beat_seconds(b, wpm) for b in chunks[-2])
        if last_s < min_seconds and prev_s + last_s <= max_seconds * 1.25:
            chunks[-2] = chunks[-2] + chunks[-1]
            chunks.pop()
    return chunks


def chunk_text(chunk: list[dict]) -> str:
    """Spoken text for a chunk.

    Paragraph breaks are inserted where a semantic pause is requested; they are
    the provider-independent way to ask for a pause without inline tags.
    """
    parts: list[str] = []
    for i, beat in enumerate(chunk):
        delivery = beat.get("delivery") or {}
        text = str(beat.get("text", "")).strip()
        if i > 0 and int(delivery.get("pause_before_ms", 0)) >= 250:
            parts.append("\n\n" + text)
        else:
            parts.append((" " if parts else "") + text)
    return "".join(parts).strip()


# ---------------------------------------------------------------------------
# Provider prompt (derived artifact)
# ---------------------------------------------------------------------------
def prompt_for_chunk(chunk: list[dict], *, profile: str = DEFAULT_PROFILE,
                     prev_takeaway: str | None = None, next_intent: str | None = None,
                     narration_cfg: dict | None = None) -> str:
    if profile not in PROFILES:
        raise DeliveryError(f"unknown voice profile '{profile}'")
    p = PROFILES[profile]
    lines = [
        "You are narrating a scientific visual explainer for researchers.",
        "",
        "AUDIO PROFILE",
        f"You are {p['summary']}.",
        "",
        "STYLE",
        p["style"],
        "Do not sound like an advertisement, audiobook, or corporate presentation.",
        "",
        "PACING",
        p["pacing"],
        "",
        "PROSODY",
        p["prosody"],
        "",
        "DELIVERY",
        p["delivery"],
    ]
    if prev_takeaway:
        lines += ["", "CONTEXT", f"The previous section concluded: {prev_takeaway}",
                  "Continue naturally from that thought; do not restart the topic."]
    if next_intent:
        lines += [f"The next section will {next_intent}."]
    lines += ["", "BEAT NOTES"]
    for beat in chunk:
        d = delivery_for(beat, profile=profile, narration_cfg=narration_cfg)
        note = [f"- [{beat.get('beat_id')}] intent: {d['intent']}, tone: {d['tone']}, pace: {d['pace']}, energy: {d['energy']}"]
        if d["emphasis"]:
            note.append(f"  emphasize: {', '.join(d['emphasis'])}")
        if d["pause_before_ms"]:
            note.append(f"  pause ~{d['pause_before_ms']}ms before this beat")
        if d["pause_after_ms"]:
            note.append(f"  pause ~{d['pause_after_ms']}ms after this beat")
        if d["direction"]:
            note.append(f"  direction: {d['direction']}")
        lines.append("\n".join(note))
    lines += [
        "",
        "Read ONLY the transcript below, exactly as written. Do not add, drop or paraphrase words.",
        "",
        "TRANSCRIPT",
        chunk_text(chunk),
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Plan serialization
# ---------------------------------------------------------------------------
def build_plan(transcript: dict, *, profile: str | None = None) -> dict:
    narration_cfg = transcript.get("narration") or {}
    profile = profile or narration_cfg.get("profile") or DEFAULT_PROFILE
    wpm = (transcript.get("target_wpm")
           or (narration_cfg.get("pacing") or {}).get("target_wpm")
           or 140.0)
    chunks = []
    for si, scene in enumerate(transcript.get("scenes", [])):
        scene_chunks = chunk_beats(scene.get("narration", []), wpm=wpm)
        prev_takeaway = transcript["scenes"][si - 1].get("takeaway") if si else None
        next_scene = transcript["scenes"][si + 1] if si + 1 < len(transcript["scenes"]) else None
        next_intent = (next_scene or {}).get("purpose") or (next_scene or {}).get("title")
        for ci, chunk in enumerate(scene_chunks):
            delivery = {b["beat_id"]: delivery_for(b, profile=profile, narration_cfg=narration_cfg) for b in chunk}
            chunks.append({
                "chunk_id": f"{scene['id']}__c{ci + 1:02d}",
                "scene_id": scene["id"],
                "beat_ids": [b["beat_id"] for b in chunk],
                "text": chunk_text(chunk),
                "delivery": delivery,
                "estimated_seconds": round(sum(
                    (b.get("speaking_seconds") or 0.0) for b in chunk), 3),
                "prompt": prompt_for_chunk(chunk, profile=profile, prev_takeaway=prev_takeaway,
                                           next_intent=next_intent, narration_cfg=narration_cfg),
            })
    return {
        "video": transcript["video"]["id"],
        "profile": profile,
        "audience": transcript.get("audience", {}),
        "narration": narration_cfg,
        "chunks": chunks,
        "word_count": transcript.get("word_count"),
    }


def write_plan(transcript: dict, path: str | pathlib.Path, *, profile: str | None = None) -> dict:
    plan = build_plan(transcript, profile=profile)
    path = pathlib.Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
    return plan
