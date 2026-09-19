'use strict';

const test = require('node:test');
const assert = require('node:assert');

const { inspectPptx } = require('../src/pptx/inspect');
const { buildExample } = require('./helpers');

test('builds a valid OOXML package with the expected slide count', async () => {
  const { scene } = await buildExample();
  assert.equal(scene.slides.length, 10);
});

test('generated PPTX opens, has 10 slides, and names semantic objects', async () => {
  const { tmp } = require('./helpers');
  const out = tmp('deck.pptx');
  await buildExample(out);
  const info = await inspectPptx(out);
  assert.equal(info.slideCount, 10);
  assert.ok(info.hasContentTypes);
  assert.ok(Math.abs(info.slideWidth - 13.333) < 0.01);

  const allNames = new Set();
  const allText = [];
  for (const s of info.slides) {
    for (const sh of s.shapes) {
      allNames.add(sh.name);
      allText.push(sh.text);
    }
  }
  for (const expected of ['concept-zs', 'concept-zd', 'concept-ztilde', 'vec-delta', 'claimdelta-C1', 'diag-D1-measurement', 'bench-row-current', 'title-main']) {
    assert.ok(allNames.has(expected), `missing semantic object ${expected}`);
  }
  assert.ok(!allText.some((t) => /TODO|TBD|lorem|placeholder/i.test(t)));
});

test('native objects stay inside slide bounds', async () => {
  const { tmp } = require('./helpers');
  const out = tmp('deck.pptx');
  await buildExample(out);
  const info = await inspectPptx(out);
  for (const s of info.slides) {
    for (const sh of s.shapes) {
      if ([sh.x, sh.y, sh.w, sh.h].every((v) => typeof v === 'number')) {
        assert.ok(sh.x >= -0.02 && sh.y >= -0.02, `slide ${s.number} ${sh.name} starts out of bounds`);
        assert.ok(sh.x + sh.w <= info.slideWidth + 0.02 && sh.y + sh.h <= info.slideHeight + 0.02, `slide ${s.number} ${sh.name} ends out of bounds`);
      }
    }
  }
});

test('rebuild from source is deterministic for shapes and text', async () => {
  const { tmp } = require('./helpers');
  const a = tmp('a.pptx');
  const b = tmp('b.pptx');
  await buildExample(a);
  await buildExample(b);
  const ia = await inspectPptx(a);
  const ib = await inspectPptx(b);
  const norm = (info) => info.slides.map((s) => s.shapes.map((sh) => `${sh.name}|${sh.text}|${sh.x},${sh.y},${sh.w},${sh.h}`));
  assert.deepEqual(norm(ia), norm(ib));
});
