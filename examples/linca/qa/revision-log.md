# LinCa — revision log

Two cycles: a visual revision after the draft render, and a pacing revision
after the first narrated mux. Findings come from rendered frames, not source
reading.

## Cycle 1 — draft render and visual review

Draft: `renders/draft/linca-method-explainer.mp4` (52.5 s), contact sheet
`qa/contact-sheet.png`, 14 frames.

Defects found and fixed:

1. **First render crashed: real skill bug.** `actors.brace_under` used `UP` and
   `DOWN` without importing them; LESA never called it, so the bug was latent.
   Fixed in `skills/research-method-video/src/actors.py` (separate commit).
2. **Scene 1 had no persistent feature object.** The narration talks about
   predicting "the missing features", but only dots were drawn. Fixed: a
   `feature` node `x_t` with a dashed prediction arrow from the last computed
   step.
3. **Scene 1 render hang.** `GrowArrow` on a dashed arrow's shaft hung Manim.
   Fixed: `Create` on the dashed group.
4. **Content review.** Scene 3 is deliberately short (30 words) because it only
   sets up the learned mapping; scene 6 is limited to one invertible block so it
   does not become a flow lecture. No scene is a paper-summary scene.

## Cycle 2 — narrated pacing

After the hook-aware timing fix (see the LearniBridge revision log), scenes 1,
3, 4, 5 and 7 match their audio within ±0.9 s. Two scenes remain above the
1.5 s warning threshold and below the 3 s error threshold:

- `lc_02_dynamics_mismatch`: video +2.7 s frozen;
- `lc_06_invertible`: video +2.2 s frozen.

Accepted deliberately (user decision) to close this iteration. To remove them:
lower `timing.animation_seconds` for those two scenes by 2–3 s and re-render
(`--timing transcript`), or split their longest narration beat. Recorded here
so the residual is not mistaken for a clean result.

## Comprehension gate (self-review)

1. Why one rule is problematic → scene 2 (three behaviours) and scene 1 (one
   rule over the whole vector).
2. What different continuity means → scene 2 (three trajectory shapes).
3. Why index splits fail → scene 3 (contiguous split mixes behaviours).
4. What the learned mapping does → scene 4 (regroup into three groups).
5. Why z^(0) gets a different predictor → scene 5 (reuse vs matched-order
   Hermite).
6. Why invertibility matters → scene 6 (lossless mapping).
7. Does invertible mean error-free prediction → scene 6 scope beat
   ("only the mapping is exact").
8. Subspace vs segment specialization → scene 7 ("groups: subspaces inside one
   feature" vs "stages: separate predictors along the trajectory").

Known weaknesses (honest): scene 2 carries six beats and is dense; a human
comprehension test is still recommended. `say` narration is intelligible but
flat; Gemini Kore remains the configured preferred voice.

## Artifacts

- silent: `renders/final/linca-method-explainer.mp4` (90.2 s)
- narrated: `renders/final/linca-method-explainer-narrated.mp4` (130.9 s,
  Gemini Kore), end-frame padding 1.8 s total (max 0.9 s per scene)
- QA: `qa/qa_report.json`, `qa/voice/report.json`, `qa/keyframes.yaml`,
  `renders/final/narration_mux_report.json`

## Cycle 3 — Gemini Kore voice

Replaced the `say` render with Gemini TTS voice Kore, using the cheaper
2.5 Flash TTS model for this video (about $0.03 of audio). Seven semantic
chunks, one per scene.

- Re-rendered with `--timing transcript`: scene durations match the audio,
  end-frame padding 1.8 s total with no scene above 0.9 s.
- Voice QA: 0 errors, 0 warnings.
- The two scenes that were re-paced (`lc_02`, `lc_06`) only had their
  `timing.animation_seconds` adjusted; the narration and subtitles did not
  change.
