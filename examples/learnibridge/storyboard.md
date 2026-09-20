# LearniBridge — storyboard

Paper: *LearniBridge: Learnable Calibration of Feature Caching for Diffusion
Models Acceleration*, Huang, Chen, Shen, Zhang. arXiv:2606.26778 (ICML 2026).

Audience: `adjacent-researcher` (understands neural networks and diffusion at a
high level; does not know TaylorSeer, low-rank calibration theory, or this paper).

Story in one line: **reuse goes stale at long skips → ask what correction the
cached computation needs → the required correction is low-rank and
prompt-invariant → a tiny LoRA bridge on the final block supplies it → most
blocks are skipped.**

Target duration: ~130 s.

---

## Scene 1 — `lb_01_why_cache` — Why caching works at all

- **Purpose:** establish diffusion inference cost and the caching idea.
- **Question:** Why is feature caching worth doing?
- **Actors:** `denoise_timeline` (timeline), `dit_block` (module),
  `feature_t` (feature), `cache` (cache).
- **Start state:** a timestep axis with a repeated expensive block.
- **Beats:**
  1. `establish` (ESTABLISH, 3s): draw the denoising trajectory and the cost per step.
  2. `trace` (TRACE, 4s): move the feature through consecutive blocks; the same
     computation repeats.
  3. `reuse` (MORPH, 4s): store the feature in a cache; later blocks are marked skipped.
  4. `conclude` (REVEAL, 3s): the question — how far can one cached feature be pushed?
- **End state:** one cached feature feeding several skipped steps.
- **Speaker intent:** the benefit of reuse is obvious; do not introduce the method yet.
- **Transition:** push the skip distance and watch the cached feature go stale.

## Scene 2 — `lb_02_stale_cache` — Why long-range reuse fails

- **Purpose:** show stale-feature error accumulating with skip distance.
- **Question:** Why does caching degrade at high acceleration?
- **Actors:** `feature_true` (feature), `feature_cached` (feature, persistent),
  `error_bar` (panel/dot), `timeline`.
- **Start state:** the cached feature and the true feature start together.
- **Beats:**
  1. `establish` (ESTABLISH, 3s): cached feature held while the true feature moves.
  2. `skip_small` (TRACE, 4s): skip one step — the gap is small.
  3. `skip_large` (ACCUMULATION, 5s): skip many steps — the gap grows into drift.
  4. `accumulate` (ACCUMULATION, 3s): output error accumulates; quality degrades.
  5. `conclude` (REVEAL, 2s): reuse is cheap, stale features become wrong.
- **End state:** a large gap between cached and true feature.
- **Speaker intent:** make the failure mechanistic, not a leaderboard.
- **Transition:** previous methods try to predict the future feature; change the question.

## Scene 3 — `lb_03_change_question` — Change the question

- **Purpose:** reframe prediction as correction.
- **Question:** What correction makes a cached computation behave like the skipped full one?
- **Actors:** `cached_computation` (module), `correction` (operator/vector),
  `future_computation` (module).
- **Start state:** the previous "predict from history" framing.
- **Beats:**
  1. `ask` (COMPARE, 4s): show the historical-features framing.
  2. `reframe` (REVEAL, 3s): LearniBridge asks for the required correction.
  3. `setup` (REVEAL, 4s): cached computation + small structured correction ≈ future computation.
  4. `sketch` (BUILD, 4s): the correction is a small update, not a new predictor.
- **End state:** the equation sketch `cached + correction ≈ future`.
- **Speaker intent:** the reframing is the intellectual move; pause before it.
- **Transition:** what structure does that correction have?

## Scene 4 — `lb_04_low_rank` — The low-rank observation

- **Purpose:** the central analysis; separate observation from consequence.
- **Question:** What structure does the requisite correction have?
- **Actors:** `input_matrix` (panel), `residual_matrix` (panel),
  `dW` (learned module), `spectrum` (dot/stage).
- **Start state:** many prompt inputs, one per column.
- **Beats:**
  1. `collect` (ESTABLISH, 4s): stack layer inputs from many prompts.
  2. `residual` (BUILD, 4s): the correction is the cross-timestep output difference.
  3. `linear` (BUILD, 4s): model it as `E ≈ ΔW X`.
  4. `closed_form` (REVEAL, 4s): the best `ΔW` is `E X⁺`.
  5. `spectrum` (TRAJECTORY, 5s): singular values of `X` decay rapidly.
  6. `consequence` (REVEAL, 4s): therefore the correction is constrained to low rank.
- **End state:** spectrum with a few dominant directions and a low-rank `ΔW`.
- **Speaker intent:** say explicitly that decay is an *empirical observation* and
  low rank is the *derived consequence under the paper's linear model*.
- **Transition:** does that structure transfer across prompts?

## Scene 5 — `lb_05_prompt_invariant` — Why a few prompts are enough

- **Purpose:** present the prompt-invariance evidence and its interpretation.
- **Question:** Do different prompts need different corrections?
- **Actors:** `prompt_groups` (panel ×n), `subspace` (stage), `angle` (dot/text).
- **Start state:** disjoint prompt groups.
- **Beats:**
  1. `split` (BUILD, 3s): split 100 prompts into disjoint groups.
  2. `per_group` (BUILD, 3s): fit the optimal correction per group.
  3. `subspaces` (REVEAL, 3s): each correction has a principal subspace.
  4. `angles` (COMPARE, 4s): compare the subspaces pairwise.
  5. `small` (REVEAL, 3s): the angles are consistently small.
  6. `consequence` (REVEAL, 4s): so a few calibration prompts can generalize.
- **End state:** aligned subspaces and the calibration-set consequence.
- **Speaker intent:** measurement first, interpretation second; do not claim the
  corrections are identical.
- **Transition:** low rank suggests a concrete parameterization.

## Scene 6 — `lb_06_lora_bridge` — Low rank suggests LoRA

- **Purpose:** derive the design instead of asserting it.
- **Question:** How do we parameterize a low-rank correction?
- **Actors:** `final_block` (panel), `linear_layers` (module ×n),
  `lora_path` (learned module), `feature_out` (feature).
- **Start state:** the final Transformer block with its linear layers.
- **Beats:**
  1. `final_block` (ZOOM, 3s): zoom into the last Transformer block.
  2. `freeze` (FOCUS, 3s): freeze the pretrained weights.
  3. `lora` (BUILD, 4s): add a thin path `ΔW = B A`.
  4. `bridge` (TRACE, 4s): the cached final-block input passes through this augmented block.
  5. `output` (REVEAL, 3s): it approximates the skipped full computation.
  6. `fit` (REVEAL, 3s): low rank follows from the analysis.
- **End state:** cached input → LoRA-augmented final block → approximated output.
- **Speaker intent:** LoRA is the natural parameterization of the measured structure.
- **Transition:** how are the adapters trained, and what runs at inference?

## Scene 7 — `lb_07_training_inference` — Calibration and the actual speedup

- **Purpose:** make training data and the inference path completely clear, then recap.
- **Question:** What runs at a skipped timestep, and what does it cost?
- **Actors:** `trajectory` (timeline), `cached_input` (feature),
  `target_output` (feature), `final_block_lora` (panel), `skipped_blocks` (module ×n).
- **Start state:** a full trajectory with recorded inputs and outputs.
- **Beats:**
  1. `training` (ESTABLISH, 4s): calibration runs a few full trajectories.
  2. `pair` (BUILD, 5s): record final-block input at a computed step and true output at a skipped step.
  3. `train` (CORRECTION, 4s): train only the LoRA weights.
  4. `inference` (REPLAY, 4s): full compute every N steps; cache the final-block input.
  5. `skip` (FOCUS, 3s): the earlier blocks are crossed out between full steps.
  6. `run` (TRACE, 4s): only the LoRA-augmented final block runs.
  7. `recap` (RECAP, 4s): stale cache → structured correction → low rank → few prompts → lightweight bridge.
- **End state:** the accelerated inference path with skipped blocks marked.
- **Speaker intent:** the viewer must not leave thinking LoRA runs through every block.
- **Transition:** end. No leaderboard slide.

---

## Comprehension gate (review before final render)

1. Why does long-range feature caching accumulate error? → scene 2.
2. What quantity does LearniBridge learn? → scene 3, 6.
3. Why do the authors argue the correction is low-rank? → scene 4.
4. What evidence motivates prompt invariance? → scene 5.
5. Why does low rank suggest LoRA? → scene 6.
6. What data is collected during calibration? → scene 7.
7. Which part of the model runs at skipped timesteps? → scene 7.
