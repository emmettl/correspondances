# Transilien — the region beyond the centre

Nine conventional Transilien rail lines join the pinned 4 September 2026 study in four optional groups. H/K radiate from Gare du Nord; J/L fan out from Saint-Lazare; N reaches southwest from Montparnasse while U and V link suburbs without crossing central Paris; P/R extend from Gare de l’Est and Gare de Lyon into the eastern and southeastern region. These relationships extend the centre–periphery composition, including its exceptions.

The eight-line opening remains the default. Transilien is requested only when enabled in **Couches**, with independent loading, cancellation, caching and retry for each group. Search supports line names, stations and source mission identifiers. All groups share the morning and progressive 24-hour clocks. Movement is interpolated from published schedules, with no claim about live conditions or passenger volumes.

## Source and coverage

The compiler uses the same IDFM GTFS archive as the Métro/RER study: SHA-256 `c29fa61247444191407dae7c1bcf33315e56785369112642e836cba9d100fe18`, retrieved 6 September 2026 at 11:41:37 UTC. The service day stays 4 September. The compiler rejects a different archive and rejects Transilien segments without published shapes. Licence Mobilité, source URLs, retrieval time, archive identity and geometry method are embedded in each artifact.

The [operator’s line directory](https://www.transilien.com/fr/page-deplacements/plan-des-lignes) provides editorial context; the committed [morning audit](../fixtures/idfm/correspondances-transilien-audit.json) and [day audit](../fixtures/idfm/correspondances-transilien-day-audit.json) independently count active journeys from the archive. No operator map artwork is reused. Tram-trains and TER services are outside this conventional Transilien rail selection.

| Line | IDFM route | Morning / full-day journeys |
| --- | --- | ---: |
| H | C01737 | 105 / 483 |
| K | C01738 | 11 / 36 |
| J | C01739 | 87 / 431 |
| L | C01740 | 100 / 542 |
| N | C01736 | 50 / 224 |
| U | C01741 | 21 / 93 |
| V | C02711 | 20 / 103 |
| P | C01730 | 46 / 241 |
| R | C01731 | 24 / 116 |

Full-day checks preserve H’s Luzarches, Pontoise, Persan–Beaumont and Creil patterns; K to Crépy-en-Valois; J to Gisors, Vernon and Mantes; L to Cergy, Versailles and Saint-Nom; N to Dreux, Rambouillet and Mantes; P to Coulommiers, Provins, Château-Thierry and La Ferté-Milon; and R to Montereau and Montargis. Source short workings remain present. U retains La Défense–La Verrière and V retains Massy–Palaiseau–Versailles Chantiers. Numeric mission identifiers are kept as published rather than replaced by invented four-letter codes.

Transfer evidence remains scoped to each compiled group. The expansion does not infer new transfer times between separately compiled networks.

## Loading and payload review

| Group | Lines | Morning / day | Active at 08:00 | Morning gzip / gate | Manifest gzip / gate | Largest chunk gzip / gate |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Nord | H / K | 116 / 519 | 29 | 30.5 / 40 KiB | 18.7 / 24 KiB | 12.1 / 16 KiB |
| Saint-Lazare | J / L | 187 / 973 | 52 | 63.2 / 80 KiB | 43.1 / 52 KiB | 21.2 / 28 KiB |
| Sud-ouest | N / U / V | 91 / 420 | 29 | 28.8 / 36 KiB | 19.7 / 24 KiB | 10.3 / 16 KiB |
| Est et sud-est | P / R | 70 / 357 | 24 | 43.1 / 56 KiB | 37.2 / 48 KiB | 7.4 / 12 KiB |

Transilien adds 464 morning and 2,269 full-day journeys. The complete 30-line rail composition has 2,967 morning journeys, 16,147 full-day journeys and 860 active vehicles at 08:00, without duplicate journey IDs. All Transilien morning fixtures together add 165.6 KiB gzip. The full initial rail composition is approximately 1,095 KiB against a 1,200 KiB ceiling; the default opening is approximately 594.5 KiB against its unchanged 625 KiB ceiling. AIR has its own on-demand budget.

Each full-day manifest has twelve contiguous two-hour chunks. Enabling a group directly in 24H loads its manifest and current chunk before neighbouring chunks, without fetching its morning file. Validation checks per-line counts against both audits, source identity, licences, indices, chunk digests and coverage, branch destinations and composition with all existing Métro/RER groups.

## Reproduce

With the pinned archive at `/tmp/IDFM-gtfs-current.zip`:

```sh
npm run data:paris:audit:transilien
npm run data:paris:audit:transilien:day
npm run data:paris:transilien-north
npm run data:paris:transilien-saint-lazare
npm run data:paris:transilien-southwest
npm run data:paris:transilien-east
npm run build
npm run check:bundle
```

CI uses committed fixtures and does not refresh the source. Pushes to `main` automatically build, validate and deploy to GitHub Pages. Pull requests validate without deploying; the manual Pages trigger remains available.

For frame measurements, serve the production build and run `npm run profile:frames -- --channel chrome --all-metro --transilien --output paris-transilien-frames.json`. Use `--channel msedge` on Windows. Local desktop measurements and an emulated phone viewport do not establish physical-phone or Windows frame performance.

## Visual and frame validation — 7 September 2026

The complete 30-line composition was reviewed at 1280 × 720 in desktop Chromium and in the iPhone 13 WebKit viewport, in both Région and Cœur. The wider branches remain distinct from the dense centre. Distant termini need pan/zoom, especially on narrow screens; optional groups and route isolation support closer inspection. The expanded menu scrolls within its bounded panel, including on short phone screens with AIR enabled.

The integrated desktop/phone suite passed, covering all nine line searches, morning/manifest/chunk failures, cancellation during loading, source mismatch rejection, independent retries, full-day traversal and removal of the Transilien groups. Unit tests, typecheck, lint, boundary checks, production build and source/payload gates also passed.

Production Chrome 152 on Apple M4 Max was sampled at 1920 × 1080 with 1.5 DPR, playback running, all six optional Métro groups and all four Transilien groups enabled. Each scenario ran for three seconds after loading; transition samples include the camera movement.

| Scenario | Mean fps | Frame p95 | Frames over 25 ms |
| --- | ---: | ---: | ---: |
| Complete regional view | 60 | 16.9 ms | 0 / 180 |
| Open search | 60 | 16.8 ms | 0 / 181 |
| Selected route, closed search | 60 | 16.8 ms | 0 / 180 |
| Région → Cœur | 60 | 16.8 ms | 0 / 180 |
| Settled Cœur | 60 | 16.8 ms | 0 / 180 |
| Cœur → Région | 60 | 16.8 ms | 0 / 180 |

These measurements apply to this local desktop; Windows Edge and physical-phone frame measurements remain outstanding.
