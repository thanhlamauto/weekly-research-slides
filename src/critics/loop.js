'use strict';

const fs = require('fs');
const path = require('path');

const { buildScene } = require('../renderer/buildScene');
const { writePptx } = require('../renderer/pptxRenderer');
const { renderSlidePreviews } = require('../renderer/preview');
const { qaScene } = require('../qa/geometry');
const { qaScience } = require('../qa/scientific');
const { qaPptx } = require('../qa/pptxPackage');

const { critiqueContent } = require('./content');
const { critiqueVisual } = require('./visual');
const { critiqueDeck } = require('./deck');
const { applyRevisions } = require('./revise');
const { analyzeImages } = require('./imageMetrics');
const { deckMetrics } = require('./metrics');
const { styleMetrics } = require('./metrics');

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function severityRank(s) { return s === 'high' ? 3 : s === 'medium' ? 2 : 1; }

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function revisionLogMarkdown(cycles) {
  const lines = ['# Revision log', '', 'Source-first critique loop. Every applied change edits `slide_spec` and rebuilds the deck.', ''];
  cycles.forEach((cy) => {
    lines.push(`## Cycle ${cy.cycle}`, '');
    const applied = cy.issues.filter((i) => i.applied);
    const unresolved = cy.issues.filter((i) => !i.applied && i.severity !== 'info');
    lines.push(`- applied: ${applied.length}`, `- unresolved: ${unresolved.length}`, '');
    if (applied.length) {
      lines.push('### Applied', '');
      applied.forEach((i) => lines.push(`- \`${i.slide}\` **${i.critic}/${i.issue}** (${i.severity}) — ${i.action}`));
      lines.push('');
    }
    if (unresolved.length) {
      lines.push('### Unresolved', '');
      unresolved.forEach((i) => lines.push(`- \`${i.slide}\` **${i.critic}/${i.issue}** (${i.severity}) — ${i.reason}`));
      lines.push('');
    }
  });
  return `${lines.join('\n')}\n`;
}

// Content Critic -> revision -> render -> Visual Critic -> revision -> render ->
// Deck Critic -> revision -> rebuild + verify. Bounded to maxCycles.
async function runCritiqueLoop(opts) {
  const root = opts.root || path.join(__dirname, '..', '..');
  const qaDir = opts.qaDir || path.join(root, 'qa');
  const deckOut = opts.deckOut;
  const maxCycles = Math.min(opts.maxCycles || 3, opts.hardMax || 3);
  const doRender = opts.render !== false;

  let spec = clone(opts.spec);
  const cycles = [];
  const contentIssues = [];
  const visualIssues = [];
  const deckIssues = [];
  let images = null;
  let lastApplied = -1;
  let hardFailures = [];
  let unresolvedHigh = [];
  let scene = null;

  for (let cycle = 1; cycle <= maxCycles; cycle += 1) {
    const cycleIssues = [];
    const pushAll = (findings, appliedList) => {
      const appliedKeys = new Set(appliedList.map((a) => `${a.slide}:${a.issue}:${a.op ? JSON.stringify(a.op) : ''}`));
      findings.forEach((f) => {
        const applied = appliedKeys.has(`${f.slide}:${f.issue}:${f.op ? JSON.stringify(f.op) : ''}`);
        const rec = { ...f, cycle, applied };
        cycleIssues.push(rec);
        if (f.critic === 'content') contentIssues.push(rec);
        else if (f.critic === 'visual') visualIssues.push(rec);
        else deckIssues.push(rec);
      });
    };

    // 1. content critique; cycle 1 is deletion-only (may only delete/merge/shorten/demote)
    const contentF = critiqueContent(spec);
    const contentRev = applyRevisions(spec, contentF, { mode: cycle === 1 ? 'deletion-only' : 'all' });
    pushAll(contentF, contentRev.applied);
    spec = contentRev.spec;

    // 2. build + render
    scene = buildScene(spec);
    if (deckOut) await writePptx(scene, deckOut);
    if (doRender) {
      const pv = renderSlidePreviews(scene, path.join(qaDir, 'renders'));
      const im = analyzeImages(root, pv.dir);
      images = im.ok ? im.images : null;
    }

    // 3. visual critique + revision
    const visualF = critiqueVisual(spec, scene, images);
    const visualRev = applyRevisions(spec, visualF, { mode: 'all' });
    pushAll(visualF, visualRev.applied);
    spec = visualRev.spec;

    // 4. rebuild, then deck critique + revision
    scene = buildScene(spec);
    if (deckOut) await writePptx(scene, deckOut);
    const deckF = critiqueDeck(spec, scene, images);
    const deckRev = applyRevisions(spec, deckF, { mode: 'all' });
    pushAll(deckF, deckRev.applied);
    spec = deckRev.spec;

    // 5. final build + verify
    scene = buildScene(spec);
    if (deckOut) await writePptx(scene, deckOut);
    const geometry = qaScene(scene);
    const scientific = qaScience(spec);
    const pkg = deckOut ? (await qaPptx(deckOut, { spec })).findings : [];
    hardFailures = [...geometry, ...scientific, ...pkg].filter((f) => f.level === 'error');
    unresolvedHigh = cycleIssues.filter((i) => i.severity === 'high' && !i.applied);

    const appliedCount = cycleIssues.filter((i) => i.applied).length;
    cycles.push({ cycle, issues: cycleIssues, applied: appliedCount, hardFailures: hardFailures.length, unresolvedHigh: unresolvedHigh.length });
    if (opts.onCycle) opts.onCycle({ cycle, applied: appliedCount, hardFailures: hardFailures.length, unresolvedHigh: unresolvedHigh.length });

    // stop conditions
    if (!hardFailures.length && !unresolvedHigh.length) break;
    if (appliedCount === 0) break; // no substantive improvement this cycle
    lastApplied = appliedCount;
  }

  const metrics = deckMetrics(spec, images);
  writeJson(path.join(qaDir, 'content_review.json'), { critic: 'content', metrics, issues: contentIssues });
  writeJson(path.join(qaDir, 'visual_review.json'), { critic: 'visual', metrics, issues: visualIssues });
  writeJson(path.join(qaDir, 'deck_review.json'), { critic: 'deck', metrics, issues: deckIssues });
  writeJson(path.join(qaDir, 'editorial_metrics.json'), metrics);
  writeJson(path.join(qaDir, 'style_metrics.json'), styleMetrics(scene));
  fs.mkdirSync(qaDir, { recursive: true });
  fs.writeFileSync(path.join(qaDir, 'revision_log.md'), revisionLogMarkdown(cycles));

  return { spec, cycles, metrics, hardFailures, unresolvedHigh, images, qaDir };
}

module.exports = { runCritiqueLoop };
