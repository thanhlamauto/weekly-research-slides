from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import dims as D

SID = "lc_05_predictors"


class LC05Predictors(Scene):
    """Order-matched prediction per group, then the inverse mapping."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Matched predictors, then reconstruct")
        self.play(Write(title), run_time=0.5)

        specs = [
            ("group0", ["unstable", "unstable", "unstable"], "reuse (0th order)", T.RED, False),
            ("group1", ["smooth", "smooth", "smooth"], "Hermite (1st order)", T.BLUE, True),
            ("group2", ["curved", "curved"], "Hermite (2nd order)", T.AMBER, True),
        ]
        rows = {}
        rules = {}
        for i, (name, kinds, rule_label, color, learned) in enumerate(specs):
            y = 1.5 - i * 1.05
            g = D.dim_row(kinds, cell=0.3, actor_id=name).move_to(np.array([-4.6, y, 0]))
            rule = A.module(f"rule_{name}", rule_label, learned=learned, width=2.5, height=0.62,
                            label_size=T.SIZE_TINY).move_to(np.array([-0.6, y, 0]))
            self.play(FadeIn(g, shift=RIGHT * 0.1), run_time=0.35)
            self.play(FadeIn(rule, shift=RIGHT * 0.1),
                      GrowArrow(A.arrow(g.get_right() + RIGHT * 0.04, rule.get_left() + LEFT * 0.03,
                                        color=color, width=2.6)), run_time=0.4)
            rows[name] = g
            rules[name] = rule
            if i == 0:
                self.wait(timing.beat_dwell(SID, "predict0", 0.4))
            if i == 1:
                self.wait(timing.beat_dwell(SID, "reuse", 0.45))
        self.wait(timing.beat_dwell(SID, "hermite", 0.55))

        inverse = A.module("inverse", "E_theta inverse", learned=True, width=2.7, height=0.8)
        inverse.move_to(np.array([2.9, -0.2, 0]))
        self.play(FadeIn(inverse, shift=LEFT * 0.1), run_time=0.5)
        recon = D.dim_row(["unstable", "smooth", "curved", "smooth", "unstable", "curved", "smooth", "unstable"])
        recon.move_to(np.array([0.0, -2.0, 0]))
        recon_lab = A.label("reconstructed feature", size=T.SIZE_TINY).next_to(recon, DOWN, buff=0.14)
        for name in ("group0", "group1", "group2"):
            self.play(GrowArrow(A.arrow(rules[name].get_right() + RIGHT * 0.04,
                                        inverse.get_left() + LEFT * 0.03, color=T.MUTED, width=2.2)),
                      run_time=0.25)
        self.play(GrowArrow(A.arrow(inverse.get_bottom() + DOWN * 0.04,
                                    recon.get_top() + UP * 0.04, color=T.INK_SOFT)),
                  FadeIn(recon, shift=UP * 0.1), FadeIn(recon_lab), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "recon", 0.5))

        why = A.text("Same feature, different subspaces, different rules.", size=T.SIZE_BODY,
                     color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.4)
        self.play(FadeIn(why, shift=UP * 0.1), run_time=0.6)
        self.wait(timing.tail(SID, 1.0, anim_estimate=9.0))
