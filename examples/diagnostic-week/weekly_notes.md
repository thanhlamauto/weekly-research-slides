# Weekly notes — Week 6

> Synthetic example. The project, numbers, claims, and diagnostics below are
> fictional and are included only to demonstrate the skill. Do not read them as
> a real research result.

## What I did this week

- Shipped method **v4**. Two changes on top of **v3**:
  1. a **correction objective** that directly penalizes deviation from the
     future feature, and
  2. an **oracle diagnostic** that lets us measure feature recovery and output
     recovery separately.
- I also **scaled down the correction magnitude**. Long rollouts were drifting
  when the correction was large.
- Ran two diagnostics, D1 and D2.

## Numbers

| run | rollout cosine | downstream acc. | feature recovery R^2 |
|---|---|---|---|
| cache reuse only | 0.42 | 0.74 | 0.28 |
| ours v3 (last week) | 0.51 | 0.83 | 0.30 |
| ours v4 (this week) | 0.58 | 0.91 | 0.34 |

Both downstream metrics improved over v3. But feature recovery is still low.

## D1 — does the correction point at the future feature?

- measurement: `cos(deltaZ, Z_d - Z_s) = 0.1168`
- observation: the correction direction is nearly orthogonal to the direction
  toward the future feature.
- interpretation: output recovery may not require moving toward the exact future
  hidden state.

This is awkward for claim C1 (that the correction approximates the future
feature). I think C1 should be weakened, not deleted — the metric may just not
see the kind of movement that matters.

## D2 — does output recovery require feature recovery?

- measurement: linear probe R^2 for recovering `Z_d` from the corrected feature
  is 0.34, while downstream accuracy is 0.91.
- observation: downstream accuracy is high while feature recovery is low.
- interpretation: an alternative downstream-valid pre-image may be sufficient.

This suggests a new claim C2.

## Open questions

- Can we characterize the set of downstream-valid pre-images without the oracle?
- Does the correction generalize beyond the training horizon?
- Is the linear probe a fair measurement of feature recovery?
