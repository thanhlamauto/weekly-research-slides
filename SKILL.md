---
name: weekly-research-slides
description: Turn the week's changes in research methods, evidence, claims, and diagnostics into a concise, visually explanatory research update for a supervisor, PI, mentor, or research group. The default output is a template-driven LaTeX Beamer PDF, with an editable PowerPoint backend when native editing is needed. Use when the user asks to make or update weekly research slides, prepare a lab-meeting deck, compare this week's method against last week's, explain competitor methods visually, build slides that support a research claim with diagnostics, or turn experiment notes into a research update. Not for generic business, marketing, or sales decks.
license: MIT
metadata:
  version: "0.6.0"
---

# Weekly Research Slides

An Agent Skill for research updates. The deck is a **delta** on the project's
persistent scientific state, and it is a **visual argument**, not a bullet dump.
The default deliverable is a **template-driven LaTeX Beamer PDF** compiled from
structured source; an editable `.pptx` backend is available with
`--renderer pptx` when the user needs native editing.

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
   wrs build --input slide_spec.yaml --output deck.pdf --render-pages
   wrs qa --input deck.pdf --spec slide_spec.yaml --delta weekly_delta.yaml
   wrs render --input deck.pdf --output rendered/     # page PNGs + contact sheet
   ```

   The build renders semantic LaTeX through `templates/academic-beamer/`,
   compiles with `pdflatex` (or `lualatex` for non-Latin-1 content), writes
   `presentation.pdf` and `handout.pdf`, and hard-fails on compile errors,
   overfull boxes, missing figures/citations, and undefined references. The
   generated `.tex` is never patched.

   For the legacy editable PowerPoint backend:

   ```bash
   wrs build --input slide_spec.yaml --output deck.pptx --renderer pptx \
     --motion motion_spec.yaml --preview preview/
   wrs qa --input deck.pptx --spec slide_spec.yaml
   ```

5. **Fix the source and rebuild** until scientific QA, compile/geometry QA, and
   visual review pass. Do not patch the generated PDF or PPTX.
6. **Run the editorial critique loop** to sharpen the deck:

   ```bash
   wrs critique --input slide_spec.yaml --output revised.yaml \
     --renderer beamer --deck out.pdf --qa-dir qa
   ```

   It runs a content critic (deletion-first, moves prose to speaker notes), a
   rendered-page visual critic (PDF pages via `pdftoppm`), and a deck critic,
   revising the source and rebuilding. Cycle 1 is deletion-only; at most three
   cycles. See `references/editorial-critique.md`.

## Hard rules

- Delta-first: for a mature project open with "What changed this week?", not the
  problem definition.
- Adapt the skeleton to the stage; do not force every section.
- End at limitations / open questions. Never auto-add Thank You, Q&A, or
  generic next steps.
- `MEASUREMENT != OBSERVATION != INTERPRETATION != CLAIM != HYPOTHESIS`.
- Every diagnostic states which claim it tests and what it cannot conclude.
- Object permanence: reuse the same semantic object ids and positions.
- The Beamer template owns presentation (fonts, margins, footer, blocks,
  citations); emit semantic macros only, never coordinates or colours. The
  `feature-space` archetype is the one exception: `cx`/`cy` are semantic and
  become tikz coordinates.
- The PPTX backend uses native PowerPoint objects only; the user must be able
  to edit the result. Beamer `.tex` is generated, compiled and reproducible.
- Source files are the truth; never patch a generated PDF or PPTX.

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

Narration is written **before** animation and is a first-class artifact: the
script sets the pacing (silent mode), and the same transcript produces subtitles
(SRT/VTT) and slide speaker notes. See
`skills/research-method-video/references/narration-writing.md`.

Do not generate a video for every method. See
`skills/research-method-video/SKILL.md`.

## Scientific method figures

When the deliverable is a paper figure — a method overview, an architecture, a
mechanism zoom, a training/inference diagram, a competitor-vs-ours comparison,
or a method delta — use the bundled **`research-method-figure`** sub-skill. It
draws from the same method model as the slides and the video, keeps
`.drawio` as the canonical editable source, and exports SVG/PDF/PNG plus native
PowerPoint.

```text
METHOD MODEL
     |
 figure_spec.yaml + style_profile.yaml
     |
 figure.drawio -> .svg / .pdf / .png -> .pptx
```

It also supports extracting a reusable style profile from a reference figure and
redrawing different content in that style, and classifying inputs by role
(CONTENT / STRUCTURE / STYLE / LAYOUT / ASSET) so a style reference never leaks
content. See `skills/research-method-figure/SKILL.md`.

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
- `references/editorial-critique.md` — content / visual / deck critique loop.
- `references/beamer-template.md` — the default renderer: template contract,
  archetype mapping, compile QA, versioning, engines.
- `references/academic-slide-style.md` — the academic visual language shared by
  both renderers (PPTX style variants).
- `skills/research-method-video/SKILL.md` — method → Manim explainer video.
- `skills/research-method-figure/SKILL.md` — method → editable scientific figure.
- `references/layout-contracts.md` — shared layout limits across slides, figures and video.

## Commands

```bash
npm install
npm run doctor
npm run demo    # builds the example as Beamer PDF + handout + page renders (+ legacy PPTX)
npm run build -- --input examples/diagnostic-week/slide_spec.yaml --output out.pdf --render-pages
npm run qa -- --input out.pdf --spec examples/diagnostic-week/slide_spec.yaml
npm run build -- --input examples/diagnostic-week/slide_spec.yaml --output out.pptx --renderer pptx
```

Local, deterministic, no hosted backend. The default Beamer pipeline needs a
TeX distribution (`pdflatex`/`latexmk`) and Poppler's `pdftoppm`; `wrs doctor`
reports the state. LibreOffice and `rsvg-convert` improve legacy PPTX previews
but are not required.
