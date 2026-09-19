from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import trajectory as TRJ

SID = "lesa_03_stage_dynamics"

STAGE_COLOR = {"high": T.ROLE["stage_high"], "mid": T.ROLE["stage_mid"], "low": T.ROLE["stage_low"]}


class LESA03StageDynamics(Scene):
    """The aha moment: the trajectory has three regimes with different dynamics."""

    def construct(self):
        T.apply_background(self)
        pts = TRJ.points()
        steps = TRJ.steps()

        title = P.title(self, "Feature dynamics are stage-dependent")
        self.play(Write(title), run_time=0.5)

        timeline = A.timeline("trajectory", length=10.8, ticks=13).move_to(DOWN * 1.65)
        path = VMobject().set_points_as_corners(pts)
        path.set_stroke(T.BLUE, 4)
        dot = A.dot_node("feature_point", color=T.BLUE, radius=0.1).move_to(pts[0])
        self.play(Create(timeline), Create(path), FadeIn(dot), run_time=1.0)

        bars = VGroup()
        for i, s in enumerate(steps):
            h = max(0.05, abs(s) * 1.7)
            bar = Rectangle(width=0.34, height=h, stroke_width=0,
                            fill_color=T.AMBER, fill_opacity=0.65)
            bar.move_to(np.array([(pts[i][0] + pts[i + 1][0]) / 2.0, -1.65 - h / 2 - 0.04, 0]))
            bars.add(bar)

        # REPLAY the motion, then read the three regimes from the same objects
        self.play(MoveAlongPath(dot, path),
                  LaggedStart(*[GrowFromEdge(b, UP) for b in bars], lag_ratio=0.12),
                  run_time=3.4)

        note = A.text("large, irregular", size=T.SIZE_SMALL, color=STAGE_COLOR["high"])
        note.move_to(np.array([-3.9, 2.45, 0]))
        self.play(FadeIn(note), Indicate(bars[0:3], color=STAGE_COLOR["high"]), run_time=0.8)
        self.play(Transform(note, A.text("small, smooth", size=T.SIZE_SMALL,
                                         color=STAGE_COLOR["mid"]).move_to(np.array([-0.1, 2.45, 0]))),
                  Indicate(bars[3:9], color=STAGE_COLOR["mid"]), run_time=0.8)
        self.play(Transform(note, A.text("fine refinement", size=T.SIZE_SMALL,
                                         color=STAGE_COLOR["low"]).move_to(np.array([3.9, 2.45, 0]))),
                  Indicate(bars[9:], color=STAGE_COLOR["low"]), run_time=0.8)

        # STAGE-SPLIT: colour the one timeline into three semantic stages
        regions = [
            {"id": "stage_high", "x0": TRJ.STAGE_BOUNDS["high"][0], "x1": TRJ.STAGE_BOUNDS["high"][1],
             "color": STAGE_COLOR["high"], "label": "high noise: drastic"},
            {"id": "stage_mid", "x0": TRJ.STAGE_BOUNDS["mid"][0], "x1": TRJ.STAGE_BOUNDS["mid"][1],
             "color": STAGE_COLOR["mid"], "label": "middle: stable, continuous"},
            {"id": "stage_low", "x0": TRJ.STAGE_BOUNDS["low"][0], "x1": TRJ.STAGE_BOUNDS["low"][1],
             "color": STAGE_COLOR["low"], "label": "low noise: detail refinement"},
        ]
        groups = P.stage_regions(self, timeline, regions, height=1.25, y_offset=-1.65, run_time=1.0)

        # recolour the change bars by their stage
        self.play(*[bars[i].animate.set_fill(STAGE_COLOR[TRJ.stage_of_index(i)], 0.75)
                    for i in range(len(bars))], run_time=0.9)
        self.wait(timing.beat_dwell(SID, "split", 0.6))

        q = A.text("Why should one predictor handle all three?",
                   size=T.SIZE_HEAD, color=T.INK, weight="BOLD").move_to(UP * 2.45)
        self.play(FadeOut(note), FadeIn(q, shift=DOWN * 0.15), run_time=0.7)
        self.wait(timing.tail(SID, 1.4, anim_estimate=12.0))
