# Progress

## 2026-10-25 — Phase 0 (art direction preview) — STOPPED for review

**Done**
- Project scaffold: git repo, `package.json` (exact-pinned dev tools), `CLAUDE.md`, `DECISIONS.md`.
- `src/art/`: palettes, RGBA bitmap core, RotSprite, pixel fonts, `buildArt()` entry point.
- Towers: Clone Rifle Squad, Rocket Team, Flak Turret — tiers I–III + both tier-4 branches, idle/firing frames,
  8 trooper facings / 16 RotSprite head directions.
- Droids: Trooper, Rush, Scuttler, Shield Droid (roll → deploy → walk), Strike Fighter (16 headings + shadow);
  walk cycles and death sequences.
- Kamino tileset (3 ground variants, walkway, pad, 4-frame water, platform edge, bridge truss, foam) + autotiler + props.
- VFX: 16-angle bolts (both factions), pixel-ring glows, ion arc/burst, explosions S/M/L, smoke, scorch decals,
  shield ripple, sparks, muzzle flashes, debris, rain.
- UI kit: 9-slice panels/buttons, icon set, range circle, placement grid, title lettering; HUD mocks at iPhone size.
- Emblems (Republic, Separatist) and app icon concept.
- `tools/export-art.mjs` → `art-preview/` (162+ PNGs, 15 slide PNGs) and `art-preview.pptx`.
- `tools/art/lint-art.mjs` orphan-pixel lint (passes: 260 frames, 0 orphans).

**Self-review fixes made before presenting**
- Turrets redesigned (heads hid the bases; gray-on-gray; barrels read as grates) → white striped bases, part-assembled heads.
- Removed face-like dot patterns on flak housings and radar dishes.
- Fireballs were heart-shaped → dominant core + evenly spread lumps.
- Ground tiles read as brick → riveted metal plates. Smoke re-shaded with per-blob top-left lighting.
- Droid shields moved from cyan to violet.

**Next (after approval):** Phase 1 vertical slice (engine, sim/render split, Kamino L1 + tutorial, the 3 towers,
5 droids, VFX/SFX, music, local save, mobile controls, debug overlay, tests, headless sim + balanced bot, GitHub Pages).

**Known issues / weaker spots**
- Rocket and Flak heads are drawn top-down on 3/4 bases (standard for rotating turrets, but a mild perspective mix).
- Smoke puffs are the weakest VFX; may get a hand-authored puff set in Phase 1.
- No GitHub remote yet (Phase 1 sets up Pages deployment).

## 2026-10-25 — Phase 1 in progress — PAUSED at Andrew's request

**Done since Phase 0 approval**
- Pure deterministic sim (towers, droids, waves, damage/shields/stun/stacking, economy), Kamino 1 data,
  save schema + merge + migrations, 30 passing unit tests, headless runner + balanced/spam/no-upgrade bots.
- Browser game: integer-scaled renderer + atlas, input (tap/drag-pan/pinch/wheel/keys), fixed-step loop with
  1x/2x/3x/pause, pooled VFX, synthesized SFX + music sequencer, HUD with drag-ghost placement, info panel,
  tutorial, pause/settings, debug overlay + dynamic quality, IndexedDB saves with wave-end autosave.
  Verified playable end to end on 1x art (commit 8f2088a).
- Andrew asked mid-phase for 2x art detail across the whole project, smoother animation and camera:
  - World now 2x detail: 32px tiles, all pixel-valued data doubled (bot results identical => balance unchanged),
    world scale SW = floor(dh/520) separate from UI scale S = floor(dh/260); 2x sprites in UI via renderer.hi().
  - Redrawn at 2x: troopers (8 facings + breathe/recoil frames), sandbag nest + riveted plates, droids with
    6-frame walks and 6-frame deaths, shield-droid tread animation, fighter (32 headings, 3 thruster frames),
    Kamino tiles (32x32), effects (32-angle bolts, 10-15 frame fireballs, 8-frame smoke, 6-frame shield ripple).
  - Turrets/props/icons/emblem/portrait: hand-placed parts upscaled (Scale2x + 1px outlines + rim light),
    turret heads at 32 RotSprite directions with smoothed visual turning.
  - Camera: 120 ms eased integer zoom, pan momentum (fling).

**Next when resumed**
1. Re-test the 2x build in the browser (last fix: trooper `breathe` frames now uploaded; render loop no
   longer dies on an exception). Check HUD icon sizes, build-bar icons, title/briefing/result screens.
2. Update tools/export-art.mjs for 2x art (export sprites at 2x, mockups at 1x of 2x art), re-export both
   decks' worth of PNGs, visual self-review.
3. Log the 2x decisions in DECISIONS.md (world/UI scale split, deck export scales, rim light, 32 dirs).
4. GitHub Pages: `gh` is not installed; need Andrew's repo/credentials decision.
5. Write Phase 1 summary (Verified vs needs Andrew) and STOP.
