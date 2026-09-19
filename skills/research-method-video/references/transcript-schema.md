# Transcript schema and artifacts

The transcript is first-class: the script is authored before animation, and
timing is derived from it.

```text
method model -> storyboard -> narration script + visual beats
             -> timed transcript -> Manim -> video
```

## Artifacts (`<project>/transcript/`)

| file | role |
|---|---|
| `transcript.yaml` | authored structured source (the words) |
| `narration.md` | human-readable canonical script (generated) |
| `transcript.json` | machine-readable, with timings (generated) |
| `transcript.srt` / `transcript.vtt` | sidecar subtitles (generated) |
| `word_times.json` | word-level timings when available (estimated or aligned) |
| `speaker_notes.yaml` | narration reused as deck speaker notes |
| `audio/` | optional TTS/recorded audio (git-ignored) |

`transcript.yaml` is the source of truth for *what is said*. `transcript.json`
adds `start`/`end`/`duration_seconds`, per-beat `dwell_seconds` and word lists;
it is regenerated, never hand-edited.

## Structure

```yaml
video: { id: lesa-method-explainer, method: lesa }
audience: { level: adjacent-researcher, target_wpm: 145 }
mode: silent
scenes:
  - id: lesa_03_stage_dynamics      # stable, matches scene_spec
    title: Feature dynamics are stage-dependent
    purpose: ...
    takeaway: ...
    narration:
      - beat_id: split               # stable, links to a scene_spec beat
        kind: introduction           # normal|introduction|equation|comparison|aha|conclusion
        visual_cue: split            # scene_spec beat id
        text: One trajectory, three behaviours. Call them stages.
```

Stable scene and beat ids are what let the narration drive the animation and the
subtitles. `visual_cue` must match a beat id in `scene_spec.yaml`.

## Modes

- **silent** (default): no audio; the script sets per-beat dwell and scene holds.
- **tts**: a local backend synthesizes audio; timings are estimated from the
  audio duration unless the backend returns word boundaries.
- **recorded**: a recorded reading is aligned to the canonical text; the text is
  never replaced by ASR output.
