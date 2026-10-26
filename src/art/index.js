// Single entry point for all art. The game calls buildArt() at boot (behind
// the loading bar) and the export tools call the same function in Node, so
// the decks always show exactly the in-game pixels.

import { buildRifle, buildRocket, buildFlak, TIERS, TIER_NAMES } from './towers.js';
import { buildTrooperDroid, buildRushDroid, buildScuttler, buildShieldDroid, buildStrikeFighter, ENEMY_INFO } from './enemies.js';
import { buildKaminoTiles } from './tilemap.js';
import { buildVfx } from './vfx.js';
import { fromMap } from './bitmap.js';
import { REPUBLIC_EMBLEM, SEPARATIST_EMBLEM } from './sprites/emblems.js';

export function buildArt(onProgress = () => {}) {
  const steps = [
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
    ['emblems', () => ({ republic: fromMap(REPUBLIC_EMBLEM), separatist: fromMap(SEPARATIST_EMBLEM) })],
  ];
  const art = {};
  steps.forEach(([name, fn], i) => {
    art[name] = fn();
    onProgress((i + 1) / steps.length, name);
  });
  return art;
}

export { TIERS, TIER_NAMES, ENEMY_INFO };
