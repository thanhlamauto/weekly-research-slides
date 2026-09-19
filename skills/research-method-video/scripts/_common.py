"""Shared helpers for the research-method-video scripts.

Keeps Manim discovery, environment setup and error reporting in one place so
every script fails with a short, actionable message instead of a traceback.
"""

from __future__ import annotations

import json
import os
import pathlib
import shutil
import subprocess
import sys

SKILL_ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = SKILL_ROOT / "src"
REPO_ROOT = SKILL_ROOT.parents[1]
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))


def ensure_pkg_config() -> None:
    """Homebrew cairo/pango live outside the default pkg-config path on macOS."""
    for candidate in ("/opt/homebrew/lib/pkgconfig", "/usr/local/lib/pkgconfig"):
        if pathlib.Path(candidate).is_dir():
            current = os.environ.get("PKG_CONFIG_PATH", "")
            if candidate not in current.split(":"):
                os.environ["PKG_CONFIG_PATH"] = f"{candidate}:{current}".rstrip(":")


def manim_command() -> list[str]:
    """Return the command prefix that runs Manim, preferring a project venv."""
    exe = shutil.which("manim")
    if exe:
        return [exe]
    venv_manim = REPO_ROOT / ".venv-manim" / "bin" / "manim"
    if venv_manim.exists():
        return [str(venv_manim)]
    return [sys.executable, "-m", "manim"]


def manim_available() -> bool:
    cmd = manim_command()
    try:
        subprocess.run(cmd + ["--version"], capture_output=True, timeout=60)
        return True
    except Exception:
        return False


def require_manim() -> None:
    if manim_available():
        return
    fail(
        "Manim is not available.\n"
        "  Create a Python 3.11-3.13 venv and install the requirements:\n"
        "    python3.13 -m venv .venv-manim\n"
        "    . .venv-manim/bin/activate && pip install -r "
        "skills/research-method-video/requirements.txt\n"
        "  Then re-run. Set WRS_MANIM_PYTHON to point at a specific interpreter."
    )


def require_ffmpeg() -> None:
    if shutil.which("ffmpeg"):
        return
    fail("ffmpeg is not on PATH. Install it (e.g. `brew install ffmpeg`) and retry.")


def fail(message: str, code: int = 2):
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(code)


def load_project(project: pathlib.Path) -> dict:
    import spec  # noqa: E402  (path configured above)

    project = pathlib.Path(project).resolve()
    scene_spec = project / "scene_spec.yaml"
    if not scene_spec.exists():
        fail(f"no scene_spec.yaml in {project}")
    try:
        spec_data = spec.load_scene_spec(scene_spec)
    except spec.SpecError as exc:
        fail(str(exc))
    return {"path": project, "spec": spec_data, "spec_path": scene_spec}


def write_json(path: pathlib.Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, **kwargs)
