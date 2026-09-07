# Traversées du Métro — Métro 5 and 7

This second optional group adds two crossings between the north-eastern suburbs and southern Paris. Métro 5 links Bobigny–Pablo Picasso to Place d'Italie through Gare du Nord and Bastille. Métro 7 runs from La Courneuve–8 Mai 1945 through the centre, retaining both southern branches to Villejuif–Louis Aragon and Mairie d'Ivry. Together they complement the optional Métro 2 and 6 arcs with further centre–periphery journeys.

## Source and composition

The pinned audit identifies routes `IDFM:C01375` and `IDFM:C01377`. Métro 5 contributes 136 morning journeys and 786 across the day; Métro 7 contributes 155 and 787 respectively. The pair retains 120 directional stop records and 116 shaped segments.

| Composition | Morning journeys | Day journeys | Active at 08:00 |
| --- | ---: | ---: | ---: |
| Default eight lines | 977 | 4,983 | 333 |
| Eight lines plus Métro 5 and 7 | 1,268 | 6,556 | 418 |
| Both optional Métro groups, twelve lines | 1,516 | 8,051 | 482 |

These are scheduled vehicle journeys, with movement interpolated from the timetable. Published transfer evidence remains scoped to the compiled pair; no passenger flows or additional inter-line transfer times are inferred.

## Runtime and payload gates

Enable **Couches → Traversées du Métro**. The default eight-line opening makes no request for this pair. Both optional Métro groups use the same loading hook with separate activation, caches and retry state. Either group can be removed while the other remains active, including across 2H/24H changes. Search, isolation and Cœur/Région framing use the composed network.

Morning failures, day manifest or chunk failures, and mismatched source dates exclude the affected layer and offer retry. Cancelling a pending morning request cannot add the layer later. Full-day playback loads the current two-hour chunk before its neighbours, from twelve chunks covering 00:00–24:00.

| Payload | Measured gzip | Gate |
| --- | ---: | ---: |
| Métro 5/7 morning | 64.8 KiB | 80 KiB |
| Métro 5/7 day manifest | 11.2 KiB | 16 KiB |
| Largest Métro 5/7 two-hour chunk | 58.7 KiB | 64 KiB |
| Default eight-line opening | 592.2 KiB | 625 KiB |
| Twelve-line initial composition after activation | 709.8 KiB | 750 KiB |

The checks validate source identity, licence, audited route IDs, both Métro 7 southern destinations, chunk coverage and SHA-256, stop/path indices and all 1,573 unique day journeys. They also compose all twelve lines and check the morning and active-vehicle totals.

## Reproduce

Run `npm run data:paris:metro-crossings` with the pinned archive at `/tmp/IDFM-gtfs-current.zip`. The compiler requires SHA-256 `c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18` and rejects a replacement archive with a different digest. The service day is 4 September 2026, with the original retrieval time of 6 September 2026 at 11:41:37 UTC.

The source is Île-de-France Mobilités' GTFS archive under Licence Mobilité. Publisher, archive and licence URLs, digest, geometry method and transfer evidence remain embedded in the morning artifact and manifest. CI uses the committed fixtures without refreshing the source.

Run `npm run build` and `npm run check:bundle`. For twelve-line frame timings, start the preview server on port 4178 and run `npm run profile:frames -- --channel chrome --metro-arcs --metro-crossings --output paris-twelve-frames.json`; use `--channel msedge` on Windows.

## Visual and frame review

The production twelve-line composition was reviewed in Chromium at 1440 × 1000 and in the iPhone 13 WebKit viewport. Orange Métro 5 and pink Métro 7 remain traceable through the centre. Station names lead the composition, with Châtelet and Gare du Nord prominent; the Seine and the optional arcs retain their context. The four rail layer controls fit the phone menu in two rows. Existing label limits and framing remain suitable for this group.

On 7 September 2026, Chrome 152 on an Apple M4 Max was sampled at 1920 × 1080 with 1.5 DPR, playback active and both optional Métro groups enabled. Each scenario ran for three seconds.

| Scenario | Mean fps | Frame p95 | Frames over 25 ms |
| --- | ---: | ---: | ---: |
| Twelve-line regional view | 60.0 | 17.6 ms | 0 / 180 |
| Open search | 60.0 | 17.6 ms | 0 / 181 |
| Selected journey, closed search | 60.0 | 17.6 ms | 0 / 181 |
| Région → Cœur | 59.98 | 17.6 ms | 0 / 180 |
| Settled Cœur | 60.0 | 17.6 ms | 0 / 180 |
| Cœur → Région | 60.0 | 17.6 ms | 0 / 181 |

These measurements apply to this local desktop; they establish no Windows Edge or physical-phone frame-rate claim. Build, typecheck, lint, five unit tests, boundary and payload checks passed. The desktop Chromium and iPhone WebKit browser suite passed 65 tests, with one phone-only test skipped on desktop, including independent failure/retry, cancellation and combined day/morning coverage.

## Next

The [complete-network expansion](METRO-COMPLETE.md) now includes the final seven Métro lines. All 16 Métro lines and RER A–E are available on demand for the pinned service day. Transilien, tram and operational rail variation remain separate later scope decisions.
