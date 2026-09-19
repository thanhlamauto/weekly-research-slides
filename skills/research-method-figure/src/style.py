"""Load, validate and resolve figure style profiles."""

from __future__ import annotations

import copy
import json
import pathlib
from typing import Any

import yaml
from jsonschema import Draft7Validator

import typography

SKILL_ROOT = pathlib.Path(__file__).resolve().parents[1]
STYLE_DIR = SKILL_ROOT / "styles"
SCHEMA_DIR = SKILL_ROOT / "schemas"

DEFAULT_EDGE = {"style": "solid", "arrowhead": "classic"}
REQUIRED_SEMANTICS = ["shared", "competitor", "ours", "auxiliary", "neutral"]


class StyleError(Exception):
    pass


def _read_yaml(path: pathlib.Path) -> Any:
    if not path.exists():
        raise StyleError(f"style profile not found: {path}")
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise StyleError(f"invalid YAML in {path.name}: {exc}") from exc


def _validate(data: Any, label: str) -> None:
    schema = json.loads((SCHEMA_DIR / "style_profile.schema.json").read_text(encoding="utf-8"))
    errors = sorted(Draft7Validator(schema).iter_errors(data), key=lambda e: list(e.path))
    if errors:
        lines = [f"  - {'/'.join(str(x) for x in e.path) or '<root>'}: {e.message}" for e in errors[:8]]
        raise StyleError(f"{label} failed style schema validation:\n" + "\n".join(lines))


def resolve_path(name_or_path: str) -> pathlib.Path:
    p = pathlib.Path(name_or_path)
    if p.exists():
        return p
    if (STYLE_DIR / f"{name_or_path}.yaml").exists():
        return STYLE_DIR / f"{name_or_path}.yaml"
    if (STYLE_DIR / name_or_path).exists():
        return STYLE_DIR / name_or_path
    if (STYLE_DIR / "user" / f"{name_or_path}.yaml").exists():
        return STYLE_DIR / "user" / f"{name_or_path}.yaml"
    raise StyleError(f"unknown style '{name_or_path}'; expected a preset in styles/ or a path")


def load(name_or_path: str) -> dict:
    path = resolve_path(name_or_path)
    data = _read_yaml(path)
    _validate(data, path.name)
    return data["style_profile"]


def _deep_merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def resolve(profile: dict) -> dict:
    """Fill defaults, resolve the font, and normalise the style."""
    style = copy.deepcopy(profile)
    if style.get("based_on"):
        try:
            style = _deep_merge(load(style["based_on"]), style)
        except StyleError:
            pass
    style.setdefault("canvas", {"background": "#FFFFFF", "width": 1200, "height": 620})
    style["canvas"].setdefault("background", "#FFFFFF")
    style["canvas"].setdefault("width", 1200)
    style["canvas"].setdefault("height", 620)

    typo = style.setdefault("typography", {})
    family = typo.get("family", "Arial")
    resolved, note = typography.resolve_family(family, typo.get("fallback"))
    typo["family"] = resolved
    typo["_requested_family"] = family
    typo["_font_note"] = note
    for role, defaults in {
        "title": {"size": 15, "weight": 700},
        "subtitle": {"size": 10, "weight": 400},
        "module": {"size": 9.5, "weight": 600},
        "label": {"size": 8, "weight": 600},
        "annotation": {"size": 8, "weight": 400},
        "panel_label": {"size": 9, "weight": 700},
    }.items():
        typo.setdefault(role, {})
        typo[role].setdefault("size", defaults["size"])
        typo[role].setdefault("weight", defaults["weight"])

    style.setdefault("geometry", {})
    for k, v in {"corner_radius": 6, "stroke_width": 1.1, "arrow_width": 1.2,
                 "panel_stroke_width": 1.0, "panel_dash": "6 4"}.items():
        style["geometry"].setdefault(k, v)

    style.setdefault("spacing", {})
    for k, v in {"base": 8, "margin": 26, "panel_gap": 24, "node_gap": 16,
                 "row_gap": 20, "padding": 8}.items():
        style["spacing"].setdefault(k, v)

    sem = style.setdefault("semantics", {})
    defaults = {"shared": "#6B7280", "competitor": "#D97706", "ours": "#2563EB",
                "auxiliary": "#059669", "neutral": "#374151", "changed": "#7C3AED",
                "added": "#047857", "removed": "#B91C1C"}
    for k, v in defaults.items():
        sem.setdefault(k, v)

    edges = style.setdefault("edges", {})
    for role in ["computation", "reuse", "reference", "feedback", "loss", "data", "gradient"]:
        edges.setdefault(role, dict(DEFAULT_EDGE))
        edges[role].setdefault("style", DEFAULT_EDGE["style"])
        edges[role].setdefault("arrowhead", DEFAULT_EDGE["arrowhead"])
    return style


def text(style: dict, role: str) -> dict:
    typo = style["typography"]
    t = typo.get(role, typo.get("module", {}))
    color = t.get("color") or style["semantics"].get("neutral", "#374151")
    return {
        "size": t.get("size", 9),
        "weight": t.get("weight", 400),
        "color": color,
        "family": typo.get("family", "sans-serif"),
    }


def semantic_color(style: dict, role: str | None) -> str:
    sem = style["semantics"]
    return sem.get(role or "neutral", sem.get("neutral", "#374151"))


def edge_style(style: dict, role: str | None) -> dict:
    e = dict(style["edges"].get(role or "computation", DEFAULT_EDGE))
    e.setdefault("color", style["semantics"].get("neutral", "#374151"))
    return e
