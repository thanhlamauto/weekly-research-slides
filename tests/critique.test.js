'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { loadData } = require('../src/model/validate');
const { analyzeSlide, BUDGETS } = require('../src/critics/budgets');
const { critiqueContent } = require('../src/critics/content');
const { critiqueDeck } = require('../src/critics/deck');
const { critiqueVisual } = require('../src/critics/visual');
const { applyRevisions } = require('../src/critics/revise');
const { runCritiqueLoop } = require('../src/critics/loop');
const { buildScene } = require('../src/renderer/buildScene');
const { renderSlidePreviews } = require('../src/renderer/preview');
const { qaPptx } = require('../src/qa/pptxPackage');

const EX = path.join(ROOT, 'examples', 'diagnostic-week');
const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-critique-'));

function verboseSpec() {
  return {
    deck: { title: 't', stage: 'diagnostic', week: 6 },
    slides: [
      { id: 'a', archetype: 'recap', title: 'Recap', content: {
        established: [{ label: 'P1', detail: 'Cached hidden features go stale over time, which means that reusing them drifts, and this is the problem.' }],
        now: 'Method v4 adds a correction objective, and the question is whether it moves toward the future feature, and we will see.',
      } },
      { id: 'b', archetype: 'diagnostic', title: 'Diagnostic D1: does correction aim at the future feature?', content: {
        id: 'D1', question: 'Does the correction direction point toward the future feature?', claim_ids: ['C1'],
        measurement: 'cos(deltaZ, Z_d - Z_s) = 0.1168',
        observation: 'The correction direction is nearly orthogonal to the desired direction, and this is what we measured with the cosine above.',
        interpretation: 'Output recovery may not require moving toward the exact future hidden state, which suggests an alternative is enough.',
        can_conclude: 'C1 as stated is not supported, and the correction is not simply moving toward the desired direction, and this matters.',
        cannot_conclude: 'That the correction is uninformative.',
        alternative_explanation: 'The correction may exploit a downstream-valid direction.',
      } },
      { id: 'c', archetype: 'method-delta', title: 'What changed', content: {
        from: 'v3', to: 'v4', summary: 'Version four adds a correction objective and an oracle diagnostic, and it also scales down the correction.',
        changes: [{ change: 'Added a correction objective', why: 'We penalize deviation from the future feature so that the correction is supervised directly.' }],
      } },
    ],
  };
}

test('editorial metrics detect an over-budget slide', () => {
  const a = analyzeSlide(verboseSpec().slides[0]);
  assert.ok(a.visibleWords > BUDGETS.visibleMaxWords, `visible ${a.visibleWords}`);
  assert.ok(a.titleWords <= BUDGETS.titleMaxWords);
});

test('content critic finds redundancy, narration, budgets and category titles', () => {
  const spec = verboseSpec();
  spec.slides.push({ id: 'd', archetype: 'problem', title: 'Problem', content: { summary: 'x', why_hard: ['y'] } });
  const findings = critiqueContent(spec);
  const issues = new Set(findings.map((f) => f.issue));
  assert.ok(issues.has('visible_text_over_budget'));
  assert.ok(issues.has('long_field'));
  assert.ok(issues.has('category_title'));
  assert.ok(issues.has('recap_not_compressed'));
  assert.ok(findings.some((f) => f.op && f.op.op === 'shorten_field'));
});

test('deletion-only revision forbids adding and preserves required fields', () => {
  const spec = verboseSpec();
  const findings = critiqueContent(spec);
  const res = applyRevisions(spec, findings, { mode: 'deletion-only' });
  // no retitle is applied in deletion-only mode
  assert.ok(!res.applied.some((f) => f.op && f.op.op === 'retitle'));
  const b = res.spec.slides.find((s) => s.id === 'b');
  for (const k of ['question', 'measurement', 'observation', 'interpretation']) {
    assert.ok(b.content[k], `diagnostic lost ${k}`);
  }
  const a = res.spec.slides.find((s) => s.id === 'a');
  assert.ok((a.content.established || []).length >= 1, 'recap list must not be emptied');
  assert.ok(a.notes && a.notes.length > 0, 'demoted text should reach speaker notes');
});

test('revision never empties a list', () => {
  const spec = { deck: { title: 't', stage: 'diagnostic', week: 1 }, slides: [
    { id: 'x', archetype: 'limitations', title: 'L', content: { limitations: ['only one'], open_questions: ['q'] } },
  ] };
  const res = applyRevisions(spec, [{ slide: 'x', critic: 'content', severity: 'high', issue: 'x', reason: '', action: '', op: { op: 'drop_field', path: 'limitations[0]' } }], { mode: 'all' });
  assert.equal(res.spec.slides[0].content.limitations.length, 1);
  assert.equal(res.applied.length, 0);
});

test('deck critic detects duplicated explanation and repeated layouts', () => {
  const spec = { deck: { title: 't', stage: 'diagnostic', week: 1 }, slides: [
    { id: 'a', archetype: 'claim', title: 'Correction approximates the future feature', content: { statement: 'The correction approximates the future feature', evidence: ['cos 0.12'] } },
    { id: 'b', archetype: 'claim', title: 'Correction approximates the future feature', content: { statement: 'The correction approximates the future feature', evidence: ['cos 0.11'] } },
    { id: 'c', archetype: 'claim', title: 'Correction approximates the future feature', content: { statement: 'The correction approximates the future feature', evidence: ['cos 0.10'] } },
    { id: 'd', archetype: 'claim', title: 'Correction approximates the future feature', content: { statement: 'The correction approximates the future feature', evidence: ['cos 0.09'] } },
  ] };
  const findings = critiqueDeck(spec, buildScene(spec), null);
  const issues = new Set(findings.map((f) => f.issue));
  assert.ok(issues.has('duplicated_explanation'));
  assert.ok(issues.has('repeated_layout'));
  assert.ok(findings.some((f) => f.op && f.op.op === 'merge_slides'));
});

test('visual critic reports geometry overflow as a hard failure', () => {
  const spec = { deck: { title: 't', stage: 'diagnostic', week: 1 }, slides: [
    { id: 'd', archetype: 'diagnostic', title: 'Diagnostic D: a question long enough to matter here', content: {
      id: 'D', question: 'Does it work?', claim_ids: ['C1'], measurement: 'cos = 0.1',
      observation: 'This observation is deliberately far too long to fit inside the small diagnostic band and it keeps going and going and going and going and going and then it keeps going even more and more and more and more and more until it is far too tall.',
      interpretation: 'Short.', can_conclude: 'Yes.', cannot_conclude: 'No.',
    } },
  ] };
  const findings = critiqueVisual(spec, buildScene(spec), null);
  assert.ok(findings.some((f) => f.severity === 'high'), 'expected a high-severity visual finding');
});

test('renderSlidePreviews produces per-slide SVGs', () => {
  const dir = tmpdir();
  const out = renderSlidePreviews(buildScene(verboseSpec()), dir);
  assert.ok(out.svgs.length === 3);
  assert.ok(fs.existsSync(path.join(dir, 'slide-01.svg')));
  assert.ok(fs.existsSync(path.join(dir, 'contact-sheet.svg')));
});

test('the critique loop converges and reduces visible text without hard failures', async () => {
  const spec = loadData(path.join(EX, 'draft_verbose_slide_spec.yaml'));
  const qaDir = tmpdir();
  const deckOut = path.join(tmpdir(), 'revised.pptx');
  const before = spec.slides.reduce((n, s) => n + analyzeSlide(s).visibleWords, 0);
  const res = await runCritiqueLoop({ root: ROOT, spec, qaDir, deckOut, maxCycles: 3, render: false });
  assert.equal(res.hardFailures.length, 0, JSON.stringify(res.hardFailures));
  assert.equal(res.unresolvedHigh.length, 0, JSON.stringify(res.unresolvedHigh));
  assert.ok(res.cycles.length >= 1 && res.cycles.length <= 3);
  const after = res.spec.slides.reduce((n, s) => n + analyzeSlide(s).visibleWords, 0);
  assert.ok(after < before, `visible words did not drop: ${before} -> ${after}`);
  assert.equal(res.spec.slides.length, spec.slides.length, 'slides should not be dropped here');
  for (const f of ['content_review.json', 'visual_review.json', 'deck_review.json', 'revision_log.md', 'editorial_metrics.json']) {
    assert.ok(fs.existsSync(path.join(qaDir, f)), `missing ${f}`);
  }
  const { findings } = await qaPptx(deckOut, { spec: res.spec });
  assert.deepEqual(findings.filter((f) => f.level === 'error'), []);
});
