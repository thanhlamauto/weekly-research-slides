from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import trajectory as TRJ

SID = "lesa_07_recap"

STAGE_COLOR = {"high": T.ROLE["stage_high"], "mid": T.ROLE["stage_mid"], "low": T.ROLE["stage_low"]}
XS = {"high": -3.7, "mid": 0.0, "low": 3.7}


class LESA07Recap(Scene):
    """One compressed picture of the method; no leaderboard claim."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "The method in one view")
        self.play(Write(title), run_time=0.5)

        timeline = A.timeline("trajectory", length=10.8, ticks=13).move_to(UP * 2.0)
        self.play(Create(timeline), run_time=0.6)
        regions = [
            {"id": "stage_high", "x0": TRJ.STAGE_BOUNDS["high"][0], "x1": TRJ.STAGE_BOUNDS["high"][1],
             "color": STAGE_COLOR["high"], "label": "high noise"},
            {"id": "stage_mid", "x0": TRJ.STAGE_BOUNDS["mid"][0], "x1": TRJ.STAGE_BOUNDS["mid"][1],
             "color": STAGE_COLOR["mid"], "label": "middle"},
            {"id": "stage_low", "x0": TRJ.STAGE_BOUNDS["low"][0], "x1": TRJ.STAGE_BOUNDS["low"][1],
             "color": STAGE_COLOR["low"], "label": "low noise"},
        ]
        P.stage_regions(self, timeline, regions, height=0.95, y_offset=2.0, run_time=0.9)

        experts = VGroup(*[
            A.module(f"expert_{i+1}", f"expert {i+1}", learned=True, width=2.4, height=0.9)
            .move_to(np.array([XS[key], 0.5, 0]))
            for i, key in enumerate(["high", "mid", "low"])
        ])
        self.play(LaggedStart(*[FadeIn(e, shift=UP * 0.12) for e in experts], lag_ratio=0.15),
                  run_time=0.9)

        # DiT evaluations: first computed, the rest predicted (skipped)
        blocks = VGroup(*[A.module(f"dit_{i}", "DiT", width=1.3, height=0.8) for i in range(6)])
        blocks.arrange(RIGHT, buff=0.45).move_to(DOWN * 1.5)
        self.play(FadeIn(blocks, shift=UP * 0.12), run_time=0.6)

        forecast = VGroup(*[
            A.dashed_arrow(experts[i].get_bottom() + DOWN * 0.05,
                           blocks[1 + 2 * i].get_top() + UP * 0.05,
                           color=STAGE_COLOR[key]) for i, key in enumerate(["high", "mid", "low"])
        ])
        skips = VGroup(*[A.skip_mark(blocks[i], color=T.RED) for i in range(1, 6)])
        self.play(LaggedStart(*[Create(f) for f in forecast], lag_ratio=0.15), run_time=0.8)
        self.play(*[blocks[i].animate.set_opacity(0.32) for i in range(1, 6)],
                  FadeIn(skips), run_time=0.7)

        cap = P.caption(self, "stage-aware experts forecast the skipped features")
        self.play(FadeIn(cap, shift=UP * 0.1), run_time=0.6)
        self.wait(timing.tail(SID, 1.6, anim_estimate=7.2))
