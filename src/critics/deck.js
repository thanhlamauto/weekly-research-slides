'use strict';

const { BUDGETS, analyzeSlide, isCategoryTitle } = require('./budgets');
const T = require('./textutil');

function bodyText(slide) {
  const a = analyzeSlide(slide);
  return a.entries.filter((e) => e.role !== 'exempt').map((e) => e.text).join(' ');
}

// Deck Critic: narrative progression, duplication, layout/density rhythm, and
// whether slides can be merged or deleted. Works on the contact sheet view
// (per-slide rendered metrics + roles + content summaries).
function critiqueDeck(spec, scene, images) {
  const findings = [];
  const add = (slide, severity, issue, reason, action, op) =>
    findings.push({ slide, critic: 'deck', severity, issue, reason, action, op: op || null });
  const slides = spec.slides || [];
  const analyses = slides.map(analyzeSlide);

  // repeated layout streak
  let run = 1;
  for (let i = 1; i < slides.length; i += 1) {
    if (slides[i].archetype === slides[i - 1].archetype) run += 1; else run = 1;
    if (run === 3) add(slides[i].id, 'medium', 'repeated_layout',
      `three consecutive "${slides[i].archetype}" slides`, 'vary the layout or merge these slides');
  }
  const archCount = {};
  slides.forEach((s) => { archCount[s.archetype] = (archCount[s.archetype] || 0) + 1; });
  Object.entries(archCount).forEach(([arch, n]) => {
    if (n >= 4) add(slides[0].id, 'medium', 'too_many_equivalent',
      `${n} slides use the "${arch}" layout`, 'diversify layouts or merge slides');
  });

  // duplicated explanation between adjacent slides
  for (let i = 1; i < slides.length; i += 1) {
    const prev = slides[i - 1]; const cur = slides[i];
    const titleSim = T.jaccard(prev.title, cur.title);
    const bodySim = T.jaccard(bodyText(prev), bodyText(cur));
    if (titleSim > 0.6 || bodySim > 0.55) {
      add(cur.id, 'high', 'duplicated_explanation',
        `slide repeats the previous slide (title ${titleSim.toFixed(2)}, body ${bodySim.toFixed(2)})`,
        `merge into ${prev.id} or delete`, { op: 'merge_slides', from: cur.id, into: prev.id });
    }
  }

  // density rhythm
  if (images && images.length >= 4) {
    const sorted = images.slice().sort((a, b) => a.file.localeCompare(b.file));
    const inks = sorted.map((m) => m.ink_ratio).sort((a, b) => a - b);
    const median = inks[Math.floor(inks.length / 2)] || 0;
    sorted.forEach((m, i) => {
      if (median > 0 && m.ink_ratio > 1.7 * median && m.ink_ratio > 0.08) {
        const sl = (scene ? scene.slides[i] : null) || slides[i];
        if (sl) add(sl.id, 'medium', 'density_spike',
          `density jumps to ${(m.ink_ratio * 100).toFixed(1)}% (median ${(median * 100).toFixed(1)}%)`,
          'split or compress this slide');
      }
    });
  }

  // narrative visible from titles
  const categoryTitles = slides.filter((s) => isCategoryTitle(s.title));
  if (categoryTitles.length > 2) {
    add(categoryTitles[0].id, 'medium', 'narrative_not_in_titles',
      `${categoryTitles.length} titles name categories, not claims`,
      'rewrite titles as claims or questions so the story reads from titles alone');
  }

  // thin slides (delete candidates)
  analyses.forEach((a) => {
    if (a.visibleWords < 6 && a.noteWords < 5) {
      add(a.id, 'medium', 'thin_slide',
        `only ${a.visibleWords} visible words and little in notes`,
        'delete or merge this slide', { op: 'delete_slide', id: a.id });
    }
  });

  // merge candidates: adjacent same archetype that are genuinely similar. Two
  // adjacent slides of the same layout (e.g. an object-permanence pair) are not
  // merged just because they are short.
  for (let i = 1; i < slides.length; i += 1) {
    const sameArch = slides[i].archetype === slides[i - 1].archetype;
    if (!sameArch) continue;
    const sim = Math.max(T.jaccard(slides[i].title, slides[i - 1].title), T.jaccard(bodyText(slides[i]), bodyText(slides[i - 1])));
    if (sim > 0.5 && analyses[i].visibleWords > 0) {
      add(slides[i].id, 'medium', 'merge_candidates',
        `adjacent "${slides[i].archetype}" slides overlap (similarity ${sim.toFixed(2)})`,
        `merge into ${slides[i - 1].id}`, { op: 'merge_slides', from: slides[i].id, into: slides[i - 1].id });
    }
  }

  return findings;
}

module.exports = { critiqueDeck, bodyText };
