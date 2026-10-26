# Republic Frontline — project conventions

Pixel-art tower defense PWA (vanilla JS ES modules + Canvas 2D, no game build step).
The full spec is the build prompt (`republic-tower-defense-prompt-v2.md`, kept by Andrew).
Start every session by reading this file, `PROGRESS.md` and `DECISIONS.md`.

## Process
- Work in phases (spec §20). Every phase ends with a STOP: summarize, list "Verified (how)" vs
  "Not verified, needs Andrew", then wait for "approved".
- Log every judgment call the spec doesn't settle in `DECISIONS.md` (one line + reason).
- Update `PROGRESS.md` at the end of each session. Commit at milestones; tag `phase-N` at the end of a phase.
- Pin dependencies to exact versions (devDependencies only; the game ships none).

## Layout
- `src/art/` — all art, shared by the game and Node tools. Pure JS: no DOM, no canvas in builders.
  - `palettes.js` named palette arrays + the `LEGEND` (one char → color)
  - `bitmap.js` RGBA `Bitmap` + blit/outline/recolor/mirror/strip; `toCanvas(bm, createCanvas)` is the only canvas touchpoint
  - `rotsprite.js` load-time turret rotation (Scale2x×3 → rotate → majority downsample → orphan cleanup)
  - `font.js` pixel fonts (FONT7 UI, FONT5 damage numbers)
  - `sprites/*.js` hand-placed pixel maps; `towers.js`, `enemies.js`, `tilemap.js`, `vfx.js`, `ui.js` builders
  - `index.js` `buildArt()` — the single entry point the game and the tools call
- `tools/` — Node-only dev tools (`export-art.mjs`, `art/*`). Later: sim, bench, precache, vendor, icons.
- Later phases add `src/engine`, `src/sim` (pure, no DOM), `src/fx`, `src/ui`, `src/data`, `src/save`, `tests/`.

## Art rules (spec §4)
- Characters, towers, bosses, tiles, props, icons, emblems: **hand-placed pixel maps** (strings of legend keys).
  Code only does palette swaps, tier overlays, flashes, outlines, frame assembly, RotSprite.
  VFX (fireballs, smoke, glows, bolts) may be procedural but must stay in art pixels, palette colors, ordered dithering.
- Environments muted; only energy is saturated (Republic blue/cyan, Separatist red/orange, ion white-blue, droid shields violet).
- 1px dark outlines, 3–4 shade ramps, top-left light, no orphan pixels (`node tools/art/lint-art.mjs` must pass).
- Never rotate sprites at draw time. Turret heads: 16 RotSprite directions. Troopers: 5 authored facings + mirrors.
- Unit stripes use keys `s/S/Z`, swapped with `stripeSwap(bm, name)`.

## Commands
- `npm install` — dev tools only (`@napi-rs/canvas`, `pptxgenjs`)
- `node tools/export-art.mjs` — render every sprite strip + slides to `art-preview/`, build `art-preview.pptx`
- `node tools/art/lint-art.mjs` — orphan-pixel check on every composed tower/enemy frame
- After any art export: open the PNGs in `art-preview/` and critique them against the art rules before presenting.
