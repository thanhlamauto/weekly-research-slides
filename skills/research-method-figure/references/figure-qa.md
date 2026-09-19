# Figure QA

Rendering and validating XML is not quality. Run the pre-flight, then look at a
preview, then repair.

## Geometric pre-flight (`qa.py`)

Computable before any render:

- text overflow and near-overflow (estimated from font size and box);
- unbreakable words wider than their box (wrapping is fine, long words are not);
- nodes outside the canvas or inside the safe margin;
- node overlap;
- arrows passing through unrelated nodes;
- annotations overlapping nodes or leaving the canvas;
- legend overlapping nodes;
- inconsistent repeated-module sizes;
- spacing variance within a simple row;
- font below `MIN_FONT_SIZE`;
- palette scatter; oversized titles; placeholders.

Findings are graded `error` / `warning`. Warnings are advisory; errors block.

## Visual QA loop

```text
build -> render PNG -> inspect -> defect inventory -> repair source -> render again
```

```bash
python scripts/qa_figure.py --spec figure_spec.yaml --style topconf-clean --output-dir qa
```

Writes `qa_report.json`, `defect-log.md` and `preview.png`. At least one repair
cycle is expected for a demo figure; high-fidelity reconstruction may need more.

## Shared layout contracts

The checks use the same contracts as the slide and video QA
(`references/layout-contracts.md`): `SAFE_TEXT_BOX`, `LABEL_CLEARANCE`,
`EDGE_CLEARANCE`, `CONTENT_SAFE_ZONE`, `MIN_FONT_SIZE`, `TITLE_ZONE`,
`ANNOTATION_ZONE`. Implementation: `src/layout_contracts.py`.

## Typography

`figure_doctor.py` resolves the requested font against what is installed and
reports substitutions. Do not mix visually incompatible faces by accident.
