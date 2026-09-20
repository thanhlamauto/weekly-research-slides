# TikZ QA and repair loop

Compiling is not evidence that a figure looks good. The TikZ backend therefore
runs a semantic preflight, an optional rendered-image inspection, and an
actionable defect list.

```text
figure_spec
    |
    v
TikZ source -> Beamer compile / standalone compile -> page PNG
    |                                                     |
    v                                                     v
geometric preflight                              rendered-image metrics
    |                                                     |
    +------------------- defect list ----------------------+
                          |
                          v
              edit the semantic spec, recompile, re-review
```

## Commands

```bash
wrs tikz:qa --input figure_spec.yaml --output-dir qa/figure
wrs tikz --input figure_spec.yaml --output figure.tex --standalone out/
```

`tikz:qa` writes `tikz_qa.json` (decision, geometry, rendered metrics,
findings) and `defect-log.md` (human-readable findings plus requested actions).
It exits non-zero on errors.

## Preflight (`src/renderers/tikz/validation.js`)

Errors: missing node id, duplicate node id, unknown edge endpoint, self-loop,
duplicate coordinates.

Warnings: empty or over-long labels, unknown node type/role, unknown annotation
target, disconnected nodes, missing geometry, and the TikZ budget
(`> 12` nodes or `> 15` edges requests `route_to_drawio`).

## Rendered-image checks (`src/renderers/tikz/critique.js`)

Runs on the geometry and, when a render exists, on the page PNG metrics from
`scripts/slide_image_metrics.py`: ink ratio (density), border touch (scale),
grid ratio (cluster).

Semantic checks include:

- competing highlights (`reduce_visual_emphasis`);
- dense node clusters (`split_diagram`);
- uneven column spacing in single-panel pipelines (`align_shared_nodes`);
- labels wider than their shape or too verbose (`reduce_node_text`);
- an edge passing through an unrelated node (`reroute_edge`);
- an unbalanced figure (`align_shared_nodes`);
- a figure narrower than 4cm (`increase_figure_scale`).

Every finding carries a concrete action; the critic never stops at "looks
cluttered".

## Repair

Repairs edit the semantic spec, not the generated `.tex`:

- split an overloaded figure, or move detail into `annotations`;
- reroute an edge by reordering nodes/columns;
- route to Draw.io when the figure is simply too large for TikZ;
- reduce labels rather than shrinking the font.

`examples/diagram-backends/qa/revision-log.md` records a real rendered-inspection
revision cycle: oversized feature circles, a missing angle arc, legend overlap,
a `\\Delta` escaping bug and a Beamer overfull `\vbox`, all fixed at the source
and re-verified from the rendered pages.
