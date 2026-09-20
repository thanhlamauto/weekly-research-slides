from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lb_05_prompt_invariant"


class LB05PromptInvariant(Scene):
    """Disjoint prompt groups fit corrections in similar subspaces."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "A few prompts are enough")
        self.play(Write(title), run_time=0.5)

        # five prompt groups
        groups = VGroup(*[
            A.panel(f"group_{i}", f"G{i + 1}", width=1.35, height=0.72)
            for i in range(5)
        ]).arrange(RIGHT, buff=0.35).move_to(np.array([0.0, 1.7, 0]))
        groups_lab = A.label("disjoint prompt groups", size=T.SIZE_TINY).next_to(groups, UP, buff=0.2)
        self.play(LaggedStart(*[FadeIn(g, shift=DOWN * 0.1) for g in groups], lag_ratio=0.1),
                  FadeIn(groups_lab), run_time=0.9)
        self.wait(timing.beat_dwell(SID, "split", 0.35))

        # each group fits a correction -> a principal subspace (a line segment)
        subs = VGroup()
        for i, g in enumerate(groups):
            sub = Line(np.array([-0.42, -0.28, 0]), np.array([0.42, 0.28, 0]),
                       color=T.AMBER, stroke_width=4)
            sub.move_to(g.get_bottom() + DOWN * 0.65)
            sub.rotate((i - 2) * 0.05)
            lab = A.label(f"ΔW{i + 1}", size=T.SIZE_TINY, color=T.AMBER).next_to(sub, DOWN, buff=0.08)
            subs.add(A.tag(VGroup(sub, lab), f"subspace_{i}", "stage"))
        self.play(LaggedStart(*[FadeIn(s, shift=DOWN * 0.1) for s in subs], lag_ratio=0.12),
                  run_time=1.0)
        self.wait(timing.beat_dwell(SID, "per_group", 0.35))
        self.wait(timing.beat_dwell(SID, "subspaces", 0.35))

        # pairwise angles are small
        angles = VGroup()
        for i in range(4):
            a = subs[i][0].get_center()
            b = subs[i + 1][0].get_center()
            arc = ArcBetweenPoints(a, b, angle=-0.5, color=T.GREEN, stroke_width=3)
            angles.add(arc)
        small_lab = A.label("pairwise angles: consistently small", size=T.SIZE_SMALL, color=T.GREEN)
        small_lab.next_to(subs, DOWN, buff=0.75)
        self.play(LaggedStart(*[Create(a) for a in angles], lag_ratio=0.12),
                  FadeIn(small_lab), run_time=1.0)
        self.wait(timing.beat_dwell(SID, "angles", 0.5))
        self.wait(timing.beat_dwell(SID, "small", 0.45))

        concl = A.text("Different prompts need corrections in similar directions.",
                       size=T.SIZE_BODY, color=T.INK, weight="BOLD").move_to(np.array([0.0, -1.6, 0]))
        conseq = A.label("so a few calibration prompts can generalize",
                         size=T.SIZE_SMALL, color=T.MUTED).next_to(concl, DOWN, buff=0.25)
        self.play(FadeIn(concl, shift=UP * 0.1), run_time=0.7)
        self.play(FadeIn(conseq), run_time=0.5)
        self.wait(timing.tail(SID, 1.1, anim_estimate=6.57))
