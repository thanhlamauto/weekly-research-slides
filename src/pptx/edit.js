'use strict';

const fs = require('fs');
const JSZip = require('jszip');
const { EMU_PER_IN } = require('./inspect');

// Conservative, source-preserving edits on an existing PPTX.
// Supported ops: set_text, move, resize, annotate.
// Everything not touched is preserved byte-for-byte inside the package.

function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function inToEmu(v) {
  return Math.round(Number(v) * EMU_PER_IN);
}

function blockName(block) {
  const m = block.match(/<p:cNvPr[^>]*\bname="([^"]*)"/);
  return m ? m[1] : null;
}

function applySetText(block, op) {
  let first = true;
  return block.replace(/<a:t>([\s\S]*?)<\/a:t>/g, () => {
    if (first) { first = false; return `<a:t>${escXml(op.text)}</a:t>`; }
    return '<a:t></a:t>';
  });
}

function applyMove(block, op) {
  const dx = inToEmu(op.dx || 0);
  const dy = inToEmu(op.dy || 0);
  return block.replace(/(<a:off x=")(-?\d+)(" y=")(-?\d+)("\s*\/>)/, (m, a, x, b, y, c) =>
    `${a}${Number(x) + dx}${b}${Number(y) + dy}${c}`);
}

function applyResize(block, op) {
  const cx = op.w !== undefined ? inToEmu(op.w) : null;
  const cy = op.h !== undefined ? inToEmu(op.h) : null;
  return block.replace(/(<a:ext cx=")(-?\d+)(" cy=")(-?\d+)("\s*\/>)/, (m, a, x, b, y, c) =>
    `${a}${cx === null ? x : cx}${b}${cy === null ? y : cy}${c}`);
}

function buildAnnotationSp(op, id) {
  const x = inToEmu(op.x || 0.8);
  const y = inToEmu(op.y || 0.8);
  const w = inToEmu(op.w || 4.0);
  const h = inToEmu(op.h || 0.5);
  const color = (op.color || '111827').replace('#', '');
  const size = Math.round((op.size || 12) * 100);
  const name = op.name || `annotation-${id}`;
  return '<p:sp>'
    + '<p:nvSpPr>'
    + `<p:cNvPr id="${id}" name="${escXml(name)}"/>`
    + '<p:cNvSpPr txBox="1"/>'
    + '<p:nvPr/>'
    + '</p:nvSpPr>'
    + '<p:spPr>'
    + `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>`
    + '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
    + '<a:noFill/>'
    + '</p:spPr>'
    + '<p:txBody>'
    + '<a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr>'
    + '<a:lstStyle/>'
    + `<a:p><a:r><a:rPr lang="en-US" sz="${size}"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr><a:t>${escXml(op.text)}</a:t></a:r></a:p>`
    + '</p:txBody>'
    + '</p:sp>';
}

function maxShapeId(xml) {
  let max = 1;
  const re = /<p:cNvPr[^>]*\bid="(\d+)"/g;
  let m;
  while ((m = re.exec(xml))) max = Math.max(max, Number(m[1]));
  return max;
}

function applyOpsToXml(xml, ops) {
  const byName = new Map();
  for (const op of ops) {
    if (op.op === 'annotate') continue;
    if (!op.target) continue;
    if (!byName.has(op.target)) byName.set(op.target, []);
    byName.get(op.target).push(op);
  }

  let out = xml.replace(/<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/g, (block) => {
    const name = blockName(block);
    if (!name || !byName.has(name)) return block;
    let b = block;
    for (const op of byName.get(name)) {
      if (op.op === 'set_text') b = applySetText(b, op);
      else if (op.op === 'move') b = applyMove(b, op);
      else if (op.op === 'resize') b = applyResize(b, op);
    }
    return b;
  });

  const annos = ops.filter((o) => o.op === 'annotate');
  if (annos.length && out.includes('</p:spTree>')) {
    let id = maxShapeId(out);
    const chunks = annos.map((op) => buildAnnotationSp(op, ++id));
    out = out.replace('</p:spTree>', `${chunks.join('')}</p:spTree>`);
  }
  return out;
}

async function editPptx(input, opsFile, output, ops) {
  const list = ops || require('js-yaml').load(fs.readFileSync(opsFile, 'utf8')).ops || [];
  const zip = await JSZip.loadAsync(fs.readFileSync(input));
  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]));

  const applied = [];
  for (const f of slideFiles) {
    const slideNo = Number(f.match(/(\d+)/)[1]);
    const scoped = list.filter((op) => op.slide === undefined || Number(op.slide) === slideNo);
    if (!scoped.length) continue;
    const xml = await zip.file(f).async('string');
    const edited = applyOpsToXml(xml, scoped);
    if (edited !== xml) {
      zip.file(f, edited);
      applied.push({ slide: slideNo, ops: scoped.map((o) => o.op) });
    }
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(output, buf);
  return { output, applied };
}

module.exports = { editPptx, applyOpsToXml };
