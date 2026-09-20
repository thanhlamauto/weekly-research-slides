# TikZ revision log

Rendered-inspection revisions. Every entry was found by compiling the figure,
rendering it with `pdftoppm` and looking at the pixels, not by reading the
source. The final artifacts are the PDFs under `output/` and `qa/*/tikz_qa.json`.

## preimage_geometry (feature-space)

Found on the first render:

- feature circles grew to roughly 3cm because the detail text was typeset
  inside the node;
- the angle arc was missing: `angle_at` sat outside `figure:` and the desired
  direction is a reference edge, so the origin node was never detected and the
  `cos 0.117` measurement was not consumed;
- the legend overlapped the `Z_s` node;
- `correction $\\Delta Z$` in a YAML plain scalar reached LaTeX as `\\Delta`
  (line break + `Delta`).

Fixed in the source:

- details render below feature nodes (`src/renderers/tikz/primitives.js`);
- `angle_at` lives under `figure:` and the arc uses all outgoing edges, with
  arc radius 0.75cm and label radius 1.08cm (`src/renderers/tikz/layout.js`);
- legend clearance from node extents and solid swatches;
- YAML quoting fixed; layout width 9.0 -> 7.5cm and `Z_d` y 2.5 -> 2.2 so the
  slide fits the frame (overfull `\vbox` 16.9pt -> clean).

## cached_vs_corrected (competitor-vs-ours) and v3_v4 (method-delta)

Found on the first Beamer build:

- the two panels were 24cm wide, forcing a 0.58 downscale in the slide and an
  overfull `\vbox` on the feature frame;
- legend swatches were outlines, not filled, so the role colour was unclear.

Fixed:

- column pitch 2.9 -> 2.4cm, node text width 2.0 -> 1.7cm, panel margin
  2.3 -> 1.7cm (`src/renderers/tikz/layout.js`,
  `templates/academic-beamer/tikz.tex`);
- solid legend swatches;
- slides use `width: 0.97`; `uneven-spacing` now only applies to single-panel
  layouts (multi-panel columns are intentionally offset).

## Overlays

`\wrsReveal` tested `\beamer@version`, which is not defined by beamer 3.78, so
figures rendered complete instead of step by step. Replaced with
`\@ifundefined{insertframenumber}` in `templates/academic-beamer/tikz.tex`.
The presentation PDF now has 10 pages (three overlay steps for the feature
frame); the handout collapses the same frame to one page (8 total).

## Result

`wrs tikz:qa` for the three figures: 0 errors. Rendered metrics: ink ratio
0.027-0.047, no border touch, 12-18 quantized colours. The mixed deck compiles
with 0 errors and 0 warnings. See `qa/*/tikz_qa.json` and
`qa/*/defect-log.md`; the deck report is `output/renderer_report.json`.
