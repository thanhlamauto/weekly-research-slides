from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing
import dims as D

SID = "lc_04_decompose"


class LC04Decompose(Scene):
    """A learnable invertible mapping regroups dimensions into three groups."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Learnable decomposition")
        self.play(Write(title), run_time=0.5)

        kinds = ["unstable", "smooth", "curved", "smooth", "unstable", "curved", "smooth", "unstable"]
        row = D.dim_row(kinds).move_to(np.array([-3.9, 0.6, 0]))
        self.play(FadeIn(row, shift=DOWN * 0.1), run_time=0.5)
        self.wait(timing.beat_dwell(SID, "map", 0.4))

        mapping = A.module("mapping", "E_theta", learned=True, width=1.7, height=0.9)
        mapping.move_to(np.array([0.0, 0.6, 0]))
        self.play(FadeIn(mapping, shift=RIGHT * 0.1), run_time=0.5)
        self.play(GrowArrow(A.arrow(row.get_right() + RIGHT * 0.05, mapping.get_left() + LEFT * 0.03,
                                    color=T.AMBER)), run_time=0.4)

        # regroup into three semantic groups
        groups = {
            "z0": ["unstable", "unstable", "unstable"],
            "z1": ["smooth", "smooth", "smooth"],
            "z2": ["curved", "curved"],
        }
        colors = {k: D.KIND_COLORS[k] for k in ("unstable", "smooth", "curved")}
        targets = {}
        y0 = 1.35
        for i, (name, gk) in enumerate(groups.items()):
            g = D.dim_row(gk, cell=0.3, actor_id=name)
            g.move_to(np.array([3.6, y0 - i * 0.85, 0]))
            targets[name] = g
        group_anims = []
        for name, g in targets.items():
            group_anims.append(FadeIn(g, shift=LEFT * 0.15))
        self.play(LaggedStart(*group_anims, lag_ratio=0.15), run_time=0.9)
        self.play(GrowArrow(A.arrow(mapping.get_right() + RIGHT * 0.05,
                                    targets["z0"].get_left() + LEFT * 0.03, color=T.AMBER)),
                  run_time=0.4)
        self.wait(timing.beat_dwell(SID, "groups", 0.5))

        labels = {
            "z0": ("unstable dimensions", T.RED),
            "z1": ("smooth dimensions", T.BLUE),
            "z2": ("curved dimensions", T.AMBER),
        }
        for name in ("z0", "z1", "z2"):
            text, color = labels[name]
            lab = A.label(text, size=T.SIZE_TINY, color=color).next_to(targets[name], RIGHT, buff=0.2)
            self.play(FadeIn(lab), run_time=0.3)
            self.wait(timing.beat_dwell(SID, name, 0.35))

        note = A.text("Three groups is the design choice used in the paper.", size=T.SIZE_SMALL,
                      color=T.MUTED).to_edge(DOWN, buff=0.45)
        self.play(FadeIn(note), run_time=0.5)
        self.wait(timing.tail(SID, 1.0, anim_estimate=8.0))
