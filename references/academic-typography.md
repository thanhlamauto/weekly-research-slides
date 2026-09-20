# Academic typography

Typography carries the hierarchy; there are few sizes and little bold.

| role | size (pt) | weight | alignment |
|---|---|---|---|
| frame title | 22 | 600 | left |
| body | 13.5 | 400 | left |
| small label | 11 | 400/600 | left |
| caption / citation | 9.5 | 400 | left/right |
| equation | 18 | 400 | centred |

- frame titles are one line, concise, action/question style;
- no giant hero text on normal slides (a title slide may be larger);
- body text is short; never paragraphs on a figure slide;
- equations are visual objects, prominent when central, not buried in prose;
- captions and citations are understated and small.

The profile sets `fontFace` (`Calibri` for academic-beamer, `Helvetica Neue` for
academic-metropolis) and a mono face for measurements. Fonts are configurable via
`FONT` in the style profile.
