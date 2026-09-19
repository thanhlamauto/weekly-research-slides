from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import trajectory as TRJ

SID = "lesa_02_uniform_assumption"


class LESA02UniformAssumption(Scene):
    """A fixed reuse/forecast scheme assumes smooth, uniform change. It is not."""

    def construct(self):
        T.apply_background(self)
        pts = TRJ.points()
        steps = TRJ.steps()

        title = P.title(self, "The smoothness assumption breaks")
        self.play(Write(title), run_time=0.5)

        timeline = A.timeline("trajectory", length=10.8, ticks=13).move_to(DOWN * 1.65)
        tl_label = A.label("diffusion timesteps", size=T.SIZE_SMALL).next_to(timeline, RIGHT, buff=0.25)
        path = VMobject().set_points_as_corners(pts)
        path.set_stroke(T.BLUE, 4)
        dot = A.dot_node("feature_point", color=T.BLUE, radius=0.1).move_to(pts[0])
        self.play(Create(timeline), FadeIn(tl_label), run_time=0.6)
        self.play(Create(path), FadeIn(dot), run_time=1.2)

        # bars encode per-step change magnitude
        bars = VGroup()
        for i, s in enumerate(steps):
            h = max(0.05, abs(s) * 1.7)
            bar = Rectangle(width=0.34, height=h, stroke_width=0,
                            fill_color=T.AMBER, fill_opacity=0.65)
            bar.move_to(np.array([(pts[i][0] + pts[i + 1][0]) / 2.0, -1.65 - h / 2 - 0.04, 0]))
            bars.add(bar)

        # the "smooth change" assumption: a straight extrapolation
        slope = (pts[1][1] - pts[0][1]) / (pts[1][0] - pts[0][0])
        end_x = TRJ.xs()[-1]
        end_y = pts[0][1] + slope * (end_x - pts[0][0])
        forecast = A.dashed_arrow(pts[0], np.array([end_x, end_y, 0]), color=T.FAINT, width=3)
        flabel = A.label("assumed: smooth change", size=T.SIZE_TINY, color=T.FAINT)
        flabel.next_to(np.array([(pts[0][0] + end_x) / 2, (pts[0][1] + end_y) / 2 + 0.35, 0]),
                       UP, buff=0.05)
        self.play(Create(forecast), FadeIn(flabel), run_time=0.9)

        self.play(
            MoveAlongPath(dot, path),
            LaggedStart(*[GrowFromEdge(b, UP) for b in bars], lag_ratio=0.12),
            run_time=3.2,
        )

        # ACCUMULATION: the forecast and reality diverge
        gap = A.vector(np.array([end_x, end_y, 0]), pts[-1], color=T.RED)
        gap_label = A.label("drift", size=T.SIZE_SMALL, color=T.RED).next_to(gap, RIGHT, buff=0.12)
        self.play(GrowArrow(gap), FadeIn(gap_label), run_time=0.8)

        cap = P.caption(self, "features do not change uniformly over time")
        self.play(FadeIn(cap, shift=UP * 0.1), run_time=0.5)
        self.wait(1.1)
