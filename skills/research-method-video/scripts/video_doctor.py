#!/usr/bin/env python3
"""Check the local environment for research-method-video.

    python scripts/video_doctor.py

Reports Python, Manim, ffmpeg, LaTeX (optional) and the bundled example, and
degrades gracefully when optional pieces are missing.
"""

from __future__ import annotations

import importlib.util
import shutil
import sys

import _common as C


def _mod(name: str):
    return importlib.util.find_spec(name) is not None


def main() -> int:
    print("research-method-video doctor")
    print(f"  python: {sys.version.split()[0]} ({sys.executable})")

    for name, why in (("yaml", "scene/method specs"), ("jsonschema", "spec validation"), ("PIL", "contact sheets")):
        ok = _mod(name)
        print(f"  {name}: {'OK' if ok else 'MISSING'}  ({why})")

    C.ensure_pkg_config()
    manim_ok = C.manim_available()
    print(f"  manim: {'OK' if manim_ok else 'MISSING'}  ({' '.join(C.manim_command())})")
    if manim_ok:
        out = C.run(C.manim_command() + ["--version"]).stdout.strip().splitlines()
        if out:
            print(f"    version: {out[-1]}")

    ffmpeg = shutil.which("ffmpeg")
    print(f"  ffmpeg: {'OK ' + ffmpeg if ffmpeg else 'MISSING'}  (frame extraction, concat)")

    latex = shutil.which("latex") or shutil.which("pdflatex")
    if latex:
        print(f"  latex: OK {latex}  (optional; v0.1 uses Pango Text)")
    else:
        print("  latex: not found  (optional; v0.1 works without LaTeX)")

    example = C.REPO_ROOT / "examples" / "lesa"
    print(f"  example: {'OK ' + str(example) if example.exists() else 'MISSING ' + str(example)}")

    if not (manim_ok and ffmpeg):
        print("\nNot ready: install the missing required pieces above before rendering.")
        return 1
    print("\nReady to render.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
