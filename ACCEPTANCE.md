# Acceptance report (spec §21)

Final check of the build against the spec's acceptance checklist, 2026-10-29 (Phase 5). Each item says how it was verified. Items that need a real iPhone or a real Supabase project are listed separately at the end.

## Verified

| Item | Status | How |
|---|---|---|
| In-game sprites come from the same `src/art/` code as the approved decks | Yes | The game (`src/main.js` -> `buildArtAsync`), the decks (`tools/export-art.mjs`, `tools/export-art-2.mjs`), the icons (`tools/export-icons.mjs`) and the headless renders all import the same `src/art/` builders; there is no separate sprite source. |
| Integer world and UI scale on every screen size; no smoothing | Yes | `tests/scaling.test.mjs`: 12 phone/tablet/desktop sizes x 6 DPRs (1 to 3), S / SW / HI are whole numbers, the UI view keeps >= 260 rows, tap targets >= 44 CSS px. `imageSmoothingEnabled = false` on every draw path and `image-rendering: pixelated` on the canvas. UI sprite fitting only uses whole device-pixel scales. Checked visually in the browser at 800x600 and 667x375. Two short eases are non-integer by design (camera zoom 120 ms, galaxy planet zoom 0.45 s). |
| Benchmark p95 frame time and dynamic-quality behavior reported | Yes | `BENCHMARK.md` (`tools/bench/run.mjs`, 844x390 @3, 4x CPU throttling, 30 s, ~250 droids / ~400 projectiles / ~1500 particles). |
| All 8 towers x 3 tiers x 2 branches work and are visually distinct | Yes | `tests/acceptance.test.mjs` builds every tower along all five tier paths (t1, t2, t3, t4a, t4b) and checks it fires (depots: income or aura). Visual distinctness: Phase 0/2 decks, approved; art lint 1042 frames, 0 orphan pixels. |
| All 14 enemies and 5 bosses work; damage, shield, air, stun and stacking rules pass unit tests | Yes | `tests/rules.test.mjs`, `tests/sim.test.mjs`, `tests/phase2.test.mjs` (damage table, shield overflow, bubbles, Reaper shell, stun diminishing returns + boss 25%, non-stacking auras, slow cap, splits, drops, boss phases, Foundry vents, Tidebreaker emerge). `tools/art/qa-sweep.mjs` plays all 20 levels (every droid and boss appears) through the real game screen with rendering: no errors. |
| All 20 levels have unique layouts and pass the balance gates (§19) | Yes | `BALANCE_REPORT.md` regenerated in Phase 5: "all gates pass" (balanced wins every level on Padawan 5/5 and Jedi >= 3/5; every spam bot loses every level from Geonosis 3 on; no-upgrades loses every boss level). Layout uniqueness: `tests/phase2.test.mjs` (every level builds, 12-25 waves, >= 4 multi-entry maps) and each map is hand-written in `src/data/levels/`. |
| Economy caps: interest cap, depot limit, early-call floor, sell refunds | Yes | `tests/rules.test.mjs` + `tests/sim.test.mjs` (interest 5% capped per planet, max 3 depots, early-call bonus floor 30%, 100% refund before the first shot / 70% after, depots by wave). |
| Speed 1x/2x/3x, pause, building while paused, all targeting modes | Yes | `tests/game-screen.test.mjs` drives the real GameScreen: 60 / 120 / 180 sim steps per 60 frames, 0 while paused, a tower built while paused. Targeting modes: `tests/sim.test.mjs`. |
| All music and SFX generated in code; mixer and voice limits | Yes (code + ears) | `src/engine/audio.js`: Web Audio only, no audio files in the repo; master -> compressor -> limiter, music and SFX buses, per-type voice limits (extra voices dropped), +-7% pitch; Master / Music / SFX sliders + mute in Settings. Not unit-tested (Node has no Web Audio); heard in the desktop browser during Phases 1-2. |
| Offline play, local save, mid-level resume, save merge and migrations | Yes | `tests/save.test.mjs`, `tests/phase3.test.mjs` (migrations v0 -> v3, merge rules, newer in-progress wins, tech from the newer doc), `tests/sim.test.mjs` (snapshot/restore mid-level continues identically incl. RNG), `tests/phase2.test.mjs` (v1 mid-level snapshots). Offline: in desktop Chromium the dev server was stopped and the game still booted into a level from the service worker cache. |
| Login and sync against a real Supabase project | **Unverified** | No project or keys were provided. Sync logic is tested against a fake client (`tests/cloud.test.mjs`); the email format was checked against the Supabase Auth source (DECISIONS.md, Phase 4). |
| Service worker precaches everything, works offline, update toast on a new deploy (desktop Chromium) | Yes | `tests/pwa.test.mjs` (every game file is in the precache list and every listed file exists). In the browser pane with `?sw=1`: 76-77 files cached, game boots with the server stopped, a changed file + rebuilt precache made "UPDATE AVAILABLE - TAP TO RELOAD" appear; tapping it activated the new worker, removed the old cache and reloaded. |
| No copyrighted character, ship, logo or music reproduced | Yes (by design + review) | All art is hand-placed original pixel maps (original helmets, droid silhouettes, emblems, cruiser hull), all music is original sequences in `src/data/music.js`; reviewed in the Phase 0/2 decks and this phase's previews. Names are generic (Clone Rifle Squad, Trooper Droid, ...). |
| Max stars = 80 everywhere it's shown | Yes | `MAX_STARS` (20 x 4) is the only source; galaxy map, tech terminal and stats tab all print it; `tests/phase3.test.mjs` asserts 80. |

## Needs Andrew (on device)

- Crisp, non-shimmering pixels on the iPhone.
- 60 fps on the iPhone during big waves (Settings -> Debug overlay shows FPS, CPU ms and the quality level).
- Drag-ghost placement, pinch zoom and pan on touch; the portrait "rotate" overlay.
- Audio unlocks on the first tap on iOS and survives backgrounding.
- PWA: install from Safari, launch without browser chrome, airplane mode.
- Later levels feel challenging but fair, and the game is fun (the bots are a floor).
- Cloud sync: create the Supabase project (README), log in on phone and desktop, check both see the same progress.
