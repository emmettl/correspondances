# Paris rendering and performance

This ports the relevant September 8 improvements from All Change and Gleislicht
onto the pinned `@motionstudies/three@0.1.0-alpha.5` renderer. The existing Paris
scale adapter runs first, followed by the performance and cartography adapters.
Installed packages remain untouched; checked hooks and composition tests guard
package upgrades.

## Changes

- Cache numeric label collators and use binary stop lookup for chronological
  schedules. Unusual timetables retain the shared package's linear fallback.
- Build the active-train counter once per selection, with two binary searches
  per clock report. Paris's route/station filters and inclusive arrival and
  departure instants are preserved.
- Upload only populated marker/trail buffer prefixes. Skip inactive trail
  candidates before sampling and avoid temporary colour arrays.
- Adapt decorative trail updates from 30 to 15 Hz under sustained load, leaving
  alternate frames free even below 15 FPS. Overview clock reports reduce from
  10 to 5 Hz; moving markers remain per-frame and focused trains keep their
  existing report cadence. Recovery requires sustained smooth frames.
- Reuse paused marker/trail buffers. Seeks, selections, palettes, data,
  projected geometry and bus/tram zoom visibility invalidate them. Paused seeks
  bypass the trail cadence; centre/region morphs continue updating geometry.
- Reuse settled station layouts. Camera/projection, viewport, selection,
  retention, visibility and Paris spatial-layout changes invalidate them.
- Search all train-label candidates at most every 100 ms while the camera and
  inputs are stable; displayed labels still move and check collisions every
  frame. Paused labels do no work until an input changes.
- Deduplicate exact and reversed map segments, preserving distinct nearby
  tracks. Normal blending and fixed painter order keep crossings from losing
  strokes or accumulating light. Static buffers still participate in the
  existing Paris geographic/heart morph.
- Reserve visible station-label rectangles before laying out train labels;
  anchor mission labels beside their markers and retain selected-label
  priority. Label textures include their colour in the cache key so they
  follow the centre/region palette.
- Reuse aircraft transforms and avoid invisible hit-sphere draws/uploads while
  retaining CPU raycasting. Render flat Métro arc ribbons in one pass.

Source review: All Change `8594786`, `17197e0`, `b5fdf86`, `ff11612`, `f63adb3`;
Gleislicht `e9fc934`, `a9f80cc`, `cd2c4f4`, `49dfaad`, `0cbe149`. Both repositories
were fetched and reviewed at their latest main heads (`b32d29e` and `85d304b`).
Road/bus-specific sampling and hub batching have no corresponding Paris layer.
Gleislicht's worker transport is not carried over: Paris changes projected
geometry throughout its morph, and the bounded main-thread sampler avoids
serializing and resetting a worker during that transition. It remains a
separate potential improvement to evaluate with Paris-specific measurements.

## Verification

Local validation passed: 44 unit tests, 228 browser tests across desktop
Chromium and iPhone WebKit (two phone-only tests skipped on desktop),
typechecking, lint, the production build, architecture checks and all bundle
budgets. The complete browser suite took 7.9 minutes with no retries.

Differential tests run the installed station/train label callbacks using real
Three sprites and camera matrices, stubbing React lifecycle and text drawing.
They compare rendered labels through movement, zoom, resizing, selection,
seeking, hidden states and layout changes, and verify reduced search/layout
work. Additional tests compare Paris timetable positions/counts at exact stop
boundaries and backwards seeks, check buffer update ranges, preserve distinct
map segments and cover adaptive budget entry/recovery.

Browser regressions instrument WebGL directly to verify paused uploads stop,
seeks and selection rebuild buffers, centre/region transitions settle correctly,
playback resumes, and AIR has no zero-opacity draw submissions. Existing
Chromium and iPhone WebKit tests cover all optional layers, progressive day
loading, selection, airports and the Paris heart.

## Exploratory measurement

[Raw before/after report](performance/2026-09-09.json), baseline `15074b2`.
Both runs used local Vite development builds, Chromium 151, headless SwiftShader,
1280 × 720, DPR 1, and 2.5-second samples after settling. No browser tests ran
concurrently. This is one exploratory pair with live playback, not repeated
fixed-time trials or a prediction for a particular laptop.

| Scenario | Script time per sample, ms | Mean FPS |
| --- | ---: | ---: |
| opening | 310.86 → 267.04 | 29.00 → 29.21 |
| search-open | 322.43 → 262.06 | 28.43 → 29.60 |
| selected-search-closed | 297.38 → 248.29 | 28.61 → 30.01 |
| to-centre | 1046.23 → 1056.51 | 18.80 → 20.27 |
| centre | 332.16 → 256.63 | 29.21 → 30.20 |
| to-region | 1052.38 → 1068.35 | 19.60 → 20.27 |

Settled scenarios used roughly 14–23% less script time in this pair. The
software renderer stayed near 30 FPS. Transition script cost did not improve;
the morph still performs substantial per-frame projection and geometry work.
The deterministic evidence is the reduction in repeated searches and buffer
uploads, rather than a general FPS guarantee.

Reproduce with a local server and:

```sh
npm run profile:frames -- --headless --duration 2500 --width 1280 --height 720 --dpr 1 --output /tmp/paris-profile.json
```

For dense-layer investigation add `--all-metro --transilien --tram-marechaux`.
