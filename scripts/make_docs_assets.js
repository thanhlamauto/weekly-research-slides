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
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#FFFFFF" stroke="#111827" stroke-width="2.5"/>`
    + `<text x="${cx}" y="${cy + 7}" font-family="Helvetica, Arial" font-size="22" font-weight="700" fill="#111827" text-anchor="middle">${label}</text>`
    + (sub ? `<text x="${cx}" y="${cy + r + 26}" font-family="Helvetica, Arial" font-size="15" fill="#6B7280" text-anchor="middle">${sub}</text>` : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`
    + `<rect x="0" y="0" width="12" height="${H}" fill="#2563EB"/>`
    + `<text x="90" y="120" font-family="Helvetica, Arial" font-size="20" font-weight="700" fill="#2563EB">AGENT SKILL · ALPHA v0.1</text>`
    + `<text x="90" y="210" font-family="Helvetica, Arial" font-size="66" font-weight="800" fill="#111827">weekly-research-slides</text>`
    + `<text x="90" y="272" font-family="Helvetica, Arial" font-size="27" fill="#374151">Turn weekly changes in methods, evidence, claims, and</text>`
    + `<text x="90" y="312" font-family="Helvetica, Arial" font-size="27" fill="#374151">diagnostics into editable PowerPoint research updates.</text>`
    + `<text x="90" y="390" font-family="Helvetica, Arial" font-size="19" fill="#6B7280">delta-first · stage-adaptive · claim + diagnostic tracking · native, editable objects</text>`
    + node(1160, 210, 62, 'Z_s', 'cached source')
    + node(1440, 210, 62, 'Z~', 'corrected')
    + node(1300, 80, 62, 'Z_d', 'desired future')
    + `<line x1="1222" y1="210" x2="1378" y2="210" stroke="#B91C1C" stroke-width="7" marker-end="url(#a)"/>`
    + `<line x1="1300" y1="142" x2="1300" y2="118" stroke="#9CA3AF" stroke-width="2" stroke-dasharray="7 6"/>`
    + `<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#B91C1C"/></marker></defs>`
    + `<text x="1230" y="300" font-family="Helvetica, Arial" font-size="17" font-weight="700" fill="#B91C1C">correction ΔZ</text>`
    + `<text x="1300" y="390" font-family="Helvetica, Arial" font-size="16" fill="#6B7280" text-anchor="middle">one story per week, tracked across weeks</text>`
    + `</svg>`;
}

function architectureSvg() {
  const stages = [
    ['research_state.yaml', '#F1F5F9', '#64748B'],
    ['+ weekly material', '#F1F5F9', '#64748B'],
    ['weekly_delta.yaml', '#EAF1FE', '#2563EB'],
    ['storyboard.yaml', '#EAF1FE', '#2563EB'],
    ['slide_spec.yaml', '#EAF1FE', '#2563EB'],
    ['editable PPTX', '#DCFCE7', '#047857'],
    ['+ optional motion', '#FEF3C7', '#B45309'],
    ['render + QA', '#EDE9FE', '#6D28D9'],
  ];
  const bw = 210; const bh = 84; const gap = 26; const x0 = 60; const y = 130;
  const W = x0 * 2 + stages.length * bw + (stages.length - 1) * gap;
  const boxes = stages.map(([label, fill, color], i) => {
    const x = x0 + i * (bw + gap);
    const arrow = i < stages.length - 1
      ? `<line x1="${x + bw}" y1="${y + bh / 2}" x2="${x + bw + gap}" y2="${y + bh / 2}" stroke="#9CA3AF" stroke-width="3" marker-end="url(#m)"/>`
      : '';
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="12" fill="${fill}" stroke="${color}" stroke-width="2"/>`
      + `<text x="${x + bw / 2}" y="${y + bh / 2 + 7}" font-family="Helvetica, Arial" font-size="20" font-weight="700" fill="#111827" text-anchor="middle">${esc(label)}</text>`
      + arrow;
  }).join('');
  const H = 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`
    + `<text x="${x0}" y="66" font-family="Helvetica, Arial" font-size="30" font-weight="800" fill="#111827">Source-first pipeline</text>`
    + `<text x="${x0}" y="98" font-family="Helvetica, Arial" font-size="18" fill="#6B7280">Structured source is the truth. Fix the source and rebuild; never patch the generated PPTX.</text>`
    + boxes
    + `<defs><marker id="m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#9CA3AF"/></marker></defs>`
    + `<text x="${x0}" y="262" font-family="Helvetica, Arial" font-size="16" fill="#6B7280">read delta -> plan -> author -> build -> QA -> rebuild</text>`
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
  console.log(`Wrote docs/images assets: ${conversions.length} SVG, ${ok} PNG`);
}

main();
