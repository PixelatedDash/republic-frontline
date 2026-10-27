# Decisions

Judgment calls where the spec was silent or ambiguous. One line each, with the reason.

## Phase 0
- **Project location:** `republic-frontline/` subfolder of the existing workspace, its own git repo — the workspace root already held an unrelated project (Andrew's choice).
- **Pinned tools:** `@napi-rs/canvas@1.0.9` (Sep 9 2026, ~6 weeks old) and `pptxgenjs@4.0.1`. `npm audit` flags `image-size` (a pptxgenjs dependency) for DoS on malformed images; accepted because it only ever reads our own generated PNGs, dev-time only.
- **Deck format:** each slide is one 1920×1080 PNG composed in Node, placed on a 20×11.25 in layout (1920/96) so every pixel is native size. Labels are drawn in the game's own pixel font so `art-preview/slides/*.png` are complete on their own (they are the source of truth).
- **Deck has 15 slides:** the 9 spec items, with towers split into one slide each, droids split in two, VFX split in two, UI split in two.
- **Tower footprints:** Rocket Team and Flak Turret are 1×1 (spec only fixes Rifle Squad and Supply Depot at 2×2).
- **Republic hardware look:** 1×1 tower bases use the white clone-armor ramp with the tower's unit stripe, so they pop off Kamino's gray platforms and read as one faction with the troopers. Stripe colors: Rifle slate blue, Rocket olive, Flak brick, Elite dull gold, Marksman sage.
- **Droid shields are violet**, not blue: blue is Republic, red/orange is Separatist, white-blue is ion. Violet keeps all four energy types distinct.
- **Clone helmet:** domed, center crest painted in the unit stripe, wraparound visor band (no T-visor, no mouth grill).
- **Trooper facings:** 8 directions (5 hand-authored: E, SE, S, NE, N; W/SW/NW mirrored). Spec allows hand-authored key directions + mirrors; 8 is plenty for 9-px troopers.
- **Ground droids face E/W only** (side view, mirrored), the common TD convention; air units get 16 RotSprite headings.
- **Walk cycles:** 4 frames — F0 stride and F1 passing are hand-placed; F2 = mirrored stride, F3 = passing with near/far leg ramps swapped. Upper body bobs 1 px.
- **Death sequence (all droids):** white hit-flash → sparking stagger → collapsed → debris (fades in game).
- **Shield Droid design:** rolls on a low twin-tread sled, then unfolds into a slow biped carrying a hex-emitter plate. Deliberately not a ball/wheel form.
- **Strike Fighter:** forward-swept crescent wing around a central pod with one red sensor, twin orange thrusters.
- **Turret heads:** assembled from hand-placed parts (housing, barrel, tube, pod, optic) then outlined, so tiers share a consistent style; muzzle points are found automatically from the head pixels.
- **Rocket/Flak muzzle flash is fire-colored;** blaster flashes are blue.
- **Kamino platforms:** mid-gray riveted plates (not white) so white armor and tan droids stay readable; walkway grating is the path; platform edges show stilts into the surf; bridges show a truss.
- **UI reference size for mocks:** iPhone 12 landscape (S=4 → 633×292 art px, min tap target 33 art px = 44 CSS px), because the game is iPhone-first. Desktop 1080p uses the 480×270 view.
- **Build-bar hotkeys: Q–I** (spec asks to pick one scheme). The number row can't be used because 1/2/3 are speed keys. Logged now so Phase 1 follows it.
- **Phase 0 mockup map** lives in `tools/art/kamino-mock-map.mjs` (art preview only); real level layouts come from `src/data/levels` in Phase 1.
- **App icon concept:** Republic kite-shield emblem on a beveled storm-blue plate with a pixel-ring glow; maskable variant is full-bleed with the emblem inside the 80% safe zone.

## Phase 1
- **Pause on hidden tab:** the game auto-pauses when the page is hidden (visibilitychange) so a phone call or app switch never costs lives.
- **Speed = more 60 Hz steps per frame,** capped at 4 x speed steps per frame; any backlog beyond that is dropped (no spiral).
- **Wave end** (interest, autosave) = a wave has finished spawning and every droid from it is dead or leaked; early-called waves overlap, each pays when it resolves.
- **Shield Droid rolls with its shield down**: damage while rolling hits the body and triggers deployment. Counterplay for the tutorial lesson "hit them while they roll".
- **Tier-4 branches are all available in Phase 1;** the tech tree gating arrives in Phase 3.
- **All three slice towers are unlocked on Kamino 1;** the unlock schedule across Kamino/Geonosis is set in Phase 2.
- **Narrow windows:** S is also capped so the UI view is at least 320 px wide (only binds on portrait desktop windows; landscape screens unchanged).
- **Mid-wave tutorial messages pause the action** ("tactical pause") until handled; building stays possible.
- **Sell asks for a second tap** (prevents accidental sells on touch). The info panel has no close button: tapping the map deselects.
- **Dev server:** `tools/serve.mjs` (no-cache headers; `--lan` for phone testing) instead of `npx serve`, so edits always show on reload.

## 2x detail (Andrew's request during Phase 1: "higher pixel density, smoother, across the whole project")
- **World art is 2x detail:** tiles 32x32, all pixel-valued data doubled (ranges, speeds, splash, radii). Bot results were bit-identical before/after, so balance is unchanged.
- **Two integer scales:** UI scale S = largest integer with floor(dh/S) >= 260 (spec rule; UI art and fonts stay at this scale for legibility). World scale SW = same rule at 520. 2x sprites inside the UI draw at HI = round(S/2). Spec §4's single S is split; this is the deliberate deviation that delivers the requested density.
- **Hand-placed at 2x:** troopers (5 facings), sandbag pieces, plates, all droid bodies, 6-frame walk poses (drafted from joint positions with a scratch line tool, then frozen as literal maps), Kamino tiles. **Upscaled from hand-placed 1x parts** (Scale2x + 1px outline thinning + top-left rim light): turret parts and bases, props, icons, emblems, portrait, flyby, death poses. Characters lose detail under upscaling, so they were redrawn.
- **More frames:** 6-frame walks and deaths, trooper breathing + recoil frames, 4-frame treads, 3-frame thrusters, 8-frame water, 10/12/15-frame explosions, 8-frame smoke, 6-frame shield ripple, 2-frame muzzle flashes.
- **32 directions** for turret heads, fighters, bolts and projectiles (RotSprite with 4x sampling for 2x sprites, circle culling, cached upscales; whole art build ~0.2 s in Node). Turrets turn toward targets at a fixed visual rate instead of snapping.
- **Camera:** 120 ms eased zoom between integer scales (spec allows it), pan momentum after a swipe; integer scale at rest.
- **Damage numbers draw in the UI layer** so they stay legible at any world zoom.
- **Deck export at 2x:** sprite strips at 2x (same physical size as 4x of the old art); mockup / readability / HUD slides are frames from the real GameScreen running headless (tools/art/headless.mjs); the iPhone frames are shown at exactly half size (lossless because all scales on that screen are even).

## Phase 2 (art checkpoint)
- **Spec copy:** the original build prompt was no longer in Downloads; it was recovered verbatim from the session transcript into `docs/spec-v2.md` (git-ignored, because the repo is public).
- **Footprints:** Repeater, Artillery, Ion and Sharpshooter are 1x1 like Rocket/Flak; Supply Depot is 2x2 (spec).
- **New unit stripes:** Repeater teal, Artillery umber, Ion indigo, Sharpshooter plum, Depot mustard, Armor Breaker dusty rose. Artillery T1/T2 cradles are painted in the stripe color so field guns read differently from the Repeater at a glance.
- **Repeater spin-up:** the rotary bundle has 2 spin frames (grooves alternate rows); the game cycles them faster as it spins up.
- **Ion tier 4 does not aim:** Ion Arc (chain mast) and Pulse Dome are static emitters whose ion pixels pulse (4-frame palette step on the ion ramp only); arcs / pulses originate at an `emit` point.
- **Sharpshooter Post:** a watchtower with one 2x marksman between back/front layers (same system as the Rifle nest); Rail Marksman uses a rail rifle (long rifle with ion accelerator coils). Armor Breaker adds a spotter scope and a pennant.
- **Commando / Tactical legs** reuse the Trooper Droid leg poses palette-swapped to steel (Tactical's are stretched by repeating two shin rows); their upper bodies are new. Tactical has a maroon command torso so it never reads as a Commando.
- **Shield Walker** is a quadruped built from two droid leg pairs, the front pair half a cycle ahead.
- **Vehicles** (Heavy Tank, Carrier, Foundry, Reaper) animate running gear: tread rows roll 1px per frame, Carrier wheels have 2 spoke frames.
- **Bosses are hand-placed at 1x and upscaled** (Scale2x + outline thinning + rim light), like turret parts: at 48-96 px (1x) they keep their detail, and hand-placing 100-190 px maps at 2x was not a good use of the budget. Phase changes are overlays; weak points (Foundry vents) are separate sprites with positions.
- **Boss deaths** are flash -> burning (scorch palette swap + hand-placed flame tufts) -> wreck; the big explosion is the runtime VFX.
- **Tidebreaker entrance** is 8 reveal frames with foam at the waterline (frame assembly from the walk frame).
- **Planet hazards:** Geonosis canyon chasm, Kashyyyk misty ravine, Umbara swamp, Mustafar lava; all 8 frames like the Kamino sea. One shared autotiler (`renderLand`) handles ground / rough / path / hazard / bridge for the four land planets.
- **Night outline (Umbara):** dark steel droids vanished on near-black ground, so on Umbara unit outlines that border transparency take a cool moonlit tone (`nightRim`). Spec says visibility is visual only; this keeps every silhouette readable.
- **Stray pixels from upscaling:** `hd()` now ends with the same orphan-pixel cleanup RotSprite uses (Phase 1 art had none, so it is unchanged); lint now covers 982 frames including all Phase 2 art.
- **Boot cost:** Phase 2 art builds in ~0.5 s (Node and desktop Chrome) on top of Phase 1's 0.2 s. When wiring in, build each planet's tiles and boss only when that planet is entered.

## Phase 2 (full content)
- **Tower stats:** Repeater is a short-range ground blaster whose rate ramps from 30% to 100% over ~1.5 s on target; Suppression Gun hits slow 30% for 0.8 s (slow cap 50%). Artillery fires lobbed, non-homing shells at the target's predicted spot (min range 64-72 px); Barrage fires 4 scattered shells; Siege Howitzer impacts are "large" (big shake). Ion bolts stun (0.5-0.7 s base, spec diminishing returns); Ion Arc chains to 4 droids at 80% damage per jump; Pulse Dome hits everything in range (ground and air) every 2.2 s. Sharpshooter shots are instant hitscan with a tracer; Rail Marksman pierces up to 5 droids on the line; Armor Breaker sets the target's armor multiplier to at least 1.25 for 4 s (non-stacking slot, also cracks the Reaper shell).
- **Supply Depot** income is paid together with interest at each wave end; the Command Relay aura (+15% fire rate, 112 px) is non-stacking like every other aura.
- **Shield Walker bubble** is a separate outer pool (50 pts, refills 12/s) that uses the Shield damage column; strongest walker in range wins; leaves when the ally walks out of range.
- **Tactical speed aura** (+20%) and **Repair Drone heal** (10 HP/s) are non-stacking (strongest source) and never apply to their source.
- **Splits and drops join the wave**: Carrier Scuttlers, Bomber troopers and boss spawns add to the source wave, so it cannot end (and pay interest) before they are resolved.
- **Bomber troopers land on the nearest stretch of road, but never in its last third** - shooting a bomber down near the exit should not be an instant leak.
- **Bosses:** a boss's leak costs the difficulty's boss leak (spec table); bosses are not scaled by the Jedi Master +20% count. Foundry vents are separate targetable entities (unarmored, 450 HP each, small bounty) riding on the boss; each lost vent stretches the spawn interval by 70%. Reaper phase 2 switches the body class to `shell` (Blaster/Ion 20%, Explosive 150%, Piercing 175%). Warlord: phase 2 at 66% adds a 2000-point regenerating shield, phase 3 at 33% drops the armor, speeds up 50% and calls minions every 5 s. Dreadnought: bombers every 14 s, lights-out every 16 s (towers within 200 px: range -20% for 4 s, drawn dimmed).
- **Boss entrance:** ~3 s letterboxed pan + siren + name card, sim paused, any tap/key skips; the boss music track takes over and the planet track returns when the boss dies.
- **Levels:** 5 planets x 4 maps on a 48x28 grid. Kamino maps are platforms over the sea; land planets are ground with hazard rectangles (chasm / ravine / swamp / lava) and rough patches; any path tile over a hazard becomes a bridge. 7 maps have several entry points (spec asks for 4).
- **Waves:** written by hand as recipes (droid mix and order per wave); a composer turns them into counts with a fixed curve so balance is one number per level (see BALANCE.md). Tuning by HP scale, not counts: counts also scale bounties, which made difficulty non-monotonic.
- **Unlock schedule:** Kamino 1 rifle/rocket/flak, Kamino 2 +repeater, Kamino 3 +ion, Kamino 4 +artillery, Geonosis 1 +sharpshooter, Geonosis 2 +depot (all 8 by Geonosis 2, spec says by Geonosis 4). Enemy introductions: Geonosis commando/tank/bomber, Kashyyyk carrier/crawler/repair, Umbara shield walker/tactical, Mustafar siege walker.
- **Level select:** a simple campaign screen (5 columns x 4 levels, unlocked by winning the previous level, stars shown) stands in until the galaxy map in Phase 3. `?unlock=1` opens every level, `?skip=<level-id>` jumps into one.
- **Art loading:** towers and droids build at boot; each planet's land tiles, props and boss build the first time one of its levels (or briefings) opens, then stay cached.
- **Umbara night:** world drawn under a 42% dark overlay with additive light pools at every tower and energy glows on top; droids use the night outline. Weather per planet: Kamino rain + lightning, Geonosis blowing dust with storm haze, Kashyyyk falling leaves + mist tint, Umbara glowing spores, Mustafar rising embers + eruption glow.
- **Music:** four new planet tracks (Geonosis march in E, Kashyyyk wooded A minor, Umbara sparse C minor, Mustafar heavy D minor) with the same base/mid/high layers.
- **Sharpshooter re-priced after the spam gate:** spamming tier-I/II Sharpshooters won 7 late levels outright (piercing does 175% to armor, it hits air, and 7 tiles of range covered most of a route). Now a premium specialist: cost 240 / +200 / +290 / +450, range 180-240 px (was 224-300), slower and heavier shots (0.4-0.5/s, 42-125 dmg) so swarms are its weakness. The damage table itself is the spec's and unchanged.
- **Mustafar waves carry infantry:** Mustafar was almost all heavy armor, which a single-target armor killer trivialises. Most Mustafar waves now add Trooper / Rush escorts, and the Warlord's March adds Scuttler swarms and Carriers.
- **Bots:** coverage maps are precomputed per level; tower value = DPS x uptime (diminishing in covered path) x damage-type efficiency x splash x per-layer need (diminishing as that layer's DPS grows). No-upgrades bot = balanced placement with tier-1 only.
