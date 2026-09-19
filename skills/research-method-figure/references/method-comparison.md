# Method comparison and method delta

## Normalized comparison

```bash
python scripts/compare_methods.py --left competitor.yaml --right ours.yaml \
  --style topconf-clean --output comparison.drawio
```

Both methods are drawn with one style profile and one layout, stacked as two
rows (competitor on top, ours below). A shared `semantic_id` (for example
`component.backbone`) is drawn once per row in the `shared` colour; components
unique to one method get the `competitor` or `ours` colour. A legend states the
mapping. The result is a comparison where the only visible difference is the
real structural difference.

Bad: the competitor's original figure next to a custom diagram.
Good: same canvas, module sizing, typography, arrow grammar, semantic colours
and input/output convention.

The generated `comparison_spec.yaml` is saved next to the figure and records
`shared_components` and `differences.{competitor_only,ours_only}`.

## Method delta

```bash
python scripts/method_delta.py --prev v3.yaml --curr v4.yaml \
  --style topconf-clean --output delta.drawio
```

Unchanged components keep their position and are muted (`shared`); added or
changed components use `added`; removed components use `removed`. This plugs
directly into weekly reporting: the same `weekly_delta.yaml` reasoning that
drives the slides can drive a delta figure.

## Rules

- One shared style profile for both methods.
- Keep shared components at the same coordinates where possible.
- Emphasize the minimal difference; do not redesign the whole figure.
- Never hide a weaker result or a removed component.
