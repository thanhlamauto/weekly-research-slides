from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P
import timing

SID = "lb_07_training_inference"


class LB07TrainingInference(Scene):
    """Calibration pair, LoRA-only training, and what actually runs at inference."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "Calibration and inference")
        self.play(Write(title), run_time=0.5)

        # --- training pair ---
        tl = A.timeline("trajectory", length=9.6, ticks=9).move_to(np.array([-0.4, 2.0, 0]))
        self.play(Create(tl), run_time=0.5)
        full = Dot(tl[1][0].get_center(), radius=0.09, color=T.GREEN)
        skip = Dot(tl[1][4].get_center(), radius=0.09, color=T.AMBER)
        full_lab = A.label("full step", size=T.SIZE_TINY, color=T.GREEN).next_to(full, UP, buff=0.12)
        skip_lab = A.label("skipped step", size=T.SIZE_TINY, color=T.AMBER).next_to(skip, UP, buff=0.12)
        self.play(FadeIn(full), FadeIn(full_lab), run_time=0.5)
        self.play(FadeIn(skip), FadeIn(skip_lab), run_time=0.5)
        self.wait(timing.beat_dwell(SID, "training", 0.4))

        cached = A.feature_node("cached_input", "x^L_t", radius=0.3, color=T.AMBER, fill=T.AMBER_SOFT)
        cached.move_to(np.array([-4.6, 0.4, 0]))
        target = A.feature_node("target_output", "target", radius=0.32, color=T.GREEN, fill=T.GREEN_SOFT)
        target.move_to(np.array([3.9, 0.4, 0]))
        pair_lab = A.label("one cached input, one ground-truth target", size=T.SIZE_TINY)
        pair_lab.move_to(np.array([-0.4, 0.95, 0]))
        self.play(FadeIn(cached, shift=RIGHT * 0.15), FadeIn(target), FadeIn(pair_lab), run_time=0.7)
        self.wait(timing.beat_dwell(SID, "pair", 0.55))

        lora = A.module("final_block_lora", "final block + BA", learned=True,
                        width=2.6, height=0.85).move_to(np.array([-0.9, 0.4, 0]))
        a1 = A.arrow(cached.get_right() + RIGHT * 0.02, lora.get_left() + LEFT * 0.02, color=T.AMBER)
        a2 = A.arrow(lora.get_right() + RIGHT * 0.02, target.get_left() + LEFT * 0.02)
        loss = A.label("train only the LoRA weights", size=T.SIZE_TINY, color=T.AMBER)
        loss.next_to(lora, DOWN, buff=0.16)
        self.play(FadeIn(lora), GrowArrow(a1), GrowArrow(a2), FadeIn(loss), run_time=0.8)
        self.wait(timing.beat_dwell(SID, "train", 0.45))

        # --- inference path ---
        infer_lab = A.text("Inference", size=T.SIZE_SMALL, color=T.MUTED, weight="BOLD")
        infer_lab.move_to(np.array([-5.4, -0.9, 0]))
        blocks = VGroup(*[
            A.module(f"block_{i}", "block", width=0.95, height=0.6, label_size=T.SIZE_TINY)
            for i in range(6)
        ]).arrange(RIGHT, buff=0.22).move_to(np.array([-0.6, -1.0, 0]))
        self.play(FadeIn(infer_lab), LaggedStart(*[FadeIn(b) for b in blocks], lag_ratio=0.06),
                  run_time=0.8)
        self.wait(timing.beat_dwell(SID, "inference", 0.45))

        skipped = VGroup(*[A.skip_mark(blocks[i], color=T.RED) for i in (1, 2, 4, 5)])
        self.play(LaggedStart(*[Create(s) for s in skipped], lag_ratio=0.1), run_time=0.7)
        skip_note = A.label("skip the earlier blocks between full steps", size=T.SIZE_TINY, color=T.RED)
        skip_note.next_to(blocks, DOWN, buff=0.2)
        self.play(FadeIn(skip_note), run_time=0.4)
        self.wait(timing.beat_dwell(SID, "skip", 0.5))

        final = blocks[5]
        self.play(final.animate.set_stroke(T.AMBER).set_fill(T.AMBER_SOFT), run_time=0.5)
        ba = A.label("+ BA", size=T.SIZE_TINY, color=T.AMBER).next_to(final, UP, buff=0.1)
        self.play(FadeIn(ba), run_time=0.3)
        run_note = A.text("Only the final block, with its adapter, runs.",
                          size=T.SIZE_SMALL, color=T.INK_SOFT).move_to(np.array([0.6, -2.1, 0]))
        self.play(FadeIn(run_note, shift=UP * 0.1), run_time=0.6)
        self.wait(timing.beat_dwell(SID, "run", 0.5))

        recap = A.text("stale cache  →  structured correction  →  low rank  →  few prompts  →  bridge",
                       size=T.SIZE_SMALL, color=T.INK, weight="BOLD").to_edge(DOWN, buff=0.45)
        self.play(FadeIn(recap, shift=UP * 0.1), run_time=0.7)
        self.wait(timing.tail(SID, 1.2, anim_estimate=10.47, max_hold=10.5))
