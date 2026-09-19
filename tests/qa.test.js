'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { buildScene } = require('../src/renderer/buildScene');
const { qaScene } = require('../src/qa/geometry');
const { qaScience } = require('../src/qa/scientific');
const { qaContinuity } = require('../src/qa/continuity');
const { qaPptx } = require('../src/qa/pptxPackage');
const { loadData, exampleSpec, EX, tmp, buildExample } = require('./helpers');

test('example deck passes geometry, scientific, and continuity QA with no errors', async () => {
  const spec = exampleSpec();
  const scene = buildScene(spec);
  const delta = loadData(path.join(EX, 'weekly_delta.yaml'));
  const findings = [
    ...qaScene(scene),
    ...qaScience(spec, { weeklyDelta: delta }),
    ...qaContinuity(scene),
  ];
  const errors = findings.filter((f) => f.level === 'error');
  assert.deepEqual(errors, [], `unexpected QA errors: ${JSON.stringify(errors)}`);
});

test('generated package passes PPTX QA with semantic names', async () => {
  const out = tmp('deck.pptx');
  const { scene } = await buildExample(out);
  const spec = exampleSpec();
  const expected = [];
  scene.slides.forEach((s) => s.primitives.forEach(function walk(p) {
    if (p.id && /^(concept-|claim-|diag-|stage-|method-|fs-)/.test(p.id)) expected.push(p.id);
    if (p.kind === 'group') p.children.forEach(walk);
  }));
  const { findings } = await qaPptx(out, { spec, expectedNames: [...new Set(expected)] });
  const errors = findings.filter((f) => f.level === 'error');
  assert.deepEqual(errors, [], `unexpected PPTX QA errors: ${JSON.stringify(errors)}`);
});

test('geometry QA catches overflow and placeholder text', () => {
  const spec = {
    deck: { title: 'bad', stage: 'diagnostic', week: 1 },
    slides: [{
      id: 'x', archetype: 'limitations', title: 'Bad slide',
      content: { limitations: ['TODO lorem ipsum '.repeat(40)], open_questions: ['xxx'] },
    }],
  };
  const findings = qaScene(buildScene(spec));
  assert.ok(findings.some((f) => f.level === 'error' && /Placeholder/.test(f.message)));
});

test('geometry QA catches out-of-bounds objects', () => {
  const spec = {
    deck: { title: 'bad', stage: 'diagnostic', week: 1 },
    slides: [{
      id: 'x', archetype: 'limitations', title: 'Bad slide',
      content: { limitations: ['a'], open_questions: ['b'] },
      _inject: true,
    }],
  };
  const scene = buildScene(spec);
  scene.slides[0].primitives.push({ kind: 'rect', id: 'rogue', x: 20, y: 0, w: 2, h: 2, fill: 'FF0000', line: null });
  const findings = qaScene(scene);
  assert.ok(findings.some((f) => f.level === 'error' && /out of slide bounds/i.test(f.message)));
});

test('scientific QA catches a diagnostic that collapses observation into interpretation', () => {
  const spec = {
    deck: { title: 'x', stage: 'diagnostic', week: 2 },
    slides: [{
      id: 'd', archetype: 'diagnostic', title: 'D',
      content: {
        id: 'D9', question: 'q', claim_ids: ['C1'],
        measurement: 'm', observation: 'same text', interpretation: 'same text',
      },
    }],
  };
  const findings = qaScience(spec);
  assert.ok(findings.some((f) => f.level === 'error' && /identical/.test(f.message)));
});

test('continuity QA catches a moved concept object', () => {
  const base = (cx) => ({
    deck: { title: 'x', stage: 'diagnostic', week: 3 },
    slides: [
      { id: 'a', archetype: 'feature-space', title: 'A', content: { nodes: [{ object_id: 'concept-zs', label: 'Zs', kind: 'latent', cx, cy: 3 }], legend: false } },
      { id: 'b', archetype: 'feature-space', title: 'B', content: { nodes: [{ object_id: 'concept-zs', label: 'Zs', kind: 'latent', cx: cx + 0.6, cy: 3 }], legend: false } },
    ],
  });
  const findings = qaContinuity(buildScene(base(2)));
  assert.ok(findings.some((f) => f.level === 'error' && /changed geometry/.test(f.message)));
});
