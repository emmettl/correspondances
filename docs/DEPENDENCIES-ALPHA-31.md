# Alpha.31 dependency refresh

30 September 2026. Exact published Motion Studies alpha.31 packages, React 19.3.0, React Three Fiber 9.8.1 and Three.js 0.186.1; Vite 8.3.1, Vitest 5.0.3, Oxlint 1.86.0 and npm 11.21.0.

Opening JavaScript rises from 338.6 to 354.3 KiB gzip; the base rises from 420.5 to 436.2 KiB, and the eight-line opening from 610.8 to 626.5 KiB. Ceilings become 358 KiB JavaScript, 440 KiB base and 630 KiB opening (previously 340 / 425 / 625). CSS, data and opt-in composition budgets remain unchanged. The source adapter now matches the shared mapLabelBoxesOverlap call while retaining both viewport-margin guards; its extraction tests bind that public helper.

Before and after builds used identical committed fixtures and application source (apart from the documented renderer-adapter compatibility change), on Node 24.21.0 / npm 11.21.0. The approximately 15.7 KiB increase is the shared/rendering dependency refresh, not additional downloaded data. These measured baselines retain explicit transfer limits.
