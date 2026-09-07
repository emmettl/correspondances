# Portes de l’Est — Métro 3 and 11

The third optional group adds Métro 3 from Pont de Levallois–Bécon to Gallieni and Métro 11 from Châtelet to Rosny–Bois-Perrier. It extends the study towards eastern Paris while retaining the whole of line 3, including its western terminus.

## Selection from the remaining lines

The pinned 4 September 2026 morning audit supports these candidate groups. Counts refer to scheduled journeys intersecting 07:00–09:00 and directional stop records, rather than passenger volumes or unique station complexes.

| Candidate | Morning journeys | Directional stops | Decision |
| --- | ---: | ---: | --- |
| Métro 3 and 11 | 261 | 88 | Selected: two complete routes towards the east, including the line 11 extension |
| Métro 8 and 9 | 270 | 150 | Later: more stops and central geometry to review together |
| Métro 12 and 13 | 289 | 127 | Later: another north–south group, with line 13 branches to verify |
| Métro 3bis and 7bis | 93 | 21 | Later: compact local routes for a closer-scale study |
| Métro 10 | 74 | 41 | Later: a smaller addition requiring its own directional-route review |

This selection follows the study's centre–periphery theme and keeps the added geometry bounded. The scope audit's older `metroRemainder` field still means the remainder after the original Métro 1/4/14 group; it is not the current implementation backlog. The new `metroEast` entry identifies routes `IDFM:C01373` and `IDFM:C01381` explicitly.

## Source and composition

Métro 3 contributes 133 morning journeys and 702 across the day. Métro 11 contributes 128 and 792 respectively. The pair retains 88 directional stops and 84 shaped segments. Its checks require both termini on each line, including Rosny–Bois-Perrier.

| Composition | Morning journeys | Day journeys | Active at 08:00 |
| --- | ---: | ---: | ---: |
| Default eight lines | 977 | 4,983 | 333 |
| Default plus Métro 3 and 11 | 1,238 | 6,477 | 389 |
| All three optional Métro groups, fourteen lines | 1,777 | 9,545 | 538 |

Movement is interpolated from published schedules. Transfer evidence remains scoped to the compiled pair, with no invented inter-line transfer times or passenger-flow claims.

## Runtime and payload gates

Enable **Couches → Portes de l’Est**. The new group uses the existing optional Métro loading hook with its own activation, cache and retry state. The eight-line opening remains the default and requests no eastern-layer data. Line and station search, isolation, Cœur/Région framing and playback use the composed network.

The day uses twelve two-hour chunks covering 00:00–24:00, fetching the current chunk before neighbours. Either clock window can be entered first; the morning artifact loads only when needed. A failed or mismatched source excludes this layer while leaving the base usable, and cancellation prevents a late morning response from re-enabling it.

| Payload | Measured gzip | Gate |
| --- | ---: | ---: |
| Métro 3/11 morning | 47.8 KiB | 64 KiB |
| Métro 3/11 day manifest | 9.8 KiB | 16 KiB |
| Largest Métro 3/11 two-hour chunk | 40.4 KiB | 52 KiB |
| Default eight-line opening | 592.4 KiB | 625 KiB |
| Fourteen-line initial composition after activation | 757.8 KiB | 820 KiB |

Existing base, opening, ten-line and twelve-line limits remain enforced. The new checks verify source identity and licence, audited route IDs and counts, termini, full-day chunk coverage and SHA-256, stop/path indices, all 1,494 unique day journeys and the combined fourteen-line totals.

## Reproduce

Run `npm run data:paris:metro-east` with the pinned archive at `/tmp/IDFM-gtfs-current.zip`. The required SHA-256 is `c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18`; a different archive is rejected. The service day is 4 September 2026, with the original retrieval time of 6 September 2026 at 11:41:37 UTC.

The source is Île-de-France Mobilités' GTFS archive under Licence Mobilité. Publisher, source and licence URLs, digest, geometry method and published transfer evidence remain embedded in the morning artifact and manifest. CI uses the committed fixtures without refreshing source data.

Run `npm run build` and `npm run check:bundle`. For fourteen-line frame timings, start the preview server on port 4178, then run `npm run profile:frames -- --channel chrome --metro-arcs --metro-crossings --metro-east --output paris-fourteen-frames.json`. The three layer flags can also be used independently; use `--channel msedge` on Windows.

## Visual and frame review

The production fourteen-line composition was reviewed at 1440 × 1000 in Chromium and in the iPhone 13 WebKit viewport, at both Région and Cœur scales. The lifted olive and brown route colours remain visible through the centre and towards the east. Châtelet, Gare du Nord and the Seine retain their orientation role. The layer menu fits five rail controls in three rows, with AIR isolation filling the sixth cell when enabled. Existing camera framing and label limits remain suitable for this expansion.

On 7 September 2026, Chrome 152 on an Apple M4 Max was sampled at 1920 × 1080 with 1.5 DPR, playback active and all three optional Métro groups enabled. Each scenario ran for three seconds.

| Scenario | Mean fps | Frame p95 | Frames over 25 ms |
| --- | ---: | ---: | ---: |
| Fourteen-line regional view | 60 | 17.2 ms | 0 / 180 |
| Open search | 59.98 | 17.2 ms | 0 / 180 |
| Selected journey, closed search | 60 | 17.1 ms | 0 / 181 |
| Région → Cœur | 60 | 17.2 ms | 0 / 181 |
| Settled Cœur | 60 | 17.7 ms | 0 / 181 |
| Cœur → Région | 60 | 17.6 ms | 0 / 180 |

These local desktop samples establish no Windows Edge or physical-phone frame-rate claim. Build, typecheck, lint, five unit tests, boundary and payload checks passed. Browser coverage passed 83 cases across desktop Chromium and iPhone WebKit: 79 on the full run, plus four source-date cases on a targeted rerun after correcting an assertion that expected a journey total where the UI shows the failure message. One phone-only test was skipped on desktop. Coverage includes independent loading and retry, cancellation, all three groups through both clock windows, and menu bounds with AIR enabled.

## Next

The [complete-network expansion](METRO-COMPLETE.md) now includes the final seven Métro lines. All 16 Métro lines and RER A–E are available on demand for the pinned service day. Transilien, tram and operational rail variation remain separate later scope decisions.
