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
