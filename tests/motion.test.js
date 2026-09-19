'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const JSZip = require('jszip');

const { applyMotion } = require('../src/pptx/motion');
const { loadData, tmp, buildExample, EX } = require('./helpers');
const path = require('path');

test('static deck contains no timing, animated deck contains native OOXML', async () => {
  const staticDeck = tmp('static.pptx');
  await buildExample(staticDeck);
  const animated = tmp('animated.pptx');
  const motion = loadData(path.join(EX, 'motion_spec.yaml'));
  const report = await applyMotion(staticDeck, motion, animated);

  const staticZip = await JSZip.loadAsync(fs.readFileSync(staticDeck));
  const animZip = await JSZip.loadAsync(fs.readFileSync(animated));

  let staticTiming = 0;
  let animTiming = 0;
  let bldP = 0;
  for (const f of Object.keys(animZip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(f)) continue;
    const s = await staticZip.file(f).async('string');
    if (s.includes('<p:timing>')) staticTiming += 1;
    const a = await animZip.file(f).async('string');
    if (a.includes('<p:timing>')) animTiming += 1;
    bldP += (a.match(/<p:bldP /g) || []).length;
    assert.ok(a.includes('<p:transition'), `${f} missing transition`);
  }
  assert.equal(staticTiming, 0, 'static deck must stay static');
  assert.equal(animTiming, report.slides.length);
  assert.ok(bldP > 100, `expected many animated object references, got ${bldP}`);
  assert.equal(report.slides.reduce((n, s) => n + s.animated, 0), bldP);
  assert.ok(report.slides.every((s) => s.missing.length === 0), 'all semantic names should resolve');
});

test('motion reports unresolved semantic names', async () => {
  const staticDeck = tmp('static.pptx');
  await buildExample(staticDeck);
  const animated = tmp('animated.pptx');
  const report = await applyMotion(staticDeck, {
    defaults: { transition: 'fade', effect: 'fade' },
    slides: [{ id: 's1', groups: [{ trigger: 'on-click', objects: ['does-not-exist'] }] }],
  }, animated);
  assert.deepEqual(report.slides[0].missing, ['does-not-exist']);
  assert.equal(report.slides[0].animated, 0);
});
