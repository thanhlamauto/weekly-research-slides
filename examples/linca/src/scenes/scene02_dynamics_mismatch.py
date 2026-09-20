from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import dims as D

SID = "lc_02_dynamics_mismatch"


def mini_plot(points, color, width=2.6, height=1.2):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)
    norm = [np.array([(x - x0) / max(1e-6, x1 - x0) * width - width / 2,
                      (y - y0) / max(1e-6, y1 - y0) * height - height / 2, 0.0])
            for x, y in points]
    curve = VMobject().set_points_as_corners(norm)
    curve.set_stroke(color, width=4)
    return curve


class LC02DynamicsMismatch(Scene):
    """Three continuity behaviours inside one feature vector."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Dimensions do not evolve the same way")
        self.play(Write(title), run_time=0.5)

        tl = A.timeline("trajectory", length=10.4, ticks=11).move_to(DOWN * 2.05)
        self.play(Create(tl), run_time=0.4)

        unstable_pts = [(i, (i % 2) * 1.0 + 0.3 * (i % 3)) for i in range(11)]
        smooth_pts = [(i, 0.22 * i) for i in range(11)]
        curved_pts = [(i, 0.06 * i * i) for i in range(11)]

        u = mini_plot(unstable_pts, T.RED).move_to(np.array([-3.9, 0.75, 0]))
        s = mini_plot(smooth_pts, T.BLUE).move_to(np.array([0.0, 0.75, 0]))
        c = mini_plot(curved_pts, T.AMBER).move_to(np.array([3.9, 0.75, 0]))

        self.play(FadeIn(u, shift=UP * 0.1), run_time=0.5)
        u_lab = A.label("jumps around", size=T.SIZE_TINY, color=T.RED).next_to(u, DOWN, buff=0.12)
        self.play(FadeIn(u_lab), run_time=0.3)
        self.wait(timing.beat_dwell(SID, "unstable", 0.5))

        self.play(FadeIn(s, shift=UP * 0.1), run_time=0.5)
        s_lab = A.label("almost linear", size=T.SIZE_TINY, color=T.BLUE).next_to(s, DOWN, buff=0.12)
        self.play(FadeIn(s_lab), run_time=0.3)
        self.wait(timing.beat_dwell(SID, "smooth", 0.45))

        self.play(FadeIn(c, shift=UP * 0.1), run_time=0.5)
        c_lab = A.label("gentle curvature", size=T.SIZE_TINY, color=T.AMBER).next_to(c, DOWN, buff=0.12)
        self.play(FadeIn(c_lab), run_time=0.3)
        self.wait(timing.beat_dwell(SID, "curved", 0.45))

        row = D.dim_row(["unstable", "smooth", "curved", "smooth", "unstable", "curved", "smooth", "unstable"])
        row.move_to(DOWN * 1.15)
        row_lab = A.label("one feature vector", size=T.SIZE_TINY).next_to(row, UP, buff=0.14)
        self.play(FadeIn(row, shift=DOWN * 0.1), FadeIn(row_lab), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "interleaved", 0.6))

        mismatch = A.text("One prediction order cannot match all of them.", size=T.SIZE_BODY,
                          color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.4)
        self.play(FadeIn(mismatch, shift=UP * 0.12), run_time=0.6)
        self.wait(timing.tail(SID, 1.1, anim_estimate=8.0))
