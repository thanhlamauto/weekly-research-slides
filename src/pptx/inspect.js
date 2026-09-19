'use strict';

const fs = require('fs');
const JSZip = require('jszip');
const { XMLParser } = require('fast-xml-parser');

const EMU_PER_IN = 914400;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  isArray: (name) => ['sp', 'pic', 'graphicFrame', 'grpSp', 'p'].includes(name),
});

function toIn(emu) {
  const n = Number(emu);
  return Number.isFinite(n) ? +(n / EMU_PER_IN).toFixed(4) : null;
}

function textOf(txBody) {
  if (!txBody) return '';
  const paras = txBody.p || [];
  const list = Array.isArray(paras) ? paras : [paras];
  const lines = list.map((p) => {
    const runs = p.r ? (Array.isArray(p.r) ? p.r : [p.r]) : [];
    return runs.map((r) => {
      const t = r.t;
      if (t === undefined || t === null) return '';
      if (typeof t === 'string') return t;
      if (typeof t === 'object') return t['#text'] || '';
      return String(t);
    }).join('');
  });
  return lines.join('\n').trim();
}

function shapeFromNode(node, kindHint) {
  const nv = node.nvSpPr || node.nvPicPr || node.nvGraphicFramePr || node.nvGrpSpPr || {};
  const cNvPr = nv.cNvPr || {};
  const spPr = node.spPr || {};
  const xfrm = spPr.xfrm || {};
  const off = xfrm.off || {};
  const ext = xfrm.ext || {};
  const geom = spPr.prstGeom || {};
  const shape = {
    id: cNvPr['@_id'] !== undefined ? Number(cNvPr['@_id']) : null,
    name: cNvPr['@_name'] || '',
    type: kindHint,
    prst: geom['@_prst'] || null,
    text: textOf(node.txBody),
    x: off['@_x'] !== undefined ? toIn(off['@_x']) : null,
    y: off['@_y'] !== undefined ? toIn(off['@_y']) : null,
    w: ext['@_cx'] !== undefined ? toIn(ext['@_cx']) : null,
    h: ext['@_cy'] !== undefined ? toIn(ext['@_cy']) : null,
  };
  return shape;
}

function collectShapes(spTree) {
  const out = [];
  const push = (nodes, kind) => {
    const list = nodes ? (Array.isArray(nodes) ? nodes : [nodes]) : [];
    for (const n of list) {
      if (!n || typeof n !== 'object') continue;
      const s = shapeFromNode(n, kind);
      out.push(s);
      if (kind === 'group' && n.sp) push(n.sp, 'shape');
      if (kind === 'group' && n.grpSp) push(n.grpSp, 'group');
      if (kind === 'group' && n.pic) push(n.pic, 'picture');
    }
  };
  push(spTree.sp, 'shape');
  push(spTree.pic, 'picture');
  push(spTree.graphicFrame, 'graphicFrame');
  push(spTree.grpSp, 'group');
  return out;
}

async function inspectPptx(file) {
  const buf = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(buf);
  const presFile = zip.file('ppt/presentation.xml');
  if (!presFile) throw new Error('Not a PPTX: ppt/presentation.xml missing');
  const pres = parser.parse(await presFile.async('string'));
  const sldSz = pres['p:sldSz'] || pres.sldSz || {};
  const slideWidth = toIn(sldSz['@_cx']) || 13.333;
  const slideHeight = toIn(sldSz['@_cy']) || 7.5;

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]));

  const slides = [];
  for (const f of slideFiles) {
    const parsed = parser.parse(await zip.file(f).async('string'));
    const sld = parsed.sld || parsed['p:sld'] || {};
    const cSld = sld.cSld || {};
    const spTree = cSld.spTree || {};
    slides.push({
      number: Number(f.match(/(\d+)/)[1]),
      file: f,
      shapes: collectShapes(spTree),
    });
  }

  return {
    file,
    slideWidth,
    slideHeight,
    slideCount: slides.length,
    slides,
    hasContentTypes: !!zip.file('[Content_Types].xml'),
    mediaFiles: Object.keys(zip.files).filter((f) => f.startsWith('ppt/media/')),
  };
}

module.exports = { inspectPptx, textOf, EMU_PER_IN };
