'use strict';

const { COLORS, FONT, STROKE } = require('../renderer/theme');

// ---------------------------------------------------------------------------
// Primitive constructors
// ---------------------------------------------------------------------------

function text(id, x, y, w, h, str, style = {}) {
  const value = str === undefined || str === null ? '' : String(str);
  return { kind: 'text', id, x, y, w, h, text: value, style };
}

function rect(id, x, y, w, h, opts = {}) {
  return {
    kind: 'rect', id, x, y, w, h,
    fill: opts.fill === undefined ? null : opts.fill,
    line: opts.line === undefined ? null : opts.line,
    lineWidth: opts.lineWidth || STROKE.normal,
    dash: opts.dash || null,
  };
}

function roundRect(id, x, y, w, h, opts = {}) {
  return { ...rect(id, x, y, w, h, opts), kind: 'roundRect', radius: opts.radius === undefined ? 0.13 : opts.radius };
}

function ellipse(id, x, y, w, h, opts = {}) {
  return { ...rect(id, x, y, w, h, opts), kind: 'ellipse' };
}

function line(id, x1, y1, x2, y2, opts = {}) {
  return {
    kind: 'line', id, x1, y1, x2, y2,
    color: opts.color || COLORS.inkSoft,
    width: opts.width || STROKE.normal,
    dash: opts.dash || null,
    arrow: opts.arrow || 'none',
    semantic: opts.semantic || null,
  };
}

function group(id, children) {
  return { kind: 'group', id, children: children.filter(Boolean) };
}

// ---------------------------------------------------------------------------
// Semantic visual grammar
//
//   ellipse        -> representation / latent / feature
//   rect           -> model / module
//   roundRect      -> learned module
//   stack          -> cache / memory
//   small rect     -> token / patch
//   solid arrow    -> computation
//   dashed arrow   -> reuse / cache
//   thin arrow     -> reference relationship
//   thick arrow    -> geometric displacement (vector)
//   filled ellipse -> operator (correction / fusion)
// ---------------------------------------------------------------------------

const NODE_STYLE = {
  latent: { shape: 'ellipse', fill: COLORS.white, line: COLORS.ink, text: COLORS.ink },
  representation: { shape: 'ellipse', fill: COLORS.white, line: COLORS.ink, text: COLORS.ink },
  model: { shape: 'rect', fill: COLORS.blueSoft, line: COLORS.blue, text: COLORS.ink },
  learned: { shape: 'roundRect', fill: COLORS.amberSoft, line: COLORS.amber, text: COLORS.ink },
  cache: { shape: 'stack', fill: COLORS.panel, line: COLORS.muted, text: COLORS.inkSoft },
  token: { shape: 'rect', fill: COLORS.slateSoft, line: COLORS.muted, text: COLORS.inkSoft },
  operator: { shape: 'ellipse', fill: COLORS.amber, line: COLORS.amber, text: COLORS.white },
  prior: { shape: 'rect', fill: COLORS.panel, line: COLORS.muted, text: COLORS.inkSoft, dash: 'dash' },
  ours: { shape: 'roundRect', fill: COLORS.blueSoft, line: COLORS.blue, text: COLORS.ink },
  oursPrev: { shape: 'roundRect', fill: COLORS.slateSoft, line: COLORS.muted, text: COLORS.inkSoft },
};

const ARROW_STYLE = {
  compute: { color: COLORS.inkSoft, width: STROKE.normal, dash: null, arrow: 'end' },
  reuse: { color: COLORS.muted, width: STROKE.normal, dash: 'dash', arrow: 'end' },
  reference: { color: COLORS.faint, width: STROKE.thin, dash: null, arrow: 'none' },
  vector: { color: COLORS.red, width: STROKE.vector, dash: null, arrow: 'end' },
  causal: { color: COLORS.blue, width: STROKE.thick, dash: null, arrow: 'end' },
};

function semanticNode(id, kind, x, y, w, h, label, opts = {}) {
  const style = NODE_STYLE[kind] || NODE_STYLE.model;
  const out = [];
  const shape = style.shape;
  if (shape === 'stack') {
    const off = opts.stackOffset === undefined ? 0.09 : opts.stackOffset;
    out.push(roundRect(`${id}__back`, x + off * 2, y + off * 2, w, h, { fill: COLORS.white, line: COLORS.rule, radius: 0.1 }));
    out.push(roundRect(`${id}__mid`, x + off, y + off, w, h, { fill: COLORS.white, line: COLORS.rule, radius: 0.1 }));
    out.push(roundRect(id, x, y, w, h, { fill: style.fill, line: style.line, radius: 0.1 }));
  } else if (shape === 'ellipse') {
    out.push(ellipse(id, x, y, w, h, { fill: style.fill, line: style.line, lineWidth: style.line ? STROKE.normal + 0.2 : null }));
  } else if (shape === 'roundRect') {
    out.push(roundRect(id, x, y, w, h, { fill: style.fill, line: style.line, dash: style.dash }));
  } else {
    out.push(rect(id, x, y, w, h, { fill: style.fill, line: style.line, dash: style.dash }));
  }
  if (label !== undefined && label !== null && label !== '') {
    const size = opts.size || (shape === 'ellipse' ? FONT.sizes.node : FONT.sizes.label);
    out.push(text(`${id}__label`, x, y, w, h, label, {
      size: opts.labelSize || size,
      bold: opts.bold !== false,
      color: opts.textColor || style.text,
      align: 'center',
      valign: 'middle',
      fontFace: opts.fontFace || (opts.mono ? FONT.mono : FONT.face),
    }));
  }
  if (opts.sublabel) {
    out.push(text(`${id}__sublabel`, x, y + h + 0.04, w, 0.26, opts.sublabel, {
      size: FONT.sizes.tiny,
      color: COLORS.muted,
      align: 'center',
      valign: 'top',
    }));
  }
  return opts.single ? out : out;
}

function arrow(id, x1, y1, x2, y2, semantic, opts = {}) {
  const style = ARROW_STYLE[semantic] || ARROW_STYLE.compute;
  return line(id, x1, y1, x2, y2, {
    color: opts.color || style.color,
    width: opts.width || style.width,
    dash: opts.dash !== undefined ? opts.dash : style.dash,
    arrow: opts.arrow || style.arrow,
    semantic,
  });
}

function card(id, x, y, w, h, opts = {}) {
  return roundRect(id, x, y, w, h, {
    fill: opts.fill === undefined ? COLORS.panel : opts.fill,
    line: opts.line === undefined ? COLORS.panelLine : opts.line,
    radius: opts.radius === undefined ? 0.11 : opts.radius,
    dash: opts.dash,
  });
}

function chip(id, x, y, w, h, label, opts = {}) {
  return [
    roundRect(id, x, y, w, h, { fill: opts.fill || COLORS.slateSoft, line: opts.line || null, radius: h / 2 }),
    text(`${id}__label`, x, y, w, h, label, {
      size: opts.size || FONT.sizes.tiny,
      bold: true,
      color: opts.color || COLORS.inkSoft,
      align: 'center',
      valign: 'middle',
    }),
  ];
}

function rule(id, x, y, w, color) {
  return rect(id, x, y, w, 0.02, { fill: color || COLORS.rule });
}

module.exports = {
  text, rect, roundRect, ellipse, line, group,
  semanticNode, arrow, card, chip, rule,
  NODE_STYLE, ARROW_STYLE,
};
