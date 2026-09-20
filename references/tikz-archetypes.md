# TikZ archetypes

`src/renderers/tikz/layout.js` implements a compact set of deterministic
layouts. `figure.diagram` overrides the inferred archetype; otherwise it is
derived from `figure.type`, `figure.mode` and the graph topology.

## feature-space / diagnostic-geometry

First-class case: points, vectors, reference directions, an angle arc and
measurement labels. Node positions are semantic (`geometry.x/y` in diagram
units, scaled to `rendering.width_cm`), not pixels.

```yaml
figure: { type: diagnostic, diagram: feature-space, angle_at: zs, rendering: { width_cm: 7.5 } }
nodes:
  - { id: zs, semantic_id: concept.zs, type: feature, label: "$Z_s$", role: shared, geometry: { x: 0, y: 0 } }
  - { id: zd, semantic_id: concept.zd, type: feature, label: "$Z_d$", role: auxiliary, geometry: { x: 0.9, y: 2.2 } }
  - { id: ztilde, semantic_id: concept.ztilde, type: feature, label: "$\\tilde{Z}$", role: ours, geometry: { x: 4.6, y: 0 } }
edges:
  - { from: zs, to: ztilde, role: computation, label: "$\\Delta Z$", emphasis: true }
  - { from: zs, to: zd, role: reference, label: "$Z_d - Z_s$" }
annotations:
  - { target: zs, role: measurement, text: "cos 0.117" }
```

The angle arc is drawn at `angle_at` (or at the node with two outgoing edges)
and the `measurement` annotation becomes its label.

## competitor-vs-ours

`type: method-comparison`, two panels. Shared `semantic_id`s are aligned to the
same column in both panels; shared nodes stay muted, competitor-only amber,
ours-only blue. The difference is the only emphasized object.

## method-delta

`type: method-delta`, panels `previous` / `current`. Shared `semantic_id`s keep
their layer across panels and stay muted; `added` is green, `removed` red
dashed, `changed` purple. Use it to answer "what changed", not to show two
unrelated architectures.

## linear-flow and branch-flow

Inferred from topology when no panel/type applies: a chain becomes a single row;
a node with several outgoing edges spreads children across rows.

## stage-split and timeline

`type: temporal-process` (or `iterative-process` without `animate`): panels
become background stage bands with labels, nodes sit inside the stage.

## process-loop

Cycles and back edges are drawn as curved feedback arrows below the pipeline.
`type: training-vs-inference` and `type: iterative-process` route here.

## equation-mechanism

`figure.equation` renders display math above the diagram. Term-level color
linking is deliberately not implemented in v0.1 (documented as a limitation):
over-coloring equations hurts readability.

## Choosing an archetype

Explicit is better than implicit when the topology is ambiguous:

```yaml
figure:
  type: diagnostic
  diagram: feature-space
```
