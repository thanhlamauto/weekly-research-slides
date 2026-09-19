# Style extraction and transfer

## Source roles (mandatory)

Classify every input in `source_inventory.yaml`:

- **CONTENT_SOURCE** — scientific content (method section, notes).
- **STRUCTURE_SOURCE** — what the reference contains (for reconstruction).
- **STYLE_SOURCE** — appearance only.
- **LAYOUT_SOURCE** — a sketch of the arrangement.
- **ASSET_SOURCE** — icons or images to embed.

A STYLE_SOURCE must never silently transfer labels, architecture, claims, data
or logos. It must declare `redistributable: true/false`.

## Extraction

```bash
python scripts/extract_style.py --reference reference.svg --name paper-style
```

- `.svg` / `.drawio` — parsed: palette, stroke widths, corner radius, dash
  conventions, font family and sizes. Confidence **high**.
- `.png` / `.jpg` — quantized palette, background and density. Fonts and exact
  geometry **cannot** be recovered; confidence **low** and marked unknown.

The extracted profile records per-field confidence (`confidence` map). Do not
claim exact values you cannot infer. The heuristic role mapping (which colour is
"ours" vs "competitor") is a suggestion; review and adjust.

## Style transfer

```text
reference -> style_profile.yaml
our method -> figure_spec.yaml
figure_spec + style_profile -> editable figure (our content, reference grammar)
```

The output should visibly share palette, typography hierarchy, module geometry,
edge grammar and spacing, while the science stays ours. See
`examples/figure-style-transfer/`.

## Reconstruction (separate mode)

```text
reference -> visible-element inventory -> semantic + geometry reconstruction
          -> editable .drawio -> render -> visual comparison -> repair
```

Prefer native editable objects; use bounded raster assets only for genuinely
complex elements. Report editability boundaries honestly; never rasterize all
text and arrows unless explicitly asked.
