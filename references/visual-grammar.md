# Visual grammar

One shared visual language across the deck. Semantic appearance must stay
consistent.

## Objects

| meaning | shape |
|---|---|
| representation / latent / feature | circle (ellipse) |
| model / module | rectangle |
| learned module | rounded rectangle |
| cache / memory | stack of offset rounded rectangles |
| token / patch | small rectangle |
| correction / fusion operator | filled ellipse with `+` |

## Arrows

| meaning | style |
|---|---|
| computation | solid arrow |
| reuse / cache | dashed arrow |
| reference relationship | thin arrow, no head |
| geometric displacement | thick colored arrow (vector) |
| causal / highlight | thicker accent arrow |

## Color

Color encodes semantics, not decoration:

- blue: our method / current / interpretation
- amber: learned modules, gaps
- red: displacement vectors, weakened/refuted claims, cannot-conclude
- green: can-conclude, strengthened
- gray: prior work, unchanged, chrome

## Avoid

- decorative gradients without meaning;
- excessive icons and random illustration styles;
- dense paragraphs;
- five or more equal cards on every slide;
- tiny architecture diagrams;
- screenshots of whole papers;
- generic AI-generated decoration.

Use progressive disclosure: introduce the objects first, then add the vectors
that act on them.
