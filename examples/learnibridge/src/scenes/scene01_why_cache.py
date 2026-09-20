from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lb_01_why_cache"


class LB01WhyCache(Scene):
    """Diffusion repeats expensive work; caching skips it, but how far can it go?"""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Why cache diffusion features?")
        self.play(Write(title), run_time=0.5)

        n = 6
        blocks = VGroup(*[A.module(f"dit_{i}", "DiT", width=1.45, height=0.85) for i in range(n)])
        blocks.arrange(RIGHT, buff=0.42).move_to(UP * 0.8)
        self.play(LaggedStart(*[FadeIn(b, shift=DOWN * 0.12) for b in blocks], lag_ratio=0.08),
                  run_time=0.9)

        tl = A.timeline("denoise_timeline", length=10.2, ticks=11).move_to(DOWN * 0.5)
        ticks = VGroup(*[A.label(f"t{i}", size=T.SIZE_TINY) for i in range(0, 11, 2)])
        for i, lab in enumerate(ticks):
            lab.move_to(tl[1][i * 2].get_center() + DOWN * 0.32)
        self.play(Create(tl), FadeIn(ticks), run_time=0.6)

        feature = A.feature_node("feature_t", "h_{t}", radius=0.3)
        feature.move_to(blocks[0].get_bottom() + DOWN * 0.62)
        self.play(FadeIn(feature, shift=RIGHT * 0.2), run_time=0.4)

        # TRACE: the same feature passes through consecutive blocks
        for i in range(3):
            self.play(feature.animate.move_to(blocks[i].get_bottom() + DOWN * 0.62), run_time=0.45)
        self.wait(timing.beat_dwell(SID, "trace", 0.3))

        # REUSE: store the feature, skip the later blocks
        cache = A.cache_stack("cache", "cache", width=1.25, height=0.7).move_to(blocks[4].get_top() + UP * 0.8)
        self.play(FadeIn(cache, shift=DOWN * 0.15), run_time=0.5)
        self.play(feature.animate.move_to(cache.get_bottom() + DOWN * 0.2), run_time=0.5)
        reuse = VGroup(*[
            A.dashed_arrow(cache.get_bottom(), blocks[i].get_top() + UP * 0.04, actor_id=f"reuse_{i}")
            for i in (3, 4, 5)
        ])
        self.play(LaggedStart(*[Create(r) for r in reuse], lag_ratio=0.15), run_time=0.8)
        skips = VGroup(*[A.skip_mark(blocks[i]) for i in (3, 4, 5)])
        self.play(LaggedStart(*[Create(s) for s in skips], lag_ratio=0.12), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "reuse", 0.4))

        question = A.text("How far can one stored feature be pushed?", size=T.SIZE_BODY,
                          color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.5)
        self.play(FadeIn(question, shift=UP * 0.12), run_time=0.6)
        self.wait(timing.tail(SID, 1.0, anim_estimate=7.73))
