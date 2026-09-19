#!/usr/bin/env python3
"""Visual QA for a rendered method video.

Rendering successfully is not enough. This extracts frames, builds a contact
sheet, and flags cheap-to-detect problems:

    * long static periods (the explanation stalled)
    * near-empty frames (the scene failed to lay out)
    * content touching the frame border (clipping risk)

It does not pretend to judge scientific quality; the contact sheet is meant to
be looked at.

    python scripts/qa_video.py --input renders/draft/lesa-method-explainer.mp4 \
        --output qa --title "LESA draft"
"""

from __future__ import annotations

import argparse
import pathlib

import numpy as np
from PIL import Image

import _common as C
from extract_frames import duration_of, extract
from make_contact_sheet import build


def frame_stats(img: Image.Image, bg=(255, 255, 255), tol: int = 18):
    a = np.asarray(img.convert("RGB")).astype(int)
    dist = np.abs(a - np.array(bg)).sum(axis=2)
    nonbg = dist > tol * 3
    frac = nonbg.mean()
    h, w = nonbg.shape
    border = max(2, int(0.02 * min(h, w)))
    edge = np.zeros_like(nonbg)
    edge[:border, :] = True
    edge[-border:, :] = True
    edge[:, :border] = True
    edge[:, -border:] = True
    edge_hit = bool((nonbg & edge).sum() > 0.0015 * h * w)
    return frac, edge_hit, a


def qa(video: pathlib.Path, outdir: pathlib.Path, count: int, title: str | None):
    findings = []
    add = lambda level, msg: findings.append({"level": level, "message": msg})

    if not video.exists():
        C.fail(f"video not found: {video}")
    if video.stat().st_size == 0:
        C.fail(f"video is empty: {video}")

    dur = duration_of(video)
    add("info", f"duration {dur:.2f}s, size {video.stat().st_size / 1e6:.2f} MB")

    frames = extract(video, outdir / "frames", count)
    stats = []
    small = []
    for f in frames:
        im = Image.open(f)
        frac, edge_hit, arr = frame_stats(im)
        stats.append({"frame": f.name, "content_fraction": round(float(frac), 4), "edge_touch": edge_hit})
        small.append(np.asarray(im.convert("L").resize((64, 36))).astype(float))

    for s in stats:
        if s["content_fraction"] < 0.006:
            add("warning", f"{s['frame']}: frame looks nearly empty (content {s['content_fraction']:.4f})")
        if s["edge_touch"]:
            add("warning", f"{s['frame']}: content touches the frame border (possible clipping)")

    # long static period: consecutive near-identical frames
    static_run = 1
    for i in range(1, len(small)):
        diff = float(np.abs(small[i] - small[i - 1]).mean())
        if diff < 1.2:
            static_run += 1
        else:
            if static_run >= 4:
                add("warning", f"~{static_run} consecutive near-identical sampled frames (long static period)")
            static_run = 1
    if static_run >= 4:
        add("warning", f"~{static_run} consecutive near-identical sampled frames (long static period)")

    sheet = build(frames, outdir / "contact-sheet.png", cols=4, title=title)
    report = {"video": str(video), "duration_seconds": round(dur, 2), "frames": stats, "findings": findings}
    C.write_json(outdir / "qa_report.json", report)

    for f in findings:
        print(f"[{f['level']}] {f['message']}")
    errors = [f for f in findings if f["level"] == "error"]
    print(f"qa: {len(errors)} error(s), contact sheet -> {sheet}")
    return 1 if errors else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", default="qa")
    ap.add_argument("--count", type=int, default=12)
    ap.add_argument("--title", default=None)
    args = ap.parse_args()
    return qa(pathlib.Path(args.input), pathlib.Path(args.output), args.count, args.title)


if __name__ == "__main__":
    raise SystemExit(main())
