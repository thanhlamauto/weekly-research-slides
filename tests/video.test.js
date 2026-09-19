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

function loadYaml(p) {
  return yaml.load(fs.readFileSync(p, 'utf8'));
}

function validator(schemaFile) {
  const schema = JSON.parse(fs.readFileSync(path.join(SUB, 'schemas', schemaFile), 'utf8'));
  return new Ajv({ allErrors: true, strict: false }).compile(schema);
}

const ALLOWED_PATTERNS = new Set([
  'ESTABLISH', 'TRACE', 'BUILD', 'MORPH', 'FOCUS', 'COMPARE', 'TRAJECTORY',
  'STAGE-SPLIT', 'ACCUMULATION', 'CORRECTION', 'REPLAY', 'REVEAL', 'ZOOM', 'RECAP',
]);
const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|placeholder)\b/i;

test('subskill is present and self-describing', () => {
  for (const f of ['SKILL.md', 'requirements.txt', 'src/theme.py', 'src/actors.py',
    'src/patterns.py', 'src/spec.py', 'scripts/render_scene.py',
    'scripts/video_doctor.py', 'scripts/qa_video.py', 'scripts/lint_scenes.py',
    'scripts/extract_frames.py', 'scripts/make_contact_sheet.py',
    'scripts/export_keyframes.py', 'schemas/method_model.schema.json',
    'schemas/scene_spec.schema.json']) {
    assert.ok(fs.existsSync(path.join(SUB, f)), `missing ${f}`);
  }
  const skill = fs.readFileSync(path.join(SUB, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---[\s\S]*name:\s*research-method-video/);
  assert.match(skill, /license:\s*MIT/);
});

test('main SKILL.md advertises the video sub-capability', () => {
  const main = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
  assert.match(main, /research-method-video/);
  assert.match(main, /video/i);
});

test('LESA method model validates against its schema', () => {
  const data = loadYaml(path.join(LESA, 'method_model.yaml'));
  const validate = validator('method_model.schema.json');
  assert.ok(validate(data), JSON.stringify(validate.errors));
  assert.equal(data.method.kind, 'competitor');
  assert.ok(data.equations.length >= 4);
});

test('LESA scene spec validates and is internally consistent', () => {
  const data = loadYaml(path.join(LESA, 'scene_spec.yaml'));
  const validate = validator('scene_spec.schema.json');
  assert.ok(validate(data), JSON.stringify(validate.errors));
  assert.ok(data.scenes.length >= 6);

  const sceneIds = new Set();
  for (const scene of data.scenes) {
    assert.ok(!sceneIds.has(scene.id), `duplicate scene id ${scene.id}`);
    sceneIds.add(scene.id);
    assert.ok(scene.manim_class, `${scene.id} missing manim_class`);
    assert.ok(scene.start_state && scene.end_state, `${scene.id} missing start/end state`);
    const actors = new Set();
    for (const a of scene.actors || []) {
      assert.ok(!actors.has(a.id), `${scene.id} duplicate actor ${a.id}`);
      actors.add(a.id);
    }
    for (const b of scene.beats) {
      assert.ok(ALLOWED_PATTERNS.has(b.pattern), `unknown pattern ${b.pattern}`);
    }
  }
  assert.ok(!PLACEHOLDER.test(JSON.stringify(data)), 'placeholder text in scene spec');
});

test('persistent actors keep their type across scenes', () => {
  const data = loadYaml(path.join(LESA, 'scene_spec.yaml'));
  const types = new Map();
  for (const scene of data.scenes) {
    for (const a of scene.actors || []) {
      if (types.has(a.id) && types.get(a.id) !== a.type) {
        assert.fail(`actor ${a.id} changed type ${types.get(a.id)} -> ${a.type}`);
      }
      types.set(a.id, a.type);
    }
  }
  assert.ok(types.has('feature_point') || types.has('trajectory'));
});

test('LESA Manim sources are split and define the registered classes', () => {
  const spec = loadYaml(path.join(LESA, 'scene_spec.yaml'));
  const src = path.join(LESA, 'src');
  const files = [];
  const walk = (d) => fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.py')) files.push(p);
  });
  walk(src);
  assert.ok(files.length >= 8, 'scenes should be split across files');
  const text = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const scene of spec.scenes) {
    assert.match(text, new RegExp(`class\\s+${scene.manim_class}\\s*\\(`), `missing ${scene.manim_class}`);
  }
  // not a single monolith
  const largest = Math.max(...files.map((f) => fs.readFileSync(f, 'utf8').split('\n').length));
  assert.ok(largest < 220, `a source file has ${largest} lines; keep scenes split`);
});

test('keyframe bridge manifest and stills exist', () => {
  const manifestPath = path.join(LESA, 'qa', 'keyframes.yaml');
  assert.ok(fs.existsSync(manifestPath), 'run export_keyframes.py first');
  const manifest = loadYaml(manifestPath);
  assert.ok(manifest.keyframes.length >= 6);
  for (const kf of manifest.keyframes) {
    assert.ok(fs.existsSync(path.join(LESA, kf.png)), `missing keyframe ${kf.png}`);
    assert.ok(kf.purpose && typeof kf.timestamp === 'number');
  }
});

test('rendered LESA draft explainer exists and is non-empty', () => {
  const mp4 = path.join(LESA, 'renders', 'draft', 'lesa-method-explainer.mp4');
  assert.ok(fs.existsSync(mp4), 'draft explainer missing');
  assert.ok(fs.statSync(mp4).size > 10000, 'draft explainer looks empty');
});

test('python lint passes when the dev venv is available', { skip: !fs.existsSync(path.join(ROOT, '.venv-manim', 'bin', 'python')) }, () => {
  const py = path.join(ROOT, '.venv-manim', 'bin', 'python');
  const r = spawnSync(py, [path.join(SUB, 'scripts', 'lint_scenes.py'), '--project', 'examples/lesa'],
    { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 error\(s\)/);
});
