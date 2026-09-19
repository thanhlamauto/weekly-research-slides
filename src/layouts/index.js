'use strict';

const narrative = require('./narrative');
const method = require('./method');
const evidence = require('./evidence');

// Archetype registry. A module in the storyboard maps to one of these.
const REGISTRY = {
  title: narrative.title,
  question: narrative.question,
  recap: narrative.recap,
  problem: narrative.problem,
  'method-landscape': method.methodLandscape,
  'competitor-mechanism': method.competitorMechanism,
  weakness: narrative.weakness,
  motivation: narrative.motivation,
  'method-high-level': method.methodHighLevel,
  'method-delta': method.methodDelta,
  experiment: evidence.experiment,
  benchmark: evidence.benchmark,
  claim: evidence.claim,
  'claim-delta': evidence.claimDelta,
  diagnostic: evidence.diagnostic,
  'feature-space': evidence.featureSpace,
  interpretation: narrative.interpretation,
  limitations: narrative.limitations,
};

function getLayout(archetype) {
  return REGISTRY[archetype] || null;
}

module.exports = { REGISTRY, getLayout };
