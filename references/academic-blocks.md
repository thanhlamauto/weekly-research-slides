# Academic blocks

Blocks communicate a semantic category — not decoration.

Supported categories: `Observation`, `Hypothesis`, `Claim`, `Limitation`,
`Definition`, `Diagnostic`.

Preferred rendering:

```text
Observation
────────────
Correction barely moves toward Z_d.
```

or a very subtle background fill with a thin left rule. The left rule's colour is
the category accent; the fill is a near-white neutral; there is no shadow and no
thick rounded border.

## Rules

- use blocks sparingly; do not render every idea as a card;
- a block's label is small and quiet (not all-caps);
- the block's text is one short statement, not a paragraph;
- blocks never replace a figure when a figure would explain better.

`src/visual-grammar/draw.js#block` renders a block; the diagnostic archetype uses
it for measurement / observation / interpretation and the three bounds bands.
