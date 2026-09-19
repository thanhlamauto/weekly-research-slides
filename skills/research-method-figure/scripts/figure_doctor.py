#!/usr/bin/env python3
"""Check the environment for research-method-figure."""

from __future__ import annotations

import importlib.util
import shutil
import sys

import _common as C
import style as style_mod
import typography


def _mod(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def main() -> int:
    print("research-method-figure doctor")
    print(f"  python: {sys.version.split()[0]}")
    ok = True
    for name, why in (("yaml", "figure/style specs"), ("jsonschema", "validation"),
                      ("PIL", "raster style extraction")):
        present = _mod(name)
        ok = ok and present
        print(f"  {name}: {'OK' if present else 'MISSING'}  ({why})")

    rsvg = shutil.which("rsvg-convert")
    print(f"  rsvg-convert: {'OK ' + rsvg if rsvg else 'MISSING'}  (SVG -> PNG/PDF export)")
    drawio = shutil.which("drawio") or shutil.which("draw.io")
    print(f"  drawio CLI: {drawio or 'not found'}  (optional: native .drawio rasterization)")
    pdftoppm = shutil.which("pdftoppm")
    print(f"  pdftoppm: {pdftoppm or 'not found'}  (optional)")

    presets = sorted(p.stem for p in (C.SKILL_ROOT / "styles").glob("*.yaml"))
    print(f"  style presets: {', '.join(presets) or 'none'}")
    check = typography.check("Arial", ["Helvetica", "Helvetica Neue", "DejaVu Sans"])
    print(f"  font: requested {check['requested']} -> resolved {check['resolved']}"
          + (f"  ({check['note']})" if check["note"] else ""))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
