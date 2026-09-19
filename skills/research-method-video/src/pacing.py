"""Audience-aware pacing checks for a method-video scene spec.

The LESA review showed the first cut assumed too much background for a
non-expert viewer. Pacing is not solved by slowing every animation uniformly;
it is solved by introducing terminology before symbols, keeping one new concept
per beat, and holding a stable final state long enough to read.

This module returns advisory findings; it never blocks a render.
"""

from __future__ import annotations

ANCHOR_PATTERNS = {"ESTABLISH", "BUILD", "REVEAL", "RECAP", "REPLAY", "ZOOM", "FOCUS"}
SETTLE_PATTERNS = {"REVEAL", "RECAP", "ESTABLISH", "STAGE-SPLIT", "MORPH", "BUILD", "COMPARE"}

GUIDANCE = {
    "expert": "Assume the audience knows the notation; keep equations early.",
    "adjacent-researcher": "Introduce each object before its symbol; one new concept per beat; hold key states.",
    "general-technical": "Add a visual analogy; avoid equations until the objects exist; longer dwell on key states.",
}


def findings(spec: dict) -> list[dict]:
    audience = (spec.get("video") or {}).get("audience", "expert")
    if audience == "expert":
        return []
    out: list[dict] = []
    add = lambda scene, msg: out.append({"level": "warning", "where": scene, "message": msg})

    for scene in spec.get("scenes", []):
        beats = scene.get("beats", [])
        patterns = [b["pattern"] for b in beats]
        sid = scene["id"]
        if len(beats) < 3:
            add(sid, f"only {len(beats)} beat(s) for a '{audience}' viewer; split the idea")
        if patterns and patterns[0] not in ANCHOR_PATTERNS:
            add(sid, "first beat does not establish an object before using it")
        if patterns and patterns[-1] not in SETTLE_PATTERNS:
            add(sid, "scene does not end on a stable state (no comprehension beat)")
        if audience == "general-technical":
            actors = scene.get("actors", [])
            if not actors:
                add(sid, "no persistent actors; a general-technical viewer needs concrete objects")
        # an equation reveal should be preceded by a BUILD/ESTABLISH of its inputs
        for i, b in enumerate(beats):
            if b["pattern"] == "REVEAL" and "=" in str(b.get("action", "")):
                if not any(p in ("BUILD", "ESTABLISH") for p in patterns[:i]):
                    add(sid, "equation revealed before its inputs were built")
    return out
