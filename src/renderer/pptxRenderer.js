'use strict';

const PptxGenJS = require('pptxgenjs');
const { LAYOUT, FONT } = require('./theme');

const LAYOUT_NAME = 'WRS_16x9';

function fillOf(color) {
  return color ? { color } : { type: 'none' };
}

function lineOf(p) {
  if (!p.line && !p.color) return { type: 'none' };
  return {
    color: p.line || p.color,
    width: p.lineWidth || p.width || 1,
    dashType: p.dash || 'solid',
    beginArrowType: p.arrow === 'both' ? 'triangle' : 'none',
    endArrowType: p.arrow === 'end' || p.arrow === 'both' ? 'triangle' : 'none',
  };
}

function addPrimitive(pptx, s, p) {
  if (!p) return;
  if (p.kind === 'text') {
    const st = p.style || {};
    s.addText(p.text, {
      x: p.x, y: p.y, w: p.w, h: p.h,
      fontSize: st.size || FONT.sizes.body,
      bold: !!st.bold,
      italic: !!st.italic,
      color: st.color || '111827',
      align: st.align || 'left',
      valign: st.valign || 'top',
      fontFace: st.fontFace || FONT.face,
      lineSpacing: st.lineSpacing || Math.round((st.size || FONT.sizes.body) * 1.2),
      margin: 0.02,
      wrap: true,
      objectName: p.id,
    });
    return;
  }
  if (p.kind === 'rect' || p.kind === 'roundRect' || p.kind === 'ellipse') {
    const shape = p.kind === 'ellipse' ? pptx.ShapeType.ellipse
      : (p.kind === 'roundRect' ? pptx.ShapeType.roundRect : pptx.ShapeType.rect);
    const opts = {
      x: p.x, y: p.y, w: p.w, h: p.h,
      fill: fillOf(p.fill),
      line: lineOf(p),
      objectName: p.id,
    };
    if (p.kind === 'roundRect') opts.rectRadius = p.radius === undefined ? 0.13 : p.radius;
    s.addShape(shape, opts);
    return;
  }
  if (p.kind === 'line') {
    const x = Math.min(p.x1, p.x2);
    const y = Math.min(p.y1, p.y2);
    const w = Math.abs(p.x2 - p.x1);
    const h = Math.abs(p.y2 - p.y1);
    s.addShape(pptx.ShapeType.line, {
      x, y, w, h,
      flipH: p.x2 < p.x1,
      flipV: p.y2 < p.y1,
      line: lineOf({ color: p.color, width: p.width, dash: p.dash, arrow: p.arrow }),
      objectName: p.id,
    });
    return;
  }
  if (p.kind === 'group' && Array.isArray(p.children)) {
    p.children.forEach((c) => addPrimitive(pptx, s, c));
  }
}

function renderPptx(scene, opts = {}) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: LAYOUT_NAME, width: LAYOUT.w, height: LAYOUT.h });
  pptx.layout = LAYOUT_NAME;
  pptx.author = opts.author || 'weekly-research-slides';
  pptx.company = opts.company || 'weekly-research-slides';
  pptx.title = (scene.deck && (scene.deck.title || scene.deck.project)) || 'Weekly research update';
  pptx.subject = (scene.deck && scene.deck.this_week_question) || '';

  for (const sl of scene.slides) {
    const s = pptx.addSlide();
    for (const p of sl.primitives) addPrimitive(pptx, s, p);
    if (sl.notes) s.addNotes(sl.notes);
  }
  return pptx;
}

async function writePptx(scene, outputPath, opts = {}) {
  const pptx = renderPptx(scene, opts);
  await pptx.writeFile({ fileName: outputPath });
  return outputPath;
}

module.exports = { renderPptx, writePptx, addPrimitive };
