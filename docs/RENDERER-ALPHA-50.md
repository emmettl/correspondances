# Stable renderer API adoption

This branch consumes all four exact published `0.1.0-alpha.50` Motion Studies
packages. Fiber stays at 9.8.2, React at 19.3.1 and Three at 0.186.1. It retains
the existing WebGL renderer, authored materials and study playback clock.

## Changes

`ParisAirportSelection` now reads the scene and camera through the public
`three/webgl-study` boundary and obtains the renderer through `frameRenderer`.
The renderer/canvas identity, pointer capture, drag rejection and effect-event
callback stay the same. `ParisArcLayer` explicitly requires the WebGL renderer.
No v10 scheduler objects, legacy entry imports or node materials are introduced.

Browser checks now use a fresh production preview. CI builds and checks budgets
before browser tests, then tests that same artifact with `E2E_PREBUILT=1`. Local
browser runs build automatically. Existing assertion timeouts and CI retry
policy are retained.

The existing renderer-policy test harness needed real public `frameRenderer`
and `frameElapsed` bindings and its camera-frame hook registration adapter. All
original assertions remain. That harness still extracts compiled package
functions; replacing this coupling with public-contract/browser coverage remains
a readiness follow-up rather than a production dependency.

## Baseline and validation

The [alpha.43 baseline](renderer-readiness/alpha43/README.md) identifies source
`c274a00`, its lockfile, fixture tree, paused captures and short frame diagnostic.
All 29 unit tests, static checks, build and fixture/bundle gates passed. The first
focused Chromium/WebKit production run passed 9/10 cases; a fixed-coordinate CDG
label tap failed on phone WebKit. Three unchanged repeats of that case then
passed. The initial failure remains recorded separately.

Alpha.50 passes the same 29 unit tests, typechecking, lint, boundary checks, build
and all existing bundle gates. The complete production suite passes **240 browser cases**, with two existing
desktop skips for phone-only layouts and no failures or retries.
[Validation evidence](renderer-readiness/alpha50/validation.json) records project
counts and scope. Hosted PR CI independently repeats the publication gate.

[Installation evidence](renderer-readiness/alpha50/install.json) verifies all four
registry versions and integrities, the unchanged fixture tree and all **211**
staged data hashes. No acquisition, source refresh or data regeneration is included.

The opening measured by the unchanged budget script is **644,596 / 645,120 bytes
gzip**, versus 644,272 bytes for alpha.43: **+324 bytes**. JavaScript is 365,503
bytes and CSS 9,236 bytes. [Candidate budget](renderer-readiness/alpha50/budget.json)
and [baseline budget](renderer-readiness/alpha43/budget.json) retain exact values.
The README's stale package and budget descriptions now reflect those existing gates.

Physical-phone memory/thermal behavior, leak/recovery acceptance and author visual
approval remain open. Headless emulation and short frame samples do not establish
those results. This branch does not change a deployed revision or adopt WebGPU.

[Candidate captures](renderer-readiness/alpha50/captures.json) retain the same
paused 08:00 geography/heart compositions at 1440×1000 and 390×844, DPR 1.
The [image diagnostic](renderer-readiness/comparison.json) records differences
between sessions; inspection found the same composition and material language.
The largest pixel difference is 1.41% in the phone heart view. Pixel identity or
author approval is not claimed.

The [candidate short frame diagnostic](renderer-readiness/alpha50/performance.json)
uses the same profiler and settings as the baseline, with no overlapping local
GPU test run initiated here. Software-rendered search/selection samples are slow
in both reports. These single runs do not establish a causal performance result.
