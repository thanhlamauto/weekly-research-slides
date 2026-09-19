#!/usr/bin/env python3
"""Reuse the narration as speaker notes for a deck.

    python scripts/export_speaker_notes.py --project examples/lesa

Writes transcript/speaker_notes.yaml mapping each scene (and, by order, each
slide) to its narration and takeaway. Editing PPT notes XML is left to a later
version; this manifest is the reliable bridge.
"""

from __future__ import annotations

import argparse
import json
import pathlib

import yaml

import _common as C


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    args = ap.parse_args()

    proj = C.load_project(pathlib.Path(args.project))
    tdir = proj["path"] / "transcript"
    src = tdir / "transcript.json"
    if not src.exists():
        C.fail(f"{src} not found; run build_transcript.py first")
    data = json.loads(src.read_text(encoding="utf-8"))

    notes = {"video": data["video"]["id"], "audience": data["audience"]["level"], "slides": []}
    for i, scene in enumerate(data["scenes"]):
        narration = "\n".join(b["text"].strip() for b in scene["narration"])
        notes["slides"].append({
            "slide_index": i + 1,
            "scene_id": scene["id"],
            "title": scene.get("title", ""),
            "narration": narration,
            "takeaway": scene.get("takeaway", ""),
            "duration_seconds": scene.get("duration_seconds"),
        })
    out = tdir / "speaker_notes.yaml"
    out.write_text(yaml.safe_dump(notes, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print(f"speaker notes -> {out} ({len(notes['slides'])} entries)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
