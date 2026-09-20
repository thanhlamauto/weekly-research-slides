from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lb_02_stale_cache"


class LB02StaleCache(Scene):
    """The cached feature is held while the true feature moves; the gap grows."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Long-range reuse goes stale")
        self.play(Write(title), run_time=0.5)

        tl = A.timeline("skip_timeline", length=10.2, ticks=11).move_to(DOWN * 1.45)
        self.play(Create(tl), run_time=0.5)

        # the true feature evolves upward as denoising progresses
        true_pts = [np.array([-4.9 + i * 0.98, -0.55 + 0.055 * i * i, 0.0]) for i in range(11)]
        true_path = VMobject().set_points_as_corners(true_pts)
        true_path.set_stroke(T.GREEN, width=3, opacity=0.65)
        true_node = A.feature_node("feature_true", "true", radius=0.27, color=T.GREEN, fill=T.GREEN_SOFT)
        true_node.move_to(true_pts[0])
        cached = A.feature_node("feature_cached", "cached", radius=0.27, color=T.AMBER, fill=T.AMBER_SOFT)
        cached.move_to(true_pts[0] + LEFT * 1.35)

        self.play(FadeIn(cached), Create(true_path), FadeIn(true_node), run_time=0.7)

        # small skip: the gap is small
        self.play(true_node.animate.move_to(true_pts[1]), run_time=0.5)
        small_gap = A.dashed_arrow(cached.get_right(), true_node.get_left(), color=T.FAINT)
        small_lab = A.label("small gap", size=T.SIZE_TINY).next_to(small_gap, DOWN, buff=0.08)
        self.play(Create(small_gap), FadeIn(small_lab), run_time=0.5)
        self.wait(timing.beat_dwell(SID, "skip_small", 0.3))

        # long skip: the gap becomes drift
        self.play(FadeOut(small_gap), FadeOut(small_lab),
                  true_node.animate.move_to(true_pts[9]), run_time=1.1)
        drift = A.dashed_arrow(cached.get_right(), true_node.get_left(), color=T.RED)
        drift_lab = A.label("drift", size=T.SIZE_SMALL, color=T.RED).next_to(drift, UP, buff=0.06)
        self.play(Create(drift), FadeIn(drift_lab), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "skip_large", 0.6))

        # accumulated output error
        err = VGroup()
        for i in range(6):
            sq = Square(side_length=0.22, color=T.RED, stroke_width=2,
                        fill_color=T.RED, fill_opacity=0.16)
            sq.move_to(np.array([-4.4 + i * 0.3, -2.5, 0]))
            err.add(sq)
        err_lab = A.label("accumulated error", size=T.SIZE_TINY, color=T.RED).next_to(err, RIGHT, buff=0.2)
        self.play(LaggedStart(*[FadeIn(e) for e in err], lag_ratio=0.18), FadeIn(err_lab), run_time=0.9)
        self.wait(timing.beat_dwell(SID, "accumulate", 0.4))

        concl = A.text("Reuse is cheap. Stale features become wrong.", size=T.SIZE_BODY,
                       color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.5)
        self.play(FadeIn(concl, shift=UP * 0.12), run_time=0.6)
        self.wait(timing.tail(SID, 1.0, anim_estimate=7.40))
