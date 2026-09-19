'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');
const Ajv = require('ajv');

const ROOT = path.join(__dirname, '..');
const SUB = path.join(ROOT, 'skills', 'research-method-video');
const LESA = path.join(ROOT, 'examples', 'lesa');
const TDIR = path.join(LESA, 'transcript');
const PY = path.join(ROOT, '.venv-manim', 'bin', 'python');
const HAS_PY = fs.existsSync(PY);

const loadYaml = (p) => yaml.load(fs.readFileSync(p, 'utf8'));
const read = (p) => fs.readFileSync(p, 'utf8');
const loadJson = (p) => JSON.parse(read(p));

function py(args, opts = {}) {
  const r = spawnSync(PY, args, { cwd: ROOT, encoding: 'utf8',
    env: { ...process.env, PKG_CONFIG_PATH: '/opt/homebrew/lib/pkgconfig:' + (process.env.PKG_CONFIG_PATH || '') }, ...opts });
  return r;
}

const validator = () => new Ajv({ allErrors: true, strict: false })
  .compile(JSON.parse(read(path.join(SUB, 'schemas', 'transcript.schema.json'))));

test('transcript artifacts exist', () => {
  for (const f of ['transcript.yaml', 'narration.md', 'transcript.json', 'transcript.srt',
    'transcript.vtt', 'word_times.json', 'speaker_notes.yaml']) {
    assert.ok(fs.existsSync(path.join(TDIR, f)), `missing transcript/${f}`);
  }
});

test('authored source and generated transcript validate against the schema', () => {
  const validate = validator();
  const src = loadYaml(path.join(TDIR, 'transcript.yaml'));
  assert.ok(validate(src), JSON.stringify(validate.errors));
  const gen = loadJson(path.join(TDIR, 'transcript.json'));
  assert.ok(validate(gen), JSON.stringify(validate.errors));
  assert.equal(gen.audience.level, 'adjacent-researcher');
});

test('scene and beat ids are unique and link to visual beats', () => {
  const t = loadJson(path.join(TDIR, 'transcript.json'));
  const spec = loadYaml(path.join(LESA, 'scene_spec.yaml'));
  const specScenes = new Map(spec.scenes.map((s) => [s.id, new Set(s.beats.map((b) => b.id))]));
  const scenes = new Set();
  for (const scene of t.scenes) {
    assert.ok(!scenes.has(scene.id), `duplicate scene ${scene.id}`);
    scenes.add(scene.id);
    assert.ok(specScenes.has(scene.id), `transcript scene ${scene.id} not in scene_spec`);
    const beats = new Set();
    for (const b of scene.narration) {
      assert.ok(!beats.has(b.beat_id), `duplicate beat ${scene.id}/${b.beat_id}`);
      beats.add(b.beat_id);
      assert.ok(specScenes.get(scene.id).has(b.visual_cue),
        `${scene.id}/${b.beat_id} visual_cue '${b.visual_cue}' not a scene_spec beat`);
    }
  }
});

test('timings are deterministic and internally consistent', { skip: !HAS_PY }, () => {
  const script = `
import json, sys
sys.path.insert(0, "${path.join(SUB, 'src').replace(/\\/g, '/')}")
import transcript as T
data = T.load("${path.join(TDIR, 'transcript.yaml').replace(/\\/g, '/')}")
a, wa = T.estimate(data)
b, wb = T.estimate(data)
print(json.dumps({"same": a == b and wa == wb, "duration": a["duration_seconds"],
                  "words": a["word_count"], "scenes": [s["duration_seconds"] for s in a["scenes"]]}))
`;
  const r = py(['-c', script]);
  assert.equal(r.status, 0, r.stderr);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.ok(out.same, 'estimate() is not deterministic');
  assert.ok(out.duration > 0 && out.words > 0);
  assert.ok(Math.abs(out.scenes.reduce((x, y) => x + y, 0) - out.duration) < 0.5, 'scene durations do not sum');
});

test('audience profiles exist and pace slower for less-expert audiences', { skip: !HAS_PY }, () => {
  const r = py(['-c', `import sys; sys.path.insert(0,"${path.join(SUB, 'src').replace(/\\/g, '/')}"); import json, transcript as T; print(json.dumps(T.AUDIENCE_PROFILES))`]);
  assert.equal(r.status, 0, r.stderr);
  const p = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.ok(p.expert.wpm > p['adjacent-researcher'].wpm);
  assert.ok(p['adjacent-researcher'].wpm > p['general-technical'].wpm);
  assert.ok(p['general-technical'].base_dwell >= p['adjacent-researcher'].base_dwell);
});

test('SRT and VTT are well-formed and within line constraints', () => {
  const srt = read(path.join(TDIR, 'transcript.srt'));
  const vtt = read(path.join(TDIR, 'transcript.vtt'));
  assert.match(vtt, /^WEBVTT\n/);
  const srtCues = srt.trim().split(/\n\n+/);
  assert.ok(srtCues.length >= 10, 'too few subtitle cues');
  assert.match(srtCues[0].split('\n')[0], /^1$/);
  assert.match(srtCues[0].split('\n')[1], /^\d\d:\d\d:\d\d,\d\d\d --> \d\d:\d\d:\d\d,\d\d\d$/);
  for (const cue of srtCues) {
    const lines = cue.split('\n').slice(2);
    assert.ok(lines.length <= 2, `cue has ${lines.length} lines`);
    for (const line of lines) assert.ok(line.length <= 42, `line too long: ${line.length}`);
  }
});

test('transcript QA passes with no errors or warnings', { skip: !HAS_PY }, () => {
  const r = py([path.join(SUB, 'scripts', 'qa_transcript.py'), '--project', 'examples/lesa']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 error\(s\), 0 warning\(s\)/);
});

test('transcript QA detects bad narration', { skip: !HAS_PY }, () => {
  const script = `
import sys
sys.path.insert(0, "${path.join(SUB, 'src').replace(/\\/g, '/')}")
import json, qa_transcript as Q
data = {"video": {"id": "x"}, "audience": {"level": "adjacent-researcher"}, "scenes": [
  {"id": "s1", "narration": [
    {"beat_id": "b1", "text": "As shown in this paper we propose a method that is extremely complicated and runs for a very long time without stopping at all because it must.", "kind": "equation", "dwell_seconds": 0.0}
  ]}]}
findings = Q.qa(data)
print(json.dumps([f["message"] for f in findings]))
`;
  const r = py(['-c', script]);
  assert.equal(r.status, 0, r.stderr);
  const msgs = JSON.parse(r.stdout.trim().split('\n').pop()).join(' | ');
  assert.match(msgs, /paper-like prose/);
  assert.match(msgs, /sentence has/);
  assert.match(msgs, /dwell/);
});

test('optional audio backends are reported without being required', { skip: !HAS_PY }, () => {
  const r = py(['-c', `import sys; sys.path.insert(0,"${path.join(SUB, 'src').replace(/\\/g, '/')}"); import json, audio; print(json.dumps({"tts": audio.tts_backends(), "align": audio.alignment_backends()}))`]);
  assert.equal(r.status, 0, r.stderr);
  const b = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(typeof b.tts.say, 'boolean');
  assert.equal(typeof b.align.whisperx, 'boolean');
  assert.equal(b.align.estimated, true);
});

test('alignment without audio fails with an actionable message, not a traceback', { skip: !HAS_PY }, () => {
  const r = py([path.join(SUB, 'scripts', 'align_recording.py'), '--project', 'examples/lesa',
    '--audio', 'definitely-missing.wav']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /audio not found/);
  assert.ok(!/Traceback/.test(r.stderr), 'should not dump a traceback');
});

test('speaker notes manifest maps scenes to narration', () => {
  const notes = loadYaml(path.join(TDIR, 'speaker_notes.yaml'));
  assert.equal(notes.slides.length, 7);
  for (const s of notes.slides) {
    assert.ok(s.scene_id && s.narration && s.takeaway);
    assert.ok(s.narration.length > 20);
  }
});

test('existing video pipeline still lints cleanly', { skip: !HAS_PY }, () => {
  const r = py([path.join(SUB, 'scripts', 'lint_scenes.py'), '--project', 'examples/lesa']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 error\(s\)/);
});
