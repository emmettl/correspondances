# Correspondances

**[Open Correspondances](https://emmettl.github.io/correspondances/)** · [Motion Studies catalogue](https://emmettl.github.io/motionstudies/)

[Study brief](https://github.com/emmettl/motionstudies/blob/main/docs/PARIS.md) · [Project goals](https://github.com/emmettl/motionstudies/blob/main/docs/VISION.md) · [Roadmap](https://github.com/emmettl/motionstudies/blob/main/ROADMAP.md)

An independent Motion Studies edition. This repository owns its application, style, authored fixtures, source-specific data compilers and browser/provenance checks. Shared code comes from the four exact `@motionstudies/*` npm releases at `0.1.0-alpha.1`.

## Development

Use Node 22.12 or newer. Run `npm ci`, then `npm run dev`. `npm run build` stages only this edition's fixtures and builds the root entry point.

Validation: `npm run check:boundary`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle`, and `npm run test:e2e:ci` (after `npx playwright install chromium webkit`). The boundary check rejects workspaces, linked sources, non-registry dependencies and unsupported package exports.

## Hosting and data

GitHub Pages deployment is manual through **Deploy Pages**. The site is served at https://emmettl.github.io/correspondances/.

Data scripts preserve the explicit source dates and provenance from the original edition. CI uses the committed reviewed fixtures; refreshing source data is a separate deliberate operation.

## Extraction

Extracted from [Gleislicht 5c65186](https://github.com/emmettl/gleislicht/commit/5c6518647d5826b8d0e0f49e3fb3b6dd28b72ef5) using path-filtered Git fast export/import. Selected paths retain their Git history. The root entry point, local catalogue and build configuration are narrowed to this edition. Shared packages and the widget lab belong to [Motion Studies](https://github.com/emmettl/motionstudies).
