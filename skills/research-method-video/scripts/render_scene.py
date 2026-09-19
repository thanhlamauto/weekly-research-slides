#!/usr/bin/env python3
"""Render Manim scenes for a method-video project.

Examples:
    python scripts/render_scene.py --project examples/lesa --quality draft
    python scripts/render_scene.py --project examples/lesa --scene lesa_03_stage_dynamics
    python scripts/render_scene.py --project examples/lesa --quality final \
        --concat examples/lesa/renders/final/lesa-method-explainer.mp4

Rendering one scene is the fast iteration loop; render all only when needed.
"""

from __future__ import annotations

import argparse
import pathlib
import shutil
import sys

import _common as C
from spec import scene_ids, scene_by_id

QUALITY_FLAG = {"draft": "-ql", "final": "-qh"}


def render_one(project: pathlib.Path, scene: dict, quality: str, media_dir: pathlib.Path,
               timing_mode: str = "scene") -> pathlib.Path:
    cls = scene.get("manim_class")
    if not cls:
        C.fail(f"scene '{scene['id']}' has no manim_class in scene_spec.yaml")
    main_py = project / "src" / "main.py"
    if not main_py.exists():
        C.fail(f"missing Manim entry point: {main_py}")

    cmd = C.manim_command() + [
        QUALITY_FLAG[quality], "--disable_caching",
        "--media_dir", str(media_dir), str(main_py), cls,
    ]
    import os
    env = dict(os.environ)
    if timing_mode == "transcript":
        transcript = project / "transcript" / "transcript.json"
        if not transcript.exists():
            C.fail(f"--timing transcript needs {transcript}; run build_transcript.py first")
        env["WRS_TRANSCRIPT"] = str(transcript)
        env["WRS_PROJECT"] = str(project)
    proc = C.run(cmd, cwd=str(project / "src"), env=env)
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "").strip().splitlines()[-14:]
        C.fail(f"manim failed for scene '{scene['id']}' ({cls}):\n  " + "\n  ".join(tail))

    hits = sorted(media_dir.glob(f"**/{cls}.mp4"))
    if not hits:
        C.fail(f"manim reported success but produced no mp4 for {cls} under {media_dir}")
    out = project / "renders" / quality / f"{scene['id']}.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(hits[-1], out)
    return out


def concat(files: list[pathlib.Path], out: pathlib.Path) -> None:
    C.require_ffmpeg()
    out.parent.mkdir(parents=True, exist_ok=True)
    list_file = out.parent / "_concat.txt"
    list_file.write_text("\n".join(f"file '{f.resolve()}'" for f in files), encoding="utf-8")
    proc = C.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(list_file),
                  "-c", "copy", str(out)])
    if proc.returncode != 0:
        tail = (proc.stderr or "").strip().splitlines()[-10:]
        C.fail("ffmpeg concat failed:\n  " + "\n  ".join(tail))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa", help="project directory with scene_spec.yaml")
    ap.add_argument("--scene", action="append", default=[], help="scene id to render (repeatable)")
    ap.add_argument("--all", action="store_true", help="render every scene (default)")
    ap.add_argument("--quality", choices=["draft", "final"], default="draft")
    ap.add_argument("--timing", choices=["scene", "transcript"], default="scene",
                    help="'transcript' derives dwells from transcript/transcript.json")
    ap.add_argument("--concat", help="concatenate rendered scenes into this mp4")
    ap.add_argument("--media-dir", help="Manim media directory (defaults under the project)")
    ap.add_argument("--list", action="store_true", help="list scenes and exit")
    args = ap.parse_args()

    C.ensure_pkg_config()
    project = pathlib.Path(args.project)
    if not project.exists():
        project = C.REPO_ROOT / args.project
    proj = C.load_project(project)
    spec_data = proj["spec"]

    if args.list:
        for s in spec_data["scenes"]:
            print(f"  {s['id']:<28} {s.get('manim_class',''):<28} {s['title']}")
        return 0

    C.require_manim()
    C.require_ffmpeg()

    if args.scene:
        wanted = []
        for sid in args.scene:
            wanted.append(scene_by_id(spec_data, sid))
    else:
        wanted = [scene_by_id(spec_data, sid) for sid in scene_ids(spec_data)]

    media_dir = pathlib.Path(args.media_dir) if args.media_dir else proj["path"] / "renders" / "_media" / args.quality
    media_dir.mkdir(parents=True, exist_ok=True)

    outputs = []
    for scene in wanted:
        print(f"rendering {scene['id']} ({args.quality}) ...")
        out = render_one(proj["path"], scene, args.quality, media_dir, timing_mode=args.timing)
        outputs.append(out)
        print(f"  -> {out}")

    if args.concat:
        # concat in scene_spec order, using only what we rendered
        ordered = [o for sid in scene_ids(spec_data) for o in outputs if o.stem == sid]
        concat(ordered, pathlib.Path(args.concat))
        print(f"concatenated -> {args.concat}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
