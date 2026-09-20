'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const EX = path.join(ROOT, 'examples', 'diagnostic-week');
const { loadData } = require('../src/model/validate');
const { renderBeamer, texEscape, texMathLabel, TEMPLATE } = require('../src/beamer/renderTex');
const {
  prepareBuildDir, compileBeamer, parseLatexLog, texDoctor, renderPdfPages, makeContactSheet,
} = require('../src/beamer/build');

const tmpdir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-beamer-'));

const ARCHETYPE_SPEC = {
  deck: { title: 'Archetype coverage', stage: 'diagnostic', week: 1, footer: 'coverage' },
  slides: [
    { id: 'a1', archetype: 'title', title: 'Title', content: { headline: 'Headline', question: 'Q?', byline: 'B' } },
    { id: 'a2', archetype: 'question', title: 'Question', notes: 'speaker note', content: { question: 'What?', why_now: ['now'], success_criteria: ['crit'] } },
    { id: 'a3', archetype: 'recap', title: 'Recap', content: { established: [{ label: 'P1', detail: 'd' }], now: 'now' } },
    { id: 'a4', archetype: 'problem', title: 'Problem', content: { summary: 's', why_hard: ['h'], constraints: ['c'] } },
    { id: 'a5', archetype: 'method-landscape', title: 'Landscape', content: { methods: [{ tag: 'M1', name: 'A', mechanism: 'm' }, { tag: 'M2', name: 'B', mechanism: 'n', role: 'ours' }], gap: 'gap' } },
    { id: 'a6', archetype: 'competitor-mechanism', title: 'Competitor', content: { intuition: 'i', mechanism: 'm', failure: ['f'], relation_to_us: 'r' } },
    { id: 'a7', archetype: 'weakness', title: 'Weakness', content: { gap: 'g', evidence: ['e'], implication: 'i' } },
    { id: 'a8', archetype: 'motivation', title: 'Motivation', content: { contrast: { old: 'o', new: 'n' }, idea: 'i', why_now: 'w' } },
    { id: 'a9', archetype: 'method-high-level', title: 'Pipeline', content: { stages: [{ role: 'input', label: 'x', detail: 'd' }, { role: 'operator', label: '+' }, { role: 'output', label: 'y' }], note: 'n' } },
    { id: 'a10', archetype: 'method-delta', title: 'Delta', content: { from: 'v1', to: 'v2', summary: 's', changes: [{ change: 'c', why: 'w' }], unchanged: ['u'] } },
    { id: 'a11', archetype: 'experiment', title: 'Experiment', content: { setup: 's', protocol: ['p'], changed: ['c'], controlled: ['k'] } },
    { id: 'a12', archetype: 'benchmark', title: 'Benchmark', content: { metrics: [{ key: 'm', name: 'Metric', unit: 'higher' }], methods: [{ name: 'Ours', role: 'current', values: { m: 1 }, delta: { m: '+0.1' } }], caption: 'cap' } },
    { id: 'a13', archetype: 'claim', title: 'Claim', content: { id: 'C1', status: 'weakened', statement: 's', evidence: ['e'] } },
    { id: 'a14', archetype: 'claim-delta', title: 'Claim delta', content: { claims: [{ id: 'C1', previous: 'plausible', current: 'weakened', statement: 's', note: 'n' }], note: 'n' } },
    { id: 'a15', archetype: 'diagnostic', title: 'Diagnostic', content: { id: 'D1', question: 'q', claim_ids: ['C1'], measurement: 'm', observation: 'o', interpretation: 'i', can_conclude: 'c', cannot_conclude: 'n', alternative_explanation: 'a' } },
    { id: 'a16', archetype: 'feature-space', title: 'Feature space', content: { nodes: [{ object_id: 'concept-zs', label: 'Z_s', cx: 2.9, cy: 4.5 }, { object_id: 'concept-ztilde', label: 'Z~', cx: 8.7, cy: 4.5 }], vectors: [{ id: 'v1', from: 'concept-zs', to: 'concept-ztilde', semantic: 'vector', label: 'dZ' }], note: 'n' } },
    { id: 'a17', archetype: 'interpretation', title: 'Interpretation', content: { observation: 'o', interpretation: 'i', claim: { id: 'C1', status: 'emerging', statement: 's' } } },
    { id: 'a18', archetype: 'limitations', title: 'Limitations', content: { limitations: ['l'], open_questions: ['q'] } },
  ],
};

test('beamer template metadata is versioned and named', () => {
  assert.equal(TEMPLATE.name, 'academic-beamer');
  assert.ok(Number.isInteger(TEMPLATE.version) && TEMPLATE.version >= 1);
  assert.ok(fs.existsSync(path.join(ROOT, 'templates', 'academic-beamer', 'theme.tex')));
  assert.ok(fs.existsSync(path.join(ROOT, 'templates', 'academic-beamer', 'macros.tex')));
  assert.ok(fs.existsSync(path.join(ROOT, 'templates', 'academic-beamer', 'version.json')));
});

test('renderer covers every schema archetype with semantic macros', () => {
  const out = renderBeamer(ARCHETYPE_SPEC);
  assert.equal(out.engine, 'pdflatex');
  const slides = out.files['slides.tex'];
  assert.equal((slides.match(/\\begin\{frame\}/g) || []).length, ARCHETYPE_SPEC.slides.length);
  assert.match(slides, /\\wrsDiagId\{D1\}/);
  assert.match(slides, /\\wrsClaimTransition\{C1\}/);
  assert.match(slides, /\\wrsMethodTransition\{v1\}\{v2\}/);
  assert.match(slides, /\\begin\{wrsband\}\{measurement\}/);
  assert.match(slides, /\\begin\{tikzpicture\}/);
  assert.match(slides, /\\note\{/);
});

test('frame bodies never start with a bare brace group (beamer subtitle trap)', () => {
  const slides = renderBeamer(ARCHETYPE_SPEC).files['slides.tex'];
  const frames = slides.split('\\begin{frame}').slice(1);
  for (const body of frames) {
    const afterHeader = body.replace(/^(\[[^\]]*\])?(\{[^}]*\})?\s*/, '');
    assert.ok(!afterHeader.startsWith('{'),
      `frame body starts with a bare group and would be dropped as a subtitle: ${afterHeader.slice(0, 40)}`);
  }
});

test('special characters and scientific unicode are escaped', () => {
  const ctx = { unicode: new Set(), keepUnicode: false };
  const escaped = texEscape('ΔZ → 100% of x_y ~ #1 & {a}', ctx);
  assert.match(escaped, /^\$\\Delta\$Z/);
  assert.match(escaped, /\\% of x\\_y/);
  assert.match(escaped, /\\textasciitilde\{\}/);
  assert.match(escaped, /\\#1 \\& \\\{a\\\}/);
  assert.equal(texMathLabel('Z_s'), '$Z_{s}$');
  assert.equal(texMathLabel('Z~'), '$\\tilde{Z}$');
});

test('compile log QA flags overfull boxes, missing files and undefined refs', () => {
  const log = [
    'Overfull \\hbox (14.2pt too wide) in paragraph at lines 10--11',
    '! LaTeX Error: File `missing.pdf\' not found.',
    'LaTeX Warning: Citation `smith2026\' on page 1 undefined on input line 5.',
    'LaTeX Warning: Reference `fig:1\' on page 2 undefined on input line 7.',
    'Output written on presentation.pdf (9 pages, 12345 bytes).',
  ].join('\n');
  const { findings, pages } = parseLatexLog(log);
  assert.equal(pages, 9);
  const checks = findings.map((f) => f.check);
  assert.ok(checks.includes('overfull'));
  assert.ok(checks.includes('missing-file'));
  assert.ok(checks.includes('citation'));
  assert.ok(checks.includes('reference'));
  assert.ok(findings.every((f) => f.level === 'error' || f.level === 'warning'));
});

test('doctor reports the beamer toolchain and packages', () => {
  const doc = texDoctor();
  assert.ok('beamer.cls' in doc.packages);
  assert.ok('pdflatex' in doc.tools);
  assert.equal(typeof doc.ok, 'boolean');
  if (doc.tools.pdflatex) assert.equal(doc.ok, true, `missing: ${doc.missing.join(', ')}`);
});

const doctor = texDoctor();
const hasLatex = Boolean(doctor.ok && doctor.tools.pdftoppm);

test('demo compiles to a clean 10-page presentation and handout', { skip: !hasLatex ? 'no LaTeX toolchain' : false }, async () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const dir = tmpdir();
  const prep = prepareBuildDir(spec, dir, { specDir: EX });
  assert.equal(prep.engine, 'pdflatex');
  assert.deepEqual(prep.warnings, []);
  assert.equal(prep.manifest.template.name, 'academic-beamer');
  assert.ok(fs.existsSync(path.join(dir, 'build_manifest.json')));

  const presentation = compileBeamer(dir, { engine: prep.engine, file: 'presentation.tex' });
  const errors = presentation.findings.filter((f) => f.level === 'error');
  assert.deepEqual(errors, [], JSON.stringify(errors, null, 2));
  assert.equal(presentation.ok, true);
  assert.equal(presentation.pages, 10);
  assert.ok(fs.existsSync(presentation.pdf));

  const handout = compileBeamer(dir, { engine: prep.engine, file: 'handout.tex' });
  assert.deepEqual(handout.findings.filter((f) => f.level === 'error'), []);
  assert.equal(handout.pages, 10);

  const handoutTex = fs.readFileSync(path.join(dir, 'handout.tex'), 'utf8');
  assert.match(handoutTex, /\\documentclass\[10pt,aspectratio=169,handout\]\{beamer\}/);
  const presentationTex = fs.readFileSync(path.join(dir, 'presentation.tex'), 'utf8');
  assert.match(presentationTex, /\\documentclass\[10pt,aspectratio=169\]\{beamer\}/);

  const slides = fs.readFileSync(path.join(dir, 'slides.tex'), 'utf8');
  assert.match(slides, /\\wrsDiagId\{D1\}/);
  assert.match(slides, /\\wrsDiagId\{D2\}/);
  assert.match(slides, /\\wrsClaimTransition\{C1\}\{plausible\}\{weakened\}/);
  assert.match(slides, /\\note\{/);
});

test('pdf pages render to PNGs and a contact sheet', { skip: !hasLatex ? 'no LaTeX toolchain' : false }, async () => {
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const dir = tmpdir();
  const prep = prepareBuildDir(spec, dir, { specDir: EX });
  const res = compileBeamer(dir, { engine: prep.engine, file: 'presentation.tex' });
  assert.equal(res.ok, true);

  const pagesDir = path.join(dir, 'pages');
  const pages = renderPdfPages(res.pdf, pagesDir, { dpi: 80 });
  assert.equal(pages.ok, true);
  assert.equal(pages.pages, 10);
  assert.ok(fs.existsSync(path.join(pagesDir, 'slide-01.png')));
  assert.ok(fs.existsSync(path.join(pagesDir, 'slide-10.png')));

  const sheet = makeContactSheet(ROOT, pagesDir, path.join(pagesDir, 'contact-sheet.png'), { cols: 3 });
  assert.equal(sheet.ok, true, sheet.reason);
  assert.ok(fs.statSync(sheet.file).size > 1000);
});

test('cli help advertises the beamer default and doctor runs', () => {
  const help = spawnSync(process.execPath, ['src/cli.js'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(help.stdout, /beamer \(default\)/);
  assert.match(help.stdout, /--renderer beamer\|pptx/);
  const doc = spawnSync(process.execPath, ['src/cli.js', 'doctor'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(doc.status, 0, doc.stderr);
  assert.match(doc.stdout, /latex \(beamer renderer/);
});
