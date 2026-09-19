'use strict';

const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const { loadData, validateData } = require('../src/model/validate');
const { planStoryboard, STAGE_MODULES } = require('../src/model/plan');
const { diffStates } = require('../src/model/diff');
const { EX } = require('./helpers');

test('diff of two states produces the expected weekly delta', () => {
  const prev = loadData(path.join(EX, 'research_state_week5.yaml'));
  const curr = loadData(path.join(EX, 'research_state.yaml'));
  const delta = diffStates(prev, curr, { question: 'q' });
  assert.equal(delta.from_week, 5);
  assert.equal(delta.week, 6);
  assert.equal(delta.method_delta.from, 'v3');
  assert.equal(delta.method_delta.to, 'v4');
  assert.equal(delta.claim_delta.C1.previous, 'plausible');
  assert.equal(delta.claim_delta.C1.current, 'weakened');
  assert.ok(delta.new_claims.C2);
  assert.deepEqual(delta.new_diagnostics, ['D1', 'D2']);
  assert.equal(delta.result_delta.length, 3);
});

test('planner emits a schema-valid storyboard for every stage', () => {
  const state = loadData(path.join(EX, 'research_state.yaml'));
  const delta = loadData(path.join(EX, 'weekly_delta.yaml'));
  for (const stage of Object.keys(STAGE_MODULES)) {
    const sb = planStoryboard(state, delta, { stage });
    sb.deck.stage = stage; // planner overrides stage when asked
    const res = validateData('storyboard', sb);
    assert.ok(res.ok, `${stage}: ${JSON.stringify(res.errors)}`);
    assert.ok(sb.slides.length >= 1);
  }
});

test('survey stage expands one competitor slide per competitor and invents no method', () => {
  const state = loadData(path.join(EX, 'research_state.yaml'));
  state.project.stage = 'survey';
  const sb = planStoryboard(state, {}, { stage: 'survey' });
  const comps = sb.slides.filter((s) => s.module === 'competitor-method');
  assert.equal(comps.length, Object.keys(state.competitors).length);
  assert.ok(!sb.slides.some((s) => s.module === 'method-high-level'));
  assert.equal(sb.slides[sb.slides.length - 1].module, 'weakness-gap');
});
