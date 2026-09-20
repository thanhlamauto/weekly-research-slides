# weekly-research-slides

![weekly-research-slides banner](docs/images/banner.png)

**Turn weekly changes in methods, evidence, claims, and uncertainty into visual research updates.**

[![License: MIT](https://img.shields.io/badge/license-MIT-2ea44f.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933.svg)](package.json)
![status](https://img.shields.io/badge/status-alpha%20v0.1-orange.svg)

An [Agent Skill](https://docs.anthropic.com/en/docs/agents-and-tools/agent-skills/overview)
for weekly research meetings with a supervisor, PI, mentor, or research group.
It is not a generic slide generator. It tracks what changed in the science
across weeks and turns that change into a concise, visually explanatory deck.
The default output is a **template-driven LaTeX Beamer PDF**; a native,
editable PowerPoint backend remains available when hand editing matters.

## Why this exists

Weekly research presentations are hard for a specific reason: the value is not
in restating the project, it is in communicating **what changed** and **what it
means for the current claims**. Generic slide generators produce bullet-heavy
decks that treat every week like a fresh start and blur the line between what
was measured and what it might mean.

This skill keeps a persistent project state, computes the week's delta, and
renders an argument through a versioned academic template. The Beamer PDF is the
deliverable by default; the same source also renders an editable `.pptx`.

## Core idea: research delta

```text
what the audience already knows
  +  what changed in the method
  +  what new experiments ran
  +  what results moved
  +  what claims strengthened / weakened / refuted / appeared
  =  this week's deck
```

For a mature project, the deck usually opens with **"What changed this week?"**
instead of a problem definition, and ends at **limitations / open questions**.
The mentor discussion happens after the deck.

## Example weekly narrative

The bundled synthetic example is a week-6 diagnostic update for a fictional
"cached future-feature prediction" project:

```text
1  title        this week's question
2  recap        where we are now
3  method delta v3 -> v4
4  geometry     two stories for what the correction does   [objects persist]
5  geometry     correction is nearly orthogonal to desired [objects persist]
6  diagnostic   D1: does the correction aim at the future feature?
7  benchmark    competitor + ours(last week) + ours(this week)
8  claim delta  C1 weakened, new C2 emerging
9  diagnostic   D2: does output recovery require feature recovery?
10 limitations  limitations + open questions
```

The demo source is in [`examples/diagnostic-week/`](examples/diagnostic-week/)
and the built deck is
[`examples/diagnostic-week/output/demo-weekly-research-slides.pptx`](examples/diagnostic-week/output/demo-weekly-research-slides.pptx).
A second, survey-stage example is in
[`examples/survey-stage/`](examples/survey-stage/) and demonstrates the
"no invented method, end at the gap" rule.

## Gallery

The demo source is
[`examples/diagnostic-week/slide_spec.yaml`](examples/diagnostic-week/slide_spec.yaml).
The default output is the 10-page Beamer PDF
[`output/demo-weekly-research-slides.pdf`](examples/diagnostic-week/output/demo-weekly-research-slides.pdf),
built together with a handout PDF and per-page PNG renders by `npm run demo`.

[![Beamer demo deck](docs/images/beamer-contact-sheet.png)](examples/diagnostic-week/output/demo-weekly-research-slides.pdf)

The contact sheet is rendered from the compiled PDF with `pdftoppm`, not from
the source scene, so it shows the actual deliverable.

## Beamer PDF (default renderer)

`wrs build` now writes a LaTeX Beamer PDF by default. The generator emits only
semantic content (`\wrsband{measurement}{...}`, `\wrsStatus{weakened}`, tikz
nodes with semantic ids); the versioned template
[`templates/academic-beamer/`](templates/academic-beamer/) owns fonts, margins,
footer, blocks and citations. Compile QA is hard-failing: a broken build, an
overfull box, a missing figure/citation or an undefined reference stops the
pipeline, because the PDF is the deliverable.

Before (legacy PowerPoint default) vs after (Beamer template), same diagnostic
slide:

| before — hand-placed PowerPoint shapes | after — compiled Beamer |
|---|---|
| ![diagnostic before](docs/images/legacy-diagnostic.png) | ![diagnostic after](docs/images/beamer-slide-06.png) |

This is a renderer change, not a palette tweak: the new default is compiled
LaTeX (frame rules, semantic bands, booktabs tables, tikz geometry) instead of
positioned PowerPoint shapes. The PowerPoint backend is still there for native
editability.

```bash
node src/cli.js build --input slide_spec.yaml --output deck.pdf      # default
node src/cli.js build --input slide_spec.yaml --output deck.pdf \
  --render-pages                                                     # + page PNGs
node src/cli.js build --input slide_spec.yaml --output deck.pdf \
  --no-handout --engine pdflatex|lualatex|xelatex
node src/cli.js build --input slide_spec.yaml --output deck.pptx \
  --renderer pptx                                                    # legacy backend
```

See [`references/beamer-template.md`](references/beamer-template.md) for the
template contract and versioning.

## PowerPoint backend (legacy)

The native, editable PPTX path is preserved for workflows that need hand
editing, native motion, or PPTX delivery. It uses the same `slide_spec.yaml`
and the academic style system (`--style academic-beamer`, default for this
backend; `academic-metropolis` adds more whitespace and a thin progress line).

```bash
node src/cli.js build --input slide_spec.yaml --output out.pptx --renderer pptx \
  --style academic-beamer
node src/cli.js build --input slide_spec.yaml --output out.pptx --renderer pptx \
  --style academic-metropolis
```

Contact sheet: [`docs/images/gallery-contact-sheet.png`](docs/images/gallery-contact-sheet.png)
(source preview, not a PPTX rasterization). See
[`references/academic-slide-style.md`](references/academic-slide-style.md).

## Editorial critique loop

Agent-generated slides are often verbose, repetitive and visually dense. The
critique loop fixes that at the **source** and rebuilds the deck:

```text
draft -> content critic -> revision -> build
      -> visual critic  -> revision -> build
      -> deck critic    -> revision -> build + verify
```

Three critics, bounded to three cycles:

- **Content critic** — correctness, concision, redundancy, necessity, and
  whether text belongs on the slide or in the speaker notes. It prefers
  deleting/demoting over adding.
- **Visual critic** — inspects the **rendered slide image** (pixel metrics plus
  a few geometry signals); it cannot pass a slide on PPT geometry alone.
- **Deck critic** — duplicated explanation, repeated layouts, density rhythm,
  merge/delete candidates, and whether the story reads from titles.

Cycle 1 is a **deletion-only** pass (delete / merge / shorten / move to notes).
Visible text has soft budgets (title ≤ 12 words, visible ≤ 30 words, ≤ 3 text
clusters) with technical content exempt, and required scientific fields are
shortened, never removed.

Before / after on a deliberately verbose week-6 draft (**615 → 320 visible
words, 9 → 0 QA errors, one cycle**):

![diagnostic before](docs/images/critique-before-s6.png)
![diagnostic after](docs/images/critique-after-s6.png)

Full before/after, findings and reproduction: [`docs/critique-before-after.md`](docs/critique-before-after.md).

```bash
npm run critique:demo
node src/cli.js critique --input slide_spec.yaml --output revised.yaml \
  --deck out.pptx --qa-dir qa
```

Review artifacts: `qa/{content,visual,deck}_review.json`,
`qa/editorial_metrics.json`, `qa/revision_log.md`.

## Method explainer videos

Some methods are better explained with motion than with a static diagram. The
bundled **`research-method-video`** sub-skill turns the same scientific
understanding (`method_model.yaml`) into a short 3Blue1Brown-style Manim
explainer where scientific objects persist and transform, then exports keyframes
for slides.

![LESA method explainer preview](docs/images/lesa-preview.gif)

The demo explains the central method of **LESA: Learnable Stage-Aware Predictors
for Diffusion Model Acceleration** (Cai et al., arXiv:2602.20497): why caching
diffusion features is worth doing, why a single fixed reuse/forecast scheme
fails, the stage-dependent observation, the stage-aware experts, what one expert
predictor computes, and why training becomes closed-loop. It is a silent visual
explanation; the researcher narrates live. Full keyframe grid:
[`docs/images/lesa-contact-sheet.png`](docs/images/lesa-contact-sheet.png).

```bash
npm run video:doctor
npm run video:render          # draft 480p15, concatenated to one mp4
npm run video:render:final    # 1080p60 deliverable
npm run video:qa              # frames + contact sheet + heuristics
npm run video:lint            # source-level animation lint
```

Iterate on one scene (cheap):

```bash
python skills/research-method-video/scripts/render_scene.py \
  --project examples/lesa --scene lesa_03_stage_dynamics --quality draft
```

The video and the deck share one method model, so a competitor method is never
explained two different ways. A video is only worth generating when movement
carries the argument; otherwise a static diagram is preferable.

### Paper explainers: LearniBridge and LinCa

Two acceptance-test demos that read a full paper and produce a standalone
explainer. Paper figures are not animated; the mechanisms are redrawn from the
shared visual grammar.

| | LearniBridge | LinCa |
|---|---|---|
| paper | [arXiv:2606.26778](https://arxiv.org/abs/2606.26778) | [arXiv:2608.17973](https://arxiv.org/abs/2608.17973) |
| one-sentence idea | the required cached-feature correction is low-rank and prompt-invariant, so a tiny LoRA bridge on the final block recovers skipped-timestep representations | one prediction rule cannot fit a feature whose dimensions have different continuity, so LinCa learns an invertible decomposition and predicts each group at a matched order |
| scenes | 7 | 7 |
| silent / narrated | 105.3 s / 119.0 s | 90.2 s / 110.1 s |
| voice in the committed render | macOS `say` (Samantha); Gemini Kore is the configured preferred backend | same |
| contact sheet | [`examples/learnibridge/qa/contact-sheet.png`](examples/learnibridge/qa/contact-sheet.png) | [`examples/linca/qa/contact-sheet.png`](examples/linca/qa/contact-sheet.png) |
| revision log | [`examples/learnibridge/qa/revision-log.md`](examples/learnibridge/qa/revision-log.md) | [`examples/linca/qa/revision-log.md`](examples/linca/qa/revision-log.md) |

```bash
python skills/research-method-video/scripts/render_scene.py --project examples/learnibridge \
  --quality final --timing transcript --concat examples/learnibridge/renders/final/learnibridge-method-explainer.mp4
python skills/research-method-video/scripts/tts_narration.py --project examples/learnibridge --backend say --voice Samantha
python skills/research-method-video/scripts/mux_narration.py --project examples/learnibridge --quality final --backend say
```

Known limitations: the committed narrated renders use the local `say` fallback
because the Gemini TTS free quota was exhausted during the run (`--backend
gemini` is the preferred path). LearniBridge already has 5 of 7 Kore chunks
cached; when quota is available again, finish it with:

```bash
python skills/research-method-video/scripts/tts_narration.py --project examples/learnibridge --backend gemini --delay 65
python skills/research-method-video/scripts/render_scene.py --project examples/learnibridge --quality final --timing transcript
python skills/research-method-video/scripts/mux_narration.py --project examples/learnibridge --quality final --backend gemini
```

LinCa retains 5.8 s of end-frame padding on two scenes, recorded in its revision
log; both videos were reviewed by frame inspection and self-review against the
comprehension gates, not by a human panel.

## Transcript and narration

Narration is a first-class part of the video pipeline, written **before**
animation and reviewed together with the visual beats:

```text
method model -> storyboard -> narration script + visual beats
             -> timed transcript -> Manim -> video
```

Three modes share one canonical transcript:

- **silent** (default) — no audio; the script sets per-beat dwell and scene
  holds, so pacing follows the words. Best for weekly meetings.
- **tts** — local synthesis via macOS `say` (free, no account); timings estimated
  from audio duration.
- **recorded** — force-align a recording to the canonical text with WhisperX
  when installed, else a clearly-labelled estimate. The text is never replaced by
  ASR output.

The same transcript produces sidecar subtitles (`transcript.srt`,
`transcript.vtt`) and a speaker-notes manifest (`speaker_notes.yaml`) for the
deck.

```bash
npm run transcript:build     # narration.md + transcript.json + srt/vtt + word_times
npm run transcript:qa        # narration, linking, subtitle and pacing checks
npm run transcript:notes     # transcript -> speaker_notes.yaml
npm run transcript:tts       # optional local TTS (macOS say)
npm run transcript:align -- --audio narration.wav
npm run video:narrate        # mux narration onto the rendered scenes
```

The optional **narrated** demo (local macOS `say`, no cloud account) is
committed at
[`examples/lesa/renders/final/lesa-method-explainer-narrated.mp4`](examples/lesa/renders/final/lesa-method-explainer-narrated.mp4)
— 110.3 s, 1080p60 with AAC audio. The canonical demo remains the silent,
script-paced render; audio is a backend.

A LESA excerpt (`examples/lesa/transcript/narration.md`), rewritten for an
**adjacent researcher**:

> Early on, noise is high and change is fast and uneven.
> In the middle, change becomes small and smooth.
> Near the end it barely moves: only details are refined.
> One trajectory, three behaviours. Call them stages.
> Why should one predictor handle all three?

Animation shows *what* changes; narration explains *why* it matters.

## Scientific diagram backends

One semantic figure spec, several renderers, one Beamer deck:

```text
                     SCIENTIFIC CONTENT
                            |
                 semantic figure spec / Figure IR
                            |
                  renderer selection (recorded)
        +-------------------+-------------------+------------------+
        v                   v                   v                  v
      TikZ              Draw.io            Python/PGFPlots       Manim
  conceptual,         large editable      quantitative         animated
  math-heavy          architecture        plots                explanations
        |                   |                   |                  |
        v                   v                   v                  v
   native .tex         PDF/SVG ->           plot assets          MP4
   inside Beamer       \includegraphics
        +-------------------+-------------------+
                            v
                      one Beamer PDF
```

TikZ is the default for small-to-medium conceptual and math-heavy diagrams.
Draw.io is not replaced: it stays the backend for large, editable, reconstructed
architecture figures. The router records why it chose a backend:

```bash
wrs route --input examples/diagram-backends/large_architecture.figure.yaml
# -> drawio: figure type 'architecture' is an architecture-scale view;
#            16 semantic objects (TikZ budget 12); 18 edges (TikZ budget 15)
```

| TikZ: feature-space geometry | TikZ: competitor vs ours |
|---|---|
| ![feature-space geometry](docs/images/tikz-preimage_geometry.png) | ![competitor vs ours](docs/images/tikz-cached_vs_corrected.png) |

| TikZ: method delta | Mixed deck: TikZ + Draw.io + Beamer |
|---|---|
| ![method delta](docs/images/tikz-v3_v4.png) | ![mixed-renderer deck](docs/images/diagram-backends-contact-sheet.png) |

The mixed deck in [`examples/diagram-backends/`](examples/diagram-backends/)
compiles native TikZ figures, a Draw.io PDF export and Beamer-native slides
into one PDF — with progressive overlays in presentation mode (10 pages) and a
collapsed handout (8 pages). Figures inherit the Beamer palette and math
typography; there are no rasterized labels.

```bash
npm run demo:figures
wrs route   --input figure_spec.yaml [--json]
wrs tikz    --input figure_spec.yaml --output figure.tex --standalone out/
wrs tikz:qa --input figure_spec.yaml --output-dir qa/figure
```

Policy, grammar, archetypes and the QA/repair loop:
[`references/diagram-routing.md`](references/diagram-routing.md),
[`references/tikz-visual-grammar.md`](references/tikz-visual-grammar.md),
[`references/tikz-archetypes.md`](references/tikz-archetypes.md),
[`references/tikz-qa.md`](references/tikz-qa.md).

## Scientific method figures

The Draw.io backend. It remains the editable, architecture-scale path: large
system views, style extraction, reconstruction, and frequent manual editing.

The same method model also drives publication-quality, editable figures. The
bundled **`research-method-figure`** sub-skill keeps `.drawio` as the canonical
editable source and exports SVG, PDF and PNG, plus native PowerPoint shapes.

![competitor vs ours comparison](docs/images/figure-comparison.png)

Comparison figures normalize both methods into one visual language with a single
shared style profile: shared components are gray, competitor-only amber, ours
blue. Only the real structural difference is visible.

Method-delta and style-transfer examples:
[`figure-method-delta.png`](docs/images/figure-method-delta.png),
[`figure-style-transfer.png`](docs/images/figure-style-transfer.png).

### Style extraction and transfer

A reusable style profile is extracted from a reference figure — palette,
typography hierarchy, module geometry, edge grammar — and applied to *different*
scientific content. The reference is classified as a `STYLE_SOURCE` only, so its
labels and architecture are never copied.

```bash
npm run figure:doctor
npm run figure:compare     # competitor vs ours, normalized
npm run figure:delta       # our v3 vs v4
npm run figure:extract     # reference.svg -> styles/user/<name>.yaml
npm run figure:qa
```

### One method, three carriers

The LESA method model that produces the Manim video also produces a figure and
the slide source, so one method is never explained three different ways. Figure:
[`docs/images/figure-lesa.png`](docs/images/figure-lesa.png).

## Features

- **Delta-first workflow** — compute `weekly_delta.yaml` from two research
  states, or supply one directly.
- **Stage-adaptive** — `survey`, `hypothesis-formation`, `method-development`,
  `diagnostic`, `refinement`, `mature-comparison`. The stage suggests modules;
  it does not lock the deck.
- **Persistent research state** — `research_state.yaml` remembers problem,
  competitors, method versions, claims, diagnostics, results, limitations.
- **Versioned claims and diagnostics** — claim states `new`, `emerging`,
  `plausible`, `unchanged`, `strengthened`, `weakened`, `refuted`; each
  diagnostic links to the claims it tests.
- **Epistemic separation** — measurement, observation, interpretation, claim,
  and hypothesis are never collapsed.
- **Beamer PDF by default** — a versioned LaTeX template
  (`templates/academic-beamer/`, version 1) owns presentation; the generator
  emits semantic macros and tikz with semantic ids only.
- **Compile QA** — hard failures on compile errors, overfull boxes, missing
  figures/citations and undefined references; handout PDF and `pdftoppm` page
  renders from the same build.
- **Native, editable PPTX (legacy backend)** — text boxes, shapes, arrows. No
  screenshot decks. Every object has a stable semantic name.
- **Object permanence** — reused ids keep objects in place across slides;
  Morph-ready by construction.
- **Scientific + geometry + continuity + package QA** and an optional native
  OOXML motion pass.
- **Inspection and conservative editing** of external PPTX files.
- **Source-first** — edit structured source, rebuild; do not patch the artifact.

## Installation

Portable skill install:

```bash
npx skills add https://github.com/thanhlamauto/weekly-research-slides \
  --skill weekly-research-slides
```

Manual install:

```bash
git clone https://github.com/thanhlamauto/weekly-research-slides.git \
  ~/.agents/skills/weekly-research-slides
cd ~/.agents/skills/weekly-research-slides && npm install
```

The skill lives in [`SKILL.md`](SKILL.md); detailed guidance is in
[`references/`](references/).

## Quick start

```bash
npm install
npm run doctor          # runtime + optional tools
npm run demo            # build + QA the bundled example deck
```

Build a deck and run QA (Beamer PDF is the default):

```bash
npm run build -- --input examples/diagnostic-week/slide_spec.yaml --output out.pdf
npm run qa   -- --input out.pdf --spec examples/diagnostic-week/slide_spec.yaml

# legacy editable PPTX backend
npm run build -- --input examples/diagnostic-week/slide_spec.yaml --output out.pptx --renderer pptx
npm run qa   -- --input out.pptx --spec examples/diagnostic-week/slide_spec.yaml
```

## Example prompts

```text
Use weekly-research-slides to turn these experiment notes into this week's
editable lab-meeting PowerPoint. Last week's deck is ./week-05.pptx and the
current results are in ./results/.
```

```text
Use weekly-research-slides in survey mode. Compare these four papers, normalize
their methods into the same visual language, and end with the unresolved gap.
```

```text
Update my previous research deck. Emphasize only what changed in the method,
benchmark, claims, and diagnostics this week.
```

```text
My claim C1 weakened this week. Build a diagnostic slide that separates the
measurement, the observation, and the interpretation, and links to the claim.
```

## Architecture

[![source-first pipeline](docs/images/architecture.png)](docs/images/architecture.png)

```text
research_state.yaml + weekly material
        |
        v
  weekly_delta.yaml        wrs diff / hand-authored
        |
        v
  storyboard.yaml          wrs plan / hand-authored
        |
        v
  slide_spec.yaml          the renderable source of truth
        |
        +--> semantic Beamer source      wrs build --output deck.pdf   [default]
        |         |
        |         v
        |    compile + log QA (pdflatex/latexmk)
        |         |
        |         v
        |    presentation.pdf + handout.pdf + page renders (pdftoppm)
        |
        +--> scene -> editable PPTX      wrs build --output deck.pptx --renderer pptx
                  |
                  v
             optional motion         wrs build --motion m.yaml
```

The default pipeline needs a TeX distribution (TeX Live or TinyTeX) with
`pdflatex`/`latexmk` and Poppler's `pdftoppm`; `wrs doctor` reports the exact
state. The PPTX backend uses `pptxgenjs`, `js-yaml`, `ajv`, `jszip`, and
`fast-xml-parser`. No hosted backend either way.

## Research state and claim tracking

```yaml
project: { title: ..., stage: diagnostic, week: 6, familiarity: high }
problem: { id: P1, summary: ..., status: stable }
competitors:
  reuse_only: { familiarity: high, summary: ..., weakness: ... }
method:
  current_version: v4
  previous_version: v3
  versions: [{ version: v4, changes: [...] }]
claims:
  C1: { statement: ..., status: weakened, diagnostics: [D0, D1] }
  C2: { statement: ..., status: emerging,  diagnostics: [D2] }
diagnostics:
  D1:
    supports_or_tests: [C1]
    measurement: cos(deltaZ, Z_d - Z_s) = 0.1168
    observation: ...
    interpretation: ...
    can_conclude: ...
    cannot_conclude: ...
```

Run `wrs diff` to get the week-over-week delta, then `wrs plan` to get the
argument skeleton, then author the `slide_spec.yaml`.

## Renderers and editability

The default output is a Beamer PDF: the generator writes semantic LaTeX and the
versioned template renders it. To change a deck, change `slide_spec.yaml` and
rebuild; generated `.tex` is reproducible and never patched.

The legacy PowerPoint backend builds native objects in this order of preference:

1. native PowerPoint objects (text, shapes, connectors),
2. editable vector content,
3. layered raster only when unavoidable (never for the normal path).

In the PPTX backend the user can open the result in PowerPoint and move,
restyle, or delete any object. Object names are semantic (`concept-zs`,
`claimdelta-C1`, `diag-D1-measurement`) so diagrams survive authoring and are
Motion-ready.

## Project structure

```text
weekly-research-slides/
├── SKILL.md                  # concise skill entry + workflow
├── README.md
├── LICENSE  CONTRIBUTING.md  CHANGELOG.md
├── package.json
├── references/               # progressive-disclosure guidance
├── schemas/                  # research_state, weekly_delta, storyboard, slide_spec, motion_spec
├── templates/
│   └── academic-beamer/      # versioned Beamer template (theme.tex, macros.tex)
├── scripts/                  # make_docs_assets.js, pdf_contact_sheet.py, slide_image_metrics.py
├── src/
│   ├── model/                # validate.js, plan.js, diff.js
│   ├── renderer/             # scene.js, buildScene.js, pptxRenderer.js, svgRenderer.js, theme.js
│   ├── layouts/              # narrative.js, method.js, evidence.js, common.js
│   ├── visual-grammar/       # draw.js
│   ├── beamer/               # renderTex.js (semantic LaTeX), build.js (compile + log QA + pages)
│   ├── pptx/                 # inspect.js, edit.js, motion.js
│   ├── qa/                   # geometry.js, continuity.js, scientific.js, pptxPackage.js
│   └── cli.js
├── assets/README.md
├── skills/
│   ├── research-method-video/   # method -> Manim explainer
│   └── research-method-figure/  # method -> editable scientific figure (drawio/svg/pdf/png/pptx)
├── examples/                 # diagnostic-week, survey-stage, lesa, figure-comparison, figure-style-transfer
├── docs/                     # architecture.md, gallery.md, gallery/, images/
└── tests/
```

## Commands

| command | purpose |
|---|---|
| `wrs doctor` | runtime, optional tools, and the LaTeX/Beamer stack |
| `wrs build --input slide_spec.yaml --output out.pdf [--render-pages] [--no-handout] [--engine pdflatex]` | render semantic LaTeX, compile (hard QA), handout PDF, page PNGs |
| `wrs build --input slide_spec.yaml --output out.pptx --renderer pptx [--motion m.yaml] [--preview dir]` | legacy native PPTX + optional motion |
| `wrs qa --input out.pdf --spec slide_spec.yaml [--build-dir dir] [--report r.json]` | PDF checks + compile-log QA + scientific/geometry/continuity QA |
| `wrs qa --input out.pptx --spec slide_spec.yaml [--delta d.yaml] [--report r.json]` | scientific + geometry + continuity + package QA |
| `wrs render --input deck.pdf --output dir/` | render PDF pages to PNG + contact sheet |
| `wrs render --input deck.pptx --output dir/` | rasterize PPTX (LibreOffice) or render source previews |
| `wrs critique --input slide_spec.yaml --deck out.pdf --renderer beamer` | source-first critique loop with PDF page inspection |
| `wrs inspect --input deck.pptx [--json]` | list shapes, names, text, geometry |
| `wrs edit --input deck.pptx --ops ops.yaml --output deck2.pptx` | conservative edits |
| `wrs plan --state state.yaml [--delta d.yaml] [--stage diagnostic]` | emit `storyboard.yaml` |
| `wrs diff --prev a.yaml --curr b.yaml` | emit `weekly_delta.yaml` |
| `wrs validate --schema slide_spec --input spec.yaml` | schema validation |
| `wrs demo` | build + QA the bundled example (PDF + PPTX + page renders) |
| `npm run video:doctor` | check Python, Manim, ffmpeg, LaTeX |
| `npm run video:render` / `video:render:final` | render the LESA explainer (draft / final) |
| `npm run video:qa` | extract frames, contact sheet, heuristics |
| `npm run video:lint` | source-level animation lint |
| `npm run figure:doctor` | figure runtime + font + renderer check |
| `npm run figure:build` | build a figure from a method model |
| `npm run figure:compare` | normalized competitor-vs-ours comparison figure |
| `npm run figure:delta` | method-delta figure (v3 vs v4) |
| `npm run figure:extract` | extract a style profile from a reference |
| `npm run figure:qa` | geometric preflight + preview + defect log |
| `npm run figure:pptx` | native PowerPoint shapes from the figure IR |

## Current limitations

- **Beamer needs a local TeX distribution.** The default pipeline requires
  `pdflatex` (or `lualatex`/`xelatex` for non-Latin-1 content), `latexmk` or the
  engine itself, and `pdftoppm` for page renders. Without them the build fails
  with an actionable message and the PPTX backend still works.
- **Beamer frames are static.** Overlays/progressive disclosure are not emitted;
  `beats` drive the speaker notes and PPTX motion instead. Handout mode drops
  notes by design.
- **No native PPTX rasterization by default.** If LibreOffice (`soffice`) is
  installed, `wrs render --input deck.pptx` converts the real deck. Otherwise
  source previews are vector renders from the same scene used to build the
  PPTX. PPTX gallery assets are source-rendered and labeled as such.
- **No Morph generation.** The deck is Morph-ready (stable names and positions)
  but Morph transitions are not injected in v0.1.
- **Edit support is conservative.** `set_text`, `move`, `resize`, and
  `annotate` only. No arbitrary PowerPoint editing.
- **Benchmarks are tables, not charts.** Native charts and equation objects are
  on the roadmap; no figure ingestion yet.
- **Speaker notes are generated** but narration timing and rehearsal tooling are
  not part of v0.1.
- **Video: no narration/TTS, no Morph, no arbitrary Manim→PPTX conversion.** The
  video is a silent clip; the PowerPoint bridge exports the MP4 plus keyframe
  stills and a manifest. Animation patterns are authored in Manim per scene, not
  generated from a general interpreter.
- **Video rendering needs Manim + ffmpeg locally.** Without them the video tests
  and render steps are skipped, and the deck pipeline is unaffected.
- **Figures: draw.io is canonical; no native `.drawio` rasterizer.** SVG/PDF/PNG
  are produced by our own renderer, so the drawio CLI is optional. Style
  extraction from raster images recovers palette and density but not fonts or
  exact geometry, and records that as low confidence. Reconstruction is
  agent-assisted, not a universal automatic converter.
- **TikZ is used only inside the Beamer template** (feature-space geometry and
  method pipelines). It is not a general figure backend; draw.io remains the
  editable figure source.

## Roadmap

- Native PPTX rendering QA loop (LibreOffice/PowerPoint) with visual diffs.
- Morph transition generation from object continuity.
- Native charts for benchmark slides and equation objects for diagnostics.
- Figure/asset ingestion from a local `figures/` directory.
- Richer external-PPTX editing (shape duplication, style transfer, slide copy).
- Additional example: `mature-weekly-update`.
- Video: a general pattern interpreter, optional narration/TTS, and richer
  PowerPoint keyframe insertion.
- Figures: an optional TikZ backend, `.drawio` → IR round-trip for external
  editing, and richer reconstruction fidelity.

## Inspirations and acknowledgements

Architecture and concepts were studied from these MIT-licensed projects. No
bundled visual assets or templates were copied, and large code blocks were not
reused; concepts were reimplemented.

- [`siril9/presentation-skill`](https://github.com/siril9/presentation-skill) —
  source-first deck generation, structured outlines, editable native PPTX,
  geometry QA, render/rebuild loops.
- [`qybaihe/codex-ppt`](https://github.com/qybaihe/codex-ppt) — storyboard-first
  workflow, per-slide planning, visual QA.
- [`yinzige/pptx-motion-lite`](https://github.com/yinzige/pptx-motion-lite) —
  lightweight OOXML post-processing, grouped-click reveals, native entrance
  transitions. The `src/pptx/motion.js` injector is a JavaScript
  reimplementation of this concept (MIT).
- [`hugohe3/ppt-master`](https://github.com/hugohe3/ppt-master) — native object
  philosophy and template-preserving workflows.
- [`LikC1606/lab-meeting-report-skill`](https://github.com/LikC1606/lab-meeting-report-skill)
  — source-grounded lab-meeting reporting and honest handling of negative
  results.

For the Beamer renderer, design principles were studied from
[LaTeX Beamer](https://ctan.org/pkg/beamer) (GPL-2.0-or-later / LPPL-1.3c) and
the [Metropolis theme](https://github.com/matze/mtheme) (CC BY-SA 4.0). No
code, fonts or assets are reused; `templates/academic-beamer/` is an independent
implementation that depends on the user's own TeX distribution.

For the figure sub-capability, concepts were studied from these projects (no
bundled assets copied; code was reimplemented):

- [`holdyounger/drawio-diagram-builder`](https://github.com/holdyounger/drawio-diagram-builder)
  (MIT) — separate content/structure/style/layout sources, style extraction
  before drawing, top-conference visual rules, geometric pre-flight, screenshot
  → defect → repair.
- [`Agents365-ai/drawio-skill`](https://github.com/Agents365-ai/drawio-skill) (MIT)
  — persistent style presets, learning a style from `.drawio` or a flat image,
  iterative self-check.
- [`sxy1499894281/drawio-reconstruction-skill`](https://github.com/sxy1499894281/drawio-reconstruction-skill)
  (MIT) — reference decomposition, element inventory, editability boundaries,
  drawio → editable PPTX mapping.
- [`pengqianhan/codex-paper-figure-skill`](https://github.com/pengqianhan/codex-paper-figure-skill)
  (MIT) — composition exploration and editable-first reconstruction.
- [`Ztsdut/ml-architecture-diagram-skill`](https://github.com/Ztsdut/ml-architecture-diagram-skill)
  (MIT) — architecture IR, semantic roles, separating computation fidelity from
  figure design, multiple editable carriers.
- [`PM-Shawn/tikz-scientific-figures`](https://github.com/PM-Shawn/tikz-scientific-figures)
  — publication sizing and vector PDF/SVG concepts only; no license file was
  present at inspection time, so no code was reused.

For the video sub-capability, concepts were studied from these projects (no
bundled assets copied; code was reimplemented):

- [`AmitSubhash/3brown1blue`](https://github.com/AmitSubhash/3brown1blue) (MIT) —
  paper-explainer workflow, machine-learning visual patterns, scene planning.
- [`albertobarnabo/manim-craft`](https://github.com/albertobarnabo/manim-craft) —
  visual continuity, morph-over-fade, still-frame review, contact-sheet
  inspection. No license file was present at inspection time, so only concepts
  were used, no code.
- [`adithya-s-k/manim_skill`](https://github.com/adithya-s-k/manim_skill) (MIT) —
  composer/storyboard before coding, identifying the aha moment.
- [`Yusuke710/manim-skill`](https://github.com/Yusuke710/manim-skill) (MIT) —
  packaging and verification patterns.
- [`ahkamboh/chalktalk`](https://github.com/ahkamboh/chalktalk) (MIT) — environment
  bootstrap, no-LaTeX mode, render/verify scripts.
- [Manim Community Edition](https://www.manim.community/) (MIT) — the renderer.

The unique focus here is **research reasoning across weeks**.

## Contributing and license

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Released under the
[MIT License](LICENSE). The bundled example is synthetic and fictional.
