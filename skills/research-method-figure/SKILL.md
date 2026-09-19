---
name: research-method-figure
description: Turn a research method into a publication-quality, editable scientific figure with draw.io as the canonical source. Use when the user asks to draw a method figure, a paper figure, an architecture or mechanism diagram, a competitor-vs-ours comparison in one visual language, a method-delta figure for a weekly update, or to extract the visual style of a reference figure and redraw different content in that style. Outputs editable .drawio plus SVG/PDF/PNG and native PowerPoint. Not for arbitrary illustration, logos, or copying a copyrighted figure.
license: MIT
metadata:
  version: "0.1.0"
---

# research-method-figure

A sub-capability of **weekly-research-slides**. It turns a method semantic model
into a publication-quality figure, and it can learn a visual style from a
reference and apply it to different content.

```text
METHOD MODEL  (shared with slides and video)
     |
 figure_spec.yaml  +  style_profile.yaml
     |
 editable figure.drawio  ->  figure.svg / .pdf / .png  ->  figure.pptx
```

## Architecture (do not duplicate science)

- **Scientific truth** lives in the method model (`method_model.yaml`) and the
  figure spec's `semantic_id`s.
- **Layout** lives in `figure_spec.yaml` (explicit `geometry`, or `column`/`row`
  hints the layout engine resolves).
- **Appearance** lives in a reusable `style_profile.yaml`, referenced by name.
- The same method must not be reinterpreted per renderer. The Draw.io, SVG and
  PowerPoint outputs all consume one Figure IR.

## Canonical format

`.drawio` is the canonical editable artifact (not TikZ). It is portable, has
explicit geometry, exports cleanly to SVG/PDF/PNG, and is easy to refine by hand.
TikZ is an optional future backend.

## Workflow

1. **Understand the method.** Read the paper/notes and write or reuse
   `method_model.yaml` (the same model used by the slide and video pipelines).
2. **Classify sources** in `source_inventory.yaml`: CONTENT_SOURCE,
   STRUCTURE_SOURCE, STYLE_SOURCE, LAYOUT_SOURCE, ASSET_SOURCE. A STYLE_SOURCE
   controls appearance only and must never inject labels, architecture, claims,
   data or logos.
3. **Choose or extract a style.** Use a preset in `styles/`, or extract one from
   a reference (`extract_style.py`), then review the profile and its confidence.
4. **Build the figure.** From a `figure_spec.yaml`, or synthesize one from the
   method model (`build_figure.py --method`).
5. **Preflight and repair.** Run `qa_figure.py`, read the contact preview, fix
   the source or the layout, rebuild. At least one repair cycle is expected.
6. **Export.** `.drawio` + `.svg` + `.pdf` + `.png`, and optionally native PPTX.

## Commands

```bash
python skills/research-method-figure/scripts/figure_doctor.py
python skills/research-method-figure/scripts/build_figure.py \
    --method method_model.yaml --style topconf-clean --output figure.drawio
python skills/research-method-figure/scripts/compare_methods.py \
    --left competitor.yaml --right ours.yaml --style topconf-clean --output comparison.drawio
python skills/research-method-figure/scripts/method_delta.py \
    --prev v3.yaml --curr v4.yaml --style topconf-clean --output delta.drawio
python skills/research-method-figure/scripts/extract_style.py \
    --reference reference.svg --name paper-style
python skills/research-method-figure/scripts/qa_figure.py \
    --spec figure_spec.yaml --style topconf-clean --output-dir qa
```

## Style transfer vs reconstruction

- **Style transfer**: reference is a STYLE_SOURCE; our content, reference's
  visual grammar. Pipeline: `reference -> style_profile.yaml`, then
  `our method -> figure_spec + style_profile -> figure`.
- **Reconstruction**: reference is a STRUCTURE_SOURCE; rebuild its visible
  elements as native editable objects, render, compare, repair. Report
  editability boundaries honestly; never rasterize all text/arrows.

## Read next

- `references/figure-spec.md` — the figure spec and Figure IR.
- `references/figure-visual-grammar.md` — shared shape/colour/edge grammar.
- `references/figure-storytelling.md` — choosing topology per figure type.
- `references/style-extraction.md` — extraction, confidence, source roles.
- `references/method-comparison.md` — normalized comparison and method delta.
- `references/figure-qa.md` — preflight, visual QA, repair loop.
- `../../references/layout-contracts.md` — shared SAFE_TEXT_BOX, clearances, zones.

## Requirements

Python 3.11+ with `PyYAML`, `jsonschema`, `Pillow`. `rsvg-convert` for SVG→PNG/PDF
(optional but recommended). Node + `pptxgenjs` for the PowerPoint bridge.
