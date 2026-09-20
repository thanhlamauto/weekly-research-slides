from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import dims as D

SID = "lc_07_segments_training"


class LC07SegmentsTraining(Scene):
    """Segment predictors are separate from subspace groups; training signals; recap."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Timestep segments and training")
        self.play(Write(title), run_time=0.5)

        tl = A.timeline("trajectory", length=10.4, ticks=11).move_to(np.array([0.0, 1.6, 0]))
        self.play(Create(tl), run_time=0.4)

        regions = [
            {"id": "stage_early", "x0": -5.2, "x1": -1.7, "color": T.AMBER, "label": "early"},
            {"id": "stage_mid", "x0": -1.7, "x1": 1.7, "color": T.BLUE, "label": "middle"},
            {"id": "stage_late", "x0": 1.7, "x1": 5.2, "color": T.GREEN, "label": "late"},
        ]
        stages = P.stage_regions(self, tl, regions, height=1.15, y_offset=1.6, run_time=0.8)
        self.wait(timing.beat_dwell(SID, "segments", 0.5))

        chips = VGroup()
        for i, (region, group) in enumerate(zip(regions, stages)):
            chip = A.module(f"predictor_{i}", "predictor", learned=True, width=1.7, height=0.5,
                            label_size=T.SIZE_TINY)
            chip.move_to(np.array([(region["x0"] + region["x1"]) / 2.0, 0.55, 0]))
            chips.add(chip)
        self.play(LaggedStart(*[FadeIn(c, shift=UP * 0.1) for c in chips], lag_ratio=0.15), run_time=0.8)
        self.wait(timing.beat_dwell(SID, "separate", 0.4))

        groups_lab = A.text("groups: subspaces inside one feature", size=T.SIZE_SMALL,
                            color=T.MUTED).move_to(np.array([0.0, -0.35, 0]))
        stages_lab = A.text("stages: separate predictors along the trajectory", size=T.SIZE_SMALL,
                            color=T.MUTED).move_to(np.array([0.0, -0.85, 0]))
        self.play(FadeIn(groups_lab), run_time=0.4)
        self.play(FadeIn(stages_lab), run_time=0.4)
        self.wait(timing.beat_dwell(SID, "distinct", 0.55))

        data = A.label("100-200 pre-generated features", size=T.SIZE_TINY).move_to(np.array([0.0, -1.35, 0]))
        self.play(FadeIn(data), run_time=0.4)
        self.wait(timing.beat_dwell(SID, "data", 0.4))

        loss = A.mathlabel("L = L_feat + L_comp", size=T.SIZE_LABEL).move_to(np.array([0.0, -1.95, 0]))
        loss_lab = A.label("match the feature, and match each component", size=T.SIZE_TINY).next_to(loss, DOWN, buff=0.12)
        self.play(Write(loss), FadeIn(loss_lab), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "losses", 0.5))

        recap = A.text("Decompose  →  predict  →  reconstruct", size=T.SIZE_BODY,
                       color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.4)
        self.play(FadeIn(recap, shift=UP * 0.1), run_time=0.7)
        self.wait(timing.tail(SID, 1.2, anim_estimate=9.5))
