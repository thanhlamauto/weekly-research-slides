'use strict';

const { boundsOf, walk } = require('../renderer/scene');

// Object permanence: the same semantic object should keep its geometry across
// consecutive slides. A label may update (e.g. to show a measured value); a
// stable scientific object (concept-*) must not drift.
function indexSlide(slide) {
  const map = new Map();
  walk(slide.primitives, (p) => {
    if (!p || !p.id) return;
    if (p.kind === 'text') {
      if (!map.has(p.id)) map.set(p.id, { kind: 'text', text: p.text });
    } else {
      const b = boundsOf(p);
      if (!map.has(p.id)) map.set(p.id, { kind: p.kind, bounds: b });
    }
  });
  return map;
}

function qaContinuity(scene) {
  const findings = [];
  const add = (level, slide, object, message) => findings.push({ level, check: 'continuity', slide, object, message });
  for (let i = 0; i < scene.slides.length - 1; i += 1) {
    const a = indexSlide(scene.slides[i]);
    const b = indexSlide(scene.slides[i + 1]);
    for (const [id, av] of a) {
      if (!b.has(id)) continue;
      // The progress indicator intentionally changes width on every slide.
      if (/^frame-progress/.test(id)) continue;
      const bv = b.get(id);
      if (av.kind === 'text' && bv.kind === 'text') {
        if (av.text !== bv.text && /^(concept-|vec-)/.test(id)) {
          add('info', scene.slides[i + 1].id, id, 'Label text updated between consecutive slides');
        }
        continue;
      }
      if (av.bounds && bv.bounds) {
        const dx = Math.abs(av.bounds.x - bv.bounds.x);
        const dy = Math.abs(av.bounds.y - bv.bounds.y);
        const dw = Math.abs(av.bounds.w - bv.bounds.w);
        const dh = Math.abs(av.bounds.h - bv.bounds.h);
        const drift = Math.max(dx, dy, dw, dh);
        if (drift > 0.02) {
          const level = /^concept-/.test(id) ? 'error' : 'warning';
          add(level, scene.slides[i + 1].id, id, `Object changed geometry between consecutive slides (max ${drift.toFixed(2)}in); movement must carry meaning`);
        }
      }
    }
  }
  return findings;
}

module.exports = { qaContinuity };
