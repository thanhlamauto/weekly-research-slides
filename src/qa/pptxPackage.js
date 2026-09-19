'use strict';

const { inspectPptx } = require('../pptx/inspect');

const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|placeholder)\b/i;
// Semantic object families that object permanence / motion rely on.
const SEMANTIC = /^(concept-|claim-|diag-|stage-|method-|bench-|gap-|land-|fs-|title-|motif-|kicker|subtitle|title-main|q-|cm-|mhl-|exp-|claimdelta-|interp-|lim-|recap-|problem-|mot-)/;

async function qaPptx(file, opts = {}) {
  const findings = [];
  const add = (level, slide, object, message) => findings.push({ level, check: 'pptx-package', slide: slide || null, object: object || null, message });

  let info;
  try {
    info = await inspectPptx(file);
  } catch (err) {
    add('error', null, null, `Cannot open PPTX package: ${err.message}`);
    return { findings, info: null };
  }

  if (!info.hasContentTypes) add('error', null, null, '[Content_Types].xml missing; not a valid OOXML package');
  if (info.slideCount === 0) add('error', null, null, 'No slides found in package');

  if (opts.spec && Array.isArray(opts.spec.slides)) {
    if (info.slideCount !== opts.spec.slides.length) {
      add('error', null, null, `Expected ${opts.spec.slides.length} slides, found ${info.slideCount}`);
    }
  }

  const names = new Set();
  for (const sl of info.slides) {
    for (const sh of sl.shapes) {
      if (sh.name) names.add(sh.name);
      if (PLACEHOLDER.test(sh.text || '')) add('error', sl.number, sh.name, 'Placeholder text detected in PPTX');
      const hasBox = [sh.x, sh.y, sh.w, sh.h].every((v) => typeof v === 'number');
      if (hasBox) {
        if (sh.x < -0.02 || sh.y < -0.02 || sh.x + sh.w > info.slideWidth + 0.02 || sh.y + sh.h > info.slideHeight + 0.02) {
          add('error', sl.number, sh.name, `Native object out of bounds (${sh.x},${sh.y},${sh.w}x${sh.h})`);
        }
      }
    }
    const semanticCount = sl.shapes.filter((s) => SEMANTIC.test(s.name || '')).length;
    if (semanticCount < 2) add('warning', sl.number, null, 'Few semantically named objects on this slide');
  }

  if (Array.isArray(opts.expectedNames)) {
    for (const n of opts.expectedNames) {
      if (!names.has(n)) add('error', null, n, `Expected semantic object "${n}" not found in PPTX`);
    }
  }

  return { findings, info };
}

module.exports = { qaPptx, SEMANTIC };
