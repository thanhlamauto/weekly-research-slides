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

    # narration backends (never prints credential contents)
    try:
        from audio import voice_backends
        backends = voice_backends()
    except Exception as exc:  # pragma: no cover
        backends = {}
        print(f"  voice backends: unavailable ({exc})")
    if backends:
        gem = backends["gemini"]
        gem_status = "OK" if gem["available"] else "UNAVAILABLE"
        if gem.get("mode") == "adc-gcloud-user":
            gem_status = "WARNING"
        print(f"  Gemini TTS: {gem_status}  ({gem['detail']})")
        print(f"    model: gemini-2.5-flash-preview-tts (configurable); voice: Kore (configurable)")
        say = backends["macos-say"]
        print(f"  macOS say: {'OK' if say['available'] else 'UNAVAILABLE'}  ({say['detail']})")
        rec = backends["recorded"]
        print(f"  recorded alignment: OK  ({rec['detail']})")
        print(f"    WhisperX: {'OK' if shutil.which('whisperx') or _mod('whisperx') else 'optional / unavailable'}")

    latex = shutil.which("latex") or shutil.which("pdflatex")
    if latex:
        print(f"  latex: OK {latex}  (optional; v0.1 uses Pango Text)")
    else:
        print("  latex: not found  (optional; v0.1 works without LaTeX)")

    # typography: the theme font must exist or Manim silently substitutes
    import subprocess
    try:
        fams = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True, timeout=20).stdout
    except Exception:
        fams = ""
    theme_font = "Helvetica Neue"
    if fams:
        present = theme_font.lower() in fams.lower()
        print(f"  theme font: {theme_font}: {'OK' if present else 'MISSING (Pango will substitute)'}")
        if not present:
            print("    set theme.FONT to an installed family for consistent typography")
    else:
        print(f"  theme font: {theme_font}: unknown (fc-list unavailable)")

    example = C.REPO_ROOT / "examples" / "lesa"
    print(f"  example: {'OK ' + str(example) if example.exists() else 'MISSING ' + str(example)}")

    if not (manim_ok and ffmpeg):
        print("\nNot ready: install the missing required pieces above before rendering.")
        return 1
    print("\nReady to render.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
