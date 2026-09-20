'use strict';

// Active PowerPoint style. Selection is by `WRS_PPT_STYLE` (or the CLI
// `--style` flag, which sets it). The default is the academic style family.
const { resolveStyle, styleNames, DEFAULT_STYLE } = require('./styles');

const active = resolveStyle(process.env.WRS_PPT_STYLE || DEFAULT_STYLE);

module.exports = {
  LAYOUT: active.LAYOUT,
  COLORS: active.COLORS,
  STATUS_COLORS: active.STATUS_COLORS,
  FONT: active.FONT,
  STROKE: active.STROKE,
  STYLE: active.STYLE,
  styleName: active.name,
  resolveStyle,
  styleNames,
  DEFAULT_STYLE,
};
