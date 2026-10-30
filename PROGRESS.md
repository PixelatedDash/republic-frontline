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

## 2026-10-27 — Phase 2 art checkpoint — STOPPED for review

**Done**
- 5 new towers, all tiers + both tier-4 branches: Repeater Nest, Artillery Battery, Ion Cannon, Sharpshooter Post, Supply Depot (`src/art/sprites/turrets2.js`, `posts.js`, builders in `towers.js`).
- 9 new droids with move + death frames: Commando, Tactical, Heavy Tank, Droid Carrier, Shield Walker, Crawler Walker, Siege Walker, Bomber Gunship (air), Repair Drone (air) (`sprites/droids2.js`, `enemies.js`).
- 5 bosses with every phase and weak point (`sprites/bosses.js`, `bosses.js`).
- Geonosis / Kashyyyk / Umbara / Mustafar tilesets + props + shared autotiler `renderLand` (`sprites/planets.js`, `tilemap.js`).
- `buildArtPhase2()` in `src/art/index.js` (not loaded by the game yet).
- `node tools/export-art-2.mjs` -> `art-preview-2/` + `art-preview-2.pptx` (23 slides incl. one mockup per planet and a silhouette check). Lint extended to 982 frames.
- Spec recovered to `docs/spec-v2.md` (git-ignored).

**Next (after approval):** wire Phase 2 content into the game: all 8 towers, 14 enemies, damage/shield/stacking for the new units, economy caps, biomes + weather, 20 maps, 5 bosses, spam / no-upgrade bots, BALANCE.md + BALANCE_REPORT.md.

**Known issues / weaker spots**
- Commando and Trooper Droid silhouettes are the closest pair (both humanoid with a forward gun; the Trooper has the backpack, the Commando is slimmer and steel).
- Repair Drone and Droid Carrier are on the small side next to towers; fine at default zoom, revisit if they get lost in swarms.
- Kashyyyk ravine and Geonosis chasm are mostly static (8 frames of slow drift); weather particles will carry most of the motion.
- Docs commit with the live URL and these commits still need a push from GitHub Desktop.

## 2026-10-29 — Phase 2 (full content) — complete, STOP for review

**Done**
- Sim: all 8 towers (spin-up, min range + lobbed shells, barrage, stun / chain arc / pulse, hitscan sniper with pierce and armor break, depot income, relay aura), all 14 droids (bubble shields, speed aura, heal aura, carrier split, bomber drops), all 5 bosses (phases, Foundry vents as weak points, spawners, Tidebreaker emerge, Dreadnought bombers + lights-out), boss leak table, v1 snapshot migration.
- 19 new levels (20 total) across 5 planets, hand-written wave recipes + composer, per-level HP scale.
- Rendering: every tower/droid/boss, planet ground layers, props, weather per planet, Umbara night + tower lights, beams, pulse rings, artillery arcs, boss cinematic, boss HP bar, campaign level select, per-planet music.
- Balance pass: Sharpshooter re-priced (spam won 7 late levels), Mustafar waves carry infantry / swarms, Umbara 2 and 3 air lanes converge on the exit, Umbara 2 opening softened, balanced bot keeps a ground-need floor, tuner is a robust grid scan. `BALANCE.md` + `BALANCE_REPORT.md`.

**Verified (how)**
- Balance gates (spec §19), `BALANCE_REPORT.md` via `tools/sim/report.mjs`: balanced bot wins all 20 levels on Padawan 5/5 and Jedi >= 3/5; every spam bot loses every level from Geonosis 3 on (Jedi, 5 seeds); no-upgrades loses every boss level. "all gates pass".
- 48 unit tests (damage/shield/stun/stacking rules, auras, splits/drops, boss phases, vents, emerge, relay, depot, levels, v1 snapshot migration); `npm test`.
- Art lint: 982 frames, 0 orphan pixels.
- Browser (desktop Chromium pane): Mustafar 4 and other boss levels load and play with no console errors; headless runs of every boss level.

**Not verified, needs Andrew**
- Feel and difficulty on device. The bots are a floor: Kamino 2 tuned to HP 0.6 because the bot only scrapes Jedi there (1 life left), so it may feel easy or hard to a human; Mustafar 4 no-upgrades bot reaches the final wave before losing.
- Frame rate in big Phase 2 waves on iPhone (benchmark is Phase 5).
- Push from GitHub Desktop (commits + tags `phase-0`..`phase-2` are local).


## 2026-10-29 — Phase 3 (meta and modes) — complete, STOP for review

Andrew asked me to keep going through the remaining phases while away ("do all work that doesn't require specific executive input"), so this STOP is recorded here instead of waiting.

**Done**
- Galaxy map: parallax starfield + nebula, 5 rotating planet globes, dotted route, original Republic cruiser that flies to the selected planet, smooth zoom into a planet view with 4 level nodes (stars, Heroic medal slot, lock, boss tag) and a level panel (Briefing / Sandbox).
- Stars out of 80 everywhere (3 per level + 1 Heroic).
- Tech tree terminal: 8 branches x 4 nodes, 72 stars, tier-4 branches locked until bought, free refunds; tech applied in the sim (`towerStats`) and the HUD.
- Medals: 29 achievements, each with its own pixel medal (earned + locked art); medal toasts on the result screen.
- Archives: every tower, droid and boss, unlocked on first encounter, animated preview, stats, layer/body/shield, weaknesses, lore.
- Stats tab: kills total and by type, playtime, credits, wins/losses, levels and Heroic wins, best run per planet.
- Difficulty modes (existing) + Heroic replay (fixed 4-tower set per level, Master stats, 11 lives, boss leak = loss) + Sandbox (spawner, invincible base, 1-5x, unlimited credits, all tier-4).
- Title screen (Play / Archives / Medals / Settings / Account), briefing with Heroic toggle, victory/defeat screens with medals, pixel-iris transitions, campaign-ending cinematic.
- Save schema v3 (tech tree, per-level Jedi Master wins) with migration and merge rules; sim snapshot v3.

**Verified (how)**
- `npm test`: 56 tests, incl. new `tests/phase3.test.mjs` (80 stars, tech budget and per-planet affordability, buy/refund cascade, tech mods + tier-4 lock in the sim and across snapshots, Sandbox rules, v2 -> v3 migration, tech merge, achievements awarded once, Heroic sets valid, archive covers every unit).
- Art lint: 1042 frames (adds medals + cruiser), 0 orphan pixels; planet/cruiser/medal/nebula previews rendered and reviewed (planet textures smoothed, cruiser redrawn, nebula alpha bug fixed).
- Browser pane (desktop Chromium): galaxy map, planet view, tech terminal, medals + stats, archives (all three tabs), title, Heroic briefing, Sandbox with boss spawns, campaign ending, result screen with 5 medals; no console errors after fixes.
- Headless: normal, Heroic and Sandbox games run 480 frames each with no errors.
- Balance unchanged: bots/report run with `tech: null`, identical to the Phase 2 report.

**Not verified, needs Andrew**
- Feel of the galaxy zoom, cruiser flight and iris transition at full frame rate on iPhone (the browser pane throttles animation in the background, so I checked end states).
- Whether the tech stat bonuses make later levels too easy once the tree is full (the bots measure the base game only).
- Heroic difficulty: the balanced bot does not win Jedi Master anywhere, so Heroic replays are untested for winnability.

## 2026-10-29 — Phase 4 (account, sync, PWA) — complete, STOP for review

**Done**
- Supabase cloud sync (`src/save/cloud.js`): login (username -> `username@republic-frontline.invalid`, or a full email), persistent session, download + merge on launch and login, uploads after levels / tech changes / on hide / every 60 s when dirty, offline-safe. Sync indicator on the title screen, in Settings and on the Account screen.
- Account screen with a native username/password form over the canvas; no sign-up anywhere.
- `supabase/schema.sql`: `saves` table, RLS on, select/insert/update own row only, nothing for `anon`.
- `src/config.js` (empty URL/key = local-only), `vendor/supabase.js` (supabase-js 2.117.3 UMD, pinned).
- PWA: `manifest.webmanifest`, iOS head tags, icons exported from the art code (`tools/export-icons.mjs`), `sw.js` (cache-first game, network-only Supabase, versioned cache, update toast), `tools/build-precache.mjs`.
- IndexedDB open timeout -> localStorage fallback (boot can no longer hang on a stuck database).
- Full README: GitHub Pages deploy, Supabase setup step by step, password resets, free-tier pausing, Add to Home Screen.

**Verified (how)**
- `npm test`: 64 tests, incl. `tests/cloud.test.mjs` (login mapping; pull merges cloud into local and uploads the result; first login uploads local progress; network errors keep the local save and report OFFLINE; not-configured stays local) and `tests/pwa.test.mjs` (every game file precached and every precached file exists, manifest fields + icon sizes, iOS tags, no service-role key).
- Desktop Chromium (browser pane, `?sw=1`): the service worker installs and caches 76 files; with the dev server stopped the game still boots into Geonosis 2 (served from cache); after changing a file and rebuilding the precache, the "UPDATE AVAILABLE - TAP TO RELOAD" toast appeared, tapping it activated the new worker, deleted the old cache and reloaded.
- Account screen: "not set up" and login-form states render; the form only shows on that screen.
- Supabase email format: checked against the Auth server source (see DECISIONS).

**Not verified, needs Andrew**
- Login and sync against a real Supabase project: no project or keys were provided, so it is unverified end to end (only against a fake client in tests). Follow README "Cloud sync with Supabase", then log in on phone and desktop.
- PWA install from Safari, launch without browser chrome, airplane mode (needs the HTTPS deploy on a real iPhone).
- Push from GitHub Desktop (commits and tags `phase-0`..`phase-4` are local).
