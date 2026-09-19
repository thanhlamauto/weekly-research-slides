# Motion language

Motion follows scientific explanation beats, not decoration:

```text
click 1 -> hypothesis
click 2 -> diagnostic evidence
click 3 -> interpretation
```

Do not animate every object independently.

## Rules

- One group = one presenter click = one explanation beat.
- 1-2 clicks per normal slide; more only for step-by-step diagnostics.
- Objects inside a group appear together (`with previous`).
- Chromium/background/header/footer/logo/decoration objects are never animated.
- Do not animate chrome or body text word by word.

## Motion spec

Motion is optional and named, not positional, so it survives rebuilds. Groups
reference semantic object names; the injector expands a name to its labelled
children automatically (e.g. `concept-zs` also animates `concept-zs__label`).

```yaml
defaults: { transition: fade, effect: fade, duration: 0.4 }
slides:
  - id: s6
    groups:
      - { trigger: on-click, objects: [diag-D1-measurement] }
      - { trigger: on-click, objects: [diag-D1-observation] }
      - { trigger: on-click, objects: [diag-D1-interpretation] }
```

Effects: `appear`, `fade`, `wipe`, `fly`, `zoom`.
Transitions: `cut`, `fade`, `push`, `wipe`, `split`, `cover`, `dissolve`,
`circle`, `diamond`, `plus`, `wedge`.

## Canonical artifact

The static editable `.pptx` is canonical. The animated deck is written to
`<name>-animated.pptx`. If animation risks corrupting a deck, ship the static
one and leave motion out.

The animation XML is standard OOXML `<p:transition>` and `<p:timing>` nodes and
opens in PowerPoint, Keynote, and WPS. Compatibility-first effects are used.
