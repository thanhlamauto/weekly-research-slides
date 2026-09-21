# Slide archetypes

Each `slides[]` entry in `slide_spec.yaml` has an `archetype` and a `content`
object. These are the supported archetypes and their content fields.

## title
`project`, `headline`, `question`, `byline`

## question
`question`, `why_now: []`, `success_criteria: []`

## recap
`established: [{label, detail}]`, `established_title`, `now`, `now_title`,
`prior_week`

## problem
`summary`, `why_hard: []`, `constraints: []`

## method-landscape
`methods: [{tag, name, mechanism, role}]`, `gap`

## competitor-mechanism
`intuition`, `mechanism` (string), `module_label`, `failure: []`,
`relation_to_us`

## weakness
`gap`, `evidence: []`, `implication`

## motivation
`idea`, `contrast: {old, old_label, new, new_label}`, `why_now`

## method-high-level
`stages: [{label, role, detail}]` where `role` is one of
`input|model|learned|cache|output|operator`, `note`

Stages are chained left to right and the row auto-scales to the frame width.
Keep `label` short; put the explanation in `detail`.

## method-delta
`from`, `to`, `summary`, `changes: [{change, why}]`, `unchanged: []`

## experiment
`setup`, `protocol: []`, `changed: []`, `controlled: []`

## benchmark
`metrics: [{key, name, unit, higher_is_better}]`,
`methods: [{name, role, role_label, values, delta}]` with `role` in
`competitor|previous|current`, `caption`

`role` controls emphasis only. `previous`/`current` default to the weekly
labels "last week"/"this week"; set `role_label` (for example `ours`) when the
deck is not a weekly delta. `role: reference` marks a yardstick row (for example
the unaccelerated model): it is muted and can never be crowned best.

By default the renderer bolds and greens the **best value per metric**, honouring
`higher_is_better` (default `true`). Give methods a `group` (for example an
interval `N=5`) to compute the best value inside each group, so a table that
covers several intervals highlights one winner per interval instead of one
overall winner. Metric names usually carry the direction glyph, for example
`CLIP ↑` and `s/ảnh ↓`.

## claim
`id`, `statement`, `status`, `evidence: []`

## claim-delta
`claims: [{id, previous, current, statement, note}]`, `note`

## diagnostic
`id`, `question`, `claim_ids: []`, `measurement`, `observation`,
`interpretation`, `can_conclude`, `cannot_conclude`,
`alternative_explanation`

## feature-space
`nodes: [{object_id, label, kind, role | cx/cy, size, sublabel}]`,
`vectors: [{id, from, to, semantic, label, color, dash}]`, `note`,
`legend_items`, `legend`

`role` is one of `top|center|bottom_left|bottom_right|left|right`, or give an
explicit `cx`/`cy` center in inches. Use the same object ids and positions on
consecutive slides to preserve object permanence.

## interpretation
`observation`, `interpretation`, `claim: {id, status, statement}`

## limitations
`limitations: []`, `open_questions: []`

## Shared fields

Every archetype accepts `content.equations: []`, a list of **raw LaTeX math**
lines rendered one per line by the template (`\wrsMath`). This is the one
authored exception to ASCII-only content: write the formula itself, not ASCII
art. Do not include text-mode markup or a stray closing brace. Equations are
appended after the archetype body, before the citation.

A module may produce zero, one, or multiple slides.
