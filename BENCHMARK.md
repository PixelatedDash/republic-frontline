# Benchmark

`node tools/bench/run.mjs --throttle 4 --seconds 30 [--gpu 1] [--dpr 2]` (spec §19). Scene: `?bench=1`, a Sandbox game on Mustafar 2 held at ~250 droids, ~400 projectiles and ~1500 particles; 4 s warm-up, then 30 s of frame times. Viewport 844x390 CSS px (iPhone 14-class landscape). Host: Apple M5 Mac, Chromium 156 (Playwright 1.64.0). This is a proxy; the real check is the debug overlay on the iPhone.

| Raster | DPR | CPU throttle | p50 | p95 | p99 | Avg FPS | Load (droids / projectiles / particles) | Dynamic quality |
|---|---|---|---|---|---|---|---|---|
| GPU (Metal, full Chromium) | 3 | 4x | 16.7 ms | 16.7 ms | 16.8 ms | 60.0 | 241 / 399 / 1479 | 1 -> 0 after 2 s (recovers once the boot spike passes) |
| Software (headless shell, SwiftShader) | 3 | 4x | 49.9 ms | 50.1 ms | 50.1 ms | 23.6 | 241 / 396 / 1444 | 2 -> 3 (lowest) after 1 s |
| Software (headless shell, SwiftShader) | 2 | 4x | 16.7 ms | 33.4 ms | 33.4 ms | 42.4 | 242 / 398 / 1471 | 2 -> 3 after 1 s |

Reading it:
- With a GPU-backed canvas (what Safari on iPhone uses) the full scene holds 60 fps at 4x CPU throttling, with headroom: dynamic quality returns to 0 within 2 s.
- The software rows are fill-rate bound: a CPU profile (`tools/bench/profile.mjs`) puts JavaScript (sim + game logic + draw calls) under 2% of the time; the rest is SwiftShader rasterizing a 2532x1170 canvas. At DPR 1 the same throttled scene runs at 60 fps. So the worst case is a device without an accelerated canvas at full resolution; dynamic quality then sheds particles and decoration (it never touches gameplay).
- The bench filler deliberately keeps the particle pool full, so the software rows show quality at its floor without the particle savings a real game would get from it.

Boot (navigation -> sprites built, "tap to begin"), `node tools/bench/boot.mjs`: 0.54 s median unthrottled, 2.0 s at 4x CPU throttling.
