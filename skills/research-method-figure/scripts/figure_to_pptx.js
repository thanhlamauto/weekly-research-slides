#!/usr/bin/env node
'use strict';

// Figure IR -> native, editable PowerPoint shapes.
//
// Reuses the same semantic object names as the Draw.io/SVG renderers, so a
// method figure can be a paper figure and a slide without being redrawn.
//
//   node scripts/figure_to_pptx.js --input figure.ir.json --output figure.pptx

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) { out[argv[i].slice(2)] = argv[i + 1]; i += 1; }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.input || !args.output) {
  console.error('usage: figure_to_pptx.js --input figure.ir.json --output figure.pptx');
  process.exit(2);
}

const PptxGenJS = require('pptxgenjs');
const ir = JSON.parse(fs.readFileSync(args.input, 'utf8'));
const PX_PER_IN = 96;
const W = ir.canvas.w / PX_PER_IN;
const H = ir.canvas.h / PX_PER_IN;
const toIn = (px) => px / PX_PER_IN;
const hex = (c) => (c && c.startsWith('#') ? c.slice(1) : c);

const pptx = new PptxGenJS();
pptx.defineLayout({ name: 'FIGURE', width: W, height: H });
pptx.layout = 'FIGURE';
pptx.author = 'weekly-research-slides';
pptx.title = ir.figure.title || ir.figure.id;
const slide = pptx.addSlide();
slide.background = { color: hex(ir.style.background) || 'FFFFFF' };

function shapeFor(kind) {
  if (kind === 'ellipse') return pptx.ShapeType.ellipse;
  if (kind === 'rect') return pptx.ShapeType.rect;
  return pptx.ShapeType.roundRect;
}

// panels first (background)
for (const p of ir.panels) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: toIn(p.x), y: toIn(p.y), w: toIn(p.w), h: toIn(p.h),
    fill: p.fill === 'none' ? { type: 'none' } : { color: hex(p.fill) },
    line: { color: hex(p.color), width: ir.style.panel_stroke_width, dashType: 'dash' },
    rectRadius: 0.06, objectName: `panel-${p.id}`,
  });
  if (p.label) {
    slide.addText(p.label, {
      x: toIn(p.x + 8), y: toIn(p.y + 4), w: toIn(p.w - 16), h: 0.24,
      fontSize: ir.style.typography.panel_label.size, bold: true,
      color: hex(p.color), align: 'left', valign: 'middle', objectName: `panel-label-${p.id}`,
    });
  }
}

// edges (behind nodes)
for (const e of ir.edges) {
  const pts = e.points;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const last = i === pts.length - 2;
    slide.addShape(pptx.ShapeType.line, {
      x: toIn(Math.min(a[0], b[0])), y: toIn(Math.min(a[1], b[1])),
      w: toIn(Math.abs(b[0] - a[0])), h: toIn(Math.abs(b[1] - a[1])),
      flipH: b[0] < a[0], flipV: b[1] < a[1],
      line: {
        color: hex(e.color), width: e.width,
        dashType: e.dash ? 'dash' : 'solid',
        endArrowType: last && e.arrowhead !== 'none' ? 'triangle' : 'none',
      },
      objectName: `edge-${e.id}-${i}`,
    });
  }
}

// nodes
for (const n of ir.nodes) {
  if (n.shape !== 'none') {
    slide.addShape(shapeFor(n.shape === 'stack' || n.shape === 'cylinder' ? 'rect' : n.shape), {
      x: toIn(n.x), y: toIn(n.y), w: toIn(n.w), h: toIn(n.h),
      fill: { color: hex(n.fill) },
      line: { color: hex(n.color), width: ir.style.stroke_width },
      rectRadius: 0.05, objectName: n.semantic_id || n.id,
    });
  }
  const label = n.repeat > 1 ? `${n.label}  x${n.repeat}` : n.label;
  slide.addText(label, {
    x: toIn(n.x + 3), y: toIn(n.y + 3), w: toIn(n.w - 6), h: toIn(n.h - 6),
    fontSize: n.text.size, bold: Number(n.text.weight) >= 600, color: hex(n.text.color),
    fontFace: n.text.family, align: 'center', valign: 'middle', margin: 0.02,
    objectName: `${n.id}-label`,
  });
}

// annotations
for (const a of ir.annotations) {
  slide.addText(a.text, {
    x: toIn(a.x), y: toIn(a.y), w: toIn(a.w), h: toIn(a.h),
    fontSize: a.size, color: hex(a.color), align: 'left', valign: 'middle',
    objectName: `annotation-${a.id}`,
  });
}

// legend
if (ir.legend) {
  const lg = ir.legend;
  slide.addShape(pptx.ShapeType.rect, {
    x: toIn(lg.x), y: toIn(lg.y), w: toIn(lg.w), h: toIn(lg.h),
    fill: { type: 'none' }, line: { color: 'D1D5DB', width: 1, dashType: 'dash' },
    objectName: 'legend-box',
  });
  lg.entries.forEach((e, i) => {
    const color = hex(ir.style.semantics[e.role] || '#374151');
    slide.addShape(pptx.ShapeType.rect, {
      x: toIn(lg.x + 8), y: toIn(lg.y + e.y), w: toIn(12), h: toIn(12),
      fill: { color }, line: { type: 'none' }, objectName: `legend-swatch-${i}`,
    });
    slide.addText(e.label, {
      x: toIn(lg.x + 26), y: toIn(lg.y + e.y - 4), w: toIn(lg.w - 30), h: toIn(20),
      fontSize: lg.size, color: hex(ir.style.semantics.neutral), align: 'left',
      valign: 'middle', objectName: `legend-label-${i}`,
    });
  });
}

if (ir.title) {
  slide.addText(ir.title.text, {
    x: toIn(ir.title.x), y: toIn(ir.title.y), w: toIn(ir.title.w), h: toIn(ir.title.h),
    fontSize: ir.title.size, bold: true, color: hex(ir.title.color),
    fontFace: ir.title.family, align: 'left', valign: 'middle', objectName: 'figure-title',
  });
}

pptx.writeFile({ fileName: args.output }).then(() => {
  console.log(`pptx: ${args.output} (${ir.nodes.length} nodes, ${ir.edges.length} edges)`);
});
