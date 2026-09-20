# Narration — LearniBridge: calibrating cached features with a low-rank bridge

- audience: `adjacent-researcher` (target ~140 wpm)
- mode: `silent`
- narration: backend `gemini`, voice `Kore`, profile `research-explainer`
- estimated duration: 164.2s (311 words)

## lb_01_why_cache — Why cache diffusion features?
*Purpose: Establish diffusion inference cost and the caching idea.*

**establish**  (cue: `establish`; introduction; dwell 0.8s)

Diffusion runs a large network at every step.

*delivery: intent setup*
*direction: State the cost plainly; this is the problem.*

**trace**  (cue: `trace`; dwell 0.25s)

Neighbouring steps compute almost the same thing.

**reuse**  (cue: `reuse`; dwell 0.25s)

Caching stores one feature and reuses it later, skipping the repeated work.

**conclude**  (cue: `conclude`; conclusion; dwell 0.6s)

The question is how far one stored feature can be pushed.

*delivery: pause 350ms before*
*direction: Land the question; do not sound like a slogan.*

> Takeaway: Caching skips repeated computation, so the question becomes how far one stored feature can be pushed.

## lb_02_stale_cache — Long-range reuse goes stale
*Purpose: Show stale-feature error accumulating with skip distance.*

**establish**  (cue: `establish`; introduction; dwell 0.8s)

The cached feature is held while the true feature moves.

*delivery: intent define*
*direction: Set up the comparison; no judgement yet.*

**skip_small**  (cue: `skip_small`; dwell 0.25s)

Skip one step, and the error is small.

**skip_large**  (cue: `skip_large`; comparison; dwell 0.8s)

Skip many steps, and the stale feature drifts away.

*delivery: intent contrast; pause 350ms before*
*direction: The contrast starts here; stay measured.*

**accumulate**  (cue: `accumulate`; dwell 0.25s)

Errors accumulate, and quality degrades.

**conclude**  (cue: `conclude`; conclusion; dwell 0.6s)

Reuse is cheap, but stale features become wrong.

*delivery: pause 300ms before; pause 600ms after*

> Takeaway: Reuse is cheap, but the stale feature drifts and the error accumulates.

## lb_03_change_question — Change the question
*Purpose: Reframe prediction as correction.*

**ask**  (cue: `ask`; introduction; dwell 0.8s)

Most caching methods predict the future feature from the past.

*delivery: intent define; pause 500ms after*

**reframe**  (cue: `reframe`; dwell 0.25s)

LearniBridge asks a different question.

*delivery: pause 400ms before; pause 600ms after*
*direction: This is the intellectual move; give it space.*

**setup**  (cue: `setup`; dwell 0.25s)

What correction makes a cached computation behave like the skipped full computation?

*delivery: pace slightly-slower; pause 650ms after*
*direction: A genuine question. Do not rush the ending.*

**sketch**  (cue: `sketch`; equation; dwell 1.0s)

Cached computation plus a small correction approximates the future one.

*delivery: pace slower; pause 650ms after*

> Takeaway: Ask what correction makes a cached computation behave like the skipped full computation.

## lb_04_low_rank — The correction is low-rank
*Purpose: Present the low-rank analysis; separate observation from consequence.*

**collect**  (cue: `collect`; introduction; dwell 0.8s)

Stack layer inputs from many samples, one column per sample.

*delivery: intent define; pause 500ms after*

**residual**  (cue: `residual`; dwell 0.25s)

The correction is the layer difference between timesteps.

**linear**  (cue: `linear`; dwell 0.25s)

Model it as a matrix times those inputs.

*delivery: pace slightly-slower; pause 500ms after*

**closed_form**  (cue: `closed_form`; dwell 0.25s)

The best matrix is E times the pseudo-inverse of X.

*delivery: pace slower; pause 550ms after*
*direction: Read this as the answer to the previous sentence, not symbol by symbol.*

**spectrum**  (cue: `spectrum`; comparison; dwell 0.8s)

Its singular values decay fast: energy sits in a few directions.

*delivery: pace slightly-slower; pause 600ms after*
*direction: This is an observation from measurements; say it that way.*

**consequence**  (cue: `consequence`; conclusion; dwell 0.6s)

The required correction is therefore low rank.

*delivery: pause 350ms before; pause 650ms after*
*direction: This follows under the paper's linear model; keep the qualifier in your tone.*

> Takeaway: The input matrix has rapidly decaying singular values, so under the paper's linear model the optimal correction is low-rank.

## lb_05_prompt_invariant — A few prompts are enough
*Purpose: Present prompt-invariance evidence and its interpretation.*

**split**  (cue: `split`; introduction; dwell 0.8s)

Split one hundred prompts into disjoint groups.

*delivery: intent define; pause 450ms after*

**per_group**  (cue: `per_group`; dwell 0.25s)

Fit the optimal correction per group.

**subspaces**  (cue: `subspaces`; dwell 0.25s)

Each has its own principal subspace.

**angles**  (cue: `angles`; comparison; dwell 0.8s)

Measure the angles between them.

*delivery: pause 500ms after*

**small**  (cue: `small`; dwell 0.25s)

They come out consistently small.

*delivery: pause 350ms before*

**consequence**  (cue: `consequence`; conclusion; dwell 0.6s)

So a few calibration prompts can generalize.

*delivery: pause 300ms before; pause 650ms after*
*direction: This is the interpretation of the measurement, not a guarantee.*

> Takeaway: Corrections fitted on disjoint prompt groups point in similar directions, so a few calibration prompts can generalize.

## lb_06_lora_bridge — Low rank suggests LoRA
*Purpose: Derive the parameterization from the measured structure.*

**final_block**  (cue: `final_block`; introduction; dwell 0.8s)

Look at the last Transformer block.

*delivery: intent define; pause 450ms after*

**freeze**  (cue: `freeze`; dwell 0.25s)

Keep the pretrained weights frozen.

**lora**  (cue: `lora`; dwell 0.25s)

Add a thin low-rank path, LoRA (low-rank adaptation).

*delivery: pace slower; pause 600ms after*
*direction: Introduce the name once, clearly, then move on.*

**bridge**  (cue: `bridge`; dwell 0.25s)

The cached input goes through this augmented block.

**output**  (cue: `output`; dwell 0.25s)

It approximates the skipped full computation.

*delivery: pause 550ms after*

**fit**  (cue: `fit`; conclusion; dwell 0.6s)

Low rank follows from the analysis.

*delivery: pause 300ms before; pause 600ms after*

> Takeaway: A low-rank correction is exactly what a LoRA adapter on the final block provides.

## lb_07_training_inference — Calibration and inference
*Purpose: Make the calibration data and the inference path completely clear, then recap.*

**training**  (cue: `training`; introduction; dwell 0.8s)

Calibration runs a few full trajectories.

*delivery: intent define; pause 450ms after*

**pair**  (cue: `pair`; dwell 0.25s)

Record the final-block input at a computed step, and the true output at a skipped one.

*delivery: pace slightly-slower; pause 550ms after*
*direction: One cached input, one ground-truth target. Make the pair obvious.*

**train**  (cue: `train`; dwell 0.25s)

Train only the LoRA weights to connect the two.

*delivery: pause 500ms after*

**inference**  (cue: `inference`; dwell 0.25s)

At inference, compute fully every N steps and cache that input.

**skip**  (cue: `skip`; comparison; dwell 0.8s)

In between, skip the earlier blocks entirely.

*delivery: pause 500ms after*

**run**  (cue: `run`; dwell 0.25s)

Only the final block, with its adapter, runs.

*delivery: pause 300ms before; pause 550ms after*

**recap**  (cue: `recap`; conclusion; dwell 0.6s)

Stale cache, structured correction, low rank, few prompts, lightweight bridge.

*delivery: pause 350ms before; pause 700ms after*
*direction: Compress the whole method into one sentence. Finish cleanly.*

> Takeaway: Train the adapter on cached inputs and ground-truth targets; at inference only the augmented final block runs between full steps.
