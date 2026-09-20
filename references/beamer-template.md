# Beamer template

The default presentation renderer. `wrs build --input slide_spec.yaml --output
deck.pdf` renders the semantic slide spec into LaTeX and compiles it. PPTX is a
separate, legacy backend selected with `--renderer pptx`.

## Contract

```text
slide_spec.yaml
      |
      v
src/beamer/renderTex.js      semantic macros only (\wrsLead, \wrsband, \wrsStatus, tikz ids)
      |
      v
templates/academic-beamer/   theme.tex + macros.tex own fonts, margins, footer,
      |                      blocks, citations, tikz styles, status colours
      v
preamble.tex + slides.tex
      |
      +--> presentation.tex -> presentation.pdf   (notes included)
      +--> handout.tex      -> handout.pdf        (\documentclass[...,handout])
      |
      v
compile + log QA             latexmk/pdflatex -> overfull boxes, missing files,
      |                      undefined citations/references are hard failures
      v
pdftoppm page renders         slide-01.png ... + contact sheet
```

The generator never emits coordinates or colours. The one exception is
`feature-space`, where `cx`/`cy` positions are semantic (object permanence) and
are scaled into a tikz picture with stable node ids.

## Template versioning

`templates/academic-beamer/version.json` records `{name, version}`. Every build
writes `build_manifest.json` with the template name/version, engine, deck
metadata and slide count. Restyling is a template version bump, not an edit of
generated sources.

## Archetype mapping

| archetype | LaTeX vocabulary |
|---|---|
| `title` | `\wrsTitlePage` in a `[plain]` frame |
| `question` | `\wrsLead` + two `columns` of `itemize` |
| `recap` | established / now columns |
| `problem` | summary + why-hard + constraints columns |
| `method-landscape` | one column per method + `wrsband{gap}` |
| `competitor-mechanism` | A. Intuition / B. Mechanism / C. Where it fails |
| `weakness` | `wrsband{gap}` + evidence + implication |
| `motivation` | old / new / idea columns + why now |
| `method-high-level` | tikz pipeline with `wrstoken`/`wrsstage`/`wrsoperator` |
| `method-delta` | `\wrsMethodTransition{from}{to}{summary}` + changes/unchanged |
| `experiment` | setup / protocol / changed / held-constant columns |
| `benchmark` | booktabs table; current row in accent, deltas in green |
| `claim` | `\wrsClaimId` + `\wrsStatus` + evidence band |
| `claim-delta` | `\wrsClaimTransition{id}{prev}{curr}` rows |
| `diagnostic` | `\wrsDiagId` + measurement/observation/interpretation bands and can/cannot/alternative bands |
| `feature-space` | tikz nodes (`wrsnode`) and vectors (`wrsvector`/`wrsreference`) |
| `interpretation` | observation/interpretation bands + claim column |
| `limitations` | limitations / open questions columns |

Speaker notes become `\note{...}` (presentation mode only). The slide `citation`
field becomes an understated `\wrsCitation` near the frame bottom.

## Compile QA

`src/beamer/build.js` parses the LaTeX log and reports findings:

- compile failure (`! ...`, non-zero exit, missing PDF) — **error**
- `Overfull \hbox/\vbox` ≥ 1pt — **error**; < 1pt — warning
- missing figure / input file — **error**
- undefined citation / reference — **error**

`wrs qa --input deck.pdf --build-dir <dir>` re-runs the same log checks plus
`pdfinfo` page counting; scientific, geometry and continuity QA run on the spec.

## Engines and Unicode

`pdflatex` is preferred. If the deck contains characters outside Latin-1 that
have no LaTeX mapping, the renderer switches to `lualatex` (fontspec with Latin
Modern OpenType); `--engine pdflatex` forces replacement and reports a warning.
Common scientific Unicode (Δ, −, →, ≈, ·, …) is mapped to LaTeX commands first.

## Critique loop

`wrs critique --renderer beamer --deck out.pdf` builds the PDF each cycle,
renders pages with `pdftoppm`, and feeds those pixels to the visual critic. The
critics still revise `slide_spec.yaml`; generated `.tex` is never patched.

## License

The template is an independent implementation. Beamer is GPL-2.0-or-later /
LPPL-1.3c and Metropolis is CC BY-SA 4.0; no code or assets are copied. Beamer
itself comes from the user's TeX distribution and is not vendored.
