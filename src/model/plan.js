'use strict';

// Deterministic stage -> module planner. It proposes the argument skeleton and
// pulls intents from the current research state and weekly delta. The agent (or
// user) then authors the slide_spec; this file does not invent evidence.

const STAGE_MODULES = {
  survey: ['problem', 'method-landscape', 'competitor-method:*', 'benchmark-comparison', 'weakness-gap'],
  'hypothesis-formation': ['problem', 'prior-work', 'weakness-gap', 'motivation', 'claim', 'open-question'],
  'method-development': ['recap', 'weakness-gap', 'motivation', 'method-high-level', 'experiment-setup', 'results', 'open-question'],
  diagnostic: ['question', 'recap', 'method-delta', 'method-high-level', 'diagnostic', 'benchmark-comparison', 'claim-delta', 'limitation', 'open-question'],
  refinement: ['recap', 'method-delta', 'results', 'diagnostic', 'claim-delta', 'limitation'],
  'mature-comparison': ['question', 'recap', 'method-delta', 'benchmark-comparison', 'claim-delta', 'diagnostic', 'limitation', 'open-question'],
};

function domainSlides(stage, state, delta) {
  const modules = STAGE_MODULES[stage] || STAGE_MODULES.diagnostic;
  const slides = [];
  let n = 0;
  const push = (module, intent, refs, hints) => {
    n += 1;
    slides.push({ id: `s${n}`, module, intent, source_refs: refs || [], content_hints: hints || [] });
  };

  for (const mod of modules) {
    if (mod === 'competitor-method:*') {
      const comps = state.competitors || {};
      for (const [key, c] of Object.entries(comps)) {
        push('competitor-method', `Explain ${c.name || key}: its mechanism, why it works, and where it breaks`, [key],
          [c.summary, c.weakness].filter(Boolean));
      }
      continue;
    }
    switch (mod) {
      case 'question':
        push('open-question', delta.this_week_question || "What changed this week?", ['delta.headline'], [delta.headline].filter(Boolean));
        break;
      case 'recap':
        push('recap', 'Compress shared context and state exactly where the project is now', ['method.current_version'],
          (delta.unchanged || []).slice(0, 3));
        break;
      case 'problem':
        push('problem', state.problem.summary, [state.problem.id], [state.problem.summary]);
        break;
      case 'method-landscape':
        push('prior-work', 'Normalize the competing methods into one visual language and expose the common gap',
          Object.keys(state.competitors || {}), []);
        break;
      case 'weakness-gap':
        push('weakness-gap', 'Name the unresolved gap that motivates our method', [], []);
        break;
      case 'motivation':
        push('motivation', 'Explain the idea that turns the gap into a plan', [state.problem.id], []);
        break;
      case 'method-high-level':
        push('method-high-level', `Show the current method (${state.method.current_version}) end to end`,
          [state.method.current_version], [state.method.summary]);
        break;
      case 'method-delta':
        if (delta.method_delta) {
          push('method-delta', `Method moved ${delta.method_delta.from} -> ${delta.method_delta.to}; explain what changed and why`,
            [delta.method_delta.from, delta.method_delta.to], delta.method_delta.changes || []);
        }
        break;
      case 'experiment-setup':
        push('experiment-setup', 'Define the experiment before showing numbers', [], []);
        break;
      case 'results':
        push('results', 'Report the measured results, including anything that did not improve', [], []);
        break;
      case 'benchmark-comparison':
        push('benchmark-comparison', 'Compare competitor, our previous version, and our current version in one coordinate system',
          ['benchmark'], (delta.result_delta || []).map((r) => r.metric));
        break;
      case 'claim':
        Object.entries(state.claims || {}).forEach(([id, cl]) => {
          push('claim', cl.statement, [id], [cl.status]);
        });
        break;
      case 'claim-delta':
        if (delta.claim_delta && Object.keys(delta.claim_delta).length) {
          push('claim-delta', `Update claim status: ${Object.keys(delta.claim_delta).join(', ')}`,
            Object.keys(delta.claim_delta), []);
        }
        break;
      case 'diagnostic':
        (delta.new_diagnostics || []).forEach((id) => {
          const diag = (state.diagnostics || {})[id];
          push('diagnostic', diag ? diag.question : `Diagnostic ${id}`, [id], diag ? [diag.result] : []);
        });
        break;
      case 'limitation':
        push('limitation', 'State what is still unresolved and would change the conclusion', [],
          state.limitations || []);
        break;
      case 'open-question':
        push('open-question', 'End on the question for the group to discuss', [], state.open_questions || []);
        break;
      default:
        push(mod, mod, [], []);
    }
  }
  return slides;
}

function planStoryboard(state, delta, opts = {}) {
  const stage = opts.stage || state.project.stage;
  const slides = domainSlides(stage, state, delta || {});
  const thisWeekQuestion = (delta && delta.this_week_question)
    || `What changed in week ${state.project.week}?`;
  return {
    deck: {
      title: `${state.project.title} — Week ${state.project.week}`,
      stage,
      week: state.project.week,
      audience: state.project.audience || '',
      familiarity: state.project.familiarity || 'medium',
      this_week_question: thisWeekQuestion,
    },
    slides,
  };
}

module.exports = { planStoryboard, STAGE_MODULES };
