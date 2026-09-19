"""Shared visual theme for research-method-video.

The palette and semantic shape language intentionally mirror the PowerPoint
side of weekly-research-slides (src/renderer/theme.js and
src/visual-grammar/draw.js) so a video and a deck built from the same method
model look like they belong to the same project.

Canvas is light neutral (matches the decks). Colors are hex strings.
"""

from __future__ import annotations

# --- canvas -----------------------------------------------------------------
BG = "#FFFFFF"
INK = "#111827"
INK_SOFT = "#374151"
MUTED = "#6B7280"
FAINT = "#9CA3AF"
RULE = "#E5E7EB"
PANEL = "#F9FAFB"
PANEL_LINE = "#D1D5DB"

# --- semantic accents (same names as the PPT grammar) -----------------------
BLUE = "#2563EB"
BLUE_SOFT = "#DBEAFE"
AMBER = "#B45309"
AMBER_SOFT = "#FEF3C7"
GREEN = "#047857"
GREEN_SOFT = "#DCFCE7"
RED = "#B91C1C"
RED_SOFT = "#FEE2E2"
PURPLE = "#6D28D9"
PURPLE_SOFT = "#EDE9FE"
SLATE_SOFT = "#F1F5F9"
WHITE = "#FFFFFF"

# Semantic roles (keep these stable across every scene).
ROLE = {
    "feature": INK,          # latent / representation
    "model": BLUE,           # model / module
    "learned": AMBER,        # learned module
    "cache": MUTED,          # cache / memory
    "stage_high": AMBER,     # high-noise stage
    "stage_mid": BLUE,       # mid-noise stage
    "stage_low": GREEN,      # low-noise stage
    "prediction": BLUE,      # forward extrapolation
    "drift": RED,            # accumulated error / correction vector
    "ground_truth": GREEN,   # ground-truth feature
    "predicted": AMBER,      # predicted / imperfect feature
    "skip": FAINT,           # skipped computation
}

# --- typography -------------------------------------------------------------
# Pango will substitute if a face is unavailable. Swap here for your system.
FONT = "Helvetica Neue"
MONO = "Menlo"

SIZE_TITLE = 40
SIZE_HEAD = 30
SIZE_BODY = 24
SIZE_LABEL = 22
SIZE_SMALL = 18
SIZE_TINY = 15
SIZE_EQ = 34


def apply_background(scene) -> None:
    """Set the Manim camera background to the shared canvas color."""
    scene.camera.background_color = BG
