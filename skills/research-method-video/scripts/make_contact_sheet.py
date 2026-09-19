#!/usr/bin/env python3
"""Build a contact sheet from extracted frames.

    python scripts/make_contact_sheet.py --input qa/frames --output qa/contact-sheet.png \
        --cols 4 --title "LESA method explainer - draft"
"""

from __future__ import annotations

import argparse
import pathlib

from PIL import Image, ImageDraw

import _common as C


def build(frames: list[pathlib.Path], out: pathlib.Path, cols: int = 4,
          width: int = 460, title: str | None = None) -> pathlib.Path:
    if not frames:
        C.fail("no frames to compose")
    thumbs = []
    for f in frames:
        im = Image.open(f).convert("RGB")
        ratio = width / im.width
        thumbs.append((f, im.resize((width, int(im.height * ratio)), Image.LANCZOS)))
    cell_h = max(t.height for _, t in thumbs)
    label_h = 22
    rows = (len(thumbs) + cols - 1) // cols
    pad = 14
    title_h = 46 if title else 0
    W = cols * width + (cols + 1) * pad
    H = title_h + rows * (cell_h + label_h) + (rows + 1) * pad
    sheet = Image.new("RGB", (W, H), "#F3F4F6")
    draw = ImageDraw.Draw(sheet)
    if title:
        draw.text((pad + 4, 14), title, fill="#111827")
    for i, (f, t) in enumerate(thumbs):
        c = i % cols
        r = i // cols
        x = pad + c * (width + pad)
        y = title_h + pad + r * (cell_h + label_h)
        sheet.paste(t, (x, y))
        draw.rectangle([x - 1, y - 1, x + width, y + t.height], outline="#D1D5DB")
        draw.text((x + 2, y + t.height + 4), f.stem[:64], fill="#6B7280")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True, help="directory of frame PNGs")
    ap.add_argument("--output", required=True)
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--width", type=int, default=460)
    ap.add_argument("--title", default=None)
    args = ap.parse_args()

    indir = pathlib.Path(args.input)
    frames = sorted(indir.glob("*.png"))
    if not frames:
        C.fail(f"no PNG frames found in {indir}")
    out = build(frames, pathlib.Path(args.output), args.cols, args.width, args.title)
    print(f"contact sheet -> {out} ({len(frames)} frames)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
