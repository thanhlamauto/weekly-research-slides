# Shared layout contracts

One vocabulary for layout hygiene across slides, figures and video clips, so a
fix in one carrier benefits the others.

| contract | meaning | figure implementation |
|---|---|---|
| `SAFE_TEXT_BOX` | padding, line height and average glyph width used to estimate text fit | `skills/research-method-figure/src/layout_contracts.py` |
| `LABEL_CLEARANCE` | minimum distance a label keeps from other geometry | same |
| `EDGE_CLEARANCE` | minimum distance an edge keeps from unrelated nodes | same |
| `CONTENT_SAFE_ZONE` | margin kept clear around the canvas | same |
| `MIN_FONT_SIZE` | smallest readable font for a paper figure | same |
| `TITLE_ZONE` | height and maximum size of an internal title | same |
| `ANNOTATION_ZONE` | clearance and maximum size of annotations | same |

## Where they are applied

- **Figures** — `qa.py` preflight (text fit, overlap, edge-through-node,
  annotation/legend clearance, min font, title size).
- **Video** — `research-method-video/scripts/qa_video.py` (content touching the
  frame border, empty frames, long static periods) and `src/pacing.py`
  (audience-aware dwell and beat structure).
- **Slides** — the PPTX geometry/continuity QA in `src/qa/`.

## Why

The LESA video review surfaced labels overlapping arrows, annotations crossing
objects, question text competing with titles, and equations sitting too close to
panel edges. These are all computable from geometry. Encoding the limits once
lets the figure preflight catch the same class of defect before a render, and
gives the video QA a shared vocabulary to grow into.
