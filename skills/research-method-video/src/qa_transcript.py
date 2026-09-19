"""Transcript QA: actionable narration problems, not style preferences."""

from __future__ import annotations

import re

from transcript import (AUDIENCE_PROFILES, DWELL_BY_KIND, PAPER_PROSE, ACRONYM,
                        SENTENCE_SPLIT, words_of)
from subtitles import cues_from_transcript, DEFAULT_MAX_CHARS

MAX_SENTENCE_WORDS = 25
MAX_BEAT_WORDS = {"expert": 60, "adjacent-researcher": 45, "general-technical": 35}
GLOSSARY_STOP = {
    "the", "a", "an", "and", "of", "to", "in", "for", "with", "on",
    # common ML nouns that are not novel objects of this method
    "diffusion", "feature", "features", "model", "network", "predictor", "expert",
    "stage", "stages", "cache", "caching", "timestep", "timesteps", "trajectory",
    "token", "tokens", "vector", "projection", "decoder", "encoder", "image",
}


def _tokens(text: str) -> list[str]:
    return [w.lower() for w in words_of(text)]


def _overlap_ratio(a: str, b: str) -> float:
    wa, wb = set(_tokens(a)) - GLOSSARY_STOP, set(_tokens(b)) - GLOSSARY_STOP
    if not wa:
        return 0.0
    return len(wa & wb) / len(wa)


def qa(data: dict, scene_spec: dict | None = None, rendered: dict | None = None,
       max_chars: int = DEFAULT_MAX_CHARS) -> list[dict]:
    level = data["audience"]["level"]
    profile = AUDIENCE_PROFILES[level]
    findings: list[dict] = []
    add = lambda lv, where, msg: findings.append({"level": lv, "where": where, "message": msg})

    on_screen: list[str] = []
    term_first_scene: dict[str, int] = {}
    if scene_spec:
        for i, scene in enumerate(scene_spec.get("scenes", [])):
            for a in scene.get("actors", []):
                # text actors are titles/questions; narration may legitimately state them
                if a.get("label") and a.get("type") != "text":
                    on_screen.append(a["label"])
                    term = a["label"].split()[0].lower()
                    if term not in GLOSSARY_STOP:
                        term_first_scene.setdefault(term, i)

    introduced_acronyms: set[str] = set()
    seen_terms: dict[str, int] = {}
    all_text: list[str] = []

    for si, scene in enumerate(data["scenes"]):
        sid = scene["id"]
        for beat in scene["narration"]:
            where = f"{sid}/{beat['beat_id']}"
            text = beat["text"]
            all_text.append(text)
            sentences = [s.strip() for s in SENTENCE_SPLIT.split(text) if s.strip()]
            for s in sentences:
                n = len(words_of(s))
                if n > MAX_SENTENCE_WORDS:
                    add("warning", where, f"sentence has {n} words; split it for listening")
            wc = beat.get("word_count") or len(words_of(text))
            if wc > MAX_BEAT_WORDS[level]:
                add("warning", where, f"beat has {wc} words (budget {MAX_BEAT_WORDS[level]} for {level})")
            if PAPER_PROSE.search(text):
                add("warning", where, f"paper-like prose: '{PAPER_PROSE.search(text).group(0)}'")
            kind = beat.get("kind", "normal")
            dwell = beat.get("dwell_seconds", 0.0)
            if kind in ("introduction", "equation", "aha", "comparison") and dwell < DWELL_BY_KIND[kind]:
                add("warning", where, f"only {dwell}s dwell after a {kind}; give the viewer time")
            if level != "expert" and not beat.get("visual_cue"):
                add("warning", where, "no visual_cue linking narration to a visual beat")
            # narration duplicating on-screen text
            for s in sentences:
                if len(words_of(s)) < 5:
                    continue
                for screen in on_screen:
                    if _overlap_ratio(s, screen) > 0.7:
                        add("warning", where, "narration repeats on-screen text; say why it matters instead")
                        break
            # acronyms
            for m in ACRONYM.finditer(text):
                ac = m.group(0)
                if ac.lower() in ("ok", "us", "i", "id", "url", "http"):
                    continue
                expansion = re.search(rf"\(({ac})\)|({ac})\s*\(", text)
                if ac not in introduced_acronyms and not expansion:
                    add("warning", where, f"acronym '{ac}' used before it is expanded")
                introduced_acronyms.add(ac)
            # term used before it appears on screen
            if scene_spec:
                for term, first in term_first_scene.items():
                    if first > si and re.search(rf"\b{re.escape(term)}\b", text, re.I):
                        add("warning", where, f"mentions '{term}' before the scene that introduces it")

    # subtitle line length
    cues = cues_from_transcript(data, max_chars=max_chars)
    for c in cues:
        for line in c["text"].split("\n"):
            if len(line) > max_chars:
                add("warning", f"{c['scene_id']}/{c['beat_id']}",
                    f"subtitle line is {len(line)} chars (max {max_chars})")
    if len(cues) and len(cues[0]["text"].split("\n")) > 2:
        add("warning", "subtitles", "more than two subtitle lines in a cue")

    # narration vs rendered animation duration
    if rendered:
        silent = data.get("mode", "silent") == "silent"
        for scene in data["scenes"]:
            if scene["id"] in rendered and scene.get("duration_seconds"):
                diff = rendered[scene["id"]] - scene["duration_seconds"]
                if abs(diff) <= max(3.0, 0.25 * scene["duration_seconds"]):
                    continue
                if diff > 0:
                    add("warning", scene["id"],
                        f"animation runs {diff:.1f}s after narration; it is over-paced "
                        f"(anim {rendered[scene['id']]:.1f}s vs narration {scene['duration_seconds']:.1f}s)")
                elif silent:
                    # Silent mode: the script paces the presenter, not the video length.
                    add("info", scene["id"],
                        f"silent render is {abs(diff):.1f}s shorter than the script "
                        f"({rendered[scene['id']]:.1f}s vs {scene['duration_seconds']:.1f}s); "
                        "the presenter speaks over the held final state")
                else:
                    add("warning", scene["id"],
                        f"animation runs {abs(diff):.1f}s before narration; it is under-paced")
    return findings


def summarize(findings: list[dict]) -> dict:
    return {"errors": sum(1 for f in findings if f["level"] == "error"),
            "warnings": sum(1 for f in findings if f["level"] == "warning"),
            "findings": findings}
