# Figure spec and Figure IR

`figure_spec.yaml` is renderer-neutral. It holds scientific meaning and layout
intent; it never holds pixels.

```yaml
figure:
  id: bar_overview
  type: method-overview        # see figure-storytelling.md
  mode: ours                   # competitor | ours | comparison | delta | diagnostic
  title: Budget-Aware Retrieval
  style: topconf-clean         # style profile name or path
  width: 1320                  # optional canvas override (px)
  height: 560
panels:
  - { id: mechanism, label: Mechanism, role: mechanism }
nodes:
  - id: router
    semantic_id: component.router     # stable scientific identity
    type: learned-module
    label: Learned router
    panel: mechanism
    role: ours                        # shared | competitor | ours | auxiliary | ...
    column: 3                         # layout hint
    order: 0
edges:
  - { from: index, to: router, role: computation }
annotations:
  - { target: router, role: key_change, text: predicts difficulty, placement: above }
legend:
  - { role: shared, label: unchanged }
shared_concepts: [component.backbone, component.index]
```

## Node types

`input, output, feature, feature-sequence, module, learned-module,
frozen-module, cache, operator, loss, data, backbone, head, expert, predictor,
tensor, group, text, image, timestep, vector`.

## Layout

- `geometry: {x,y,w,h}` — explicit absolute geometry (highest priority).
- `column` — stack nodes vertically within a column (used for pipelines).
- `row` / `order` — placement hints inside a panel.
- No hints: nodes wrap into rows inside the panel.

When a figure has a single panel, the layout engine hugs the panel around the
content and recenters it, so a short pipeline is not buried in whitespace.

## Figure IR

`src/ir.py` builds one IR from spec + resolved style + layout. It is consumed by
`drawio.py`, `svg.py`, `qa.py` and the Node PowerPoint bridge, so all outputs
share geometry and semantic ids. IR node fields: `id, semantic_id, type, label,
role, shape, x, y, w, h, color, fill, text{size,weight,color,family}`.

## From a method model

`spec.from_method_model()` synthesizes a `method-overview` from
`mechanism.inputs/operations/outputs` and `components`. Inputs become a left
column, components the middle pipeline (using `components` when present, else
`operations`), outputs the right column. This is a best-effort scaffold: refine
the figure spec when the wiring is not a simple chain.
