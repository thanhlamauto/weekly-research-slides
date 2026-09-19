from manim import *
import numpy as np

import theme as T
import actors as A
import patterns as P

SID = "lesa_05_expert_internals"


class LESA05ExpertInternals(Scene):
    """Inside one expert: spatial projection + KAN temporal modulation -> residual."""

    def construct(self):
        T.apply_background(self)
        title = P.title(self, "What does one expert predictor compute?")
        self.play(Write(title), run_time=0.5)

        panel = A.panel("expert_workspace", "one expert", width=12.6, height=5.6)
        panel.move_to(DOWN * 0.35)
        self.play(FadeIn(panel), run_time=0.5)

        # --- spatial path: history -> linear projection -> z ---
        hist_labels = ["h_{t+K-1}", "h_{t+K-2}", "h_{t}"]
        hist = VGroup(*[
            A.feature_node(f"history_features_{i}", hist_labels[i], radius=0.31,
                           label_size=T.SIZE_SMALL)
            for i in range(3)
        ])
        hist.arrange(DOWN, buff=0.42).move_to(np.array([-5.4, 0.75, 0]))
        dots = A.text("…", size=T.SIZE_HEAD, color=T.MUTED).move_to(np.array([-4.75, 0.75, 0]))
        linear = A.module("linear_proj", "Linear projection", learned=True,
                          width=2.5, height=1.1).move_to(np.array([-2.5, 0.75, 0]))
        z = A.feature_node("z", "z", radius=0.36).move_to(np.array([0.0, 0.75, 0]))
        h_arrows = VGroup(*[
            A.arrow(hist[i].get_right() + RIGHT * 0.02, linear.get_left() + LEFT * 0.02, width=2.4)
            for i in range(3)
        ])
        self.play(FadeIn(hist, shift=RIGHT * 0.15), FadeIn(dots), run_time=0.7)
        self.play(LaggedStart(*[GrowArrow(a) for a in h_arrows], lag_ratio=0.1), run_time=0.6)
        self.play(FadeIn(linear, shift=RIGHT * 0.15), run_time=0.5)
        self.play(GrowArrow(A.arrow(linear.get_right() + RIGHT * 0.02, z.get_left() + LEFT * 0.02,
                                    color=T.BLUE)), FadeIn(z), run_time=0.6)

        # --- temporal path: dt offsets -> KAN -> alpha ---
        dt = A.mathlabel("Δt_{L-1} … Δt_{0}", size=T.SIZE_BODY).move_to(np.array([-5.0, -1.5, 0]))
        kan = A.module("kan", "KAN", learned=True, width=1.7, height=1.0).move_to(np.array([-2.5, -1.5, 0]))
        alpha = A.feature_node("alpha", "α", radius=0.36).move_to(np.array([0.0, -1.5, 0]))
        self.play(FadeIn(dt, shift=RIGHT * 0.15), run_time=0.5)
        self.play(GrowArrow(A.arrow(dt.get_right() + RIGHT * 0.02, kan.get_left() + LEFT * 0.02,
                                    color=T.AMBER)), FadeIn(kan), run_time=0.6)
        self.play(GrowArrow(A.arrow(kan.get_right() + RIGHT * 0.02, alpha.get_left() + LEFT * 0.02,
                                    color=T.AMBER)), FadeIn(alpha), run_time=0.6)

        # --- combine ---
        op = A.operator("op_mul", "×", radius=0.3).move_to(np.array([2.0, -0.4, 0]))
        out = A.feature_node("output", "ĥ_{t-1}", radius=0.44).move_to(np.array([4.4, -0.4, 0]))
        self.play(GrowArrow(A.arrow(z.get_right() + RIGHT * 0.02, op.get_left() + LEFT * 0.02,
                                    color=T.BLUE)),
                  GrowArrow(A.arrow(alpha.get_right() + RIGHT * 0.02, op.get_left() + LEFT * 0.02,
                                    color=T.AMBER)), run_time=0.6)
        self.play(FadeIn(op), run_time=0.3)
        self.play(GrowArrow(A.arrow(op.get_right() + RIGHT * 0.02, out.get_left() + LEFT * 0.02,
                                    color=T.INK_SOFT)), FadeIn(out), run_time=0.7)

        # --- equation built incrementally ---
        eq_pos = np.array([0.0, -2.75, 0])
        eq1 = A.mathlabel("ĥ_{t-1}", size=T.SIZE_EQ).move_to(eq_pos)
        eq2 = A.mathlabel("ĥ_{t-1} = h_{t}", size=T.SIZE_EQ).move_to(eq_pos)
        eq3 = A.mathlabel("ĥ_{t-1} = h_{t} + αz", size=T.SIZE_EQ).move_to(eq_pos)
        self.play(Write(eq1), run_time=0.6)
        self.play(TransformMatchingShapes(eq1, eq2), run_time=0.9)
        self.play(TransformMatchingShapes(eq2, eq3), run_time=0.9)

        note = A.label("spatial transform  +  scalar temporal modulation",
                       size=T.SIZE_SMALL, color=T.MUTED).move_to(np.array([0, -3.45, 0]))
        self.play(FadeIn(note), run_time=0.5)
        self.wait(1.2)
