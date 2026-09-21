# Changelog

All notable changes to this project are documented here. The format is loosely
based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [Unreleased]

### Fixed

- **`method-high-level` pipelines were drawn on top of each other.** The Beamer
  renderer emitted every stage node without a position, so all stages piled up
  at the picture origin. Stages are now chained (`right=of stage-N`) with a gap
  that tightens as stages are added, and the picture only shrinks when it would
  exceed the text width. Regression tests cover the positioning and a compiled
  four-stage pipeline.

### Changed

- **`benchmark` highlights the best value per metric per row group** instead of
  forcing the `current` row's cells bold. `higher_is_better` (default true) sets
  the direction, `group` scopes the comparison to a row group such as one cache
  interval, and `role: reference` marks a yardstick row that is muted and never
  crowned.

### Added

- **Raw display math on slides** (`content.equations`): a list of LaTeX math
  lines, rendered by the template macro `\wrsMath` after the archetype body.
  This is the one authored exception to ASCII-only content, so method slides can
  show the actual formula instead of ASCII art. Template `academic-beamer`
  version bumped to 2; a malformed equation fails the compile and is reported as
  a build error.
- **`role_label` for `benchmark` rows**: overrides the weekly
  "last week"/"this week" role label, so paper-explainer and survey decks can
  mark the explained method (for example `ours`) without weekly framing.

## [0.8.0] - 2026-09-20

### Added

- **Native TikZ scientific-diagram backend** (`src/renderers/tikz/`): a
  semantic figure spec (or the Figure IR from `skills/research-method-figure`)
  renders to native LaTeX — styles, layout, primitives, renderer, preflight and
  critique. No hex colors and no rasterized labels: figures inherit the Beamer
  palette (`templates/academic-beamer/tikz.tex`) and math typography.
- **Renderer routing** (`src/renderers/router.js`): `backend: auto|tikz|drawio|
  python|manim|external`, with documented heuristics (node/edge budgets,
  figure type, topology, math-heavy labels) and an inspectable
  `renderer_decision` recorded in every build manifest.
- **TikZ archetypes**: `feature-space` (points, vectors, reference directions,
  angle arc, measurement labels), `competitor-vs-ours` (shared semantic ids
  aligned across panels), `method-delta` (shared layers kept, additions
  highlighted), `linear-flow`, `branch-flow`, `stage-split`/timeline and
  `process-loop` feedback edges.
- **Progressive overlays**: `rendering.overlays` emits `\wrsReveal`, which is
  `\uncover<n->` in Beamer and a plain include in standalone/paper mode.
- **Standalone export**: `wrs tikz --standalone` compiles a figure with the
  `standalone` class for paper reuse (`--mode paper|presentation`).
- **TikZ QA and repair loop**: `wrs tikz:qa` runs geometric preflight and
  rendered-image critique, and writes `tikz_qa.json` + an actionable
  `defect-log.md` (`reroute_edge`, `increase_figure_scale`, `reduce_node_text`,
  `route_to_drawio`, ...). New CLI: `wrs route`, `wrs tikz`, `wrs tikz:qa`.
- **`figure` slide archetype** and Beamer integration: a slide references a
  figure spec or IR; the build routes it, writes TikZ sources or copies the
  Draw.io export, and emits `\wrsDiagram` / `\wrsFigure`. Deck builds report
  figure findings alongside compile QA.
- **Mixed-renderer demo** (`examples/diagram-backends/`): TikZ feature-space,
  competitor-vs-ours and method-delta figures plus a Draw.io architecture PDF in
  one Beamer deck (10 presentation pages, 8 handout pages), with standalone
  figure PDFs, QA reports and a rendered-inspection revision log.

### Changed

- `texDoctor` also reports `standalone.cls` and `pgfplots.sty`; standalone
  export needs the `standalone` package (`tlmgr install standalone`).
- The README documents the backend selection policy with real generated
  figures; Draw.io remains fully supported for large editable architecture
  figures.
- Tests: 18 new cases cover routing, IR conversion, generation, alignment,
  preflight, critique actions, standalone compile and the mixed deck.

## [0.7.0] - 2026-09-20

### Added

- **Template-driven LaTeX Beamer renderer is now the default output.** `wrs
  build` writes a PDF by default; the editable PPTX backend remains available
  with `--renderer pptx` (or a `.pptx` output path).
  - versioned template `templates/academic-beamer/` (`version.json`,
    `theme.tex`, `macros.tex`): fonts, margins, frame chrome, minimal footer,
    semantic bands, status colours, citation style and a tikz vocabulary;
  - semantic generator `src/beamer/renderTex.js`: every schema archetype maps to
    macros (`\wrsLead`, `\wrsband`, `\wrsStatus`, `\wrsClaimTransition`,
    `\wrsDiagId`, `\wrsMethodTransition`, tikz nodes/vectors), never to
    coordinates or colours;
  - `src/beamer/build.js`: build directory + `build_manifest.json`, compile with
    `pdflatex`/`latexmk`, log QA, handout build, `pdftoppm` page renders and a
    Pillow contact sheet (`scripts/pdf_contact_sheet.py`);
  - compile QA is hard-failing: compile errors, overfull boxes ≥ 1pt, missing
    files, undefined citations/references;
  - handout mode (`\documentclass[...,handout]`), speaker notes via `\note{}`,
    Unicode engine fallback to `lualatex`;
  - `wrs qa --input deck.pdf` re-checks the compile log and page count;
    `wrs render --input deck.pdf` renders pages + contact sheet; `wrs doctor`
    reports the TeX toolchain and required packages;
  - the critique loop accepts `--renderer beamer` and inspects real PDF page
    pixels.
- README gallery is now the compiled PDF (one contact sheet), with an honest
  before/after: legacy PowerPoint shapes vs the compiled Beamer diagnostic
  slide. Several figure/video embeds became links to cut image count.
- Tests: `tests/beamer.test.js` (template metadata, archetype coverage, the
  Beamer subtitle trap, escaping, log QA, compile + handout, page renders, CLI).

### Changed

- `wrs build` default output is `out.pdf`; `.pptx` still routes to the legacy
  backend. `wrs demo` now also produces the Beamer PDF, handout and page
  renders.
- README/SKILL describe the Beamer renderer as primary and the academic
  PowerPoint styles as a backend option.
- `npm run assets` also refreshes the Beamer gallery assets from the demo
  build; banner and architecture diagrams reflect the new default.

## [0.6.0] - 2026-09-20

### Added

- **Academic PowerPoint visual language** (`academic-beamer`, default):
  - a style system (`src/renderer/styles.js`) with typography, colour, layout,
    frame, blocks, figure-treatment and decoration policy separated from slide
    implementations;
  - left-aligned one-line frame titles, subtle title rule, minimal footer with
    page numbers, optional thin progress line (`academic-metropolis`), and an
    understated citation slot;
  - semantic blocks (`Observation`, `Claim`, `Limitation`, …) with a thin left
    rule instead of coloured cards; the diagnostic archetype now uses them;
  - restrained academic palette (near-black text, two accents, neutral fills);
  - figure-first sizing (geometry and method diagrams dominate the slide);
  - `paper-figure` and `dark-explainer` variants; `--style` selection.
- Critic updates: `beamer_overexplained` (content), academic visual checks
  (`card_layout`, `figure_not_dominant`, tighter card thresholds), deck
  `card_heavy_deck`, and `style_metrics.json` (cards, blocks, accent colours,
  figure-area ratio, font hierarchy).
- Before/after demo and A/B contact sheets
  (`docs/images/academic-{beamer,metropolis}-contact-sheet.png`,
  `academic-diagnostic.png`) plus an editable
  `examples/diagnostic-week/output/demo-weekly-research-slides-academic.pptx`.

### Changed

- The default deck style is now `academic-beamer`; the earlier colourful
  card-based look remains available as a reference in the gallery.

## [0.5.0] - 2026-09-20

### Added

- **Editorial critique loop** for generated slides: content critic → revision →
  build → visual critic → revision → build → deck critic → revision → rebuild +
  verify, bounded to three cycles, always revising the source.
  - Content critic: correctness, concision, redundancy, necessity, budgets,
    role-specific rules, competitor compression, and `spoken_explanation_on_slide`;
    moves explanatory prose to speaker notes.
  - Mandatory deletion-only first cycle (delete / merge / shorten / move to
    notes; no additions).
  - Visual critic: inspects the **rendered slide image** (pixel metrics from
    `scripts/slide_image_metrics.py`) plus geometry; reports density, balance,
    whitespace/cramped regions, palette scatter and competing focal points.
  - Deck critic: duplicated explanation, repeated layout streaks, density
    rhythm, merge/delete candidates, and titles-as-narrative.
  - Editorial metrics and review artifacts: `qa/content_review.json`,
    `visual_review.json`, `deck_review.json`, `editorial_metrics.json`,
    `revision_log.md`.
  - `wrs critique` CLI and `npm run critique:demo`.
- Before/after demo (`docs/critique-before-after.md`): verbose week-6 draft
  reduced from 615 to 320 visible words with 9 → 0 QA errors in one cycle; the
  already-tight deck drops 442 → 361 words without losing slides.
- Tests for budgets, all three critics, deletion-only revision, list-safety,
  protected scientific fields, the render loop and convergence.

## [0.4.0] - 2026-09-20

### Added

- **Transcript / narration is first-class** in `research-method-video`.
  - Authored `transcript/transcript.yaml` is the source of truth; `narration.md`,
    `transcript.json`, `transcript.srt`, `transcript.vtt`, `word_times.json` and
    `speaker_notes.yaml` are generated from it.
  - Deterministic timing estimation from the script (speech rate per audience,
    punctuation pauses, comprehension dwell) for **silent** mode.
  - Audience levels `expert`, `adjacent-researcher` (default), `general-technical`
    with different speech rates and dwell budgets.
  - Narration↔visual beat linking via stable scene/beat ids and `visual_cue`.
  - Transcript QA: sentence length, words per beat, paper-like prose,
    unexplained acronyms, narration duplicating on-screen text, terms before
    they appear, insufficient dwell, subtitle line length, and (with a render)
    animation-vs-narration pacing.
  - Optional audio: local TTS (macOS `say`, pyttsx3) and recorded-narration
    alignment (WhisperX forced alignment when installed, else a labelled
    estimate).
  - `timing.py` gives scenes transcript-derived dwell; `render_scene.py
    --timing transcript` enables it.
  - `mux_narration.py` muxes narration audio onto rendered scenes (padding the
    shorter side so no words are cut) and concatenates a narrated video.
  - Optional narrated LESA demo rendered with local macOS `say`:
    `examples/lesa/renders/final/lesa-method-explainer-narrated.mp4` (110.3 s).
- **LESA narration rewritten** for adjacent researchers (291 words, ~153 s
  script) and re-rendered with transcript pacing: **100.1 s**, up from 63.8 s.
- References: `narration-writing.md`, `transcript-schema.md`, `video-pacing.md`,
  `audio-alignment.md`.
- Tests for transcript schema, ids, linking, deterministic timings, subtitles,
  audience profiles, QA, and optional-dependency handling.

## [0.3.0] - 2026-09-20

### Added

- **`research-method-figure` sub-skill**: turn a method model into a
  publication-quality, editable scientific figure.
  - `figure_spec.yaml` (renderer-neutral) and a reusable `style_profile.yaml`,
    with one Figure IR consumed by the Draw.io, SVG, QA and PowerPoint outputs.
  - Editable Draw.io as the canonical format; SVG, PDF and PNG exports; native
    PowerPoint shapes via the Node bridge.
  - Style profiles: `topconf-clean`, `grayscale-paper`, `presentation-clean`,
    `dark-explainer`, plus user presets.
  - Style extraction from `.svg`, `.drawio` and raster images, with per-field
    confidence; source-role classification (CONTENT/STRUCTURE/STYLE/LAYOUT/ASSET).
  - Normalized competitor-vs-ours comparison and method-delta figures using one
    shared style profile.
  - Geometric pre-flight (text fit, overlap, edge-through-node, annotation and
    legend clearance, spacing, palette, font size) plus a visual QA/repair loop.
  - Demos: `examples/figure-comparison` (competitor, ours, comparison, delta)
    and `examples/figure-style-transfer` (extract style, redraw different
    content), and a LESA overview figure from the shared method model.
- Shared layout contracts (`references/layout-contracts.md`,
  `layout_contracts.py`) used by figure QA and referenced by video QA.

### Changed

- `research-method-video`: added `audience` (expert / adjacent-researcher /
  general-technical) and audience-aware pacing checks (`src/pacing.py`); the
  video doctor now checks the theme font.

## [0.2.0] - 2026-09-20

### Added

- **`research-method-video` sub-skill**: turn a research method into a short
  3Blue1Brown-style Manim explainer.
  - `method_model.yaml` semantic model shared with the slide pipeline, and a
    `scene_spec.yaml` bridge (persistent actors, explanation beats, keyframes).
  - Shared visual grammar for video: `theme.py`, `actors.py` (persistent
    scientific objects) and `patterns.py` (ESTABLISH/TRACE/BUILD/MORPH/FOCUS/
    COMPARE/TRAJECTORY/STAGE-SPLIT/ACCUMULATION/CORRECTION/REPLAY/REVEAL/ZOOM/
    RECAP).
  - Manim render workflow: `video_doctor.py`, `render_scene.py` (draft/final,
    single-scene iteration, concat), `extract_frames.py`,
    `make_contact_sheet.py`, `qa_video.py`, `lint_scenes.py`,
    `export_keyframes.py`.
  - PowerPoint bridge: MP4 plus `qa/keyframes.yaml` and per-scene stills.
- **LESA acceptance demo** (`examples/lesa/`): a 7-scene, ~64 s explainer of the
  central LESA method (arXiv:2602.20497), rendered to MP4, with storyboard,
  scene spec, Manim source, contact sheet and keyframes.
- Tests for the video specs, structure, lint, keyframes and an optional
  single-scene render integration test.

### Changed

- Main `SKILL.md` and `README.md` document when to prefer a static diagram and
  when a video explainer is helpful.

## [0.1.0] - 2026-09-20

Initial alpha.

### Added

- Agent Skill entry point (`SKILL.md`) with progressive disclosure via
  `references/`.
- Persistent research state model (`research_state.yaml`) with problem,
  competitors, method versions, claims, diagnostics, results, limitations,
  open questions, and semantic objects.
- Weekly delta model (`weekly_delta.yaml`) and a deterministic differ
  (`wrs diff`).
- Stage-adaptive planner (`wrs plan`) for `survey`, `hypothesis-formation`,
  `method-development`, `diagnostic`, `refinement`, `mature-comparison`.
- JSON schemas for `research_state`, `weekly_delta`, `storyboard`,
  `slide_spec`, and `motion_spec`, with `ajv` validation.
- Renderer-agnostic scene and native PPTX renderer (`pptxgenjs`) with stable
  semantic object names.
- 18 slide archetypes across narrative, method, and evidence layouts.
- Visual grammar for latents, models, learned modules, caches, tokens,
  operators, and five arrow semantics.
- SVG source-preview renderer, per-slide previews, and contact sheets.
- QA: scientific/story, geometry, object-continuity, and PPTX-package checks.
- Optional native OOXML motion injection (transitions + grouped-click
  entrance effects) via semantic object names.
- External PPTX inspection and conservative editing (`set_text`, `move`,
  `resize`, `annotate`).
- Two synthetic examples: `examples/diagnostic-week/` (10-slide diagnostic
  update) and `examples/survey-stage/` (5-slide survey ending at the gap).
- 21 tests covering schemas, build, determinism, QA, inspection/editing, motion,
  planning, and diffing.
- README gallery and architecture assets generated from source.

### Known limitations

- No Morph generation (deck is Morph-ready).
- No native PPTX rasterization unless LibreOffice is installed; gallery
  previews are source-rendered.
- Conservative external-PPTX editing only.
- Benchmark tables are native shapes, not native charts yet.
