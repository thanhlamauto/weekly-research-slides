#!/usr/bin/env python3
"""Extract a reusable style profile from a reference figure.

    python scripts/extract_style.py --reference reference.svg --name paper-style

Writes styles/user/<name>.yaml and, with --preview-spec, renders a sample
figure in the extracted style so the result can be inspected.
"""

from __future__ import annotations

import argparse
import pathlib

import yaml

import _common as C
import extract as extract_mod


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--reference", required=True, help="reference .svg, .drawio, .png or .jpg")
    ap.add_argument("--name", required=True, help="style profile name")
    ap.add_argument("--output", default=None, help="output path (default styles/user/<name>.yaml)")
    ap.add_argument("--preview-spec", default=None, help="figure_spec.yaml to render in the new style")
    ap.add_argument("--preview-output", default=None)
    args = ap.parse_args()

    try:
        profile = extract_mod.extract(C.resolve(args.reference), args.name)
    except extract_mod.ExtractError as exc:
        C.fail(str(exc))

    out = pathlib.Path(args.output) if args.output else (C.SKILL_ROOT / "styles" / "user" / f"{args.name}.yaml")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(yaml.safe_dump(profile, sort_keys=False, allow_unicode=True), encoding="utf-8")
    sem = profile["style_profile"]["semantics"]
    conf = profile["style_profile"]["confidence"]["font_family"]["confidence"]
    print(f"style '{args.name}' -> {out}")
    print(f"  background {profile['style_profile']['canvas']['background']}")
    print(f"  palette {sem}")
    print(f"  font-family confidence: {conf}")

    if args.preview_spec:
        spec = C.load_spec(args.preview_spec)
        ir, _ = C.build_ir(spec, str(out))
        target = pathlib.Path(args.preview_output) if args.preview_output else out.with_suffix(".preview")
        paths = C.write_artifacts(ir, target.with_suffix(""), formats=("svg", "png"))
        for kind, p in paths.items():
            print(f"  preview {kind}: {p}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
