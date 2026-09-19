from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lesa_04_stage_experts"

STAGE_COLOR = {"high": T.ROLE["stage_high"], "mid": T.ROLE["stage_mid"], "low": T.ROLE["stage_low"]}
XS = {"high": -3.7, "mid": 0.0, "low": 3.7}


class LESA04StageExperts(Scene):
    """One predictor transforms into three stage-aligned experts."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "One predictor becomes stage-aware experts")
        self.play(Write(title), run_time=0.5)

        predictor = A.module("predictor", "one predictor", learned=True,
                             width=3.0, height=1.1).move_to(DOWN * 0.4)
        plabel = A.label("handles the whole trajectory", size=T.SIZE_SMALL)
        plabel.next_to(predictor, DOWN, buff=0.2)
        self.play(FadeIn(predictor, shift=UP * 0.15), FadeIn(plabel), run_time=0.7)

        # STAGE-SPLIT: bring back the three regimes
        strips = VGroup()
        labels = VGroup()
        specs = [("high", "high noise (K=4)"), ("mid", "middle (K=8)"), ("low", "low noise (K=8)")]
        for key, lab in specs:
            strip = RoundedRectangle(corner_radius=0.1, width=3.0, height=0.7,
                                     color=STAGE_COLOR[key], stroke_width=0,
                                     fill_color=STAGE_COLOR[key], fill_opacity=0.16)
            strip.move_to(np.array([XS[key], 2.2, 0]))
            strips.add(A.tag(strip, f"stage_{key}", "stage"))
            labels.add(A.mtext(lab, size=T.SIZE_SMALL, color=STAGE_COLOR[key], weight="BOLD")
                       .next_to(strip, UP, buff=0.12))
        self.play(LaggedStart(*[FadeIn(s, shift=DOWN * 0.1) for s in strips], lag_ratio=0.12),
                  LaggedStart(*[FadeIn(l) for l in labels], lag_ratio=0.12), run_time=0.9)

        # MORPH: the single predictor transforms into three experts
        experts = VGroup(*[
            A.module(f"expert_{i+1}", f"expert {i+1}", learned=True, width=2.6, height=1.0)
            .move_to(np.array([XS[key], 0.15, 0]))
            for i, key in enumerate(["high", "mid", "low"])
        ])
        self.play(ReplacementTransform(predictor, experts), FadeOut(plabel), run_time=1.6)

        links = VGroup(*[
            A.dashed_arrow(strips[i].get_bottom() + DOWN * 0.03,
                           experts[i].get_top() + UP * 0.03, color=STAGE_COLOR[key])
            for i, key in enumerate(["high", "mid", "low"])
        ])
        self.play(LaggedStart(*[Create(l) for l in links], lag_ratio=0.15), run_time=0.9)

        win = A.label("window K adapts to the stage", size=T.SIZE_SMALL, color=T.MUTED)
        win.move_to(np.array([0, -1.5, 0]))
        cap = P.caption(self, "specialization follows from the stage-dependent dynamics")
        self.play(FadeIn(win), FadeIn(cap, shift=UP * 0.1), run_time=0.6)
        self.wait(timing.tail(SID, 1.2, anim_estimate=6.4))
