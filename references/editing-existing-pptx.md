# Editing an existing PPTX

Two cases.

## Case A — source-backed deck (preferred)

The deck was built by this skill from a `slide_spec.yaml`. Edit the structured
source and rebuild:

```bash
wrs build --input slide_spec.yaml --output deck.pptx
```

Do not patch the generated PPTX when the source exists.

## Case B — external PPTX without source

Inspect first:

```bash
wrs inspect --input deck.pptx
wrs inspect --input deck.pptx --json
```

Inspection extracts, per slide: slide number; shape name (stable identifier if
present); shape type and preset geometry; text; `x/y/w/h` in inches; nested
group children. It reports the media list and slide size.

Conservative, source-preserving edits:

```bash
wrs edit --input deck.pptx --ops ops.yaml --output edited.pptx
```

Supported ops (`ops.yaml`):

```yaml
ops:
  - { op: set_text, target: claim-C1, text: "..." }
  - { op: move,     target: concept-zs, dx: 0.2, dy: -0.1 }
  - { op: resize,   target: concept-zs, w: 1.2, h: 1.2 }
  - { op: annotate, slide: 5, text: "note", x: 1, y: 6.4, w: 4, h: 0.4, size: 11 }
```

Only the targeted shape XML is modified. Unrelated content, themes, and media
are preserved. `set_text` replaces the first text run of the target shape and
clears the rest.

## Honest limitations

- Editing is conservative, not arbitrary. Complex text-run styling, SmartArt,
  charts, embedded objects, and freeform path editing are not supported.
- `set_text` operates on the first text run of a shape; rich multi-run
  formatting may be simplified.
- Object names in external decks may be generic (`TextBox 3`). Preview with
  `wrs inspect` before targeting.
