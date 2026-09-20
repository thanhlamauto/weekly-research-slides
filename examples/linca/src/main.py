"""Manim entry point for the LinCa method explainer."""

from __future__ import annotations

import importlib
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve().parent
_REPO = _HERE.parents[2]
_SUBSKILL_SRC = _REPO / "skills" / "research-method-video" / "src"

for _p in (str(_HERE), str(_SUBSKILL_SRC)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import spec as _S  # noqa: E402

MODULE_BY_SCENE = {
    "lc_01_one_predictor": "scenes.scene01_one_predictor",
    "lc_02_dynamics_mismatch": "scenes.scene02_dynamics_mismatch",
    "lc_03_partitioning": "scenes.scene03_partitioning",
    "lc_04_decompose": "scenes.scene04_decompose",
    "lc_05_predictors": "scenes.scene05_predictors",
    "lc_06_invertible": "scenes.scene06_invertible",
    "lc_07_segments_training": "scenes.scene07_segments_training",
}

_SPEC = _S.load_scene_spec(_HERE.parent / "scene_spec.yaml")
SCENES: dict[str, type] = {}

for _scene in _SPEC["scenes"]:
    _sid = _scene["id"]
    _cls_name = _scene.get("manim_class")
    _mod_name = MODULE_BY_SCENE.get(_sid)
    if not (_cls_name and _mod_name):
        continue
    _module = importlib.import_module(_mod_name)
    _cls = getattr(_module, _cls_name)
    _cls.__module__ = __name__
    globals()[_cls_name] = _cls
    SCENES[_sid] = _cls
