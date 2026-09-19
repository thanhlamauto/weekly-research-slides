"""Meaningful animation patterns for method explainers.

Each function implements one scientific motion so that authored scenes read as
a sequence of ideas rather than a sequence of FadeIn/FadeOut calls.

Vocabulary (see references/manim-visual-grammar.md):
    ESTABLISH   introduce the system / timeline
    TRACE       follow information through computation
    BUILD       construct a method one component at a time
    MORPH       transform baseline into proposed method
    FOCUS       de-emphasise context, emphasise one component
    COMPARE     synchronise two behaviours
    TRAJECTORY  animate a representation over time
    STAGE-SPLIT one timeline -> several semantic stages
    ACCUMULATION show error / drift growing
    CORRECTION  apply an update vector
    REPLAY      replay the same process under a different method
"""

from __future__ import annotations

import numpy as np
from manim import (
    VGroup, FadeIn, FadeOut, Create, Write, Transform, ReplacementTransform,
    TransformFromCopy, Indicate, Circumscribe, GrowFromEdge, GrowArrow,
    RoundedRectangle, MoveAlongPath, TracedPath, rate_functions,
)

import theme as T
import actors as A


# ---------------------------------------------------------------------------
# ESTABLISH / FOCUS
# ---------------------------------------------------------------------------
def establish(scene, *mobjects, run_time: float = 0.8, shift=None):
    shift = shift if shift is not None else np.array([0.0, -0.12, 0.0])
    scene.play(*[FadeIn(m, shift=shift) for m in mobjects if m is not None],
               run_time=run_time)


def focus(scene, context, target, dim_opacity: float = 0.16, run_time: float = 0.6):
    """De-emphasise ``context`` and bring ``target`` forward."""
    anims = [m.animate.set_opacity(dim_opacity) for m in context if m is not None]
    anims.append(target.animate.set_opacity(1.0))
    scene.play(*anims, run_time=run_time)


def restore(scene, *mobjects, run_time: float = 0.5):
    scene.play(*[m.animate.set_opacity(1.0) for m in mobjects if m is not None],
               run_time=run_time)


# ---------------------------------------------------------------------------
# TRACE / TRAJECTORY
# ---------------------------------------------------------------------------
def trace(scene, actor, waypoints, run_time: float = 2.4, trail: bool = False,
          trail_color: str = None):
    """Move an actor through a path of points, optionally drawing a trail."""
    points = [np.array(p, dtype=float) for p in waypoints]
    path = VGroup()
    for a, b in zip(points[:-1], points[1:]):
        from manim import Line
        path.add(Line(a, b))
    # MoveAlongPath needs a single path; stitch the waypoints as a polyline.
    from manim import VMobject
    poly = VMobject()
    poly.set_points_as_corners(points)
    traced = None
    if trail:
        traced = TracedPath(actor.get_center, stroke_color=trail_color or T.BLUE,
                            stroke_width=4)
        scene.add(traced)
    scene.play(MoveAlongPath(actor, poly), run_time=run_time,
               rate_func=rate_functions.ease_in_out_sine)
    return traced


# ---------------------------------------------------------------------------
# MORPH / BUILD
# ---------------------------------------------------------------------------
def morph(scene, old, new, run_time: float = 1.1):
    """Conceptual continuity: one object becomes the next."""
    scene.play(ReplacementTransform(old, new), run_time=run_time)


def build(scene, components, run_time: float = 0.5, buff: float = 0.0):
    """Construct a method one component at a time, left to right."""
    anims = [FadeIn(c, shift=np.array([0.0, -0.1, 0.0])) for c in components]
    for anim in anims:
        scene.play(anim, run_time=run_time)
        if buff:
            scene.wait(buff)


# ---------------------------------------------------------------------------
# STAGE-SPLIT
# ---------------------------------------------------------------------------
def stage_regions(scene, timeline, regions, height: float = 1.3, y_offset: float = 0.0,
                  run_time: float = 0.6):
    """Colour a timeline into semantic stages.

    ``regions`` is a list of dicts: ``{id, x0, x1, color, label}`` in the same
    coordinates as the timeline. Returns the created region groups.
    """
    groups = []
    anims = []
    for r in regions:
        width = r["x1"] - r["x0"]
        rect = RoundedRectangle(corner_radius=0.08, width=width, height=height,
                                color=r["color"], stroke_width=0,
                                fill_color=r["color"], fill_opacity=0.14)
        rect.move_to(np.array([(r["x0"] + r["x1"]) / 2.0, y_offset, 0.0]))
        lab = A.mtext(r["label"], size=T.SIZE_SMALL, color=r["color"], weight="BOLD")
        lab.next_to(rect, np.array([0, 1, 0]), buff=0.12)
        g = A.tag(VGroup(rect, lab), r["id"], "stage")
        groups.append(g)
        anims.append(FadeIn(g, shift=np.array([0, 0.12, 0])))
    scene.play(*anims, run_time=run_time)
    return groups


# ---------------------------------------------------------------------------
# ACCUMULATION / CORRECTION
# ---------------------------------------------------------------------------
def accumulation(scene, origin, vectors, color: str = None, run_time: float = 1.2):
    """Show drift accumulating as a growing chain of displacement vectors."""
    color = color or T.ROLE["drift"]
    cursor = np.array(origin, dtype=float)
    vecs = []
    for v in vectors:
        end = cursor + np.array(v, dtype=float)
        vecs.append(A.vector(cursor, end, color=color))
        cursor = end
    scene.play(*[GrowArrow(v) for v in vecs], run_time=run_time)
    return VGroup(*vecs), cursor


def correction(scene, actor, vector, run_time: float = 1.0, color: str = None):
    """Apply an update vector to an actor (the actor moves)."""
    color = color or T.ROLE["drift"]
    start = actor.get_center()
    end = start + np.array(vector, dtype=float)
    vec = A.vector(start, end, color=color)
    scene.play(GrowArrow(vec), run_time=run_time * 0.5)
    scene.play(actor.animate.move_to(end), run_time=run_time * 0.5)
    return vec


# ---------------------------------------------------------------------------
# COMPARE / REPLAY
# ---------------------------------------------------------------------------
def compare(scene, left_group, right_group, run_time: float = 1.0):
    """Synchronise two behaviours side by side."""
    scene.play(FadeIn(left_group, shift=np.array([0.2, 0, 0])),
               FadeIn(right_group, shift=np.array([-0.2, 0, 0])), run_time=run_time)


def replay(scene, actor, waypoints, run_time: float = 1.6):
    """Replay the same process, typically under a different method."""
    return trace(scene, actor, waypoints, run_time=run_time)


# ---------------------------------------------------------------------------
# chrome
# ---------------------------------------------------------------------------
def title(scene, s: str):
    return A.text(s, size=T.SIZE_HEAD, color=T.INK, weight="BOLD").to_corner(
        np.array([-1, 1, 0]), buff=0.5)


def caption(scene, s: str):
    return A.text(s, size=T.SIZE_BODY, color=T.INK_SOFT).to_edge(
        np.array([0, -1, 0]), buff=0.45)


def subtitle(scene, s: str):
    return A.text(s, size=T.SIZE_SMALL, color=T.MUTED).to_corner(
        np.array([1, 1, 0]), buff=0.5)
