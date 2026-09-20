'use strict';

const { LAYOUT, COLORS, FONT, STROKE, STYLE } = require('../renderer/theme');
const d = require('../visual-grammar/draw');

const CW = LAYOUT.w - LAYOUT.marginX * 2;

// Academic frame: left-aligned frame title, subtle title rule, minimal footer,
// optional thin progress line, optional understated citation. No eyebrow label
// on every slide, no header metadata row, no accent bar.
function chrome(slideObj, ctx) {
  const { deck } = ctx;
  const S = STYLE;
  const out = [];
  out.push(d.rect('bg', 0, 0, LAYOUT.w, LAYOUT.h, { fill: COLORS.bg }));

  if (S.frame.progressBar && ctx.total > 1) {
    const frac = (ctx.index + 1) / ctx.total;
    out.push(d.rect('frame-progress', 0, 0, LAYOUT.w, S.frame.progressWidth, { fill: COLORS.rule }));
    out.push(d.rect('frame-progress-fill', 0, 0, LAYOUT.w * frac, S.frame.progressWidth, { fill: COLORS.blue }));
  }

  if (slideObj.archetype === 'title') {
    return out; // the title layout owns its composition
  }

  if (slideObj.kicker) {
    out.push(d.text('kicker', LAYOUT.marginX, 0.42, CW * 0.7, 0.22, String(slideObj.kicker).toUpperCase(), {
      size: FONT.sizes.kicker, color: COLORS.muted, align: 'left', valign: 'middle',
    }));
  }

  const titleY = slideObj.kicker ? 0.64 : 0.58;
  if (slideObj.title) {
    out.push(d.text('title-main', LAYOUT.marginX, titleY, CW, LAYOUT.titleH, slideObj.title, {
      size: FONT.sizes.title,
      bold: S.typography.titleWeight >= 600,
      color: COLORS.ink, align: S.typography.titleAlign, valign: 'middle',
      lineSpacing: FONT.sizes.title + 6,
    }));
  }
  const ruleY = titleY + LAYOUT.titleH + 0.05;
  if (S.frame.titleRule === 'subtle') {
    out.push(d.rect('chrome-rule', LAYOUT.marginX, ruleY, CW, 0.012, { fill: COLORS.rule }));
  }

  if (slideObj.subtitle) {
    out.push(d.text('subtitle-main', LAYOUT.marginX, ruleY + 0.08, CW, 0.24, slideObj.subtitle, {
      size: FONT.sizes.subtitle, color: COLORS.muted, align: 'left', valign: 'middle',
    }));
  }

  if (slideObj.citation && S.frame.citation) {
    out.push(d.text('citation', LAYOUT.marginX, LAYOUT.footerY - 0.26, CW * 0.9, 0.22, slideObj.citation, {
      size: FONT.sizes.tiny, color: COLORS.faint, align: 'left', valign: 'middle',
    }));
  }

  if (S.frame.footer !== 'none') {
    const footerLeft = deck.footer || [deck.project || deck.title, `Week ${deck.week}`].filter(Boolean).join(' · ');
    if (footerLeft) {
      out.push(d.text('footer-text', LAYOUT.marginX, LAYOUT.footerY, CW * 0.8, 0.24, footerLeft, {
        size: FONT.sizes.tiny, color: COLORS.faint, align: 'left', valign: 'middle',
      }));
    }
  }
  if (S.frame.pageNumber) {
    out.push(d.text('footer-slide-number', LAYOUT.marginX + CW * 0.88, LAYOUT.footerY, CW * 0.12, 0.24,
      `${ctx.index + 1} / ${ctx.total}`, {
        size: FONT.sizes.tiny, color: COLORS.faint, align: 'right', valign: 'middle',
      }));
  }
  return out;
}

function defaultKicker(slideObj, ctx) {
  const stage = ctx.deck.stage || '';
  const map = {
    title: '',
    question: `This week's question`,
    recap: 'Recap',
    problem: 'Problem',
    'method-landscape': 'Method landscape',
    'competitor-mechanism': 'Competitor mechanism',
    weakness: 'Gap',
    motivation: 'Motivation',
    'method-high-level': 'Method',
    'method-delta': 'What changed',
    experiment: 'Experiment',
    benchmark: 'Comparison',
    claim: 'Claim',
    'claim-delta': 'Claim update',
    diagnostic: 'Diagnostic',
    'feature-space': 'Geometry',
    interpretation: 'Interpretation',
    limitations: 'Limitations',
  };
  return map[slideObj.archetype] || stage;
}

// --- composition helpers ---------------------------------------------------

function sectionLabel(id, x, y, w, label, color) {
  return d.text(id, x, y, w, 0.24, String(label).toUpperCase(), {
    size: FONT.sizes.tiny, bold: true, color: color || COLORS.muted, align: 'left', valign: 'middle',
  });
}

function panelBox(id, x, y, w, h, title, opts = {}) {
  const out = [d.card(id, x, y, w, h, opts)];
  if (title) {
    out.push(d.text(`${id}__title`, x + 0.22, y + 0.16, w - 0.44, 0.3, title, {
      size: opts.titleSize || FONT.sizes.label + 1, bold: true, color: opts.titleColor || COLORS.ink,
      align: 'left', valign: 'middle',
    }));
  }
  return out;
}

// A vertical list of label/detail rows with fixed row height, so geometry is
// deterministic and QA can check text fit.
function rowList(idBase, x, y, w, rows, opts = {}) {
  const rowH = opts.rowH || 0.72;
  const gap = opts.gap === undefined ? 0.1 : opts.gap;
  const out = [];
  rows.forEach((row, i) => {
    const ry = y + i * (rowH + gap);
    const labelW = opts.labelW || 1.85;
    out.push(d.text(`${idBase}-${i}-label`, x, ry, labelW, rowH, row.label, {
      size: opts.labelSize || FONT.sizes.small, bold: true,
      color: row.color || opts.labelColor || COLORS.muted, align: 'left', valign: 'middle',
    }));
    out.push(d.text(`${idBase}-${i}-detail`, x + labelW + 0.18, ry, w - labelW - 0.18, rowH, row.detail, {
      size: opts.detailSize || FONT.sizes.body,
      color: row.detailColor || COLORS.ink, align: 'left', valign: opts.valign || 'middle',
    }));
  });
  return out;
}

function bulletCard(id, x, y, w, h, title, bullets, opts = {}) {
  const out = panelBox(id, x, y, w, h, title, opts);
  const y0 = y + (title ? 0.62 : 0.24);
  const rowH = (h - (y0 - y) - 0.2) / Math.max(1, bullets.length);
  bullets.forEach((b, i) => {
    out.push(d.text(`${id}-b${i}`, x + 0.24, y0 + i * rowH, 0.16, rowH, '•', {
      size: FONT.sizes.body, bold: true, color: opts.bulletColor || COLORS.blue, align: 'left', valign: 'top',
    }));
    out.push(d.text(`${id}-b${i}-t`, x + 0.44, y0 + i * rowH, w - 0.68, rowH, b, {
      size: opts.bodySize || FONT.sizes.body, color: COLORS.inkSoft, align: 'left', valign: 'top',
    }));
  });
  return out;
}

function measureText(primitive) {
  // Rough but deterministic: average glyph width ~0.5em, line height ~1.22em.
  const size = primitive.style && primitive.style.size ? primitive.style.size : FONT.sizes.body;
  const em = size / 72;
  const charW = em * 0.5;
  const availChars = Math.max(1, Math.floor(primitive.w / charW));
  const rawLines = String(primitive.text || '').split('\n');
  let lines = 0;
  for (const rl of rawLines) lines += Math.max(1, Math.ceil(rl.length / availChars));
  const needed = lines * em * 1.28;
  return { lines, needed };
}

module.exports = {
  CW,
  chrome,
  sectionLabel,
  panelBox,
  rowList,
  bulletCard,
  measureText,
  colors: COLORS,
  font: FONT,
  stroke: STROKE,
  draw: d,
};
