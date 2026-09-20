'use strict';

// External tool discovery shared by the Beamer build and the TikZ backend.

const fs = require('fs');
const path = require('path');

const CACHE = new Map();

function findTool(name) {
  if (CACHE.has(name)) return CACHE.get(name);
  const candidates = [];
  if (process.env.WRS_TEX_BIN) candidates.push(path.join(process.env.WRS_TEX_BIN, name));
  for (const dir of (process.env.PATH || '').split(path.delimiter)) if (dir) candidates.push(path.join(dir, name));
  candidates.push('/Library/TeX/texbin/' + name, '/opt/homebrew/bin/' + name, '/usr/local/bin/' + name);
  const home = process.env.HOME || '';
  if (home) {
    candidates.push(path.join(home, 'Library', 'TinyTeX', 'bin', 'universal-darwin', name));
    candidates.push(path.join(home, 'Library', 'TinyTeX', 'bin', 'aarch64-darwin', name));
  }
  for (const c of candidates) {
    try { fs.accessSync(c, fs.constants.X_OK); CACHE.set(name, c); return c; } catch (e) { /* keep looking */ }
  }
  CACHE.set(name, null);
  return null;
}

function pythonCandidates(root) {
  return [
    process.env.WRS_PYTHON,
    path.join(root, '.venv-manim', 'bin', 'python'),
    'python3',
  ].filter(Boolean);
}

module.exports = { findTool, pythonCandidates };
