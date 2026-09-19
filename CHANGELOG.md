# Changelog

All notable changes to this project are documented here. The format is loosely
based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
