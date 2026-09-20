from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lb_03_change_question"


class LB03ChangeQuestion(Scene):
    """Reframe prediction as correction: cached computation + correction ~= future."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Change the question")
        self.play(Write(title), run_time=0.5)

        # top: the previous framing - predict the future from the past
        past = VGroup(*[
            A.feature_node(f"past_{i}", f"h_{{t+{2 - i}}}", radius=0.25, label_size=T.SIZE_TINY)
            for i in range(3)
        ]).arrange(RIGHT, buff=0.8).move_to(np.array([-3.6, 1.5, 0]))
        future = A.feature_node("future_feature", "h_{t-k}", radius=0.3).move_to(np.array([2.6, 1.5, 0]))
        predict = A.dashed_arrow(past.get_right() + RIGHT * 0.05, future.get_left() + LEFT * 0.05,
                                 color=T.BLUE, actor_id="predict_arrow")
        predict_lab = A.label("predict the future", size=T.SIZE_TINY, color=T.BLUE).next_to(predict, UP, buff=0.08)
        self.play(FadeIn(past, shift=RIGHT * 0.15), FadeIn(future), run_time=0.6)
        self.play(Create(predict), FadeIn(predict_lab), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "ask", 0.4))

        # the reframe
        q = A.text("What correction makes the cached computation behave like the full one?",
                   size=T.SIZE_SMALL + 2, color=T.INK, weight="BOLD").move_to(np.array([0, 0.45, 0]))
        self.play(FadeIn(q, shift=UP * 0.1), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "reframe", 0.5))

        # bottom: cached computation + correction -> future computation
        cached_box = A.module("cached_computation", "cached", width=2.1, height=0.95).move_to(np.array([-3.4, -1.35, 0]))
        plus = A.operator("correction", "+", radius=0.27, color=T.AMBER).move_to(np.array([-1.75, -1.35, 0]))
        corr_box = A.module("correction_path", "correction", learned=True, width=2.2, height=0.95).move_to(np.array([-0.1, -1.35, 0]))
        future_box = A.module("future_computation", "future", width=2.0, height=0.95).move_to(np.array([2.9, -1.35, 0]))
        ar = VGroup(
            A.arrow(cached_box.get_right() + RIGHT * 0.02, plus.get_left() + LEFT * 0.02, width=2.6),
            A.arrow(corr_box.get_right() + RIGHT * 0.02, future_box.get_left() + LEFT * 0.02, width=2.6),
        )
        self.play(FadeIn(cached_box), FadeIn(plus), FadeIn(corr_box), FadeIn(future_box),
                  Create(ar), run_time=0.9)
        self.play(Indicate(corr_box, color=T.AMBER, scale_factor=1.06), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "setup", 0.5))

        eq = A.mathlabel("cached + correction  ≈  future", size=T.SIZE_EQ).move_to(np.array([0, -2.65, 0]))
        self.play(Write(eq), run_time=0.8)
        note = A.label("a small structured update, not a new predictor",
                       size=T.SIZE_TINY, color=T.MUTED).next_to(eq, DOWN, buff=0.2)
        self.play(FadeIn(note), run_time=0.5)
        self.wait(timing.tail(SID, 1.1, anim_estimate=6.63))
