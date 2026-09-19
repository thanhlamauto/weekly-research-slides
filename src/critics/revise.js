'use strict';

const T = require('./textutil');

const DELETION_OPS = new Set(['drop_field', 'move_to_notes', 'shorten_field', 'cap_list', 'merge_slides', 'delete_slide']);

function parsePath(path) {
  const tokens = [];
  String(path).split('.').forEach((seg) => {
    const m = seg.match(/^(.*?)(?:\[(\d+)\])?$/);
    if (m[1]) tokens.push({ key: m[1] });
    if (m[2] !== undefined) tokens.push({ index: Number(m[2]) });
  });
  return tokens;
}

function getPath(obj, path) {
  let cur = obj;
  for (const t of parsePath(path)) cur = t.key !== undefined ? (cur ? cur[t.key] : undefined) : (cur ? cur[t.index] : undefined);
  return cur;
}

function removePath(obj, path) {
  const tokens = parsePath(path);
  let cur = obj;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const t = tokens[i];
    cur = t.key !== undefined ? cur[t.key] : cur[t.index];
    if (cur == null) return false;
  }
  const last = tokens[tokens.length - 1];
  if (last.index !== undefined && Array.isArray(cur)) { cur.splice(last.index, 1); return true; }
  if (last.key !== undefined && cur && typeof cur === 'object') { delete cur[last.key]; return true; }
  return false;
}

function setPath(obj, path, value) {
  const tokens = parsePath(path);
  let cur = obj;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const t = tokens[i];
    cur = t.key !== undefined ? cur[t.key] : cur[t.index];
    if (cur == null) return false;
  }
  const last = tokens[tokens.length - 1];
  if (last.key !== undefined && cur && typeof cur === 'object') { cur[last.key] = value; return true; }
  if (last.index !== undefined && Array.isArray(cur)) { cur[last.index] = value; return true; }
  return false;
}

function slideById(spec, id) {
  return (spec.slides || []).find((s) => s.id === id) || null;
}

function appendNote(slide, text) {
  const clean = String(text || '').trim();
  if (!clean) return;
  const existing = (slide.notes || '').trim();
  if (existing.toLowerCase().includes(clean.toLowerCase())) return;
  slide.notes = existing ? `${existing}\n\n${clean}` : clean;
}

// Apply critic findings to the slide source. Returns the revised spec plus a
// record of what was applied and what remains unresolved. Deletion-only mode
// forbids any operation that adds content.
function applyRevisions(spec, findings, opts = {}) {
  const mode = opts.mode || 'all';
  const revised = JSON.parse(JSON.stringify(spec));
  const applied = [];
  const unresolved = [];
  const usedPaths = new Set();

  for (const f of findings) {
    if (f.severity === 'info' || !f.op) { unresolved.push({ ...f, applied: false }); continue; }
    const op = f.op;
    if (mode === 'deletion-only' && !DELETION_OPS.has(op.op)) { unresolved.push({ ...f, applied: false }); continue; }
    if (op.op === 'delete_slide' || op.op === 'merge_slides') {
      const targetId = op.op === 'delete_slide' ? (op.id || f.slide) : op.from;
      const idx = (revised.slides || []).findIndex((s) => s.id === targetId);
      if (idx < 0) { unresolved.push({ ...f, applied: false }); continue; }
      if (op.op === 'merge_slides') {
        const into = slideById(revised, op.into);
        const from = revised.slides[idx];
        if (into) {
          if (from.takeaway) appendNote(into, from.takeaway);
          if (from.notes) appendNote(into, from.notes);
        }
      }
      revised.slides.splice(idx, 1);
      applied.push({ ...f, applied: true });
      continue;
    }
    const slide = slideById(revised, f.slide);
    if (!slide) { unresolved.push({ ...f, applied: false }); continue; }
    const key = `${f.slide}:${op.path || op.from || op.op}`;
    if (usedPaths.has(key)) { continue; }
    let ok = false;
    // Never empty a list: removing the last item of an array leaves a dead panel.
    if (op.op === 'drop_field' || op.op === 'move_to_notes') {
      const m = String(op.path).match(/^(.*)\[(\d+)\](?:\.[A-Za-z0-9_]+)?$/);
      if (m) {
        const arr = getPath(slide.content, `${m[1]}[]`) || getPath(slide.content, m[1]);
        if (Array.isArray(arr) && arr.length <= 1) { unresolved.push({ ...f, applied: false }); continue; }
      }
    }
    try {
      if (op.op === 'drop_field') {
        ok = removePath(slide.content, op.path);
      } else if (op.op === 'move_to_notes') {
        const text = getPath(slide.content, op.path);
        if (typeof text === 'string' && text.trim()) { appendNote(slide, text); ok = removePath(slide.content, op.path); }
      } else if (op.op === 'shorten_field') {
        const text = getPath(slide.content, op.path);
        if (typeof text === 'string') {
          const short = T.leadClause(text, op.maxWords || 18);
          if (short && short.length < text.trim().length) {
            const rest = text.trim().slice(short.length).replace(/^[,;:.\s]+/, '').trim();
            if (op.toNotes && rest) appendNote(slide, rest);
            ok = setPath(slide.content, op.path, short);
          } else {
            ok = false; // cannot shorten safely; leave it unresolved for the author
          }
        }
      } else if (op.op === 'cap_list') {
        const arr = getPath(slide.content, op.path);
        if (Array.isArray(arr)) { slide.content[op.path] = arr.slice(0, op.keep); ok = true; }
      } else if (op.op === 'retitle') {
        const text = getPath(slide.content, op.from);
        if (typeof text === 'string' && text.trim()) { slide.title = T.titleCaseClaim(text); ok = true; }
      }
    } catch (e) { ok = false; }
    // Removing a sub-field from an array item can leave a label-only husk that
    // renders as an empty row; prune the item in that case.
    if (ok && (op.op === 'drop_field' || op.op === 'move_to_notes')) {
      const m = String(op.path).match(/^(.*)\[(\d+)\]\.([A-Za-z0-9_]+)$/);
      if (m) {
        const arr = getPath(slide.content, `${m[1]}[]`) || getPath(slide.content, m[1]);
        const item = Array.isArray(arr) ? arr[Number(m[2])] : null;
        if (item && typeof item === 'object'
          && Object.keys(item).every((k) => ['label', 'id', 'role'].includes(k))) {
          arr.splice(Number(m[2]), 1);
        }
      }
    }
    if (ok) { usedPaths.add(key); applied.push({ ...f, applied: true }); } else unresolved.push({ ...f, applied: false });
  }
  return { spec: revised, applied, unresolved };
}

module.exports = { applyRevisions, getPath, setPath, removePath, appendNote };
