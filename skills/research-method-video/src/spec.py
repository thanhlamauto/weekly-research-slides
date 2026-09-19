"""Load and validate the method semantic model and the video scene spec.

Errors are short and actionable: a scene spec is authored by a human or an
agent, so it should say *what* is wrong and *where*, not dump a traceback.
"""

from __future__ import annotations

import json
import pathlib
from typing import Any

import yaml
from jsonschema import Draft7Validator

SCHEMA_DIR = pathlib.Path(__file__).resolve().parents[1] / "schemas"


class SpecError(Exception):
    """Raised for invalid or inconsistent method/video specs."""


def _load_yaml(path: str | pathlib.Path) -> Any:
    p = pathlib.Path(path)
    if not p.exists():
        raise SpecError(f"file not found: {p}")
    try:
        with p.open("r", encoding="utf-8") as fh:
            return yaml.safe_load(fh)
    except yaml.YAMLError as exc:
        raise SpecError(f"invalid YAML in {p.name}: {exc}") from exc


def _schema(name: str) -> dict:
    with (SCHEMA_DIR / name).open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _validate(schema_name: str, data: Any, label: str) -> None:
    validator = Draft7Validator(_schema(schema_name))
    errors = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if not errors:
        return
    lines = []
    for e in errors[:8]:
        where = "/".join(str(x) for x in e.path) or "<root>"
        lines.append(f"  - {where}: {e.message}")
    more = "" if len(errors) <= 8 else f"\n  ... and {len(errors) - 8} more"
    raise SpecError(f"{label} failed schema validation:\n" + "\n".join(lines) + more)


def load_method_model(path: str | pathlib.Path) -> dict:
    data = _load_yaml(path)
    _validate("method_model.schema.json", data, pathlib.Path(path).name)
    return data


def load_scene_spec(path: str | pathlib.Path) -> dict:
    data = _load_yaml(path)
    _validate("scene_spec.schema.json", data, pathlib.Path(path).name)
    _check_unique_ids(data)
    return data


def _check_unique_ids(spec: dict) -> None:
    seen_scenes: set[str] = set()
    for scene in spec.get("scenes", []):
        sid = scene["id"]
        if sid in seen_scenes:
            raise SpecError(f"duplicate scene id: {sid}")
        seen_scenes.add(sid)
        seen_actors: set[str] = set()
        for actor in scene.get("actors", []):
            aid = actor["id"]
            if aid in seen_actors:
                raise SpecError(f"scene {sid}: duplicate actor id: {aid}")
            seen_actors.add(aid)
        seen_beats: set[str] = set()
        for beat in scene.get("beats", []):
            bid = beat["id"]
            if bid in seen_beats:
                raise SpecError(f"scene {sid}: duplicate beat id: {bid}")
            seen_beats.add(bid)


def scene_by_id(spec: dict, scene_id: str) -> dict:
    for scene in spec.get("scenes", []):
        if scene["id"] == scene_id:
            return scene
    raise SpecError(f"unknown scene id: {scene_id}")


def scene_ids(spec: dict) -> list[str]:
    return [s["id"] for s in spec.get("scenes", [])]


def actor_label(scene: dict, actor_id: str, default: str | None = None) -> str:
    for actor in scene.get("actors", []):
        if actor["id"] == actor_id:
            return actor.get("label", default or actor_id)
    return default or actor_id


def actor_map(scene: dict) -> dict:
    return {a["id"]: a for a in scene.get("actors", [])}


def persistent_actor_ids(spec: dict) -> set[str]:
    ids: set[str] = set()
    for scene in spec.get("scenes", []):
        for actor in scene.get("actors", []):
            if actor.get("persistent"):
                ids.add(actor["id"])
    return ids
