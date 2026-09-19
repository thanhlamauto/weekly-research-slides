# Choosing a figure topology

Do not force every method into a left-to-right pipeline. Choose the topology
from the scientific meaning.

| figure type | use when | topology |
|---|---|---|
| `method-overview` | one method, end to end | inputs → mechanism → outputs |
| `architecture` | model structure matters | branches, merge, ×N repeats |
| `mechanism-zoom` | one component is the contribution | inset detail of one block |
| `training-vs-inference` | two regimes differ | two aligned rows, shared backbone |
| `temporal-process` | state evolves over time | timeline with states |
| `iterative-process` | a loop repeats | cycle with a stopping condition |
| `method-comparison` | competitor vs ours | stacked normalized pipelines |
| `method-delta` | our vN vs vN+1 | one pipeline, changed parts highlighted |
| `diagnostic` | a claim is tested | measurement → observation → interpretation |
| `data-pipeline` | data flow matters | staged data path |
| `graphical-abstract` | teaser for a paper | one dominant visual idea |
| `multi-panel-overview` | dense method | labelled panels (a)(b)(c) |

## Rules

- One intellectual message per figure.
- Prefer question/claim panel labels over category labels.
- Normalize comparisons: same canvas, sizing, typography, arrows, colours.
- Emphasize the minimal structural difference in comparison/delta figures.
- Keep unchanged components in place and mute them in delta figures.
- If a static diagram is enough, do not force a video or an elaborate layout.
