# Video storytelling

Do not follow paper section order. Use scientific causal storytelling, and use
only the stages the method needs.

## Competitor method

```text
PROBLEM
  -> WHY THE OBVIOUS / PREVIOUS METHOD FAILS
  -> KEY OBSERVATION
  -> NEW IDEA
  -> MECHANISM
  -> WHY IT SHOULD WORK
  -> ASSUMPTION / WEAKNESS
```

## Our method

```text
CURRENT FAILURE / MOTIVATION
  -> WHAT WE CHANGE
  -> HIGH-LEVEL IDEA
  -> MECHANISM
  -> WHAT BEHAVIOR THIS CREATES
  -> CLAIM
  -> DIAGNOSTIC / EVIDENCE
```

## Rules

- One idea per scene. If a scene needs two conclusions, split it.
- The aha moment is a scene, not a sentence. Build the observation visually, then
  let the design consequence follow from it (for example: stage-dependent
  dynamics -> stage-aware experts).
- Prefer question/claim titles on screen over category titles.
- Establish the full system, then go into a component, then return. Do not keep
  the camera moving.
- Reveal equations incrementally: `h_t`, then `h_t + alpha z`, then
  `hhat_{t-1} = h_t + alpha z`. Never drop the complete equation first.
- Text is a short label next to a visual object, never a paragraph.
- End on the mechanism or the open question, not on a leaderboard.

## Camera

Purposeful only: establish the system, zoom into one component, move from
timeline level to feature-space level, return to system level. Scientific clarity
over cinematic motion.

## Narration

Not required for v0.1. The MP4 is a silent visual explanation; the researcher
explains live. `scene_spec` accepts `speaker_note` / `narration_note` per scene
and per beat so TTS can be added later, but rendering never blocks on audio.

## Length

Optimise explanation density, not duration. A first demo is typically 60-120 s.
