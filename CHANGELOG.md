# Changelog

All notable changes to this project are documented here. The format is loosely
based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
