# LearniBridge — revision log

Two mandatory cycles: a visual/content revision after the draft render, and a
pacing revision after the first narrated mux. Everything below was found by
rendering and looking, not by reading the source.

## Cycle 1 — draft render and visual review

Draft: `renders/draft/learnibridge-method-explainer.mp4` (63.9 s, no transcript
timing), contact sheet `qa/contact-sheet.png`, 14 frames.

Defects found:

1. **Scene 3, overlapping objects.** The three past-feature nodes were packed at
   `buff=0.4` with wide `h_{t+k}` labels, so the circles and labels overlapped.
   Fixed: label size `SIZE_TINY`, spacing `buff=0.8`.
2. **Scene 2, label collision.** The `small error` label sat above the gap arrow
   and covered the `cached` / `true` node labels. Fixed: label moved below the
   arrow and renamed `small gap`.
3. **Lint warning.** Scene 3 opened with `COMPARE`, which the pacing lint does
   not accept as an anchoring beat. Fixed: the opening beat is `ESTABLISH`.
4. **Content review.** Scene 5 (prompt groups) was kept because it carries the
   evidence for comprehension question 4; scene 4 was kept long (6 beats) but
   each beat answers a distinct question. No scene was a paper-summary scene.

Verified by re-rendering scenes 2 and 3 and inspecting frames (`lb02-fix2.png`,
`lb03-fix.png`): no overlaps remain.

## Cycle 2 — narrated pacing

First narrated mux (Samantha) used the silent renders and needed **27.7 s of
frozen end frames** (scene 7 alone +8.6 s, scene 4 +5.2 s). That is the failure
mode the task forbids.

Root cause: the Manim scenes only wait at a few beats, and `timing.tail` capped
the final hold at 6 s, so narration longer than the animation was finished on a
frozen frame.

Revision (skill-level, committed separately):

- transcripts can declare `timing.hooks` (beats the scene waits on) and
  `timing.animation_seconds` (measured from a draft render);
- `apply_audio_timing` distributes the audio budget into hook dwells, and is
  idempotent (dwells reset to kind defaults before each application);
- `timing.tail` subtracts hook dwells that were already waited on;
- the chunker merges a too-small trailing chunk to avoid a prosody reset.

Result after re-rendering with `--timing transcript`: scene durations match the
audio (13.0/14.6/14.7/19.1/14.4/15.4/25.6 s, total 116.7 s), **end-frame padding
0.0 s**, per-scene audio padding ≤ 0.5 s. Hook pauses are 2.0–3.7 s at beats the
narration explicitly pauses on, instead of one long dead frame.

## Comprehension gate (self-review)

Reviewed against the narration and the rendered scenes:

1. Why long-range caching accumulates error → scene 2 (drift + accumulated
   error squares).
2. What LearniBridge learns → scenes 3 and 6 (the required correction, then the
   LoRA parameterization).
3. Why the correction is low-rank → scene 4 (decaying singular values as an
   observation; rank bound as the consequence).
4. Evidence for prompt invariance → scene 5 (disjoint groups, small pairwise
   angles).
5. Why low rank suggests LoRA → scene 6 (thin `ΔW = B A` path derived from the
   structure).
6. Calibration data → scene 7 (cached final-block input + ground-truth target,
   3–5 prompts).
7. What runs at skipped timesteps → scene 7 (earlier blocks crossed out; only
   the augmented final block runs).

Known weaknesses (honest): scenes 4 and 5 are information-dense for an adjacent
researcher; a human comprehension test is still recommended. The narration was
checked for spoken language, but subjective voice quality with `say` remains
flat (Gemini Kore is the configured preferred voice; see the voice iteration).

## Artifacts

- silent: `renders/final/learnibridge-method-explainer.mp4` (105.3 s)
- narrated: `renders/final/learnibridge-method-explainer-narrated.mp4` (180.6 s,
  Gemini Kore)
- QA: `qa/qa_report.json`, `qa/voice/report.json`, `qa/keyframes.yaml`,
  `renders/final/narration_mux_report.json`

## Cycle 3 — Gemini Kore voice

The `say` render was replaced with Gemini TTS voice Kore once billing was
available. The free-tier daily cap had already produced 5 of 7 chunks; the
finish run reused those from the cache and generated only the missing ones
(about $0.16 of audio for this video).

- 7 scenes, one semantic chunk each initially; the two longest scenes
  (29.2 s and 36.8 s) were split with `narration.chunking.per_scene` so no
  chunk exceeds ~18 s, which removed the chunk-length warnings.
- Re-rendered with `--timing transcript`: scene durations match the Kore audio,
  **end-frame padding 0.0 s**, per-scene audio padding ≤ 0.5 s.
- Voice QA: 0 errors, 0 warnings.
- Narration was not changed, so only the voice layer moved; the scientific text
  and subtitles are identical to the silent canonical.
