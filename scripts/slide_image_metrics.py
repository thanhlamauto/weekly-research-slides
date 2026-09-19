#!/usr/bin/env python3
"""Pixel metrics for rendered slide images (used by the visual critic).

    python scripts/slide_image_metrics.py --input <dir> --output metrics.json

Reports, per image: ink ratio, whether ink touches the frame border, a 3x3
density grid, the centre-of-mass offset (balance) and a coarse colour count.
This is programmatic visual inspection, not a vision model.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--tol", type=int, default=28)
    args = ap.parse_args()

    try:
        import numpy as np
        from PIL import Image
    except Exception as exc:  # pragma: no cover
        print(f"error: Pillow and numpy are required for image metrics ({exc})", file=sys.stderr)
        return 2

    indir = pathlib.Path(args.input)
    files = sorted(p for p in indir.glob("*.png") if not p.name.startswith("contact"))
    if not files:
        print(f"error: no slide PNGs in {indir}", file=sys.stderr)
        return 2

    images = []
    for f in files:
        im = Image.open(f).convert("RGB")
        arr = np.asarray(im).astype(int)
        h, w, _ = arr.shape
        bg = arr[0, 0]
        mask = (np.abs(arr - bg).sum(axis=2) > args.tol * 3)
        ink = float(mask.mean())
        b = max(2, int(0.02 * min(h, w)))
        edge = mask.copy()
        edge[b:-b, b:-b] = False
        border_touch = bool(edge.sum() > 0.0015 * h * w)
        gy, gx = h // 3, w // 3
        grid = [float(mask[i * gy:(i + 1) * gy if i < 2 else h,
                           j * gx:(j + 1) * gx if j < 2 else w].mean())
                for i in range(3) for j in range(3)]
        ys, xs = np.nonzero(mask)
        if len(xs):
            com_dx = float(xs.mean() / w - 0.5)
            com_dy = float(ys.mean() / h - 0.5)
        else:
            com_dx = com_dy = 0.0
        q = (arr // 64)
        colors = int(len(np.unique(q.reshape(-1, 3), axis=0)))
        # dominant colours: quantized colours covering >1% of pixels and not
        # near-gray (anti-aliasing produces many near-gray shades).
        flat = q.reshape(-1, 3)
        uniq, counts = np.unique(flat, axis=0, return_counts=True)
        total = flat.shape[0]
        dominant = 0
        for c, n in zip(uniq, counts):
            if n / total > 0.01 and int(c.max()) - int(c.min()) > 25:
                dominant += 1
        images.append({
            "file": f.name, "width": w, "height": h,
            "ink_ratio": round(ink, 4), "border_touch": border_touch,
            "grid": [round(v, 4) for v in grid],
            "grid_min": round(min(grid), 4), "grid_max": round(max(grid), 4),
            "grid_ratio": round(max(grid) / max(1e-4, min(grid)), 2),
            "com_dx": round(com_dx, 3), "com_dy": round(com_dy, 3),
            "colors": colors, "dominant_colors": int(dominant),
        })
    pathlib.Path(args.output).write_text(json.dumps({"images": images}, indent=2), encoding="utf-8")
    print(f"image metrics: {len(images)} image(s) -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
