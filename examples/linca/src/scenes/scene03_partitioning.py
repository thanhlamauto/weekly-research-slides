from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import dims as D

SID = "lc_03_partitioning"


class LC03Partitioning(Scene):
    """A contiguous split mixes behaviours; the grouping must be learned."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "A naive split is not enough")
        self.play(Write(title), run_time=0.5)

        row = D.dim_row(["unstable", "smooth", "curved", "smooth", "unstable", "curved", "smooth", "unstable"])
        row.move_to(UP * 0.6)
        self.play(FadeIn(row, shift=DOWN * 0.1), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "split", 0.4))

        half = row.width / 2
        left_brace = Brace(row[:4], DOWN, buff=0.14, color=T.MUTED)
        right_brace = Brace(row[4:], DOWN, buff=0.14, color=T.MUTED)
        left_lab = A.label("group A", size=T.SIZE_TINY).next_to(left_brace, DOWN, buff=0.08)
        right_lab = A.label("group B", size=T.SIZE_TINY).next_to(right_brace, DOWN, buff=0.08)
        self.play(FadeIn(left_brace), FadeIn(left_lab), FadeIn(right_brace), FadeIn(right_lab), run_time=0.6)

        mixed = A.label("smooth and unstable dimensions land in the same group",
                        size=T.SIZE_SMALL, color=T.RED).move_to(DOWN * 1.1)
        self.play(FadeIn(mixed, shift=UP * 0.1), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "naive", 0.6))

        q = A.text("Can we learn a representation that groups them by behaviour?",
                   size=T.SIZE_BODY, color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.5)
        self.play(FadeIn(q, shift=UP * 0.12), run_time=0.7)
        self.wait(timing.tail(SID, 1.0, anim_estimate=5.0))
