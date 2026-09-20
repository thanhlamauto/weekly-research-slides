'use strict';

// TikZ-specific visual critique. It inspects the semantic geometry before/after
// layout and, when available, rendered-image metrics from the compiled figure.
// Findings carry actionable requests (increase_figure_scale, reroute_edge, ...)
// rather than vague complaints.

const { EMPHASIS_ROLES } = require('./styles');

function nodeHalfSize(n) {
  if (n.style === 'methodFeature') return { w: 0.38, h: 0.38 };
  if (n.style === 'methodOperator') return { w: 0.28, h: 0.28 };
  const textW = Math.min(3.2, Math.max(2.0, (n.label || '').length * 0.085));
  return { w: textW / 2, h: 0.42 };
}

function segmentIntersectsRect(x1, y1, x2, y2, rect) {
  const inside = (x, y) => x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1;
  if (inside(x1, y1) || inside(x2, y2)) return true;
  const cross = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const seg = (ax, ay, bx, by, cx, cy, dx, dy) => {
    const d1 = cross(ax, ay, bx, by, cx, cy);
    const d2 = cross(ax, ay, bx, by, dx, dy);
    const d3 = cross(cx, cy, dx, dy, ax, ay);
    const d4 = cross(cx, cy, dx, dy, bx, by);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  };
  return seg(x1, y1, x2, y2, rect.x0, rect.y0, rect.x1, rect.y0)
    || seg(x1, y1, x2, y2, rect.x1, rect.y0, rect.x1, rect.y1)
    || seg(x1, y1, x2, y2, rect.x1, rect.y1, rect.x0, rect.y1)
    || seg(x1, y1, x2, y2, rect.x0, rect.y1, rect.x0, rect.y0);
}

function critiqueTikz(spec, plan, opts = {}) {
  const findings = [];
  const add = (level, check, message, action) => findings.push({ level, check, message, ...(action ? { action } : {}) });
  if (!plan) return findings;

  // Competing highlights: only the real difference should be emphasised.
  const emphasis = plan.nodes.filter((n) => EMPHASIS_ROLES.has(n.role));
  if (emphasis.length > 2) {
    add('warning', 'competing-highlights', `${emphasis.length} emphasised objects (${emphasis.map((n) => n.id).join(', ')}); keep at most two`, 'reduce_visual_emphasis');
  }

  // Dense cluster: nodes closer than a readable gap.
  let minDist = Infinity;
  for (let i = 0; i < plan.nodes.length; i += 1) {
    for (let j = i + 1; j < plan.nodes.length; j += 1) {
      const a = plan.nodes[i]; const b = plan.nodes[j];
      minDist = Math.min(minDist, Math.hypot(a.x - b.x, a.y - b.y));
    }
  }
  if (plan.nodes.length > 1 && minDist < 1.05) {
    add('warning', 'dense-cluster', `closest nodes are ${minDist.toFixed(2)}cm apart; minimum readable gap is ~1.05cm`, 'split_diagram');
  }

  // Uneven column spacing (single-panel pipeline layouts only; feature-space
  // geometry is free by design, and multi-panel figures have per-panel columns).
  const xs = [...new Set(plan.nodes.map((n) => Number(n.x.toFixed(2))))].sort((a, b) => a - b);
  if (plan.archetype !== 'feature-space' && plan.stages.length <= 1 && xs.length >= 3) {
    const gaps = [];
    for (let i = 1; i < xs.length; i += 1) gaps.push(xs[i] - xs[i - 1]);
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    const spread = Math.max(...gaps) - Math.min(...gaps);
    if (spread > 0.6 * mean) add('warning', 'uneven-spacing', `column gaps vary by ${spread.toFixed(2)}cm (mean ${mean.toFixed(2)}cm)`, 'align_shared_nodes');
  }

  // Label overflow / verbosity.
  plan.nodes.forEach((n) => {
    const words = String(n.label || '').trim().split(/\s+/).filter(Boolean).length;
    if (words > 6) add('warning', 'verbose-node', `node '${n.id}' label has ${words} words`, 'reduce_node_text');
    const half = nodeHalfSize(n);
    const est = (String(n.label || '').length * 0.085) / 2;
    if (est > half.w + 0.25) {
      add('warning', 'label-overflow', `node '${n.id}' label is wider (~${(est * 2).toFixed(1)}cm) than its shape (~${(half.w * 2).toFixed(1)}cm)`, 'reduce_node_text');
    }
  });

  // Arrow crossing an unrelated node.
  const byName = new Map(plan.nodes.map((n) => [n.name, n]));
  plan.edges.forEach((e) => {
    const a = byName.get(e.from); const b = byName.get(e.to);
    if (!a || !b || e.feedback) return;
    plan.nodes.forEach((n) => {
      if (n.name === e.from || n.name === e.to) return;
      const half = nodeHalfSize(n);
      const rect = { x0: n.x - half.w - 0.05, y0: n.y - half.h - 0.05, x1: n.x + half.w + 0.05, y1: n.y + half.h + 0.05 };
      if (segmentIntersectsRect(a.x, a.y, b.x, b.y, rect)) {
        add('warning', 'edge-crosses-node', `edge '${e.id}' passes through node '${n.id}'`, 'reroute_edge');
      }
    });
  });

  // Balance: the figure should not sit entirely to one side.
  if (plan.nodes.length >= 3) {
    const xsAll = plan.nodes.map((n) => n.x);
    const minX = Math.min(...xsAll); const maxX = Math.max(...xsAll);
    const com = xsAll.reduce((s, x) => s + x, 0) / xsAll.length;
    const offset = maxX > minX ? (com - (minX + maxX) / 2) / (maxX - minX) : 0;
    if (Math.abs(offset) > 0.3) {
      add('info', 'unbalanced', `content mass is offset ${(offset * 100).toFixed(0)}% from the figure centre`, 'align_shared_nodes');
    }
  }

  // Scale: a diagram squeezed below ~4cm loses readable text.
  if (plan.width < 4) {
    add('warning', 'diagram-scale', `figure width is ${plan.width.toFixed(1)}cm; text will be too small in a slide`, 'increase_figure_scale');
  }

  // Rendered-image checks (from scripts/slide_image_metrics.py on the page or
  // standalone render). The image is the ground truth, not the geometry.
  (opts.images || []).forEach((img) => {
    if (img.ink_ratio > 0.34) add('warning', 'rendered-density', `${img.file}: ink ratio ${img.ink_ratio} is dense`, 'split_diagram');
    if (img.border_touch) add('warning', 'rendered-border', `${img.file}: content touches the figure border`, 'increase_figure_scale');
    if (img.grid_min >= 0.02 && img.grid_ratio > 8) {
      add('info', 'rendered-cluster', `${img.file}: density ratio ${img.grid_ratio} suggests a tight cluster`, 'split_diagram');
    }
  });

  return findings;
}

module.exports = { critiqueTikz, nodeHalfSize, segmentIntersectsRect };
