# Delta-first weekly behavior

Weekly decks are not independent. When a previous state or deck exists, the deck
is the difference, not the whole story.

## Determine before writing slides

- what the audience already knows;
- what stayed unchanged;
- what changed in the method;
- what new experiments were run;
- what results changed;
- what claims became stronger, weaker, refuted, or new;
- what new uncertainty appeared.

For a mature project, open with "What changed this week?" rather than a problem
definition. Do not repeatedly explain familiar competitors unless they matter to
this week's argument.

## Inputs

The skill accepts a `weekly_delta.yaml` directly, or computes one from two
research states:

```bash
wrs diff --prev research_state_week5.yaml --curr research_state.yaml \
  --question "..." --headline "..." --output weekly_delta.yaml
```

`weekly_delta.yaml` fields:

```yaml
week: 6
from_week: 5
headline: ...
this_week_question: ...
method_delta: { from: v3, to: v4, changes: [...] }
result_delta:
  - { metric: rollout_cosine, previous: 0.51, current: 0.58 }
claim_delta:
  C1: { previous: plausible, current: weakened, note: ... }
new_claims:
  C2: { statement: ..., status: emerging }
new_diagnostics: [D1, D2]
new_limitations: [...]
unchanged: [...]
```

## Using the delta

- `unchanged` justifies compressing background, especially when familiarity is
  high.
- `method_delta` drives the `method-delta` slide.
- `result_delta` feeds the `benchmark-comparison` slide and is cross-checked by
  scientific QA against the numbers on the slide.
- `claim_delta` / `new_claims` drive `claim-delta`.
- `new_diagnostics` drives `diagnostic` slides. Each diagnostic must already
  know which claim it tests.
