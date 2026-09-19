# Gallery

The demo deck is built from
[`examples/diagnostic-week/slide_spec.yaml`](../examples/diagnostic-week/slide_spec.yaml).
The committed PPTX is
[`output/demo-weekly-research-slides.pptx`](../examples/diagnostic-week/output/demo-weekly-research-slides.pptx)
and the animated variant is `output/demo-weekly-research-slides-animated.pptx`.

## How the previews were produced

```bash
npm run demo
```

which builds the deck and writes, under `examples/diagnostic-week/output/`:

- `demo-weekly-research-slides.pptx` — the native, editable deck
- `demo-weekly-research-slides-animated.pptx` — with native OOXML motion
- `preview/slide-NN.svg` and `.png` — source previews
- `preview/contact-sheet.png`
- `qa_report.json`

The previews are rendered from the same scene the PPTX uses (via
`src/renderer/svgRenderer.js` and `rsvg-convert`). They are **source previews,
not rasterizations of the PPTX**. To rasterize the actual deck, install
LibreOffice and run:

```bash
wrs render --input examples/diagnostic-week/output/demo-weekly-research-slides.pptx --output rendered/
```

The README gallery assets under `docs/images/` are regenerated with:

```bash
npm run assets
```

## What the demo shows

- this week's question on the title slide;
- a 20-30 second recap;
- a method delta (v3 -> v4);
- a two-slide geometry sequence with **identical object positions** (object
  permanence);
- a diagnostic that separates measurement, observation, and interpretation;
- a benchmark with competitor, our previous version, and our current version,
  including the weak metric;
- a claim delta (C1 weakened, new C2 emerging);
- a second diagnostic with an alternative explanation;
- limitations and open questions, with no thank-you slide.
