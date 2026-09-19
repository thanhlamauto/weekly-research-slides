# Changelog

All notable changes to this project are documented here. The format is loosely
based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
