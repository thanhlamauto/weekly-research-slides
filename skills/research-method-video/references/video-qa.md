# Video QA

Rendering successfully is not success. Always extract frames and look at them.

## Loop

```text
MP4 -> extract frames -> contact sheet -> inspect -> revise source -> rerender
```

```bash
python scripts/qa_video.py --input renders/draft/lesa-method-explainer.mp4 \
  --output qa --count 21 --title "LESA draft"
```

`qa_video.py` extracts evenly spaced frames, builds `qa/contact-sheet.png`, and
writes `qa/qa_report.json`. It flags:

- long static periods (near-identical consecutive frames),
- near-empty frames (a scene failed to lay out),
- content touching the frame border (clipping risk).

These are cheap heuristics, not a scientific judgement. Open the contact sheet
and check the actual explanation.

A "long static period" warning is **expected** for a silent, script-paced render:
scenes hold their final state while the presenter speaks. Transcript QA reports
the resulting animation-vs-narration gap as `info` in silent mode, and as a
warning only when audio drives the clock (tts/recorded).

## Animation lint

```bash
python scripts/lint_scenes.py --project examples/lesa
```

Source-level checks (warn, never rewrite):

- fade-heavy source (many `FadeOut` with few transforms),
- long `Wait(>2s)`,
- persistent actors changing type across scenes,
- scenes whose beats are all `ESTABLISH` (movement may add nothing),
- missing start/end state,
- placeholder text,
- a registered `manim_class` that is not defined in source.

Exit code is non-zero only for errors (broken spec, missing class, placeholder).

## Render modes

Draft renders are cheap and are the iteration loop. Final renders are for the
deliverable. Render one scene at a time while fixing layout.

## Manual checklist

- [ ] Can a viewer who never read the paper explain why the method exists?
- [ ] Does each scene carry one idea, with a question/claim title?
- [ ] Are the same scientific objects reused, not recreated?
- [ ] Is the mechanism shown, not just named?
- [ ] Is the equation built incrementally?
- [ ] No label runs off the frame or overlaps another.
- [ ] Does the video end on the mechanism, not a leaderboard?
