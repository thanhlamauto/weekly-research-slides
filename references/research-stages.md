# Research stages

The stage selects which slide modules are usually relevant. It never rigidly
determines the deck; the evidence for this week decides.

| stage | usual modules | avoid |
|---|---|---|
| `survey` | problem, method-landscape, competitor-method, benchmark-comparison, weakness-gap | invented "our method", pending results |
| `hypothesis-formation` | problem, prior-work, weakness-gap, motivation, claim, open-question | benchmark tables without a method |
| `method-development` | recap, weakness-gap, motivation, method-high-level, experiment-setup, results, open-question | re-explaining familiar competitors |
| `diagnostic` | question, recap, method-delta, method-high-level, diagnostic, benchmark-comparison, claim-delta, limitation, open-question | starting from problem definition |
| `refinement` | recap, method-delta, results, diagnostic, claim-delta, limitation | new-method fanfare |
| `mature-comparison` | question, recap, method-delta, benchmark-comparison, claim-delta, diagnostic, limitation, open-question | long background |

`wrs plan --state state.yaml --stage diagnostic` emits a storyboard for the
selected stage. The agent or user then edits it into a `slide_spec.yaml`.

## Choosing the stage

- No method yet, comparing papers: `survey`.
- Idea forming from a gap: `hypothesis-formation`.
- Building and debugging a method: `method-development`.
- Testing specific claims with targeted experiments: `diagnostic`.
- Improving a working method: `refinement`.
- Head-to-head against competitors: `mature-comparison`.
