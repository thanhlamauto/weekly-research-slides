'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { renderSvg, contactSheet } = require('./svgRenderer');

function rsvgConvert(svgString, outPng) {
  const r = spawnSync('which', ['rsvg-convert'], { encoding: 'utf8' });
  const rsvg = r.status === 0 ? r.stdout.trim() : null;
  if (!rsvg) return false;
  const tmp = `${outPng}.tmp.svg`;
  fs.writeFileSync(tmp, svgString);
  const conv = spawnSync(rsvg, ['-o', outPng, tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  return conv.status === 0;
}

// Render per-slide SVGs (+ PNGs when rsvg-convert is available) and a contact
// sheet. Returns the image paths the visual/deck critics inspect.
function renderSlidePreviews(scene, outDir, opts = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const svgs = renderSvg(scene);
  const pngs = [];
  const svgFiles = [];
  scene.slides.forEach((s, i) => {
    const base = `slide-${String(i + 1).padStart(2, '0')}`;
    const svgFile = path.join(outDir, `${base}.svg`);
    fs.writeFileSync(svgFile, svgs[i]);
    svgFiles.push({ id: s.id, file: svgFile });
    const pngFile = path.join(outDir, `${base}.png`);
    if (rsvgConvert(svgs[i], pngFile)) pngs.push({ id: s.id, file: pngFile });
  });
  const sheetSvg = contactSheet(scene, { cols: opts.cols || 3 });
  fs.writeFileSync(path.join(outDir, 'contact-sheet.svg'), sheetSvg);
  const sheetPng = path.join(outDir, 'contact-sheet.png');
  const contactSheetPng = rsvgConvert(sheetSvg, sheetPng) ? sheetPng : null;
  return { dir: outDir, pngs, svgs: svgFiles, contactSheet: contactSheetPng };
}

module.exports = { renderSlidePreviews, rsvgConvert };
