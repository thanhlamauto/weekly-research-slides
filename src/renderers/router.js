'use strict';

// Renderer routing for scientific figures.
//
// The semantic figure spec is renderer-neutral. This module decides which
// backend should render it and records why, so the decision is inspectable
// (`renderer_decision`). TikZ is the default for small-to-medium conceptual
// and math-heavy diagrams that integrate natively with Beamer; Draw.io remains
// the backend for large/editable/reconstructed architecture figures.

const BACKENDS = ['tikz', 'drawio', 'python', 'manim', 'external'];

// Types that are naturally conceptual/math-heavy and fit TikZ.
const TIKZ_TYPES = new Set([
  'method-overview', 'mechanism-zoom', 'training-vs-inference',
  'method-comparison', 'method-delta', 'diagnostic', 'data-pipeline',
]);

// Types that are large system views; Draw.io is the better default.
const DRAWIO_TYPES = new Set([
  'architecture', 'multi-panel-overview', 'graphical-abstract',
]);

const TIKZ_MAX_NODES = 12;
const TIKZ_MAX_EDGES = 15;

function isMathLabel(label) {
  if (!label) return false;
  return /\$|\\[A-Za-z]+|[_^]\{?\w/.test(String(label));
}

function edgeTopology(nodes, edges) {
  const out = new Map(nodes.map((n) => [n.id, 0]));
  const indeg = new Map(nodes.map((n) => [n.id, 0]));
  let backEdges = 0;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    out.set(e.from, (out.get(e.from) || 0) + 1);
    indeg.set(e.to, (indeg.get(e.to) || 0) + 1);
    if (e.from === e.to) backEdges += 1;
  }
  const maxOut = Math.max(0, ...out.values());
  // Acyclic check (Kahn); cycles are fine for TikZ but recorded.
  const deg = new Map(indeg);
  const queue = nodes.filter((n) => (deg.get(n.id) || 0) === 0).map((n) => n.id);
  const seen = new Set();
  while (queue.length) {
    const id = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of edges.filter((x) => x.from === id)) {
      deg.set(e.to, (deg.get(e.to) || 0) - 1);
      if (deg.get(e.to) <= 0) queue.push(e.to);
    }
  }
  const acyclic = seen.size === nodes.length;
  return { maxOut, acyclic, backEdges: backEdges + (acyclic ? 0 : nodes.length - seen.size) };
}

function figureStats(spec) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const panels = spec.panels || [];
  const mathLabels = nodes.filter((n) => isMathLabel(n.label)).length;
  const topology = edgeTopology(nodes, edges);
  const types = new Set(nodes.map((n) => n.type));
  return {
    nodes: nodes.length,
    edges: edges.length,
    panels: panels.length,
    math_labels: mathLabels,
    max_out_degree: topology.maxOut,
    acyclic: topology.acyclic,
    has_cycle: !topology.acyclic || topology.backEdges > 0,
    nested_groups: panels.length >= 3 && nodes.length > TIKZ_MAX_NODES / 2,
    has_freeform_geometry: nodes.filter((n) => n.geometry && n.geometry.w && n.geometry.h).length > 0,
    node_types: [...types].sort(),
  };
}

function decision(selected, reason, explicit, stats, spec) {
  return {
    selected,
    reason,
    explicit: Boolean(explicit),
    stats,
    figure: spec && spec.figure ? { id: spec.figure.id, type: spec.figure.type, mode: spec.figure.mode || null } : null,
  };
}

function routeFigure(spec, opts = {}) {
  const stats = figureStats(spec);
  const fig = spec.figure || {};
  const rendering = fig.rendering || {};
  const requested = opts.backend || rendering.backend || 'auto';
  if (requested !== 'auto') {
    if (!BACKENDS.includes(requested)) {
      return decision('external', [`unknown backend '${requested}'; choose explicitly`], false, stats, spec);
    }
    return decision(requested, [`explicit backend: ${requested}`], true, stats, spec);
  }

  // Quantitative plots stay with the data pipeline (Python / PGFPlots).
  if (fig.plot || fig.type === 'plot') {
    return decision('python', ['quantitative plot; data pipeline owns plots'], false, stats, spec);
  }

  // Motion only when asked for; static temporal diagrams stay TikZ.
  if (rendering.animate === true) {
    return decision('manim', ['rendering.animate is true; motion carries the argument'], false, stats, spec);
  }

  const drawioReasons = [];
  if (DRAWIO_TYPES.has(fig.type)) drawioReasons.push(`figure type '${fig.type}' is an architecture-scale view`);
  if (fig.mode === 'reconstruction') drawioReasons.push('reconstruction needs editable freeform geometry');
  if (fig.style_source) drawioReasons.push('style transfer from a reference figure');
  if (stats.nodes > TIKZ_MAX_NODES) drawioReasons.push(`${stats.nodes} semantic objects (TikZ budget ${TIKZ_MAX_NODES})`);
  if (stats.edges > TIKZ_MAX_EDGES) drawioReasons.push(`${stats.edges} edges (TikZ budget ${TIKZ_MAX_EDGES})`);
  if (stats.nested_groups) drawioReasons.push('nested groups / multi-panel system view');
  if (drawioReasons.length) {
    return decision('drawio', drawioReasons, false, stats, spec);
  }

  const tikzReasons = [`${stats.nodes} semantic objects`, `${stats.edges} edges`];
  if (stats.acyclic) tikzReasons.push('simple acyclic flow');
  else tikzReasons.push('feedback loop (supported by TikZ)');
  if (stats.math_labels) tikzReasons.push(`math-heavy labels (${stats.math_labels})`);
  if (TIKZ_TYPES.has(fig.type)) tikzReasons.push(`figure type '${fig.type}' is conceptual`);
  tikzReasons.push('direct integration with Beamer');
  return decision('tikz', tikzReasons, false, stats, spec);
}

module.exports = {
  routeFigure, figureStats, BACKENDS, TIKZ_MAX_NODES, TIKZ_MAX_EDGES,
};
