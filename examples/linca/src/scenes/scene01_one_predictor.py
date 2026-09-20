from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import dims as D

SID = "lc_01_one_predictor"


class LC01OnePredictor(Scene):
    """Full compute every N steps; one prediction rule for the whole feature."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "One rule for the whole feature")
        self.play(Write(title), run_time=0.5)

        tl = A.timeline("trajectory", length=10.4, ticks=11).move_to(DOWN * 0.6)
        self.play(Create(tl), run_time=0.5)

        full = VGroup(*[Dot(tl[1][i].get_center(), radius=0.09, color=T.GREEN) for i in (0, 4, 8)])
        pred = VGroup(*[Dot(tl[1][i].get_center(), radius=0.07, color=T.AMBER)
                        for i in range(11) if i not in (0, 4, 8)])
        full_lab = A.label("compute", size=T.SIZE_TINY, color=T.GREEN).next_to(full[1], UP, buff=0.14)
        pred_lab = A.label("predict", size=T.SIZE_TINY, color=T.AMBER).next_to(pred[2], DOWN, buff=0.14)
        self.play(LaggedStart(*[FadeIn(d) for d in full], lag_ratio=0.1), FadeIn(full_lab), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "full", 0.4))

        self.play(LaggedStart(*[FadeIn(d) for d in pred], lag_ratio=0.05), FadeIn(pred_lab), run_time=0.8)
        feature = A.feature_node("feature", "x_t", radius=0.3)
        feature.move_to(UP * 0.35)
        pred_arrow = A.dashed_arrow(full[1].get_top() + UP * 0.05, feature.get_bottom() + DOWN * 0.04,
                                    color=T.AMBER)
        self.play(Create(pred_arrow), FadeIn(feature, shift=DOWN * 0.1), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "reuse", 0.4))

        row = D.dim_row(["unstable", "smooth", "curved", "smooth", "unstable", "curved", "smooth", "unstable"])
        row.move_to(UP * 1.1)
        brace = A.brace_under(row, "one prediction rule", size=T.SIZE_SMALL)
        self.play(FadeIn(row, shift=DOWN * 0.1), run_time=0.6)
        self.play(FadeIn(brace), run_time=0.5)
        self.wait(timing.beat_dwell(SID, "uniform", 0.5))

        ask = A.text("Is one rule enough for every part of a feature?", size=T.SIZE_BODY,
                     color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.45)
        self.play(FadeIn(ask, shift=UP * 0.12), run_time=0.6)
        self.wait(timing.tail(SID, 1.0, anim_estimate=6.0))
