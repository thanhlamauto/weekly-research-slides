# Repair log — comparison figure

The comparison figure went through real build → preflight → repair cycles. The
scientific content never changed; only layout/QA code did.

## Cycle 1 — first preflight

The first generated comparison (two side-by-side panels) reported:

```text
[error] outside_canvas R_output_1: node extends outside the canvas
[error] node_overlap L_decoder~R_input_1 ... (4 overlaps)
[warning] edge_through_node L_decoder->output_1 ... (3)
[warning] annotation_overlap L_ann_observation: annotation overlaps node 'L_input_1'
[error] outside_canvas R_ann_observation
8 error(s), 4 warning(s)
```

Root causes and repairs (in `src/layout.py` and `src/compare.py`):

1. Two 7-stage pipelines cannot sit side by side in a paper-width canvas.
   **Repair:** stack the two panels vertically (`row: 0`, `row: 1`), the common
   paper-comparison layout.
2. The legend was drawn over the bottom panel.
   **Repair:** reserve legend height before placing panels.
3. The "above" annotation was centred on its target and overlapped the stacked
   input column.
   **Repair:** annotation placement is now panel-aware (it clears the topmost
   node of the panel) and is clamped to the canvas margin.

Result: `0 errors, 0 warnings`.

## Cycle 2 — method-delta and style-transfer figures

- The delta figure placed a removed component in a stacked column, which tripped
  the row-spacing heuristic.
  **Repair:** the spacing check is skipped for column layouts (`layout_mode`).
- The LESA figure warned about long labels that actually wrap.
  **Repair:** the width check now tests the longest unbreakable word, not the
  whole string.
- Raster/SVG style extraction initially mapped the accent teal to `shared`
  instead of `ours`.
  **Repair:** widened the hue window for the `ours` role and chose `shared` from
  mid-tone low-saturation colours only.

Result: every committed figure is at `0 errors, 0 warnings`.

## Verification

```bash
python skills/research-method-figure/scripts/qa_figure.py \
  --spec examples/figure-comparison/output/comparison_spec.yaml \
  --output-dir examples/figure-comparison/qa
```

The current findings are in `qa_report.json` and `defect-log.md`.
