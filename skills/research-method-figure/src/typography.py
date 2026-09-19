"""Shared typography policy.

One place to resolve a requested font against what is actually installed, so a
figure, a slide and a Manim clip do not silently fall back to three different
faces.
"""

from __future__ import annotations

import subprocess

CANONICAL_FALLBACKS = [
    "Helvetica Neue",
    "Helvetica",
    "Arial",
    "DejaVu Sans",
    "Liberation Sans",
    "sans-serif",
]

_CACHE: set[str] | None = None


def available_fonts() -> set[str]:
    global _CACHE
    if _CACHE is not None:
        return _CACHE
    fonts: set[str] = set()
    try:
        out = subprocess.run(["fc-list", ":", "family"], capture_output=True, text=True, timeout=20)
        for line in out.stdout.splitlines():
            for name in line.split(","):
                fonts.add(name.strip())
    except Exception:
        pass
    if not fonts:
        # macOS fallback list if fontconfig is unavailable.
        fonts = {"Helvetica Neue", "Helvetica", "Arial", "Menlo", "Times New Roman", "sans-serif"}
    _CACHE = fonts
    return fonts


def is_available(family: str) -> bool:
    if not family or family == "sans-serif":
        return True
    fams = available_fonts()
    if family in fams:
        return True
    low = family.lower()
    return any(low == f.lower() for f in fams)


def resolve_family(requested: str, fallback: list[str] | None = None) -> tuple[str, str | None]:
    """Return (family, note). Note is set when a fallback was used."""
    chain = [requested] + list(fallback or []) + CANONICAL_FALLBACKS
    seen = set()
    for fam in chain:
        if not fam or fam in seen:
            continue
        seen.add(fam)
        if is_available(fam):
            if fam != requested:
                return fam, f"requested '{requested}' unavailable; using '{fam}'"
            return fam, None
    return "sans-serif", f"no requested font available; using generic sans-serif"


def check(family: str, fallback: list[str] | None = None) -> dict:
    resolved, note = resolve_family(family, fallback)
    return {"requested": family, "resolved": resolved, "available": is_available(family), "note": note}
