"""Shared helpers for research-method-figure scripts."""

from __future__ import annotations

import json
import pathlib
import shutil
import subprocess
import sys

SKILL_ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = SKILL_ROOT / "src"
REPO_ROOT = SKILL_ROOT.parents[1]
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

import ir as ir_mod          # noqa: E402
import spec as spec_mod      # noqa: E402
import style as style_mod    # noqa: E402
import drawio as drawio_mod  # noqa: E402
import svg as svg_mod        # noqa: E402


def fail(message: str, code: int = 2):
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(code)


def resolve(path: str | pathlib.Path) -> pathlib.Path:
    p = pathlib.Path(path)
    return p if p.exists() else REPO_ROOT / path


def load_spec(path: str | pathlib.Path) -> dict:
    try:
        return spec_mod.load(resolve(path))
    except spec_mod.FigureSpecError as exc:
        fail(str(exc))


def load_style(name_or_path: str) -> dict:
    try:
        return style_mod.load(name_or_path)
    except style_mod.StyleError as exc:
        fail(str(exc))


def build_ir(spec: dict, style_name: str | None = None):
    if style_name:
        spec["figure"]["style"] = style_name
    profile = load_style(spec["figure"].get("style", "topconf-clean"))
    return ir_mod.build(spec, profile), profile


def svg_to_png(svg_text: str, out_png: pathlib.Path, zoom: int = 2) -> bool:
    rsvg = shutil.which("rsvg-convert")
    if not rsvg:
        return False
    tmp = out_png.with_suffix(".tmp.svg")
    tmp.write_text(svg_text, encoding="utf-8")
    r = subprocess.run([rsvg, "-z", str(zoom), "-o", str(out_png), str(tmp)],
                       capture_output=True, text=True)
    tmp.unlink(missing_ok=True)
    return r.returncode == 0 and out_png.exists()


def svg_to_pdf(svg_text: str, out_pdf: pathlib.Path) -> bool:
    rsvg = shutil.which("rsvg-convert")
    if not rsvg:
        return False
    tmp = out_pdf.with_suffix(".tmp.svg")
    tmp.write_text(svg_text, encoding="utf-8")
    r = subprocess.run([rsvg, "-f", "pdf", "-o", str(out_pdf), str(tmp)],
                       capture_output=True, text=True)
    tmp.unlink(missing_ok=True)
    return r.returncode == 0 and out_pdf.exists()


def write_artifacts(ir: dict, out_stem: pathlib.Path, formats=("drawio", "svg", "png", "pdf", "ir.json")) -> dict:
    out_stem.parent.mkdir(parents=True, exist_ok=True)
    paths = {}
    if "drawio" in formats:
        paths["drawio"] = out_stem.with_suffix(".drawio")
        paths["drawio"].write_text(drawio_mod.render(ir), encoding="utf-8")
    svg_text = svg_mod.render(ir) if ("svg" in formats or "png" in formats or "pdf" in formats) else None
    if "svg" in formats:
        paths["svg"] = out_stem.with_suffix(".svg")
        paths["svg"].write_text(svg_text, encoding="utf-8")
    if "png" in formats:
        png = out_stem.with_suffix(".png")
        if svg_to_png(svg_text, png):
            paths["png"] = png
    if "pdf" in formats:
        pdf = out_stem.with_suffix(".pdf")
        if svg_to_pdf(svg_text, pdf):
            paths["pdf"] = pdf
    if "ir.json" in formats:
        paths["ir"] = out_stem.with_suffix(".ir.json")
        paths["ir"].write_text(json.dumps(ir, indent=2), encoding="utf-8")
    return paths
