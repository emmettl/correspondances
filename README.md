# Correspondances

**[Open Correspondances](https://emmettl.github.io/correspondances/)** · [Motion Studies catalogue](https://emmettl.github.io/motionstudies/)

[Study brief](https://github.com/emmettl/motionstudies/blob/main/docs/PARIS.md) · [Project goals](https://github.com/emmettl/motionstudies/blob/main/docs/VISION.md) · [Roadmap](https://github.com/emmettl/motionstudies/blob/main/ROADMAP.md)

An independent Motion Studies edition. This repository owns its application, style, authored fixtures, source-specific data compilers and browser/provenance checks. Shared code comes from the four exact `@motionstudies/*` npm releases at `0.1.0-alpha.2`.

## Opening study

Fresh visits open the eight implemented lines: Métro 1, 4 and 14, plus RER A–E. Both additional layers are enabled in **Couches**, where either can be turned off. The 07:00–09:00 study starts at 08:00 with playback running in the regional view. The base can render while the independently fetched layers arrive; a failed layer can be retried without losing the base study.

The opening budget counts both enabled layers: 625 KiB gzip in total, with a separate 425 KiB ceiling for the base application and geography. Full-day manifests and chunks remain on demand behind **24H**.

## AIR

**AIR** adds observed aircraft from the same 4 September 2026 service day. It loads on demand, supports callsign and airport search (CDG, Orly and Le Bourget), aircraft follow and isolation, and shares both the morning and progressive 24-hour clocks. Positions are historical observations; airport associations are labelled as inferred. See the [AIR data and regeneration guide](docs/AIR.md).

## Development

Use Node 24 LTS (`nvm use`) and npm 11.19.0. Run `npm ci`, then `npm run dev`. `npm run build` stages only this edition's fixtures and builds the root entry point.

Validation: `npm run check:boundary`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle`, and `npm run test:e2e:ci` (after `npx playwright install chromium webkit`). The boundary check rejects workspaces, linked sources, non-registry dependencies and unsupported package exports.

## Hosting and data

GitHub Pages deployment is manual through **Deploy Pages**. The site is served at https://emmettl.github.io/correspondances/.

Data scripts preserve the explicit source dates and provenance from the original edition. CI uses the committed reviewed fixtures; refreshing source data is a separate deliberate operation.

## Extraction

Extracted from [Gleislicht 5c65186](https://github.com/emmettl/gleislicht/commit/5c6518647d5826b8d0e0f49e3fb3b6dd28b72ef5) using path-filtered Git fast export/import. Selected paths retain their Git history. The root entry point, local catalogue and build configuration are narrowed to this edition. Shared packages and the widget lab belong to [Motion Studies](https://github.com/emmettl/motionstudies).
