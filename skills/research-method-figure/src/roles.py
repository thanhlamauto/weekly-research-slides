"""Source-role classification.

Every input is classified as CONTENT_SOURCE, STRUCTURE_SOURCE, STYLE_SOURCE,
LAYOUT_SOURCE or ASSET_SOURCE. A STYLE_SOURCE controls visual grammar only and
must never inject scientific labels, architecture, claims, data or logos.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any

import yaml
from jsonschema import Draft7Validator

SCHEMA_DIR = pathlib.Path(__file__).resolve().parents[1] / "schemas"
ROLES = ["CONTENT_SOURCE", "STRUCTURE_SOURCE", "STYLE_SOURCE", "LAYOUT_SOURCE", "ASSET_SOURCE"]


class RoleError(Exception):
    pass


def load(path: str | pathlib.Path) -> dict:
    p = pathlib.Path(path)
    if not p.exists():
        raise RoleError(f"source inventory not found: {p}")
    data = yaml.safe_load(p.read_text(encoding="utf-8"))
    validate(data, p.name)
    return data


def validate(data: Any, label: str = "source_inventory.yaml") -> None:
    schema = json.loads((SCHEMA_DIR / "source_inventory.schema.json").read_text(encoding="utf-8"))
    errors = sorted(Draft7Validator(schema).iter_errors(data), key=lambda e: list(e.path))
    if errors:
        lines = [f"  - {'/'.join(str(x) for x in e.path) or '<root>'}: {e.message}" for e in errors[:8]]
        raise RoleError(f"{label} failed source-inventory schema validation:\n" + "\n".join(lines))
    if not any(set(s["roles"]) & {"CONTENT_SOURCE", "STRUCTURE_SOURCE"} for s in data["sources"]):
        raise RoleError("inventory has no CONTENT_SOURCE or STRUCTURE_SOURCE: where is the science?")
    for s in data["sources"]:
        if "STYLE_SOURCE" in s["roles"] and "redistributable" not in s:
            raise RoleError(f"source '{s['id']}' is a STYLE_SOURCE but does not declare "
                            f"redistributable: true/false")


def by_role(inventory: dict, role: str) -> list[dict]:
    return [s for s in inventory["sources"] if role in s["roles"]]


def style_sources(inventory: dict) -> list[dict]:
    return by_role(inventory, "STYLE_SOURCE")


def content_sources(inventory: dict) -> list[dict]:
    return by_role(inventory, "CONTENT_SOURCE") + by_role(inventory, "STRUCTURE_SOURCE")


def summary(inventory: dict) -> str:
    lines = []
    for s in inventory["sources"]:
        flag = ""
        if "STYLE_SOURCE" in s["roles"]:
            flag = f" (redistributable={s.get('redistributable')})"
        lines.append(f"  {s['id']:<24} {','.join(s['roles'])}{flag}")
    return "\n".join(lines)
