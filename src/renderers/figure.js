'use strict';

// Semantic figure pipeline: figure spec or Figure IR -> renderer routing ->
// prepared artifact (native TikZ .tex, or a Draw.io export for Beamer).
//
// The same Figure IR produced by the Python figure subsystem (skills/
// research-method-figure) can be rendered by TikZ: geometry is recomputed by
// the TikZ layout, while semantic ids, roles and labels are preserved.

const fs = require('fs');
const path = require('path');

const { loadData } = require('../model/validate');
const { routeFigure } = require('./router');
const { renderFigureTex } = require('./tikz/renderer');
const { validateFigure } = require('./tikz/validation');
const { critiqueTikz } = require('./tikz/critique');

function isFigureIR(data) {
  return Boolean(data && data.canvas && data.style && typeof data.style === 'object' && Array.isArray(data.nodes));
}

function compactDetail(detail, max = 26) {
  const s = String(detail || '').trim();
  if (!s || s.length <= max) return s || null;
  const cut = s.slice(0, max);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).trim()}…`;
}

// Figure IR (px geometry) -> semantic spec (layout recomputed by TikZ).
function irToSpec(ir) {
  const panels = (ir.panels || []).map((p) => ({ id: p.id, label: p.label, role: p.role }));
  const panelOf = (n) => {
    const cx = (n.x || 0) + (n.w || 0) / 2;
    const cy = (n.y || 0) + (n.h || 0) / 2;
    const hit = (ir.panels || []).find((p) => cx >= p.x && cx <= p.x + p.w && cy >= p.y && cy <= p.y + p.h);
    return hit ? hit.id : (panels[0] && panels[0].id);
  };
  return {
    figure: {
      id: ir.figure.id,
      type: ir.figure.type,
      mode: ir.figure.mode,
      title: ir.figure.title,
      purpose: ir.figure.purpose,
      rendering: { backend: 'auto' },
    },
    panels,
    nodes: (ir.nodes || []).map((n) => ({
      id: n.id,
      semantic_id: n.semantic_id,
      type: n.type,
      label: n.label,
      detail: compactDetail(n.detail),
      role: n.role,
      panel: panelOf(n),
    })),
    edges: (ir.edges || []).map((e) => ({
      id: e.id, from: e.from, to: e.to, role: e.role, label: e.label, emphasis: e.emphasis,
    })),
    annotations: (ir.annotations || []).map((a) => ({
      id: a.id, target: a.target, role: a.role, text: a.text, placement: a.placement,
    })),
    legend: ir.legend && ir.legend.entries ? ir.legend.entries.map((x) => ({ role: x.role, label: x.label })) : undefined,
  };
}

function loadFigureInput(file) {
  const data = loadData(file);
  if (isFigureIR(data)) return { spec: irToSpec(data), kind: 'ir', source: file };
  return { spec: data, kind: 'spec', source: file };
}

function figureEntries(spec) {
  const out = [];
  (spec.slides || []).forEach((s) => {
    const fig = s.content && s.content.figure;
    if (fig && typeof fig === 'object') out.push({ slide: s.id, key: fig.id || s.id, figure: fig });
  });
  return out;
}

function resolveFigureSpec(entry, specDir) {
  const fig = entry.figure;
  if (fig.spec) {
    const file = path.resolve(specDir, fig.spec);
    const data = loadData(file);
    return { spec: isFigureIR(data) ? irToSpec(data) : data, source: file, kind: isFigureIR(data) ? 'ir' : 'spec' };
  }
  if (fig.ir) {
    const file = path.resolve(specDir, fig.ir);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { spec: irToSpec(data), source: file, kind: 'ir' };
  }
  if (fig.inline) return { spec: fig.inline, source: null, kind: 'inline' };
  return null;
}

function scope(findings, entry) {
  return findings.map((f) => ({ ...f, slide: entry.slide, figure: entry.key }));
}

// Prepare every figure referenced by a deck: route it, render TikZ sources or
// copy Draw.io exports, and collect validation/critique findings.
function prepareFigures(deckSpec, opts = {}) {
  const specDir = opts.specDir || '.';
  const buildDir = opts.buildDir;
  const entries = figureEntries(deckSpec);
  const prepared = {};
  const findings = [];
  if (!entries.length) return { prepared, findings };

  const figuresDir = path.join(buildDir, 'figures');
  const assetsDir = path.join(buildDir, 'assets');

  entries.forEach((entry) => {
    // Explicit non-TikZ backend with an export path: include the file as-is.
    const explicit = entry.figure.backend;
    if (entry.figure.file && explicit && explicit !== 'auto' && explicit !== 'tikz') {
      const abs = path.resolve(specDir, entry.figure.file);
      if (!fs.existsSync(abs)) {
        findings.push({ level: 'error', check: 'figure-asset', slide: entry.slide, figure: entry.key, message: `figure export not found: ${entry.figure.file}` });
        return;
      }
      fs.mkdirSync(assetsDir, { recursive: true });
      fs.copyFileSync(abs, path.join(assetsDir, path.basename(abs)));
      prepared[entry.key] = {
        backend: explicit,
        assetFile: `assets/${path.basename(abs)}`,
        decision: {
          selected: explicit,
          reason: [`explicit backend: ${explicit}`, 'figure export included by path'],
          explicit: true,
          stats: null,
          figure: { id: entry.key, type: entry.figure.type || null, mode: null },
        },
        source: abs,
        kind: 'export',
      };
      return;
    }
    const resolved = resolveFigureSpec(entry, specDir);
    if (!resolved) {
      findings.push({ level: 'error', check: 'figure-spec', slide: entry.slide, figure: entry.key, message: `figure '${entry.key}' has no spec, ir or inline source` });
      return;
    }
    const figureSpec = resolved.spec;
    if (opts.widthCm && figureSpec.figure) {
      figureSpec.figure.rendering = { ...(figureSpec.figure.rendering || {}), width_cm: opts.widthCm };
    }
    const requested = entry.figure.backend || (figureSpec.figure.rendering || {}).backend || 'auto';
    const decision = routeFigure(figureSpec, { backend: requested });
    findings.push(...scope(validateFigure(figureSpec, null), entry));
    const overlays = (figureSpec.figure.rendering || {}).overlays;
    if (overlays && typeof entry.figure.width === 'number') {
      findings.push({
        level: 'warning', check: 'overlay-scale', slide: entry.slide, figure: entry.key,
        message: `figure '${entry.key}' combines overlays with an explicit width; \\resizebox breaks Beamer overlays`,
      });
    }

    if (decision.selected === 'tikz') {
      const rendered = renderFigureTex(figureSpec, { decision });
      findings.push(...scope(validateFigure(figureSpec, rendered.plan), entry));
      findings.push(...scope(critiqueTikz(figureSpec, rendered.plan), entry));
      fs.mkdirSync(figuresDir, { recursive: true });
      const texFile = `figures/${entry.key}.tex`;
      fs.writeFileSync(path.join(buildDir, texFile), rendered.tex);
      prepared[entry.key] = {
        backend: 'tikz',
        texFile,
        decision,
        source: resolved.source,
        kind: resolved.kind,
        plan: rendered.plan,
      };
      return;
    }

    const asset = entry.figure.file || (figureSpec.figure && figureSpec.figure.export);
    if (!asset) {
      findings.push({
        level: 'error', check: 'figure-asset', slide: entry.slide, figure: entry.key,
        message: `figure '${entry.key}' routes to ${decision.selected} but no file/export is provided`,
        action: decision.selected === 'drawio' ? 'route_to_tikz' : undefined,
      });
      return;
    }
    const abs = path.resolve(specDir, asset);
    if (!fs.existsSync(abs)) {
      findings.push({ level: 'error', check: 'figure-asset', slide: entry.slide, figure: entry.key, message: `figure export not found: ${asset}` });
      return;
    }
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.copyFileSync(abs, path.join(assetsDir, path.basename(abs)));
    prepared[entry.key] = {
      backend: decision.selected,
      assetFile: `assets/${path.basename(abs)}`,
      decision,
      source: resolved.source,
      kind: resolved.kind,
    };
  });

  return { prepared, findings };
}

module.exports = {
  isFigureIR, irToSpec, compactDetail, loadFigureInput, figureEntries, resolveFigureSpec, prepareFigures,
};
