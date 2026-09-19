#!/usr/bin/env python3
"""Validate a method_model.yaml and scene_spec.yaml against their schemas.

    python scripts/validate_spec.py --project examples/lesa
"""

from __future__ import annotations

import argparse
import pathlib

import _common as C
import spec as S


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--project", default="examples/lesa")
    args = ap.parse_args()

    project = pathlib.Path(args.project)
    if not project.exists():
        project = C.REPO_ROOT / args.project

    checks = []
    mm = project / "method_model.yaml"
    if mm.exists():
        try:
            S.load_method_model(mm)
            checks.append(f"OK  method_model.yaml")
        except S.SpecError as exc:
            C.fail(str(exc))
    else:
        checks.append("--  method_model.yaml (not present)")

    ss = project / "scene_spec.yaml"
    if not ss.exists():
        C.fail(f"missing {ss}")
    try:
        data = S.load_scene_spec(ss)
        checks.append(f"OK  scene_spec.yaml ({len(data['scenes'])} scenes)")
    except S.SpecError as exc:
        C.fail(str(exc))

    for line in checks:
        print(line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
