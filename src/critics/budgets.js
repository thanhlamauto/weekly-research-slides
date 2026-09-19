'use strict';

// Soft budgets with hard warnings. Technical content (equations, axis labels,
// table values, citations, scientific labels) is exempt and never truncated.

const BUDGETS = {
  titleMaxWords: 12,
  visibleMaxWords: 30,
  maxClusters: 3,
  maxTakeaways: 1,
  proseMaxWords: 22,
};

const CATEGORY_TITLES = new Set([
  'problem', 'results', 'method', 'methods', 'recap', 'motivation', 'experiment',
  'analysis', 'feature analysis', 'benchmark', 'comparison', 'overview', 'summary',
  'background', 'introduction', 'method delta', 'what changed', 'diagnostic',
  'limitations', 'next steps', 'geometry', 'claim update', 'method landscape',
]);

// Per-archetype field roles. Paths support `a[].b` for arrays of objects.
//   essential -> visible, counts toward the visible budget
//   prose     -> visible explanatory text; the first candidate for notes/deletion
//   exempt    -> equations, labels, values; never counted or truncated
const DESCRIPTORS = {
  title: { essential: ['headline', 'question'], exempt: ['project', 'byline'] },
  question: { essential: ['question'], prose: ['why_now[]', 'success_criteria[]'] },
  recap: { essential: ['now'], prose: ['established[].detail'], exempt: ['established[].label', 'prior_week'] },
  problem: { essential: ['summary'], prose: ['why_hard[]', 'constraints[]'] },
  'method-landscape': { essential: ['gap'], prose: ['methods[].mechanism'], exempt: ['methods[].name', 'methods[].tag'] },
  'competitor-mechanism': { essential: ['relation_to_us'], prose: ['intuition', 'mechanism', 'failure[]'], exempt: ['name', 'module_label'] },
  weakness: { essential: ['gap'], prose: ['evidence[]', 'implication'] },
  motivation: { essential: ['idea'], prose: ['contrast.old', 'contrast.new', 'why_now'] },
  'method-high-level': { prose: ['stages[].detail', 'note'], exempt: ['stages[].label'] },
  'method-delta': { prose: ['summary', 'changes[].why', 'unchanged[]'], exempt: ['changes[].change', 'from', 'to'] },
  experiment: { prose: ['setup', 'protocol[]'], exempt: ['changed[]', 'controlled[]'] },
  benchmark: { prose: ['caption'], exempt: ['metrics', 'methods'] },
  claim: { essential: ['statement'], prose: ['evidence[]'], exempt: ['id', 'status'] },
  'claim-delta': { essential: ['claims[].statement'], prose: ['claims[].note', 'note'], exempt: ['claims[].id', 'claims[].previous', 'claims[].current'] },
  // interpretation is required on a diagnostic slide, so it is essential and
  // protected from automatic demotion.
  diagnostic: { essential: ['question', 'observation', 'interpretation'], prose: ['can_conclude', 'cannot_conclude', 'alternative_explanation'], exempt: ['id', 'measurement', 'claim_ids'] },
  'feature-space': { prose: ['note'], exempt: ['nodes', 'vectors', 'legend_items', 'legend'] },
  interpretation: { essential: ['claim.statement'], prose: ['observation', 'interpretation'] },
  limitations: { prose: ['limitations[]', 'open_questions[]'] },
};

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean);
}

function getPath(obj, path) {
  const parts = path.split('.');
  let cur = obj;
  for (const part of parts) {
    const m = part.match(/^(.*)\[\]$/);
    if (m) {
      const key = m[1];
      if (!key) return Array.isArray(cur) ? cur : [];
      cur = cur && cur[key];
      if (!Array.isArray(cur)) return [];
    } else {
      cur = cur && cur[part];
    }
  }
  return cur;
}

// Return [{path, text, role}] for one content field path.
function entriesFor(content, path, role) {
  const m = path.match(/^(.*)\[\]\.(.+)$/);
  const out = [];
  if (m) {
    const arr = getPath(content, m[1] + '[]');
    const sub = m[2];
    if (Array.isArray(arr)) {
      arr.forEach((item, i) => {
        const v = item && typeof item === 'object' ? item[sub] : (typeof item === 'string' && sub === '' ? item : undefined);
        if (typeof v === 'string' && v.trim()) out.push({ path: `${m[1]}[${i}].${sub}`, text: v, role, index: i });
      });
    }
    return out;
  }
  const m2 = path.match(/^(.*)\[\]$/);
  if (m2) {
    const arr = getPath(content, path);
    if (Array.isArray(arr)) arr.forEach((v, i) => {
      if (typeof v === 'string' && v.trim()) out.push({ path: `${m2[1]}[${i}]`, text: v, role, index: i });
    });
    return out;
  }
  const v = getPath(content, path);
  if (typeof v === 'string' && v.trim()) out.push({ path, text: v, role });
  return out;
}

function analyzeSlide(slide) {
  const desc = DESCRIPTORS[slide.archetype] || {};
  const content = slide.content || {};
  const entries = [];
  for (const role of ['essential', 'prose', 'exempt']) {
    for (const p of desc[role] || []) entries.push(...entriesFor(content, p, role));
  }
  const count = (role) => entries.filter((e) => e.role === role).reduce((n, e) => n + words(e.text).length, 0);
  const titleWords = words(slide.title).length;
  const visibleWords = count('essential') + count('prose');
  const proseWords = count('prose');
  const clusters = entries.filter((e) => e.role !== 'exempt' && words(e.text).length > 0).length;
  const noteWords = words(slide.notes).length;
  return {
    id: slide.id,
    archetype: slide.archetype,
    module: slide.module || null,
    titleWords,
    visibleWords,
    proseWords,
    exemptWords: count('exempt'),
    clusters,
    noteWords,
    noteRatio: +(noteWords / Math.max(1, visibleWords)).toFixed(2),
    entries,
  };
}

function isCategoryTitle(title) {
  return CATEGORY_TITLES.has(String(title || '').trim().toLowerCase());
}

module.exports = { BUDGETS, DESCRIPTORS, analyzeSlide, isCategoryTitle, words, getPath, entriesFor };
