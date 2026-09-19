'use strict';

const { LAYOUT, FONT } = require('./theme');

// Deterministic vector preview rendered from the same scene the PPTX uses.
// This is a source preview, not a rasterization of the generated PPTX.
const PX_PER_IN = 96;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function hex(c) {
  return c ? (c.startsWith('#') ? c : `#${c}`) : 'none';
}

function wrap(text, wIn, sizePt) {
  const boxW = wIn * PX_PER_IN;
  const charW = (sizePt * PX_PER_IN / 72) * 0.5;
  const maxChars = Math.max(3, Math.floor(boxW / charW));
  const out = [];
  for (const para of String(text).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); continue; }
    let cur = '';
    for (const wd of words) {
      if (!cur) cur = wd;
      else if ((cur + ' ' + wd).length <= maxChars) cur += ' ' + wd;
      else { out.push(cur); cur = wd; }
    }
    out.push(cur);
  }
  return out;
}

function textSvg(p) {
  const st = p.style || {};
  const sizePt = st.size || FONT.sizes.body;
  const sizePx = (sizePt * PX_PER_IN) / 72;
  const x = p.x * PX_PER_IN;
  const y = p.y * PX_PER_IN;
  const w = p.w * PX_PER_IN;
  const h = p.h * PX_PER_IN;
  const anchor = st.align === 'center' ? 'middle' : (st.align === 'right' ? 'end' : 'start');
  const tx = st.align === 'center' ? x + w / 2 : (st.align === 'right' ? x + w : x);
  const lines = wrap(p.text, p.w, sizePt);
  const lh = sizePx * 1.24;
  let startY;
  if (st.valign === 'middle') startY = y + h / 2 - ((lines.length - 1) * lh) / 2 + sizePx * 0.34;
  else if (st.valign === 'bottom') startY = y + h - (lines.length - 1) * lh - sizePx * 0.2;
  else startY = y + sizePx * 0.92;
  const tspans = lines.map((ln, i) =>
    `<tspan x="${tx.toFixed(1)}" y="${(startY + i * lh).toFixed(1)}">${esc(ln) || ' '}</tspan>`).join('');
  return `<text font-family="${esc(st.fontFace || FONT.face)}" font-size="${sizePx.toFixed(1)}" `
    + `fill="${hex(st.color || '111827')}" text-anchor="${anchor}" `
    + `${st.bold ? 'font-weight="700" ' : ''}${st.italic ? 'font-style="italic" ' : ''}>${tspans}</text>`;
}

function shapeSvg(p) {
  const x = p.x * PX_PER_IN;
  const y = p.y * PX_PER_IN;
  const w = p.w * PX_PER_IN;
  const h = p.h * PX_PER_IN;
  const fill = p.fill ? hex(p.fill) : 'none';
  const stroke = p.line ? hex(p.line) : 'none';
  const sw = (p.lineWidth || 1) * PX_PER_IN / 72;
  const dash = p.dash ? ` stroke-dasharray="${p.dash === 'dash' ? '8 6' : '4 4'}"` : '';
  if (p.kind === 'ellipse') {
    return `<ellipse cx="${(x + w / 2).toFixed(1)}" cy="${(y + h / 2).toFixed(1)}" rx="${(w / 2).toFixed(1)}" ry="${(h / 2).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw.toFixed(2)}"/>`;
  }
  const rx = p.kind === 'roundRect' ? (p.radius || 0.13) * PX_PER_IN : 0;
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${rx.toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw.toFixed(2)}"${dash}/>`;
}

function lineSvg(p) {
  const x1 = p.x1 * PX_PER_IN;
  const y1 = p.y1 * PX_PER_IN;
  const x2 = p.x2 * PX_PER_IN;
  const y2 = p.y2 * PX_PER_IN;
  const sw = (p.width || 1) * PX_PER_IN / 72;
  const dash = p.dash ? ` stroke-dasharray="${p.dash === 'dash' ? '9 7' : '4 4'}"` : '';
  const marker = p.arrow !== 'none' && p.arrow ? ` marker-end="url(#arw-${p.color})"` : '';
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" `
    + `stroke="${hex(p.color)}" stroke-width="${sw.toFixed(2)}"${dash}${marker} stroke-linecap="round"/>`;
}

function primitiveSvg(p) {
  if (p.kind === 'text') return textSvg(p);
  if (p.kind === 'line') return lineSvg(p);
  if (p.kind === 'group') return p.children.map(primitiveSvg).join('');
  return shapeSvg(p);
}

function markerColors(slide) {
  const colors = new Set();
  const walk = (ps) => ps.forEach((p) => {
    if (p.kind === 'line' && p.arrow && p.arrow !== 'none') colors.add(p.color);
    if (p.kind === 'group' && p.children) walk(p.children);
  });
  walk(slide.primitives);
  return colors;
}

function slideParts(slide) {
  const defs = [...markerColors(slide)].map((c) =>
    `<marker id="arw-${c}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`
    + `<path d="M 0 0 L 10 5 L 0 10 z" fill="${hex(c)}"/></marker>`).join('');
  const body = slide.primitives.map(primitiveSvg).join('\n  ');
  return { defs, body };
}

function slideToSvg(slide, index, total) {
  const W = LAYOUT.w * PX_PER_IN;
  const H = LAYOUT.h * PX_PER_IN;
  const { defs, body } = slideParts(slide);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`
    + `<defs>${defs}</defs>\n  ${body}\n</svg>`;
}

function renderSvg(scene) {
  return scene.slides.map((s, i) => slideToSvg(s, i, scene.slides.length));
}

function contactSheet(scene, opts = {}) {
  const cols = opts.cols || 3;
  const gap = opts.gap === undefined ? 24 : opts.gap;
  const scale = opts.scale === undefined ? 0.42 : opts.scale;
  const sw = LAYOUT.w * PX_PER_IN * scale;
  const sh = LAYOUT.h * PX_PER_IN * scale;
  const rows = Math.ceil(scene.slides.length / cols);
  const W = cols * sw + (cols + 1) * gap;
  const H = rows * sh + (rows + 1) * gap;
  const defs = new Set();
  const cells = scene.slides.map((sl, i) => {
    const parts = slideParts(sl);
    parts.defs.split('</marker>').filter(Boolean).forEach((d) => defs.add(d + '</marker>'));
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gap + col * (sw + gap);
    const y = gap + row * (sh + gap);
    return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scale})">`
      + `<rect x="0" y="0" width="${LAYOUT.w * PX_PER_IN}" height="${LAYOUT.h * PX_PER_IN}" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="2"/>`
      + parts.body + '</g>';
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(W)}" height="${Math.round(H)}" viewBox="0 0 ${Math.round(W)} ${Math.round(H)}">`
    + `<rect width="100%" height="100%" fill="#F3F4F6"/>`
    + `<defs>${[...defs].join('')}</defs>\n${cells}\n</svg>`;
}

module.exports = { renderSvg, slideToSvg, contactSheet, PX_PER_IN };
