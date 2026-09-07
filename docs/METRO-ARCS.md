# Arcs du Métro — Métro 2 and 6

The first expansion after the eight-line density review adds two complementary arcs around the centre. Métro 2 runs from Porte Dauphine to Nation through the north; Métro 6 runs from Charles de Gaulle–Étoile to Nation through the south. They add a circumferential reading to the existing east–west and north–south crossings.

The source-pinned audit counts 121 Métro 2 and 127 Métro 6 journeys in the morning. The pair adds 248 journeys to the 977-journey baseline, with 64 additional vehicles active at 08:00: 397 across ten lines. The artifact retains 106 directional stop records and 104 shaped segments.

## Runtime and density gate

- The eight-line opening remains the default. No Métro-arcs data is requested before activation in **Couches → Arcs du Métro**.
- The optional layer supports line, station and mission search, isolation, the Cœur/Région transition and the shared playback clock.
- Morning failures, failed day manifests or chunks, and source-date mismatches exclude the arcs while leaving the base network usable. The layer control offers retry.
- The day uses an independent manifest and twelve two-hour chunks, fetching the current chunk before neighbours. Returning to 2H loads its morning artifact on demand.
- The source transfer evidence remains scoped to the compiled line pair. No passenger-flow claims or additional inter-line transfer times have been invented.

| Payload | Measured gzip | Gate |
| --- | ---: | ---: |
| Morning layer | 52.7 KiB | 64 KiB |
| Day manifest | 10.3 KiB | 16 KiB |
| Largest two-hour chunk | 47.7 KiB | 52 KiB |
| Ten-line initial composition after activation | 644.7 KiB | 680 KiB |

The eight-line opening remains below its separate 625 KiB gate. Checks compare source identity with the base study, verify route IDs against the audit, count all 1,495 unique day journeys, validate each chunk's SHA-256 and indices, and compose the ten-line network to check its totals.

## Reproduce the fixtures

Run `npm run data:paris:metro-arcs` with the pinned archive at `/tmp/IDFM-gtfs-current.zip`. This compiles the full day, then extracts the 07:00–09:00 opening and twelve two-hour chunks. It requires SHA-256 `c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18`; a current archive with a different digest is rejected. The artifact records the original retrieval time, 6 September 2026 at 11:41:37 UTC, and service day, 4 September 2026.

The source is Île-de-France Mobilités' GTFS archive under Licence Mobilité. Publisher, archive URL, source digest, licence URL, geometry method and published transfer evidence remain embedded in both the morning artifact and day manifest. CI uses committed fixtures and does not refresh the archive.

Run `npm run check:bundle` after building. To capture the ten-line frame timings, run `npm run profile:frames -- --channel chrome --metro-arcs --output paris-arcs-frames.json` against the preview server; use `--channel msedge` on Windows.

## Visual review

The production ten-line composition was reviewed at 1440 × 1000 in Chromium and in the iPhone 13 WebKit viewport. The blue northern and green southern arcs remain distinct in Cœur, while Châtelet, Gare du Nord, Nation and the Seine keep the centre readable. The two-row Couches menu fits the phone viewport, and the new layer can be removed to restore the eight-line baseline. Existing close-zoom label limits remain sufficient for this tranche.

## Frame review

On 7 September 2026, production Chrome 152 on an Apple M4 Max was sampled at 1920 × 1080 with 1.5 DPR and all ten lines enabled. Each scenario ran for three seconds with playback active.

| Scenario | Mean fps | Frame p95 | Frames over 25 ms |
| --- | ---: | ---: | ---: |
| Ten-line regional view | 59.98 | 17.5 ms | 0 / 180 |
| Région → Cœur | 60.0 | 17.6 ms | 0 / 180 |
| Settled Cœur | 60.0 | 17.6 ms | 0 / 180 |
| Cœur → Région | 60.0 | 17.6 ms | 0 / 180 |

These local measurements establish no frame-rate claim for Windows Edge or physical phones.

## Next

The second optional group, [Métro 5 and 7](METRO-CROSSINGS.md), extends the study to twelve lines with both layers enabled. The third group, [Métro 3 and 11](METRO-EAST.md), brings the optional composition to fourteen lines. Seven Métro lines remain outside the runtime; assess the next bounded group against the same payload, visual and frame gates.
