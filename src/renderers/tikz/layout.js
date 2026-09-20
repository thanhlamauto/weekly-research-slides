'use strict';

// TikZ-native layout for semantic figures.
//
// Layout is renderer-specific and deterministic. Scientific meaning comes from
// the figure spec (node ids, semantic ids, roles, edges, annotations); this
// module only decides coordinates, using semantic ids to keep shared objects
// aligned across panels (competitor-vs-ours, method-delta).

const { nodeStyle, edgeStyle, roleColor, roleFill } = require('./styles');

const COL = 2.4;         // cm between column centers
const ROW = 1.3;         // cm between rows inside a column
const PANEL_GAP = 1.6;   // cm between panels
const NODE_MARGIN = 1.7; // cm of panel padding for the widest node
const DEFAULT_WIDTH_CM = 10.5;
const MAX_HEIGHT_CM = 6.2;

function tikzName(id) {
  return String(id).replace(/[^A-Za-z0-9_-]/g, '-');
}

function archetypeOf(spec) {
  const fig = spec.figure || {};
  if (fig.diagram) return fig.diagram;
  const type = fig.type;
  const mode = fig.mode;
  if (type === 'diagnostic' || mode === 'diagnostic') return 'feature-space';
  if (type === 'method-comparison' || mode === 'comparison') return 'competitor-vs-ours';
  if (type === 'method-delta' || mode === 'delta') return 'method-delta';
  if (type === 'temporal-process') return 'stage-split';
  if (type === 'iterative-process' || type === 'training-vs-inference') return 'process-loop';
  const edges = spec.edges || [];
  const outdeg = new Map();
  edges.forEach((e) => outdeg.set(e.from, (outdeg.get(e.from) || 0) + 1));
  const maxOut = Math.max(0, ...outdeg.values());
  if (maxOut > 1) return 'branch-flow';
  return 'linear-flow';
}

function assignLayers(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  const layer = new Map(nodes.map((n) => [n.id, 0]));
  for (let iter = 0; iter <= nodes.length; iter += 1) {
    let changed = false;
    for (const e of edges) {
      if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) continue;
      const want = (layer.get(e.from) || 0) + 1;
      if (want > (layer.get(e.to) || 0) && want < nodes.length) {
        layer.set(e.to, want);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return layer;
}

function panelGroups(spec) {
  const nodes = spec.nodes || [];
  const panels = (spec.panels && spec.panels.length) ? spec.panels : [{ id: '__single', label: null }];
  const byPanel = new Map(panels.map((p) => [p.id, []]));
  for (const n of nodes) {
    const pid = n.panel && byPanel.has(n.panel) ? n.panel : panels[0].id;
    byPanel.get(pid).push(n);
  }
  return panels
    .filter((p) => byPanel.get(p.id).length)
    .map((p) => ({ panel: p, nodes: byPanel.get(p.id) }));
}

// Align shared semantic ids to the same layer across panels.
function unifiedLayers(groups, edges) {
  const maxBySemantic = new Map();
  const perGroup = groups.map((g) => {
    const layer = assignLayers(g.nodes, edges);
    g.nodes.forEach((n) => {
      const key = n.semantic_id || n.id;
      const cur = maxBySemantic.get(key);
      if (cur === undefined || layer.get(n.id) > cur) maxBySemantic.set(key, layer.get(n.id));
    });
    return layer;
  });
  perGroup.forEach((layer, gi) => {
    groups[gi].nodes.forEach((n) => layer.set(n.id, maxBySemantic.get(n.semantic_id || n.id)));
  });
  return perGroup;
}

function edgeEndpointsIn(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id));
  return edges.filter((e) => ids.has(e.from) && ids.has(e.to));
}

function pipelinePlan(spec, opts = {}) {
  const groups = panelGroups(spec);
  const edges = spec.edges || [];
  const layers = unifiedLayers(groups, edges);

  // Global rows per layer, ordered by semantic id, so panels align vertically.
  const rowsByLayer = new Map();
  for (const g of groups) {
    for (const n of g.nodes) {
      const l = layers[groups.indexOf(g)].get(n.id);
      const key = n.semantic_id || n.id;
      if (!rowsByLayer.has(l)) rowsByLayer.set(l, []);
      if (!rowsByLayer.get(l).includes(key)) rowsByLayer.get(l).push(key);
    }
  }

  const plan = { archetype: opts.archetype, nodes: [], edges: [], stages: [], notes: [], legend: [], width: 0, height: 0, warnings: [] };
  const multiPanel = groups.length > 1;
  let panelX = 0;
  let maxY = 0;

  groups.forEach((g, gi) => {
    const layer = layers[gi];
    const maxLayer = Math.max(0, ...g.nodes.map((n) => layer.get(n.id) || 0));
    const width = maxLayer * COL + NODE_MARGIN;
    if (multiPanel) {
      plan.stages.push({
        x0: panelX - 0.35, y0: -1.15, x1: panelX + width + 0.35, y1: 1.35,
        label: g.panel.label || g.panel.id, role: g.panel.role || 'shared',
        headerY: 1.65,
      });
    } else if (g.panel.label) {
      plan.stages.push({
        x0: panelX - 0.35, y0: -1.15, x1: panelX + width + 0.35, y1: 1.35,
        label: g.panel.label, role: g.panel.role || 'shared', headerY: 1.65,
      });
    }
    g.nodes.forEach((n) => {
      const l = layer.get(n.id);
      const key = n.semantic_id || n.id;
      const rows = rowsByLayer.get(l);
      const rowIdx = rows.indexOf(key);
      const y = (rowIdx - (rows.length - 1) / 2) * ROW;
      maxY = Math.max(maxY, Math.abs(y));
      const st = nodeStyle(n);
      plan.nodes.push({
        id: n.id, name: tikzName(n.id), semantic: n.semantic_id || n.id,
        x: panelX + l * COL, y,
        style: st.base, draw: st.draw, fill: st.fill,
        label: n.label || '', detail: n.detail || null, role: n.role || 'shared',
      });
    });
    panelX += width + (multiPanel ? PANEL_GAP : 0);
  });

  plan.width = Math.max(0, panelX - (multiPanel ? PANEL_GAP : 0));
  plan.height = 2 * maxY + 2.6;

  const byId = new Map(plan.nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) continue;
    const feedback = b.x <= a.x || e.role === 'feedback' || e.role === 'gradient';
    plan.edges.push({
      id: e.id || `${e.from}->${e.to}`,
      from: a.name, to: b.name,
      style: edgeStyle(e), label: e.label || null,
      feedback,
      emphasis: Boolean(e.emphasis),
    });
  }

  // Annotations attached to nodes.
  (spec.annotations || []).forEach((a, i) => {
    const target = byId.get(a.target);
    if (!target) return;
    const placement = a.placement || 'above';
    const dx = placement === 'left' ? -0.55 : placement === 'right' ? 0.55 : 0;
    const dy = placement === 'above' ? 0.75 : placement === 'below' ? -0.95 : 0;
    plan.notes.push({
      id: a.id || `ann-${i}`, x: target.x + dx, y: target.y + dy,
      text: a.text, role: a.role || 'note',
      anchor: placement === 'left' ? 'east' : placement === 'right' ? 'west' : 'center',
    });
  });

  if (spec.legend && spec.legend.length) {
    plan.legend = spec.legend.map((l) => ({ role: l.role, label: l.label }));
  }

  return plan;
}

function featureSpacePlan(spec) {
  const nodes = spec.nodes || [];
  const edges = spec.edges || [];
  const fig = spec.figure || {};
  const widthCm = (fig.rendering && fig.rendering.width_cm) || DEFAULT_WIDTH_CM;
  const plan = { archetype: 'feature-space', nodes: [], edges: [], arcs: [], stages: [], notes: [], legend: [], width: widthCm, height: 0, warnings: [] };

  const pts = nodes.map((n, i) => {
    if (n.geometry && Number.isFinite(n.geometry.x) && Number.isFinite(n.geometry.y)) {
      return { x: n.geometry.x, y: n.geometry.y };
    }
    const fallback = { left: [0, 0], right: [4, 0], top: [1, 2.5], bottom: [1, -2.5] };
    const key = n.role && fallback[n.role] ? n.role : (i === 0 ? 'left' : i === 1 ? 'right' : 'top');
    return { x: fallback[key][0], y: fallback[key][1] };
  });
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const spanX = Math.max(0.5, maxX - minX);
  const spanY = Math.max(0.5, maxY - minY);
  const scale = Math.min(widthCm / spanX, MAX_HEIGHT_CM / spanY);

  const pos = new Map();
  nodes.forEach((n, i) => {
    const x = (pts[i].x - minX) * scale;
    const y = (pts[i].y - minY) * scale;
    pos.set(n.id, { x, y });
    const st = nodeStyle(n);
    plan.nodes.push({
      id: n.id, name: tikzName(n.id), semantic: n.semantic_id || n.id,
      x, y, style: st.base, draw: st.draw, fill: st.fill,
      label: n.label || '', detail: n.detail || null, role: n.role || 'shared',
    });
  });
  plan.width = spanX * scale;
  plan.height = spanY * scale;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    const a = pos.get(e.from); const b = pos.get(e.to);
    const isReference = e.role === 'reference';
    const isVector = e.emphasis || (!isReference && Boolean(e.label));
    plan.edges.push({
      id: e.id || `${e.from}->${e.to}`,
      from: tikzName(e.from), to: tikzName(e.to),
      style: isReference ? 'methodReference' : (isVector ? 'methodVector' : edgeStyle(e)),
      label: e.label || null,
      labelSide: Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? 'above' : 'left',
      feedback: false,
      emphasis: Boolean(e.emphasis),
    });
  }

  // Angle arc at the node that starts two outgoing vectors. `angle_at` may sit
  // on the figure or at the spec top level; the desired direction is usually a
  // reference edge, so all outgoing edges are candidates.
  const originId = fig.angle_at || spec.angle_at
    || (nodes.find((n) => edges.filter((e) => e.from === n.id).length >= 2) || {}).id;
  const angleConsumed = (a) => Boolean(originId) && a.target === originId && a.role === 'measurement';
  if (originId && pos.has(originId)) {
    const outgoing = edges.filter((e) => e.from === originId && pos.has(e.to));
    if (outgoing.length >= 2) {
      const o = pos.get(originId);
      const angles = outgoing.slice(0, 2).map((e) => {
        const t = pos.get(e.to);
        return Math.atan2(t.y - o.y, t.x - o.x) * 180 / Math.PI;
      });
      let [a1, a2] = angles;
      let diff = a2 - a1;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      if (diff < 0) { [a1, a2] = [a2, a1]; diff = -diff; }
      const label = (spec.annotations || []).find((a) => a.target === originId && a.role === 'measurement');
      plan.arcs.push({
        cx: o.x, cy: o.y, r: 0.75,
        start: a1, end: a1 + diff,
        label: label ? label.text : `${Math.round(diff)}$^\\circ$`,
        labelR: 1.08, labelAngle: a1 + diff / 2,
      });
    }
  }

  // Measurement annotations on edges -> labels at the midpoint.
  (spec.annotations || []).forEach((a, i) => {
    if (angleConsumed(a)) return;
    if (a.target && byId.has(a.target)) {
      const p = pos.get(a.target);
      const placement = a.placement || 'above';
      const dx = placement === 'left' ? -0.7 : placement === 'right' ? 0.7 : 0;
      const dy = placement === 'above' ? 0.8 : placement === 'below' ? -1.0 : 0;
      plan.notes.push({ id: a.id || `ann-${i}`, x: p.x + dx, y: p.y + dy, text: a.text, role: a.role || 'note', anchor: 'center' });
    } else {
      const e = edges.find((x) => (x.id || `${x.from}->${x.to}`) === a.target);
      if (!e || !pos.has(e.from) || !pos.has(e.to)) return;
      const pa = pos.get(e.from); const pb = pos.get(e.to);
      plan.notes.push({
        id: a.id || `ann-${i}`,
        x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 - 0.42,
        text: a.text, role: a.role || 'measurement', anchor: 'center',
      });
    }
  });

  if (spec.legend && spec.legend.length) {
    plan.legend = spec.legend.map((l) => ({ role: l.role, label: l.label }));
  }
  return plan;
}

function stageSplitPlan(spec) {
  const groups = panelGroups(spec);
  const edges = spec.edges || [];
  const plan = { archetype: 'stage-split', nodes: [], edges: [], stages: [], notes: [], legend: [], width: 0, height: 0, warnings: [] };
  const stageW = 3.4;
  let x = 0;
  const byId = new Map();
  groups.forEach((g) => {
    const count = g.nodes.length;
    g.nodes.forEach((n, i) => {
      const y = count > 1 ? (i - (count - 1) / 2) * ROW : 0;
      const st = nodeStyle(n);
      const node = {
        id: n.id, name: tikzName(n.id), semantic: n.semantic_id || n.id,
        x: x + stageW / 2, y, style: st.base, draw: st.draw, fill: st.fill,
        label: n.label || '', detail: n.detail || null, role: n.role || 'shared',
      };
      plan.nodes.push(node);
      byId.set(n.id, node);
    });
    plan.stages.push({
      x0: x, y0: -1.2, x1: x + stageW, y1: 1.3,
      label: g.panel.label || g.panel.id, role: g.panel.role || 'shared', headerY: 1.55,
    });
    x += stageW + 0.55;
  });
  plan.width = x - 0.55;
  plan.height = 4.2;
  for (const e of edges) {
    const a = byId.get(e.from); const b = byId.get(e.to);
    if (!a || !b) continue;
    plan.edges.push({ id: e.id || `${e.from}->${e.to}`, from: a.name, to: b.name, style: edgeStyle(e), label: e.label || null, feedback: false, emphasis: Boolean(e.emphasis) });
  }
  if (spec.legend && spec.legend.length) {
    plan.legend = spec.legend.map((l) => ({ role: l.role, label: l.label }));
  }
  return plan;
}

function layoutFigure(spec, opts = {}) {
  const archetype = opts.archetype || archetypeOf(spec);
  switch (archetype) {
    case 'feature-space': return featureSpacePlan(spec);
    case 'stage-split': return stageSplitPlan(spec);
    default: return pipelinePlan(spec, { archetype });
  }
}

module.exports = { layoutFigure, archetypeOf, tikzName, COL, ROW };
