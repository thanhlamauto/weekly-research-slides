# Review checklist

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
