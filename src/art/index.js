// Single entry point for all art. The game calls buildArt() at boot (behind
// the loading bar) and the export tools call the same function in Node, so
// the decks always show exactly the in-game pixels.

import { buildRifle, buildRocket, buildFlak, buildRepeater, buildArtillery, buildIon, buildSharpshooter, buildDepot, TIERS, TIER_NAMES } from './towers.js';
import { buildTrooperDroid, buildRushDroid, buildScuttler, buildShieldDroid, buildStrikeFighter, ENEMY_INFO } from './enemies.js';
import * as E2 from './enemies.js';
import { buildTidebreaker, buildFoundry, buildReaper, buildDreadnought, buildWarlord, BOSS_INFO } from './bosses.js';
import { buildLandTiles } from './tilemap.js';
import { buildKaminoTiles } from './tilemap.js';
import { buildVfx, hologram } from './vfx.js';
import { fromMap, silhouette, mirrorX } from './bitmap.js';
import { rotations, hd } from './rotsprite.js';
import * as X from './sprites/extras.js';
import { REPUBLIC_EMBLEM, SEPARATIST_EMBLEM } from './sprites/emblems.js';

const TOWER_BUILDERS = {
  rifle: buildRifle, rocket: buildRocket, flak: buildFlak,
  repeater: buildRepeater, artillery: buildArtillery, ion: buildIon, sharpshooter: buildSharpshooter, depot: buildDepot,
};

function artSteps() {
  return [
    ['towers', () => {
      const t = {};
      for (const [k, fn] of Object.entries(TOWER_BUILDERS).slice(0, 3)) {
        t[k] = {};
        for (const tier of TIERS) t[k][tier] = fn(tier);
      }
      return t;
    }],
    ['towers2', (art) => {
      for (const [k, fn] of Object.entries(TOWER_BUILDERS).slice(3)) {
        art.towers[k] = {};
        for (const tier of TIERS) art.towers[k][tier] = fn(tier);
      }
      return true;
    }],
    ['enemies', () => ({
      trooper: buildTrooperDroid(),
      rush: buildRushDroid(),
      scuttler: buildScuttler(),
      shield: buildShieldDroid(),
      fighter: buildStrikeFighter(),
    })],
    ['enemies2', (art) => {
      Object.assign(art.enemies, {
        commando: E2.buildCommando(), tactical: E2.buildTactical(), tank: E2.buildHeavyTank(), carrier: E2.buildCarrier(),
        shieldwalker: E2.buildShieldWalker(), crawler: E2.buildCrawler(), siege: E2.buildSiegeWalker(),
        bomber: E2.buildBomber(), repair: E2.buildRepairDrone(),
      });
      return true;
    }],
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
    const v = fn(art);
    if (v !== true) art[name] = v;
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
    const v = steps[i][1](art);
    if (v !== true) art[steps[i][0]] = v;
    onProgress((i + 1) / steps.length, steps[i][0]);
  }
  return art;
}

// Per-planet art built on demand (when a level of that planet is opened):
// the land tileset and the planet's boss. Kamino's tiles are always built.
const BOSS_BUILDERS = { tidebreaker: buildTidebreaker, foundry: buildFoundry, reaper: buildReaper, dreadnought: buildDreadnought, warlord: buildWarlord };
export const PLANET_BOSS = { kamino: 'tidebreaker', geonosis: 'foundry', kashyyyk: 'reaper', umbara: 'dreadnought', mustafar: 'warlord' };
export function buildPlanetArt(planet) {
  const boss = PLANET_BOSS[planet];
  return { tiles: planet === 'kamino' ? null : buildLandTiles(planet), boss: { type: boss, art: BOSS_BUILDERS[boss]() } };
}

// Everything at once (deck export, lint).
export function buildArtPhase2() {
  const art = buildArt();
  const towers = Object.fromEntries(Object.keys(TOWER_BUILDERS).slice(3).map((k) => [k, art.towers[k]]));
  const enemies = Object.fromEntries(['commando', 'tactical', 'tank', 'carrier', 'shieldwalker', 'crawler', 'siege', 'bomber', 'repair'].map((k) => [k, art.enemies[k]]));
  const bosses = Object.fromEntries(Object.entries(BOSS_BUILDERS).map(([k, fn]) => [k, fn()]));
  const tiles = Object.fromEntries(['geonosis', 'kashyyyk', 'umbara', 'mustafar'].map((p) => [p, buildLandTiles(p)]));
  return { towers, enemies, bosses, tiles };
}

export { TIERS, TIER_NAMES, ENEMY_INFO, BOSS_INFO };
