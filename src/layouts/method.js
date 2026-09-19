'use strict';

const { LAYOUT, COLORS, FONT, STROKE } = require('../renderer/theme');
const C = require('./common');
const d = C.draw;
const CW = C.CW;
const M = LAYOUT.marginX;

// ---------------------------------------------------------------------------
// method-landscape — competitors normalized into one visual language
// ---------------------------------------------------------------------------
function methodLandscape(slide) {
  const c = slide.content || {};
  const methods = c.methods || [];
  const out = [];
  const n = Math.max(1, methods.length);
  const gap = 0.3;
  const cardW = (CW - gap * (n - 1)) / n;
  const y = 2.15;
  const h = 3.05;
  methods.forEach((m, i) => {
    const x = M + i * (cardW + gap);
    const ours = m.role === 'ours';
    out.push(d.card(`land-${i}`, x, y, cardW, h, {
      fill: ours ? COLORS.blueSoft : COLORS.panel,
      line: ours ? COLORS.blue : COLORS.panelLine,
    }));
    out.push(d.text(`land-${i}-tag`, x + 0.22, y + 0.16, cardW - 0.44, 0.24,
      (m.tag || `M${i + 1}`).toUpperCase(), {
        size: FONT.sizes.tiny, bold: true, color: ours ? COLORS.blue : COLORS.muted, valign: 'middle',
      }));
    out.push(d.text(`land-${i}-name`, x + 0.22, y + 0.48, cardW - 0.44, 0.62, m.name || '', {
      size: 15.5, bold: true, color: COLORS.ink, valign: 'top',
    }));
    out.push(d.rect(`land-${i}-sep`, x + 0.22, y + 1.16, cardW - 0.44, 0.014, { fill: COLORS.rule }));
    out.push(d.text(`land-${i}-mech`, x + 0.22, y + 1.3, cardW - 0.44, h - 1.5, m.mechanism || '', {
      size: FONT.sizes.small, color: COLORS.inkSoft, valign: 'top', lineSpacing: 16,
    }));
    if (i < n - 1) {
      out.push(d.arrow(`land-${i}-arrow`, x + cardW + 0.03, y + h / 2, x + cardW + gap - 0.03, y + h / 2, 'reference'));
    }
  });
  if (c.gap) {
    out.push(d.card('land-gap', M, y + h + 0.32, CW, 0.92, { fill: COLORS.amberSoft, line: COLORS.amber }));
    out.push(d.text('land-gap-k', M + 0.26, y + h + 0.42, 1.5, 0.3, 'OPEN GAP', {
      size: FONT.sizes.tiny, bold: true, color: COLORS.amber, valign: 'middle',
    }));
    out.push(d.text('land-gap-t', M + 1.8, y + h + 0.4, CW - 2.06, 0.72, c.gap, {
      size: 14.5, color: COLORS.ink, valign: 'middle',
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// competitor-mechanism — A intuition / B mechanism / C limitation
// ---------------------------------------------------------------------------
function competitorMechanism(slide) {
  const c = slide.content || {};
  const out = [];
  const gap = 0.28;
  const colW = (CW - gap * 2) / 3;
  const y = 1.72;
  const h = 4.7;
  const xs = [M, M + colW + gap, M + colW * 2 + gap * 2];

  out.push(...C.panelBox('cm-a', xs[0], y, colW, h, 'A. Intuition'));
  out.push(d.text('cm-a-t', xs[0] + 0.24, y + 0.72, colW - 0.48, h - 1.0, c.intuition || '', {
    size: FONT.sizes.body - 0.5, color: COLORS.inkSoft, valign: 'top', lineSpacing: 18,
  }));

  out.push(...C.panelBox('cm-b', xs[1], y, colW, h, 'B. Mechanism'));
  const nodes = [
    { id: 'cm-in', kind: 'token', label: 'input', w: 0.8 },
    { id: 'cm-mod', kind: 'learned', label: c.module_label || 'reuse', w: 1.15 },
    { id: 'cm-out', kind: 'latent', label: 'output', w: 0.8 },
  ];
  const ny = y + 1.15;
  const nh = 0.78;
  const innerW = colW - 0.6;
  const slot = innerW / 3;
  nodes.forEach((nd, i) => {
    const nw = nodes[i].w;
    const cx = xs[1] + 0.3 + slot * i + slot / 2;
    out.push(...d.semanticNode(nd.id, nd.kind, cx - nw / 2, ny, nw, nh, nd.label, { size: 10.5 }));
  });
  out.push(d.arrow('cm-arr1', xs[1] + 0.3 + slot + 0.1, ny + nh / 2, xs[1] + 0.3 + slot * 2 - 0.1, ny + nh / 2, 'compute'));
  out.push(d.arrow('cm-arr2', xs[1] + 0.3 + slot * 2 + 0.1, ny + nh / 2, xs[1] + 0.3 + slot * 3 - 0.1, ny + nh / 2, 'compute'));
  out.push(d.text('cm-b-t', xs[1] + 0.24, y + 2.25, colW - 0.48, h - 2.5, c.mechanism || '', {
    size: FONT.sizes.small, color: COLORS.inkSoft, valign: 'top', lineSpacing: 17,
  }));

  out.push(...C.panelBox('cm-c', xs[2], y, colW, h, 'C. Where it fails'));
  const bullets = c.failure || [];
  bullets.forEach((b, i) => {
    out.push(d.text(`cm-c-${i}-dot`, xs[2] + 0.24, y + 0.78 + i * 0.72, 0.16, 0.3, '•', {
      size: 14, bold: true, color: COLORS.red, valign: 'top',
    }));
    out.push(d.text(`cm-c-${i}`, xs[2] + 0.44, y + 0.74 + i * 0.72, colW - 0.7, 0.7, b, {
      size: FONT.sizes.small, color: COLORS.inkSoft, valign: 'top',
    }));
  });
  if (c.relation_to_us) {
    out.push(d.card('cm-rel', xs[2] + 0.24, y + h - 1.35, colW - 0.48, 1.1, { fill: COLORS.blueSoft, line: COLORS.blue }));
    out.push(d.text('cm-rel-t', xs[2] + 0.42, y + h - 1.25, colW - 0.84, 0.9, c.relation_to_us, {
      size: FONT.sizes.small, color: COLORS.ink, valign: 'middle',
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// method-high-level — pipeline in one coordinate system
// ---------------------------------------------------------------------------
function methodHighLevel(slide) {
  const c = slide.content || {};
  const stages = c.stages || [];
  const out = [];
  const n = Math.max(1, stages.length);
  const colW = CW / n;
  const ny = 2.6;
  const nh = 1.0;
  const kindMap = { input: 'token', model: 'model', learned: 'learned', cache: 'cache', output: 'latent', operator: 'operator' };
  stages.forEach((s, i) => {
    const cx = M + colW * (i + 0.5);
    const kind = kindMap[s.role] || s.node || 'model';
    const w = s.role === 'operator' ? 0.8 : Math.min(colW - 0.5, 2.0);
    const h = kind === 'cache' ? nh - 0.08 : (s.role === 'operator' ? 0.8 : nh);
    const y = s.role === 'operator' ? ny + (nh - h) / 2 : ny;
    out.push(...d.semanticNode(`stage-${i}`, kind, cx - w / 2, y, w, h, s.label || '', {
      size: 11.5,
    }));
    if (i < n - 1) {
      const kindArrow = stages[i + 1].role === 'operator' ? 'causal' : 'compute';
      out.push(d.arrow(`stage-${i}-arr`, cx + colW * 0.5 + 0.02, ny + nh / 2, cx + colW * 0.5 + colW - 0.02, ny + nh / 2, kindArrow));
    }
    if (s.detail) {
      out.push(d.text(`stage-${i}-detail`, M + colW * i + 0.12, 4.05, colW - 0.24, 1.35, s.detail, {
        size: FONT.sizes.small, color: COLORS.inkSoft, align: 'center', valign: 'top', lineSpacing: 16,
      }));
    }
  });
  if (c.note) {
    out.push(d.card('mhl-note', M, 5.6, CW, 1.05, { fill: COLORS.panel }));
    out.push(d.text('mhl-note-t', M + 0.28, 5.78, CW - 0.56, 0.72, c.note, {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'middle',
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// method-delta — what changed between two method versions
// ---------------------------------------------------------------------------
function methodDelta(slide) {
  const c = slide.content || {};
  const out = [];
  const from = c.from || 'v(n-1)';
  const to = c.to || 'v(n)';

  out.push(d.roundRect('method-from', M, 1.78, 1.7, 0.62, { fill: COLORS.slateSoft, line: COLORS.muted }));
  out.push(d.text('method-from__label', M, 1.78, 1.7, 0.62, from, { size: 17, bold: true, color: COLORS.inkSoft, align: 'center', valign: 'middle' }));
  out.push(d.arrow('method-delta-arrow', M + 1.82, 2.09, M + 2.95, 2.09, 'causal'));
  out.push(d.roundRect('method-to', M + 3.07, 1.78, 1.9, 0.62, { fill: COLORS.blueSoft, line: COLORS.blue }));
  out.push(d.text('method-to__label', M + 3.07, 1.78, 1.9, 0.62, to, { size: 17, bold: true, color: COLORS.blue, align: 'center', valign: 'middle' }));

  if (c.summary) {
    out.push(d.text('method-delta-summary', M + 5.3, 1.78, CW - 5.3, 0.62, c.summary, {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'middle',
    }));
  }

  out.push(C.sectionLabel('method-delta-k', M, 2.72, CW * 0.5, 'Changes this week'));
  const changes = c.changes || [];
  const rowH = Math.min(1.0, 2.9 / Math.max(1, changes.length));
  changes.forEach((ch, i) => {
    const change = typeof ch === 'string' ? ch : ch.change;
    const why = typeof ch === 'string' ? '' : ch.why;
    const y = 3.05 + i * rowH;
    out.push(d.rect(`method-change-${i}-bar`, M, y + 0.06, 0.05, rowH - 0.2, { fill: COLORS.blue }));
    out.push(d.text(`method-change-${i}`, M + 0.22, y, CW * 0.46, 0.4, change, {
      size: 15, bold: true, color: COLORS.ink, valign: 'middle',
    }));
    if (why) {
      out.push(d.text(`method-change-${i}-why`, M + 0.22, y + 0.4, CW * 0.46, rowH - 0.5, why, {
        size: FONT.sizes.small, color: COLORS.muted, valign: 'top',
      }));
    }
  });

  if (c.unchanged && c.unchanged.length) {
    out.push(d.card('method-unchanged', M + CW * 0.53, 2.95, CW * 0.47, 3.2, { fill: COLORS.panel }));
    out.push(d.text('method-unchanged-k', M + CW * 0.53 + 0.24, 3.12, CW * 0.47 - 0.48, 0.3, 'UNCHANGED', {
      size: FONT.sizes.tiny, bold: true, color: COLORS.muted, valign: 'middle',
    }));
    c.unchanged.forEach((u, i) => {
      out.push(d.text(`method-unchanged-${i}`, M + CW * 0.53 + 0.24, 3.55 + i * 0.75, CW * 0.47 - 0.48, 0.7, u, {
        size: FONT.sizes.body - 1, color: COLORS.muted, valign: 'top',
      }));
    });
  }
  return out;
}

module.exports = { methodLandscape, competitorMechanism, methodHighLevel, methodDelta };
