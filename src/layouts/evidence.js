'use strict';

const { LAYOUT, COLORS, FONT, STATUS_COLORS } = require('../renderer/theme');
const C = require('./common');
const d = C.draw;
const CW = C.CW;
const M = LAYOUT.marginX;

function fmt(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

function statusChip(id, x, y, w, status, opts = {}) {
  const sc = STATUS_COLORS[status] || COLORS.muted;
  return d.chip(id, x, y, w, opts.h || 0.34, status, {
    fill: opts.fill || COLORS.white, line: sc, color: sc, size: opts.size || FONT.sizes.tiny,
  });
}

// ---------------------------------------------------------------------------
// experiment
// ---------------------------------------------------------------------------
function experiment(slide) {
  const c = slide.content || {};
  const out = [];
  const topH = 3.15;
  out.push(...C.panelBox('exp-setup', M, 1.72, CW * 0.4, topH, 'Setup'));
  out.push(d.text('exp-setup-t', M + 0.26, 2.4, CW * 0.4 - 0.52, topH - 0.85, c.setup || '', {
    size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top', lineSpacing: 18,
  }));

  out.push(...C.panelBox('exp-proto', M + CW * 0.43, 1.72, CW * 0.57, topH, 'Protocol'));
  (c.protocol || []).forEach((p, i) => {
    const y = 2.4 + i * 0.72;
    out.push(d.text(`exp-proto-${i}-n`, M + CW * 0.43 + 0.26, y, 0.36, 0.36, String(i + 1), {
      size: 14, bold: true, color: COLORS.blue, valign: 'middle',
    }));
    out.push(d.text(`exp-proto-${i}`, M + CW * 0.43 + 0.68, y, CW * 0.57 - 0.96, 0.62, p, {
      size: FONT.sizes.body - 1, color: COLORS.inkSoft, valign: 'top',
    }));
  });

  const halfW = (CW - 0.3) / 2;
  out.push(...C.panelBox('exp-changed', M, 5.05, halfW, 1.6, 'Changed this week'));
  (c.changed || []).forEach((t, i) => {
    out.push(d.text(`exp-changed-${i}`, M + 0.26, 5.66 + i * 0.42, halfW - 0.5, 0.4, t, {
      size: FONT.sizes.small, color: COLORS.inkSoft, valign: 'top',
    }));
  });
  out.push(...C.panelBox('exp-controlled', M + halfW + 0.3, 5.05, halfW, 1.6, 'Held constant', {
    fill: COLORS.panel,
  }));
  (c.controlled || []).forEach((t, i) => {
    out.push(d.text(`exp-controlled-${i}`, M + halfW + 0.56, 5.66 + i * 0.42, halfW - 0.5, 0.4, t, {
      size: FONT.sizes.small, color: COLORS.muted, valign: 'top',
    }));
  });
  return out;
}

// ---------------------------------------------------------------------------
// benchmark — competitor + ours(previous) + ours(current)
// ---------------------------------------------------------------------------
function benchmark(slide) {
  const c = slide.content || {};
  const out = [];
  const metrics = c.metrics || [];
  const methods = c.methods || [];
  const labelW = 3.0;
  const dataW = (CW - labelW) / Math.max(1, metrics.length);
  const headY = 2.15;
  const rowH = 0.86;
  const rowY = 2.7;

  out.push(d.text('bench-corner', M, headY, labelW, 0.5, 'Method', {
    size: FONT.sizes.tiny, bold: true, color: COLORS.muted, valign: 'middle',
  }));
  metrics.forEach((m, i) => {
    const x = M + labelW + i * dataW;
    out.push(d.text(`bench-metric-${i}`, x, headY, dataW - 0.15, 0.5, m.name, {
      size: FONT.sizes.small, bold: true, color: COLORS.ink, align: 'center', valign: 'middle',
    }));
    out.push(d.text(`bench-metric-${i}-unit`, x, headY + 0.4, dataW - 0.15, 0.24, m.unit || '', {
      size: FONT.sizes.tiny, color: COLORS.faint, align: 'center', valign: 'middle',
    }));
    if (i > 0) {
      out.push(d.rect(`bench-vsep-${i}`, x - 0.08, headY - 0.05, 0.012, rowH * methods.length + 0.6, { fill: COLORS.rule }));
    }
  });

  methods.forEach((mm, r) => {
    const y = rowY + r * rowH;
    const role = mm.role || 'competitor';
    const isCurrent = role === 'current';
    const fill = isCurrent ? COLORS.blueSoft : (role === 'previous' ? COLORS.slateSoft : COLORS.white);
    if (isCurrent) {
      out.push(d.roundRect('bench-row-current', M - 0.12, y - 0.06, CW + 0.24, rowH - 0.04, {
        fill, line: COLORS.blue, radius: 0.1,
      }));
    }
    out.push(d.text(`bench-row-${r}-name`, M, y, labelW - 0.2, rowH - 0.05, mm.name || '', {
      size: FONT.sizes.body, bold: isCurrent, color: COLORS.ink, valign: 'middle',
    }));
    const roleColor = role === 'current' ? COLORS.blue : (role === 'previous' ? COLORS.muted : COLORS.faint);
    out.push(d.text(`bench-row-${r}-role`, M, y + rowH - 0.28, labelW - 0.2, 0.24, role === 'current' ? 'OURS · THIS WEEK' : (role === 'previous' ? 'OURS · LAST WEEK' : 'COMPETITOR'), {
      size: FONT.sizes.tiny, bold: true, color: roleColor, valign: 'middle',
    }));
    metrics.forEach((mt, i) => {
      const x = M + labelW + i * dataW;
      const val = mm.values ? mm.values[mt.key] : undefined;
      out.push(d.text(`bench-row-${r}-m${i}`, x, y, dataW - 0.15, rowH - 0.05, fmt(val), {
        size: isCurrent ? 21 : 18, bold: true, color: isCurrent ? COLORS.blue : COLORS.inkSoft,
        align: 'center', valign: 'middle', fontFace: FONT.mono,
      }));
      if (mm.delta && mm.delta[mt.key]) {
        out.push(d.text(`bench-row-${r}-m${i}-delta`, x, y + rowH - 0.32, dataW - 0.15, 0.26, mm.delta[mt.key], {
          size: FONT.sizes.tiny, bold: true, color: COLORS.green, align: 'center', valign: 'middle',
        }));
      }
    });
  });

  if (c.caption) {
    out.push(d.card('bench-caption', M, rowY + rowH * methods.length + 0.28, CW, 0.95, { fill: COLORS.panel }));
    out.push(d.text('bench-caption-t', M + 0.28, rowY + rowH * methods.length + 0.42, CW - 0.56, 0.68, c.caption, {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'middle',
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// claim
// ---------------------------------------------------------------------------
function claim(slide) {
  const c = slide.content || {};
  const out = [];
  const id = c.id || 'C?';
  const status = c.status || 'unchanged';
  const sc = STATUS_COLORS[status] || COLORS.muted;
  out.push(d.card(`claim-${id}`, M, 1.72, CW, 2.2, { fill: COLORS.white, line: sc }));
  out.push(d.text(`claim-${id}-id`, M + 0.3, 1.92, 1.2, 0.4, id, { size: 22, bold: true, color: COLORS.ink, valign: 'middle' }));
  out.push(...statusChip(`claim-${id}-status`, M + 1.45, 1.96, 1.7, status, { h: 0.36, size: FONT.sizes.small }));
  out.push(d.text(`claim-${id}-text`, M + 0.3, 2.5, CW - 0.6, 1.2, c.statement || slide.title, {
    size: 18, color: COLORS.ink, valign: 'top', lineSpacing: 24,
  }));
  if (c.evidence && c.evidence.length) {
    out.push(...C.panelBox('claim-evidence', M, 4.15, CW, 2.3, 'Supporting evidence'));
    c.evidence.forEach((e, i) => {
      const y = 4.85 + i * 0.72;
      out.push(d.text(`claim-ev-${i}-dot`, M + 0.26, y, 0.16, 0.3, '•', {
        size: 14, bold: true, color: sc, valign: 'top',
      }));
      out.push(d.text(`claim-ev-${i}`, M + 0.46, y, CW - 0.8, 0.66, e, {
        size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top',
      }));
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// claim-delta
// ---------------------------------------------------------------------------
function claimDelta(slide) {
  const c = slide.content || {};
  const claims = c.claims || [];
  const out = [];
  const n = Math.max(1, claims.length);
  const rowH = Math.min(1.55, 4.55 / n);
  claims.forEach((cl, i) => {
    const y = 1.78 + i * (rowH + 0.12);
    out.push(d.card(`claimdelta-${cl.id || i}`, M, y, CW, rowH, { fill: COLORS.panel }));
    out.push(d.text(`claimdelta-${cl.id || i}-id`, M + 0.24, y + 0.14, 1.2, 0.34, cl.id || `C${i + 1}`, {
      size: 16, bold: true, color: COLORS.ink, valign: 'middle',
    }));
    out.push(d.text(`claimdelta-${cl.id || i}-stmt`, M + 0.24, y + 0.5, CW * 0.62, rowH - 0.6, cl.statement || '', {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top', lineSpacing: 18,
    }));
    const chipW = 1.65;
    const rightX = M + CW - chipW * 2 - 0.75;
    out.push(...statusChip(`claimdelta-${cl.id || i}-prev`, rightX, y + rowH / 2 - 0.17, chipW, cl.previous || 'absent'));
    out.push(d.arrow(`claimdelta-${cl.id || i}-arr`, rightX + chipW + 0.05, y + rowH / 2, rightX + chipW + 0.6, y + rowH / 2, 'compute'));
    out.push(...statusChip(`claimdelta-${cl.id || i}-curr`, rightX + chipW + 0.72, y + rowH / 2 - 0.17, chipW, cl.current || 'unchanged'));
    if (cl.note) {
      out.push(d.text(`claimdelta-${cl.id || i}-note`, M + CW * 0.64, y + rowH - 0.44, CW * 0.3, 0.36, cl.note, {
        size: FONT.sizes.tiny, color: COLORS.muted, valign: 'middle',
      }));
    }
  });
  if (c.note) {
    out.push(d.text('claimdelta-note', M, 1.78 + n * (rowH + 0.12) + 0.05, CW, 0.6, c.note, {
      size: FONT.sizes.small, color: COLORS.muted, valign: 'top',
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// diagnostic — measurement / observation / interpretation, separated
// ---------------------------------------------------------------------------
function diagnostic(slide) {
  const c = slide.content || {};
  const out = [];
  const id = c.id || 'D?';

  // Question is a quiet frame line, not a coloured banner.
  out.push(d.text(`diag-${id}-q-k`, M, 1.62, 1.0, 0.3, id, {
    size: FONT.sizes.small, bold: true, color: COLORS.blue, valign: 'middle',
  }));
  out.push(d.text(`diag-${id}-q-t`, M + 0.9, 1.62, CW - 2.6, 0.5, c.question || slide.title, {
    size: FONT.sizes.body + 2, color: COLORS.ink, valign: 'middle',
  }));
  (c.claim_ids || []).forEach((cid, i) => {
    out.push(d.text(`diag-${id}-link-${i}`, M + CW - 1.4 + i * 0.8, 1.66, 0.75, 0.3, `tests ${cid}`, {
      size: FONT.sizes.tiny, color: COLORS.muted, align: 'right', valign: 'middle',
    }));
  });

  const colX = M;
  const colW = CW * 0.57;
  const rightX = M + CW * 0.6;
  const rightW = CW * 0.4;
  const top = 2.35;
  const bandH = 1.3;
  const bands = [
    { k: 'measurement', label: 'Measurement', accent: COLORS.inkSoft, mono: true, size: FONT.sizes.equation },
    { k: 'observation', label: 'Observation', accent: COLORS.muted, mono: false, size: FONT.sizes.body },
    { k: 'interpretation', label: 'Interpretation', accent: COLORS.blue, mono: false, size: FONT.sizes.body },
  ];
  bands.forEach((b, i) => {
    const y = top + i * (bandH + 0.12);
    const text = c[b.k] || '';
    // long measurements drop to body size so they stay inside the band
    const size = b.mono && text.length > 70 ? FONT.sizes.body : b.size;
    out.push(...d.block(`diag-${id}-${b.k}`, colX, y, colW, bandH, {
      label: b.label, text, accent: b.accent, mono: b.mono,
      size, color: COLORS.ink, labelColor: b.accent, lineSpacing: 16,
    }));
  });

  const rightBands = [
    { k: 'can_conclude', label: 'Can conclude', accent: COLORS.green },
    { k: 'cannot_conclude', label: 'Cannot conclude', accent: COLORS.red },
    { k: 'alternative_explanation', label: 'Alternative targeted', accent: COLORS.muted },
  ];
  rightBands.forEach((b, i) => {
    const y = top + i * (bandH + 0.12);
    out.push(...d.block(`diag-${id}-${b.k}`, rightX, y, rightW, bandH, {
      label: b.label, text: c[b.k] || '', accent: b.accent, size: FONT.sizes.small + 0.5,
      color: COLORS.inkSoft, labelColor: b.accent,
    }));
  });
  return out;
}

// ---------------------------------------------------------------------------
// feature-space — persistent geometric objects, stable across slides
// ---------------------------------------------------------------------------
const ROLE_POS = {
  top: { x: 5.35, y: 2.35 },
  center: { x: 5.35, y: 4.25 },
  bottom_left: { x: 2.55, y: 4.55 },
  bottom_right: { x: 8.15, y: 4.55 },
  left: { x: 2.55, y: 3.5 },
  right: { x: 8.15, y: 3.5 },
};

function edgePoint(from, to, r) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / len) * r, y: from.y + (dy / len) * r };
}

function featureSpace(slide) {
  const c = slide.content || {};
  const nodes = c.nodes || [];
  const out = [];
  const centers = {};
  const radius = {};

  nodes.forEach((nd, i) => {
    // figure-first: geometric objects dominate the slide area
    const size = nd.size || 1.3;
    const base = nd.role && ROLE_POS[nd.role] ? ROLE_POS[nd.role] : { x: 2.5 + i * 2.4, y: 3.5 };
    const cx = nd.cx !== undefined ? nd.cx : base.x;
    const cy = nd.cy !== undefined ? nd.cy : base.y;
    centers[nd.object_id || `node-${i}`] = { x: cx, y: cy };
    radius[nd.object_id || `node-${i}`] = size / 2;
    out.push(...d.semanticNode(nd.object_id || `fs-node-${i}`, nd.kind || 'latent',
      cx - size / 2, cy - size / 2, size, size, nd.label || '', {
        sublabel: nd.sublabel, size: nd.label_size || 15,
      }));
  });

  (c.vectors || []).forEach((v, i) => {
    const a = centers[v.from];
    const b = centers[v.to];
    if (!a || !b) return;
    const ra = radius[v.from] || 0.5;
    const rb = radius[v.to] || 0.5;
    const p1 = edgePoint(a, b, ra + 0.02);
    const p2 = edgePoint(b, a, rb + 0.02);
    out.push(d.arrow(v.id || `fs-vec-${i}`, p1.x, p1.y, p2.x, p2.y, v.semantic || 'vector', {
      color: v.color, dash: v.dash,
    }));
    if (v.label) {
      const mx = (p1.x + p2.x) / 2;
      const my = (p1.y + p2.y) / 2;
      out.push(d.text(`${v.id || `fs-vec-${i}`}-label`, mx - 1.35, my - 0.42, 2.7, 0.32, v.label, {
        size: FONT.sizes.small, bold: true, color: v.color || COLORS.red, align: 'center', valign: 'middle',
      }));
    }
  });

  if (c.legend !== false) {
    const items = c.legend_items || [
      { label: 'correction ΔZ (what moved)', semantic: 'vector', color: COLORS.red },
      { label: 'desired direction Z_d − Z_s', semantic: 'reference', color: COLORS.faint },
    ];
    let lx = M;
    items.forEach((it, i) => {
      out.push(d.line(`fs-legend-${i}-line`, lx, 6.45, lx + 0.5, 6.45, {
        color: it.color, width: i === 0 ? 2.1 : 0.9, dash: it.semantic === 'reference' ? 'dash' : null,
        arrow: it.semantic === 'reference' ? 'none' : 'end',
      }));
      out.push(d.text(`fs-legend-${i}`, lx + 0.62, 6.28, 3.6, 0.34, it.label, {
        size: FONT.sizes.tiny, color: COLORS.muted, valign: 'middle',
      }));
      lx += 4.4;
    });
  }
  if (c.note) {
    out.push(d.text('fs-note', M, 6.78, CW, 0.3, c.note, {
      size: FONT.sizes.small, color: COLORS.inkSoft, align: 'center', valign: 'middle',
    }));
  }
  return out;
}

module.exports = { experiment, benchmark, claim, claimDelta, diagnostic, featureSpace };
