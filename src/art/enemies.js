// Enemy frame builders: walk cycles, mirrored facings, hit-flash, death
// sequences with spark overlays, fighter rotations and ground shadows.

import { Bitmap, blit, fromMap, mirrorX, recolor, silhouette, bounds } from './bitmap.js';
import { rotations } from './rotsprite.js';
import { LEGEND } from './palettes.js';
import { TROOPER_DROID, RUSH_DROID, SCUTTLER, SHIELD_DROID, STRIKE_FIGHTER } from './sprites/enemies.js';

export const ENEMY_INFO = {
  trooper: { name: 'Trooper Droid', role: 'Ground · Unarmored · Basic infantry' },
  rush: { name: 'Rush Droid', role: 'Ground · Unarmored · Fast, fragile' },
  scuttler: { name: 'Scuttler', role: 'Ground · Unarmored · Swarms of 15-40' },
  shield: { name: 'Shield Droid', role: 'Ground · Unarmored · Shield pool · Rolls, then deploys' },
  fighter: { name: 'Strike Fighter', role: 'Air · Unarmored · Fast, low HP' },
};

const SPARK_A = ['.#.', '#F#', '.#.'];
const SPARK_B = ['#F', 'F.'];
const SPARK_C = ['#', 'F'];

// swap near/far leg ramps for frame F3
function swapLegs(map) {
  const sw = { a: 'e', A: 'E', e: 'a', E: 'A', g: 'h', G: 'H', h: 'g', H: 'G' };
  return map.map((r) => r.replace(/[aAeEgGhH]/g, (c) => sw[c]));
}

function assembleWalker(def) {
  const upper = fromMap(def.upper);
  const [hx, hy] = def.hip;
  const L0 = fromMap(def.legs[0]);
  const L1 = fromMap(def.legs[1]);
  const legs = [L0, L1, mirrorX(L0), fromMap(swapLegs(def.legs[1]))];
  const bob = [1, 0, 1, 0];
  const w = Math.max(upper.w, hx + L0.w);
  const h = 1 + hy + L0.h;
  return legs.map((L, i) => {
    const bm = new Bitmap(w, h);
    // mirrored stride must keep the hip column in place
    const lx = i === 2 ? hx + (L0.w - 1) - (L0.w - 1) : hx;
    blit(bm, L, lx, 1 + hy);
    blit(bm, upper, 0, bob[i]);
    return bm;
  });
}

// Bottom-align a list of bitmaps onto a shared canvas.
function normalize(frames, w, h) {
  return frames.map((f) => {
    const bm = new Bitmap(w, h);
    blit(bm, f, 0, h - f.h);
    return bm;
  });
}

function sparkle(bm, points) {
  const out = bm.clone();
  for (const [kind, x, y] of points) blit(out, fromMap(kind === 'a' ? SPARK_A : kind === 'b' ? SPARK_B : SPARK_C), x, y);
  return out;
}

function deathSet(walk0, maps, sparks) {
  const d = maps.map((m) => fromMap(m));
  const flash = silhouette(walk0, '#ffffff');
  return [flash, sparkle(d[0], sparks[0]), sparkle(d[1], sparks[1]), d[2]];
}

function finish(walk, death) {
  const w = Math.max(...walk.map((f) => f.w), ...death.map((f) => f.w));
  const h = Math.max(...walk.map((f) => f.h), ...death.map((f) => f.h));
  const W = normalize(walk, w, h), D = normalize(death, w, h);
  return { w, h, walk: W, walkW: W.map(mirrorX), death: D, deathW: D.map(mirrorX) };
}

export function buildTrooperDroid() {
  const walk = assembleWalker(TROOPER_DROID);
  return finish(walk, deathSet(walk[0], TROOPER_DROID.death, [[['a', 9, 2], ['c', 2, 6]], [['b', 3, 7], ['c', 11, 9]]]));
}

export function buildRushDroid() {
  const walk = assembleWalker(RUSH_DROID);
  return finish(walk, deathSet(walk[0], RUSH_DROID.death, [[['a', 6, 1], ['c', 12, 8]], [['b', 9, 5]]]));
}

export function buildScuttler() {
  const walk = SCUTTLER.walk.map((m) => fromMap(m));
  return finish(walk, deathSet(walk[0], SCUTTLER.death, [[['c', 6, 1]], [['c', 2, 2]]]));
}

export function buildShieldDroid() {
  const roll = SHIELD_DROID.roll.map((m) => fromMap(m));
  const deploy = SHIELD_DROID.deploy.map((m) => fromMap(m));
  const walk = assembleWalker(SHIELD_DROID);
  const death = deathSet(walk[0], SHIELD_DROID.death, [[['a', 9, 5], ['c', 3, 2]], [['b', 7, 8]]]);
  const all = [...roll, ...deploy, ...walk, ...death];
  const w = Math.max(...all.map((f) => f.w)), h = Math.max(...all.map((f) => f.h));
  const base = finish(walk, death);
  const R = normalize(roll, w, h), Dp = normalize(deploy, w, h);
  return {
    ...base,
    walk: normalize(walk, w, h), walkW: normalize(walk, w, h).map(mirrorX),
    death: normalize(death, w, h), deathW: normalize(death, w, h).map(mirrorX),
    roll: R, rollW: R.map(mirrorX), deploy: Dp, deployW: Dp.map(mirrorX), w, h,
  };
}

// Fighters fly any heading: 16 RotSprite directions per thruster frame,
// plus a soft ground shadow (drawn offset below by the renderer).
export function buildStrikeFighter(dirs = 16) {
  const fly = STRIKE_FIGHTER.fly.map((m) => fromMap(m));
  const size = 20;
  const frames = fly.map((f) => rotations(f, dirs, 8, 6.5, size));
  const shadows = frames[0].map((f) => silhouette(f, '#000000', 80));
  // death: hit flash, then a tumbling spiral (rotation frames with damage tint)
  const burnt = recolor(fly[0], { [LEGEND.g]: LEGEND.h, [LEGEND.G]: LEGEND.H, [LEGEND.R]: LEGEND.q, [LEGEND.Q]: LEGEND.q });
  const tumble = [0, 3, 6, 9].map((d) => rotations(burnt, 16, 8, 6.5, size)[d]);
  const death = [silhouette(frames[0][0], '#ffffff'), ...tumble.map((t, i) => sparkle(t, i % 2 ? [['c', 6, 9]] : [['a', 9, 8]]))];
  return { frames, shadows, death, size, dirs };
}

export function trimmed(bm) {
  return bounds(bm);
}
