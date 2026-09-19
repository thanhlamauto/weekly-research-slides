'use strict';

// Optional render integration test. It is skipped when Manim is not installed,
// so the fast unit tests still run in a bare environment.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SUB = path.join(ROOT, 'skills', 'research-method-video');
const VENV_PY = path.join(ROOT, '.venv-manim', 'bin', 'python');
const HAS_MANIM = fs.existsSync(VENV_PY) && fs.existsSync(path.join(ROOT, '.venv-manim', 'bin', 'manim'));

test('a single LESA scene renders at draft quality', { skip: !HAS_MANIM, timeout: 600000 }, () => {
  const media = fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-video-'));
  const r = spawnSync(VENV_PY, [
    path.join(SUB, 'scripts', 'render_scene.py'),
    '--project', 'examples/lesa',
    '--scene', 'lesa_07_recap',
    '--quality', 'draft',
    '--media-dir', media,
  ], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, PKG_CONFIG_PATH: '/opt/homebrew/lib/pkgconfig:' + (process.env.PKG_CONFIG_PATH || '') } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = path.join(ROOT, 'examples', 'lesa', 'renders', 'draft', 'lesa_07_recap.mp4');
  assert.ok(fs.existsSync(out), 'scene mp4 not produced');
  assert.ok(fs.statSync(out).size > 5000, 'scene mp4 is suspiciously small');
});
