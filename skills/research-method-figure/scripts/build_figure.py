#!/usr/bin/env python3
"""Build an editable scientific figure from a figure spec or a method model.

    python scripts/build_figure.py --method method_model.yaml --style topconf-clean \
        --output runs/my-method/figure.drawio
    python scripts/build_figure.py --spec figure_spec.yaml --output figure.drawio

Writes .drawio (canonical), plus .svg, .png, .pdf and an .ir.json when the
corresponding renderers are available.
"""

from __future__ import annotations

import argparse
import pathlib

import _common as C
import spec as spec_mod


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--spec", help="figure_spec.yaml")
    src.add_argument("--method", help="method_model.yaml (synthesizes a spec)")
    ap.add_argument("--style", default=None, help="style profile name or path")
    ap.add_argument("--type", default="method-overview", help="figure type when --method is used")
    ap.add_argument("--id", dest="figure_id", default=None)
    ap.add_argument("--output", required=True, help="output stem, e.g. figure.drawio")
    ap.add_argument("--formats", default="drawio,svg,png,pdf,ir.json")
    args = ap.parse_args()

    if args.spec:
        spec = C.load_spec(args.spec)
    else:
        import yaml
        model_path = C.resolve(args.method)
        if not model_path.exists():
            C.fail(f"method model not found: {model_path}")
        model = yaml.safe_load(model_path.read_text(encoding="utf-8"))
        try:
            spec = spec_mod.from_method_model(model, style=args.style or "topconf-clean",
                                              figure_id=args.figure_id, figure_type=args.type)
        except spec_mod.FigureSpecError as exc:
            C.fail(str(exc))

    ir, profile = C.build_ir(spec, args.style)
    out = pathlib.Path(args.output)
    formats = tuple(f.strip() for f in args.formats.split(",") if f.strip())
    paths = C.write_artifacts(ir, out.with_suffix(""), formats=formats)
    print(f"figure '{ir['figure']['id']}' ({ir['figure']['type']})")
    print(f"  style: {ir['style']['name']}  nodes: {len(ir['nodes'])}  edges: {len(ir['edges'])}")
    for kind, p in paths.items():
        print(f"  {kind}: {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
