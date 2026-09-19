# Narration — LESA: why diffusion caching needs stage-aware predictors

- audience: `adjacent-researcher` (target ~140 wpm)
- mode: `silent`
- estimated duration: 152.9s (291 words)

## lesa_01_why_cache — Why cache diffusion features?
*Purpose: Show that DiT inference repeats expensive work, and that caching can skip it.*

**establish**  (cue: `establish`; introduction; dwell 0.8s)

Diffusion runs a large network at every step, so generation is slow.

**trace**  (cue: `trace`; dwell 0.25s)

Neighboring steps repeat almost the same computation.

**reuse**  (cue: `reuse`; dwell 0.25s)

Caching keeps those internal features and skips recomputing them.

**conclude**  (cue: `conclude`; conclusion; dwell 0.6s)

The question is how to skip safely.

> Takeaway: Caching avoids repeated computation, so the question becomes how to skip safely.

## lesa_02_uniform_assumption — The smoothness assumption breaks
*Purpose: Show that reuse and forecasting assume smooth, uniform change that the real trajectory violates.*

**establish**  (cue: `establish`; introduction; dwell 0.8s)

The obvious trick is to reuse the last feature, or extrapolate it.

**forecast**  (cue: `forecast`; dwell 0.25s)

Both assume it changes smoothly, so a fitted curve should continue it.

**diverge**  (cue: `diverge`; dwell 0.25s)

But early on it moves a lot, and the forecast drifts away.

**conclude**  (cue: `conclude`; conclusion; dwell 0.6s)

A fixed rule guesses a shape that keeps changing.

> Takeaway: A single fixed reuse or forecast rule cannot track changing dynamics.

## lesa_03_stage_dynamics — Feature dynamics are stage-dependent
*Purpose: The aha moment - one trajectory has three regimes with different dynamics.*

**replay**  (cue: `replay`; dwell 0.25s)

Watch the same feature over the whole process.

**early**  (cue: `early`; dwell 0.25s)

Early on, noise is high and change is fast and uneven.

**middle**  (cue: `middle`; dwell 0.25s)

In the middle, change becomes small and smooth.

**late**  (cue: `late`; dwell 0.25s)

Near the end it barely moves: only details are refined.

**split**  (cue: `split`; introduction; dwell 0.8s)

One trajectory, three behaviours. Call them stages.

**ask**  (cue: `ask`; aha; dwell 1.3s)

Why should one predictor handle all three?

> Takeaway: One trajectory has three stages with different dynamics, so a single fixed rule is the wrong shape of model.

## lesa_04_stage_experts — One predictor becomes stage-aware experts
*Purpose: Show specialization as the natural consequence of the stage observation.*

**single**  (cue: `single`; dwell 0.25s)

A single predictor must compromise: a rule for the noisy start fails later.

**split**  (cue: `split`; dwell 0.25s)

If stages differ, the predictor should differ too.

**specialize**  (cue: `specialize`; introduction; dwell 0.8s)

LESA (Learnable Stage-Aware predictors) gives each stage its own expert.

**window**  (cue: `window`; dwell 0.25s)

Each expert uses a history window that fits its stage.

> Takeaway: Specialization follows from the stage observation; each expert also uses a history window that fits its stage.

## lesa_05_expert_internals — What does one expert compute?
*Purpose: Explain the predictor mechanism and build its equation incrementally.*

**zoom**  (cue: `zoom`; introduction; dwell 0.8s)

Zoom into one expert.

**history**  (cue: `history`; dwell 0.25s)

It receives cached features from recent steps: the history.

**spatial**  (cue: `spatial`; introduction; dwell 0.8s)

A learned linear projection mixes that history into a vector, z.

**temporal**  (cue: `temporal`; introduction; dwell 0.8s)

A KAN (Kolmogorov-Arnold Network) turns timestep offsets into one number, alpha.

**combine**  (cue: `combine`; equation; dwell 1.0s)

The prediction adds a correction to the current feature, scaled by alpha.

> Takeaway: One expert is a learned projection of recent features, scaled by a learned time-dependent factor.

## lesa_06_training — Ground-truth guided, then closed-loop
*Purpose: Explain why training starts with ground truth and then becomes autoregressive.*

**gt**  (cue: `gt`; introduction; dwell 0.8s)

Training has two steps. First it learns from accurate features.

**inference**  (cue: `inference`; dwell 0.25s)

At inference, its inputs are partly its own predictions.

**drift**  (cue: `drift`; comparison; dwell 0.8s)

If it never sees its own mistakes, small errors build up.

**closed_loop**  (cue: `closed_loop`; conclusion; dwell 0.6s)

So training feeds it its own predictions, as at inference.

> Takeaway: Train under the same imperfect history the model will see at inference.

## lesa_07_recap — The method in one view
*Purpose: Compress the whole method into one picture.*

**zoom_out**  (cue: `zoom_out`; dwell 0.25s)

Put it back together.

**stages**  (cue: `stages`; dwell 0.25s)

One trajectory, divided into stages by noise level.

**experts**  (cue: `experts`; dwell 0.25s)

Each stage has its own expert, predicting the skipped features.

**recap**  (cue: `recap`; conclusion; dwell 0.6s)

Stages, experts, predicted features: that is how LESA accelerates diffusion.

> Takeaway: Stage-aware experts forecast the skipped features.
