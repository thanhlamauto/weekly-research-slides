#!/usr/bin/env python3
"""Video -> PowerPoint bridge.

Exports a representative still for each scene that declares a ``keyframe`` in
scene_spec.yaml, plus a machine-readable manifest the slide pipeline can read.

    python scripts/export_keyframes.py --project examples/lesa --quality draft \
        --video examples/lesa/renders/draft/lesa-method-explainer.mp4

Writes:
    examples/lesa/qa/keyframes/<scene_id>.png
    examples/lesa/qa/keyframes.yaml
"""

from __future__ import annotations

import argparse
import pathlib

import yaml

import _common as C
from extract_frames import duration_of


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    ap.add_argument("--quality", choices=["draft", "final"], default="draft")
    ap.add_argument("--video", default=None, help="concatenated mp4 to reference in the manifest")
    args = ap.parse_args()

    project = pathlib.Path(args.project)
    if not project.exists():
        project = C.REPO_ROOT / args.project
    proj = C.load_project(project)
    spec_data = proj["spec"]

    outdir = proj["path"] / "qa" / "keyframes"
    outdir.mkdir(parents=True, exist_ok=True)
    C.require_ffmpeg()

    manifest = {"video": args.video or "", "keyframes": []}
    for scene in spec_data["scenes"]:
        kf = scene.get("keyframe")
        if not kf:
            continue
        scene_video = proj["path"] / "renders" / args.quality / f"{scene['id']}.mp4"
        if not scene_video.exists():
            C.fail(f"missing rendered scene {scene_video}; render before exporting keyframes")
        dur = duration_of(scene_video)
        t = max(0.0, min(dur - 0.05, dur * float(kf["fraction"])))
        png = outdir / f"{scene['id']}.png"
        proc = C.run(["ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", str(scene_video),
                      "-frames:v", "1", str(png)])
        if proc.returncode != 0 or not png.exists():
            C.fail(f"failed to export keyframe for {scene['id']}")
        manifest["keyframes"].append({
            "scene": scene["id"],
            "title": scene["title"],
            "timestamp": round(t, 3),
            "purpose": kf["purpose"],
            "png": str(png.relative_to(proj["path"])),
        })

    manifest_path = proj["path"] / "qa" / "keyframes.yaml"
    manifest_path.write_text(yaml.safe_dump(manifest, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print(f"keyframes -> {manifest_path} ({len(manifest['keyframes'])} stills)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
