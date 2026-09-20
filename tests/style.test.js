'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const { resolveStyle, styleNames, DEFAULT_STYLE } = require('../src/renderer/styles');
const theme = require('../src/renderer/theme');
const { buildScene } = require('../src/renderer/buildScene');
const { loadData } = require('../src/model/validate');
const { styleMetrics } = require('../src/critics/metrics');
const { inspectPptx } = require('../src/pptx/inspect');

const EX = path.join(ROOT, 'examples', 'diagnostic-week');
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-style-'));

test('style profiles load and academic-beamer is the default', () => {
  assert.ok(styleNames().includes('academic-beamer'));
  assert.ok(styleNames().includes('academic-metropolis'));
  assert.equal(DEFAULT_STYLE, 'academic-beamer');
  assert.equal(theme.styleName, 'academic-beamer');
  const b = resolveStyle('academic-beamer');
  assert.equal(b.STYLE.family, 'academic');
  assert.equal(b.STYLE.decoration.gradients, false);
  assert.equal(b.STYLE.decoration.shadows, false);
  assert.equal(b.STYLE.decoration.icons, false);
  assert.ok(b.STYLE.decoration.maxPrimaryAccents <= 2);
});

test('academic styles disable decoration; metropolis adds a progress bar', () => {
  const b = resolveStyle('academic-beamer');
  const m = resolveStyle('academic-metropolis');
  assert.equal(b.STYLE.frame.progressBar, false);
  assert.equal(m.STYLE.frame.progressBar, true);
  assert.equal(b.STYLE.frame.titleRule, 'subtle');
  assert.equal(m.STYLE.frame.titleRule, 'none');
  assert.ok(m.LAYOUT.marginX > b.LAYOUT.marginX, 'metropolis uses more whitespace');
});

test('frame titles keep a stable position across the deck', () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const scene = buildScene(spec);
  const positions = new Set();
  for (const sl of scene.slides) {
    if (sl.archetype === 'title') continue;
    const title = sl.primitives.find((p) => p.id === 'title-main');
    if (title) positions.add(`${title.x.toFixed(2)},${title.y.toFixed(2)}`);
  }
  assert.equal(positions.size, 1, `title position drifts: ${[...positions]}`);
});

test('footer and page number are present and minimal', () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const scene = buildScene(spec);
  for (const sl of scene.slides) {
    if (sl.archetype === 'title') continue;
    const hasNum = sl.primitives.some((p) => p.id === 'footer-slide-number');
    assert.ok(hasNum, `${sl.id} missing page number`);
    const hasFoot = sl.primitives.some((p) => p.id === 'footer-text');
    assert.ok(hasFoot, `${sl.id} missing footer`);
  }
});

test('diagnostic uses semantic blocks, not coloured banners', () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const scene = buildScene(spec);
  const diag = scene.slides.find((s) => s.id === 's6');
  const ids = diag.primitives.map((p) => p.id);
  assert.ok(ids.includes('diag-D1-observation__rule'), 'expected a left rule on the observation block');
  assert.ok(ids.includes('diag-D1-measurement__text'));
  // no legacy coloured banner for the question
  assert.ok(!ids.includes('diag-D1-q'), 'question should be text, not a banner');
});

test('figure-first: the geometry slide lets the figure dominate', () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const scene = buildScene(spec);
  const m = styleMetrics(scene);
  const fs = m.slides.find((s) => s.archetype === 'feature-space');
  assert.ok(fs && fs.figureBBoxRatio >= 0.12, `feature bbox ${fs && fs.figureBBoxRatio}`);
});

test('style override is honoured through the CLI (progress bar vs rule)', async () => {
  const spec = { deck: { title: 't', stage: 'diagnostic', week: 1 }, slides: [
    { id: 'a', archetype: 'problem', title: 'A problem worth solving', content: { summary: 'x', why_hard: ['y'] } },
    { id: 'b', archetype: 'motivation', title: 'Why this approach', content: { idea: 'i', why_now: 'w' } },
  ] };
  const dir = tmpdir();
  const specFile = path.join(dir, 'spec.yaml');
  fs.writeFileSync(specFile, require('js-yaml').dump(spec));
  const run = (extra) => spawnSync(process.execPath, ['src/cli.js', 'build', '--input', specFile,
    '--output', path.join(dir, extra ? 'm.pptx' : 'b.pptx'), ...(extra ? ['--style', 'academic-metropolis'] : [])],
    { cwd: ROOT, encoding: 'utf8' });
  assert.equal(run(true).status, 0, run(true).stderr);
  assert.equal(run(false).status, 0, run(false).stderr);
  const mInfo = await inspectPptx(path.join(dir, 'm.pptx'));
  const bInfo = await inspectPptx(path.join(dir, 'b.pptx'));
  const all = (info) => info.slides.flatMap((s) => s.shapes.map((sh) => sh.name));
  assert.ok(all(mInfo).some((n) => n.startsWith('frame-progress-fill')), 'metropolis should have a progress bar');
  assert.ok(!all(bInfo).some((n) => n.startsWith('frame-progress')), 'beamer should not have a progress bar');
});

test('citation slot renders when authored', () => {
  const survey = loadData(path.join(ROOT, 'examples', 'survey-stage', 'slide_spec.yaml'));
  const scene = buildScene(survey);
  const s3 = scene.slides.find((s) => s.id === 's3');
  assert.ok(s3.primitives.some((p) => p.id === 'citation'));
  const text = s3.primitives.find((p) => p.id === 'citation');
  assert.match(text.text, /CVPR 2026/);
});
