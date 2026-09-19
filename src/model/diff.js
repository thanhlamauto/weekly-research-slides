'use strict';

// Compute a weekly_delta from two research_state snapshots. This is the
// deterministic half of delta-first behavior; the other half is accepting a
// hand-written weekly_delta.yaml directly.

function diffStates(prev, curr, opts = {}) {
  const delta = {
    week: curr.project.week,
    from_week: prev ? prev.project.week : undefined,
  };
  if (opts.headline) delta.headline = opts.headline;
  if (opts.question) delta.this_week_question = opts.question;

  const pMethod = prev ? prev.method : null;
  const cMethod = curr.method;
  if (cMethod && pMethod && (cMethod.current_version !== pMethod.current_version || (curr.method_changes || []).length)) {
    delta.method_delta = {
      from: pMethod.current_version,
      to: cMethod.current_version,
      changes: (curr.method_changes || []).length
        ? curr.method_changes
        : ((cMethod.versions || []).find((v) => v.version === cMethod.current_version) || {}).changes || [],
    };
  }

  const pResults = (prev && prev.results) || {};
  const cResults = curr.results || {};
  const resultDelta = [];
  for (const [key, val] of Object.entries(cResults)) {
    const before = pResults[key];
    if (!before || before.value !== val.value) {
      resultDelta.push({
        metric: key,
        previous: before ? before.value : null,
        current: val.value,
        unit: val.unit,
        higher_is_better: val.higher_is_better,
      });
    }
  }
  if (resultDelta.length) delta.result_delta = resultDelta;

  const pClaims = (prev && prev.claims) || {};
  const cClaims = curr.claims || {};
  const claimDelta = {};
  const newClaims = {};
  for (const [id, cl] of Object.entries(cClaims)) {
    if (!pClaims[id]) {
      newClaims[id] = { statement: cl.statement, status: cl.status };
    } else if (pClaims[id].status !== cl.status) {
      claimDelta[id] = { previous: pClaims[id].status, current: cl.status };
    }
  }
  if (Object.keys(claimDelta).length) delta.claim_delta = claimDelta;
  if (Object.keys(newClaims).length) delta.new_claims = newClaims;

  const pDiag = (prev && prev.diagnostics) || {};
  const cDiag = curr.diagnostics || {};
  const newDiag = [];
  const changedDiag = [];
  for (const [id, dg] of Object.entries(cDiag)) {
    if (!pDiag[id]) newDiag.push(id);
    else if (JSON.stringify(pDiag[id]) !== JSON.stringify(dg)) changedDiag.push(id);
  }
  if (newDiag.length) delta.new_diagnostics = newDiag;
  if (changedDiag.length) delta.changed_diagnostics = changedDiag;

  const pLim = new Set((prev && prev.limitations) || []);
  const newLim = (curr.limitations || []).filter((l) => !pLim.has(l));
  if (newLim.length) delta.new_limitations = newLim;

  const pKnown = new Set([
    ...Object.keys(pClaims),
    ...Object.keys(pDiag),
    ...(prev && prev.method ? [prev.method.current_version] : []),
  ]);
  const unchanged = [];
  if (prev && curr.problem && prev.problem && curr.problem.summary === prev.problem.summary) {
    unchanged.push(`Problem ${curr.problem.id} is unchanged`);
  }
  for (const [id] of Object.entries(cClaims)) if (pKnown.has(id)) unchanged.push(`Claim ${id} already known`);
  if (unchanged.length) delta.unchanged = unchanged;

  return delta;
}

module.exports = { diffStates };
