'use strict';

// Academic PowerPoint style system.
//
// Design principle: "PowerPoint mechanics, Beamer-like academic restraint."
// The profiles below encode design principles studied from LaTeX Beamer and the
// Metropolis theme (whitespace, restrained colour, small type hierarchy, subtle
// frame rules, optional thin progress bar). No code or assets are reused:
// Beamer is GPL/LPPL and Metropolis is CC BY-SA 4.0, so only principles were
// taken, with an independently chosen palette and metrics.

const BASE = {
  w: 13.333,
  h: 7.5,
};

// Shared semantic palette (academic): near-black text, neutral greys, one
// restrained cool accent and one muted warm accent.
const ACADEMIC_COLORS = {
  bg: 'FFFFFF',
  ink: '1A1A1A',
  inkSoft: '3A3A3A',
  muted: '6B6B6B',
  faint: '9B9B9B',
  rule: 'D9D9D9',
  panel: 'F6F6F4',
  panelLine: 'E3E3E0',
  blue: '245B78',
  blueSoft: 'EAF1F4',
  amber: 'A1602A',
  amberSoft: 'F6EDE3',
  green: '2F6B4F',
  greenSoft: 'E9F1EC',
  red: '9E3B32',
  redSoft: 'F5E9E7',
  purple: '5B4B8A',
  purpleSoft: 'EDEAF4',
  slateSoft: 'F2F2F0',
  white: 'FFFFFF',
};

const METROPOLIS_COLORS = {
  ...ACADEMIC_COLORS,
  ink: '14202B',
  inkSoft: '34424D',
  muted: '64717B',
  faint: '97A1A8',
  rule: 'DCE1E3',
  panel: 'F4F6F6',
  panelLine: 'E1E6E7',
  blue: '2E6E8E',
  blueSoft: 'E8F0F3',
  amber: 'B5732A',
  amberSoft: 'F7EEE2',
};

const STATUS_FROM = (c) => ({
  new: c.purple,
  emerging: c.amber,
  plausible: c.blue,
  unchanged: c.muted,
  strengthened: c.green,
  weakened: c.red,
  refuted: c.red,
  absent: c.faint,
});

const ACADEMIC_FONT = {
  face: 'Calibri',
  mono: 'Consolas',
  sizes: {
    title: 22,        // frame title
    kicker: 10,       // small section label (used sparingly)
    subtitle: 12,
    body: 13.5,
    small: 11,
    tiny: 9.5,
    label: 12,
    node: 14,
    equation: 18,     // equations are visual objects
    bigNumber: 26,
  },
};

const METROPOLIS_FONT = {
  face: 'Helvetica Neue',
  mono: 'Menlo',
  sizes: { ...ACADEMIC_FONT.sizes, title: 24, body: 14, small: 11.5, label: 12.5, equation: 19 },
};

const ACADEMIC_LAYOUT = {
  w: BASE.w, h: BASE.h,
  marginX: 0.72, marginTop: 0.42, marginBottom: 0.42,
  titleH: 0.66, contentTop: 1.5, footerY: 7.06,
};

const METROPOLIS_LAYOUT = {
  ...ACADEMIC_LAYOUT,
  marginX: 0.85, contentTop: 1.58, titleH: 0.7,
};

const ACADEMIC_STROKE = { thin: 0.75, normal: 1.0, thick: 1.5, vector: 2.0 };

function beamerStyle() {
  return {
    name: 'academic-beamer',
    family: 'academic',
    variant: 'default',
    LAYOUT: ACADEMIC_LAYOUT,
    COLORS: ACADEMIC_COLORS,
    STATUS_COLORS: STATUS_FROM(ACADEMIC_COLORS),
    FONT: ACADEMIC_FONT,
    STROKE: ACADEMIC_STROKE,
    STYLE: {
      name: 'academic-beamer',
      family: 'academic',
      variant: 'default',
      frame: { titleRule: 'subtle', sectionLabel: false, footer: 'minimal', pageNumber: true, progressBar: false, progressWidth: 0.045, citation: true },
      blocks: { style: 'subtle', border: 'left', radius: 0.03, fill: 'panel' },
      decoration: { gradients: false, shadows: false, icons: false, ornaments: false, maxPrimaryAccents: 2 },
      figure: { minAreaRatio: 0.55, preferredRatio: 0.7 },
      typography: { titleAlign: 'left', titleWeight: 600, bodyAlign: 'left' },
    },
  };
}

function metropolisStyle() {
  return {
    name: 'academic-metropolis',
    family: 'academic',
    variant: 'metropolis',
    LAYOUT: METROPOLIS_LAYOUT,
    COLORS: METROPOLIS_COLORS,
    STATUS_COLORS: STATUS_FROM(METROPOLIS_COLORS),
    FONT: METROPOLIS_FONT,
    STROKE: ACADEMIC_STROKE,
    STYLE: {
      name: 'academic-metropolis',
      family: 'academic',
      variant: 'metropolis',
      frame: { titleRule: 'none', sectionLabel: false, footer: 'minimal', pageNumber: true, progressBar: true, progressWidth: 0.045, citation: true },
      blocks: { style: 'subtle', border: 'left', radius: 0.0, fill: 'panel' },
      decoration: { gradients: false, shadows: false, icons: false, ornaments: false, maxPrimaryAccents: 2 },
      figure: { minAreaRatio: 0.6, preferredRatio: 0.75 },
      typography: { titleAlign: 'left', titleWeight: 500, bodyAlign: 'left' },
    },
  };
}

function paperFigureStyle() {
  const base = beamerStyle();
  return { ...base, name: 'paper-figure', STYLE: { ...base.STYLE, name: 'paper-figure', frame: { ...base.STYLE.frame, titleRule: 'none', pageNumber: false, footer: 'none' }, figure: { minAreaRatio: 0.7, preferredRatio: 0.85 } } };
}

function darkExplainerStyle() {
  const base = metropolisStyle();
  const COLORS = { ...METROPOLIS_COLORS, bg: '11161B', ink: 'E8ECEF', inkSoft: 'C7CFD5', muted: '9AA6AE', faint: '6E7A82', rule: '2A343B', panel: '171E24', panelLine: '2A343B' };
  return { ...base, name: 'dark-explainer', COLORS, STATUS_COLORS: STATUS_FROM(COLORS), STYLE: { ...base.STYLE, name: 'dark-explainer' } };
}

const REGISTRY = {
  'academic-beamer': beamerStyle,
  'academic-metropolis': metropolisStyle,
  'paper-figure': paperFigureStyle,
  'dark-explainer': darkExplainerStyle,
};

const DEFAULT_STYLE = 'academic-beamer';

function resolveStyle(name) {
  const factory = REGISTRY[name] || REGISTRY[DEFAULT_STYLE];
  return factory();
}

function styleNames() {
  return Object.keys(REGISTRY);
}

module.exports = { resolveStyle, styleNames, DEFAULT_STYLE, REGISTRY };
