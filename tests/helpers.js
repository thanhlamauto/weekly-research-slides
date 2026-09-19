'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const { loadData } = require('../src/model/validate');
const { buildScene } = require('../src/renderer/buildScene');
const { writePptx } = require('../src/renderer/pptxRenderer');

const ROOT = path.join(__dirname, '..');
const EX = path.join(ROOT, 'examples', 'diagnostic-week');

function tmp(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wrs-test-'));
  return path.join(dir, name);
}

function exampleSpec() {
  return loadData(path.join(EX, 'slide_spec.yaml'));
}

async function buildExample(outfile) {
  const spec = exampleSpec();
  const scene = buildScene(spec);
  await writePptx(scene, outfile || tmp('example.pptx'));
  return { spec, scene };
}

module.exports = { ROOT, EX, tmp, loadData, exampleSpec, buildScene, buildExample, writePptx };
