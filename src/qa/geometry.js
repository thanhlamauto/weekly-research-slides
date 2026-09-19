'use strict';

const { LAYOUT, FONT } = require('../renderer/theme');
const { boundsOf, walk } = require('../renderer/scene');
const { measureText } = require('../layouts/common');

const PLACEHOLDER = /\b(TODO|TBD|FIXME|lorem ipsum|placeholder|xxx+)\b/i;
const MIN_FONT = 9;
const OVERFLOW_TOL = 0.1;

function qaScene(scene) {
  const findings = [];
  const add = (level, slideId, objectId, message) => findings.push({ level, check: 'geometry', slide: slideId, object: objectId || null, message });

  scene.slides.forEach((sl) => {
    const ids = new Map();
    let textCount = 0;
    let contentObjects = 0;

    walk(sl.primitives, (p) => {
      if (!p || typeof p !== 'object' || !p.kind) {
        add('error', sl.id, null, 'Malformed primitive (missing kind); likely an un-spread helper array');
        return;
      }
      if (p.id) {
        if (ids.has(p.id)) add('error', sl.id, p.id, `Duplicate object id "${p.id}"`);
        ids.set(p.id, true);
      }
      const b = boundsOf(p);
      const outOfSlide = b.x < -0.001 || b.y < -0.001
        || b.x + b.w > LAYOUT.w + 0.001 || b.y + b.h > LAYOUT.h + 0.001;
      if (outOfSlide) add('error', sl.id, p.id, `Out of slide bounds (${b.x.toFixed(2)},${b.y.toFixed(2)},${b.w.toFixed(2)}x${b.h.toFixed(2)})`);

      if (p.id !== 'bg' && (p.kind === 'text' || p.kind === 'rect' || p.kind === 'roundRect' || p.kind === 'ellipse')) {
        contentObjects += 1;
        const bx = b.x; const by = b.y;
        if (bx < LAYOUT.marginX - 0.35 || by < 0.3 || bx + b.w > LAYOUT.w - LAYOUT.marginX + 0.35 || by + b.h > LAYOUT.h - 0.18) {
          add('warning', sl.id, p.id, 'Object extends beyond the safe margin');
        }
      }

      if (p.kind === 'text') {
        textCount += 1;
        const size = (p.style && p.style.size) || FONT.sizes.body;
        if (size < MIN_FONT) add('warning', sl.id, p.id, `Text smaller than ${MIN_FONT}pt (${size}pt)`);
        const { needed, lines } = measureText(p);
        if (needed > p.h + OVERFLOW_TOL) {
          add('error', sl.id, p.id, `Likely text overflow: needs ~${needed.toFixed(2)}in in ${p.h.toFixed(2)}in (${lines} lines)`);
        }
        if (PLACEHOLDER.test(p.text || '')) add('error', sl.id, p.id, 'Placeholder text detected');
      }

      if (p.kind === 'line') {
        const len = Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
        if (len < 0.12) add('warning', sl.id, p.id, 'Connector is shorter than 0.12in');
      }
    });

    if (textCount > 46) add('warning', sl.id, null, `High text object count (${textCount}); consider splitting the slide`);
    if (contentObjects < 3) add('warning', sl.id, null, 'Slide looks nearly empty');
  });

  return findings;
}

module.exports = { qaScene };
