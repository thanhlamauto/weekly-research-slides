#!/usr/bin/env python3
"""Build a method-delta figure between two versions of our method.

    python scripts/method_delta.py --prev method_v3.yaml --curr method_v4.yaml \
        --style topconf-clean --output delta.drawio

Unchanged components keep their position and are muted; added and removed
components are highlighted.
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
    ap.add_argument("--prev", required=True)
    ap.add_argument("--curr", required=True)
    ap.add_argument("--style", default="topconf-clean")
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    spec = compare_mod.build_delta(_model(args.prev), _model(args.curr), style=args.style)
    out = pathlib.Path(args.output)
    spec_path = out.with_suffix("").with_name(out.stem + "_spec.yaml")
    spec_path.parent.mkdir(parents=True, exist_ok=True)
    spec_path.write_text(yaml.safe_dump(spec, sort_keys=False, allow_unicode=True), encoding="utf-8")

    ir, _ = C.build_ir(spec, args.style)
    paths = C.write_artifacts(ir, out.with_suffix(""))
    print("method delta")
    print(f"  unchanged: {len(spec['comparison']['shared_components'])}")
    print(f"  added/changed: {spec['comparison']['differences']['ours_only']}")
    print(f"  spec: {spec_path}")
    for kind, p in paths.items():
        print(f"  {kind}: {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
