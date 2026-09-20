# Voice A/B — Samantha (macOS `say`) vs Gemini Kore

Same script, same delivery plan, same chunk boundaries. Only the voice backend changes.

- Gemini model: `gemini-2.5-flash-preview-tts`, voice `Kore`
- Gemini auth: api-key — GEMINI_API_KEY is set (value never printed)
- Gemini audio generated: yes

Objective measurements only. Subjective listening quality is a human judgement and is not claimed here.
The pitch proxy is an autocorrelation F0 estimate, not a perceptual quality metric.

| segment | scene | words | Samantha | Gemini Kore |
|---|---|---|---|---|
| setup | `lesa_01_why_cache` | 35 | 13.2s | 17.3s |
| aha | `lesa_03_stage_dynamics` | 51 | 18.4s | 25.9s |
| training | `lesa_06_training` | 40 | 14.6s | 21.9s |

## setup — `lesa_01_why_cache`

**Transcript**

> Diffusion runs a large network at every step, so generation is slow. Neighboring steps repeat almost the same computation. Caching keeps those internal features and skips recomputing them. The question is how to skip safely.

**Delivery instructions**

- `establish`; intent=setup; direction: State the cost plainly. This is the problem, not a complaint.
- `trace`
- `reuse`
- `conclude`; pause_before=350ms; emphasis=skip safely; direction: Land the question. Do not sound like a slogan.

**Samantha**

- duration 13.21s, pitch proxy F0 176.5Hz, sd 40.7Hz, p10-p90 122.1-216.2Hz
- file `samantha/lesa_01_why_cache.m4a`

**Gemini Kore**

- duration 17.27s, pitch proxy F0 230.9Hz, sd 87.5Hz, p10-p90 115.9-381.0Hz
- file `gemini-kore/lesa_01_why_cache.m4a`

**Timing effect on animation**

- estimated narration for this scene: 18.1s
- Samantha audio changes the scene hold by -4.9s
- Gemini audio changes the scene hold by -0.9s

**Listening observations**

- objective: see durations and pitch proxy above; re-render with `--timing transcript` to
  see the animation follow the voice.
- subjective (pauses, emphasis, naturalness): human review required; not claimed by this report.

## aha — `lesa_03_stage_dynamics`

**Transcript**

> Watch the same feature over the whole process. Early on, noise is high and change is fast and uneven. In the middle, change becomes small and smooth. Near the end it barely moves: only details are refined. One trajectory, three behaviours. Call them stages. Why should one predictor handle all three?

**Delivery instructions**

- `replay`
- `early`
- `middle`
- `late`
- `split`; intent=define; pause_before=300ms; pause_after=500ms; emphasis=three behaviours; direction: Give the listener a beat to connect the three regimes before naming them.
- `ask`; intent=reveal; pause_before=450ms; pause_after=700ms; direction: A genuine question, not rhetorical. Leave space after it; do not sound dramatic.

**Samantha**

- duration 18.42s, pitch proxy F0 174.7Hz, sd 41.6Hz, p10-p90 115.1-210.5Hz
- file `samantha/lesa_03_stage_dynamics.m4a`

**Gemini Kore**

- duration 25.87s, pitch proxy F0 217.3Hz, sd 79.3Hz, p10-p90 129.0-337.6Hz
- file `gemini-kore/lesa_03_stage_dynamics.m4a`

**Timing effect on animation**

- estimated narration for this scene: 27.3s
- Samantha audio changes the scene hold by -8.9s
- Gemini audio changes the scene hold by -1.4s

**Listening observations**

- objective: see durations and pitch proxy above; re-render with `--timing transcript` to
  see the animation follow the voice.
- subjective (pauses, emphasis, naturalness): human review required; not claimed by this report.

## training — `lesa_06_training`

**Transcript**

> Training has two steps. First it learns from accurate features. At inference, its inputs are partly its own predictions. If it never sees its own mistakes, small errors build up. So training feeds it its own predictions, as at inference.

**Delivery instructions**

- `gt`; intent=define; pause_after=450ms
- `inference`
- `drift`; pause_before=250ms; pause_after=450ms; emphasis=never sees
- `closed_loop`; pause_before=350ms; pause_after=650ms; direction: This is the conclusion of the training idea. Restrained confidence, no flourish.

**Samantha**

- duration 14.57s, pitch proxy F0 177.7Hz, sd 49.1Hz, p10-p90 111.1-216.2Hz
- file `samantha/lesa_06_training.m4a`

**Gemini Kore**

- duration 21.94s, pitch proxy F0 236.1Hz, sd 82.3Hz, p10-p90 135.6-363.6Hz
- file `gemini-kore/lesa_06_training.m4a`

**Timing effect on animation**

- estimated narration for this scene: 21.4s
- Samantha audio changes the scene hold by -6.8s
- Gemini audio changes the scene hold by +0.6s

**Listening observations**

- objective: see durations and pitch proxy above; re-render with `--timing transcript` to
  see the animation follow the voice.
- subjective (pauses, emphasis, naturalness): human review required; not claimed by this report.
