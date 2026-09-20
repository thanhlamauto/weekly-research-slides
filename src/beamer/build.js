'use strict';

// Beamer build pipeline: render semantic LaTeX -> compile -> log QA -> PDF
// page renders -> contact sheet. Compile QA is hard-failing: a broken build,
// an overfull box, a missing figure/citation or an undefined reference all
// count as errors, because the PDF is the deliverable.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { renderBeamer, TEMPLATE_DIR } = require('./renderTex');

const CACHE = new Map();

function findTool(name) {
  if (CACHE.has(name)) return CACHE.get(name);
  const candidates = [];
  if (process.env.WRS_TEX_BIN) candidates.push(path.join(process.env.WRS_TEX_BIN, name));
  for (const dir of (process.env.PATH || '').split(path.delimiter)) if (dir) candidates.push(path.join(dir, name));
  candidates.push('/Library/TeX/texbin/' + name, '/opt/homebrew/bin/' + name, '/usr/local/bin/' + name);
  const home = process.env.HOME || '';
  if (home) {
    candidates.push(path.join(home, 'Library', 'TinyTeX', 'bin', 'universal-darwin', name));
    candidates.push(path.join(home, 'Library', 'TinyTeX', 'bin', 'aarch64-darwin', name));
  }
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); CACHE.set(name, c); return c; } catch (e) { /* keep looking */ }
  }
  CACHE.set(name, null);
  return null;
}

function pythonCandidates(root) {
  return [
    process.env.WRS_PYTHON,
    path.join(root, '.venv-manim', 'bin', 'python'),
    'python3',
  ].filter(Boolean);
}

function texDoctor() {
  const tools = {};
  ['pdflatex', 'lualatex', 'xelatex', 'latexmk', 'pdftoppm', 'pdfinfo', 'kpsewhich']
    .forEach((t) => { tools[t] = findTool(t); });
  const packages = {};
  ['beamer.cls', 'iftex.sty', 'lmodern.sty', 'fontspec.sty', 'booktabs.sty', 'enumitem.sty',
    'tikz.sty', 'pgf.sty', 'amsmath.sty', 'amssymb.sty', 'graphicx.sty', 'ragged2e.sty']
    .forEach((p) => {
      if (!tools.kpsewhich) { packages[p] = null; return; }
      const r = spawnSync(tools.kpsewhich, [p], { encoding: 'utf8' });
      packages[p] = (r.stdout || '').trim() || null;
    });
  const missing = Object.entries(packages).filter(([, v]) => !v).map(([k]) => k);
  const engine = tools.pdflatex || tools.lualatex || tools.xelatex || null;
  return {
    ok: Boolean(engine && packages['beamer.cls']),
    tools,
    packages,
    missing,
    engine: tools.pdflatex ? 'pdflatex' : tools.lualatex ? 'lualatex' : tools.xelatex ? 'xelatex' : null,
  };
}

// ---------------------------------------------------------------------------
// build directory
// ---------------------------------------------------------------------------
function prepareBuildDir(spec, buildDir, opts = {}) {
  const rendered = renderBeamer(spec, { engine: opts.engine });
  fs.mkdirSync(path.join(buildDir, 'assets'), { recursive: true });
  for (const [name, content] of Object.entries(rendered.files)) {
    fs.writeFileSync(path.join(buildDir, name), content);
  }
  ['theme.tex', 'macros.tex', 'version.json'].forEach((f) => {
    fs.copyFileSync(path.join(TEMPLATE_DIR, f), path.join(buildDir, f));
  });
  const copiedFigures = [];
  for (const name of rendered.figures) {
    const src = path.join(opts.specDir || '.', name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(buildDir, 'assets', name));
      copiedFigures.push(name);
    }
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
  const manifest = {
    generator: `weekly-research-slides ${pkg.version}`,
    template: { name: rendered.template.name, version: rendered.template.version },
    engine: rendered.engine,
    deck: spec.deck ? { title: spec.deck.title, stage: spec.deck.stage, week: spec.deck.week } : null,
    slides: (spec.slides || []).length,
    figures: copiedFigures,
    generated_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(buildDir, 'build_manifest.json'), JSON.stringify(manifest, null, 2));
  return { buildDir, engine: rendered.engine, warnings: rendered.warnings, figures: copiedFigures, manifest, rendered };
}

// ---------------------------------------------------------------------------
// compile + log QA
// ---------------------------------------------------------------------------
function parseLatexLog(log) {
  const findings = [];
  const seen = new Set();
  const add = (level, check, message) => {
    const key = `${level}:${check}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ level, check, message });
  };
  let pages = null;
  log.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    let m;
    if ((m = /^! LaTeX Error: File `([^']+)' not found/.exec(trimmed))) add('error', 'missing-file', `missing file ${m[1]}`);
    else if (/^! LaTeX Error: File/.test(trimmed)) add('error', 'missing-file', trimmed);
    else if (/^! /.test(trimmed)) add('error', 'compile', `${trimmed} (log line ${i + 1})`);
    if ((m = /Overfull \\([hv])box \(([\d.]+)pt too (wide|high)\)/.exec(trimmed))) {
      const pt = parseFloat(m[2]);
      const near = /at lines? (\d+)/.exec(trimmed);
      add(pt >= 1 ? 'error' : 'warning', 'overfull',
        `Overfull \\${m[1]}box ${m[2]}pt too ${m[3]}${near ? ` near log line ${near[1]}` : ''}`);
    }
    if ((m = /LaTeX Warning: Citation `([^']+)' .*undefined/.exec(trimmed))) add('error', 'citation', `undefined citation ${m[1]}`);
    if ((m = /LaTeX Warning: Reference `([^']+)' .*undefined/.exec(trimmed))) add('error', 'reference', `undefined reference ${m[1]}`);
    if ((m = /LaTeX Warning: File `([^']+)' not found/.exec(trimmed))) add('error', 'missing-file', `missing file ${m[1]}`);
    if ((m = /Output written on [^(]*\((\d+) pages?/.exec(trimmed))) pages = Number(m[1]);
  });
  return { findings, pages };
}

function compileBeamer(buildDir, opts = {}) {
  const engine = opts.engine || 'pdflatex';
  const file = opts.file || 'presentation.tex';
  const texFile = path.join(buildDir, file);
  const base = path.basename(file, '.tex');
  const logFile = path.join(buildDir, `${base}.log`);
  const pdfFile = path.join(buildDir, `${base}.pdf`);
  const findings = [];
  if (!fs.existsSync(texFile)) {
    return { ok: false, engine, file: texFile, findings: [{ level: 'error', check: 'beamer-build', message: `missing ${file}` }] };
  }
  const bin = findTool(engine);
  const latexmk = findTool('latexmk');
  let runs = [];
  if (bin) {
    for (let pass = 0; pass < (opts.runs || 2); pass += 1) {
      runs.push(spawnSync(bin, [
        '-interaction=nonstopmode', '-halt-on-error', '-file-line-error',
        '-output-directory', buildDir, texFile,
      ], { cwd: buildDir, encoding: 'utf8', timeout: opts.timeoutMs || 120000 }));
      if (runs[runs.length - 1].status !== 0) break;
    }
  } else if (latexmk) {
    const flag = engine === 'lualatex' ? '-lualatex' : engine === 'xelatex' ? '-xelatex' : '-pdf';
    runs.push(spawnSync(latexmk, [
      flag, '-interaction=nonstopmode', '-file-line-error',
      `-outdir=${buildDir}`, texFile,
    ], { cwd: buildDir, encoding: 'utf8', timeout: opts.timeoutMs || 120000 }));
  } else {
    return {
      ok: false, engine, file: texFile,
      findings: [{ level: 'error', check: 'latex-missing', message: `no ${engine} or latexmk on PATH (set WRS_TEX_BIN)` }],
    };
  }
  const failed = runs.some((r) => r.status !== 0);
  const log = fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8') : '';
  const parsed = parseLatexLog(log);
  findings.push(...parsed.findings);
  if (failed) {
    const tail = (runs.find((r) => r.status !== 0) || {}).stdout || '';
    const last = tail.split('\n').filter((l) => l.trim()).slice(-4).join(' | ');
    findings.push({ level: 'error', check: 'compile', message: `latex exited non-zero${last ? `: ${last}` : ''}` });
  }
  const ok = fs.existsSync(pdfFile) && !findings.some((f) => f.level === 'error');
  let pdf = pdfFile;
  if (ok && opts.outPdf) {
    fs.mkdirSync(path.dirname(path.resolve(opts.outPdf)), { recursive: true });
    fs.copyFileSync(pdfFile, opts.outPdf);
    pdf = opts.outPdf;
  }
  return { ok, engine, file: texFile, pdf, pages: parsed.pages, findings, log: logFile };
}

async function buildBeamer(spec, opts = {}) {
  const output = opts.output || 'out.pdf';
  const buildDir = opts.buildDir || path.join(path.dirname(path.resolve(output)), `${path.basename(output, '.pdf')}-build`);
  const prep = prepareBuildDir(spec, buildDir, { specDir: opts.specDir, engine: opts.engine });
  const presentation = compileBeamer(buildDir, { engine: prep.engine, file: 'presentation.tex', outPdf: output });
  const findings = [...prep.warnings, ...presentation.findings];
  let handout = null;
  if (opts.handout !== false) {
    handout = compileBeamer(buildDir, {
      engine: prep.engine, file: 'handout.tex',
      outPdf: output.replace(/\.pdf$/i, '-handout.pdf'),
    });
    findings.push(...handout.findings.map((f) => ({ ...f, check: `handout:${f.check}` })));
  }
  return { ...prep, presentation, handout, findings, pdf: presentation.pdf, output, buildDir };
}

// ---------------------------------------------------------------------------
// PDF -> page PNGs -> contact sheet
// ---------------------------------------------------------------------------
function renderPdfPages(pdf, outDir, opts = {}) {
  const pdftoppm = findTool('pdftoppm');
  if (!pdftoppm) return { ok: false, reason: 'pdftoppm (Poppler) not found', pages: [], dir: outDir };
  fs.mkdirSync(outDir, { recursive: true });
  const prefix = path.join(outDir, 'raw');
  const r = spawnSync(pdftoppm, ['-png', '-r', String(opts.dpi || 110), pdf, prefix], { encoding: 'utf8' });
  if (r.status !== 0) return { ok: false, reason: (r.stderr || 'pdftoppm failed').trim(), pages: [], dir: outDir };
  const raw = fs.readdirSync(outDir)
    .filter((f) => /^raw-\d+\.png$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
  const files = [];
  raw.forEach((f, i) => {
    const target = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`);
    fs.renameSync(path.join(outDir, f), target);
    files.push(target);
  });
  return { ok: true, dir: outDir, pages: files.length, files, pdf };
}

function makeContactSheet(root, imageDir, outPng, opts = {}) {
  const script = path.join(root, 'scripts', 'pdf_contact_sheet.py');
  if (!fs.existsSync(script)) return { ok: false, reason: 'contact sheet script missing' };
  let lastErr = 'python unavailable';
  for (const py of pythonCandidates(root)) {
    const r = spawnSync(py, [script, '--input', imageDir, '--output', outPng, '--cols', String(opts.cols || 3)],
      { encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(outPng)) return { ok: true, file: outPng };
    lastErr = (r.stderr || r.stdout || '').trim().split('\n').slice(-1)[0] || lastErr;
  }
  return { ok: false, reason: lastErr };
}

function pdfPageCount(pdf) {
  const pdfinfo = findTool('pdfinfo');
  if (!pdfinfo) return null;
  const r = spawnSync(pdfinfo, [pdf], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const m = /Pages:\s+(\d+)/.exec(r.stdout || '');
  return m ? Number(m[1]) : null;
}

module.exports = {
  findTool, texDoctor, prepareBuildDir, parseLatexLog, compileBeamer,
  buildBeamer, renderPdfPages, makeContactSheet, pdfPageCount,
};
