#!/usr/bin/env python3
"""Validate a figure spec, a style profile, or a source inventory."""

from __future__ import annotations

import argparse

import _common as C
import roles as roles_mod
import spec as spec_mod
import style as style_mod


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--spec")
    ap.add_argument("--style")
    ap.add_argument("--inventory")
    args = ap.parse_args()
    if not (args.spec or args.style or args.inventory):
        C.fail("provide at least one of --spec, --style, --inventory")

    if args.spec:
        spec_mod.load(C.resolve(args.spec))
        print(f"OK  figure spec: {args.spec}")
    if args.style:
        style_mod.load(args.style)
        print(f"OK  style profile: {args.style}")
    if args.inventory:
        inv = roles_mod.load(C.resolve(args.inventory))
        print("OK  source inventory:")
        print(roles_mod.summary(inv))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
