#!/usr/bin/env python3
"""Compose a contact sheet from rendered slide PNGs (PDF page renders).

    python scripts/pdf_contact_sheet.py --input <dir> --output sheet.png

Uses Pillow only; degrades with a clear error when it is unavailable.
"""

from __future__ import annotations

import argparse
import pathlib
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True, help="directory with slide-*.png renders")
    ap.add_argument("--output", required=True)
    ap.add_argument("--cols", type=int, default=3)
    ap.add_argument("--width", type=int, default=560, help="thumbnail width in pixels")
    ap.add_argument("--gap", type=int, default=18)
    ap.add_argument("--margin", type=int, default=24)
    args = ap.parse_args()

    try:
        from PIL import Image
    except Exception as exc:  # pragma: no cover
        print(f"error: Pillow is required for the contact sheet ({exc})", file=sys.stderr)
        return 2

    indir = pathlib.Path(args.input)
    files = sorted(
        (p for p in indir.glob("slide-*.png")),
        key=lambda p: int(p.stem.split("-")[-1]),
    )
    if not files:
        print(f"error: no slide-*.png in {indir}", file=sys.stderr)
        return 2

    thumbs = []
    for f in files:
        im = Image.open(f).convert("RGB")
        h = max(1, int(im.height * args.width / im.width))
        thumbs.append(im.resize((args.width, h), Image.LANCZOS))

    cols = max(1, args.cols)
    rows = (len(thumbs) + cols - 1) // cols
    cell_h = max(t.height for t in thumbs)
    sheet_w = args.margin * 2 + cols * args.width + (cols - 1) * args.gap
    sheet_h = args.margin * 2 + rows * cell_h + (rows - 1) * args.gap
    sheet = Image.new("RGB", (sheet_w, sheet_h), (255, 255, 255))

    for i, t in enumerate(thumbs):
        r, c = divmod(i, cols)
        x = args.margin + c * (args.width + args.gap)
        y = args.margin + r * (cell_h + args.gap)
        sheet.paste(t, (x, y))

    pathlib.Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.output)
    print(f"contact sheet: {len(thumbs)} page(s) -> {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
