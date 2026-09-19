# Pacing from the script

Pacing is not solved by multiplying every animation duration by a constant. It
comes from the narration structure.

## Speech rate (guidance, not constants)

| audience | target wpm |
|---|---|
| expert | ~160 |
| adjacent-researcher | ~135–145 |
| general-technical | ~120–135 |

## Beat model

Each narration beat is:

```text
concept introduction
  -> visual change
  -> stable final state
  -> comprehension dwell
```

Additional dwell is added after the first introduction of a new abstraction,
after equations, after comparison conclusions, and after aha moments
(`kind: introduction | equation | comparison | aha | conclusion`). `normal`
beats get a short pause only.

## Silent mode

The script determines:
- per-beat dwell (`timing.beat_dwell`) after key reveals;
- the scene's final hold (`timing.tail`), filling the gap between the animation
  and the narration, capped so a silent render never sits on a dead frame too
  long.

Scenes read these through `src/timing.py` when rendered with
`render_scene.py --timing transcript`. Without that flag, scenes use their
authored defaults and render exactly as before.

In silent mode the script paces the *presenter*, so a scene may be shorter than
its narration; the QA reports that as `info`, not a warning.

## TTS / recorded mode

The audio is the clock. Compare each scene's rendered duration to its narration
duration; the QA warns when animation runs substantially before or after the
narration. Word-level cues trigger animations when timings are available.
