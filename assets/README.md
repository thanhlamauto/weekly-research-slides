# Assets

This directory is intentionally almost empty.

The skill ships **no bundled visual templates or third-party assets**. The deck
look is generated from `src/renderer/theme.js` and `src/visual-grammar/draw.js`,
so there is nothing to copy and no redistribution concerns.

If you add templates or images here, check their licenses first and document
attribution. Do not add proprietary slide templates, logos, or downloaded
figures.

Generated preview and gallery images live in [`docs/images/`](../docs/images/)
and are reproduced with:

```bash
npm run assets
```
