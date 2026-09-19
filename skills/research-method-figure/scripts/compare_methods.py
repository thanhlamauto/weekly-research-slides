#!/usr/bin/env python3
"""Build a normalized competitor-vs-ours comparison figure.

    python scripts/compare_methods.py --left competitor_method.yaml --right ours_method.yaml \
        --style topconf-clean --output comparison.drawio

Both methods are drawn with one shared style profile so the only visible
difference is the structural difference. The generated figure_spec is saved
next to the figure for reproducibility.
"""

from __future__ import annotations

import argparse
import pathlib

import yaml

import _common as C
import compare as compare_mod


def _model(path: str) -> dict:
    p = C.resolve(path)
    if not p.exists():
        C.fail(f"method model not found: {p}")
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--left", required=True, help="competitor method_model.yaml")
    ap.add_argument("--right", required=True, help="our method_model.yaml")
    ap.add_argument("--left-label", default="Competitor")
    ap.add_argument("--right-label", default="Ours")
    ap.add_argument("--style", default="topconf-clean")
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    spec = compare_mod.build_comparison(_model(args.left), _model(args.right),
                                        style=args.style, left_label=args.left_label,
                                        right_label=args.right_label)
    out = pathlib.Path(args.output)
    spec_path = out.with_suffix("").with_name(out.stem + "_spec.yaml")
    spec_path.parent.mkdir(parents=True, exist_ok=True)
    spec_path.write_text(yaml.safe_dump(spec, sort_keys=False, allow_unicode=True), encoding="utf-8")

    ir, _ = C.build_ir(spec, args.style)
    paths = C.write_artifacts(ir, out.with_suffix(""))
    print(f"comparison: {args.left_label} vs {args.right_label}")
    print(f"  shared components: {len(spec['comparison']['shared_components'])}")
    print(f"  {args.left_label}-only: {spec['comparison']['differences']['competitor_only']}")
    print(f"  {args.right_label}-only: {spec['comparison']['differences']['ours_only']}")
    print(f"  spec: {spec_path}")
    for kind, p in paths.items():
        print(f"  {kind}: {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
