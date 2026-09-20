# Academic slide style

This document describes the **legacy PowerPoint backend** style system. The
default renderer is now a real LaTeX Beamer template; see
[`beamer-template.md`](beamer-template.md). Both share the same design rules
below, so the two outputs read as one system.

The principle:

```
academic ≠ dense
```

The goal is a serious research talk, with the restraint of LaTeX Beamer.
PowerPoint remains an editable backend; the design grammar borrows from Beamer
and the Metropolis theme.

## Design references (principles only)

- **Beamer** (GPL/LPPL) — frame title, footline, section pages, semantic blocks,
  readable-presentation guidelines.
- **Metropolis** (CC BY-SA 4.0) — whitespace, restrained colour, small type
  hierarchy, minimal noise, optional thin progress bar.

No code or assets are reused from either; only principles, with an independently
chosen palette and metrics.

## Rules

- typography-led hierarchy; colour is functional, not decorative;
- at most two primary accents; near-black text on a very light background;
- left-aligned frame titles, one line, action/question preferred;
- minimal footer (project · week on the left, page number on the right);
- a subtle title rule (academic-beamer) or none (academic-metropolis);
- no gradients, no shadows, no decorative icons, no ornamental shapes;
- semantic blocks used sparingly (see `academic-blocks.md`);
- if a figure carries the argument, it gets 60–85% of the usable area.

## Style selection

The style is chosen per build (PPTX backend):

```bash
node src/cli.js build --input slide_spec.yaml --output out.pptx --renderer pptx --style academic-beamer
```

Available: `academic-beamer` (default), `academic-metropolis`, `paper-figure`,
`dark-explainer`. Profiles live in `src/renderer/styles.js`.

## Avoid (AI-presentation patterns)

repeated 3-card layouts; icon+heading+paragraph cards; chip/badge clutter; hero
gradient sections; decorative arrows; emoji; "insight" badges; excessive rounded
corners; eyebrow label on every slide; title + subtitle + eyebrow stacks.
