'use strict';

const { analyzeSlide } = require('./budgets');
const { walk, boundsOf } = require('../renderer/scene');
const { LAYOUT } = require('../renderer/theme');

const NEUTRAL_FILLS = new Set(['FFFFFF', 'F6F6F4', 'F2F2F0', 'EAF1F4', 'F6EDE3', 'E9F1EC',
  'F5E9E7', 'EDEAF4', 'F4F6F6', 'E8F0F3', 'F7EEE2', 'EAF1FE', 'FEF3C7', 'DCFCE7',
  'FEE2E2', 'EDE9FE', 'F1F5F9', 'F9FAFB']);

function styleMetrics(scene) {
  const slideArea = LAYOUT.w * LAYOUT.h;
  const slides = (scene ? scene.slides : []).map((sl) => {
    let cards = 0, blocks = 0, figureArea = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const sizes = new Set(), accents = new Set();
    walk(sl.primitives, (p) => {
      if (p.kind === 'roundRect' && !/^(chrome-|frame-)/.test(p.id || '')) cards += 1;
      if (/__rule$/.test(p.id || '')) blocks += 1;
      if (p.kind === 'text' && p.style && p.style.size) sizes.add(p.style.size);
      if (p.fill && !NEUTRAL_FILLS.has(String(p.fill).toUpperCase())) accents.add(p.fill);
      if (p.kind !== 'text' && !/^(bg|chrome-|frame-|footer|kicker|title|header)/.test(p.id || '')) {
        const b = boundsOf(p); figureArea += b.w * b.h;
        minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
        maxX = Math.max(maxX, b.x + b.w); maxY = Math.max(maxY, b.y + b.h);
      }
    });
    const bbox = Number.isFinite(minX) ? Math.max(0, (maxX - minX) * (maxY - minY)) : 0;
    return {
      id: sl.id, archetype: sl.archetype, cards, blocks,
      accentColors: accents.size,
      figureAreaRatio: +(figureArea / slideArea).toFixed(3),
      figureBBoxRatio: +(bbox / slideArea).toFixed(3),
      fontSizes: [...sizes].sort((a, b) => a - b),
    };
  });
  const avg = (f) => +(slides.reduce((n, s) => n + f(s), 0) / Math.max(1, slides.length)).toFixed(2);
  return {
    slides,
    summary: {
      avg_cards: avg((s) => s.cards),
      avg_blocks: avg((s) => s.blocks),
      avg_accent_colors: avg((s) => s.accentColors),
      max_font_hierarchy: Math.max(0, ...slides.map((s) => s.fontSizes.length)),
      figure_dominant_slides: slides.filter((s) => s.figureBBoxRatio >= 0.3).length,
    },
  };
}

function layoutVariant(slide) {
  const c = slide.content || {};
  const shape = (v) => {
    if (Array.isArray(v)) return `${v.length}`;
    if (v && typeof v === 'object') return `{${Object.keys(v).sort().join(',')}}`;
    return v === undefined || v === null || v === '' ? '-' : 's';
  };
  return [slide.archetype, ...Object.keys(c).sort().map((k) => `${k}:${shape(c[k])}`)].join('|');
}

function slideMetrics(spec) {
  return (spec.slides || []).map((s) => {
    const a = analyzeSlide(s);
    return {
      id: s.id, role: s.archetype, title: s.title, layout: layoutVariant(s),
      titleWords: a.titleWords, visibleWords: a.visibleWords, proseWords: a.proseWords,
      clusters: a.clusters, noteWords: a.noteWords, noteRatio: a.noteRatio,
    };
  });
}

function deckMetrics(spec, images) {
  const slides = slideMetrics(spec);
  let streak = 0; let maxStreak = 0; let last = null;
  for (const s of slides) {
    streak = s.layout === last ? streak + 1 : 1;
    last = s.layout;
    maxStreak = Math.max(maxStreak, streak);
  }
  const totalVisible = slides.reduce((n, s) => n + s.visibleWords, 0);
  const totalNotes = slides.reduce((n, s) => n + s.noteWords, 0);
  const ink = (images || []).map((m) => m.ink_ratio).sort((a, b) => a - b);
  return {
    slide_count: slides.length,
    total_visible_words: totalVisible,
    total_note_words: totalNotes,
    note_to_visible_ratio: +(totalNotes / Math.max(1, totalVisible)).toFixed(2),
    avg_visible_words: +(totalVisible / Math.max(1, slides.length)).toFixed(1),
    max_repeated_layout_streak: maxStreak,
    distinct_layouts: new Set(slides.map((s) => s.layout)).size,
    median_ink_ratio: ink.length ? +ink[Math.floor(ink.length / 2)].toFixed(4) : null,
    slides,
  };
}

module.exports = { slideMetrics, deckMetrics, layoutVariant, styleMetrics };
