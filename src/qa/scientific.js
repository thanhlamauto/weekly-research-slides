'use strict';

const VALID_STATUS = new Set(['new', 'emerging', 'plausible', 'unchanged', 'strengthened', 'weakened', 'refuted', 'absent']);
const CAUSAL = /\b(because|causes?|caused|proves?|therefore|thus|confirms?|demonstrates?|shows that|due to|leads to)\b/i;
const TITLE_BAN = /\b(q\s*&\s*a|questions\?|thank you|any questions|next steps)\b/i;

// Scientific/story QA runs before visual QA. It checks reasoning hygiene, not pixels.
function qaScience(spec, extra = {}) {
  const findings = [];
  const add = (level, slideId, message) => findings.push({ level, check: 'scientific', slide: slideId || null, object: null, message });
  const slides = spec.slides || [];

  slides.forEach((s) => {
    const c = s.content || {};
    if (TITLE_BAN.test(s.title || '')) {
      add('warning', s.id, 'Deck should normally end at limitations/open questions; avoid Q&A/thank-you slides unless explicitly requested');
    }

    if (s.archetype === 'diagnostic') {
      const required = ['question', 'measurement', 'observation', 'interpretation'];
      required.forEach((k) => {
        if (!c[k]) add('error', s.id, `Diagnostic is missing "${k}"; measurement, observation, and interpretation must stay separate`);
      });
      if (!Array.isArray(c.claim_ids) || !c.claim_ids.length) {
        add('error', s.id, 'Diagnostic does not state which claim it tests (claim_ids)');
      }
      if (c.can_conclude === undefined && c.cannot_conclude === undefined) {
        add('warning', s.id, 'Diagnostic should state what can and cannot be concluded');
      }
      if (c.observation && CAUSAL.test(c.observation)) {
        add('warning', s.id, 'Observation contains causal language; keep observation descriptive and move causation to interpretation');
      }
      if (c.observation && c.interpretation && c.observation.trim() === c.interpretation.trim()) {
        add('error', s.id, 'Observation and interpretation are identical; they must not be collapsed');
      }
    }

    if (s.archetype === 'claim-delta') {
      (c.claims || []).forEach((cl) => {
        if (cl.previous && !VALID_STATUS.has(cl.previous)) add('error', s.id, `Invalid previous claim status "${cl.previous}"`);
        if (cl.current && !VALID_STATUS.has(cl.current)) add('error', s.id, `Invalid current claim status "${cl.current}"`);
        if (cl.current === 'strengthened' && !cl.evidence && !(c.new_diagnostics || []).length) {
          add('warning', s.id, `Claim ${cl.id} was strengthened without citing new evidence/diagnostics`);
        }
      });
    }

    if (s.archetype === 'benchmark') {
      const methods = c.methods || [];
      if (!methods.some((m) => m.role === 'current')) {
        add('error', s.id, 'Benchmark must include the current method (role: current)');
      }
      if (!Array.isArray(c.metrics) || !c.metrics.length) add('error', s.id, 'Benchmark has no metrics');
      const keys = new Set((c.metrics || []).map((m) => m.key));
      methods.forEach((m) => {
        Object.keys(m.values || {}).forEach((k) => {
          if (!keys.has(k)) add('warning', s.id, `Benchmark value "${k}" has no matching metric definition`);
        });
      });
    }

    if (s.archetype === 'claim' && c.status && !VALID_STATUS.has(c.status)) {
      add('error', s.id, `Invalid claim status "${c.status}"`);
    }

    if ((s.archetype === 'method-delta' || s.archetype === 'recap')
      && spec.deck.familiarity === 'high' && JSON.stringify(c).length > 1200) {
      add('warning', s.id, 'Audience familiarity is high but this background slide is long; compress it');
    }
  });

  // Deck-level checks
  const last = slides[slides.length - 1];
  if (last && !['limitations', 'interpretation', 'claim-delta', 'diagnostic', 'benchmark', 'claim'].includes(last.archetype)) {
    add('warning', last.id, 'Deck does not end at limitations/open questions');
  }
  if (spec.deck.familiarity === 'high' && slides[0] && slides[0].archetype === 'problem') {
    add('warning', slides[0].id, 'High audience familiarity: open with this week\'s question or delta rather than re-defining the problem');
  }

  // Cross-check benchmark numbers against an optional weekly_delta
  const delta = extra.weeklyDelta;
  if (delta && Array.isArray(delta.result_delta)) {
    const byMetric = new Map(delta.result_delta.map((r) => [r.metric, r]));
    slides.filter((s) => s.archetype === 'benchmark').forEach((s) => {
      (s.content.metrics || []).forEach((m) => {
        const rd = byMetric.get(m.key) || byMetric.get(m.name);
        if (!rd) return;
        const current = (s.content.methods || []).find((mm) => mm.role === 'current');
        if (current && rd.current !== undefined && current.values && current.values[m.key] !== undefined) {
          const a = String(current.values[m.key]);
          const b = String(rd.current);
          if (a !== b && Number(a) !== Number(b)) {
            add('warning', s.id, `Benchmark current value for "${m.key}" (${a}) does not match weekly_delta (${b})`);
          }
        }
      });
    });
  }

  return findings;
}

module.exports = { qaScience };
