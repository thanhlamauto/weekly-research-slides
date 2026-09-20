# Gallery

The demo deck is built from
[`examples/diagnostic-week/slide_spec.yaml`](../examples/diagnostic-week/slide_spec.yaml).
The default deliverable is the Beamer PDF
[`output/demo-weekly-research-slides.pdf`](../examples/diagnostic-week/output/demo-weekly-research-slides.pdf)
(with `output/demo-weekly-research-slides-handout.pdf`). The legacy editable
PPTX is [`output/demo-weekly-research-slides.pptx`](../examples/diagnostic-week/output/demo-weekly-research-slides.pptx),
with the animated variant `output/demo-weekly-research-slides-animated.pptx`.

## How the artifacts were produced

```bash
npm run demo
```

which builds and writes, under `examples/diagnostic-week/output/`:

- `demo-weekly-research-slides.pdf` — compiled Beamer presentation (default)
- `demo-weekly-research-slides-handout.pdf` — `handout` class option
- `beamer-build/` — generated LaTeX sources + `build_manifest.json`
- `beamer-pages/slide-NN.png` + `contact-sheet.png` — `pdftoppm` renders of the
  compiled PDF
- `beamer_qa.json` — template version, engine, page counts, compile findings
- `demo-weekly-research-slides.pptx` — legacy native, editable deck
- `demo-weekly-research-slides-animated.pptx` — legacy deck with OOXML motion
- `preview/slide-NN.svg` and `.png` — PPTX source previews
- `preview/contact-sheet.png`
- `qa_report.json`

The Beamer page renders come from the real compiled PDF. The PPTX previews are
rendered from the same scene the PPTX uses (via `src/renderer/svgRenderer.js`
and `rsvg-convert`); they are **source previews, not rasterizations of the
PPTX**. To rasterize the actual PPTX, install LibreOffice and run:

```bash
wrs render --input examples/diagnostic-week/output/demo-weekly-research-slides.pptx --output rendered/
```

The README gallery assets under `docs/images/` are regenerated with:

```bash
npm run assets
```

which copies the Beamer contact sheet and diagnostic page from the demo output
and rebuilds the banner, architecture diagram and PPTX source previews.

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
