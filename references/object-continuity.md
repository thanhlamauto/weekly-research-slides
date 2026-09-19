# Object permanence

Object permanence is a first-class requirement, not a nice-to-have.

If a scientific object appears across slides, its location, visual identity,
label, and semantic id stay stable unless movement itself communicates meaning.

Example objects: `Z_s`, `Z_d`, `Z~`, `deltaZ`.

## Semantic object ids

Every rendered primitive gets a stable `id` that becomes the PowerPoint object
name (`cNvPr/@name`). Conventions:

```text
concept-zs        latent / feature objects
concept-zd
concept-ztilde
concept-delta
vec-delta         geometric displacement vectors
stage-0           method pipeline stages
claimdelta-C1     claim cards
diag-D1-measurement
bench-row-2
```

To reuse an object across slides, give it the same `object_id` (feature-space)
or the same layout id. `wrs qa` includes a continuity check that fails when a
`concept-*` object changes geometry between consecutive slides, and warns for
other objects.

## Morph-ready, not fake Morph

Stable semantic names make the deck **Morph-ready**. Reliable automatic
PowerPoint Morph generation is not implemented in v0.1 and is not faked.
Transition Morph support is on the roadmap.
