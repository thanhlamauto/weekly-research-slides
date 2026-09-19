'use strict';

const fs = require('fs');
const JSZip = require('jszip');

// Inject native PowerPoint transitions and grouped-click entrance animations by
// post-processing the OOXML package. Concept reimplemented in JavaScript,
// informed by yinzige/pptx-motion-lite (MIT). See README acknowledgements.

const TRANSITIONS = {
  cut: '<p:cut/>',
  fade: '<p:fade/>',
  push: '<p:push dir="r"/>',
  wipe: '<p:wipe dir="r"/>',
  split: '<p:split orient="horz" dir="out"/>',
  cover: '<p:cover dir="r"/>',
  dissolve: '<p:dissolve/>',
  circle: '<p:circle/>',
  diamond: '<p:diamond/>',
  plus: '<p:plus/>',
  wedge: '<p:wedge/>',
};

const FILTERS = { appear: null, fade: 'fade', wipe: 'wipe(left)', fly: 'slide(fromBottom)', zoom: 'image' };
const PRESETS = { appear: [1, 0], fade: [10, 0], fly: [2, 4], zoom: [23, 0], wipe: [22, 1] };
const CHROME_TOKENS = new Set(['background', 'bg', 'header', 'footer', 'logo', 'watermark', 'pagenumber', 'pagenum', 'page', 'date', 'decor', 'decoration', 'decorative', 'rule']);

function isChrome(name) {
  const tokens = String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
  return tokens.some((t) => CHROME_TOKENS.has(t));
}

function shapeEntries(xml) {
  const out = [];
  const tagRe = /<p:cNvPr\b[^>]*>/g;
  let m;
  while ((m = tagRe.exec(xml))) {
    const tag = m[0];
    const id = tag.match(/\bid="(\d+)"/);
    const name = tag.match(/\bname="([^"]*)"/);
    if (id) out.push({ id: Number(id[1]), name: name ? name[1] : '' });
  }
  return out;
}

function xmlEsc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildTransition(effect, durationSec) {
  if (!effect || effect === 'none') return '';
  const inner = TRANSITIONS[effect] || TRANSITIONS.fade;
  const dur = Math.round((durationSec === undefined ? 0.4 : durationSec) * 1000);
  return `<p:transition xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" p14:dur="${dur}">${inner}</p:transition>`;
}

function stCond(delay) {
  return `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst>`;
}

function effectBlock(spid, effect, durMs, id) {
  const setEl = `<p:set><p:cBhvr><p:cTn id="${id}" dur="1" fill="hold">${stCond(0)}</p:cTn>`
    + `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl>`
    + '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
    + '<p:to><p:strVal val="visible"/></p:to></p:set>';
  const filter = FILTERS[effect];
  if (!filter) return { xml: setEl, next: id + 1 };
  const anim = `<p:animEffect transition="in" filter="${filter}"><p:cBhvr>`
    + `<p:cTn id="${id + 1}" dur="${durMs}"/>`
    + `<p:tgtEl><p:spTgt spid="${spid}"/></p:tgtEl></p:cBhvr></p:animEffect>`;
  return { xml: setEl + anim, next: id + 2 };
}

function buildTiming(groups, effect, durationSec) {
  const durMs = Math.round((durationSec === undefined ? 0.4 : durationSec) * 1000);
  const preset = PRESETS[effect] || PRESETS.fade;
  let next = 3;
  const pars = [];
  const animatedIds = [];

  for (const g of groups) {
    for (let i = 0; i < g.ids.length; i += 1) {
      const spid = g.ids[i];
      animatedIds.push(spid);
      const first = i === 0;
      const trigger = g.trigger || 'on-click';
      let nodeType;
      let delay;
      if (!first) { nodeType = 'withEffect'; delay = '0'; }
      else if (trigger === 'after-previous') { nodeType = 'afterEffect'; delay = '0'; }
      else if (trigger === 'with-previous') { nodeType = 'withEffect'; delay = '0'; }
      else { nodeType = 'clickEffect'; delay = 'indefinite'; }

      const wrapperId = next; next += 1;
      const leafId = next; next += 1;
      const block = effectBlock(spid, effect, durMs, next);
      next = block.next;

      pars.push('<p:par>'
        + `<p:cTn id="${wrapperId}" fill="hold">${stCond(delay)}<p:childTnLst>`
        + '<p:par>'
        + `<p:cTn id="${leafId}" presetID="${preset[0]}" presetClass="entr" presetSubtype="${preset[1]}" fill="hold" nodeType="${nodeType}">`
        + `${stCond(0)}<p:childTnLst>${block.xml}</p:childTnLst>`
        + '</p:cTn></p:par>'
        + '</p:childTnLst></p:cTn></p:par>');
    }
  }

  if (!pars.length) return '';
  const bld = animatedIds.map((id) => `<p:bldP spid="${id}" grpId="0"/>`).join('');
  return '<p:timing><p:tnLst><p:par>'
    + '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
    + '<p:seq concurrent="1" nextAc="seek">'
    + '<p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
    + pars.join('')
    + '</p:childTnLst></p:cTn>'
    + '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
    + '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
    + '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>'
    + `<p:bldLst>${bld}</p:bldLst></p:timing>`;
}

function injectSlide(xml, { effect, duration, transition, transitionDuration, groups }) {
  let out = xml
    .replace(/<p:transition\b[^>]*\/>/g, '')
    .replace(/<p:transition\b[\s\S]*?<\/p:transition>/g, '')
    .replace(/<p:timing>[\s\S]*?<\/p:timing>/g, '');

  const pieces = [];
  if (transition && transition !== 'none') pieces.push(buildTransition(transition, transitionDuration));
  const names = shapeEntries(out);
  if (groups && groups.length && effect && effect !== 'none') {
    pieces.push(buildTiming(groups, effect, duration));
  }
  if (!pieces.length) return out;
  const block = pieces.join('');
  if (out.includes('<p:extLst>')) out = out.replace('<p:extLst>', block + '<p:extLst>');
  else out = out.replace('</p:sld>', block + '</p:sld>');
  return out;
}

async function applyMotion(pptxPath, motionSpec, outputPath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(pptxPath));
  const defaults = motionSpec.defaults || {};
  const byNum = new Map();
  const byId = new Map();
  (motionSpec.slides || []).forEach((s, i) => {
    byNum.set(i + 1, s);
    if (s.id) {
      byId.set(s.id, s);
      const m = String(s.id).match(/(\d+)/);
      if (m) byNum.set(Number(m[1]), s);
    }
  });

  const slideFiles = Object.keys(zip.files)
    .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]));

  const report = [];
  for (let i = 0; i < slideFiles.length; i += 1) {
    const f = slideFiles[i];
    const xml = await zip.file(f).async('string');
    const entries = shapeEntries(xml);
    const idByName = new Map(entries.map((e) => [e.name, e.id]));
    const resolveIds = (nm) => {
      const hits = [];
      for (const e of entries) {
        if (e.name === nm || e.name.startsWith(`${nm}__`) || e.name.startsWith(`${nm}-`)) hits.push(e.id);
      }
      return hits;
    };

    const spec = byNum.get(i + 1) || byId.get(f) || null;
    const effect = (spec && spec.effect) || defaults.effect || 'fade';
    const duration = (spec && spec.duration !== undefined) ? spec.duration : (defaults.duration !== undefined ? defaults.duration : 0.4);
    const transition = (spec && spec.transition) || defaults.transition || 'fade';
    const transitionDuration = defaults.transition_duration !== undefined ? defaults.transition_duration : 0.4;

    let groups = null;
    const missing = [];
    if (spec && Array.isArray(spec.groups)) {
      groups = spec.groups.map((g) => {
        const ids = [];
        for (const nm of g.objects || []) {
          const hits = resolveIds(nm);
          if (hits.length) ids.push(...hits);
          else missing.push(nm);
        }
        return { ids, trigger: g.trigger };
      }).filter((g) => g.ids.length);
    } else if (defaults.auto) {
      const auto = entries.filter((e) => !isChrome(e.name)).map((e) => e.id);
      if (auto.length) groups = [{ ids: auto, trigger: 'on-click' }];
    }

    const edited = injectSlide(xml, { effect, duration, transition, transitionDuration, groups });
    if (edited !== xml) zip.file(f, edited);
    report.push({ slide: i + 1, animated: groups ? groups.reduce((n, g) => n + g.ids.length, 0) : 0, missing });
  }

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, buf);
  return { output: outputPath, slides: report };
}

module.exports = { applyMotion, buildTiming, buildTransition, shapeEntries, isChrome };
