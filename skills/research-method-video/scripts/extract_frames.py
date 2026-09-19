#!/usr/bin/env python3
"""Extract evenly spaced frames from a rendered video for visual QA.

    python scripts/extract_frames.py --input renders/draft/lesa_03_stage_dynamics.mp4 \
        --output qa/frames --count 10
"""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess

import _common as C


def duration_of(path: pathlib.Path) -> float:
    proc = C.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                  "-of", "json", str(path)])
    if proc.returncode != 0:
        C.fail(f"ffprobe failed on {path}")
    return float(json.loads(proc.stdout)["format"]["duration"])


def extract(video: pathlib.Path, outdir: pathlib.Path, count: int) -> list[pathlib.Path]:
    C.require_ffmpeg()
    if not video.exists():
        C.fail(f"video not found: {video}")
    outdir.mkdir(parents=True, exist_ok=True)
    dur = duration_of(video)
    frames = []
    for i in range(count):
        t = dur * (i + 0.5) / count
        out = outdir / f"{video.stem}_frame_{i:02d}.png"
        proc = C.run(["ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", str(video),
                      "-frames:v", "1", str(out)])
        if proc.returncode != 0 or not out.exists():
            C.fail(f"ffmpeg frame extraction failed at t={t:.2f}s")
        frames.append(out)
    return frames


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--count", type=int, default=10)
    args = ap.parse_args()

    video = pathlib.Path(args.input)
    frames = extract(video, pathlib.Path(args.output), args.count)
    for f in frames:
        print(f)
    print(f"extracted {len(frames)} frame(s) -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
