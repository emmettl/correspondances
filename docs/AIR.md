# Paris AIR

AIR is an optional historical observation layer above the eight-line Paris railway study. The morning uses **07:00–09:00 CEST on 4 September 2026**, exactly matching the IDFM study. It contains 501 filtered flight segments. The full civil day indexes 4,385 segments in twelve independently loaded two-hour chunks; these are flight segments, not a count of unique aircraft.

The AIR button enables observed aircraft and short trails. Search accepts a callsign or ICAO address; selecting an aircraft moves the shared clock into its observed interval and follows it, with altitude and groundspeed shown. CDG, Orly and Le Bourget can be found by name or code. Selecting an airport enables AIR and focuses its approach envelope. **Couches → Isoler AIR** attenuates the railway; a rail selection or Escape releases aircraft selection. **24H** keeps aircraft and trains on the same Paris service clock.

## Evidence and limits

- Positions come from [ADSB.lol historical observations](https://www.adsb.lol/docs/open-data/historical/), under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The source releases are `v2026.09.03-planes-readsb-prod-0` and `v2026.09.04-planes-readsb-prod-0` in [globe_history_2026](https://github.com/adsblol/globe_history_2026/releases). The preceding UTC evening supplies the start of the local civil day.
- Every artifact records the service date, Europe/Paris timezone, UTC offset, bounding box, filter model and SHA-256 of all 48 input slices. Morning and day data use the same source and filter policy.
- The crop is 1.5–3.4° E and 48.3–49.35° N. Ground, non-ICAO and slow or low-altitude noise are excluded. Segments need at least four source observations and transport-scale speed/altitude evidence. A callsign change or gap over 30 minutes starts a new segment. This is a filtered observation study, not complete airport traffic or live tracking.
- The shared renderer interpolates source samples at their approximately ten-second cadence, refuses to bridge gaps longer than 45 seconds, and compresses altitude visually. The interface labels the replay as observed and dated.
- Airport names, identifiers and coordinates were checked against [airport-codes](https://github.com/datasets/airport-codes/tree/65bda4e72292b5dff346313429b9d5aaf218d357), sourced from OurAirports, on 7 September 2026. The small edition catalogue retains those coordinates; `fixtures/adsb/airport-source.json` records the source revision, CSV hash and selected source rows. An airport association means a sample was within 12 km and at or below 6,000 ft: it is explicitly labelled an inferred approach-envelope association, not a confirmed origin or destination. The CDG and Le Bourget envelopes can overlap.

## Regeneration

Extract the 48 dated `heatmap/*.bin.ttf` slices from the two source releases into a temporary directory: 44–47 on 3 September, then 00–43 on 4 September. Keep filenames in `YYYY-MM-DD-NN.bin.ttf` form. Raw global source files stay outside the repository.

```sh
npm run data:paris:air -- --input-directory /path/to/dated-slices \
  --service-date 2026-09-04 --utc-offset 2 \
  --window-start 07:00 --window-end 09:00 \
  --output fixtures/adsb/correspondances-air-morning.json

npm run data:paris:air -- --input-directory /path/to/dated-slices \
  --service-date 2026-09-04 --utc-offset 2 \
  --window-start 00:00 --window-end 24:00 --chunk-hours 2 \
  --output fixtures/adsb/correspondances-air-day-manifest.json

npm run build
npm run check:bundle
```

The Paris compiler adapts the [existing Gleislicht decoder](https://github.com/emmettl/gleislicht/blob/fbe710187f1163bf5bd591f1846ddff39473abc4/scripts/ingest-adsb-heatmap.mjs) with Paris bounds, source-file hashes and consistent segment identities. Source-specific compilation and fixtures belong here; rendering, search, airport geometry and progressive loading use the existing published Motion Studies packages.

## Budgets and failure behaviour

AIR data is absent from the initial request graph. The eight-line rail opening is about 589 KiB gzip, below its existing 625 KiB ceiling. The AIR morning is about 321 KiB (350 KiB limit); the day manifest is about 88 KiB (110 KiB limit), with a largest two-hour chunk around 371 KiB (420 KiB limit). The complete day chunks total about 2.82 MiB and are never fetched together. The current chunk loads first, followed by its neighbours; each carries a three-minute leading overlap and 45-second look-ahead.

`check:bundle` checks source/date/coverage contracts, finite ordered samples, per-chunk bytes and SHA-256, manifest identities, and separate transfer budgets. Hashes are verified at build time. Morning fetch cancellation prevents a late response from re-enabling AIR after it is hidden. A failed layer leaves the railway usable and presents **Réessayer AIR**. The browser suite exercises the opening request graph, aircraft and airport selection, rail restoration, progressive loading and failure recovery on desktop Chromium and iPhone WebKit.
