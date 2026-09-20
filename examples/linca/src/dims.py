"""Shared LinCa visual helper: a feature vector whose dimensions have kinds.

The three behaviours keep the same colours across every scene:
unstable -> red (drift), smooth -> blue (prediction), curved -> amber (learned).
"""

from __future__ import annotations

import numpy as np
from manim import Rectangle, VGroup

import theme as T
import actors as A

KIND_COLORS = {"unstable": T.RED, "smooth": T.BLUE, "curved": T.AMBER}
KIND_LABELS = {"unstable": "unstable", "smooth": "smooth", "curved": "curved"}


def dim_row(kinds, cell: float = 0.34, actor_id: str = "feature_dims"):
    cells = VGroup()
    for i, kind in enumerate(kinds):
        color = KIND_COLORS[kind]
        rect = Rectangle(width=cell * 0.9, height=cell * 0.9, color=color,
                         stroke_width=2, fill_color=color, fill_opacity=0.22)
        rect.move_to(np.array([i * cell, 0.0, 0.0]))
        cells.add(rect)
    cells.move_to(np.array([0.0, 0.0, 0.0]))
    return A.tag(cells, actor_id, "feature")
