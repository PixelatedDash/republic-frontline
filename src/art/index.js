// Single entry point for all art. The game calls buildArt() at boot (behind
// the loading bar) and the export tools call the same function in Node, so
// the decks always show exactly the in-game pixels.

import { buildRifle, buildRocket, buildFlak, TIERS, TIER_NAMES } from './towers.js';
import { buildTrooperDroid, buildRushDroid, buildScuttler, buildShieldDroid, buildStrikeFighter, ENEMY_INFO } from './enemies.js';
import { buildKaminoTiles } from './tilemap.js';
import { buildVfx, hologram } from './vfx.js';
import { fromMap, silhouette, mirrorX } from './bitmap.js';
import { rotations, hd } from './rotsprite.js';
import * as X from './sprites/extras.js';
import { REPUBLIC_EMBLEM, SEPARATIST_EMBLEM } from './sprites/emblems.js';

function artSteps() {
  return [
    ['towers', () => {
      const t = { rifle: {}, rocket: {}, flak: {} };
      for (const tier of TIERS) {
        t.rifle[tier] = buildRifle(tier);
        t.rocket[tier] = buildRocket(tier);
        t.flak[tier] = buildFlak(tier);
      }
      return t;
    }],
    ['enemies', () => ({
      trooper: buildTrooperDroid(),
      rush: buildRushDroid(),
      scuttler: buildScuttler(),
      shield: buildShieldDroid(),
      fighter: buildStrikeFighter(),
    })],
    ['tiles', () => ({ kamino: buildKaminoTiles() })],
    ['vfx', () => buildVfx()],
    ['emblems', () => ({ republic: hd(fromMap(REPUBLIC_EMBLEM)), separatist: hd(fromMap(SEPARATIST_EMBLEM)) })],
    ['extras', () => {
      const portrait = hd(fromMap(X.COMMANDER));
      return {
        rocket: rotations(hd(fromMap(X.ROCKET_PROJ)), 32, 7, 3, 18, 4),
        missile: rotations(hd(fromMap(X.MISSILE_PROJ)), 32, 6, 3, 18, 4),
        shell: hd(fromMap(X.FLAK_SHELL), false),
        portrait,
        hologram: hologram(portrait),
        flyby: rotations(hd(fromMap(X.FLYBY)), 16, 15, 11, 36, 4),
      };
    }],
  ];
}

export function buildArt(onProgress = () => {}) {
  const steps = artSteps();
  const art = {};
  steps.forEach(([name, fn], i) => {
    art[name] = fn();
    onProgress((i + 1) / steps.length, name);
  });
  return art;
}

// Browser boot: same work, yielding a frame between steps so the loading
// bar can paint.
export async function buildArtAsync(onProgress = () => {}) {
  const steps = artSteps();
  const art = {};
  for (let i = 0; i < steps.length; i++) {
    await new Promise((r) => setTimeout(r, 0));
    art[steps[i][0]] = steps[i][1]();
    onProgress((i + 1) / steps.length, steps[i][0]);
  }
  return art;
}

export { TIERS, TIER_NAMES, ENEMY_INFO };
