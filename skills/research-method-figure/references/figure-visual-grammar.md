# Figure visual grammar

The figure shares the shape and colour language of the slides and the video, so
one method looks like one project everywhere.

## Shapes

| meaning | node type | shape |
|---|---|---|
| input / output | `input`, `output` | rounded rectangle |
| feature / latent | `feature`, `feature-sequence` | rounded rectangle (use `ellipse` if it is a vector) |
| module | `module` | rectangle |
| learned module | `learned-module` | rounded rectangle |
| frozen module | `frozen-module` | rectangle, muted |
| cache / memory | `cache` | stacked shape |
| correction / fusion | `operator` | ellipse |
| tensor | `tensor` | rectangle |

## Colour roles (`semantics`)

`shared` gray, `competitor` amber, `ours` blue, `auxiliary` green, `neutral`
dark, `changed` purple, `added` green, `removed` red. Colour is functional:
same meaning, same colour, across competitor, ours, comparison and delta
figures. Every style profile must define at least `shared, competitor, ours,
auxiliary, neutral`.

## Edges

`computation` solid, `reuse` dashed, `reference` dotted, `feedback` dashed,
`loss` solid, `data` solid, `gradient` dashed. Arrowheads are `classic`, `block`
or `open`. The same edge role keeps the same style in every figure.

## Paper-figure quality rules

- vector output; readable at final column width;
- minimal text, exact terminology;
- functional colour only; no decorative gradients or 3D;
- no giant internal title in a paper figure (panel labels instead);
- panel labels for multi-panel figures;
- colourblind-safe palette; keep a grayscale preset for print;
- consistent repeated-module sizing and spacing.

Do not mimic a specific conference brand.
