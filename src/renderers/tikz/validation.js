'use strict';

// Geometric preflight for semantic figures. This is not a full computational
// geometry engine: it catches obvious defects before rendering. Rendered-image
// inspection (critique.js) remains mandatory.

const { TYPE_STYLES } = require('./styles');
const { TIKZ_MAX_NODES, TIKZ_MAX_EDGES } = require('../router');

function validateFigure(spec, plan) {
  const findings = [];
  const add = (level, check, message, action) => findings.push({ level, check, message, ...(action ? { action } : {}) });
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const ids = new Set();

  nodes.forEach((n, i) => {
    if (!n.id) { add('error', 'node-id', `node ${i} has no id`); return; }
    if (ids.has(n.id)) add('error', 'duplicate-node', `duplicate node id '${n.id}'`);
    ids.add(n.id);
    if (!n.label) add('warning', 'empty-label', `node '${n.id}' has no label`);
    if ((n.label || '').length > 42) add('warning', 'verbose-label', `node '${n.id}' label is ${n.label.length} characters`, 'reduce_node_text');
    if (n.type && !TYPE_STYLES[n.type]) add('warning', 'node-type', `node '${n.id}' has unknown type '${n.type}'`);
    if (n.role && !['shared', 'baseline', 'competitor', 'ours', 'auxiliary', 'neutral', 'changed', 'added', 'removed', 'warning', 'muted'].includes(n.role)) {
      add('warning', 'node-role', `node '${n.id}' has unknown role '${n.role}'`);
    }
  });

  edges.forEach((e) => {
    const label = e.id || `${e.from}->${e.to}`;
    if (!ids.has(e.from)) add('error', 'edge-ref', `edge '${label}' references unknown node '${e.from}'`);
    if (!ids.has(e.to)) add('error', 'edge-ref', `edge '${label}' references unknown node '${e.to}'`);
    if (e.from === e.to) add('error', 'zero-length-edge', `edge '${label}' is a zero-length self-loop`);
  });

  (spec.annotations || []).forEach((a, i) => {
    const known = ids.has(a.target) || edges.some((e) => (e.id || `${e.from}->${e.to}`) === a.target);
    if (!known) add('warning', 'annotation-target', `annotation ${i} targets unknown object '${a.target}'`);
  });

  if (nodes.length > TIKZ_MAX_NODES) {
    add('warning', 'tikz-budget', `${nodes.length} nodes exceeds the TikZ budget (${TIKZ_MAX_NODES})`, 'route_to_drawio');
  }
  if (edges.length > TIKZ_MAX_EDGES) {
    add('warning', 'tikz-budget', `${edges.length} edges exceeds the TikZ budget (${TIKZ_MAX_EDGES})`, 'route_to_drawio');
  }

  if (plan) {
    const coords = new Map();
    plan.nodes.forEach((n) => {
      const key = `${Number(n.x).toFixed(2)},${Number(n.y).toFixed(2)}`;
      if (coords.has(key)) add('error', 'duplicate-coordinates', `nodes '${coords.get(key)}' and '${n.id}' share coordinates (${key})`, 'move_label');
      else coords.set(key, n.id);
    });
    const connected = new Set();
    edges.forEach((e) => { connected.add(e.from); connected.add(e.to); });
    if (nodes.length > 1) {
      const isolated = nodes.filter((n) => !connected.has(n.id));
      if (isolated.length) add('warning', 'disconnected', `${isolated.length} node(s) have no edges: ${isolated.map((n) => n.id).join(', ')}`, 'reroute_edge');
    }
    if (plan.archetype === 'feature-space') {
      const missing = nodes.filter((n) => !(n.geometry && Number.isFinite(n.geometry.x) && Number.isFinite(n.geometry.y)));
      if (missing.length) add('warning', 'geometry', `${missing.length} feature node(s) have no geometry; fallback positions used`, 'move_label');
    }
  }

  return findings;
}

module.exports = { validateFigure };
