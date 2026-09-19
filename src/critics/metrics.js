'use strict';

const { analyzeSlide } = require('./budgets');

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

module.exports = { slideMetrics, deckMetrics, layoutVariant };
