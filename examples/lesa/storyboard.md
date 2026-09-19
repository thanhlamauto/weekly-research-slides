# LESA — method explainer storyboard

Source paper: **LESA: Learnable Stage-Aware Predictors for Diffusion Model
Acceleration**, Cai, Liu, Xu, Wang, Zou, Zhang. arXiv:2602.20497v3 (27 May 2026).
Read from the paper PDF (`method_model.yaml` records the extracted facts).

Goal: a silent 100–120 s visual explanation of the *central LESA method*, for a
lab meeting. Not a paper summary, not a leaderboard.

Persistent actors (see `scene_spec.yaml`): `feature_current`, `trajectory`,
`feature_point`, `predictor`, `stage_high`, `stage_mid`, `stage_low`,
`expert_1..3`, `dit_blocks`. The same object keeps its id and look across scenes.

---

## Scene 01 — Why cache diffusion features?

**Question:** Why is feature caching worth doing at all?

**Start:** nothing on screen.

**Beats**
1. ESTABLISH — draw a row of expensive DiT evaluations with a cost meter.
2. TRACE — move the feature `h_t` through every DiT block; the meter rises.
3. MORPH — cache the feature after the first step; later blocks become skips and a
   dashed reuse arrow feeds the feature forward.
4. REVEAL — "cache the feature, skip the recomputation"; the meter drops.

**End:** most DiT evaluations are crossed out; the cost meter has fallen.

**Next:** if caching is this good, why is simple reuse not enough?

**Speaker intent:** frame the *cost*, not the method. ~14 s.

---

## Scene 02 — The smoothness assumption breaks

**Question:** Why is simple reuse or forecasting not enough?

**Start:** the trajectory and its feature are established.

**Beats**
1. ESTABLISH — draw the feature trajectory over diffusion timesteps; state the
   assumption "features change smoothly".
2. TRACE — extrapolate a straight forecast from the first steps.
3. ACCUMULATION — the real feature curves away; show the growing gap as drift.
4. REVEAL — "the change is not uniform".

**End:** the straight forecast visibly misses the real trajectory.

**Next:** if change is not uniform, what *is* its structure?

**Speaker intent:** kill the fixed-scheme assumption. ~15 s.

---

## Scene 03 — Feature dynamics are stage-dependent (the aha)

**Question:** Why does one fixed predictor struggle?

**Start:** the same trajectory as scene 02, unsegmented.

**Beats**
1. REPLAY — the feature moves along the trajectory.
2. TRAJECTORY — large, irregular movements early (high noise).
3. TRAJECTORY — small, smooth movements in the middle.
4. TRAJECTORY — fine refinement late (low noise).
5. STAGE-SPLIT — colour the timeline into three stages and label them.
6. REVEAL — "Why should one predictor handle all three?"

**End:** three distinct regimes + the motivating question.

**Next:** specialize the predictor.

**Speaker intent:** the whole video turns on this observation. ~18 s.

---

## Scene 04 — One predictor becomes stage-aware experts

**Question:** How should the predictor adapt?

**Start:** a single generic predictor under the whole trajectory.

**Beats**
1. ESTABLISH — one predictor handles everything.
2. STAGE-SPLIT — the three stages return.
3. MORPH — the single predictor *transforms* into three stage-aligned experts.
4. REVEAL — each expert shows its history window (K=4 high noise, K=8 later).

**End:** three experts, one per stage.

**Next:** what is inside one expert?

**Speaker intent:** specialization is a consequence, not a design flourish. ~15 s.

---

## Scene 05 — What does one expert predictor compute?

**Question:** What is inside a single LESA predictor?

**Start:** an empty expert workspace (zoomed in).

**Beats**
1. ZOOM — zoom into one expert.
2. ESTABLISH — lay out the cached history `h_{t+K-1} … h_t`.
3. BUILD — history → linear projection → `z`.
4. BUILD — timestep offsets `dt` → KAN → scalar `alpha`.
5. REVEAL — assemble `hhat_{t-1} = h_t + alpha z` incrementally.

**End:** the predictor equation, built piece by piece.

**Next:** how is the predictor trained?

**Speaker intent:** spatial transform vs temporal modulation, then residual. ~20 s.

---

## Scene 06 — Ground-truth guided, then closed-loop

**Question:** Why not just train on ground-truth features?

**Start:** predictor trained on accurate ground-truth histories.

**Beats**
1. ESTABLISH — GT histories in, L1 loss to the GT feature.
2. COMPARE — accelerated inference feeds *imperfect* histories (own predictions).
3. ACCUMULATION — prediction error feeds back; drift grows along the trajectory.
4. MORPH — the training setup becomes a closed loop that consumes its own
   predictions, matching inference.

**End:** a closed-loop autoregressive training picture.

**Next:** compress everything.

**Speaker intent:** GT training does not match the inference regime. ~20 s.

---

## Scene 07 — The method in one view

**Question:** What is LESA, in one view?

**Beats**
1. ZOOM — return to the full trajectory.
2. STAGE-SPLIT — three stages.
3. BUILD — one expert per stage forecasting skipped features; DiT evaluations drop.
4. RECAP — one sentence.

**End:** a single summary picture. No SOTA/leaderboard claim.

**Speaker intent:** leave with the mechanism. ~14 s.

---

## Non-goals

No narration audio (silent, presenter explains live). No leaderboard numbers as
the conclusion. No cloned 3Blue1Brown branding.
