# Stable package and Node 26 migration

10 November 2026. Exact published Motion Studies 1.0.0 packages, Node 26, npm 12.2.2 and the tooling 1.0.0 stack check. Existing edition-owned checks and publication gates remain in force.

The new build measured 701,615 bytes for the ten-line composition on the local ARM host, against the former 698,368-byte (682 KiB) ceiling. The old alpha.51 dependencies also exceed this composition ceiling when built under Node 26. The base/opening and ten/twelve/fourteen-line composition ceilings each receive a 4 KiB allowance for this migration (444/634/686/754/824 KiB). JavaScript, CSS, data-chunk and optional-renderer/card limits remain unchanged. The independent airport markers require the shared air-renderer module on opening, so its bytes remain in the opening dependency closure. No minifier experiment or exclusions from that closure are retained.

The owner approved documented transfer-budget increases of at most 4 KiB for this migration. These are compressed-transfer allowances, not claims about decoded memory or physical-phone performance. Values can differ slightly between local ARM builds and Linux CI; retain the CI measurement separately. Browser behaviour is verified by the edition regression suite. Data selection, evidence semantics and appearance are unchanged.
