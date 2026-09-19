---
name: weekly-research-slides
description: Turn the week's changes in research methods, evidence, claims, and diagnostics into a concise, visually explanatory, editable PowerPoint update for a supervisor, PI, mentor, or research group. Use when the user asks to make or update weekly research slides, prepare a lab-meeting deck, compare this week's method against last week's, explain competitor methods visually, build slides that support a research claim with diagnostics, or turn experiment notes into an editable research PowerPoint. Not for generic business, marketing, or sales decks.
license: MIT
metadata:
  version: "0.2.0"
---

# Weekly Research Slides

An Agent Skill for research updates. The deck is a **delta** on the project's
persistent scientific state, and it is a **visual argument**, not a bullet dump.
The primary output is an editable `.pptx` built from structured source.

## The one idea

> Track changes in methods, evidence, claims, diagnostics, and uncertainty
> across weeks, then turn those changes into a visual scientific argument.

## Workflow

1. **Gather state.** Find `research_state.yaml` (persistent project memory) and
   any previous deck/state. If there is a previous state, compute the delta:

   ```bash
   wrs diff --prev research_state_week5.yaml --curr research_state.yaml \
     --question "<this week's question>" --output weekly_delta.yaml
   ```

   If the user already provides `weekly_delta.yaml`, use it directly.

2. **Pick the stage** (`survey`, `hypothesis-formation`, `method-development`,
   `diagnostic`, `refinement`, `mature-comparison`) and plan the argument:

   ```bash
   wrs plan --state research_state.yaml --delta weekly_delta.yaml \
     --stage diagnostic --output storyboard.yaml
   ```

3. **Author `storyboard.yaml` -> `slide_spec.yaml`.** One intellectual message
   per slide, question/claim titles, visual explanation, progressive disclosure.
   Never invent results. Never strengthen a claim beyond its evidence. Keep
   measurement, observation, interpretation, and claim separate.

4. **Build, QA, render.**

   ```bash
   wrs build --input slide_spec.yaml --output deck.pptx \
     --motion motion_spec.yaml --preview preview/
   wrs qa --input deck.pptx --spec slide_spec.yaml --delta weekly_delta.yaml
   wrs render --input deck.pptx --output rendered/   # if LibreOffice exists
   ```

5. **Fix the source and rebuild** until scientific QA, geometry QA, and visual
   review pass. Do not patch the generated `.pptx`.

## Hard rules

- Delta-first: for a mature project open with "What changed this week?", not the
  problem definition.
- Adapt the skeleton to the stage; do not force every section.
- End at limitations / open questions. Never auto-add Thank You, Q&A, or
  generic next steps.
- `MEASUREMENT != OBSERVATION != INTERPRETATION != CLAIM != HYPOTHESIS`.
- Every diagnostic states which claim it tests and what it cannot conclude.
- Object permanence: reuse the same semantic object ids and positions.
- Native PowerPoint objects only; the user must be able to edit the result.
- PPTX is reproducible from source. Source files are the truth.

## Method explainer videos

When a method's mechanism is hard to understand statically — a representation
changes through time, an algorithm iterates, or a multi-stage process is the
point — use the bundled **`research-method-video`** sub-skill. It turns the same
scientific understanding into a short 3Blue1Brown-style Manim explainer whose
objects persist and transform, plus a keyframe manifest for slides.

```text
research_state / method_model.yaml
        |                     \
        v                      v
   slide_spec.yaml        scene_spec.yaml
        |                      |
        v                      v
   editable PPTX           Manim MP4 + keyframes
```

Decide first:

- **STATIC SLIDES SUFFICIENT** — movement adds no explanatory value.
- **VIDEO EXPLAINER HELPFUL** — temporal dynamics, iteration, geometry, or
  multi-stage structure carry the argument.

Do not generate a video for every method. See
`skills/research-method-video/SKILL.md`.

## Read next (progressive disclosure)

- `references/research-story.md` — narrative framework.
- `references/research-stages.md` — stage -> module selection.
- `references/weekly-delta.md` — delta-first behavior and `weekly_delta.yaml`.
- `references/method-explainer.md` — how to explain any method.
- `references/claim-diagnostic.md` — claims, diagnostics, epistemic separation.
- `references/visual-grammar.md` — shapes, arrows, color semantics.
- `references/slide-archetypes.md` — archetype content fields.
- `references/object-continuity.md` — semantic ids and Morph-readiness.
- `references/motion-language.md` — beat-driven motion and `motion_spec.yaml`.
- `references/editing-existing-pptx.md` — inspect and conservative edits.
- `references/review-checklist.md` — scientific and visual QA.
- `skills/research-method-video/SKILL.md` — method → Manim explainer video.

## Commands

```bash
npm install
npm run doctor
npm run demo
npm run build -- --input examples/diagnostic-week/slide_spec.yaml --output out.pptx
npm run qa -- --input out.pptx --spec examples/diagnostic-week/slide_spec.yaml
```

Local, deterministic, no hosted backend. Optional tools (LibreOffice,
rsvg-convert) improve previews but are not required.
