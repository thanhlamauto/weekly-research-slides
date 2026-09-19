# Editorial critique loop

PPTX generation is not the problem. The problem is that agent-generated slides
are often verbose, repetitive, visually dense, and individually acceptable but
weak as a deck. The critique loop fixes the **source** and rebuilds; it never
patches the generated PPTX.

```text
draft -> content critic -> revision -> build
      -> visual critic  -> revision -> build
      -> deck critic    -> revision -> build + verify
```

Bounded to three cycles. It stops when there are no hard failures, no unresolved
high-severity issues, or a cycle changes nothing.

## Three critics

- **Content Critic** (`src/critics/content.js`) — scientific correctness,
  claim/evidence consistency, concision, redundancy, necessity, clarity, and
  whether text belongs on the slide or in the speaker notes. It prefers
  deleting/demoting over adding.
- **Visual Critic** (`src/critics/visual.js`) — inspects the **rendered slide
  image** (pixel metrics) plus a few geometry signals. It cannot pass a slide on
  PPT geometry alone.
- **Deck Critic** (`src/critics/deck.js`) — narrative progression, duplicated
  explanation, repeated layouts, density rhythm, merge/delete candidates, and
  whether the story reads from titles.

## Mandatory deletion pass

Cycle 1 runs in **deletion-only** mode: it may only DELETE, MERGE, SHORTEN, or
MOVE TO SPEAKER NOTES. It may not add slide content or retitle.

## Content budgets (soft, with warnings)

| item | budget |
|---|---|
| title | ≤ 12 words |
| visible text | ≤ 30 words |
| text clusters | ≤ 3 |
| dominant takeaway | 1 |

Exempt: equations, axis labels, table values, citations, necessary scientific
labels. Over-budget is a warning; only narration-like prose or far-over-budget
slides are auto-demoted.

## Compression preserves meaning

- keep the first clause, move the remainder to speaker notes (never truncate
  mid-thought);
- required fields (diagnostic `question`/`measurement`/`observation`/
  `interpretation`, claim statements, recap points) are **shortened, never
  removed**;
- lists are never emptied;
- `MEASUREMENT ≠ OBSERVATION ≠ INTERPRETATION ≠ CLAIM ≠ HYPOTHESIS` is preserved;
- `cosine = 0.1168` is never rewritten as "orthogonal" unless the source says so.

## Slide vs speaker notes

Visible content carries the question/claim, essential labels, evidence and a
short takeaway. Explanatory prose goes to `notes`. The content critic raises
`spoken_explanation_on_slide` when visible copy reads like narration.

## Role-specific QA

Critics read the archetype before criticizing: `claim` = one claim + one visual;
`diagnostic` = question + measurement + observation; `method-delta` = unchanged
muted, changed dominant; `recap` = severe compression.

## AI-slide-smell warnings

Repeated 3-card layouts, centred body paragraphs, excessive rounded cards,
decorative colour, competing focal points, title/body redundancy, small diagrams
with long prose. Warnings, not bans.

## Review artifacts (`qa/`)

`content_review.json`, `visual_review.json`, `deck_review.json`,
`editorial_metrics.json`, `revision_log.md`. Each issue has slide, critic,
severity, reason, recommended action, and whether it was applied.

## Commands

```bash
npm run critique:demo
node src/cli.js critique --input slide_spec.yaml --output revised.yaml \
  --deck out.pptx --qa-dir qa [--max-cycles 3] [--no-render]
```
