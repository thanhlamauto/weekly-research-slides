'use strict';

const { walk, boundsOf } = require('../renderer/scene');
const { LAYOUT } = require('../renderer/theme');
const { qaScene } = require('../qa/geometry');
const { analyzeSlide } = require('./budgets');
const T = require('./textutil');

const SEV = { error: 'high', warning: 'medium', info: 'low' };

// Visual Critic: inspects the rendered slide image (pixel metrics) plus a small
// number of geometry signals. It is not allowed to pass a slide on PPT geometry
// alone; the rendered image is required.
function critiqueVisual(spec, scene, images) {
  const findings = [];
  const add = (slideId, severity, issue, reason, action, op) =>
    findings.push({ slide: slideId, critic: 'visual', severity, issue, reason, action, op: op || null });

  const sceneSlides = scene ? scene.slides : [];
  const byId = new Map(sceneSlides.map((s) => [s.id, s]));

  // geometry signals (supporting, not sufficient)
  const geo = qaScene(scene || { slides: [] });
  for (const g of geo) {
    const sev = SEV[g.level] || 'low';
    if (sev === 'low') continue;
    add(g.slide, sev, `geometry_${g.code || g.check}`, g.message, 'fix the layout in the source');
  }

  // pixel signals
  if (images && images.length) {
    const sorted = images.slice().sort((a, b) => a.file.localeCompare(b.file));
    sceneSlides.forEach((sl, i) => {
      const m = sorted[i];
      if (!m) return;
      const arch = (spec.slides[i] || {}).archetype;
      const isTitle = arch === 'title';
      if (m.border_touch) add(sl.id, 'high', 'content_outside_safe_region',
        'ink touches the frame border; content is too close to the edge', 'increase margins / reduce content');
      if (m.ink_ratio > 0.14) add(sl.id, 'high', 'visually_dense',
        `ink covers ${(m.ink_ratio * 100).toFixed(1)}% of the slide`, 'remove or move text to speaker notes');
      else if (m.ink_ratio < 0.02) add(sl.id, 'medium', 'sparse_slide',
        `ink covers only ${(m.ink_ratio * 100).toFixed(1)}% of the slide`, 'add the missing focal content');
      if (!isTitle && m.ink_ratio > 0.03 && m.grid_min < 0.002 && m.grid_max > 0.10) {
        add(sl.id, 'medium', 'dead_whitespace_and_cramped',
          `uneven density (min ${m.grid_min}, max ${m.grid_max})`, 'rebalance: spread the crowded region');
      }
      if (!isTitle && (Math.abs(m.com_dx) > 0.2 || Math.abs(m.com_dy) > 0.22)) {
        add(sl.id, 'medium', 'imbalance',
          `content centre is offset (${m.com_dx}, ${m.com_dy})`, 'rebalance the composition');
      }
      if (!isTitle && (m.dominant_colors || 0) > 8) add(sl.id, 'medium', 'palette_scatter',
        `${m.dominant_colors} dominant colours; looks decorative`, 'reduce to the semantic palette');
      if (m.grid.filter((v) => v > 0.08).length >= 3) add(sl.id, 'medium', 'competing_focal_points',
        'three or more dense regions compete for attention', 'choose one focal point');
    });
  } else {
    add(sceneSlides[0] ? sceneSlides[0].id : null, 'info', 'no_image_metrics',
      'rendered-image metrics unavailable (Pillow/numpy missing); visual QA degraded to geometry',
      'install Pillow+numpy for real visual inspection');
  }

  // composition smells from the scene
  for (const sl of sceneSlides) {
    const prims = [];
    walk(sl.primitives, (p) => prims.push(p));
    const texts = prims.filter((p) => p.kind === 'text');
    const centeredBody = texts.filter((p) => {
      const st = p.style || {};
      return st.align === 'center' && st.valign === 'middle' && (st.size || 0) >= 14
        && String(p.text).split('\n').length >= 1 && String(p.text).split(' ').length > 6
        && !/^(kicker|title|subtitle|footer)/.test(p.id || '');
    });
    if (centeredBody.length >= 2) add(sl.id, 'medium', 'centered_body',
      `${centeredBody.length} centred multi-word text blocks`, 'left-align body text');
    const cards = prims.filter((p) => p.kind === 'roundRect').length;
    if (cards > 10) add(sl.id, 'medium', 'excessive_cards',
      `${cards} rounded cards`, 'reduce card usage; group instead');
    const specSlide = (spec.slides || []).find((s) => s.id === sl.id);
    if (specSlide) {
      const a = analyzeSlide(specSlide);
      const biggest = a.entries.filter((e) => e.role !== 'exempt').sort((x, y) => T.words(y.text).length - T.words(x.text).length)[0];
      if (biggest && T.jaccard(specSlide.title, biggest.text) > 0.5) {
        add(sl.id, 'medium', 'title_body_redundancy',
          'the largest body text repeats the title', 'delete the body text; keep the title',
          { op: 'move_to_notes', path: biggest.path });
      }
      if (['feature-space', 'benchmark'].includes(sl.archetype)) {
        const visualArea = prims.filter((p) => p.kind !== 'text' && p.id !== 'bg').reduce((n, p) => {
          const b = boundsOf(p); return n + b.w * b.h;
        }, 0);
        const slideArea = LAYOUT.w * LAYOUT.h;
        if (visualArea / slideArea < 0.12 && a.visibleWords > 25) {
          add(sl.id, 'medium', 'diagram_too_small',
            'the diagram is small relative to the explanatory text', 'enlarge the diagram and cut prose');
        }
      }
    }
  }
  return findings;
}

module.exports = { critiqueVisual };
