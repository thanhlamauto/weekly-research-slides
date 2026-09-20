# Architecture

## Source of truth

`slide_spec.yaml` is the renderable source of truth. Everything upstream
(`research_state.yaml`, `weekly_delta.yaml`, `storyboard.yaml`) informs it, and
everything downstream (`deck.pptx`, motion, previews) is derived from it. To
change a deck, change the source and rebuild.

## Pipeline

```text
research_state.yaml + weekly material
        |
        v
  weekly_delta.yaml       wrs diff (deterministic) or hand-authored
        |
        v
  storyboard.yaml         wrs plan or hand-authored
        |
        v
  slide_spec.yaml         validated against schemas/slide_spec.schema.json
        |
        +--> semantic LaTeX (src/beamer/renderTex.js, macros only)
        |         |
        |         v
        |    templates/academic-beamer/ (theme.tex, macros.tex, version.json)
        |         |
        |         v
        |    compile (pdflatex/latexmk) + log QA -> presentation.pdf / handout.pdf
        |         |
        |         v
        |    pdftoppm page renders + contact sheet
        |
        +--> scene (renderer-agnostic geometry, typed primitives with semantic ids)
                  |
                  +--> pptxRenderer  -> native editable .pptx
                  +--> svgRenderer   -> vector previews + contact sheets
                  |
                  v
            optional motion (OOXML <p:transition> / <p:timing>)
                  |
                  v
            QA: scientific, geometry, continuity, pptx package
```

## Beamer renderer (`src/beamer/`)

The default output. `renderTex.js` maps each archetype to semantic macros and
never emits coordinates or colours; `templates/academic-beamer/` owns the
presentation and is versioned. `build.js` prepares the build directory
(`preamble.tex`, `slides.tex`, `presentation.tex`, `handout.tex`,
`build_manifest.json`), compiles with `pdflatex`/`latexmk`, parses the LaTeX log
(compile errors, overfull boxes, missing files, undefined citations/references),
builds the handout, and renders pages with `pdftoppm`. `scripts/pdf_contact_sheet.py`
composes the contact sheet. See `references/beamer-template.md`.

## The scene

The scene is the PPTX/SVG intermediate. Beamer does not consume it: it works
from the semantic spec directly, because its layout is owned by the template.
Layouts do not talk to PowerPoint. They produce a **scene**: a list of
primitives (`text`, `rect`, `roundRect`, `ellipse`, `line`) with coordinates in
inches and a stable `id`. Both PPTX and SVG renderers consume the same scene, so
geometry QA, previews, and the PPTX can never disagree about layout.

## Layouts and archetypes

`src/layouts/` maps each archetype to a pure function `(slide, ctx) -> primitive[]`.
`src/layouts/common.js` adds shared chrome (background, kicker, title, rule,
footer) and reusable composition helpers.

## QA layers

- `qa/scientific.js` — reasoning hygiene on `slide_spec.yaml`.
- `qa/geometry.js` — overflow, bounds, font size, density, placeholders,
  malformed primitives.
- `qa/continuity.js` — object permanence across consecutive slides.
- `qa/pptxPackage.js` — the generated OOXML package: slide count, named objects,
  native bounds, placeholders.

## Motion

`pptx/motion.js` opens the `.pptx` as a ZIP, reads shape ids and names from each
slide's XML, and writes standard `<p:transition>` and `<p:timing>` nodes for the
requested semantic groups. The static deck remains canonical; the animated deck
is a separate file.

## Academic style system (`src/renderer/styles.js`)

Style is separated from slide implementations: typography, colour, layout,
blocks, outer frame, figure treatment and decoration policy live in a profile.
This system applies to the **legacy PPTX backend**; the Beamer template carries
its own equivalent vocabulary.

```text
styles.js (academic-beamer | academic-metropolis | paper-figure | dark-explainer)
    -> theme.js (resolved LAYOUT / COLORS / FONT / STROKE / STYLE)
    -> chrome (frame title, rule, footer, progress, citation)
    -> layouts (blocks, figure-first sizing)
```

Selected per build with `--style` / `WRS_PPT_STYLE`; `academic-beamer` is the
default. `visual-grammar/draw.js#block` renders semantic blocks with a thin left
rule.

## Editorial critique loop (`src/critics/`)
```text
slide_spec.yaml
   -> content critic -> revise source -> build -> render
   -> visual critic  -> revise source -> build
   -> deck critic    -> revise source -> build + verify
```

- `budgets.js` measures visible words, clusters and note ratio per archetype.
- `content.js`, `visual.js`, `deck.js` are the three critics.
- `revise.js` applies findings as source edits (drop / move to notes / shorten /
  cap / retitle / merge / delete) and refuses to empty lists or remove required
  fields.
- `imageMetrics.js` + `scripts/slide_image_metrics.py` give the visual critic
  real rendered-image metrics.
- `loop.js` orchestrates the bounded cycles and writes the review artifacts.
- `metrics.js` reports editorial metrics for the deck.

## Method explainer video (`skills/research-method-video`)

A parallel consumer of the same scientific understanding:

```text
method_model.yaml          (shared semantic model)
        |
        +--> storyboard.md -> scene_spec.yaml ---+
        |                                        |
        |            transcript/transcript.yaml --+--> transcript.json (+ timings)
        |                                        |         |
        |                                        |         v
        |                                        |   narration.md / srt / vtt / speaker_notes
        |                                        v
        |                                   Manim scenes (timing.py dwell) -> MP4
        |                                         |
        |                                         v
        |                                   frames + contact sheet (QA)
        |                                         |
        v                                         v
   slide_spec.yaml -> Beamer PDF / PPTX     keyframes.yaml + PNG (PPT bridge)
```

The narration script is authored with the visual beats and is the source of
truth for what is said. `src/transcript.py` estimates timings (silent mode),
`src/subtitles.py` derives SRT/VTT, `src/qa_transcript.py` checks the narration,
`src/audio.py` provides optional TTS/alignment backends, and `src/timing.py`
lets scenes read transcript-derived dwell.

- `src/spec.py` validates both specs and rejects duplicate scene/actor/beat ids.
- `src/theme.py`, `src/actors.py`, `src/patterns.py` are the video visual
  grammar, mirroring the PowerPoint grammar.
- `scripts/render_scene.py` renders one scene or all, draft or final, and can
  concatenate; `scripts/qa_video.py` and `scripts/lint_scenes.py` are the QA
  loop; `scripts/export_keyframes.py` is the bridge.
- Scenes are authored Manim classes (one per file) registered in `src/main.py`
  from `scene_spec.yaml`. A general spec-to-Manim interpreter is future work.

## Scientific figures (`skills/research-method-figure`)

A third consumer of the same method model:

```text
method_model.yaml          (shared semantic model)
        |
        +--> slide_spec.yaml -> Beamer PDF / PPTX
        +--> scene_spec.yaml -> Manim MP4
        |
        v
   figure_spec.yaml + style_profile.yaml
        |
        v
   Figure IR  -->  drawio (canonical)
              -->  svg / pdf / png
              -->  pptx (native shapes)
```

- `src/spec.py` validates figure specs and synthesizes one from a method model.
- `src/style.py` resolves reusable style profiles; `src/extract.py` derives a
  profile from a reference with per-field confidence.
- `src/layout.py` derives deterministic geometry (columns, panel hugging,
  annotation and legend placement); `src/ir.py` merges spec + style + layout.
- `src/drawio.py`, `src/svg.py` and `scripts/figure_to_pptx.js` render the IR.
- `src/qa.py` is the geometric pre-flight; `scripts/qa_figure.py` adds the
  render/inspect/repair loop.
- `src/roles.py` enforces source-role classification so a STYLE_SOURCE never
  leaks scientific content.

## Extension points

- Add an archetype: add a layout function and register it in
  `src/layouts/index.js`, add a Beamer renderer in `src/beamer/renderTex.js`,
  then add it to the `slide_spec` schema enum.
- Restyle the default output: bump `templates/academic-beamer/version.json` and
  edit `theme.tex` / `macros.tex`; generated `.tex` is never edited.
- Add a visual object kind: extend `NODE_STYLE` / `ARROW_STYLE` in
  `src/visual-grammar/draw.js` (PPTX backend) or the tikz styles in the Beamer
  theme.
- Add a QA rule: push findings from a new function in `src/qa/`.
