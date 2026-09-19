# Contributing

Thanks for helping. This project is a local, deterministic Agent Skill; keep it
that way.

## Setup

```bash
npm install
npm run doctor
npm test
npm run demo
```

## Ground rules

- Source-first: fix `slide_spec.yaml` and rebuild; do not patch generated PPTX
  files by hand.
- Do not add a frontend framework, hosted backend, or heavy runtime dependency.
  Dependencies are pinned and small.
- Never invent experimental results, and never strengthen a claim beyond its
  evidence.
- Keep scientific concepts separate: measurement, observation, interpretation,
  claim, hypothesis.
- Do not copy third-party assets or large code blocks. Concepts may be
  reimplemented under a compatible license, with attribution.

## Adding an archetype

1. Add a layout function in `src/layouts/` and register it in
   `src/layouts/index.js`.
2. Add the archetype to the `archetype` enum in
   `schemas/slide_spec.schema.json`.
3. Document its content fields in `references/slide-archetypes.md`.
4. Add a test that builds it and passes geometry QA.

## Adding a QA rule

Add the rule to the relevant module in `src/qa/`, emit findings with a `level`
of `error`/`warning`/`info`, and add a positive and negative test.

## Pull requests

- Keep PRs focused; one concern per PR.
- Run `npm test` and `npm run demo` before opening.
- Update `CHANGELOG.md` for user-visible changes.
