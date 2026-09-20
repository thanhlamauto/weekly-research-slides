'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { routeFigure } = require('../router');
const { layoutFigure } = require('./layout');
const { planToTex } = require('./primitives');
const { TEMPLATE_DIR } = require('../../beamer/renderTex');
const { findTool } = require('../../beamer/tools');

// Progressive explanation: reveal nodes in the declared overlay order. Outside
// Beamer the same figure renders complete, so it can be reused in a paper.
function applyReveals(spec, plan) {
  const rendering = (spec.figure && spec.figure.rendering) || {};
  const overlays = rendering.overlays;
  if (!overlays) return;
  const order = [];
  if (overlays === true) {
    (spec.nodes || []).forEach((n) => order.push(n.id));
  } else if (Array.isArray(overlays)) {
    overlays.forEach((entry) => {
      if (Array.isArray(entry)) entry.forEach((id) => order.push(id));
      else if (typeof entry === 'string') order.push(entry);
    });
  }
  const index = new Map(order.map((id, i) => [id, i + 1]));
  plan.nodes.forEach((n) => { n.reveal = index.get(n.id) || 1; });
  const byName = new Map(plan.nodes.map((n) => [n.name, n]));
  plan.edges.forEach((e) => {
    const a = byName.get(e.from);
    const b = byName.get(e.to);
    e.reveal = Math.max(a ? a.reveal : 1, b ? b.reveal : 1);
  });
}

function renderFigureTex(spec, opts = {}) {
  const decision = opts.decision || routeFigure(spec, opts);
  const plan = layoutFigure(spec, opts);
  applyReveals(spec, plan);
  const tex = planToTex(plan, { decision, spec });
  return { tex, plan, decision };
}

function standaloneWrapper(figureFile, mode) {
  const border = mode === 'paper' ? '2pt' : '4pt';
  return [
    '% Standalone TikZ figure export (weekly-research-slides).',
    `% mode: ${mode === 'paper' ? 'paper' : 'presentation'}`,
    `\\documentclass[tikz,border=${border}]{standalone}`,
    '\\usepackage{iftex}',
    '\\ifPDFTeX',
    '  \\usepackage[T1]{fontenc}',
    '  \\usepackage[utf8]{inputenc}',
    '  \\usepackage{lmodern}',
    '\\else',
    '  \\usepackage{fontspec}',
    '  \\IfFontExistsTF{lmroman10-regular.otf}{\\setmainfont{lmroman10-regular.otf}}{}',
    '\\fi',
    '\\usepackage{amsmath}',
    '\\usepackage{amssymb}',
    '\\input{tikz}',
    '\\begin{document}',
    `\\input{${figureFile}}`,
    '\\end{document}',
    '',
  ].join('\n');
}

function exportStandalone(spec, outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const rendered = renderFigureTex(spec, opts);
  const base = (spec.figure && spec.figure.id) || 'figure';
  const figureFile = `${base}.tex`;
  fs.writeFileSync(path.join(outDir, figureFile), rendered.tex);
  fs.copyFileSync(path.join(TEMPLATE_DIR, 'tikz.tex'), path.join(outDir, 'tikz.tex'));
  fs.writeFileSync(path.join(outDir, 'standalone.tex'), standaloneWrapper(figureFile, opts.mode));
  const engine = findTool('pdflatex');
  if (!engine) {
    return { ...rendered, ok: false, reason: 'pdflatex not found', dir: outDir, texFile: path.join(outDir, figureFile) };
  }
  const r = spawnSync(engine, ['-interaction=nonstopmode', '-halt-on-error', '-file-line-error', 'standalone.tex'],
    { cwd: outDir, encoding: 'utf8', timeout: opts.timeoutMs || 120000 });
  const pdf = path.join(outDir, 'standalone.pdf');
  const ok = r.status === 0 && fs.existsSync(pdf);
  return {
    ...rendered,
    ok,
    dir: outDir,
    texFile: path.join(outDir, figureFile),
    pdf: ok ? pdf : null,
    log: path.join(outDir, 'standalone.log'),
    reason: ok ? null : (r.stdout || '').split('\n').filter((l) => l.trim()).slice(-5).join(' | '),
  };
}

module.exports = { renderFigureTex, exportStandalone, applyReveals };
