'use strict';

const { BUDGETS, analyzeSlide, isCategoryTitle, words } = require('./budgets');
const T = require('./textutil');

// Fields that must never be demoted: removing them would break scientific QA.
const PROTECTED = {
  // keep the diagnostic bands populated; these are shortened, never removed
  diagnostic: ['question', 'measurement', 'observation', 'interpretation',
    'can_conclude', 'cannot_conclude', 'alternative_explanation'],
  // a recap needs its established points; shorten them, do not delete them
  recap: ['established[].detail', 'now'],
  claim: ['statement'],
  'claim-delta': ['claims[].statement'],
  interpretation: ['observation', 'interpretation', 'claim.statement'],
};
function isProtected(slide, path) {
  const keys = PROTECTED[slide.archetype] || [];
  const norm = (p) => String(p).replace(/\[\d+\]/g, '[]');
  const n = norm(path);
  return keys.some((k) => n === norm(k));
}

// Content Critic: scientific correctness, concision, redundancy, necessity, and
// whether text belongs on the slide or in the speaker notes. It prefers
// deleting or demoting text over adding any.
function critiqueContent(spec) {
  const findings = [];
  const add = (slide, severity, issue, reason, action, op) =>
    findings.push({ slide: slide.id, critic: 'content', severity, issue, reason, action, op: op || null });

  for (const slide of spec.slides || []) {
    const a = analyzeSlide(slide);
    const c = slide.content || {};

    // budgets
    if (a.titleWords > BUDGETS.titleMaxWords) {
      add(slide, 'medium', 'title_too_long',
        `title has ${a.titleWords} words (budget ${BUDGETS.titleMaxWords})`,
        'shorten the title to one claim or question', null);
    }
    if (a.visibleWords > BUDGETS.visibleMaxWords) {
      add(slide, 'medium', 'visible_text_over_budget',
        `visible text has ${a.visibleWords} words (budget ${BUDGETS.visibleMaxWords})`,
        'shorten the longest passages', null);
    }
    // Long visible fields: narration-like prose is demoted to notes; other long
    // fields keep their first sentence and move the remainder to notes. This
    // also relieves the overflow it causes.
    const overage = a.visibleWords / BUDGETS.visibleMaxWords;
    a.entries.filter((e) => e.role !== 'exempt' && words(e.text).length > 14)
      .sort((x, y) => words(y.text).length - words(x.text).length)
      .forEach((e) => {
        const demote = e.role === 'prose' && !isProtected(slide, e.path)
          && (T.looksLikeNarration(e.text) || overage > 1.5);
        add(slide, 'medium', demote ? 'spoken_explanation_on_slide' : 'long_field',
          `"${T.firstSentence(e.text).slice(0, 48)}…" is ${words(e.text).length} words`,
          demote ? 'move it to speaker notes' : 'keep the first sentence on the slide, move the rest to notes',
          demote ? { op: 'move_to_notes', path: e.path } : { op: 'shorten_field', path: e.path, toNotes: true, maxWords: 18 });
      });
    if (a.clusters > BUDGETS.maxClusters) {
      add(slide, 'medium', 'too_many_text_clusters',
        `${a.clusters} text clusters (budget ${BUDGETS.maxClusters})`,
        'merge or delete the least essential cluster', null);
    }

    // redundancy: explanatory prose that mostly repeats the title. Essential
    // fields (a claim, a question) may legitimately echo the title.
    for (const e of a.entries.filter((x) => x.role === 'prose' && !isProtected(slide, x.path))) {
      if (T.jaccard(slide.title, e.text) > 0.6) {
        add(slide, 'high', 'redundant_explanation',
          `"${e.text.slice(0, 40)}…" repeats the title`,
          'remove it; the title already says this', { op: 'drop_field', path: e.path });
      }
    }

    // necessity: two visible fields saying the same thing
    const vis = a.entries.filter((e) => e.role !== 'exempt');
    for (let i = 0; i < vis.length; i += 1) {
      for (let j = i + 1; j < vis.length; j += 1) {
        if (isProtected(slide, vis[j].path)) continue;
        if (T.jaccard(vis[i].text, vis[j].text) > 0.7) {
          add(slide, 'high', 'duplicated_information',
            `"${vis[j].text.slice(0, 40)}…" duplicates another element on the slide`,
            'keep one, delete the other', { op: 'drop_field', path: vis[j].path });
        }
      }
    }

    // narration on the slide
    for (const e of a.entries.filter((x) => x.role === 'prose' && !isProtected(slide, x.path))) {
      if (T.looksLikeNarration(e.text)) {
        add(slide, 'high', 'spoken_explanation_on_slide',
          `"${T.firstSentence(e.text).slice(0, 48)}…" reads like presenter narration`,
          'move it to speaker notes', { op: 'move_to_notes', path: e.path });
      }
    }

    // action titles
    if (isCategoryTitle(slide.title)) {
      const source = a.entries.find((e) => e.role === 'essential') || a.entries.find((e) => e.role === 'prose');
      add(slide, 'medium', 'category_title',
        `title "${slide.title}" names a category, not a claim`,
        source ? `use the ${source.path} as the title` : 'rewrite the title as a claim or question',
        source ? { op: 'retitle', from: source.path } : null);
    }

    // role-specific
    if (slide.archetype === 'recap' && a.visibleWords > 26) {
      add(slide, 'medium', 'recap_not_compressed',
        `recap has ${a.visibleWords} visible words; a recap must be severely compressed`,
        'compress the recap; keep only what this week\'s delta needs', null);
    }
    if (slide.archetype === 'competitor-mechanism' && a.proseWords > 20) {
      const mech = a.entries.find((e) => e.path === 'mechanism') || a.entries.find((e) => e.role === 'prose');
      add(slide, 'high', 'competitor_over_explained',
        `competitor mechanism has ${a.proseWords} prose words; include only what the argument needs`,
        'keep problem, operation, assumption, weakness; move the rest to notes',
        mech ? { op: 'move_to_notes', path: mech.path } : null);
    }
    if (slide.archetype === 'diagnostic' && a.visibleWords > BUDGETS.visibleMaxWords) {
      // The slide must keep question/measurement/observation (and interpretation,
      // which scientific QA requires); demote the alternative explanation instead.
      add(slide, 'medium', 'diagnostic_dense',
        'diagnostic is dense; the slide needs question, measurement, observation',
        'shorten the diagnostic bands; keep the measurement separate', null);
    }
    if (slide.archetype === 'method-delta' && !(c.changes || []).length) {
      add(slide, 'high', 'method_delta_empty',
        'method-delta has no changed components to show',
        'add the change or delete the slide', null);
    }
    if (slide.archetype === 'question' && (c.success_criteria || []).length > 3) {
      add(slide, 'medium', 'too_many_criteria',
        `${c.success_criteria.length} success criteria`,
        'keep at most three', { op: 'cap_list', path: 'success_criteria', keep: 3 });
    }
    if (slide.archetype === 'claim' && a.clusters > 2) {
      add(slide, 'medium', 'claim_busy',
        `claim slide has ${a.clusters} text clusters`,
        'one claim, one supporting visual, minimal text', null);
    }

    // academic mode: when a figure carries the argument, it must dominate
    if (['feature-space', 'benchmark', 'method-high-level', 'method-landscape',
      'competitor-mechanism', 'experiment'].includes(slide.archetype) && a.proseWords > 16) {
      const prose = a.entries.filter((e) => e.role === 'prose' && !isProtected(slide, e.path))
        .sort((x, y) => words(y.text).length - words(x.text).length)[0];
      add(slide, 'medium', 'beamer_overexplained',
        `figure slide carries ${a.proseWords} words of prose; the figure should dominate`,
        'state the point in the title or one annotation, move the rest to notes',
        prose ? { op: 'move_to_notes', path: prose.path } : null);
    }

    // preserve measurement/observation/interpretation separation (defensive)
    if (slide.archetype === 'diagnostic' && c.observation && c.interpretation
      && c.observation.trim() === c.interpretation.trim()) {
      add(slide, 'high', 'collapsed_epistemics',
        'observation and interpretation are identical',
        'restore the distinction; keep the measurement separate', null);
    }
  }
  return findings;
}

module.exports = { critiqueContent };
