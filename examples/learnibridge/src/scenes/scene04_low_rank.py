from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lb_04_low_rank"


def matrix_grid(rows: int, cols: int, cell: float = 0.22, color: str = None):
    color = color or T.RULE
    cells = VGroup()
    for c in range(cols):
        for r in range(rows):
            rect = Rectangle(width=cell * 0.86, height=cell * 0.86, color=color,
                             stroke_width=1.1, fill_color=T.SLATE_SOFT, fill_opacity=1.0)
            rect.move_to(np.array([c * cell, -r * cell, 0.0]))
            cells.add(rect)
    return cells


class LB04LowRank(Scene):
    """E ~= dW X, dW = E X^+, rapid singular-value decay -> low rank."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "The correction is low-rank")
        self.play(Write(title), run_time=0.5)

        # X: layer inputs, one column per sample
        X = matrix_grid(3, 8).move_to(np.array([-3.5, 1.05, 0]))
        X_lab = A.mathlabel("X", size=T.SIZE_BODY, weight="BOLD").next_to(X, LEFT, buff=0.18)
        X_note = A.label("layer inputs, one column per sample", size=T.SIZE_TINY).next_to(X, DOWN, buff=0.14)
        self.play(FadeIn(X, shift=UP * 0.1), FadeIn(X_lab), run_time=0.6)
        self.play(FadeIn(X_note), run_time=0.4)
        self.wait(timing.beat_dwell(SID, "collect", 0.4))

        # E: cross-timestep residuals
        E = matrix_grid(3, 8, color=T.AMBER).move_to(np.array([3.5, 1.05, 0]))
        for cell in E:
            cell.set_fill(T.AMBER_SOFT)
        E_lab = A.mathlabel("E", size=T.SIZE_BODY, weight="BOLD").next_to(E, RIGHT, buff=0.18)
        E_note = A.label("layer difference between timesteps", size=T.SIZE_TINY).next_to(E, DOWN, buff=0.14)
        self.play(FadeIn(E, shift=UP * 0.1), FadeIn(E_lab), run_time=0.6)
        self.play(FadeIn(E_note), run_time=0.4)
        self.wait(timing.beat_dwell(SID, "residual", 0.35))

        # linear model: E ~= dW X
        dW = A.module("dW", "ΔW", learned=True, width=1.5, height=0.9).move_to(np.array([0.0, 1.05, 0]))
        self.play(FadeIn(dW, shift=DOWN * 0.1), run_time=0.5)
        eq1 = A.mathlabel("E  ≈  ΔW · X", size=T.SIZE_EQ).move_to(np.array([0.0, -0.35, 0]))
        self.play(Write(eq1), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "linear", 0.45))

        # closed form
        eq2 = A.mathlabel("ΔW  =  E · X⁺", size=T.SIZE_EQ).move_to(np.array([0.0, -1.15, 0]))
        plus_note = A.label("X⁺ is the pseudo-inverse of X", size=T.SIZE_TINY, color=T.MUTED)
        plus_note.next_to(eq2, DOWN, buff=0.16)
        self.play(TransformMatchingShapes(eq1, eq2), run_time=0.9)
        self.play(FadeIn(plus_note), run_time=0.4)
        self.wait(timing.beat_dwell(SID, "closed_form", 0.5))

        # spectrum: singular values decay fast
        heights = [1.5, 1.0, 0.62, 0.38, 0.22, 0.12, 0.06, 0.03]
        bars = VGroup()
        for i, h in enumerate(heights):
            bar = Rectangle(width=0.32, height=h, color=T.BLUE, stroke_width=0,
                            fill_color=T.BLUE, fill_opacity=0.75)
            bar.move_to(np.array([-4.6 + i * 0.5, -3.0 + h / 2.0, 0]))
            bars.add(bar)
        spec_lab = A.label("singular values of X", size=T.SIZE_TINY, color=T.BLUE)
        spec_lab.next_to(bars, RIGHT, buff=0.25)
        self.play(LaggedStart(*[GrowFromEdge(b, DOWN) for b in bars], lag_ratio=0.08),
                  FadeIn(spec_lab), run_time=1.1)
        self.wait(timing.beat_dwell(SID, "spectrum", 0.6))

        # consequence: low rank
        thin = A.module("dW_low_rank", "ΔW", learned=True, width=1.5, height=0.22)
        thin.move_to(dW.get_center())
        low = A.text("low rank", size=T.SIZE_SMALL, color=T.AMBER, weight="BOLD")
        low.next_to(dW, UP, buff=0.2)
        self.play(Transform(dW, thin), FadeIn(low, shift=DOWN * 0.1), run_time=0.8)
        self.wait(timing.tail(SID, 1.1, anim_estimate=9.23))
