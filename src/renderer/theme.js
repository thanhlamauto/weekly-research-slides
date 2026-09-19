'use strict';

// Single 16:9 canvas. All scene coordinates are inches.
const LAYOUT = {
  w: 13.333,
  h: 7.5,
  marginX: 0.62,
  marginTop: 0.44,
  marginBottom: 0.46,
  titleH: 0.78,
  contentTop: 1.62,
  footerY: 7.02,
};

const COLORS = {
  bg: 'FFFFFF',
  ink: '111827',
  inkSoft: '374151',
  muted: '6B7280',
  faint: '9CA3AF',
  rule: 'E5E7EB',
  panel: 'F9FAFB',
  panelLine: 'E5E7EB',
  blue: '2563EB',
  blueSoft: 'EAF1FE',
  amber: 'B45309',
  amberSoft: 'FEF3C7',
  green: '047857',
  greenSoft: 'DCFCE7',
  red: 'B91C1C',
  redSoft: 'FEE2E2',
  purple: '6D28D9',
  purpleSoft: 'EDE9FE',
  slateSoft: 'F1F5F9',
  white: 'FFFFFF',
};

const STATUS_COLORS = {
  new: COLORS.purple,
  emerging: COLORS.amber,
  plausible: COLORS.blue,
  unchanged: COLORS.muted,
  strengthened: COLORS.green,
  weakened: COLORS.red,
  refuted: COLORS.red,
  absent: COLORS.faint,
};

const FONT = {
  face: 'Calibri',
  mono: 'Consolas',
  sizes: {
    title: 27,
    kicker: 12,
    subtitle: 15,
    body: 14,
    small: 11.5,
    tiny: 10,
    label: 13,
    node: 15,
    bigNumber: 30,
  },
};

const STROKE = {
  thin: 0.75,
  normal: 1.1,
  thick: 1.6,
  vector: 2.1,
};

module.exports = { LAYOUT, COLORS, STATUS_COLORS, FONT, STROKE };
