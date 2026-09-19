'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { inspectPptx } = require('../src/pptx/inspect');
const { editPptx } = require('../src/pptx/edit');
const { tmp, buildExample, EX } = require('./helpers');

test('inspect extracts shape names, text, and geometry', async () => {
  const out = tmp('deck.pptx');
  await buildExample(out);
  const info = await inspectPptx(out);
  const slide1 = info.slides[0];
  assert.ok(slide1.shapes.length > 3);
  const title = slide1.shapes.find((s) => s.name === 'title-main');
  assert.ok(title);
  assert.match(title.text, /correction|feature/i);
  assert.equal(typeof title.x, 'number');
});

test('edit applies set_text, move, and annotate while preserving other content', async () => {
  const out = tmp('deck.pptx');
  await buildExample(out);
  const edited = tmp('edited.pptx');
  const ops = [
    { op: 'set_text', target: 'claimdelta-C1-stmt', text: 'Rewritten claim statement.' },
    { op: 'move', target: 'concept-ztilde', dx: 0.1, dy: 0.05 },
    { op: 'annotate', slide: 10, name: 'annotation-test', text: 'Reviewer note.', x: 0.7, y: 6.55, w: 6, h: 0.34, size: 11 },
  ];
  const res = await editPptx(out, null, edited, ops);
  assert.ok(res.applied.length >= 2);

  const before = await inspectPptx(out);
  const after = await inspectPptx(edited);
  const find = (info, n, name) => info.slides[n - 1].shapes.find((s) => s.name === name);

  assert.equal(find(after, 8, 'claimdelta-C1-stmt').text, 'Rewritten claim statement.');
  assert.ok(find(after, 5, 'concept-ztilde').x > find(before, 5, 'concept-ztilde').x);
  assert.ok(find(after, 10, 'annotation-test'));
  assert.equal(after.slideCount, before.slideCount);

  // Unrelated content preserved.
  const t1 = find(after, 1, 'title-main');
  assert.equal(t1.text, find(before, 1, 'title-main').text);
});

test('inspect fails clearly on a non-PPTX file', async () => {
  const bad = tmp('bad.pptx');
  fs.writeFileSync(bad, 'not a pptx');
  await assert.rejects(() => inspectPptx(bad));
});
