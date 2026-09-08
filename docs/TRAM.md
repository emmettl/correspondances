# Tram des Maréchaux — T3a / T3b

**Couches → Tram des Maréchaux** adds the first optional tram pair to the pinned 4 September 2026 study. T3a runs between Pont du Garigliano and Porte de Vincennes; T3b runs between Porte de Vincennes and Porte Dauphine (Avenue Foch). Their published paths trace the city's edge, giving Cœur another scale of movement around the inner Métro. The two routes retain their distinct termini and the western gap; this layer does not draw a closed loop.

The default eight-line opening is retained. Tram services load only when requested, with independent cancellation and retry, line and station search, route isolation, and the shared morning / progressive 24-hour clock. Selecting a tram route or station retains Cœur or Région. Disabling the group clears its selection and removes its services.

## Source and scope review

The compiler uses the existing IDFM GTFS archive, SHA-256 `c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18`, retrieved 6 September 2026 at 11:41:37 UTC. The service date remains 4 September. No source refresh is involved. Licence Mobilité, the dataset/source URLs, retrieval date and geometry method are recorded in the fixtures. The tram compiler rejects missing published shapes.

The independent [morning audit](../fixtures/idfm/correspondances-tram-audit.json) and [day audit](../fixtures/idfm/correspondances-tram-day-audit.json) select GTFS type 0 routes with T-number names. They identify 15 lines, including the feed's tram-train services: 922 morning and 5,326 full-day journeys. ORLYVAL and CDG VAL are excluded from that tram selection. The audit preserves the archive's identifiers and naming rather than making a claim about today's operating network.

T3a/T3b are the first group because their compact, connected geography is useful in both existing map scales. The other 13 audited lines remain outside the runtime study pending their own grouping and density reviews.

| Line | IDFM route | Morning / full-day journeys | Published termini |
| --- | --- | ---: | --- |
| T3a | C01391 | 84 / 460 | Pont du Garigliano ↔ Porte de Vincennes |
| T3b | C01679 | 90 / 481 | Porte de Vincennes ↔ Porte Dauphine (Avenue Foch) |

The compiled pair has 116 source stop records and 115 shaped segments. Stop records distinguish source platforms/directions; this is not a count of unique station names. Source colours are orange `#FF5A00` and green `#00643C`, lifted locally for the dark map. All movement is interpolated from schedules. Transfer evidence remains scoped to each compiled layer; no new inter-layer transfer times are inferred.

Full-day playback covers the active service date within 00:00–24:00. The pair's first two chunks are empty in this archive. These are empty study intervals, not evidence that no tram could operate then under a preceding service date.

## Payload and composition

Measurements use Node 24.20.0, gzip level 9.

| Artifact | Compressed size | Gate |
| --- | ---: | ---: |
| Morning | 38.2 KiB | 48 KiB |
| Day manifest | 11.4 KiB | 16 KiB |
| Largest two-hour chunk | 28.8 KiB | 36 KiB |

The pair adds 174 morning journeys, 941 full-day journeys and 57 active trams at 08:00. With the opening network it gives 1,151 morning / 5,924 daily journeys and 390 moving vehicles at 08:00. With all Métro and Transilien groups it gives 32 lines, 3,141 morning / 17,088 daily journeys and 917 moving vehicles at 08:00, without duplicate journey IDs.

The default opening is 599.7 KiB against its unchanged 625 KiB gate. The complete optional 32-line composition is 1,132.4 KiB against a 1,250 KiB gate. AIR remains separately optional. In 24H, enabling trams loads the manifest and current chunk before neighbours and does not request the morning fixture.

## Reproduce and validate

With the pinned archive at `/tmp/IDFM-gtfs-current.zip`:

```sh
npm run data:paris:audit:tram
npm run data:paris:audit:tram:day
npm run data:paris:tram-marechaux
npm run build
npm run check:bundle
npm run test:e2e:ci
```

The source gate compares per-line counts with both independent audits, checks provenance, termini, indices, chunk hashes and coverage, and composes the pair with all existing rail groups. Browser coverage exercises optional loading, search, removal, morning/day switching, bounded chunk requests, failures and retries, provenance mismatch, cancellation and an empty night interval.

For production frame measurements, serve a build and run:

```sh
npm run profile:frames -- --url http://127.0.0.1:4187 --headless --angle metal --all-metro --transilien --tram-marechaux --width 1440 --height 1000 --dpr 1 --duration 3000 --output /tmp/paris-tram-frames.json
```

CI uses the committed reviewed fixtures; it does not refresh source data. Pushes to `main` deploy automatically after the existing checks pass.


## Visual review — 8 September 2026

The pair with the opening eight-line study and with all 32 lines was reviewed at 1280 × 720 in desktop Chromium and the iPhone 13 WebKit viewport, in both Région and Cœur. Région retains the regional branches and airport landmarks; trams join the dense central cluster. In Cœur their paths run around the outer edge of the enlarged inner city, while the Seine and major hubs remain readable. The complete mobile composition is dense and benefits from route selection or zoom. The layer menu scrolls within the space below search, including with a populated query on 1280 × 640 desktop and 390 × 664 phone viewports. Search results also scroll above the bottom controls. Opening the layer menu closes search results; focusing search closes the menu. No new global label tier is added; station and route selection use the existing priority rules.

Airport boards were reviewed in both viewports with playback paused for settled captures. Clock seeks update the visible movement window and rows; Le Bourget's empty 08:40–09:00 arrivals window uses the split-flap message and returns to populated rows when seeking earlier. Narrow boards scroll horizontally, and the bounded card scrolls vertically to preserve access to the map controls and playback bar.


## Frame review

Production Chromium 151 with ANGLE Metal on Apple M4 Max was sampled at 1440 × 1000, DPR 1, for three seconds per scenario with playback running. The same build was measured with all 30 existing rail lines and with T3a/T3b added. These are single local headless runs, not a physical-phone or Windows benchmark.

| Scenario | 30 lines: frame p95 | 32 lines: frame p95 | 32 lines: frames over 25 ms |
| --- | ---: | ---: | ---: |
| Région | 27.1 ms | 25.7 ms | 6.3% |
| Open search | 17.4 ms | 27.2 ms | 16.5% |
| Selected route, closed search | 16.7 ms | 27.1 ms | 10.5% |
| Région → Cœur | 16.7 ms | 16.7 ms | 3.3% |
| Settled Cœur | 16.8 ms | 16.6 ms | 2.9% |
| Cœur → Région | 17.0 ms | 25.6 ms | 5.0% |

Cœur p95 remained near 16.7 ms in both runs. The 32-line regional/search scenarios showed more uneven callback pacing, with p95 up to 27.2 ms; this review does not establish stable 60 fps. No sampled callback interval exceeded 30 ms. The source/payload and functional gates pass, and the group remains optional. A physical-device performance review remains useful before expanding the tram scope further.

## Validation result

All 223 applicable browser cases were verified on Chromium and iPhone WebKit; the iPhone-only layout gate is intentionally skipped on desktop. The complete run passed 220 cases. The final three passed on rerun after updating the two menu-count expectations from 13 to 14 controls and retrying one WebKit page-navigation timeout. The new short-screen checks exercise both ends of the scrolling menu with normal clicks.

The 15 unit tests, typecheck, lint, dependency boundary check, production build and all source/payload gates passed under Node 24.20.0. Production tram artifacts were compared with the regenerated fixtures. No shared package versions changed.
