#!/usr/bin/env python3
"""Source-level animation lint for a method-video project.

Warns about suspicious patterns; it never rewrites source. Exit code is 1 only
for errors (broken spec, missing scene class, placeholder content).

    python scripts/lint_scenes.py --project examples/lesa [--json]
"""

from __future__ import annotations

import argparse
import pathlib
import re

import _common as C
import pacing as pacing_mod

PLACEHOLDER = re.compile(r"\b(TODO|TBD|FIXME|lorem ipsum|placeholder|xxx+)\b", re.I)
FADEOUT = re.compile(r"\bFadeOut\(")
FADEIN = re.compile(r"\bFadeIn\(")
TRANSFORM = re.compile(r"\b(ReplacementTransform|TransformMatchingShapes|TransformFromCopy|Transform)\(")
WAIT = re.compile(r"self\.wait\(\s*([0-9]*\.?[0-9]+)")


def lint(project: pathlib.Path, spec_data: dict):
    findings = []
    add = lambda level, where, msg: findings.append({"level": level, "where": where, "message": msg})

    # --- spec-level ---
    for scene in spec_data["scenes"]:
        sid = scene["id"]
        if not scene.get("manim_class"):
            add("error", sid, "scene has no manim_class")
        if not scene.get("purpose"):
            add("error", sid, "scene has no purpose")
        if not scene.get("start_state") or not scene.get("end_state"):
            add("warning", sid, "scene should describe start_state and end_state")
        patterns = [b["pattern"] for b in scene["beats"]]
        if patterns and set(patterns) <= {"ESTABLISH"}:
            add("warning", sid, "every beat is ESTABLISH; movement may add no explanatory value")
        if not any(p in patterns for p in ("TRACE", "MORPH", "TRAJECTORY", "STAGE-SPLIT", "ACCUMULATION", "CORRECTION", "BUILD", "REPLAY")):
            add("warning", sid, "no object-transformation beat; consider whether a static diagram suffices")
        for field in ("title", "purpose", "question", "start_state", "end_state"):
            if isinstance(scene.get(field), str) and PLACEHOLDER.search(scene[field]):
                add("error", sid, f"placeholder text in {field}")
        for actor in scene.get("actors", []):
            if isinstance(actor.get("label"), str) and PLACEHOLDER.search(actor["label"]):
                add("error", sid, f"placeholder label on actor {actor['id']}")

    # --- source-level ---
    src_files = sorted((project / "src").rglob("*.py"))
    if not src_files:
        add("error", "src", "no Python source found under src/")
    class_names = set()
    text = ""
    for f in src_files:
        body = f.read_text(encoding="utf-8")
        text += body
        class_names.update(re.findall(r"class\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(", body))
        for m in PLACEHOLDER.finditer(body):
            add("error", f.name, f"placeholder text: {m.group(0)}")

    for scene in spec_data["scenes"]:
        cls = scene.get("manim_class")
        if cls and cls not in class_names:
            add("error", scene["id"], f"manim_class {cls} is not defined in src/")

    n_fadeout = len(FADEOUT.findall(text))
    n_fadein = len(FADEIN.findall(text))
    n_transform = len(TRANSFORM.findall(text))
    if n_fadeout > 4 and n_transform < n_fadeout:
        add("warning", "src", f"fade-heavy ({n_fadeout} FadeOut vs {n_transform} transforms); "
                             "prefer transforms when objects represent the same entity")
    waits = [float(x) for x in WAIT.findall(text)]
    long_waits = [w for w in waits if w > 2.0]
    if long_waits:
        add("warning", "src", f"{len(long_waits)} long Wait(>2.0s): {long_waits}")

    # persistent-actor identity drift: same actor id, different type/label
    seen: dict[str, tuple] = {}
    for scene in spec_data["scenes"]:
        for actor in scene.get("actors", []):
            key = actor["id"]
            sig = (actor.get("type"), actor.get("label"))
            if key in seen and seen[key][0] != sig[0]:
                add("warning", scene["id"], f"actor '{key}' changes type across scenes "
                                            f"({seen[key][0]} -> {sig[0]})")
            else:
                seen.setdefault(key, sig)
    return findings


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    project = pathlib.Path(args.project)
    if not project.exists():
        project = C.REPO_ROOT / args.project
    proj = C.load_project(project)
    findings = lint(proj["path"], proj["spec"])
    findings.extend(pacing_mod.findings(proj["spec"]))

    if args.json:
        C.write_json(proj["path"] / "qa" / "lint_report.json", {"findings": findings})
    errors = [f for f in findings if f["level"] == "error"]
    warnings = [f for f in findings if f["level"] == "warning"]
    for f in findings:
        print(f"[{f['level']}] {f['where']}: {f['message']}")
    print(f"lint: {len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
