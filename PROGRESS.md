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

## 2026-10-26 — Phase 1 (vertical slice) — STOPPED for review

**Done**
- Pure deterministic sim (towers, droids, waves, damage/shields/stun/stacking, economy caps), Kamino 1 with tutorial,
  versioned save schema with merge + migrations, 30 unit tests, headless runner with balanced / spam / no-upgrade bots.
- Browser game: integer-scaled renderer + atlas, touch/mouse/keyboard input (drag-ghost placement with confirm,
  pinch zoom, pan with momentum, wheel), fixed 60 Hz loop with 1x/2x/3x/pause, pooled VFX, synthesized SFX and
  layered music with crossfades, HUD + info panel + tutorial + pause/settings, debug overlay with dynamic quality,
  IndexedDB saves with wave-end autosave and Continue, rotate-device overlay, safe-area insets.
- 2x detail across the whole project (Andrew's mid-phase request): world art redrawn at 2x, more animation frames,
  32-direction turrets/fighters/bolts, smoothed turret turning, eased zoom, pan momentum. Deck re-exported at 2x;
  its mockup / readability / HUD slides are frames from the real game running headless.
- Docs: CLAUDE.md, DECISIONS.md (Phase 1 + 2x sections), README (local play, phone over Wi-Fi, GitHub Pages steps).

- Deployed: repo https://github.com/PixelatedDash/republic-frontline (public), GitHub Pages from `main` / root, live at
  https://pixelateddash.github.io/republic-frontline/ (checked: boot → title → briefing → Kamino 1 at 1280x720, no
  console errors). Pushes go through GitHub Desktop (the command line has no GitHub login). Tags `phase-0`/`phase-1`
  are local only so far.

**Next:** Phase 2 art checkpoint (remaining 5 towers, 9 droids, 5 bosses, 4 planet tilesets) after approval.

**Known issues / weaker spots**
- Balanced bot wins Kamino 1 on Padawan/Jedi but loses on Jedi Master; it is a floor, not a skill benchmark.
- Turret parts, props and icons are upscaled 1x art with rim light (smooth, but less hand detail than troopers/droids/tiles).
- Not yet measured: real-device frame rate (benchmark tooling is Phase 5).
