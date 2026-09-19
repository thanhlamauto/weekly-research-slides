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
        v
   scene (renderer-agnostic geometry, typed primitives with semantic ids)
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

## The scene

Layouts do not talk to PowerPoint. They produce a **scene**: a list of
primitives (`text`, `rect`, `roundRect`, `ellipse`, `line`) with coordinates in
inches and a stable `id`. Both renderers consume the same scene, so geometry QA,
previews, and the PPTX can never disagree about layout.

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

## Extension points

- Add an archetype: add a layout function and register it in
  `src/layouts/index.js`, then add it to the `slide_spec` schema enum.
- Add a visual object kind: extend `NODE_STYLE` / `ARROW_STYLE` in
  `src/visual-grammar/draw.js`.
- Add a QA rule: push findings from a new function in `src/qa/`.
