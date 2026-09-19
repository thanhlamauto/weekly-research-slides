'use strict';

const { LAYOUT, COLORS, FONT } = require('../renderer/theme');
const C = require('./common');
const d = C.draw;
const CW = C.CW;
const M = LAYOUT.marginX;

// ---------------------------------------------------------------------------
// title
// ---------------------------------------------------------------------------
function title(slide) {
  const c = slide.content || {};
  const out = [];
  out.push(d.rect('title-accent', M, 2.35, 0.9, 0.05, { fill: COLORS.blue }));
  out.push(d.text('title-project', M, 2.5, CW * 0.6, 0.32,
    c.project || 'Research update', { size: 15, bold: true, color: COLORS.blue, valign: 'middle' }));
  out.push(d.text('title-main', M, 2.95, CW * 0.58, 1.7,
    c.headline || slide.title, { size: 38, bold: true, color: COLORS.ink, valign: 'top', lineSpacing: 42 }));
  if (c.question) {
    out.push(d.text('title-question', M, 4.75, CW * 0.55, 1.0,
      c.question, { size: 18, color: COLORS.inkSoft, valign: 'top', lineSpacing: 24 }));
  }
  if (c.byline) {
    out.push(d.text('title-byline', M, 5.95, CW * 0.55, 0.3, c.byline, {
      size: FONT.sizes.small, color: COLORS.muted, valign: 'middle',
    }));
  }

  // A concise motif that seeds the deck's visual language.
  const r = { x: 8.15, y: 2.5 };
  const nw = 1.15;
  out.push(...d.semanticNode('motif-zs', 'latent', r.x, r.y + 1.7, nw, nw, 'Z_s'));
  out.push(...d.semanticNode('motif-ztilde', 'latent', r.x + 2.15, r.y + 1.7, nw, nw, 'Z~'));
  out.push(...d.semanticNode('motif-zd', 'latent', r.x + 1.08, r.y, nw, nw, 'Z_d'));
  out.push(d.arrow('motif-delta', r.x + nw, r.y + 2.28, r.x + 2.15, r.y + 2.28, 'vector'));
  out.push(d.line('motif-desired', r.x + nw * 0.78, r.y + 1.72, r.x + 1.6, r.y + nw, {
    color: COLORS.faint, width: 0.9, dash: 'dash', arrow: 'none',
  }));
  out.push(d.line('motif-residual', r.x + 3.3, r.y + 1.78, r.x + 2.4, r.y + nw * 1.05, {
    color: COLORS.faint, width: 0.9, dash: 'dash', arrow: 'none',
  }));
  out.push(d.text('motif-caption', r.x - 0.2, r.y + 3.15, 3.9, 0.3,
    'cached features drift; correction moves them', {
      size: FONT.sizes.tiny, color: COLORS.muted, align: 'center', valign: 'middle',
    }));
  return out;
}

// ---------------------------------------------------------------------------
// question
// ---------------------------------------------------------------------------
function question(slide) {
  const c = slide.content || {};
  const out = [];
  out.push(d.card('q-card', M, 1.72, CW * 0.6, 2.45, { fill: COLORS.blueSoft, line: COLORS.blue }));
  out.push(d.text('q-text', M + 0.3, 1.95, CW * 0.6 - 0.6, 2.0,
    c.question || slide.title, {
      size: 22, bold: true, color: COLORS.ink, valign: 'top', lineSpacing: 28,
    }));

  out.push(...C.panelBox('q-why', M + CW * 0.63, 1.72, CW * 0.37, 2.45, 'Why this week'));
  const why = c.why_now || [];
  const rowH = Math.min(0.62, 1.7 / Math.max(1, why.length));
  why.forEach((w, i) => {
    out.push(d.text(`q-why-${i}`, M + CW * 0.63 + 0.24, 2.32 + i * rowH, CW * 0.37 - 0.5, rowH, w, {
      size: FONT.sizes.body - 1, color: COLORS.inkSoft, valign: 'top',
    }));
  });

  out.push(...C.panelBox('q-success', M, 4.42, CW, 1.95, 'What would count as an answer'));
  const crit = c.success_criteria || [];
  const colW = (CW - 0.6) / Math.max(1, crit.length);
  crit.forEach((t, i) => {
    out.push(d.card(`q-crit-${i}`, M + 0.25 + i * colW, 5.0, colW - 0.22, 1.15, { fill: COLORS.panel }));
    out.push(d.text(`q-crit-${i}-t`, M + 0.4 + i * colW, 5.12, colW - 0.52, 0.95, t, {
      size: FONT.sizes.small, color: COLORS.inkSoft, valign: 'top',
    }));
  });
  return out;
}

// ---------------------------------------------------------------------------
// recap
// ---------------------------------------------------------------------------
function recap(slide) {
  const c = slide.content || {};
  const out = [];
  out.push(...C.panelBox('recap-known', M, 1.72, CW * 0.48, 4.7,
    c.established_title || 'Established (unchanged)'));
  const est = c.established || [];
  const rowH = Math.min(1.05, (4.3) / Math.max(1, est.length));
  est.forEach((e, i) => {
    const label = typeof e === 'string' ? '' : e.label;
    const detail = typeof e === 'string' ? e : e.detail;
    const y = 2.42 + i * rowH;
    if (label) {
      out.push(d.text(`recap-${i}-label`, M + 0.24, y, CW * 0.48 - 0.5, 0.28, label, {
        size: FONT.sizes.small, bold: true, color: COLORS.blue, valign: 'middle',
      }));
    }
    out.push(d.text(`recap-${i}`, M + 0.24, y + (label ? 0.28 : 0), CW * 0.48 - 0.5, rowH - (label ? 0.3 : 0.1), detail, {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top',
    }));
  });

  out.push(d.card('recap-now', M + CW * 0.51, 1.72, CW * 0.49, 4.7, { fill: COLORS.slateSoft }));
  out.push(d.text('recap-now-k', M + CW * 0.51 + 0.28, 1.95, CW * 0.49 - 0.56, 0.3,
    (c.now_title || 'Where we are now').toUpperCase(), {
      size: FONT.sizes.tiny, bold: true, color: COLORS.ink, valign: 'middle',
    }));
  out.push(d.text('recap-now-t', M + CW * 0.51 + 0.28, 2.45, CW * 0.49 - 0.56, 3.7,
    c.now || '', { size: 16, color: COLORS.ink, valign: 'top', lineSpacing: 24 }));
  if (c.prior_week) {
    out.push(...d.chip('recap-week-chip', M + CW * 0.51 + 0.28, 5.9, 1.6, 0.32, c.prior_week, {
      fill: COLORS.white, line: COLORS.rule,
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// problem
// ---------------------------------------------------------------------------
function problem(slide) {
  const c = slide.content || {};
  const out = [];
  out.push(d.card('problem-card', M, 1.72, CW * 0.58, 2.2, { fill: COLORS.blueSoft, line: COLORS.blue }));
  out.push(d.text('problem-text', M + 0.3, 1.95, CW * 0.58 - 0.6, 1.75,
    c.summary || slide.title, { size: 17, color: COLORS.ink, valign: 'top', lineSpacing: 24 }));

  if (Array.isArray(c.why_hard) && c.why_hard.length) {
    out.push(...C.bulletCard('problem-hard', M, 4.12, CW * 0.58, 2.3, 'Why it is hard', c.why_hard, {
      fill: COLORS.panel,
    }));
  }
  if (Array.isArray(c.constraints) && c.constraints.length) {
    out.push(...C.panelBox('problem-constraints', M + CW * 0.61, 1.72, CW * 0.39, 4.7, 'Constraints'));
    c.constraints.forEach((t, i) => {
      const y = 2.42 + i * 0.7;
      out.push(d.rect(`problem-con-${i}-dot`, M + CW * 0.61 + 0.26, y + 0.18, 0.1, 0.1, { fill: COLORS.amber }));
      out.push(d.text(`problem-con-${i}`, M + CW * 0.61 + 0.48, y, CW * 0.39 - 0.76, 0.62, t, {
        size: FONT.sizes.body - 1, color: COLORS.inkSoft, valign: 'top',
      }));
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// weakness / gap
// ---------------------------------------------------------------------------
function weakness(slide) {
  const c = slide.content || {};
  const out = [];
  out.push(d.card('gap-card', M, 1.72, CW, 1.5, { fill: COLORS.amberSoft, line: COLORS.amber }));
  out.push(d.text('gap-text', M + 0.32, 1.9, CW - 0.64, 1.15,
    c.gap || slide.title, { size: 18, bold: true, color: COLORS.ink, valign: 'middle', lineSpacing: 25 }));

  const ev = c.evidence || [];
  const impl = c.implication || '';
  out.push(...C.bulletCard('gap-evidence', M, 3.42, CW * (impl ? 0.56 : 1), 3.0, 'Evidence', ev, {
    bulletColor: COLORS.amber,
  }));
  if (impl) {
    out.push(...C.panelBox('gap-impl', M + CW * 0.6, 3.42, CW * 0.4, 3.0, 'Implication'));
    out.push(d.text('gap-impl-t', M + CW * 0.6 + 0.26, 4.05, CW * 0.4 - 0.52, 2.2, impl, {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top',
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// motivation (old -> new)
// ---------------------------------------------------------------------------
function motivation(slide) {
  const c = slide.content || {};
  const out = [];
  const boxW = CW * 0.34;
  const boxY = 2.3;
  const boxH = 2.6;
  out.push(...C.panelBox('mot-old', M, boxY, boxW, boxH, c.contrast && c.contrast.old_label ? c.contrast.old_label : 'Obvious baseline', {
    fill: COLORS.panel, line: COLORS.muted,
  }));
  out.push(d.text('mot-old-t', M + 0.26, boxY + 0.7, boxW - 0.52, boxH - 0.9,
    (c.contrast && c.contrast.old) || '', { size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top' }));

  out.push(d.arrow('mot-arrow', M + boxW + 0.15, boxY + boxH / 2, M + boxW + 1.05, boxY + boxH / 2, 'causal'));
  out.push(...d.semanticNode('mot-op', 'operator', M + boxW + 0.32, boxY + boxH / 2 - 0.29, 0.58, 0.58, '+', {
    labelSize: 20, textColor: COLORS.white,
  }));

  out.push(...C.panelBox('mot-new', M + boxW + 1.2, boxY, boxW, boxH, (c.contrast && c.contrast.new_label) || 'Our idea', {
    fill: COLORS.blueSoft, line: COLORS.blue,
  }));
  out.push(d.text('mot-new-t', M + boxW + 1.46, boxY + 0.7, boxW - 0.52, boxH - 0.9,
    (c.contrast && c.contrast.new) || '', { size: FONT.sizes.body, color: COLORS.ink, valign: 'top' }));

  out.push(d.card('mot-idea', M + CW * 0.72 + 0.35, boxY, CW * 0.28 - 0.3, boxH, { fill: COLORS.slateSoft }));
  out.push(d.text('mot-idea-k', M + CW * 0.72 + 0.55, boxY + 0.2, CW * 0.28 - 0.7, 0.3, 'THE IDEA', {
    size: FONT.sizes.tiny, bold: true, color: COLORS.blue, valign: 'middle',
  }));
  out.push(d.text('mot-idea-t', M + CW * 0.72 + 0.55, boxY + 0.6, CW * 0.28 - 0.7, boxH - 0.8,
    c.idea || '', { size: FONT.sizes.small + 1, color: COLORS.ink, valign: 'top' }));

  if (c.why_now) {
    out.push(d.text('mot-why', M, 5.35, CW, 1.15, c.why_now, {
      size: FONT.sizes.body + 1, color: COLORS.inkSoft, valign: 'top', lineSpacing: 22,
    }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// interpretation (observation / interpretation / claim)
// ---------------------------------------------------------------------------
function interpretation(slide) {
  const c = slide.content || {};
  const out = [];
  const bands = [
    { id: 'obs', label: 'OBSERVATION', text: c.observation, fill: COLORS.panel, line: COLORS.panelLine, accent: COLORS.muted, color: COLORS.inkSoft },
    { id: 'interp', label: 'INTERPRETATION', text: c.interpretation, fill: COLORS.blueSoft, line: COLORS.blue, accent: COLORS.blue, color: COLORS.ink },
  ];
  bands.forEach((b, i) => {
    const y = 1.72 + i * 1.72;
    out.push(d.card(`interp-${b.id}`, M, y, CW * 0.66, 1.5, { fill: b.fill, line: b.line }));
    out.push(d.text(`interp-${b.id}-k`, M + 0.28, y + 0.18, CW * 0.66 - 0.56, 0.28, b.label, {
      size: FONT.sizes.tiny, bold: true, color: b.accent, valign: 'middle',
    }));
    out.push(d.text(`interp-${b.id}-t`, M + 0.28, y + 0.52, CW * 0.66 - 0.56, 0.85, b.text || '', {
      size: FONT.sizes.body + 1, color: b.color, valign: 'top',
    }));
  });
  const claim = c.claim || {};
  const status = claim.status || 'unchanged';
  const sc = require('../renderer/theme').STATUS_COLORS[status] || COLORS.muted;
  out.push(d.card('interp-claim', M + CW * 0.69, 1.72, CW * 0.31, 3.22, {
    fill: COLORS.white, line: sc,
  }));
  out.push(d.text('interp-claim-k', M + CW * 0.69 + 0.26, 1.94, CW * 0.31 - 0.52, 0.28, 'CLAIM', {
    size: FONT.sizes.tiny, bold: true, color: sc, valign: 'middle',
  }));
  if (claim.id) {
    out.push(d.text('interp-claim-id', M + CW * 0.69 + 0.26, 2.3, CW * 0.31 - 0.52, 0.34, claim.id, {
      size: 18, bold: true, color: COLORS.ink, valign: 'middle',
    }));
  }
  out.push(d.text('interp-claim-t', M + CW * 0.69 + 0.26, 2.7, CW * 0.31 - 0.52, 1.6, claim.statement || '', {
    size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top',
  }));
  out.push(...d.chip('interp-claim-status', M + CW * 0.69 + 0.26, 4.35, 1.5, 0.34, status, {
    fill: COLORS.white, line: sc, color: sc,
  }));
  return out;
}

// ---------------------------------------------------------------------------
// limitations / open questions
// ---------------------------------------------------------------------------
function limitations(slide) {
  const c = slide.content || {};
  const out = [];
  out.push(...C.panelBox('lim-panel', M, 1.72, CW * 0.52, 4.7, 'Current limitations'));
  (c.limitations || []).forEach((t, i) => {
    const y = 2.44 + i * 0.98;
    out.push(d.text(`lim-${i}-n`, M + 0.26, y, 0.4, 0.4, String(i + 1), {
      size: 15, bold: true, color: COLORS.red, valign: 'middle',
    }));
    out.push(d.text(`lim-${i}`, M + 0.68, y, CW * 0.52 - 0.96, 0.86, t, {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top',
    }));
  });
  out.push(...C.panelBox('lim-open', M + CW * 0.55, 1.72, CW * 0.45, 4.7, 'Open questions'));
  (c.open_questions || []).forEach((t, i) => {
    const y = 2.44 + i * 0.98;
    out.push(d.text(`lim-open-${i}-q`, M + CW * 0.55 + 0.26, y, 0.4, 0.4, '?', {
      size: 16, bold: true, color: COLORS.blue, valign: 'middle',
    }));
    out.push(d.text(`lim-open-${i}`, M + CW * 0.55 + 0.68, y, CW * 0.45 - 0.96, 0.86, t, {
      size: FONT.sizes.body, color: COLORS.inkSoft, valign: 'top',
    }));
  });
  return out;
}

module.exports = { title, question, recap, problem, weakness, motivation, interpretation, limitations };
