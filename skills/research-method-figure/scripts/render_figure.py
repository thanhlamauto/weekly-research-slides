#!/usr/bin/env python3
"""Re-render a figure from its spec, optionally under a different style.

    python scripts/render_figure.py --spec figure_spec.yaml --style grayscale-paper \
        --output figure.svg --format svg

The canonical editable artifact is the .drawio produced by build_figure.py;
this script is for restyling and export without touching scientific content.
"""

from __future__ import annotations

import argparse
import pathlib

import _common as C


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--spec", required=True)
    ap.add_argument("--style", default=None)
    ap.add_argument("--output", required=True)
    ap.add_argument("--format", default="svg", choices=["svg", "png", "pdf", "drawio", "ir.json"])
    args = ap.parse_args()

    spec = C.load_spec(args.spec)
    ir, _ = C.build_ir(spec, args.style)
    out = pathlib.Path(args.output).with_suffix("")
    paths = C.write_artifacts(ir, out, formats=(args.format,))
    if args.format not in paths:
        C.fail(f"could not render {args.format}; is the required tool installed?")
    print(f"{args.format}: {paths[args.format]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
