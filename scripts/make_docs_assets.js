#!/usr/bin/env node
'use strict';

// Generate docs/images assets from source, deterministically.
// Requires rsvg-convert for PNG output; SVG is always written.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { loadData } = require('../src/model/validate');
const { buildScene } = require('../src/renderer/buildScene');
const { renderSvg, contactSheet } = require('../src/renderer/svgRenderer');

const ROOT = path.join(__dirname, '..');
const EX = path.join(ROOT, 'examples', 'diagnostic-week');
const OUT = path.join(ROOT, 'docs', 'images');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function png(svg, outPng) {
  const rsvg = spawnSync('which', ['rsvg-convert'], { encoding: 'utf8' }).stdout.trim();
  if (!rsvg) return false;
  const tmp = `${outPng}.tmp.svg`;
  fs.writeFileSync(tmp, svg);
  const r = spawnSync(rsvg, ['-o', outPng, tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  return r.status === 0;
}

function bannerSvg() {
  const W = 1600; const H = 520;
  const node = (cx, cy, r, label, sub) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#1A1A1A" stroke-width="2.5"/>`
    + `<text x="${cx}" y="${cy + 7}" font-family="Helvetica, Arial" font-size="22" font-weight="700" fill="#1A1A1A" text-anchor="middle">${label}</text>`
    + (sub ? `<text x="${cx}" y="${cy + r + 26}" font-family="Helvetica, Arial" font-size="15" fill="#6B6B6B" text-anchor="middle">${sub}</text>` : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`
    + `<rect x="0" y="0" width="12" height="${H}" fill="#245B78"/>`
    + `<text x="90" y="120" font-family="Helvetica, Arial" font-size="20" font-weight="700" fill="#245B78">AGENT SKILL · ALPHA v0.1</text>`
    + `<text x="90" y="210" font-family="Helvetica, Arial" font-size="66" font-weight="700" fill="#1A1A1A">weekly-research-slides</text>`
    + `<text x="90" y="272" font-family="Helvetica, Arial" font-size="27" fill="#3A3A3A">Turn weekly changes in methods, evidence, claims, and</text>`
    + `<text x="90" y="312" font-family="Helvetica, Arial" font-size="27" fill="#3A3A3A">diagnostics into template-driven Beamer PDF research updates.</text>`
    + `<text x="90" y="390" font-family="Helvetica, Arial" font-size="19" fill="#6B6B6B">delta-first · stage-adaptive · claim + diagnostic tracking · LaTeX Beamer + editable PPTX</text>`
    + node(1160, 210, 62, 'Z_s', 'cached source')
    + node(1440, 210, 62, 'Z~', 'corrected')
    + node(1300, 80, 62, 'Z_d', 'desired future')
    + `<line x1="1222" y1="210" x2="1378" y2="210" stroke="#9E3B32" stroke-width="7" marker-end="url(#a)"/>`
    + `<line x1="1300" y1="142" x2="1300" y2="118" stroke="#9B9B9B" stroke-width="2" stroke-dasharray="7 6"/>`
    + `<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#9E3B32"/></marker></defs>`
    + `<text x="1230" y="300" font-family="Helvetica, Arial" font-size="17" font-weight="700" fill="#9E3B32">correction ΔZ</text>`
    + `<text x="1300" y="390" font-family="Helvetica, Arial" font-size="16" fill="#6B6B6B" text-anchor="middle">one story per week, tracked across weeks</text>`
    + `</svg>`;
}

function architectureSvg() {
  const stages = [
    ['research_state.yaml', '#F6F6F4', '#6B6B6B'],
    ['+ weekly material', '#F6F6F4', '#6B6B6B'],
    ['weekly_delta.yaml', '#EAF1F4', '#245B78'],
    ['storyboard.yaml', '#EAF1F4', '#245B78'],
    ['slide_spec.yaml', '#EAF1F4', '#245B78'],
    ['Beamer PDF (default)', '#E9F1EC', '#2F6B4F'],
    ['+ editable PPTX', '#F6EDE3', '#A1602A'],
    ['compile + QA', '#EDEAF4', '#5B4B8A'],
  ];
  const bw = 210; const bh = 84; const gap = 26; const x0 = 60; const y = 130;
  const W = x0 * 2 + stages.length * bw + (stages.length - 1) * gap;
  const boxes = stages.map(([label, fill, color], i) => {
    const x = x0 + i * (bw + gap);
    const arrow = i < stages.length - 1
      ? `<line x1="${x + bw}" y1="${y + bh / 2}" x2="${x + bw + gap}" y2="${y + bh / 2}" stroke="#9B9B9B" stroke-width="3" marker-end="url(#m)"/>`
      : '';
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="6" fill="${fill}" stroke="${color}" stroke-width="2"/>`
      + `<text x="${x + bw / 2}" y="${y + bh / 2 + 7}" font-family="Helvetica, Arial" font-size="20" font-weight="700" fill="#1A1A1A" text-anchor="middle">${esc(label)}</text>`
      + arrow;
  }).join('');
  const H = 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`
    + `<text x="${x0}" y="66" font-family="Helvetica, Arial" font-size="30" font-weight="700" fill="#1A1A1A">Source-first pipeline</text>`
    + `<text x="${x0}" y="98" font-family="Helvetica, Arial" font-size="18" fill="#6B6B6B">Structured source is the truth. Fix the source and rebuild; never patch the generated PDF/PPTX.</text>`
    + boxes
    + `<defs><marker id="m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#9B9B9B"/></marker></defs>`
    + `<text x="${x0}" y="262" font-family="Helvetica, Arial" font-size="16" fill="#6B6B6B">read delta -> plan -> author -> build -> QA -> rebuild</text>`
    + `</svg>`;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const spec = loadData(path.join(EX, 'slide_spec.yaml'));
  const scene = buildScene(spec);
  const svgs = renderSvg(scene);

  fs.writeFileSync(path.join(OUT, 'banner.svg'), bannerSvg());
  fs.writeFileSync(path.join(OUT, 'architecture.svg'), architectureSvg());
  fs.writeFileSync(path.join(OUT, 'gallery-contact-sheet.svg'), contactSheet(scene, { cols: 3 }));
  const gallerySlides = [1, 4, 5, 6, 7, 9];
  for (const n of gallerySlides) {
    fs.writeFileSync(path.join(OUT, `gallery-slide-${String(n).padStart(2, '0')}.svg`), svgs[n - 1]);
  }

  const conversions = [
    ['banner.svg', 'banner.png'],
    ['architecture.svg', 'architecture.png'],
    ['gallery-contact-sheet.svg', 'gallery-contact-sheet.png'],
    ...gallerySlides.map((n) => [`gallery-slide-${String(n).padStart(2, '0')}.svg`, `gallery-slide-${String(n).padStart(2, '0')}.png`]),
  ];
  let ok = 0;
  for (const [src, dst] of conversions) {
    if (png(fs.readFileSync(path.join(OUT, src), 'utf8'), path.join(OUT, dst))) ok += 1;
    else console.warn(`  (rsvg-convert unavailable; wrote SVG only for ${dst})`);
  }

  // Beamer gallery: copy page renders produced by `npm run demo` (compiled PDF
  // -> pdftoppm), so the README shows the real default output.
  const beamerPages = path.join(EX, 'output', 'beamer-pages');
  const beamerAssets = [
    ['contact-sheet.png', 'beamer-contact-sheet.png'],
    ['slide-06.png', 'beamer-slide-06.png'],
  ];
  let beamerOk = 0;
  for (const [src, dst] of beamerAssets) {
    const from = path.join(beamerPages, src);
    if (fs.existsSync(from)) { fs.copyFileSync(from, path.join(OUT, dst)); beamerOk += 1; }
    else console.warn(`  (${from} missing; run npm run demo to refresh Beamer gallery assets)`);
  }

  // Diagram backends: mixed-renderer contact sheet + real TikZ figure renders
  // (standalone PDF -> pdftoppm). Never mockups.
  const diagramEx = path.join(ROOT, 'examples', 'diagram-backends');
  const diagramPages = path.join(diagramEx, 'output', 'pages', 'contact-sheet.png');
  let diagramOk = 0;
  if (fs.existsSync(diagramPages)) {
    fs.copyFileSync(diagramPages, path.join(OUT, 'diagram-backends-contact-sheet.png'));
    diagramOk += 1;
  } else {
    console.warn('  (examples/diagram-backends/output/pages/contact-sheet.png missing; run npm run demo:figures)');
  }
  const pdftoppm = spawnSync('which', ['pdftoppm'], { encoding: 'utf8' }).stdout.trim();
  for (const name of ['preimage_geometry', 'cached_vs_corrected', 'v3_v4']) {
    const pdf = path.join(diagramEx, 'output', 'figures', name, 'standalone.pdf');
    const png = path.join(OUT, `tikz-${name}.png`);
    if (!fs.existsSync(pdf)) { console.warn(`  (${pdf} missing; run npm run demo:figures)`); continue; }
    if (!pdftoppm) { console.warn('  (pdftoppm unavailable; TikZ figure PNGs not refreshed)'); continue; }
    const r = spawnSync(pdftoppm, ['-png', '-r', '160', '-singlefile', pdf, png.replace(/\.png$/, '')], { encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(png)) diagramOk += 1;
    else console.warn(`  (pdftoppm failed for ${name})`);
  }
  console.log(`Wrote docs/images assets: ${conversions.length} SVG, ${ok} PNG, ${beamerOk} Beamer render(s), ${diagramOk} diagram asset(s)`);
}

main();
