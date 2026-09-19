---
name: research-method-video
description: Turn a research method into a short 3Blue1Brown-style visual explainer video with Manim. Use when a method mechanism is hard to understand statically, when a representation changes through time (iterative algorithms, diffusion, temporal caching, attention, optimization dynamics, multi-stage processes), or when the user asks to animate a method, make a method explainer clip for a lab meeting, or turn a paper's method into a video. Produces persistent scientific objects, animated transformations, an MP4, and PowerPoint-ready keyframes. Not for generic YouTube videos, narration, or avatar presenters.
license: MIT
metadata:
  version: "0.1.0"
---

# research-method-video

A sub-capability of **weekly-research-slides**. It turns a *method semantic
model* into a concise visual explainer rendered with Manim Community Edition.

Primary use case:

```text
researcher reads a paper
    -> method semantic model
    -> concise visual explainer
    -> play the clip in a lab meeting, or reuse frames in PowerPoint
```

The video is a silent visual explanation (the researcher narrates live). It is
**not** an animated slide deck, a zooming paper figure, or a narrated slideshow.

## Core rule: transform objects, not slides

Never do `FadeOut(scene); FadeIn(scene)` when the same scientific object
continues. Maintain object identity and move/morph it:

```text
a feature appears -> moves through the model -> is cached -> goes stale
-> a predictor appears next to it -> the predicted feature moves to the next step
```

Use `Transform`, `ReplacementTransform`, `TransformMatchingShapes`,
`TransformFromCopy`, `MoveToTarget`, `animate.shift/move_to/scale` over repeated
fade-out/fade-in.

## Workflow

1. **Understand the method.** Read the actual paper/notes with your document
   tools. Do not build a PDF parser. Write `method_model.yaml` (schema in
   `schemas/method_model.schema.json`): problem, baseline, key observation,
   assumption/failure of previous methods, motivation, mechanism, components,
   equations, training, inference, claims, assumptions, limitations,
   relation_to_our_work. This model is shared with the slide pipeline.

2. **Storyboard before code.** Write `storyboard.md`: for each scene give the
   scientific purpose, the question answered, actors, start state, animation
   beats, end state, speaker intent, and transition. Pick only the stages the
   method needs (problem -> why previous fails -> key observation -> new idea ->
   mechanism -> why it works -> assumption/weakness). Do not follow paper
   section order.

3. **Scene spec.** Write `scene_spec.yaml` (schema in
   `schemas/scene_spec.schema.json`): scenes, persistent actors with stable ids,
   explanation beats with a motion `pattern`, start/end state, and one
   `keyframe` per scene for the PowerPoint bridge.

4. **Implement scenes.** One Manim scene per file under `src/scenes/`, registered
   in `src/main.py` from `scene_spec.yaml`. Reuse `src/theme.py`,
   `src/actors.py` and `src/patterns.py` (the shared visual grammar).

5. **Render, inspect, revise.** Draft render is cheap; render one scene while
   iterating. Always extract frames and look at them before a final render.

   ```bash
   python skills/research-method-video/scripts/video_doctor.py
   python skills/research-method-video/scripts/render_scene.py --project examples/lesa --scene lesa_03_stage_dynamics --quality draft
   python skills/research-method-video/scripts/render_scene.py --project examples/lesa --quality draft --concat examples/lesa/renders/draft/lesa-method-explainer.mp4
   python skills/research-method-video/scripts/qa_video.py --input examples/lesa/renders/draft/lesa-method-explainer.mp4 --output examples/lesa/qa
   python skills/research-method-video/scripts/lint_scenes.py --project examples/lesa
   ```

6. **Export for PowerPoint.**

   ```bash
   python skills/research-method-video/scripts/export_keyframes.py --project examples/lesa --quality final
   ```

   Writes `qa/keyframes/<scene>.png` and `qa/keyframes.yaml`. The slide pipeline
   can use a keyframe as a method-summary slide, or insert the MP4.

## Animation vocabulary

`ESTABLISH, TRACE, BUILD, MORPH, FOCUS, COMPARE, TRAJECTORY, STAGE-SPLIT,
ACCUMULATION, CORRECTION, REPLAY, REVEAL, ZOOM, RECAP`. Each communicates a
scientific meaning; do not animate decoratively. See
`references/manim-visual-grammar.md`.

## When NOT to make a video

If movement adds no explanatory value, use a static diagram. A video is worth it
when a representation changes through time, when an algorithm iterates, or when
the ordering of a multi-stage process is the point.

## Read next

- `references/video-explainer.md` — the end-to-end pipeline and file formats.
- `references/video-storytelling.md` — act structure, aha moment, camera, text.
- `references/manim-visual-grammar.md` — actors, patterns, shared palette.
- `references/video-qa.md` — animation lint, frame QA, the render loop.

## Requirements

Python 3.11-3.13, Manim Community Edition, ffmpeg. LaTeX is optional (v0.1 uses
Pango `Text` with composed sub/superscripts). `requirements.txt` pins the rest.
