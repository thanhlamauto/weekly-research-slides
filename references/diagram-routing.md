# Diagram backend routing

One semantic figure spec, several renderers. Routing is explicit and recorded;
`auto` only applies documented heuristics.

```yaml
figure:
  id: preimage_geometry
  type: diagnostic
  rendering:
    backend: auto      # auto | tikz | drawio | python | manim | external
```

## Decision tree

```text
What scientific visual is needed?
        |
        v
Would motion materially help?
        |-- yes --> Manim
        v no
Is this a quantitative data plot?
        |-- yes --> Python / PGFPlots (existing data pipeline)
        v no
Is it a simple conceptual / math-heavy diagram?
        |-- yes --> TikZ
        v no
Is it a complex architecture or a style reconstruction?
        |-- yes --> Draw.io
        v
choose explicitly (external)
```

## Heuristics used by `auto`

TikZ is selected when:

- the figure type is conceptual (`method-overview`, `mechanism-zoom`,
  `training-vs-inference`, `method-comparison`, `method-delta`, `diagnostic`,
  `data-pipeline`);
- nodes <= 12 and edges <= 15;
- labels are math-heavy (native LaTeX is a feature, not a cost);
- the diagram integrates directly with Beamer.

Draw.io is selected when:

- the figure type is an architecture-scale view (`architecture`,
  `multi-panel-overview`, `graphical-abstract`);
- `mode: reconstruction` or a `style_source` is present;
- nodes > 12 or edges > 15;
- nested groups / multi-panel system views make freeform editing useful.

Python is selected when `figure.plot` is present (the existing data pipeline
owns plots). Manim is selected only when `rendering.animate: true`; a static
temporal diagram stays TikZ.

These are heuristics, not hard limits. The decision is always inspectable:

```bash
wrs route --input figure_spec.yaml
wrs route --input figure.ir.json --json
```

```yaml
renderer_decision:
  selected: tikz
  reason:
    - 3 semantic objects
    - 3 edges
    - simple acyclic flow
    - math-heavy labels (3)
    - figure type 'diagnostic' is conceptual
    - direct integration with Beamer
```

Every Beamer build writes the same decisions into
`output/beamer-build/build_manifest.json` and `output/renderer_report.json`.

## Complementary, not competing

| backend | owns | artifact |
|---|---|---|
| TikZ | conceptual and math-heavy diagrams | native `.tex` inside Beamer |
| Draw.io | large, editable, reconstructed architecture | `.drawio` -> PDF/SVG -> `\includegraphics` |
| Python / PGFPlots | quantitative plots | existing plot pipeline |
| Manim | animated explanations | MP4 + keyframes |

Draw.io is not replaced. The Figure IR produced by
`skills/research-method-figure/` can also be rendered by TikZ
(`wrs tikz --input figure.ir.json`): semantic ids, roles and labels are
preserved and the geometry is recomputed by the TikZ layout.
