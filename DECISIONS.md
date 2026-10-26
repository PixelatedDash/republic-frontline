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
