# Review checklist

## Content standard (required)

> When present or explain anything, Our presentation must follow a very coherent structure that answer sequentially these question: Why we need to do this/The motivation? What are we going to do after having the requirement? Then explain what we do. You must explain very clear on what we are going to do, then present equation or proposition, theorem when we need clear formal formula to avoid vague, excessive wording. Then present experiment to support our claim if we had. The presentation must be very clear, concise, precise and connected as a complete, convincing story flow throughout the whole paper and each section, each subsection should have their own complete, convincing flow that become a perfectly fit part in the whole complete story flow of the paper. Every formula must be written in clear and easiest way to understand, all notation must be explained clearly before use. The presentation quality must be high, oral-standard, human-like with zero AI slop paragraph that throw to reader a bunch of words without truly saying anything meaningful. The complex mathematical theorem we introduce must be state clearly the message it is trying to deliver, no vague terms or jargon.

Run scientific/story QA before visual QA. `wrs qa --input deck.pptx --spec
slide_spec.yaml` runs the automated subset; use this list for judgment.

## Scientific / story

- [ ] Is observation separated from interpretation?
- [ ] Is every claim supported by the available evidence?
- [ ] Is any causal language stronger than the experiment permits?
- [ ] Are competitor methods represented accurately?
- [ ] Does each diagnostic actually test the stated claim?
- [ ] Are missing results represented as missing instead of invented?
- [ ] Does this week's deck reflect the correct previous method/claim state?
- [ ] Is redundant background compressed when mentor familiarity is high?
- [ ] Does the deck end at limitations / open questions?

## Visual

- [ ] text overflow
- [ ] object overlap
- [ ] objects outside slide bounds
- [ ] minimum margins respected
- [ ] text not below 9pt
- [ ] no excessive text density
- [ ] semantic object styles consistent
- [ ] not the same generic layout repeated
- [ ] arrows/connectors connected to what they reference
- [ ] no placeholder text (TODO / lorem / xxx)
- [ ] title hierarchy is clear
- [ ] no dead whitespace that damages composition

## Render loop

If LibreOffice is available:

```bash
wrs render --input deck.pptx --output rendered/
```

Otherwise render previews from source and inspect them:

```bash
wrs render --input slide_spec.yaml --output preview/
```

Never declare an example deck complete without at least one
build -> QA -> fix/rebuild cycle.
