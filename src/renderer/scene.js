'use strict';

const { LAYOUT } = require('./theme');

// A scene is renderer-agnostic. Both the PPTX renderer and the SVG preview
// consume exactly this structure, so geometry QA applies to both.
//
// Primitive kinds:
//   text      { id, kind:'text', x,y,w,h, text, style }
//   rect      { id, kind:'rect'|'roundRect'|'ellipse', x,y,w,h, fill, line, lineWidth, dash }
//   line      { id, kind:'line', x1,y1,x2,y2, color, width, dash, arrow:'end'|'both'|'none', semantic }
//   group     { id, kind:'group', children:[...] }   (flattened by renderers)
//
// Every primitive carries a stable `id`. Semantic ids (concept-zs, claim-C1)
// must be reused across slides when they denote the same scientific object.

function scene(deck) {
  return { deck, slides: [] };
}

function slide(id, archetype, title, primitives, extra = {}) {
  return {
    id,
    archetype,
    title,
    primitives: primitives.filter(Boolean),
    notes: extra.notes || '',
    beats: extra.beats || [],
    module: extra.module || null,
  };
}

function boundsOf(p) {
  if (p.kind === 'line') {
    return {
      x: Math.min(p.x1, p.x2),
      y: Math.min(p.y1, p.y2),
      w: Math.abs(p.x2 - p.x1),
      h: Math.abs(p.y2 - p.y1),
    };
  }
  return { x: p.x, y: p.y, w: p.w, h: p.h };
}

function walk(primitives, fn) {
  for (const p of primitives) {
    fn(p);
    if (p.kind === 'group' && Array.isArray(p.children)) walk(p.children, fn);
  }
}

function contentBox() {
  return {
    x: LAYOUT.marginX,
    y: LAYOUT.contentTop,
    w: LAYOUT.w - LAYOUT.marginX * 2,
    h: LAYOUT.footerY - LAYOUT.contentTop - 0.12,
  };
}

module.exports = { scene, slide, boundsOf, walk, contentBox };
