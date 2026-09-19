"""Manim entry point for the LESA method explainer.

    manim -ql src/main.py LESA01WhyCache
    # or, recommended, via the skill script:
    python skills/research-method-video/scripts/render_scene.py --project examples/lesa --quality draft

Scene classes are registered from scene_spec.yaml (single source of truth for
the scene list and class names).
"""

from __future__ import annotations

import importlib
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve().parent
# _HERE = <repo>/examples/lesa/src  ->  parents[2] = <repo>
_REPO = _HERE.parents[2]
_SUBSKILL_SRC = _REPO / "skills" / "research-method-video" / "src"

for _p in (str(_HERE), str(_SUBSKILL_SRC)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import spec as _S  # noqa: E402

MODULE_BY_SCENE = {
    "lesa_01_why_cache": "scenes.scene01_why_cache",
    "lesa_02_uniform_assumption": "scenes.scene02_uniform_assumption",
    "lesa_03_stage_dynamics": "scenes.scene03_stage_dynamics",
    "lesa_04_stage_experts": "scenes.scene04_stage_experts",
    "lesa_05_expert_internals": "scenes.scene05_expert_internals",
    "lesa_06_training": "scenes.scene06_training",
    "lesa_07_recap": "scenes.scene07_recap",
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
    # Manim only picks up classes whose __module__ starts with the entry
    # module's name, so re-home the imported scene classes onto main.
    _cls.__module__ = __name__
    globals()[_cls_name] = _cls
    SCENES[_sid] = _cls
