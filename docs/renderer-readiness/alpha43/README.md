# Alpha.43 renderer adoption baseline

The build, budget, capture and validation JSON files identify the exact source,
lockfile and retained fixture tree before alpha.50 adoption. Captures use paused
production builds in desktop and phone layouts. These are headless diagnostics,
not physical-device, thermal, memory-leak or author visual acceptance.

Focused Chromium/WebKit checks passed 9 of 10 cases; the initial phone WebKit
CDG label tap failed at its fixed coordinate. This existing failure is retained
explicitly for comparison; no source change or assertion relaxation is included.
