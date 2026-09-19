'use strict';

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'with', 'on', 'is', 'are', 'was', 'were', 'be', 'as', 'by', 'that', 'this', 'it', 'its', 'we', 'our', 'their', 'from', 'at', 'into', 'than', 'then']);

function words(text) {
  return String(text || '').toLowerCase().match(/[a-z0-9][a-z0-9'’._-]*/g) || [];
}

function contentWords(text) {
  return words(text).filter((w) => !STOP.has(w));
}

function sentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function jaccard(a, b) {
  const A = new Set(contentWords(a));
  const B = new Set(contentWords(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

const NARRATION_STARTS = /^(this means|as a result|in other words|because|therefore|that is why|note that|it is worth|as shown|here we|we can see|the reason is)/i;

function looksLikeNarration(text) {
  const w = words(text);
  if (w.length > 16) return true;
  return NARRATION_STARTS.test(String(text).trim());
}

function firstSentence(text) {
  const s = sentences(text);
  return s.length ? s[0] : String(text || '').trim();
}

// A safe leading clause for shortening: the first sentence if it is short
// enough, else the first comma/semicolon clause. Returns null when even the
// leading clause is too long to shorten without losing meaning.
function leadClause(text, maxWords = 16) {
  const whole = String(text || '').trim();
  const first = firstSentence(whole);
  if (words(first).length <= maxWords) return first;
  const seg = whole.split(/(?<=[,;:])\s+/)[0].replace(/[,;:]\s*$/, '').trim();
  if (words(seg).length >= 6 && words(seg).length <= maxWords) return seg;
  return null;
}

function titleCaseClaim(text) {
  const t = firstSentence(text).replace(/\s+/g, ' ').trim();
  return t.length > 90 ? `${t.slice(0, 87).trimEnd()}…` : t;
}

module.exports = { words, contentWords, sentences, jaccard, looksLikeNarration, firstSentence, leadClause, titleCaseClaim };
