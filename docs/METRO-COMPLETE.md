# Complete Métro and RER coverage

All 16 Métro lines and RER A–E are now available for the pinned 4 September 2026 service day. The final seven Métro lines join through three independently loaded groups in **Couches**. The eight-line opening remains the default.

| Layer | Lines | Morning journeys | Full-day journeys | Active at 08:00 |
| --- | --- | ---: | ---: | ---: |
| Grands boulevards | Métro 8 / 9 | 270 | 1,416 | 90 |
| Axes de l’Ouest | Métro 12 / 13 | 289 | 1,617 | 80 |
| Boucles et liaisons | Métro 3bis / 7bis / 10 | 167 | 1,300 | 18 |
| Complete Métro/RER composition | 21 lines | 2,503 | 13,878 | 726 |

The three new groups add 726 morning journeys and 4,333 across the day. These are scheduled vehicle journeys, with movement interpolated from GTFS, rather than passenger volumes or live operating conditions.

## Source fidelity

| Line | IDFM route | Morning / day journeys |
| --- | --- | ---: |
| Métro 8 | C01378 | 119 / 652 |
| Métro 9 | C01379 | 151 / 764 |
| Métro 12 | C01382 | 117 / 703 |
| Métro 13 | C01383 | 172 / 914 |
| Métro 3bis | C01386 | 43 / 395 |
| Métro 7bis | C01387 | 50 / 388 |
| Métro 10 | C01380 | 74 / 517 |

The source's `3B` and `7B` labels are displayed as `3bis` and `7bis`; route IDs remain unchanged. All audited route IDs are represented, and the complete morning count matches the independent scope audit with no duplicate journeys. The audit's older `metroRemainder` field describes the remainder after the original Métro 1/4/14 group, not the current backlog.

The new fixtures preserve these source details:

- Métro 13 retains both northern branches to Asnières–Gennevilliers–Les Courtilles and Saint-Denis–Université, plus Châtillon–Montrouge.
- Métro 7bis runs through Danube towards Louis Blanc and Place des Fêtes towards Pré-Saint-Gervais. Tests require the appropriate stop and exclude the opposite branch from each direction.
- Métro 10 uses Michel-Ange–Auteuil towards Boulogne and Michel-Ange–Molitor towards Gare d'Austerlitz. Morning departures beginning at Porte d'Auteuil remain present.
- Métro 8's full day retains short journeys terminating at Maisons-Alfort–Les Juilliottes as well as its end-to-end journeys.

Grands boulevards retains 150 directional stops and 146 shaped segments; Axes de l’Ouest retains 127 and 123; Boucles et liaisons retains 62 and 57. Transfer evidence stays scoped to each compiled group. No additional inter-line transfer times are inferred.

## Loading and payload gates

Each group uses the existing optional Métro loading hook with separate activation, caching, cancellation and retry state. Morning data is requested only on activation in 2H. In 24H, each group loads its manifest and current two-hour chunk before neighbouring chunks; all twelve chunks cover 00:00–24:00. Groups can be added directly in either clock window, removed independently, and restored after a failed request. Source-date and digest checks guard composition with the pinned study.

| Layer | Morning gzip / gate | Manifest gzip / gate | Largest chunk gzip / gate |
| --- | ---: | ---: | ---: |
| Grands boulevards | 80.0 / 96 KiB | 13.3 / 16 KiB | 70.6 / 96 KiB |
| Axes de l’Ouest | 68.1 / 96 KiB | 13.3 / 16 KiB | 57.5 / 96 KiB |
| Boucles et liaisons | 21.6 / 64 KiB | 6.9 / 16 KiB | 16.4 / 52 KiB |

The complete initial rail composition is 928.5 KiB gzip against a 1,024 KiB ceiling. The default eight-line opening remains 593.5 KiB against its 625 KiB limit. Existing base, ten-line and fourteen-line gates also remain enforced. AIR has its separate on-demand budget and is not included in these rail totals.

The checks validate source identity, licence, audited route IDs, morning/day counts, chunk coverage and SHA-256, indices, line 13 branches, and directional stops on 7bis/10. The complete network browser case crosses early morning, evening and late-night chunks, removes each new group and returns to the morning window.

## Reproduce

Use the pinned archive at `/tmp/IDFM-gtfs-current.zip` and run:

```sh
npm run data:paris:metro-boulevards
npm run data:paris:metro-west
npm run data:paris:metro-local
npm run build
npm run check:bundle
```

All three commands require SHA-256 `c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18` and reject another archive. They retain the original retrieval time, 6 September 2026 at 11:41:37 UTC, and service day, 4 September 2026. The source is Île-de-France Mobilités' GTFS archive under Licence Mobilité; provenance, source/licence URLs and geometry method remain embedded in the artifacts. CI uses committed fixtures without refreshing the source.

For the complete frame review, start the production preview on port 4178 and run `npm run profile:frames -- --channel chrome --all-metro --output paris-complete-frames.json`. Individual group flags remain available. Use `--channel msedge` to collect Windows measurements.

## Visual review and validation

The complete network was reviewed in Région and Cœur at 1440 × 1000 in Chromium and in the iPhone 13 WebKit viewport. The station hierarchy from `cd22f5f` is included. Major hubs and the Seine retain their orientation role, with local names appearing at closer scales. The full network is denser, while route isolation and optional groups remain available for inspecting individual lines.

The layer menu now has eight rail controls and an AIR isolation control. It fits the regular phone viewport and scrolls within a bounded height on short screens. The desktop route list wraps within its own space beside the title.

Build, typecheck, lint, nine unit tests, boundary and payload checks passed. The integrated browser suite passed 125 tests across desktop Chromium and iPhone WebKit, with one phone-only test skipped on desktop. This includes loading, cancellation, failures and retries for every new group, all seven lines in search, complete-network playback across the day, removal of each new group, the station-label behavior and menu scrolling.

## Frame review

On 7 September 2026, Chrome 152 on an Apple M4 Max was sampled at 1920 × 1080 with 1.5 DPR, playback active and all six optional Métro groups enabled. Each scenario ran for three seconds.

| Scenario | Mean fps | Frame p95 | Frames over 25 ms |
| --- | ---: | ---: | ---: |
| Complete regional view | 60 | 17.6 ms | 0 / 180 |
| Open search | 60 | 17.7 ms | 0 / 181 |
| Selected journey, closed search | 60 | 17.6 ms | 0 / 181 |
| Région → Cœur | 60 | 17.6 ms | 0 / 181 |
| Settled Cœur | 60 | 17.6 ms | 0 / 180 |
| Cœur → Région | 60 | 17.5 ms | 0 / 180 |

These measurements apply to this local desktop. They establish no Windows Edge or physical-phone frame-rate claim.

## Next scope

The Métro/RER coverage backlog is complete for this pinned service day. Transilien, tram and operational rail variation are separate next scope decisions, requiring their own source, payload and density reviews. GitHub Pages deployment remains manual.
