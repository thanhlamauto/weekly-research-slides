'use strict';

const { getLayout } = require('../layouts');
const C = require('../layouts/common');
const sceneMod = require('./scene');
const theme = require('./theme');

// Build the renderer-agnostic scene from a validated slide_spec.
function buildScene(spec) {
  if (!spec || !spec.deck || !Array.isArray(spec.slides)) {
    throw new Error('slide_spec must contain deck and slides');
  }
  const out = sceneMod.scene(spec.deck);
  spec.slides.forEach((s, index) => {
    const layout = getLayout(s.archetype);
    if (!layout) throw new Error(`Unknown archetype: ${s.archetype} (slide ${s.id})`);
    const ctx = { deck: spec.deck, index, total: spec.slides.length, theme };
    const content = layout(s, ctx) || [];
    const primitives = [...C.chrome(s, ctx), ...content];
    out.slides.push(sceneMod.slide(s.id, s.archetype, s.title, primitives, {
      notes: s.notes || '',
      beats: s.beats || [],
      module: s.module || null,
    }));
  });
  return out;
}

module.exports = { buildScene };
