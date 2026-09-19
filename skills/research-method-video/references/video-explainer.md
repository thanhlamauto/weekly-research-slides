# Method explainer pipeline

```text
paper / notes
     -> scientific understanding (read by the agent)
     -> method_model.yaml            semantic model (shared with slides)
     -> storyboard.md                argument plan, no code
     -> scene_spec.yaml              actors, beats, start/end state, keyframes
     -> src/scenes/*.py              Manim implementation
     -> MP4                          draft / final
     -> frames + contact sheet       visual QA
     -> keyframes.yaml + PNG         PowerPoint bridge
```

The slide pipeline and the video pipeline should share `method_model.yaml`, so
the same method is never explained two different ways.

## method_model.yaml

Fields (all optional except `method.name`): `problem`, `baseline`,
`key_observation`, `assumption_of_previous_methods`,
`failure_of_previous_methods`, `motivation`, `mechanism.{inputs,operations,
outputs}`, `components[]`, `equations[]`, `training[]`, `inference[]`,
`claims[]`, `assumptions[]`, `limitations[]`, `relation_to_our_work`,
`notation`. It accommodates competitor methods and your own methods.

## scene_spec.yaml

```yaml
video:
  title: ...
  method: lesa
  mode: competitor
  method_model: method_model.yaml
  target_duration_seconds: 115
  canvas: light
scenes:
  - id: lesa_03_stage_dynamics
    title: Feature dynamics are stage-dependent
    manim_class: LESA03StageDynamics
    purpose: The aha moment ...
    question: Why does one fixed predictor struggle?
    method_refs: [key_observation]
    actors:
      - { id: feature_point, type: feature, label: "h_{t}", persistent: true }
    start_state: ...
    beats:
      - { id: early, pattern: TRAJECTORY, action: "...", duration_seconds: 3 }
    end_state: ...
    transition_to: lesa_04_stage_experts
    keyframe: { fraction: 0.94, purpose: "three-stage segmentation" }
```

Actor `type` is one of `feature, module, learned, cache, operator, timeline,
panel, dot, vector, stage, text, expert`. Beat `pattern` is one of the animation
vocabulary. `manim_class` names the Scene class registered in `src/main.py`.

## Render modes

`--quality draft` uses Manim `-ql` (480p15); `--quality final` uses `-qh`
(1080p60). Render one scene while iterating:

```bash
python scripts/render_scene.py --project examples/lesa --scene lesa_05_expert_internals --quality draft
```

Render and concatenate everything:

```bash
python scripts/render_scene.py --project examples/lesa --quality final \
  --concat examples/lesa/renders/final/lesa-method-explainer.mp4
```

## PowerPoint bridge

`export_keyframes.py` writes `qa/keyframes/<scene>.png` and `qa/keyframes.yaml`:

```yaml
video: examples/lesa/renders/final/lesa-method-explainer.mp4
keyframes:
  - { scene: lesa_05_expert_internals, timestamp: 45.2,
      purpose: "predictor mechanism and equation", png: qa/keyframes/....png }
```

A slide agent can use the final state of a scene as a method-summary slide, or
insert the MP4 directly. Arbitrary Manim animation is **not** converted to native
PowerPoint animation in v0.1.

## Error handling

Scripts print short, actionable errors: missing Manim, missing ffmpeg, invalid
scene spec, duplicate actor ids, unknown scene, failed render. They never dump a
raw traceback for a user-fixable problem.
