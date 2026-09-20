# TikZ visual grammar

Generated TikZ uses the same semantic vocabulary as the Beamer deck, the
Draw.io figure backend and the Manim video. Roles and styles live in
`templates/academic-beamer/tikz.tex`; the generator never emits hex colors.

## Semantic roles -> colors

| role | colorlet | meaning |
|---|---|---|
| `shared` | `methodShared` | unchanged, present in every method |
| `baseline` | `methodBaseline` | neutral reference |
| `competitor` | `methodCompetitor` | competitor-only |
| `ours` | `methodOurs` | our method |
| `auxiliary` | `methodAuxiliary` | supporting object |
| `changed` | `methodChanged` | changed this week |
| `added` | `methodAdded` | new this week |
| `removed` | `methodRemoved` | removed this week |
| `warning` | `methodWarning` | caution |
| `muted` | `methodMuted` | de-emphasised |

Each role also has a soft fill (`methodOursFill`, ...). Nodes are emitted as
`\node[methodLearned, draw=methodOurs, fill=methodOursFill] (semantic-name) ...`,
so a restyle is a palette change in one file.

## Node types -> shapes

| type | style | shape |
|---|---|---|
| `feature`, `vector`, `tensor`, `timestep` | `methodFeature` | circle |
| `input`, `data` | `methodInput` | rounded rect |
| `output` | `methodOutput` | rounded rect |
| `module`, `group` | `methodModule` | rounded rect |
| `learned-module`, `backbone`, `head`, `expert`, `predictor` | `methodLearned` | rounded rect (accent) |
| `frozen-module` | `methodFrozen` | dashed rounded rect |
| `cache` | `methodCache` | double rounded rect |
| `operator` | `methodOperator` | filled circle |
| `loss` | `methodLoss` | ellipse |

Details of feature nodes are typeset below the node, not inside it, so circles
stay compact.

## Edge roles -> arrows

| role | style | meaning |
|---|---|---|
| `computation` | `methodComputation` | solid arrow |
| `data` | `methodData` | thin arrow |
| `reuse` | `methodReuse` | dashed arrow |
| `reference` | `methodReference` | dashed line, no head |
| `feedback`, `gradient` | `methodFeedback` | curved arrow |
| `loss` | `methodLossEdge` | dashed accent arrow |

`emphasis: true` on an edge in a feature-space figure upgrades it to the thick
`methodVector` style (the correction direction).

## Typography

Labels are native LaTeX. Math is written as math (`$Z_s$`, `$\Delta Z$`,
`$\tilde{Z}$`); text is escaped. There are no images of labels and no manual
font-size commands in generated sources; sizes come from the theme hierarchy.

## Overlays

`figure.rendering.overlays: [zs, zd, ztilde]` wraps objects in `\wrsReveal{n}`,
which is `\uncover<n->` inside Beamer and a plain include in standalone/paper
mode. Do not combine overlays with an explicit figure width: `\resizebox` breaks
Beamer overlays (the preflight warns).
