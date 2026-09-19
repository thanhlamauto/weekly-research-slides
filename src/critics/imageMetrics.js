'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function pythonCandidates(root) {
  return [
    process.env.WRS_PYTHON,
    path.join(root, '.venv-manim', 'bin', 'python'),
    'python3',
  ].filter(Boolean);
}

// Returns { ok, images, reason } — never throws, so callers can degrade to
// geometry-only visual QA when Pillow/numpy are unavailable.
function analyzeImages(root, imageDir) {
  const script = path.join(root, 'scripts', 'slide_image_metrics.py');
  if (!fs.existsSync(script)) return { ok: false, reason: 'metrics script missing' };
  const out = path.join(imageDir, '..', 'image_metrics.json');
  let lastErr = 'python unavailable';
  for (const py of pythonCandidates(root)) {
    const r = spawnSync(py, [script, '--input', imageDir, '--output', out], { encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(out)) {
      return { ok: true, images: JSON.parse(fs.readFileSync(out, 'utf8')).images };
    }
    lastErr = (r.stderr || r.stdout || '').trim().split('\n').slice(-1)[0] || lastErr;
  }
  return { ok: false, reason: lastErr };
}

module.exports = { analyzeImages };
