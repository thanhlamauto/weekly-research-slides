# Academic layouts

A compact set of strong archetypes, sharing title position, margins, typography,
caption behaviour, footer and accent semantics. Variation comes from scientific
content, not decoration.

| archetype | composition |
|---|---|
| question | question as frame title + minimal visual |
| figure + statement | large figure + one-line observation |
| method diagram | pipeline dominates; labels are labels, not paragraphs |
| two-column comparison | normalized competitor / ours at the same scale |
| equation + visual | equation as the visual + a small conceptual diagram |
| result plot + observation | action title + large plot + one highlighted observation |
| diagnostic | question + measurement + observation (subtle blocks) |
| method delta | unchanged muted, changed dominant |
| limitation / open question | sparse, 3–4 questions max |
| sparse claim | one claim, one supporting visual, minimal text |

## Figure-first rule

> If a figure carries the argument, give it the slide.

For method diagrams, plots, diagnostics, architecture and feature geometry, the
figure occupies about 60–85% of the usable area. Do not shrink a useful figure
to fit explanatory paragraphs; move the prose to the title, a short annotation,
or the speaker notes.

## Density

`academic ≠ document`. Visible content stays minimal; the content critic and the
deletion pass remain active. The `beamer_overexplained` warning fires when a
figure slide also carries a wall of prose.
