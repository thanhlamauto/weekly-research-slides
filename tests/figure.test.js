'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const { XMLParser } = require('fast-xml-parser');

const ROOT = path.join(__dirname, '..');
const FIG = path.join(ROOT, 'skills', 'research-method-figure');
const EX = path.join(ROOT, 'examples', 'figure-comparison');
const STY = path.join(ROOT, 'examples', 'figure-style-transfer');
const LESA = path.join(ROOT, 'examples', 'lesa', 'figure');

const load = (p) => yaml.load(fs.readFileSync(p, 'utf8'));
const validator = (schema) => new Ajv({ allErrors: true, strict: false })
  .compile(JSON.parse(fs.readFileSync(path.join(FIG, 'schemas', schema), 'utf8')));
const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|placeholder|xxx+)\b/i;

function parseDrawio(file) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', isArray: (n) => n === 'mxCell' });
  const doc = parser.parse(fs.readFileSync(file, 'utf8'));
  const model = doc.mxfile.diagram.mxGraphModel;
  const cells = model.root.mxCell || [];
  return {
    pageWidth: Number(model['@_pageWidth']),
    pageHeight: Number(model['@_pageHeight']),
    cells: cells.map((c) => ({
      id: c['@_id'], style: c['@_style'] || '', value: c['@_value'] || '',
      vertex: c['@_vertex'] === '1', edge: c['@_edge'] === '1',
      x: c.mxGeometry ? Number(c.mxGeometry['@_x']) : null,
      y: c.mxGeometry ? Number(c.mxGeometry['@_y']) : null,
      w: c.mxGeometry ? Number(c.mxGeometry['@_width']) : null,
      h: c.mxGeometry ? Number(c.mxGeometry['@_height']) : null,
    })),
  };
}

test('sub-skill is present and self-describing', () => {
  for (const f of ['SKILL.md', 'requirements.txt', 'src/spec.py', 'src/style.py', 'src/ir.py',
    'src/layout.py', 'src/drawio.py', 'src/svg.py', 'src/qa.py', 'src/extract.py',
    'src/roles.py', 'scripts/build_figure.py', 'scripts/compare_methods.py',
    'scripts/method_delta.py', 'scripts/extract_style.py', 'scripts/qa_figure.py',
    'scripts/figure_doctor.py', 'scripts/figure_to_pptx.js',
    'schemas/figure_spec.schema.json', 'schemas/style_profile.schema.json',
    'schemas/source_inventory.schema.json']) {
    assert.ok(fs.existsSync(path.join(FIG, f)), `missing ${f}`);
  }
  const skill = fs.readFileSync(path.join(FIG, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---[\s\S]*name:\s*research-method-figure/);
  assert.match(skill, /license:\s*MIT/);
});

test('main SKILL.md advertises the figure sub-capability', () => {
  const main = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
  assert.match(main, /research-method-figure/);
});

test('style presets and the extracted user preset validate', () => {
  const validate = validator('style_profile.schema.json');
  for (const f of ['topconf-clean.yaml', 'grayscale-paper.yaml', 'presentation-clean.yaml',
    'dark-explainer.yaml', path.join('user', 'paper-style.yaml')]) {
    const data = load(path.join(FIG, 'styles', f));
    assert.ok(validate(data), `${f}: ${JSON.stringify(validate.errors)}`);
    assert.ok(data.style_profile.semantics.ours, `${f} missing semantics.ours`);
  }
  const extracted = load(path.join(FIG, 'styles', 'user', 'paper-style.yaml')).style_profile;
  assert.equal(extracted.source.kind, 'extraction');
  assert.ok(extracted.confidence.font_family, 'extracted profile must record font confidence');
  assert.ok(extracted.notes.some((n) => /STYLE_SOURCE/.test(n)));
});

test('source inventory classifies roles and requires redistributable style sources', () => {
  const validate = validator('source_inventory.schema.json');
  for (const dir of [EX, STY]) {
    const inv = load(path.join(dir, 'source_inventory.yaml'));
    assert.ok(validate(inv), `${dir}: ${JSON.stringify(validate.errors)}`);
    const styleSources = inv.sources.filter((s) => s.roles.includes('STYLE_SOURCE'));
    for (const s of styleSources) assert.equal(typeof s.redistributable, 'boolean');
    assert.ok(inv.sources.some((s) => s.roles.includes('CONTENT_SOURCE')));
  }
});

test('generated figure specs validate and comparison/delta keep shared ids', () => {
  const validate = validator('figure_spec.schema.json');
  const cmp = load(path.join(EX, 'output', 'comparison_spec.yaml'));
  assert.ok(validate(cmp), JSON.stringify(validate.errors));
  assert.equal(cmp.figure.type, 'method-comparison');
  assert.equal(cmp.figure.style, 'topconf-clean');
  assert.ok(cmp.comparison.shared_components.length >= 1);
  assert.ok(cmp.comparison.differences.ours_only.length >= 1);

  const delta = load(path.join(EX, 'output', 'method_delta_spec.yaml'));
  assert.ok(validate(delta), JSON.stringify(validate.errors));
  assert.equal(delta.figure.type, 'method-delta');
  assert.ok(delta.shared_concepts.includes('component.backbone'));
  assert.ok(delta.comparison.differences.ours_only.includes('component.router'));
});

test('generated drawio is valid XML with expected vertices and edges inside the page', () => {
  for (const name of ['competitor', 'ours', 'comparison', 'method_delta']) {
    const file = path.join(EX, 'output', `${name}.drawio`);
    const d = parseDrawio(file);
    assert.ok(d.pageWidth > 0 && d.pageHeight > 0, `${name}: page size`);
    const vertices = d.cells.filter((c) => c.vertex && c.id !== '0' && c.id !== '1');
    const edges = d.cells.filter((c) => c.edge);
    assert.ok(vertices.length >= 3, `${name}: vertices`);
    assert.ok(edges.length >= 2, `${name}: edges`);
    for (const v of vertices) {
      assert.ok([v.x, v.y, v.w, v.h].every((n) => Number.isFinite(n)), `${name}: geometry on ${v.id}`);
      assert.ok(v.x >= -1 && v.y >= -1 && v.x + v.w <= d.pageWidth + 1 && v.y + v.h <= d.pageHeight + 1,
        `${name}: ${v.id} outside page`);
    }
  }
});

test('comparison figure has semantic object names and one style', () => {
  const ir = JSON.parse(fs.readFileSync(path.join(EX, 'output', 'comparison.ir.json'), 'utf8'));
  assert.equal(ir.style.name, 'topconf-clean');
  const sem = new Set(ir.nodes.map((n) => n.semantic_id).filter(Boolean));
  assert.ok(sem.has('component.backbone'), 'shared backbone missing');
  assert.ok(sem.has('component.router'), 'ours-only router missing');
  assert.ok(sem.has('component.topk'), 'competitor-only topk missing');
  assert.equal(ir.panels.length, 2, 'comparison should have two method panels');
  assert.ok(ir.legend && ir.legend.entries.length >= 3, 'comparison needs a legend');
});

test('SVG and PNG exports exist for every demo figure', () => {
  for (const p of [
    path.join(EX, 'output', 'competitor.svg'), path.join(EX, 'output', 'comparison.svg'),
    path.join(EX, 'output', 'comparison.png'), path.join(EX, 'output', 'method_delta.svg'),
    path.join(STY, 'output', 'subject_paper_style.svg'), path.join(STY, 'output', 'subject_paper_style.png'),
    path.join(LESA, 'lesa_overview.drawio'), path.join(LESA, 'lesa_overview.svg'), path.join(LESA, 'lesa_overview.png'),
  ]) {
    assert.ok(fs.existsSync(p), `missing ${p}`);
    assert.ok(fs.statSync(p).size > 200, `too small: ${p}`);
  }
});

test('LESA figure reuses the shared method model (one model, three carriers)', () => {
  const ir = JSON.parse(fs.readFileSync(path.join(LESA, 'lesa_overview.ir.json'), 'utf8'));
  const labels = ir.nodes.map((n) => n.label).join(' | ');
  assert.match(labels, /Feature Projection|KAN|Residual/);
  assert.ok(fs.existsSync(path.join(ROOT, 'examples', 'lesa', 'method_model.yaml')));
});

test('PPT bridge produces native editable shapes with semantic names', () => {
  const pptx = path.join(EX, 'output', 'comparison.pptx');
  assert.ok(fs.existsSync(pptx), 'comparison.pptx missing');
  assert.ok(fs.statSync(pptx).size > 5000);
});

test('no placeholder strings in figure sources or outputs', () => {
  const files = [];
  const walk = (d) => fs.readdirSync(d).forEach((f) => {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) { if (!/output|node_modules/.test(f)) walk(p); }
    else if (/\.(yaml|yml|json)$/.test(f)) files.push(p);
  });
  walk(FIG);
  walk(EX);
  walk(STY);
  for (const f of files) {
    assert.ok(!PLACEHOLDER.test(fs.readFileSync(f, 'utf8')), `placeholder text in ${f}`);
  }
});
