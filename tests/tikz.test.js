'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EX = path.join(ROOT, 'examples', 'diagram-backends');
const { loadData } = require('../src/model/validate');
const { routeFigure } = require('../src/renderers/router');
const { irToSpec, loadFigureInput, prepareFigures } = require('../src/renderers/figure');
const {
  renderFigureTex, exportStandalone, layoutFigure, validateFigure, critiqueTikz,
} = require('../src/renderers/tikz');
const { findTool, buildBeamer } = require('../src/beamer/build');

const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-tikz-'));
const figure = (name) => loadData(path.join(EX, `${name}.figure.yaml`));
const hasLatex = Boolean(findTool('pdflatex'));

// ---------------------------------------------------------------------------
// routing
// ---------------------------------------------------------------------------
test('explicit backend wins and is recorded as explicit', () => {
  const spec = figure('preimage_geometry');
  spec.figure.rendering.backend = 'drawio';
  const d = routeFigure(spec);
  assert.equal(d.selected, 'drawio');
  assert.equal(d.explicit, true);
  assert.match(d.reason.join(' '), /explicit backend: drawio/);
});

test('auto routing prefers TikZ for small conceptual figures', () => {
  for (const name of ['preimage_geometry', 'cached_vs_corrected', 'v3_v4']) {
    const d = routeFigure(figure(name));
    assert.equal(d.selected, 'tikz', `${name}: ${d.reason.join('; ')}`);
    assert.ok(d.reason.some((r) => /direct integration with Beamer/.test(r)), `${name} missing Beamer reason`);
  }
});

test('complexity routing sends the large architecture to Draw.io', () => {
  const d = routeFigure(figure('large_architecture'));
  assert.equal(d.selected, 'drawio');
  assert.ok(d.reason.some((r) => /architecture-scale/.test(r)));
  assert.ok(d.reason.some((r) => /16 semantic objects/.test(r)));
});

test('auto routing sends plots to Python and animated figures to Manim', () => {
  const plot = {
    figure: { id: 'p', type: 'method-overview', plot: 'line' },
    nodes: [{ id: 'a', type: 'module', label: 'a' }], edges: [],
  };
  assert.equal(routeFigure(plot).selected, 'python');
  const anim = {
    figure: { id: 'a', type: 'temporal-process', rendering: { animate: true } },
    nodes: [{ id: 'a', type: 'module', label: 'a' }], edges: [],
  };
  assert.equal(routeFigure(anim).selected, 'manim');
});

// ---------------------------------------------------------------------------
// Figure IR integration
// ---------------------------------------------------------------------------
test('Figure IR converts to a semantic spec with ids, roles and panels preserved', () => {
  const ir = JSON.parse(fs.readFileSync(path.join(ROOT, 'examples', 'figure-comparison', 'output', 'method_delta.ir.json'), 'utf8'));
  const spec = irToSpec(ir);
  assert.equal(spec.figure.id, 'method_delta');
  assert.equal(spec.figure.type, 'method-delta');
  assert.ok(spec.nodes.some((n) => n.semantic_id === 'component.router' && n.role === 'added'));
  assert.ok(spec.nodes.some((n) => n.semantic_id === 'component.backbone' && n.role === 'shared'));
  assert.equal(routeFigure(spec).selected, 'tikz');
});

test('loadFigureInput detects IR vs spec', () => {
  assert.equal(loadFigureInput(path.join(ROOT, 'examples', 'figure-comparison', 'output', 'method_delta.ir.json')).kind, 'ir');
  assert.equal(loadFigureInput(path.join(EX, 'v3_v4.figure.yaml')).kind, 'spec');
});

// ---------------------------------------------------------------------------
// generation
// ---------------------------------------------------------------------------
test('TikZ source preserves semantic ids, math labels and semantic colors', () => {
  const { tex, plan, decision } = renderFigureTex(figure('cached_vs_corrected'));
  assert.equal(decision.selected, 'tikz');
  assert.equal(plan.archetype, 'competitor-vs-ours');
  assert.match(tex, /renderer_decision: selected=tikz/);
  assert.match(tex, /semantic ids: .*operation\.correction/);
  assert.match(tex, /\(o-correct\)/);
  assert.match(tex, /\$Z_s\$/);
  assert.match(tex, /draw=methodOurs/);
  assert.match(tex, /draw=methodCompetitor/);
  assert.match(tex, /draw=methodShared/);
  assert.ok(!/#[0-9A-Fa-f]{6}/.test(tex), 'generated TikZ must not hard-code hex colors');
  assert.equal(plan.nodes.length, 8);
  assert.equal(plan.edges.length, 6);
});

test('feature-space geometry emits vectors, references, angle arc and overlays', () => {
  const { tex, plan } = renderFigureTex(figure('preimage_geometry'));
  assert.equal(plan.archetype, 'feature-space');
  assert.equal(plan.arcs.length, 1);
  assert.match(tex, /methodVector/);
  assert.match(tex, /methodReference/);
  assert.match(tex, /arc\[start angle/);
  assert.match(tex, /cos 0\.117/);
  assert.match(tex, /wrsReveal\{2\}/);
  assert.match(tex, /wrsReveal\{3\}/);
});

test('competitor-vs-ours aligns shared semantic ids across panels', () => {
  const { plan } = renderFigureTex(figure('cached_vs_corrected'));
  const xOf = (id) => plan.nodes.find((n) => n.id === id).x;
  const offset = xOf('o-feature') - xOf('c-feature');
  assert.ok(offset > 0, 'ours panel is to the right');
  assert.ok(Math.abs((xOf('o-cache') - xOf('c-cache')) - offset) < 1e-6, 'cache column aligned');
  assert.ok(Math.abs((xOf('o-out') - xOf('c-out')) - offset) < 1e-6, 'output column aligned');
});

test('method-delta keeps shared layers aligned and highlights only the addition', () => {
  const { tex, plan } = renderFigureTex(figure('v3_v4'));
  const xOf = (id) => plan.nodes.find((n) => n.id === id).x;
  const prev = xOf('p-predictor') - xOf('p-feature');
  const curr = xOf('c-predictor') - xOf('c-feature');
  assert.ok(Math.abs(prev - curr) < 1e-6, 'predictor keeps its column across panels');
  const added = plan.nodes.filter((n) => n.role === 'added');
  assert.deepEqual(added.map((n) => n.id), ['c-correction']);
  assert.match(tex, /draw=methodAdded/);
  assert.match(tex, /draw=methodShared/);
});

// ---------------------------------------------------------------------------
// preflight and critique
// ---------------------------------------------------------------------------
test('preflight rejects broken references and zero-length edges', () => {
  const spec = {
    figure: { id: 'x', type: 'method-overview' },
    nodes: [{ id: 'a', type: 'module', label: 'A' }, { id: 'b', type: 'module', label: 'B' }],
    edges: [{ from: 'a', to: 'ghost' }, { from: 'b', to: 'b' }],
  };
  const findings = validateFigure(spec, null);
  assert.ok(findings.some((f) => f.check === 'edge-ref' && f.level === 'error'));
  assert.ok(findings.some((f) => f.check === 'zero-length-edge' && f.level === 'error'));
});

test('preflight rejects duplicate coordinates and over-budget figures', () => {
  const dup = {
    figure: { id: 'y', type: 'diagnostic', diagram: 'feature-space' },
    nodes: [
      { id: 'a', type: 'feature', label: '$A$', geometry: { x: 1, y: 1 } },
      { id: 'b', type: 'feature', label: '$B$', geometry: { x: 1, y: 1 } },
    ],
    edges: [],
  };
  const dupPlan = layoutFigure(dup);
  assert.ok(validateFigure(dup, dupPlan).some((f) => f.check === 'duplicate-coordinates' && f.level === 'error'));

  const many = { figure: { id: 'z', type: 'method-overview' }, nodes: [], edges: [] };
  for (let i = 0; i < 14; i += 1) many.nodes.push({ id: `n${i}`, type: 'module', label: `N${i}` });
  const budget = validateFigure(many, null).find((f) => f.check === 'tikz-budget');
  assert.ok(budget && budget.action === 'route_to_drawio');
});

test('critique returns actionable requests, not vague complaints', () => {
  const spec = {
    figure: { id: 'c', type: 'method-comparison' },
    panels: [{ id: 'p1', label: 'P1' }, { id: 'p2', label: 'P2' }],
    nodes: [
      { id: 'a', panel: 'p1', type: 'module', label: 'A', role: 'ours' },
      { id: 'b', panel: 'p1', type: 'module', label: 'B', role: 'added' },
      { id: 'c', panel: 'p1', type: 'module', label: 'C', role: 'changed' },
      { id: 'd', panel: 'p2', type: 'module', label: 'D', role: 'ours' },
    ],
    edges: [{ from: 'a', to: 'd', role: 'computation' }],
  };
  const plan = layoutFigure(spec);
  const findings = critiqueTikz(spec, plan);
  assert.ok(findings.some((f) => f.action === 'reduce_visual_emphasis'), JSON.stringify(findings));
  assert.ok(findings.every((f) => typeof f.message === 'string' && f.message.length > 10));
});

test('critique flags an edge crossing an unrelated node', () => {
  const spec = {
    figure: { id: 'cross', type: 'method-overview' },
    nodes: [
      { id: 'a', type: 'module', label: 'A' },
      { id: 'b', type: 'module', label: 'B' },
      { id: 'c', type: 'module', label: 'C' },
    ],
    edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'c' }],
  };
  const plan = layoutFigure(spec);
  const findings = critiqueTikz(spec, plan);
  assert.ok(findings.some((f) => f.check === 'edge-crosses-node' && f.action === 'reroute_edge'), JSON.stringify(findings));
});

// ---------------------------------------------------------------------------
// rendered output
// ---------------------------------------------------------------------------
test('standalone export compiles a native TikZ figure', { skip: !hasLatex ? 'no LaTeX toolchain' : false }, () => {
  const dir = tmpdir();
  const st = exportStandalone(figure('preimage_geometry'), dir, {});
  assert.equal(st.ok, true, st.reason);
  assert.ok(fs.existsSync(st.pdf));
  assert.ok(fs.existsSync(path.join(dir, 'tikz.tex')), 'shared palette must be copied next to the figure');
  const tex = fs.readFileSync(st.texFile, 'utf8');
  assert.match(tex, /renderer_decision: selected=tikz/);
});

test('mixed-renderer deck compiles with TikZ and Draw.io figures', { skip: !hasLatex ? 'no LaTeX toolchain' : false }, async () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const dir = tmpdir();
  const res = await buildBeamer(spec, {
    output: path.join(dir, 'deck.pdf'),
    specDir: EX,
    buildDir: path.join(dir, 'build'),
    handout: true,
  });
  const errors = res.findings.filter((f) => f.level === 'error');
  assert.deepEqual(errors, [], JSON.stringify(errors, null, 2));
  assert.equal(res.presentation.pages, 10, '8 frames + 2 extra overlay steps');
  assert.equal(res.handout.pages, 8, 'handout collapses overlays');
  const backends = res.manifest.figures.map((f) => f.backend).sort();
  assert.deepEqual(backends, ['drawio', 'tikz', 'tikz', 'tikz']);
  assert.ok(res.manifest.figures.every((f) => f.decision && f.decision.reason.length));
  assert.ok(fs.existsSync(path.join(dir, 'build', 'figures', 'preimage_geometry.tex')));
  assert.ok(fs.existsSync(path.join(dir, 'build', 'assets', 'lesa_overview.pdf')));
});

test('figure preparation copies Draw.io exports and renders TikZ sources', () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const dir = tmpdir();
  const { prepared, findings } = prepareFigures(spec, { specDir: EX, buildDir: dir });
  assert.equal(Object.keys(prepared).length, 4);
  assert.equal(prepared.lesa_architecture.backend, 'drawio');
  assert.ok(prepared.lesa_architecture.assetFile.endsWith('.pdf'));
  assert.equal(prepared.preimage_geometry.backend, 'tikz');
  assert.ok(fs.existsSync(path.join(dir, prepared.preimage_geometry.texFile)));
  assert.deepEqual(findings.filter((f) => f.level === 'error'), []);
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
test('cli route reports the router decision', () => {
  const r = spawnSync(process.execPath, ['src/cli.js', 'route', '--input',
    'examples/diagram-backends/large_architecture.figure.yaml'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /-> drawio/);
  assert.match(r.stdout, /architecture-scale/);
});
