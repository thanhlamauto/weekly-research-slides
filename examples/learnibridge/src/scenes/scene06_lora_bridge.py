from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lb_06_lora_bridge"


class LB06LoraBridge(Scene):
    """Low rank -> a thin BA path on the final block's linear layers."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Low rank suggests LoRA")
        self.play(Write(title), run_time=0.5)

        # the final Transformer block with its linear layers
        panel = A.panel("final_block", "final block", width=6.2, height=3.2).move_to(np.array([0.6, 0.35, 0]))
        self.play(FadeIn(panel), run_time=0.5)

        names = ["W_Q", "W_K", "W_V", "W_O", "W_1", "W_2"]
        layers = VGroup(*[
            A.module(f"layer_{i}", names[i], width=1.45, height=0.62, label_size=T.SIZE_SMALL)
            for i in range(6)
        ])
        layers.arrange_in_grid(rows=2, cols=3, buff=(0.35, 0.42)).move_to(panel.get_center())
        self.play(LaggedStart(*[FadeIn(l, shift=UP * 0.08) for l in layers], lag_ratio=0.08),
                  run_time=0.9)
        self.wait(timing.beat_dwell(SID, "final_block", 0.4))

        # freeze the pretrained weights
        frozen = VGroup(*[l[0] for l in layers])
        self.play(*[f.animate.set_stroke(T.MUTED).set_fill(T.SLATE_SOFT) for f in frozen],
                  run_time=0.6)
        lock = A.label("pretrained weights: frozen", size=T.SIZE_TINY, color=T.MUTED)
        lock.next_to(panel, UP, buff=0.16)
        self.play(FadeIn(lock), run_time=0.4)
        self.wait(timing.beat_dwell(SID, "freeze", 0.35))

        # thin low-rank path
        ba = A.module("lora_path", "ΔW = B A", learned=True, width=2.0, height=0.6,
                      label_size=T.SIZE_SMALL).next_to(panel, DOWN, buff=0.5)
        thin = A.label("a thin low-rank path", size=T.SIZE_TINY, color=T.AMBER)
        thin.next_to(ba, DOWN, buff=0.12)
        self.play(FadeIn(ba, shift=UP * 0.1), FadeIn(thin), run_time=0.6)
        plus = A.operator("plus_lora", "+", radius=0.2, color=T.AMBER).move_to(
            ba.get_top() + UP * 0.28)
        self.play(FadeIn(plus), run_time=0.3)
        self.wait(timing.beat_dwell(SID, "lora", 0.5))

        # cached input through the augmented block
        cached = A.feature_node("cached_input", "x^L_t", radius=0.3, color=T.AMBER, fill=T.AMBER_SOFT)
        cached.move_to(panel.get_left() + LEFT * 1.5)
        out = A.feature_node("feature_out", "output", radius=0.32)
        out.move_to(panel.get_right() + RIGHT * 1.5)
        a_in = A.arrow(cached.get_right() + RIGHT * 0.02, panel.get_left() + LEFT * 0.02,
                       color=T.AMBER, actor_id="bridge_in")
        a_out = A.arrow(panel.get_right() + RIGHT * 0.02, out.get_left() + LEFT * 0.02,
                        actor_id="bridge_out")
        self.play(FadeIn(cached), GrowArrow(a_in), run_time=0.6)
        self.play(GrowArrow(a_out), FadeIn(out), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "bridge", 0.45))

        note = A.text("approximates the skipped full computation", size=T.SIZE_SMALL,
                      color=T.INK_SOFT).move_to(np.array([0.6, -2.35, 0]))
        self.play(FadeIn(note), run_time=0.5)
        self.wait(timing.beat_dwell(SID, "output", 0.45))

        fit = A.text("Low rank follows from the analysis.", size=T.SIZE_BODY,
                     color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.45)
        self.play(FadeIn(fit, shift=UP * 0.1), run_time=0.6)
        self.wait(timing.tail(SID, 1.1, anim_estimate=8.23))
