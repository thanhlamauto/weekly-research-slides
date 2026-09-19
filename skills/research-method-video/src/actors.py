"""Persistent scientific actors for research-method-video.

Every actor carries a stable semantic ``actor_id`` (e.g. ``feature_current``,
``predictor_2``) so the same scientific object keeps its identity and visual
form across scenes. Scenes should move/morph existing actors rather than
destroying and recreating them.

Shape language mirrors the PowerPoint grammar:
    feature / latent        -> circle node
    model / module          -> rectangle
    learned module          -> rounded rectangle
    cache / memory          -> stacked rounded rectangles
    operator (correction)   -> filled circle
    timestep                -> tick on a horizontal timeline
"""

from __future__ import annotations

import re

from manim import (
    VGroup, Circle, RoundedRectangle, Rectangle, Line, DashedLine, Arrow, Dot,
    Triangle, Text, Brace, DEGREES,
)
import numpy as np

import theme as T


def text(s: str, size: int = T.SIZE_BODY, color: str = T.INK,
         weight: str = "NORMAL", font: str = T.FONT) -> Text:
    return Text(s, font_size=size, color=color, weight=weight, font=font)


def mathlabel(s: str, size: int = T.SIZE_LABEL, color: str = T.INK,
              weight: str = "NORMAL", font: str = T.FONT):
    """A label with reliable sub/superscripts, built from separate Text pieces.

    Syntax: ``h_{t-1}``, ``Δt_{L-1}``, ``x^{2}``. Plain text passes through.
    Manim's Pango <sub> renders too small and Unicode subscripts are missing in
    many fonts, so we compose pieces explicitly.
    """
    tokens = []
    pos = 0
    for m in re.finditer(r"([_^])(?:\{([^}]*)\}|(.))", s):
        if m.start() > pos:
            tokens.append(("base", s[pos:m.start()]))
        kind = "sub" if m.group(1) == "_" else "sup"
        val = m.group(2) if m.group(2) is not None else m.group(3)
        tokens.append((kind, val))
        pos = m.end()
    if pos < len(s):
        tokens.append(("base", s[pos:]))
    if not tokens:
        return text(s, size=size, color=color, weight=weight, font=font)

    scale = size / 40.0
    pieces = []
    for kind, val in tokens:
        if val == "":
            continue
        if kind == "base":
            t = Text(val, font_size=size, color=color, weight=weight, font=font)
            t._yshift = 0.0
        else:
            t = Text(val, font_size=int(size * 0.66), color=color,
                     weight=weight, font=font)
            t._yshift = (-0.13 * scale) if kind == "sub" else (0.14 * scale)
        pieces.append(t)
    if not pieces:
        return text(s, size=size, color=color, weight=weight, font=font)

    x = 0.0
    for t in pieces:
        t.move_to(np.array([x + t.width / 2.0, t._yshift, 0.0]))
        x += t.width + 0.025
    g = VGroup(*pieces)
    g.move_to(np.array([0.0, 0.0, 0.0]))
    return g


# Backwards-compatible alias used across the scenes.
def mtext(s: str, size: int = T.SIZE_LABEL, color: str = T.INK,
          weight: str = "NORMAL", font: str = T.FONT):
    return mathlabel(s, size=size, color=color, weight=weight, font=font)


def label(s: str, size: int = T.SIZE_SMALL, color: str = T.MUTED,
          weight: str = "NORMAL") -> Text:
    return Text(s, font_size=size, color=color, weight=weight, font=T.FONT)


# ---------------------------------------------------------------------------
# actor tagging
# ---------------------------------------------------------------------------
def tag(mobj, actor_id: str, actor_type: str):
    mobj.actor_id = actor_id
    mobj.actor_type = actor_type
    return mobj


# ---------------------------------------------------------------------------
# nodes
# ---------------------------------------------------------------------------
def feature_node(actor_id: str, label_markup: str, radius: float = 0.34,
                 color: str = None, fill: str = None,
                 label_size: int = T.SIZE_LABEL):
    """Circle node for a latent / feature representation."""
    color = color or T.ROLE["feature"]
    fill = fill or T.BG
    circle = Circle(radius=radius, color=color, stroke_width=3.2,
                    fill_color=fill, fill_opacity=1.0)
    lab = mtext(label_markup, size=label_size, color=color, weight="BOLD")
    lab.move_to(circle.get_center())
    g = VGroup(circle, lab)
    return tag(g, actor_id, "feature")


def module(actor_id: str, label_markup: str, width: float = 2.0,
           height: float = 0.9, learned: bool = False,
           color: str = None, fill: str = None, label_size: int = T.SIZE_LABEL):
    """Rectangle (model) or rounded rectangle (learned module)."""
    color = color or (T.ROLE["learned"] if learned else T.ROLE["model"])
    fill = fill or (T.AMBER_SOFT if learned else T.BLUE_SOFT)
    if learned:
        box = RoundedRectangle(corner_radius=0.14, width=width, height=height,
                               color=color, stroke_width=3.0,
                               fill_color=fill, fill_opacity=1.0)
    else:
        box = Rectangle(width=width, height=height, color=color, stroke_width=3.0,
                        fill_color=fill, fill_opacity=1.0)
    lab = mtext(label_markup, size=label_size, color=T.INK, weight="BOLD")
    if lab.width > width - 0.24:
        lab.scale((width - 0.24) / lab.width)
    lab.move_to(box.get_center())
    g = VGroup(box, lab)
    return tag(g, actor_id, "learned" if learned else "module")


def cache_stack(actor_id: str, label_markup: str, width: float = 1.5,
                height: float = 0.86, color: str = None):
    """Stacked rounded rectangles for a cache / memory."""
    color = color or T.ROLE["cache"]
    layers = VGroup()
    for i in range(3):
        r = RoundedRectangle(corner_radius=0.1, width=width, height=height,
                             color=color, stroke_width=2.4,
                             fill_color=T.WHITE, fill_opacity=1.0)
        r.shift(np.array([0.09, 0.09, 0.0]) * i)
        layers.add(r)
    lab = mtext(label_markup, size=T.SIZE_LABEL, color=T.INK_SOFT, weight="BOLD")
    lab.move_to(layers.get_center())
    g = VGroup(layers, lab)
    return tag(g, actor_id, "cache")


def operator(actor_id: str, label_markup: str, radius: float = 0.3,
             color: str = None):
    """Filled circle for a correction / fusion operator."""
    color = color or T.ROLE["learned"]
    c = Circle(radius=radius, color=color, stroke_width=0,
               fill_color=color, fill_opacity=1.0)
    lab = mtext(label_markup, size=T.SIZE_LABEL, color=T.WHITE, weight="BOLD")
    lab.move_to(c.get_center())
    g = VGroup(c, lab)
    return tag(g, actor_id, "operator")


def panel(actor_id: str, label_markup: str, width: float, height: float,
          color: str = None, fill: str = None):
    """Neutral container used for grouping (e.g. one expert's workspace)."""
    color = color or T.PANEL_LINE
    fill = fill or T.PANEL
    box = RoundedRectangle(corner_radius=0.16, width=width, height=height,
                           color=color, stroke_width=2.2,
                           fill_color=fill, fill_opacity=1.0)
    lab = mtext(label_markup, size=T.SIZE_SMALL, color=T.MUTED, weight="BOLD")
    lab.move_to(box.get_corner(np.array([-1, 1, 0])) + np.array([0.14, -0.24, 0]))
    lab.align_to(box, np.array([-1, 0, 0])).shift(np.array([0.16, 0, 0]))
    g = VGroup(box, lab)
    return tag(g, actor_id, "panel")


def dot_node(actor_id: str, radius: float = 0.085, color: str = None):
    color = color or T.ROLE["feature"]
    d = Dot(radius=radius, color=color)
    return tag(d, actor_id, "dot")


# ---------------------------------------------------------------------------
# arrows / vectors
# ---------------------------------------------------------------------------
def arrow(start, end, color: str = None, width: float = 3.4, buff: float = 0.0,
          actor_id: str = None):
    color = color or T.INK_SOFT
    a = Arrow(start, end, buff=buff, color=color, stroke_width=width,
              max_tip_length_to_length_ratio=0.12)
    if actor_id:
        tag(a, actor_id, "arrow")
    return a


def dashed_arrow(start, end, color: str = None, width: float = 3.0,
                 actor_id: str = None):
    """Reuse / reference arrow: dashed shaft with a solid tip."""
    color = color or T.ROLE["prediction"]
    start = np.array(start, dtype=float)
    end = np.array(end, dtype=float)
    shaft = DashedLine(start, end, color=color, stroke_width=width,
                       dash_length=0.13, dashed_ratio=0.55)
    direction = end - start
    n = np.linalg.norm(direction)
    if n > 1e-6:
        direction = direction / n
    tip = Triangle(color=color, fill_color=color, fill_opacity=1.0).scale(0.085)
    tip.rotate(np.arctan2(direction[1], direction[0]) - 90 * DEGREES)
    tip.move_to(end)
    g = VGroup(shaft, tip)
    if actor_id:
        tag(g, actor_id, "arrow")
    return g


def vector(start, end, color: str = None, width: float = 5.0,
           actor_id: str = None):
    """Geometric displacement / correction vector (thick colored arrow)."""
    color = color or T.ROLE["drift"]
    a = Arrow(start, end, buff=0.0, color=color, stroke_width=width,
              max_tip_length_to_length_ratio=0.16)
    if actor_id:
        tag(a, actor_id, "vector")
    return a


def skip_mark(mobj, color: str = None):
    """A slash indicating a skipped computation."""
    color = color or T.ROLE["skip"]
    c = mobj.get_center()
    w = max(mobj.width, 0.6)
    h = max(mobj.height, 0.6)
    ln = Line(c + np.array([-w / 2, -h / 2, 0]), c + np.array([w / 2, h / 2, 0]),
              color=color, stroke_width=5)
    return ln


# ---------------------------------------------------------------------------
# timeline
# ---------------------------------------------------------------------------
def timeline(actor_id: str, length: float = 11.0, ticks: int = 13,
             color: str = None, height: float = 0.0):
    """Horizontal timestep axis with evenly spaced ticks."""
    color = color or T.RULE
    line = Line(np.array([-length / 2, 0, 0]), np.array([length / 2, 0, 0]),
                color=color, stroke_width=4)
    tick_dots = VGroup()
    for i in range(ticks):
        x = -length / 2 + (length / (ticks - 1)) * i
        tick_dots.add(Dot(np.array([x, 0, 0]), radius=0.045, color=T.FAINT))
    g = VGroup(line, tick_dots)
    return tag(g, actor_id, "timeline")


def brace_under(mobj, label_markup: str, size: int = T.SIZE_TINY,
                color: str = None, buff: float = 0.16):
    """A brace under a mobject with a small label beneath it."""
    color = color or T.MUTED
    br = Brace(mobj, DOWN, buff=buff, color=color)
    lab = mtext(label_markup, size=size, color=color, weight="BOLD")
    lab.next_to(br, DOWN, buff=0.08)
    return VGroup(br, lab)
