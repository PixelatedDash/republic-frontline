# Republic Frontline — project conventions

Pixel-art tower defense PWA (vanilla JS ES modules + Canvas 2D, no game build step).
The full spec is the build prompt; a verbatim copy lives in `docs/spec-v2.md` (git-ignored: the repo is public).
Start every session by reading this file, `PROGRESS.md` and `DECISIONS.md`.

## Process
- Work in phases (spec §20). Every phase ends with a STOP: summarize, list "Verified (how)" vs
  "Not verified, needs Andrew", then wait for "approved".
- Log every judgment call the spec doesn't settle in `DECISIONS.md` (one line + reason).
- Update `PROGRESS.md` at the end of each session. Commit at milestones; tag `phase-N` at the end of a phase.
- Pin dependencies to exact versions (devDependencies only; the game ships none except `vendor/supabase.js`).
- **Before every commit that adds, removes or changes game files, run `node tools/build-precache.mjs`** (rewrites the file list + version in `sw.js`; a stale list breaks offline play and the update toast).

## Layout
- `src/art/` — all art, shared by the game and Node tools. Pure JS: no DOM, no canvas in builders.
  - `palettes.js` named palette arrays + the `LEGEND` (one char → color)
  - `bitmap.js` RGBA `Bitmap` + blit/outline/recolor/mirror/strip; `toCanvas(bm, createCanvas)` is the only canvas touchpoint
  - `rotsprite.js` load-time turret rotation (Scale2x×3 → rotate → majority downsample → orphan cleanup)
  - `font.js` pixel fonts (FONT7 UI, FONT5 damage numbers)
  - `sprites/*.js` hand-placed pixel maps; `towers.js`, `enemies.js`, `tilemap.js`, `vfx.js`, `ui.js` builders
  - `index.js` `buildArt()` — the single entry point the game and the tools call
  - `galaxy.js` planet globes (hand-placed surface maps wrapped on a sphere), cruiser, nebula; `medals.js` medal icons
- `src/engine/` — scaling (UI S + world SW), camera (eased integer zoom, momentum), input, atlas, renderer, audio (synth SFX + music sequencer), assets, pool, rng
- `src/sim/` — pure deterministic simulation (no DOM, no Math.random). State is plain JSON with ids; `sim.events` feed fx/audio/UI
- `src/fx/` — pooled particles/decals/corpses driven by sim events; dynamic quality
- `src/ui/` — screens (boot/title/briefing/result), meta screens (`meta-screens.js`: galaxy + planet view, tech terminal, medals + stats, archives, ending), game screen, world draw, HUD widgets (immediate mode), tutorial, settings, debug
- `src/data/` — towers, enemies (incl. bosses), rules (damage table, difficulty, economy), balance (per-level hp scale), meta (tech tree, Heroic sets, achievements, archive), levels (one file per planet; waves are recipes composed by `levels/waves.js`), music
- `src/save/` — schema (versioned, migrations, merge) + IndexedDB storage + `cloud.js` (Supabase sync); `src/config.js` holds the Supabase URL / publishable key / login email domain
- PWA: `manifest.webmanifest`, `sw.js` (generated precache block), `icons/` (from `tools/export-icons.mjs`), `supabase/schema.sql`
- `tools/` — Node-only: `export-art.mjs` (+ `art/` helpers incl. headless game), `sim/run.mjs` + `sim/bots.mjs`, `serve.mjs`
- `tests/` — `node --test` suites

## Scale (2x detail)
- World art is 2x detail: TILE = 32 art px, data in art px. UI art/fonts are 1x at UI scale S; world scale SW = floor(dh/520).
- 2x-detail sprites shown inside the UI go through `renderer.hi()` (refs flagged `hi: 2` do it automatically); size them with `sc.HIR`.
- Never put a sprite larger than 1024 px in the atlas; use `renderer.cachedCanvas()` for big overlays.

## Art rules (spec §4)
- Characters, towers, bosses, tiles, props, icons, emblems: **hand-placed pixel maps** (strings of legend keys).
  Code only does palette swaps, tier overlays, flashes, outlines, frame assembly, RotSprite.
  VFX (fireballs, smoke, glows, bolts) may be procedural but must stay in art pixels, palette colors, ordered dithering.
- Environments muted; only energy is saturated (Republic blue/cyan, Separatist red/orange, ion white-blue, droid shields violet).
- 1px dark outlines, 3–4 shade ramps, top-left light, no orphan pixels (`node tools/art/lint-art.mjs` must pass).
- Never rotate sprites at draw time. Turret heads, fighters, bolts: 32 RotSprite directions. Troopers: 5 authored facings + mirrors.
- Unit stripes use keys `s/S/Z`, swapped with `stripeSwap(bm, name)`.

## Sim rules
- Everything in `src/sim` must stay deterministic: gameplay randomness only via `src/engine/rng.js` on `state.rng`.
- After changing sim/data, run the tests and the bots, then re-tune and regenerate the report:
  `node tools/sim/tune.mjs --level <id> > tune/<id>.json` per level, `node tools/sim/apply-tune.mjs tune/*.json` (writes the hp into `src/data/balance.js`), then
  `node tools/sim/report.mjs --level <id>` per level + `--write <jsons>` for BALANCE_REPORT.md. Explain intent changes in BALANCE.md.

## Commands
- `npm install` — dev tools only (`@napi-rs/canvas`, `pptxgenjs`)
- `node tools/export-art.mjs` — render every sprite strip + slides to `art-preview/`, build `art-preview.pptx`
- `node tools/export-art-2.mjs` — Phase 2 art checkpoint deck (`art-preview-2/`, `art-preview-2.pptx`)
- `node tools/art/lint-art.mjs` — orphan-pixel check on every composed tower/enemy/boss/prop frame (Phase 1 + 2)
- `node tools/serve.mjs [port] [--lan]` — no-cache dev server (`--lan` to test on a phone over Wi-Fi; no service worker over http)
- `node tools/bench/run.mjs --throttle 4 [--gpu 1]` — benchmark (BENCHMARK.md); `node tools/art/qa-sweep.mjs` — every level through the real GameScreen
- `npm test` — unit tests; `node tools/sim/run.mjs --level kamino-1 --difficulty jedi --bot balanced --seeds 5` — headless bots
- `?skip=1` (Kamino 1) or `?skip=<level-id>` jumps into a level (`&heroic=1`), `?sandbox=<level-id>`, `?screen=galaxy|tech|medals|archives`; `?unlock=1` opens every level (dev shortcuts)
- After any art export: open the PNGs in `art-preview/` and critique them against the art rules before presenting.
