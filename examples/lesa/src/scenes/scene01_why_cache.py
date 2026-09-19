from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P

SID = "lesa_01_why_cache"


class LESA01WhyCache(Scene):
    """Why cache diffusion features? Cost, reuse, skipped evaluations."""

    def construct(self):
        T.apply_background(self)
        n = 6

        title = P.title(self, "Diffusion inference is expensive")
        self.play(Write(title), run_time=0.5)

        blocks = VGroup(*[A.module(f"dit_{i}", "DiT", width=1.5, height=0.9) for i in range(n)])
        blocks.arrange(RIGHT, buff=0.5).move_to(UP * 0.55)
        arrows = VGroup(*[
            A.arrow(blocks[i].get_right() + RIGHT * 0.02,
                    blocks[i + 1].get_left() - RIGHT * 0.02, width=2.4)
            for i in range(n - 1)
        ])
        self.play(LaggedStart(*[FadeIn(b, shift=UP * 0.15) for b in blocks], lag_ratio=0.1),
                  run_time=1.1)
        self.play(LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.08), run_time=0.7)

        # cost meter
        squares = VGroup(*[
            Square(side_length=0.24, color=T.BLUE, stroke_width=2,
                   fill_color=T.BLUE, fill_opacity=0.10)
            for _ in range(n)
        ]).arrange(RIGHT, buff=0.12)
        meter_label = A.text("DiT evaluations", size=T.SIZE_SMALL, color=T.MUTED)
        meter = VGroup(meter_label, squares).arrange(RIGHT, buff=0.3).to_edge(DOWN, buff=1.05)
        self.play(FadeIn(meter, shift=UP * 0.15), run_time=0.5)

        feature = A.feature_node("feature_current", "h_{t}", radius=0.3)
        feature.move_to(np.array([blocks[0].get_left()[0] - 1.5, -0.55, 0]))
        self.play(FadeIn(feature, shift=RIGHT * 0.2), run_time=0.4)

        # TRACE: move the feature through every evaluation
        for i in range(n):
            target = np.array([blocks[i].get_center()[0], -0.55, 0])
            self.play(
                feature.animate.move_to(target),
                Indicate(blocks[i], color=T.BLUE, scale_factor=1.08),
                squares[i].animate.set_fill(T.BLUE, 1.0),
                run_time=0.42,
            )

        # MORPH: cache and skip
        cache = A.cache_stack("cache", "cache").move_to(
            np.array([blocks[0].get_center()[0] - 0.1, 2.15, 0]))
        self.play(FadeIn(cache, shift=DOWN * 0.2), run_time=0.5)
        self.play(feature.animate.move_to(np.array([blocks[0].get_center()[0], -0.55, 0])),
                  run_time=0.4)

        # reuse "bus": one dashed line with short drops to each skipped step
        bus_y = 1.62
        bus = DashedLine(np.array([cache.get_center()[0], bus_y, 0]),
                         np.array([blocks[-1].get_center()[0], bus_y, 0]),
                         color=T.MUTED, stroke_width=3, dash_length=0.14)
        drops = VGroup(*[
            A.dashed_arrow(np.array([blocks[i].get_center()[0], bus_y, 0]),
                           blocks[i].get_top() + UP * 0.03, color=T.MUTED, width=2.6)
            for i in range(1, n)
        ])
        skips = VGroup(*[A.skip_mark(blocks[i], color=T.RED) for i in range(1, n)])
        self.play(Create(bus), run_time=0.4)
        self.play(*[blocks[i].animate.set_opacity(0.32) for i in range(1, n)],
                  FadeIn(skips), run_time=0.6)
        self.play(LaggedStart(*[Create(r) for r in drops], lag_ratio=0.08), run_time=0.8)
        self.play(*[squares[i].animate.set_fill(T.BLUE, 0.10) for i in range(1, n)],
                  run_time=0.6)

        cap = P.caption(self, "cache the feature  →  skip the recomputation")
        self.play(FadeIn(cap, shift=UP * 0.1), run_time=0.5)
        self.wait(1.1)
