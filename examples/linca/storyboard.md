# LinCa — storyboard

Paper: *LinCa: Accelerating Diffusion Models via Learnable Decomposed Feature
Caching*, Liu et al. arXiv:2608.17973.

Audience: `adjacent-researcher` (knows diffusion and caching after a brief
introduction; does not know Hermite prediction, invertible networks, or LinCa).

Story in one line: **one prediction rule cannot fit a feature whose dimensions
have different temporal behaviours → learn an invertible decomposition that
groups them → predict each group at the right order → reconstruct exactly →
specialize across timestep segments.**

Target duration: ~130 s.

---

## Scene 1 — `lc_01_one_predictor` — One rule for the whole feature

- **Purpose:** establish caching and the uniform-prediction baseline.
- **Question:** Is one prediction rule enough for the whole feature?
- **Actors:** `trajectory` (timeline), `full_step` (dot), `predicted_step` (dot), `feature` (feature).
- **Beats:**
  1. `full` (ESTABLISH, 3s): a full computation every N steps.
  2. `reuse` (TRACE, 4s): in between, predict from cached history.
  3. `uniform` (BUILD, 4s): one rule applied to the whole feature.
  4. `ask` (REVEAL, 3s): is one rule enough for every part of the feature?
- **End state:** one prediction rule spanning the whole feature vector.
- **Speaker intent:** fair baseline first; no strawman.
- **Transition:** look inside the feature.

## Scene 2 — `lc_02_dynamics_mismatch` — The aha: dimensions differ

- **Purpose:** the conceptual heart; different dimensions have different continuity.
- **Question:** Do all dimensions evolve the same way?
- **Actors:** `feature_dims` (feature row), `unstable` (dot), `smooth` (dot), `curved` (dot), `trajectory`.
- **Beats:**
  1. `replay` (ESTABLISH, 3s): follow one feature across the trajectory.
  2. `unstable` (TRAJECTORY, 4s): some dimensions jump; hard to predict.
  3. `smooth` (TRAJECTORY, 4s): others evolve almost linearly.
  4. `curved` (TRAJECTORY, 4s): others curve gently; higher order helps.
  5. `interleaved` (COMPARE, 4s): the behaviours are mixed in the same vector.
  6. `mismatch` (REVEAL, 3s): one order cannot match all of them.
- **End state:** an interleaved vector with three behaviours highlighted.
- **Speaker intent:** one new behaviour per beat; dwell on each trajectory.
- **Transition:** why not split the vector?

## Scene 3 — `lc_03_partitioning` — A naive split is not enough

- **Purpose:** motivate the learned mapping.
- **Question:** Can we separate dimensions by index?
- **Actors:** `vector` (feature row), `naive_split` (panel), `group_question` (text).
- **Beats:**
  1. `split` (BUILD, 3s): try a contiguous split of the vector.
  2. `naive` (COMPARE, 4s): smooth and unstable dimensions land in the same group.
  3. `question` (REVEAL, 4s): can we learn a representation that groups by behaviour?
- **End state:** the question that motivates the learned mapping.
- **Transition:** learn the mapping.

## Scene 4 — `lc_04_decompose` — Learnable decomposition

- **Purpose:** introduce the invertible mapping and the three groups.
- **Question:** What does the learned mapping do?
- **Actors:** `mapping` (learned module), `z0` (feature), `z1` (feature), `z2` (feature).
- **Beats:**
  1. `map` (BUILD, 4s): a learnable mapping of the cached feature.
  2. `groups` (MORPH, 4s): mixed dimensions move into three groups.
  3. `z0` (REVEAL, 3s): the unstable group.
  4. `z1` (REVEAL, 3s): the smooth group.
  5. `z2` (REVEAL, 3s): the gently curved group.
  6. `note` (REVEAL, 3s): three groups is the paper's design choice.
- **End state:** three semantic groups from one mixed vector.
- **Speaker intent:** the regrouping should be visually satisfying and clear.
- **Transition:** each group gets its own predictor.

## Scene 5 — `lc_05_predictors` — Different predictors, then reconstruct

- **Purpose:** order-matched prediction and the inverse mapping.
- **Question:** How is each group predicted?
- **Actors:** `group0` (feature), `group1` (feature), `group2` (feature), `reuse_rule` (module), `hermite_rule` (learned), `inverse` (learned).
- **Beats:**
  1. `predict0` (BUILD, 3s): each group gets a predictor that fits it.
  2. `reuse` (REVEAL, 3s): the unstable group is reused from the nearest cache.
  3. `hermite` (REVEAL, 4s): the smoother groups use Hermite extrapolation at matched order.
  4. `recon` (TRACE, 4s): the inverse mapping reconstructs the full feature.
  5. `why` (RECAP, 3s): same feature, different subspaces, different rules.
- **End state:** predicted groups reconstructed into one feature.
- **Transition:** why must the mapping be invertible?

## Scene 6 — `lc_06_invertible` — Why invertibility matters

- **Purpose:** explain the invertible block and its scope precisely.
- **Question:** Why must the mapping be invertible?
- **Actors:** `block` (panel), `halves` (feature ×2), `coupling` (operator), `inverse` (learned).
- **Beats:**
  1. `question` (ESTABLISH, 3s): ask why invertibility is required.
  2. `lossless` (REVEAL, 3s): so the decomposition itself loses no information.
  3. `block` (ZOOM, 4s): each block mixes channels and couples two halves.
  4. `fwd` (BUILD, 4s): one half updates the other, then the roles swap.
  5. `inv` (REPLAY, 4s): every step has an explicit inverse.
  6. `scope` (REVEAL, 4s): prediction can still be wrong; only the mapping is exact.
- **End state:** forward and inverse arrows on the same block.
- **Speaker intent:** do not turn this into a normalizing-flow lecture.
- **Transition:** there is a second kind of heterogeneity.

## Scene 7 — `lc_07_segments_training` — Timestep segments and training

- **Purpose:** distinguish segment specialization from subspace decomposition; show the training signals; recap.
- **Question:** How do segments differ from groups?
- **Actors:** `trajectory` (timeline), `segments` (stage ×3), `predictor` (learned), `loss` (operator).
- **Beats:**
  1. `segments` (STAGE-SPLIT, 4s): split the trajectory into stages.
  2. `separate` (BUILD, 3s): each stage trains its own predictor copy.
  3. `distinct` (COMPARE, 4s): that is separate from the subspace decomposition.
  4. `data` (REVEAL, 3s): training uses a few hundred pre-generated features.
  5. `losses` (BUILD, 4s): one loss matches the feature, another matches each component.
  6. `recap` (RECAP, 4s): decompose, predict, reconstruct.
- **End state:** the Decompose-Predict-Reconstruct recap.
- **Speaker intent:** keep the two kinds of specialization distinct.
- **Transition:** end.

---

## Comprehension gate (review before final render)

1. Why is one rule for the whole feature problematic? → scenes 2, 3.
2. What does different continuity mean? → scene 2.
3. Why can dimensions not be split by index? → scene 3.
4. What does the learned mapping do? → scene 4.
5. Why does z^(0) get a different predictor? → scene 5.
6. Why is invertibility important? → scene 6.
7. Does invertible mean the prediction is error-free? → scene 6 (scope beat).
8. Subspace vs timestep-segment specialization? → scene 7.
