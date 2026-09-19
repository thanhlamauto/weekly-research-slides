"""Load and validate figure specs, and derive one from a method semantic model.

The method model is the shared scientific source; this module turns it into a
best-effort figure scaffold that a human or agent then refines. Wiring is a
default, not a claim.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any

import yaml
from jsonschema import Draft7Validator

SKILL_ROOT = pathlib.Path(__file__).resolve().parents[1]
SCHEMA_DIR = SKILL_ROOT / "schemas"


class FigureSpecError(Exception):
    pass


def _read(path: pathlib.Path) -> Any:
    if not path.exists():
        raise FigureSpecError(f"file not found: {path}")
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise FigureSpecError(f"invalid YAML in {path.name}: {exc}") from exc


def validate(data: Any, label: str = "figure_spec.yaml") -> None:
    schema = json.loads((SCHEMA_DIR / "figure_spec.schema.json").read_text(encoding="utf-8"))
    errors = sorted(Draft7Validator(schema).iter_errors(data), key=lambda e: list(e.path))
    if not errors:
        return
    lines = [f"  - {'/'.join(str(x) for x in e.path) or '<root>'}: {e.message}" for e in errors[:8]]
    more = "" if len(errors) <= 8 else f"\n  ... and {len(errors) - 8} more"
    raise FigureSpecError(f"{label} failed figure schema validation:\n" + "\n".join(lines) + more)


def load(path: str | pathlib.Path) -> dict:
    data = _read(pathlib.Path(path))
    validate(data, pathlib.Path(path).name)
    _check_references(data)
    return data


def _check_references(data: dict) -> None:
    ids = {n["id"] for n in data["nodes"]}
    if len(ids) != len(data["nodes"]):
        raise FigureSpecError("figure spec has duplicate node ids")
    fig_type = data["figure"].get("type")
    sem = [n.get("semantic_id") for n in data["nodes"] if n.get("semantic_id")]
    # comparison and delta figures deliberately reuse one semantic id across
    # panels (the whole point is that it is the same scientific concept).
    if fig_type not in ("method-comparison", "method-delta") and len(set(sem)) != len(sem):
        raise FigureSpecError("figure spec has duplicate semantic_id values")
    panel_ids = {p["id"] for p in data.get("panels", [])}
    for n in data["nodes"]:
        if n.get("panel") and n["panel"] not in panel_ids:
            raise FigureSpecError(f"node '{n['id']}' references unknown panel '{n['panel']}'")
    for e in data.get("edges", []):
        for end in ("from", "to"):
            if e[end] not in ids:
                raise FigureSpecError(f"edge references unknown node '{e[end]}'")
    for a in data.get("annotations", []):
        if a["target"] not in ids:
            raise FigureSpecError(f"annotation targets unknown node '{a['target']}'")


def _short(text: str, limit: int = 42) -> str:
    t = " ".join(str(text).split())
    if len(t) <= limit:
        return t
    cut = t[:limit].rsplit(" ", 1)[0]
    return (cut or t[:limit]) + "…"


def from_method_model(model: dict, *, figure_id: str | None = None,
                      style: str = "topconf-clean", figure_type: str = "method-overview") -> dict:
    """Synthesize a method-overview figure spec from a method semantic model."""
    m = model.get("method", {})
    name = m.get("name", "method")
    comps = model.get("components") or []
    mech = model.get("mechanism") or {}
    inputs = [str(x) for x in (mech.get("inputs") or [])]
    operations = [str(x) for x in (mech.get("operations") or [])]
    outputs = [str(x) for x in (mech.get("outputs") or [])]

    nodes: list[dict] = []
    edges: list[dict] = []
    order = 0

    input_ids = []
    for i, t in enumerate(inputs):
        nid = f"input_{i + 1}"
        nodes.append({"id": nid, "semantic_id": f"input.{i + 1}", "type": "input",
                      "label": _short(t), "panel": "mechanism", "column": 0, "order": i})
        input_ids.append(nid)

    core: list[str] = []
    if comps:
        for i, c in enumerate(comps):
            nid = str(c.get("id") or f"component_{i + 1}")
            nodes.append({"id": nid, "semantic_id": f"component.{nid}", "type": "learned-module",
                          "label": _short(c.get("name", nid)), "detail": c.get("description"),
                          "panel": "mechanism", "role": c.get("role", "ours"),
                          "column": 1 + i, "order": i})
            core.append(nid)
    else:
        for i, op in enumerate(operations):
            nid = f"op_{i + 1}"
            nodes.append({"id": nid, "semantic_id": f"operation.{i + 1}", "type": "module",
                          "label": _short(op), "panel": "mechanism", "role": "ours",
                          "column": 1 + i, "order": i})
            core.append(nid)

    output_col = 1 + len(core)
    output_ids = []
    for i, t in enumerate(outputs):
        nid = f"output_{i + 1}"
        nodes.append({"id": nid, "semantic_id": f"output.{i + 1}", "type": "output",
                      "label": _short(t), "panel": "mechanism", "column": output_col, "order": i})
        output_ids.append(nid)
    order = output_col + 1

    if not core:
        raise FigureSpecError("method model has no components or mechanism operations to draw")

    for iid in input_ids:
        edges.append({"from": iid, "to": core[0], "role": "data"})
    for a, b in zip(core, core[1:]):
        edges.append({"from": a, "to": b, "role": "computation"})
    for oid in output_ids:
        edges.append({"from": core[-1], "to": oid, "role": "computation"})

    annotations = []
    if model.get("key_observation"):
        ours = [n["id"] for n in nodes if n.get("role") == "ours"] or core
        annotations.append({"id": "ann_observation", "target": ours[0], "role": "note",
                            "text": _short(model["key_observation"], 110), "placement": "above"})

    return {
        "figure": {
            "id": figure_id or f"{m.get('short_name', 'method').lower()}_overview",
            "type": figure_type,
            "mode": m.get("kind", "ours"),
            "title": name,
            "purpose": model.get("motivation") or model.get("key_observation") or "",
            "method": m.get("short_name") or name,
            "style": style,
        },
        "panels": [{"id": "mechanism", "label": "Mechanism", "role": "mechanism"}],
        "nodes": nodes,
        "edges": edges,
        "annotations": annotations,
        "shared_concepts": [n["semantic_id"] for n in nodes if n.get("semantic_id")],
        "provenance": {"method_model": "method_model.yaml", "generated_by": "spec.from_method_model"},
    }
