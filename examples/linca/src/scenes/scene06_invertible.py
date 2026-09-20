from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import dims as D

SID = "lc_06_invertible"


class LC06Invertible(Scene):
    """One invertible block: coupling forward, explicit inverse, precise scope."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Why the mapping must be invertible")
        self.play(Write(title), run_time=0.5)

        q = A.text("So the decomposition itself loses no information.", size=T.SIZE_SMALL,
                   color=T.INK_SOFT).move_to(np.array([0.0, 2.0, 0]))
        self.play(FadeIn(q, shift=UP * 0.1), run_time=0.5)
        self.wait(timing.beat_dwell(SID, "question", 0.4))

        panel = A.panel("block", "one invertible block", width=8.4, height=3.0)
        panel.move_to(DOWN * 0.5)
        self.play(FadeIn(panel), run_time=0.5)

        u1 = A.feature_node("halves_u1", "u1", radius=0.32, color=T.BLUE, fill=T.BLUE_SOFT)
        u1.move_to(panel.get_left() + RIGHT * 1.3 + UP * 0.55)
        u2 = A.feature_node("halves_u2", "u2", radius=0.32, color=T.BLUE, fill=T.BLUE_SOFT)
        u2.move_to(panel.get_left() + RIGHT * 1.3 + DOWN * 0.55)
        self.play(FadeIn(u1), FadeIn(u2), run_time=0.5)

        f = A.module("mlp_F", "F", learned=True, width=0.9, height=0.55, label_size=T.SIZE_SMALL)
        f.move_to(np.array([-0.7, -0.95, 0]))
        g = A.module("mlp_G", "G", learned=True, width=0.9, height=0.55, label_size=T.SIZE_SMALL)
        g.move_to(np.array([-0.7, 0.0, 0]))
        v1 = A.feature_node("halves_v1", "v1", radius=0.32, color=T.AMBER, fill=T.AMBER_SOFT)
        v1.move_to(panel.get_right() + LEFT * 1.3 + UP * 0.55)
        v2 = A.feature_node("halves_v2", "v2", radius=0.32, color=T.AMBER, fill=T.AMBER_SOFT)
        v2.move_to(panel.get_right() + LEFT * 1.3 + DOWN * 0.55)
        self.play(FadeIn(f), FadeIn(g), FadeIn(v1), FadeIn(v2), run_time=0.5)

        fwd = VGroup(
            A.arrow(u2.get_right() + RIGHT * 0.03, f.get_left() + LEFT * 0.03, color=T.BLUE, width=2.2),
            A.arrow(f.get_right() + RIGHT * 0.03, v1.get_left() + LEFT * 0.03, color=T.AMBER, width=2.2),
            A.arrow(v1.get_bottom() + DOWN * 0.03, g.get_right() + RIGHT * 0.03, color=T.AMBER, width=2.2),
            A.arrow(g.get_left() + LEFT * 0.03, v2.get_top() + UP * 0.03, color=T.AMBER, width=2.2),
        )
        self.play(LaggedStart(*[GrowArrow(a) for a in fwd], lag_ratio=0.15), run_time=0.9)
        eq = A.mathlabel("v1 = u1 + F(u2)    v2 = u2 + G(v1)", size=T.SIZE_LABEL)
        eq.move_to(np.array([0.0, -1.75, 0]))
        self.play(Write(eq), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "fwd", 0.5))

        # inverse: reverse the arrows
        inv = VGroup(
            A.arrow(v1.get_left() + LEFT * 0.03, f.get_right() + RIGHT * 0.03, color=T.RED, width=2.2),
            A.arrow(f.get_left() + LEFT * 0.03, u2.get_right() + RIGHT * 0.03, color=T.RED, width=2.2),
            A.arrow(v2.get_top() + UP * 0.03, g.get_left() + LEFT * 0.03, color=T.RED, width=2.2),
            A.arrow(g.get_right() + RIGHT * 0.03, u1.get_bottom() + DOWN * 0.03, color=T.RED, width=2.2),
        )
        inv_lab = A.label("explicit inverse", size=T.SIZE_TINY, color=T.RED).next_to(panel, UP, buff=0.12)
        self.play(LaggedStart(*[GrowArrow(a) for a in inv], lag_ratio=0.15), FadeIn(inv_lab), run_time=0.9)
        self.wait(timing.beat_dwell(SID, "inv", 0.5))

        scope = A.text("Prediction can still be wrong; only the mapping is exact.", size=T.SIZE_BODY,
                       color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.4)
        self.play(FadeIn(scope, shift=UP * 0.1), run_time=0.7)
        self.wait(timing.tail(SID, 1.1, anim_estimate=8.5))
