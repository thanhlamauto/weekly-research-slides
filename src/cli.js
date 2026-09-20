#!/usr/bin/env node
'use strict';

// The PowerPoint style must be selected before the renderer modules load.
(function selectStyle() {
  const argv = process.argv.slice(2);
  const i = argv.findIndex((a) => a === '--style');
  const eq = argv.find((a) => a.startsWith('--style='));
  const name = eq ? eq.split('=')[1] : (i >= 0 ? argv[i + 1] : null);
  if (name) process.env.WRS_PPT_STYLE = name;
})();

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { loadData, dumpData, validateData } = require('./model/validate');
const { buildScene } = require('./renderer/buildScene');
const { writePptx } = require('./renderer/pptxRenderer');
const { renderSvg, contactSheet } = require('./renderer/svgRenderer');
const { qaScene } = require('./qa/geometry');
const { qaContinuity } = require('./qa/continuity');
const { qaScience } = require('./qa/scientific');
const { qaPptx } = require('./qa/pptxPackage');
const { inspectPptx } = require('./pptx/inspect');
const { editPptx } = require('./pptx/edit');
const { applyMotion } = require('./pptx/motion');
const { planStoryboard, STAGE_MODULES } = require('./model/plan');
const { diffStates } = require('./model/diff');
const {
  buildBeamer, compileBeamer, renderPdfPages, makeContactSheet, texDoctor, pdfPageCount, parseLatexLog,
} = require('./beamer/build');
const { loadFigureInput, figureEntries } = require('./renderers/figure');
const { routeFigure, renderFigureTex, exportStandalone, validateFigure, critiqueTikz } = require('./renderers/tikz');
const { analyzeImages } = require('./critics/imageMetrics');

function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) { flags[a.slice(2)] = argv[i + 1]; i += 1; }
      else flags[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}

function which(bin) {
  const r = spawnSync('which', [bin], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function deriveExpectedNames(scene) {
  const names = new Set();
  const walk = (ps) => ps.forEach((p) => {
    if (p.id && /^(concept-|claim-|diag-|stage-|method-|fs-)/.test(p.id)) names.add(p.id);
    if (p.kind === 'group' && p.children) walk(p.children);
  });
  scene.slides.forEach((s) => walk(s.primitives));
  return [...names];
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function requireFlag(flags, key) {
  if (!flags[key]) fail(`Missing required --${key}`);
  return flags[key];
}

function rsvgConvert(svgString, outPng) {
  const rsvg = which('rsvg-convert');
  if (!rsvg) return false;
  const tmp = `${outPng}.tmp.svg`;
  fs.writeFileSync(tmp, svgString);
  const r = spawnSync(rsvg, ['-o', outPng, tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  if (r.status !== 0) return false;
  return true;
}

function renderPreviews(scene, outDir) {
  ensureDir(outDir);
  const svgs = renderSvg(scene);
  const pngCount = [];
  scene.slides.forEach((s, i) => {
    const base = `slide-${String(i + 1).padStart(2, '0')}`;
    fs.writeFileSync(path.join(outDir, `${base}.svg`), svgs[i]);
    if (rsvgConvert(svgs[i], path.join(outDir, `${base}.png`))) pngCount.push(base);
  });
  const sheet = contactSheet(scene, { cols: 3 });
  fs.writeFileSync(path.join(outDir, 'contact-sheet.svg'), sheet);
  const sheetPng = path.join(outDir, 'contact-sheet.png');
  const sheetOk = rsvgConvert(sheet, sheetPng);
  return { outDir, slidePngs: pngCount.length, contactSheet: sheetOk ? sheetPng : null };
}

async function renderPptxExternal(pptx, outDir) {
  ensureDir(outDir);
  const soffice = which('soffice') || which('libreoffice');
  if (!soffice) return { rendered: false, tool: null, outDir };
  const r = spawnSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, pptx], { encoding: 'utf8' });
  if (r.status !== 0) return { rendered: false, tool: 'libreoffice', outDir, error: r.stderr };
  return { rendered: true, tool: 'libreoffice', outDir };
}

function isBeamerRequest(flags, output) {
  if (flags.renderer) return flags.renderer === 'beamer';
  if (flags.format) return flags.format === 'beamer';
  if (output) return /\.pdf$/i.test(output);
  return true; // Beamer is the default presentation renderer.
}

async function cmdBuildBeamer(flags, input, output) {
  const spec = loadData(input);
  const v = validateData('slide_spec', spec);
  if (!v.ok) {
    console.error('slide_spec schema errors:');
    v.errors.forEach((e) => console.error(`  ${e.path}: ${e.message}`));
    process.exit(1);
  }
  const root = path.join(__dirname, '..');
  const absOut = path.resolve(output);
  const buildDir = flags['build-dir'] || path.join(path.dirname(absOut), `${path.basename(absOut, '.pdf')}-build`);
  const res = await buildBeamer(spec, {
    output,
    specDir: path.dirname(path.resolve(input)),
    buildDir,
    engine: flags.engine,
    handout: flags['no-handout'] ? false : true,
  });
  const errors = res.findings.filter((f) => f.level === 'error');
  const warnings = res.findings.filter((f) => f.level === 'warning');
  res.findings.forEach((f) => console.log(`[${f.level}] ${f.check}: ${f.message}`));
  console.log(`Built ${spec.slides.length} slides -> ${output} (template ${res.manifest.template.name} v${res.manifest.template.version}, engine ${res.engine}, ${res.presentation.pages || '?'} pages)`);
  if (res.handout && res.handout.ok) console.log(`Handout -> ${res.handout.pdf} (${res.handout.pages || '?'} pages)`);
  console.log(`LaTeX source -> ${buildDir} (main entry ${path.join(buildDir, 'presentation.tex')})`);
  if (flags.preview || flags['render-pages']) {
    const dir = flags.preview || path.join(path.dirname(absOut), `${path.basename(absOut, '.pdf')}-pages`);
    const pages = renderPdfPages(output, dir, { dpi: Number(flags.dpi || 110) });
    if (pages.ok) {
      const sheet = makeContactSheet(root, dir, path.join(dir, 'contact-sheet.png'), { cols: Number(flags.cols || 3) });
      console.log(`Page renders -> ${dir} (${pages.pages} PNG${sheet.ok ? ', contact sheet' : ''})`);
    } else {
      console.log(`Page renders unavailable: ${pages.reason}`);
    }
  }
  if (errors.length) process.exit(1);
  return { spec, res, findings: res.findings, errors, warnings };
}

async function cmdBuild(flags) {
  const input = requireFlag(flags, 'input');
  const output = flags.output || (isBeamerRequest(flags, null) ? 'out.pdf' : 'out.pptx');
  if (isBeamerRequest(flags, output)) return cmdBuildBeamer(flags, input, output);
  const spec = loadData(input);
  const v = validateData('slide_spec', spec);
  if (!v.ok) {
    console.error('slide_spec schema errors:');
    v.errors.forEach((e) => console.error(`  ${e.path}: ${e.message}`));
    process.exit(1);
  }
  const scene = buildScene(spec);
  await writePptx(scene, output, { author: spec.deck.project || 'weekly-research-slides' });
  console.log(`Built ${scene.slides.length} slides -> ${output}`);

  if (flags.motion) {
    const motion = loadData(flags.motion);
    const vv = validateData('motion_spec', motion);
    if (!vv.ok) {
      console.error('motion_spec schema errors:');
      vv.errors.forEach((e) => console.error(`  ${e.path}: ${e.message}`));
      process.exit(1);
    }
    const anim = output.replace(/\.pptx$/i, '') + '-animated.pptx';
    const rep = await applyMotion(output, motion, anim);
    console.log(`Motion injected -> ${anim}`);
    rep.slides.forEach((s) => console.log(`  slide ${s.slide}: ${s.animated} object(s)` + (s.missing.length ? ` (missing: ${s.missing.join(', ')})` : '')));
  }
  if (flags.scene) fs.writeFileSync(flags.scene, JSON.stringify(scene, null, 2));
  if (flags.preview) {
    const r = renderPreviews(scene, flags.preview);
    console.log(`Previews -> ${r.outDir} (${r.slidePngs} PNG${r.contactSheet ? ', contact sheet' : ''})`);
  }
  return scene;
}

async function cmdQa(flags) {
  const input = requireFlag(flags, 'input');
  const findings = [];
  let spec = null;
  let scene = null;
  if (flags.spec) {
    spec = loadData(flags.spec);
    scene = buildScene(spec);
  }
  if (input.endsWith('.pptx')) {
    const expected = flags['expect-names'] && scene ? deriveExpectedNames(scene) : undefined;
    const res = await qaPptx(input, { spec, expectedNames: expected });
    findings.push(...res.findings);
  }
  if (input.endsWith('.pdf')) {
    if (!fs.existsSync(input)) fail(`missing ${input}`);
    const pages = pdfPageCount(input);
    if (pages === null) findings.push({ level: 'warning', check: 'beamer-pdf', message: 'pdfinfo unavailable; page count not verified' });
    else if (pages < 1) findings.push({ level: 'error', check: 'beamer-pdf', message: 'PDF has no pages' });
    else findings.push({ level: 'info', check: 'beamer-pdf', message: `${pages} page(s)` });
    const buildDir = flags['build-dir'] || path.join(path.dirname(path.resolve(input)), `${path.basename(input, '.pdf')}-build`);
    const log = path.join(buildDir, 'presentation.log');
    if (fs.existsSync(log)) findings.push(...parseLatexLog(fs.readFileSync(log, 'utf8')).findings);
    else findings.push({ level: 'warning', check: 'beamer-log', message: `no compile log at ${log}; run wrs build first` });
  }
  if (spec) {
    findings.push(...qaScience(spec, { weeklyDelta: flags.delta ? loadData(flags.delta) : null }));
    findings.push(...qaScene(scene));
    findings.push(...qaContinuity(scene));
  }
  if (!spec && !input.endsWith('.pptx') && !input.endsWith('.pdf')) fail('--input must be a .pptx/.pdf or provide --spec');

  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warning');
  const report = {
    input,
    spec: flags.spec || null,
    generated_at: new Date().toISOString(),
    counts: { errors: errors.length, warnings: warnings.length },
    findings,
  };
  if (flags.report) fs.writeFileSync(flags.report, JSON.stringify(report, null, 2));
  findings.forEach((f) => console.log(`[${f.level}] ${f.check}${f.slide ? ` slide=${f.slide}` : ''}${f.object ? ` (${f.object})` : ''}: ${f.message}`));
  console.log(`QA: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(errors.length ? 1 : 0);
}

function cmdScene(flags) {
  const input = requireFlag(flags, 'input');
  const spec = loadData(input);
  const scene = buildScene(spec);
  if (flags.output) {
    if (flags.format === 'svg') fs.writeFileSync(flags.output, renderSvg(scene).join('\n'));
    else fs.writeFileSync(flags.output, JSON.stringify(scene, null, 2));
  } else {
    console.log(JSON.stringify(scene, null, 2));
  }
}

async function cmdRender(flags) {
  const input = flags.input || flags.spec;
  if (!input) fail('Provide --input <slide_spec.yaml> or --input <deck.pptx|deck.pdf>');
  const outDir = flags.output || 'preview';
  if (input.endsWith('.pdf')) {
    const r = renderPdfPages(input, outDir, { dpi: Number(flags.dpi || 110) });
    if (!r.ok) fail(`PDF page render failed: ${r.reason}`);
    const root = path.join(__dirname, '..');
    const sheet = makeContactSheet(root, outDir, path.join(outDir, 'contact-sheet.png'), { cols: Number(flags.cols || 3) });
    console.log(`Rendered ${r.pages} PDF page(s) -> ${outDir}${sheet.ok ? ' (contact sheet)' : ''}`);
    return;
  }
  if (input.endsWith('.pptx')) {
    const r = await renderPptxExternal(input, outDir);
    if (r.rendered) console.log(`Rendered PPTX with ${r.tool} -> ${r.outDir}`);
    else console.log(`No PPTX rasterizer found (LibreOffice/soffice). Build succeeded; preview dependency missing. Use --input <slide_spec.yaml> for source previews.`);
    return;
  }
  const spec = loadData(input);
  const scene = buildScene(spec);
  const r = renderPreviews(scene, outDir);
  console.log(`Source previews -> ${r.outDir} (${r.slidePngs} PNG${r.contactSheet ? `, contact sheet ${path.basename(r.contactSheet)}` : ''})`);
}

async function cmdInspect(flags) {
  const input = requireFlag(flags, 'input');
  const info = await inspectPptx(input);
  if (flags.json) { console.log(JSON.stringify(info, null, 2)); return; }
  console.log(`${path.basename(input)}: ${info.slideCount} slides, ${info.slideWidth}x${info.slideHeight}in`);
  info.slides.forEach((s) => {
    console.log(`\nSlide ${s.number} (${s.shapes.length} shapes)`);
    s.shapes.forEach((sh) => {
      const txt = sh.text ? ` "${sh.text.replace(/\n/g, ' / ').slice(0, 48)}"` : '';
      console.log(`  [${sh.type}${sh.prst ? `/${sh.prst}` : ''}] ${sh.name} (${sh.x},${sh.y},${sh.w}x${sh.h})${txt}`);
    });
  });
}

async function cmdEdit(flags) {
  const input = requireFlag(flags, 'input');
  const opsFile = requireFlag(flags, 'ops');
  const output = flags.output || input.replace(/\.pptx$/i, '-edited.pptx');
  const res = await editPptx(input, opsFile, output);
  console.log(`Edited ${res.applied.length} slide(s) -> ${output}`);
  res.applied.forEach((a) => console.log(`  slide ${a.slide}: ${a.ops.join(', ')}`));
}

function cmdPlan(flags) {
  const stateFile = requireFlag(flags, 'state');
  const state = loadData(stateFile);
  const delta = flags.delta ? loadData(flags.delta) : null;
  const sb = planStoryboard(state, delta, { stage: flags.stage });
  const out = flags.output || null;
  const text = dumpData(sb);
  if (out) { fs.writeFileSync(out, text); console.log(`Storyboard -> ${out} (${sb.slides.length} slides, stage ${sb.deck.stage})`); }
  else process.stdout.write(text);
}

function cmdDiff(flags) {
  const prev = flags.prev ? loadData(flags.prev) : null;
  const curr = loadData(requireFlag(flags, 'curr'));
  const delta = diffStates(prev, curr, { headline: flags.headline, question: flags.question });
  const text = dumpData(delta);
  if (flags.output) { fs.writeFileSync(flags.output, text); console.log(`Weekly delta -> ${flags.output}`); }
  else process.stdout.write(text);
}

function cmdValidate(flags) {
  const file = requireFlag(flags, 'input');
  const schema = requireFlag(flags, 'schema');
  const data = loadData(file);
  const v = validateData(schema, data);
  if (v.ok) { console.log(`OK: ${file} matches ${schema}`); return; }
  console.error(`INVALID: ${file}`);
  v.errors.forEach((e) => console.error(`  ${e.path}: ${e.message}`));
  process.exit(1);
}

function cmdDoctor() {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  console.log(`weekly-research-slides ${pkg.version}`);
  console.log(`  node: ${process.version} ${nodeMajor >= 18 ? 'OK' : 'TOO OLD (need >=18)'}`);
  console.log(`  platform: ${process.platform}`);
  console.log('  dependencies:');
  for (const dep of Object.keys(pkg.dependencies)) {
    let ver = 'missing';
    try {
      const p = path.join(__dirname, '..', 'node_modules', dep, 'package.json');
      ver = JSON.parse(fs.readFileSync(p, 'utf8')).version;
    } catch (e) { /* ignore */ }
    console.log(`    ${dep}: ${ver}`);
  }
  const optional = [
    ['soffice (LibreOffice)', which('soffice') || which('libreoffice'), 'native PPTX rasterization for render/visual QA'],
    ['rsvg-convert', which('rsvg-convert'), 'SVG -> PNG source previews and contact sheets'],
    ['pdftoppm (Poppler)', which('pdftoppm'), 'PDF -> PNG when LibreOffice is used'],
    ['python3', which('python3'), 'optional, not required by the default pipeline'],
  ];
  console.log('  optional tools:');
  optional.forEach(([name, bin, why]) => console.log(`    ${name}: ${bin || 'not found'}${bin ? '' : `  (optional: ${why})`}`));
  const latex = texDoctor();
  console.log('  latex (beamer renderer, default output):');
  console.log(`    engine: ${latex.engine || 'not found'} ${latex.ok ? 'OK' : 'MISSING (install TeX Live or TinyTeX)'}`);
  ['pdflatex', 'lualatex', 'latexmk', 'pdftoppm', 'pdfinfo'].forEach((t) => {
    console.log(`    ${t}: ${latex.tools[t] || 'not found'}`);
  });
  console.log(`    beamer.cls: ${latex.packages['beamer.cls'] ? 'OK' : 'MISSING'}`);
  if (latex.missing.length) console.log(`    missing packages: ${latex.missing.join(', ')}`);
  const schemaDir = path.join(__dirname, '..', 'schemas');
  console.log(`  schemas: ${fs.readdirSync(schemaDir).length} (${fs.readdirSync(schemaDir).join(', ')})`);
  console.log('  stages:', Object.keys(STAGE_MODULES).join(', '));
}

async function cmdCritique(flags) {
  const input = requireFlag(flags, 'input');
  const output = flags.output || input.replace(/\.ya?ml$/i, '') + '.revised.yaml';
  const renderer = flags.renderer || 'pptx';
  const deck = flags.deck || (renderer === 'beamer' ? 'out.pdf' : 'out.pptx');
  const qaDir = flags['qa-dir'] || path.join(path.dirname(output), 'qa');
  const maxCycles = Number(flags['max-cycles'] || 3);
  const render = flags['no-render'] ? false : true;
  const spec = loadData(input);
  const v = validateData('slide_spec', spec);
  if (!v.ok) {
    console.error('slide_spec schema errors:');
    v.errors.forEach((e) => console.error(`  ${e.path}: ${e.message}`));
    process.exit(1);
  }
  const { runCritiqueLoop } = require('./critics/loop');
  const root = path.join(__dirname, '..');
  [output, deck, qaDir].forEach((f) => ensureDir(path.dirname(path.resolve(f))));
  const res = await runCritiqueLoop({
    root, spec, qaDir, deckOut: deck, maxCycles, render, renderer,
    specDir: path.dirname(path.resolve(input)),
    buildDir: flags['build-dir'] || path.join(path.dirname(path.resolve(deck)), `${path.basename(deck).replace(/\.[^.]+$/, '')}-build`),
  });
  fs.writeFileSync(output, dumpData(res.spec));
  console.log(`critique loop (${renderer}): ${res.cycles.length} cycle(s), deck -> ${deck}`);
  res.cycles.forEach((c) => console.log(`  cycle ${c.cycle}: ${c.applied} change(s), ${c.hardFailures} hard failure(s), ${c.unresolvedHigh} unresolved high`));
  const m = res.metrics;
  console.log(`  slides ${m.slide_count}, visible words ${m.total_visible_words}, note/visible ${m.note_to_visible_ratio}, max layout streak ${m.max_repeated_layout_streak}`);
  console.log(`  revised source -> ${output}`);
  console.log(`  reviews -> ${qaDir}/{content,visual,deck}_review.json, revision_log.md`);
  process.exit(res.hardFailures.length ? 1 : 0);
}

function printFigureFindings(findings) {
  findings.forEach((f) => console.log(`[${f.level}] ${f.check}${f.figure ? ` figure=${f.figure}` : ''}${f.slide ? ` slide=${f.slide}` : ''}: ${f.message}${f.action ? ` -> ${f.action}` : ''}`));
}

function cmdRoute(flags) {
  const input = requireFlag(flags, 'input');
  const { spec, kind } = loadFigureInput(input);
  const decision = routeFigure(spec, { backend: flags.backend || 'auto' });
  if (flags.output) fs.writeFileSync(flags.output, JSON.stringify(decision, null, 2));
  if (flags.json) { console.log(JSON.stringify(decision, null, 2)); return; }
  console.log(`${path.basename(input)} (${kind}) -> ${decision.selected}${decision.explicit ? ' (explicit)' : ''}`);
  decision.reason.forEach((r) => console.log(`  - ${r}`));
}

function cmdTikz(flags) {
  const input = requireFlag(flags, 'input');
  const { spec, kind } = loadFigureInput(input);
  if (flags['width-cm']) {
    spec.figure = spec.figure || {};
    spec.figure.rendering = { ...(spec.figure.rendering || {}), width_cm: Number(flags['width-cm']) };
  }
  const routed = routeFigure(spec, { backend: flags.backend || 'auto' });
  if (routed.selected !== 'tikz' && !flags.force) {
    console.log(`router selected '${routed.selected}': ${routed.reason.join('; ')}`);
    console.log('pass --force to render with TikZ anyway, or --backend tikz to make it explicit');
    process.exit(1);
  }
  const decision = routed.selected === 'tikz' ? routed : routeFigure(spec, { backend: 'tikz' });
  const rendered = renderFigureTex(spec, { decision });
  const out = flags.output || `${(spec.figure && spec.figure.id) || 'figure'}.tex`;
  fs.writeFileSync(out, rendered.tex);
  const findings = [...validateFigure(spec, rendered.plan), ...critiqueTikz(spec, rendered.plan)];
  printFigureFindings(findings);
  console.log(`tikz -> ${out} (${kind}, archetype ${rendered.plan.archetype}, ${rendered.plan.nodes.length} nodes, ${rendered.plan.edges.length} edges)`);
  if (flags.standalone) {
    const dir = flags.standalone === true ? path.dirname(path.resolve(out)) : flags.standalone;
    const st = exportStandalone(spec, dir, { mode: flags.mode || 'presentation' });
    console.log(st.ok ? `standalone PDF -> ${st.pdf} (mode ${flags.mode || 'presentation'})` : `standalone compile failed: ${st.reason}`);
    if (!st.ok) process.exit(1);
  }
  if (findings.some((f) => f.level === 'error')) process.exit(1);
}

function cmdTikzQa(flags) {
  const input = requireFlag(flags, 'input');
  const outDir = flags['output-dir'] || 'tikz-qa';
  ensureDir(outDir);
  const root = path.join(__dirname, '..');
  const { spec, kind } = loadFigureInput(input);
  const routed = routeFigure(spec, { backend: flags.backend || 'auto' });
  const decision = routed.selected === 'tikz' ? routed : routeFigure(spec, { backend: 'tikz' });
  const rendered = renderFigureTex(spec, { decision });
  const figureId = (spec.figure && spec.figure.id) || 'figure';
  fs.writeFileSync(path.join(outDir, `${figureId}.tex`), rendered.tex);
  let findings = [...validateFigure(spec, rendered.plan), ...critiqueTikz(spec, rendered.plan)];
  let images = null;
  let pdf = null;
  if (flags.render !== false) {
    const st = exportStandalone(spec, path.join(outDir, 'render'), { mode: flags.mode || 'presentation' });
    pdf = st.pdf;
    if (st.ok) {
      const pages = renderPdfPages(st.pdf, path.join(outDir, 'render'), { dpi: Number(flags.dpi || 150) });
      if (pages.ok) {
        const im = analyzeImages(root, path.join(outDir, 'render'));
        images = im.ok ? im.images : null;
        if (images) findings = [...findings, ...critiqueTikz(spec, rendered.plan, { images })];
      }
    } else {
      findings.push({ level: 'error', check: 'standalone-compile', message: st.reason || 'standalone compile failed' });
    }
  }
  printFigureFindings(findings);
  const errors = findings.filter((f) => f.level === 'error');
  const actions = findings.filter((f) => f.action);
  fs.writeFileSync(path.join(outDir, 'tikz_qa.json'), JSON.stringify({
    input, kind, decision,
    archetype: rendered.plan.archetype,
    nodes: rendered.plan.nodes.length, edges: rendered.plan.edges.length,
    width_cm: rendered.plan.width, height_cm: rendered.plan.height,
    render_pdf: pdf, images: images || [], findings,
  }, null, 2));
  fs.writeFileSync(path.join(outDir, 'defect-log.md'), [
    '# TikZ defect log', '',
    `input: ${input}`, `archetype: ${rendered.plan.archetype}`,
    `backend: ${decision.selected} (${decision.reason.join('; ')})`, '',
    '## Findings', '',
    ...findings.map((f) => `- [${f.level}] **${f.check}** — ${f.message}${f.action ? ` _(action: ${f.action})_` : ''}`),
    '', '## Actions requested', '',
    ...(actions.length ? actions.map((f) => `- \`${f.action}\`: ${f.message}`) : ['- none']),
    '',
  ].join('\n'));
  console.log(`tikz qa -> ${outDir}/tikz_qa.json, defect-log.md (${errors.length} error(s))`);
  process.exit(errors.length ? 1 : 0);
}

async function cmdDemoFigures(flags) {
  const root = path.join(__dirname, '..');
  const ex = path.join(root, 'examples', 'diagram-backends');
  const outDir = path.join(ex, 'output');
  ensureDir(outDir);
  const slideFile = path.join(ex, 'slide_spec.yaml');
  const spec = loadData(slideFile);
  console.log('== mixed-renderer beamer build ==');
  const pdfOut = path.join(outDir, 'diagram-backends.pdf');
  const beamer = await buildBeamer(spec, {
    output: pdfOut,
    specDir: ex,
    buildDir: path.join(outDir, 'beamer-build'),
    handout: true,
  });
  printFigureFindings(beamer.findings);
  const errors = beamer.findings.filter((f) => f.level === 'error');
  console.log(`Built ${spec.slides.length} slides -> ${pdfOut} (${beamer.presentation.pages || '?'} pages)`);
  if (beamer.handout && beamer.handout.ok) console.log(`Handout -> ${beamer.handout.pdf} (${beamer.handout.pages || '?'} pages)`);
  console.log('figures:');
  (beamer.manifest.figures || []).forEach((f) => console.log(`  - ${f.key}: ${f.backend} (${(f.decision && f.decision.reason || []).join('; ')})`));
  const pagesDir = path.join(outDir, 'pages');
  const pages = renderPdfPages(pdfOut, pagesDir, { dpi: 110 });
  let sheetOk = false;
  if (pages.ok) {
    const sheet = makeContactSheet(root, pagesDir, path.join(pagesDir, 'contact-sheet.png'), { cols: 3 });
    sheetOk = sheet.ok;
    console.log(`Page renders -> ${pagesDir} (${pages.pages} PNG${sheetOk ? ', contact sheet' : ''})`);
  } else {
    console.log(`Page renders unavailable: ${pages.reason}`);
  }
  console.log('== standalone figures ==');
  const figureOutputs = [];
  for (const fig of figureEntries(spec)) {
    const resolved = require('./renderers/figure').resolveFigureSpec(fig, ex);
    if (!resolved) continue;
    const dir = path.join(outDir, 'figures', fig.key);
    const st = exportStandalone(resolved.spec, dir, { mode: 'presentation' });
    figureOutputs.push({ key: fig.key, backend: 'tikz', pdf: st.ok ? st.pdf : null, ok: st.ok });
    console.log(st.ok ? `  - ${fig.key}: ${st.pdf}` : `  - ${fig.key}: compile failed (${st.reason})`);
  }
  fs.writeFileSync(path.join(outDir, 'renderer_report.json'), JSON.stringify({
    deck: path.basename(slideFile),
    template: beamer.manifest.template,
    figures: beamer.manifest.figures,
    standalone: figureOutputs,
    pages: beamer.presentation.pages,
    contact_sheet: sheetOk ? path.join(pagesDir, 'contact-sheet.png') : null,
    findings: beamer.findings,
  }, null, 2));
  if (errors.length) process.exit(1);
}

async function cmdDemo(flags) {
  const root = path.join(__dirname, '..');
  const ex = path.join(root, 'examples', 'diagnostic-week');
  const outDir = path.join(ex, 'output');
  ensureDir(outDir);
  console.log('== build ==');
  const scene = await cmdBuild({
    input: path.join(ex, 'slide_spec.yaml'),
    output: path.join(outDir, 'demo-weekly-research-slides.pptx'),
    motion: path.join(ex, 'motion_spec.yaml'),
    preview: path.join(outDir, 'preview'),
  });
  console.log('== qa ==');
  const findings = [
    ...(await qaPptx(path.join(outDir, 'demo-weekly-research-slides.pptx'), {
      spec: loadData(path.join(ex, 'slide_spec.yaml')),
      expectedNames: deriveExpectedNames(scene),
    })).findings,
    ...qaScience(loadData(path.join(ex, 'slide_spec.yaml')), { weeklyDelta: loadData(path.join(ex, 'weekly_delta.yaml')) }),
    ...qaScene(scene),
    ...qaContinuity(scene),
  ];
  const errors = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warning');
  findings.forEach((f) => console.log(`[${f.level}] ${f.check}${f.slide ? ` slide=${f.slide}` : ''}${f.object ? ` (${f.object})` : ''}: ${f.message}`));
  fs.writeFileSync(path.join(outDir, 'qa_report.json'), JSON.stringify({
    counts: { errors: errors.length, warnings: warnings.length, info: findings.length - errors.length - warnings.length },
    findings,
  }, null, 2));
  console.log(`QA: ${errors.length} error(s), ${warnings.length} warning(s)`);

  console.log('== beamer build (default renderer) ==');
  const pdfOut = path.join(outDir, 'demo-weekly-research-slides.pdf');
  const beamer = await buildBeamer(loadData(path.join(ex, 'slide_spec.yaml')), {
    output: pdfOut,
    specDir: ex,
    buildDir: path.join(outDir, 'beamer-build'),
    handout: true,
  });
  beamer.findings.forEach((f) => console.log(`[${f.level}] ${f.check}: ${f.message}`));
  const beamerErrors = beamer.findings.filter((f) => f.level === 'error');
  console.log(`Built ${beamer.manifest.slides} slides -> ${pdfOut} (template ${beamer.manifest.template.name} v${beamer.manifest.template.version}, engine ${beamer.engine}, ${beamer.presentation.pages || '?'} pages)`);
  if (beamer.handout && beamer.handout.ok) console.log(`Handout -> ${beamer.handout.pdf} (${beamer.handout.pages || '?'} pages)`);
  const pagesDir = path.join(outDir, 'beamer-pages');
  const pages = renderPdfPages(pdfOut, pagesDir, { dpi: 110 });
  let sheetOk = false;
  if (pages.ok) {
    const sheet = makeContactSheet(root, pagesDir, path.join(pagesDir, 'contact-sheet.png'), { cols: 3 });
    sheetOk = sheet.ok;
    console.log(`Page renders -> ${pagesDir} (${pages.pages} PNG${sheetOk ? ', contact sheet' : ''})`);
  } else {
    console.log(`Page renders unavailable: ${pages.reason}`);
  }
  fs.writeFileSync(path.join(outDir, 'beamer_qa.json'), JSON.stringify({
    template: beamer.manifest.template,
    engine: beamer.engine,
    pages: beamer.presentation.pages,
    handout_pages: beamer.handout ? beamer.handout.pages : null,
    page_renders: pages.ok ? pages.pages : 0,
    contact_sheet: sheetOk,
    findings: beamer.findings,
  }, null, 2));
  if (errors.length || beamerErrors.length) process.exit(1);
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  const cmd = positional[0] || 'help';
  switch (cmd) {
    case 'doctor': cmdDoctor(); break;
    case 'build': await cmdBuild(flags); break;
    case 'qa': await cmdQa(flags); break;
    case 'scene': cmdScene(flags); break;
    case 'render': await cmdRender(flags); break;
    case 'inspect': await cmdInspect(flags); break;
    case 'edit': await cmdEdit(flags); break;
    case 'plan': cmdPlan(flags); break;
    case 'diff': cmdDiff(flags); break;
    case 'validate': cmdValidate(flags); break;
    case 'critique': await cmdCritique(flags); break;
    case 'route': cmdRoute(flags); break;
    case 'tikz': cmdTikz(flags); break;
    case 'tikz:qa': cmdTikzQa(flags); break;
    case 'demo:figures': await cmdDemoFigures(flags); break;
    case 'demo': await cmdDemo(flags); break;
    default:
      console.log('weekly-research-slides CLI');
      console.log('  doctor   check runtime, optional tools and the LaTeX/Beamer stack');
      console.log('  build    --input slide_spec.yaml --output out.pdf [--renderer beamer|pptx] [--preview]');
      console.log('           beamer (default): .pdf output, template-driven LaTeX, handout + page renders');
      console.log('           pptx (legacy):    .pptx output [--motion m.yaml] [--preview dir] [--scene scene.json]');
      console.log('  qa       --input out.pdf|out.pptx [--spec slide_spec.yaml] [--delta weekly_delta.yaml] [--build-dir dir] [--report qa.json]');
      console.log('  render   --input slide_spec.yaml|deck.pptx|deck.pdf --output dir');
      console.log('  inspect  --input deck.pptx [--json]');
      console.log('  edit     --input deck.pptx --ops ops.yaml --output deck2.pptx');
      console.log('  plan     --state state.yaml [--delta delta.yaml] [--stage diagnostic] [--output storyboard.yaml]');
      console.log('  diff     --prev state_prev.yaml --curr state_curr.yaml [--output weekly_delta.yaml]');
      console.log('  scene    --input slide_spec.yaml [--output scene.json|--format svg]');
      console.log('  validate --schema slide_spec --input file.yaml');
      console.log('  critique --input slide_spec.yaml --output revised.yaml --deck out.pdf [--renderer beamer] [--qa-dir qa] [--max-cycles 3] [--no-render]');
      console.log('  route    --input figure_spec.yaml|figure.ir.json [--backend auto|tikz|drawio|python|manim] [--json]');
      console.log('  tikz     --input figure_spec.yaml|figure.ir.json [--output figure.tex] [--standalone dir] [--mode paper|presentation] [--width-cm N]');
      console.log('  tikz:qa  --input figure_spec.yaml|figure.ir.json [--output-dir dir] [--render]');
      console.log('  demo:figures  build the mixed-renderer deck (Beamer + TikZ + Draw.io) and standalone figures');
      console.log('  (all commands accept --style academic-beamer|academic-metropolis|paper-figure|dark-explainer)');
      console.log('  demo     build + qa the bundled example');
  }
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
