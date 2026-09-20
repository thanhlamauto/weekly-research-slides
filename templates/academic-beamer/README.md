# academic-beamer template

The default presentation renderer. The generator emits only semantic
content (`\wrsband{measurement}{...}`, `\wrsStatus{weakened}`, tikz nodes with
semantic ids); this directory owns the visual language: fonts, margins,
footer, block styling, citation styling and the tikz vocabulary.

```
preamble.tex   documentclass metadata + \input{theme} + \input{macros}
slides.tex     one \begin{frame} per slide (semantic macros only)
presentation.tex  wrapper that compiles slides.tex
handout.tex       same, with \documentclass[handout]{beamer}
```

`version.json` records the template name and version. A deck built from this
template records `template: {name: academic-beamer, version: 1}` in its build
manifest, so a restyle is a version bump, not an edit of generated sources.

## Provenance and license

The template is an independent implementation. Design principles (restrained
palette, typography-led hierarchy, hairline rules, whitespace) were studied
from LaTeX Beamer (GPL-2.0-or-later / LPPL-1.3c) and the Metropolis theme
(CC BY-SA 4.0). No Beamer or Metropolis code, fonts or assets are copied; the
palette is the project's own, shared with the PowerPoint renderer. Beamer
itself is a dependency of the user's TeX distribution, not vendored here.
