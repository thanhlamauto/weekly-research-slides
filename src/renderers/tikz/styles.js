'use strict';

// Semantic role/type -> TikZ style and color names.
//
// Colors are never hex values here: they are the semantic colorlets defined in
// templates/academic-beamer/tikz.tex, so figures inherit the Beamer theme and
// the same role names can be shared with Draw.io and Manim.

const ROLE_COLORS = {
  shared: 'methodShared',
  baseline: 'methodBaseline',
  competitor: 'methodCompetitor',
  ours: 'methodOurs',
  auxiliary: 'methodAuxiliary',
  changed: 'methodChanged',
  added: 'methodAdded',
  removed: 'methodRemoved',
  neutral: 'methodBaseline',
  warning: 'methodWarning',
  muted: 'methodMuted',
};

const ROLE_FILLS = {
  shared: 'methodSharedFill',
  baseline: 'methodBaselineFill',
  competitor: 'methodCompetitorFill',
  ours: 'methodOursFill',
  auxiliary: 'methodAuxiliaryFill',
  changed: 'methodChangedFill',
  added: 'methodAddedFill',
  removed: 'methodRemovedFill',
  neutral: 'methodNeutralFill',
  warning: 'methodWarningFill',
  muted: 'methodMutedFill',
};

const TYPE_STYLES = {
  input: 'methodInput',
  output: 'methodOutput',
  data: 'methodInput',
  feature: 'methodFeature',
  'feature-sequence': 'methodFeature',
  vector: 'methodFeature',
  tensor: 'methodFeature',
  timestep: 'methodFeature',
  module: 'methodModule',
  'learned-module': 'methodLearned',
  backbone: 'methodLearned',
  head: 'methodLearned',
  expert: 'methodLearned',
  predictor: 'methodLearned',
  'frozen-module': 'methodFrozen',
  cache: 'methodCache',
  operator: 'methodOperator',
  loss: 'methodLoss',
  group: 'methodModule',
  text: 'methodNote',
  image: 'methodModule',
};

const EDGE_STYLES = {
  computation: 'methodComputation',
  data: 'methodData',
  reuse: 'methodReuse',
  reference: 'methodReference',
  feedback: 'methodFeedback',
  loss: 'methodLossEdge',
  gradient: 'methodFeedback',
};

// Roles that mean "this is the difference"; used by the visual critic.
const EMPHASIS_ROLES = new Set(['ours', 'changed', 'added']);

function roleColor(role) {
  return ROLE_COLORS[role] || 'methodShared';
}

function roleFill(role) {
  return ROLE_FILLS[role] || 'methodSharedFill';
}

function nodeStyle(node) {
  const base = TYPE_STYLES[node.type] || 'methodModule';
  return {
    base,
    draw: roleColor(node.role),
    fill: roleFill(node.role),
    isEmphasis: EMPHASIS_ROLES.has(node.role),
    isFaded: node.role === 'shared' || node.role === 'muted' || node.role === 'neutral',
  };
}

function edgeStyle(edge) {
  return EDGE_STYLES[edge.role] || 'methodComputation';
}

module.exports = { ROLE_COLORS, ROLE_FILLS, TYPE_STYLES, EDGE_STYLES, EMPHASIS_ROLES, roleColor, roleFill, nodeStyle, edgeStyle };
