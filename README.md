# Correspondances

**[Open Correspondances](https://emmettl.github.io/correspondances/)** · [Motion Studies catalogue](https://emmettl.github.io/motionstudies/)

[Study brief](https://github.com/emmettl/motionstudies/blob/main/docs/PARIS.md) · [Project goals](https://github.com/emmettl/motionstudies/blob/main/docs/VISION.md) · [Roadmap](https://github.com/emmettl/motionstudies/blob/main/ROADMAP.md)

An independent Motion Studies edition. This repository owns its application, style, authored fixtures, source-specific data compilers and browser/provenance checks. Shared code comes from the four exact `@motionstudies/*` npm releases at `0.1.0-alpha.5`.

## Opening study

Fresh visits open the eight implemented lines: Métro 1, 4 and 14, plus RER A–E. Both additional layers are enabled in **Couches**, where either can be turned off. The 07:00–09:00 study starts at 08:00 with playback running in the regional view. The base can render while the independently fetched layers arrive; a failed layer can be retried without losing the base study.

The opening budget counts both enabled layers: 625 KiB gzip in total, with a separate 425 KiB ceiling for the base application and geography. Full-day manifests and chunks remain on demand behind **24H**.

## Arcs du Métro

Enable **Arcs du Métro** in **Couches** to add Métro 2 and 6 around the centre. This optional pair brings the morning to ten lines and 1,225 scheduled journeys. Search either line to isolate it. The layer follows the same 24-hour clock with 1,495 journeys in twelve on-demand chunks; it can be disabled or retried independently. See the [layer review and regeneration guide](docs/METRO-ARCS.md).

## Cœur / Région

**CŒUR** opens the inner city into a plan with variable scale while keeping its regional branches connected. The railway, Seine and périphérique move together; the same trains continue on the same clock. **RÉGION** restores geography. The heart's **Révéler les arcs** control adds Métro 2 and 6 directly, and rail search retains the chosen composition. AIR is shown in Région. See the [spatial treatment and renderer notes](docs/COEUR-REGION.md).

## Traversées du Métro

Enable **Traversées du Métro** in **Couches** to add Métro 5 and 7, including both southern branches of line 7. This pair adds 291 morning journeys and 1,573 across the full day. With **Arcs du Métro** also enabled, the study reaches twelve lines and 1,516 morning journeys. Both groups load and retry independently. See the [layer review and regeneration guide](docs/METRO-CROSSINGS.md).

## Portes de l’Est

Enable **Portes de l’Est** in **Couches** to add Métro 3 and 11, from Pont de Levallois–Bécon to Gallieni and from Châtelet to Rosny–Bois-Perrier. The pair adds 261 morning journeys and 1,494 across the day. With all three optional Métro groups enabled, the study reaches fourteen lines and 1,777 morning journeys. See the [selection, layer review and regeneration guide](docs/METRO-EAST.md).

## Complete Métro network

All 16 Métro lines and RER A–E are available. The final seven lines are optional in **Couches**:

- **Grands boulevards** — Métro 8 and 9.
- **Axes de l’Ouest** — Métro 12 and 13, including both northern branches.
- **Boucles et liaisons** — Métro 3bis, 7bis and 10, retaining their directional routes.

With all six optional Métro groups enabled, the study contains 2,503 morning journeys and 13,878 across the full day. Each group loads and retries independently. See the [complete-network review and regeneration guide](docs/METRO-COMPLETE.md).

## Transilien

Enable the four optional Transilien groups in **Couches** to add all nine conventional Transilien rail lines from the pinned service day:

- **Nord** — H and K.
- **Saint-Lazare** — J and L.
- **Sud-ouest** — N, U and V.
- **Est et sud-est** — P and R.

They add 464 morning journeys and 2,269 across the day, preserving the outer branches and the U/V links between suburbs. Every group has independent loading, cancellation and retry, line/station/mission search, and progressive **24H** playback. With all Métro, RER and Transilien groups enabled, the study reaches 30 lines, 2,967 morning journeys and 16,147 full-day journeys. The default eight-line opening stays within its existing budget. See the [source, payload and density review](docs/TRANSILIEN.md).

## Tram des Maréchaux

Enable **Tram des Maréchaux** in **Couches** to add T3a and T3b around the city’s edge, retaining their separate termini and the western gap. This first optional tram group adds 174 morning journeys and 941 across the full day, with line/station search, isolation and independent loading/retry. All rail and tram groups together reach 32 lines and 3,141 morning / 17,088 full-day journeys. See the [tram source, payload and density review](docs/TRAM.md).

## AIR

CDG, Orly and Le Bourget appear as geographic landmarks in Région, including when AIR is off. **AIR** adds observed aircraft from the same 4 September 2026 service day. It loads on demand, supports callsign and airport search, aircraft follow and isolation, and shares both the morning and progressive 24-hour clocks. Positions are historical observations; airport associations are labelled as inferred. See the [AIR data and regeneration guide](docs/AIR.md).

## Development

Use Node 24 LTS (`nvm use`) and npm 11.19.0. Run `npm ci`, then `npm run dev`. `npm run build` stages only this edition's fixtures and builds the root entry point.

Validation: `npm run check:boundary`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle`, and `npm run test:e2e:ci` (after `npx playwright install chromium webkit`). The boundary check rejects workspaces, linked sources, non-registry dependencies and unsupported package exports.

## Frame profiling

Timetable search is cached independently of the playback clock, and closed search results do no search work. Aircraft ranking still follows the clock while results are open. This ports the applicable playback fix from All Change `c2f93fb`; its observed-rail projection and custom diagram fixes do not apply to this edition.

To capture frame timings on Windows 11 Edge, run `npm run build` and `npm run preview -- --host 127.0.0.1 --port 4178` in one terminal, then `npm run profile:frames -- --channel msedge --output paris-frames.json` in another. The report includes GPU, canvas resolution, frame percentiles, missed-frame percentages and main-thread timings for opening, open search, selected/closed search, the centre view and both scale transitions. Match `--width`, `--height`, `--dpr` and `--fps` to the affected display. Chrome is supported with `--channel chrome`; `--headless` is useful for smoke checks but does not establish desktop GPU performance.

## Next in the study

The [density review](docs/DENSITY.md) and [station-label hierarchy](docs/STATION-LABELS.md) guide the two map scales. The [complete-network review](docs/METRO-COMPLETE.md) closes the Métro/RER coverage backlog for the pinned service day. The [Transilien review](docs/TRANSILIEN.md) extends the region with nine optional rail lines. The [first tram review](docs/TRAM.md) adds T3a/T3b. Remaining tram groups and operational rail variation are the next scope decisions, each requiring a separate source and density review.

## Hosting and data

GitHub Pages deploys automatically on every push to `main`, after the reusable **Check Correspondances** job passes its browser, build, source and payload checks. Pull requests run the same checks without deploying. **Deploy Pages** also retains a manual trigger. The site is served at https://emmettl.github.io/correspondances/.

Data scripts preserve the explicit source dates and provenance from the original edition. CI uses the committed reviewed fixtures; refreshing source data is a separate deliberate operation.

## Extraction

Extracted from [Gleislicht 5c65186](https://github.com/emmettl/gleislicht/commit/5c6518647d5826b8d0e0f49e3fb3b6dd28b72ef5) using path-filtered Git fast export/import. Selected paths retain their Git history. The root entry point, local catalogue and build configuration are narrowed to this edition. Shared packages and the widget lab belong to [Motion Studies](https://github.com/emmettl/motionstudies).

## Standard selection labels

The shared `@motionstudies/three` alpha.5 renderer gives the selected station first label priority, then the selected route’s terminals (including branch endpoints), then intermediate stops. Selecting a service uses its own endpoints. Clearing selection restores normal station ranking. The rule applies to map clicks and search/picker selection in both geographic and diagram layouts. See the [Motion Studies edition contract](https://github.com/emmettl/motionstudies/blob/main/docs/EDITIONS.md#selection-and-station-labels).

### Airport movement boards

Airport selections use the shared `AirportHeroCard` from `@motionstudies/web` 0.1.0-alpha.5. Departures/arrivals follow the study clock, looking 10 minutes behind and 60 minutes ahead within the active study window. Loading and empty messages use the split-flap columns; new rows settle in 675 ms with staggered characters.

The 4 September 2026 air fixtures include optional origin/destination evidence from cached global ADSB.lol heatmaps and the public-domain [OurAirports reference](https://ourairports.com/data/). These are inferred observed movements, not schedules or confirmed flight plans. Unknown routes remain blank. Full-day manifest entries and playback chunks carry the same evidence; metadata records the input hashes, reference source, and local UTC offset (2 hours for this service date).

After ingesting the base air study, regenerate the enrichment with `npm run data:air:routes -- /path/to/cached-heatmaps /path/to/airports.csv`. Supply heatmaps covering the same local service day and a saved OurAirports `airports.csv`; the command performs no network calls. Raw source files remain outside the repository.

Rendering and performance changes, source comparisons and measurements are documented in [docs/PERFORMANCE.md](docs/PERFORMANCE.md).
