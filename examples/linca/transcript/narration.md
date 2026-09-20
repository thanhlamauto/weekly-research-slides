# Narration — LinCa: learnable decomposed feature caching

- audience: `adjacent-researcher` (target ~140 wpm)
- mode: `silent`
- narration: backend `gemini`, voice `Kore`, profile `research-explainer`
- estimated duration: 156.9s (299 words)

## lc_01_one_predictor — One rule for the whole feature
*Purpose: Establish caching and the uniform-prediction baseline.*

**full**  (cue: `full`; introduction; dwell 0.8s)

Caching runs the full network every N steps.

*delivery: intent setup*
*direction: State the schedule plainly.*

**reuse**  (cue: `reuse`; dwell 0.25s)

In between, it predicts the missing features from history.

**uniform**  (cue: `uniform`; dwell 0.25s)

Existing methods apply one prediction rule to the whole feature.

**ask**  (cue: `ask`; aha; dwell 1.3s)

But is one rule enough for every part of a feature?

*delivery: intent reveal; pause 400ms before; pause 650ms after*
*direction: A genuine question. Leave space after it.*

> Takeaway: Caching predicts skipped features from history, and existing methods use one rule for the whole feature.

## lc_02_dynamics_mismatch — Dimensions do not evolve the same way
*Purpose: The aha moment; dimensions have different continuity.*

**replay**  (cue: `replay`; introduction; dwell 0.8s)

Follow a single feature across the denoising trajectory.

*delivery: intent define; pause 500ms after*

**unstable**  (cue: `unstable`; dwell 0.25s)

Some dimensions jump around, and they are hard to predict.

*delivery: pace slightly-slower; pause 550ms after*

**smooth**  (cue: `smooth`; dwell 0.25s)

Others change smoothly, almost linearly.

*delivery: pause 500ms after*

**curved**  (cue: `curved`; dwell 0.25s)

And some curve gently, so higher-order prediction helps.

*delivery: pause 550ms after*

**interleaved**  (cue: `interleaved`; comparison; dwell 0.8s)

These behaviours are mixed together inside the same vector.

*delivery: pause 350ms before; pause 600ms after*
*direction: This is the key observation; slow down and let the mixing land.*

**mismatch**  (cue: `mismatch`; conclusion; dwell 0.6s)

One prediction order cannot match all of them.

*delivery: pause 350ms before; pause 700ms after*

> Takeaway: Dimensions with different continuity are interleaved in the same vector, so one prediction order cannot match all of them.

## lc_03_partitioning — A naive split is not enough
*Purpose: Motivate the learned mapping.*

**split**  (cue: `split`; introduction; dwell 0.8s)

Could we just split the vector into blocks?

*delivery: intent define; pause 450ms after*

**naive**  (cue: `naive`; comparison; dwell 0.8s)

A contiguous split puts smooth and unstable dimensions in the same group.

*delivery: pace slightly-slower; pause 550ms after*

**question**  (cue: `question`; dwell 0.25s)

Can we learn a representation that groups them by behaviour?

*delivery: pause 400ms before; pause 700ms after*
*direction: This question motivates everything that follows.*

> Takeaway: A contiguous split mixes behaviours, so the grouping must be learned.

## lc_04_decompose — Learnable decomposition
*Purpose: Introduce the invertible mapping and the three groups.*

**map**  (cue: `map`; introduction; dwell 0.8s)

LinCa learns an invertible mapping of the cached feature.

*delivery: intent define; pause 550ms after*

**groups**  (cue: `groups`; comparison; dwell 0.8s)

It rearranges the dimensions into three groups.

*delivery: pause 550ms after*
*direction: Let the regrouping animation finish before naming the groups.*

**z0**  (cue: `z0`; dwell 0.25s)

The first group collects the unstable dimensions.

*delivery: pause 450ms after*

**z1**  (cue: `z1`; dwell 0.25s)

The second collects those that evolve smoothly.

*delivery: pause 450ms after*

**z2**  (cue: `z2`; dwell 0.25s)

The third collects the gently curved ones.

*delivery: pause 450ms after*

**note**  (cue: `note`; conclusion; dwell 0.6s)

Three groups is the design choice used in the paper.

*delivery: pause 300ms before; pause 600ms after*
*direction: Keep the qualifier; it is a design choice, not a law.*

> Takeaway: A learned invertible mapping regroups dimensions by temporal behaviour into three groups.

## lc_05_predictors — Matched predictors, then reconstruct
*Purpose: Order-matched prediction and the inverse mapping.*

**predict0**  (cue: `predict0`; introduction; dwell 0.8s)

Each group now gets a predictor that fits it.

*delivery: intent define; pause 450ms after*

**reuse**  (cue: `reuse`; dwell 0.25s)

The unstable group is simply reused from the nearest cache.

*delivery: pause 500ms after*

**hermite**  (cue: `hermite`; dwell 0.25s)

The smoother groups use Hermite extrapolation at matched order.

*delivery: pace slower; pause 600ms after*
*direction: Slow down at the new term; do not read coefficients.*

**recon**  (cue: `recon`; dwell 0.25s)

Then the inverse mapping reconstructs the full feature.

*delivery: pause 550ms after*

**why**  (cue: `why`; conclusion; dwell 0.6s)

Same feature, different subspaces, different rules.

*delivery: pause 300ms before; pause 650ms after*

> Takeaway: Each group is predicted at its matched order, then the inverse mapping reconstructs the full feature.

## lc_06_invertible — Why the mapping must be invertible
*Purpose: Explain the invertible block and its precise scope.*

**question**  (cue: `question`; introduction; dwell 0.8s)

Why must the mapping be invertible?

*delivery: intent define; pause 550ms after*

**lossless**  (cue: `lossless`; dwell 0.25s)

So the decomposition itself loses no information.

*delivery: pause 550ms after*

**block**  (cue: `block`; dwell 0.25s)

Each block mixes channels and couples two halves.

*delivery: pause 500ms after*

**fwd**  (cue: `fwd`; dwell 0.25s)

One half updates the other, and then the roles swap.

*delivery: pause 500ms after*

**inv**  (cue: `inv`; dwell 0.25s)

Every step has an explicit inverse.

*delivery: pause 550ms after*

**scope**  (cue: `scope`; conclusion; dwell 0.6s)

The prediction can still be wrong; only the mapping is exact.

*delivery: pause 400ms before; pause 700ms after*
*direction: This scope statement matters; do not let it sound like a disclaimer.*

> Takeaway: Strict invertibility keeps the decomposition lossless; prediction can still be wrong.

## lc_07_segments_training — Timestep segments and training
*Purpose: Distinguish segment specialization from subspace decomposition; show training signals; recap.*

**segments**  (cue: `segments`; introduction; dwell 0.8s)

The denoising trajectory is also split into stages.

*delivery: intent define; pause 550ms after*

**separate**  (cue: `separate`; dwell 0.25s)

Each stage trains its own copy of the predictor.

*delivery: pause 500ms after*

**distinct**  (cue: `distinct`; comparison; dwell 0.8s)

That is separate from the subspace decomposition.

*delivery: pause 350ms before; pause 600ms after*
*direction: Keep the two kinds of specialization clearly apart.*

**data**  (cue: `data`; dwell 0.25s)

Training uses a few hundred pre-generated features.

**losses**  (cue: `losses`; dwell 0.25s)

One loss matches the feature; another matches each component.

*delivery: pause 550ms after*

**recap**  (cue: `recap`; conclusion; dwell 0.6s)

Decompose, predict, reconstruct: that is LinCa.

*delivery: pause 400ms before; pause 750ms after*
*direction: Finish the video cleanly on the pipeline.*

> Takeaway: Separate predictors per timestep segment adapt to stage dynamics; training matches the feature and each component.
