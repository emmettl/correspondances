# Eight-line density review — 7 September 2026

Scope: the pinned 4 September morning, all eight implemented lines, 977 scheduled journeys and 333 moving trains at 08:00. Reviewed at 1440 × 1000 in Chromium and the iPhone 13 viewport in WebKit, in both Région and Cœur. This is a composition review of the committed study, not a claim about passenger density.

## Findings and treatment

- The original regional framing clipped substantial outer branch context. Home distance now uses 1.12 instead of 0.9, while the Châtelet-centred view uses 0.2 instead of 0.16. The same railway remains active at both scales; narrow screens still need pan/zoom to inspect distant termini.
- The centre view admitted up to 32 large unselected mission labels. They competed with place names and covered much of the phone map. The default city-scale view now gives stations priority. Individual mission labels appear at closer zoom with a ceiling of three on phones and eight on desktop. Explicitly selected and compared journeys retain their labels; the label-off control still wins.
- Châtelet, Gare de Lyon, La Défense and Gare du Nord get first choice of label space. Other labels retain the source-derived ordering. Smaller phone labels and viewport-edge rejection prevent long station names extending beyond the screen.
- Corridor emphasis and the administrative boundary used to switch immediately with the button. They now fade continuously from actual camera height, including wheel and pinch zoom. The boundary stays mounted and is culled when fully faded. The Seine and périphérique remain present.
- Authored camera journeys settle over roughly 1.5 seconds. Direct pointer and wheel input cancels that slower journey. Station labels retain the existing 420 ms settling delay; local station tiers become eligible only at close scale.
- Scale changes release an active follow/selection, allowing the camera to reach the requested composition. Reset and route/layer resets restore the Région control state. Playback and the eight-line network are preserved.

## Engineering and validation

The edition uses a narrow build adapter for the pinned `@motionstudies/three` alpha.2 renderer, following All Change's approach. It changes label policy, material values and camera damping without copying the shared renderer or modifying installed packages. Every replacement checks its expected occurrence count; tests parse the transformed renderer and reject a changed upstream hook. A future renderer release should expose these as public edition settings so the adapter can be removed.

The browser regression checks that returning from Cœur allocates no new WebGL map buffers, that reset restores the scale control, and that the network and playback state survive. The existing desktop/phone, AIR, full-day and interchange checks remain in the suite. The opening payload is 591.4 KiB gzip against the 625 KiB limit.

`npm run profile:frames` now samples both moving transitions as well as settled views. Desktop GPU measurements and emulated-phone rendering do not establish Windows Edge or physical-phone frame performance; capture on those devices before claiming a cross-device frame-rate improvement.

Production Chrome 152 on an Apple M4 Max, 1920 × 1080 viewport at 1.5 DPR, recorded the following three-second samples with playback running. These are local observations, not a comparative speedup claim.

| Scenario | Mean fps | Frame p95 | Frames over 25 ms |
| --- | ---: | ---: | ---: |
| Opening | 60.0 | 18.3 ms | 0 / 180 |
| Région → Cœur | 60.0 | 18.2 ms | 0 / 180 |
| Settled Cœur | 60.0 | 18.2 ms | 0 / 180 |
| Cœur → Région | 60.0 | 17.8 ms | 0 / 180 |

## Gate and next work

Keep the eight-line composition as the baseline. The centre is readable without adding another runtime layer, and the outer branches retain their route colours and aggregate movement. The first expansion, [Métro 2 and 6](METRO-ARCS.md), now forms an optional ten-line study with separate payload, visual and frame checks. The second group, [Métro 5 and 7](METRO-CROSSINGS.md), passes those checks with both optional groups enabled, forming a twelve-line study. Nine Métro lines stay outside the runtime. Transilien, tram and operational rail variation remain later studies.
