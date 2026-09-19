# Manim visual grammar

The video reuses the palette and shape language of the PowerPoint side so a deck
and a clip built from the same method model look like one project. The canvas is
light neutral (matching the decks); accents carry meaning.

## Objects (`src/actors.py`)

| meaning | actor |
|---|---|
| representation / latent / feature | circle node (`feature_node`) |
| model / module | rectangle (`module`) |
| learned module | rounded rectangle (`module(learned=True)`) |
| cache / memory | stacked rounded rectangles (`cache_stack`) |
| correction / fusion operator | filled circle (`operator`) |
| timestep | tick on a horizontal timeline (`timeline`) |
| grouping workspace | rounded container (`panel`) |

## Arrows

| meaning | actor |
|---|---|
| computation | solid arrow (`arrow`) |
| reuse / reference | dashed arrow (`dashed_arrow`) |
| geometric displacement | thick colored arrow (`vector`) |
| skipped computation | `skip_mark` |

## Color (`src/theme.py`)

Same semantic roles as the deck: `feature` ink, `model` blue, `learned` amber,
`cache` muted, `stage_high` amber, `stage_mid` blue, `stage_low` green,
`prediction` blue, `drift` red, `ground_truth` green, `predicted` amber.

## Animation patterns (`src/patterns.py`)

`ESTABLISH, TRACE, BUILD, MORPH, FOCUS, COMPARE, TRAJECTORY, STAGE-SPLIT,
ACCUMULATION, CORRECTION, REPLAY, REVEAL, ZOOM, RECAP`. Every pattern maps to a
scientific meaning; never animate decoratively.

## Object permanence

Give every scientific object a stable `actor_id` and reuse it across scenes. The
same actor keeps its shape, color and label. Move or transform it; do not
recreate it. `lint_scenes.py` warns if a persistent actor changes type across
scenes.

## Typography

Pango `Text` with sub/superscripts composed from pieces (`actors.mathlabel`,
syntax `h_{t-1}`, `x^{2}`) because Manim's `<sub>` renders too small and Unicode
subscripts are missing in many fonts. LaTeX is optional and unused by default.

## Avoid

Decorative gradients, icon soup, drop-in paper figures, tiny unreadable labels,
and unrelated motion. Use whitespace and hierarchy.
