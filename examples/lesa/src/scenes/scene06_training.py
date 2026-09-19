from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lesa_06_training"


class LESA06Training(Scene):
    """Ground-truth guided training does not match the inference regime."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Ground-truth guided, then closed-loop")
        self.play(Write(title), run_time=0.5)

        GT = T.ROLE["ground_truth"]
        PRED = T.ROLE["predicted"]

        predictor = A.module("predictor", "predictor", learned=True,
                             width=2.6, height=1.1).move_to(np.array([0, 0.9, 0]))
        hist_labels = ["h_{t+K-1}", "h_{t+K-2}", "h_{t}"]
        hist = VGroup(*[
            A.feature_node(f"history_gt_{i}", hist_labels[i], radius=0.3,
                           color=GT, label_size=T.SIZE_SMALL)
            for i in range(3)
        ]).arrange(DOWN, buff=0.32).move_to(np.array([-4.2, 0.9, 0]))
        out = A.feature_node("output", "ĥ_{t-1}", radius=0.4, color=GT).move_to(np.array([3.8, 0.9, 0]))
        in_arrows = VGroup(*[
            A.arrow(hist[i].get_right() + RIGHT * 0.02, predictor.get_left() + LEFT * 0.02,
                    width=2.2, color=GT) for i in range(3)
        ])
        out_arrow = A.arrow(predictor.get_right() + RIGHT * 0.02, out.get_left() + LEFT * 0.02,
                            width=2.6, color=GT)
        # labels sit ABOVE the column so they never run off the left edge
        hist_label = A.label("ground-truth history", size=T.SIZE_SMALL, color=GT)
        hist_label.move_to(np.array([-4.2, 2.15, 0]))
        loss = A.label("L1 loss to the true feature", size=T.SIZE_SMALL, color=GT)
        loss.move_to(np.array([2.5, 0.25, 0]))

        self.play(FadeIn(predictor), run_time=0.4)
        self.play(FadeIn(hist, shift=RIGHT * 0.15), FadeIn(hist_label), run_time=0.7)
        self.play(LaggedStart(*[GrowArrow(a) for a in in_arrows], lag_ratio=0.1), run_time=0.5)
        self.play(GrowArrow(out_arrow), FadeIn(out), FadeIn(loss), run_time=0.7)
        self.wait(0.4)

        # COMPARE: accelerated inference feeds imperfect histories
        infer = A.label("at inference the history contains the model's own predictions",
                        size=T.SIZE_SMALL, color=PRED)
        infer.move_to(np.array([-2.4, -0.35, 0]))
        self.play(
            *[hist[i].animate.set_color(PRED) for i in range(3)],
            *[in_arrows[i].animate.set_color(PRED) for i in range(3)],
            Transform(hist_label, A.label("predicted history", size=T.SIZE_SMALL,
                                          color=PRED).move_to(np.array([-4.2, 2.15, 0]))),
            FadeIn(infer),
            run_time=1.0,
        )
        self.wait(0.4)

        # ACCUMULATION / MORPH: a feedback path closes the loop and carries drift
        fb_y = -1.9
        c1 = np.array([3.8, fb_y, 0])
        c2 = np.array([-4.2, fb_y, 0])
        down = Line(out.get_bottom() + DOWN * 0.05, c1, color=PRED, stroke_width=3)
        left = Line(c1, c2, color=PRED, stroke_width=3)
        up = A.arrow(c2, hist.get_bottom() + DOWN * 0.05, color=PRED, width=3)
        self.play(Create(down), run_time=0.4)
        self.play(Create(left), run_time=1.0)
        self.play(GrowArrow(up), run_time=0.5)

        drift = A.label("prediction error accumulates around the loop",
                        size=T.SIZE_SMALL, color=PRED).move_to(np.array([0, fb_y - 0.38, 0]))
        self.play(FadeIn(drift), run_time=0.5)
        self.wait(timing.beat_dwell(SID, "drift", 0.6))

        cap = P.caption(self, "closed-loop training uses the same imperfect history seen at inference")
        self.play(FadeIn(cap, shift=UP * 0.1), run_time=0.6)
        self.wait(timing.tail(SID, 1.0, anim_estimate=9.2))
