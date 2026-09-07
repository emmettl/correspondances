# Cœur / Région — 8 September 2026

Cœur is now a plan with variable scale. The transition expands the inner city around Châtelet, compresses distant branches and tilts the camera towards a plan view. Région restores the original geographic projection. Both views use the same loaded railway and playback clock.

## Spatial treatment

The authored focus is near Châtelet–Les Halles, at 2.347° E, 48.861° N. Local longitude/latitude offsets are converted to kilometres before applying the radial function `r′ = 23r / (6 + r)` in layout units. Its radius is strictly increasing and approaches a finite envelope. This preserves the order and bearing of places around the focus while making room for central interchanges. Parameters are fixed across all optional layers and daily chunks; adding Transilien does not rescale the heart.

This is a geometric lens, not an octilinear diagram. Source vertices, path identities and stop identifiers are retained. It does not define fare zones, equal-distance rings, travel-time contours or passenger flows. The source Métro 2 and 6 paths provide the northern and southern arcs, including their actual termini and gaps. No circular railway or tram service is invented.

The Seine and périphérique undergo the same transformation as the railway. The administrative outline and geographic grid fade away. Interchange names become eligible in the expanded centre; local names still require closer inspection. Selected stations and route terminals retain priority. Branch geometry remains complete, although dense outer termini can still require pan/zoom on compact screens.

## Interaction

- **CŒUR / RÉGION** changes the composition over 1.6 seconds. A new request reverses from the current position. Reduced motion resolves directly.
- **Révéler les arcs · Métro 2 et 6** adds the existing optional pair without changing view, playback state or time. Loading and retry remain independent. The eight-line geographic opening remains the default.
- Rail search and route isolation retain the selected composition. Reset returns to Région. The correspondence director focuses its geographic hub in the transformed space.
- CDG, Orly and Le Bourget remain visible as geographic landmarks in Région even with AIR off. AIR stays geographically meaningful: it is visible in Région, and choosing an aircraft or airport returns there. Its enabled state and historical data remain available while viewing Cœur.

## Renderer contract

`paris-layout.ts` derives a complete `SpatialLayoutSnapshot` from the composed network. It uses the shared renderer's layout, moving-train and station-selection support. The Paris adapter blends corresponding source vertices rather than the shared diagram's capped arc-length resampling, so rendered rail segments and moving paths agree throughout the transition.

The pinned alpha.4 renderer has no public hook for retaining static layout buffers. `paris-layout-renderer.ts` therefore extends the existing guarded Vite adapter. Rail, water and reference geometries retain their topology and GPU buffers; their position values are interpolated from cached endpoints. Both endpoints share conservative culling bounds. The two Métro arcs receive a light ribbon in Cœur. Installed packages are not modified.

Tests cover all 30 morning lines and the complete source paths of every daily manifest, radial ordering, stable layer coordinates, source-vertex preservation, shared moving-path geometry and buffer identity through a round trip. Browser regressions cover playback, regional station and arc selection, rapid reversal, reduced motion, arc retry and full-day scrubbing. The existing desktop/iPhone suite additionally checks map-buffer reuse, station labels, optional layers, AIR and correspondence selection.

## Verification

Typecheck, lint, all 13 unit tests, public-import boundaries, production build and all source/payload checks pass. The final production browser run passes 47 study, heart, AIR and label checks with one desktop-inapplicable phone test skipped. The complete Métro/Transilien layer suites were also exercised in Chromium and iPhone WebKit. Returning from Cœur allocates no new WebGL map buffers. The eight-line opening is 596.6 KiB gzip against its 625 KiB budget; the optional 30-line composition is 1,097.1 KiB against 1,200 KiB.

With all 30 lines playing, headless Chromium 151 using the Apple M4 Max Metal backend at 1440 × 1000, DPR 1, produced these two-second samples:

| Composition | Mean callback fps | Frame p95 |
| --- | ---: | ---: |
| Région | 68.66 | 26.2 ms |
| Région → Cœur | 69.24 | 26.1 ms |
| Cœur | 68.94 | 26.1 ms |
| Cœur → Région | 68.99 | 26.1 ms |

These are local callback timings, not a physical-phone or Windows GPU benchmark, nor a guarantee of evenly paced frames. Explicit Metal was necessary because the default headless browser selected SwiftShader. Reproduce against a production preview with `npm run profile:frames -- --url http://127.0.0.1:4181 --headless --angle metal --all-metro --transilien --width 1440 --height 1000 --dpr 1 --duration 2000`.

This first implementation does not add the proposed Traverser / Contourner / Converger journey filters or infer passenger movements. Those require a separate definition of segment classification and presentation.
