'use strict';

const { routeFigure, figureStats } = require('../router');
const { layoutFigure, archetypeOf } = require('./layout');
const { renderFigureTex, exportStandalone } = require('./renderer');
const { validateFigure } = require('./validation');
const { critiqueTikz } = require('./critique');

module.exports = {
  routeFigure,
  figureStats,
  layoutFigure,
  archetypeOf,
  renderFigureTex,
  exportStandalone,
  validateFigure,
  critiqueTikz,
};
