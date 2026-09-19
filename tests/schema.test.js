'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { loadData, validateData } = require('../src/model/validate');
const { ROOT } = require('./helpers');

const CASES = [
  ['research_state', 'examples/diagnostic-week/research_state.yaml'],
  ['research_state', 'examples/diagnostic-week/research_state_week5.yaml'],
  ['weekly_delta', 'examples/diagnostic-week/weekly_delta.yaml'],
  ['storyboard', 'examples/diagnostic-week/storyboard.yaml'],
  ['slide_spec', 'examples/diagnostic-week/slide_spec.yaml'],
  ['motion_spec', 'examples/diagnostic-week/motion_spec.yaml'],
  ['research_state', 'examples/survey-stage/research_state.yaml'],
  ['storyboard', 'examples/survey-stage/storyboard.yaml'],
  ['slide_spec', 'examples/survey-stage/slide_spec.yaml'],
];

test('example source files validate against their schemas', () => {
  for (const [schema, file] of CASES) {
    const data = loadData(path.join(ROOT, file));
    const res = validateData(schema, data);
    assert.ok(res.ok, `${file}: ${JSON.stringify(res.errors)}`);
  }
});

test('invalid slide_spec is rejected', () => {
  const res = validateData('slide_spec', { deck: { title: 'x', stage: 'not-a-stage', week: 1 }, slides: [] });
  assert.equal(res.ok, false);
  assert.ok(res.errors.length > 0);
});

test('research_state rejects unknown claim status', () => {
  const data = loadData(path.join(ROOT, 'examples/diagnostic-week/research_state.yaml'));
  data.claims.C1.status = 'definitely-true';
  const res = validateData('research_state', data);
  assert.equal(res.ok, false);
});
