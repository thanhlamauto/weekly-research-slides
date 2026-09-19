# Claims, diagnostics, and epistemic separation

## Never collapse these concepts

```text
MEASUREMENT != OBSERVATION != INTERPRETATION != CLAIM != HYPOTHESIS
```

Example:

```text
Measurement:    cos(deltaZ, Zd - Zs) = 0.1168
Observation:    the correction direction is nearly orthogonal to the direction
                toward the future feature.
Interpretation: output recovery may not require movement toward the exact future
                hidden state.
Claim:          the correction can exploit an alternative downstream-valid
                representation.
```

- Measurement is a number or a recorded quantity.
- Observation is a descriptive statement about what was measured.
- Interpretation is what the observation might mean.
- A claim is a testable scientific statement.
- A hypothesis is a claim proposed before the evidence.

Scientific QA fails a diagnostic that is missing measurement, observation, or
interpretation, or whose observation and interpretation are identical. It warns
when an observation contains causal language ("because", "causes", "proves").

## Claim states

`new`, `emerging`, `plausible`, `unchanged`, `strengthened`, `weakened`,
`refuted`. For weekly deltas the previous state may also be `absent`.

A weakened or refuted claim is a result, not a failure. Show it plainly.

## Diagnostics link to claims

Each diagnostic must state:

- which claim it tests (`claim_ids`);
- what alternative explanation it targets;
- what was measured;
- what was observed;
- what can and cannot be concluded.

A diagnostic without a target claim is not a diagnostic; it is a screenshot.

## Versioned claims

Claims are versioned research objects. A `claim-delta` slide shows previous
status -> current status for each claim that changed, plus any new claim.
