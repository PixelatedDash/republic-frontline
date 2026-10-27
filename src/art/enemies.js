// Enemy frame builders (2x detail): 6-frame walk cycles, mirrored facings,
// 6-frame death sequences with spark overlays, tread / thruster animation,
// fighter rotations (32 headings) and shadows.

import { Bitmap, blit, fromMap, mirrorX, recolor, silhouette, bounds, shift } from './bitmap.js';
import { rotations, hd } from './rotsprite.js';
import { LEGEND } from './palettes.js';
import * as D from './sprites/droids.js';
import * as OLD from './sprites/enemies.js'; // 1x death poses, upscaled with hd()
import * as D2 from './sprites/droids2.js';

export const ENEMY_INFO = {
  trooper: { name: 'Trooper Droid', role: 'Ground · Unarmored · Basic infantry' },
  rush: { name: 'Rush Droid', role: 'Ground · Unarmored · Fast, fragile' },
  scuttler: { name: 'Scuttler', role: 'Ground · Unarmored · Swarms of 15-40' },
  shield: { name: 'Shield Droid', role: 'Ground · Unarmored · Shield pool · Rolls, then deploys' },
  fighter: { name: 'Strike Fighter', role: 'Air · Unarmored · Fast, low HP' },
  commando: { name: 'Commando Droid', role: 'Ground · Armored · Tough, low HP for armor' },
  tank: { name: 'Heavy Tank', role: 'Ground · Armored · Slow, lifeCost 3' },
  shieldwalker: { name: 'Shield Walker', role: 'Ground · Armored · Shield pool · Bubbles allies' },
  carrier: { name: 'Droid Carrier', role: 'Ground · Armored · Splits into 6 Scuttlers' },
  bomber: { name: 'Bomber Gunship', role: 'Air · Armored · Drops 3 Trooper Droids' },
  crawler: { name: 'Crawler Walker', role: 'Ground · Armored · Shield pool · Multi-legged' },
  repair: { name: 'Repair Drone', role: 'Air · Unarmored · Heals nearby droids' },
  siege: { name: 'Siege Walker', role: 'Ground · Armored · Elite, lifeCost 5' },
  tactical: { name: 'Tactical Droid', role: 'Ground · Unarmored · Shield pool · +20% speed aura' },
};

const SPARK_A = ['..#..', '.#F#.', '#FFF#', '.#F#.', '..#..'];
const SPARK_B = ['#F.', 'FF#', '.#.'];
const SPARK_C = ['#', 'F', 'f'];

export const WALK_FRAMES = 6;
const BOB = [0, 1, -1, 0, 1, -1];

function assembleWalker(def) {
  const upper = fromMap(def.upper);
  const [hx, hy] = def.hip;
  const poses = def.legs.map((m) => fromMap(m));
  const legs = [...poses, ...poses.map(mirrorX)];
  const w = Math.max(upper.w, hx + poses[0].w);
  const h = 2 + hy + poses[0].h;
  return legs.map((L, i) => {
    const bm = new Bitmap(w, h);
    blit(bm, L, hx, 1 + hy + 1);
    blit(bm, upper, 0, 1 + BOB[i] + 1);
    return bm;
  });
}

function normalize(frames, w, h) {
  return frames.map((f) => {
    const bm = new Bitmap(w, h);
    blit(bm, f, (w - f.w) >> 1, h - f.h);
    return bm;
  });
}

function sparkle(bm, points) {
  const out = bm.clone();
  for (const [kind, x, y] of points) blit(out, fromMap(kind === 'a' ? SPARK_A : kind === 'b' ? SPARK_B : SPARK_C), x, y);
  return out;
}

// flash -> recoil (sparks) -> stagger -> falling -> collapsed -> debris
function deathSet(walk0, maps1x, sparks) {
  const [stagger, collapsed, debris] = maps1x.map((m) => hd(fromMap(m)));
  const flash = silhouette(walk0, '#ffffff');
  const recoil = sparkle(shift(walk0, -2, 1), sparks[0]);
  const falling = sparkle(shift(stagger, -1, 3), sparks[1]);
  return [flash, recoil, sparkle(stagger, sparks[1]), falling, collapsed, debris];
}

function finish(walk, death, extra = []) {
  const all = [...walk, ...death, ...extra];
  const w = Math.max(...all.map((f) => f.w));
  const h = Math.max(...all.map((f) => f.h));
  const W = normalize(walk, w, h), Dd = normalize(death, w, h);
  return { w, h, walk: W, walkW: W.map(mirrorX), death: Dd, deathW: Dd.map(mirrorX) };
}

export function buildTrooperDroid() {
  const walk = assembleWalker(D.TROOPER_DROID);
  return finish(walk, deathSet(walk[0], OLD.TROOPER_DROID.death, [[['a', 18, 6], ['c', 6, 14]], [['b', 8, 14], ['c', 22, 18]]]));
}

export function buildRushDroid() {
  const walk = assembleWalker(D.RUSH_DROID);
  return finish(walk, deathSet(walk[0], OLD.RUSH_DROID.death, [[['a', 14, 2], ['c', 24, 14]], [['b', 18, 10]]]));
}

export function buildScuttler() {
  const body = fromMap(D.SCUTTLER.body);
  const poses = D.SCUTTLER.legs.map((m) => fromMap(m));
  const legs = [...poses, ...poses.map(mirrorX).reverse()];
  const walk = legs.map((L, i) => {
    const bm = new Bitmap(16, 13);
    blit(bm, L, 0, 9);
    blit(bm, body, 0, i % 3 === 1 ? 2 : 1);
    return bm;
  });
  return finish(walk, deathSet(walk[0], OLD.SCUTTLER.death, [[['c', 12, 2]], [['c', 4, 4]]]));
}

export function buildShieldDroid() {
  const S = D.SHIELD_DROID;
  const sled = fromMap(S.roll);
  // treads: shift the hand-placed tread rows 1px per frame
  const roll = [0, 1, 2, 3].map((f) => {
    const bm = new Bitmap(26, sled.h + S.tread.length + 2);
    blit(bm, sled, 0, 2);
    const t = S.tread.map((r, i) => (i < 2 ? r[0] + rot(r.slice(1, -1), f) + r[r.length - 1] : r));
    blit(bm, fromMap(t), 0, 2 + sled.h - 1);
    return bm;
  });
  const walk = assembleWalker(S);
  const deploy = [hd(fromMap(OLD.SHIELD_DROID.deploy[0])), walk[1]];
  const death = deathSet(walk[0], OLD.SHIELD_DROID.death, [[['a', 18, 10], ['c', 6, 4]], [['b', 14, 16]]]);
  const base = finish(walk, death, [...roll, ...deploy]);
  const R = normalize(roll, base.w, base.h), Dp = normalize(deploy, base.w, base.h);
  return { ...base, roll: R, rollW: R.map(mirrorX), deploy: Dp, deployW: Dp.map(mirrorX) };
}

function rot(str, n) {
  n %= str.length;
  return str.slice(str.length - n) + str.slice(0, str.length - n);
}

// Fighters fly any heading: 32 RotSprite directions per thruster frame,
// plus a ground shadow (drawn offset below by the renderer).
export const FIGHTER_DIRS = 32;
export function buildStrikeFighter(dirs = FIGHTER_DIRS) {
  const top = D.FIGHTER_TOP;
  const shade = { g: 'G', G: 'h', h: 'H', H: 'H' };
  const bottom = top.slice(0, -1).reverse().map((r) => r.replace(/[gGhH]/g, (c) => shade[c]));
  const hull = fromMap([...top, ...bottom]);
  const cy = top.length - 1;
  const fly = D.FLAMES.map((fl) => {
    const bm = new Bitmap(hull.w + 5, hull.h);
    blit(bm, hull, 5, 0);
    for (const dy of [-2, 0, 2]) blit(bm, fromMap(fl), 0, cy - 1 + dy);
    return bm;
  });
  const size = 40;
  const px = 5 + hull.w * 0.45, py = cy + 0.5;
  const frames = fly.map((f) => rotations(f, dirs, px, py, size, 4));
  const shadows = frames[0].map((f) => silhouette(f, '#000000', 80));
  const burnt = recolor(fly[0], { [LEGEND.g]: LEGEND.h, [LEGEND.G]: LEGEND.H, [LEGEND.R]: LEGEND.q, [LEGEND.Q]: LEGEND.q });
  const spin = rotations(burnt, 8, px, py, size, 4);
  const tumble = [0, 2, 4, 6, 7].map((d) => spin[d]);
  const death = [silhouette(frames[0][0], '#ffffff'), ...tumble.map((t, i) => sparkle(t, i % 2 ? [['c', 14, 18]] : [['a', 18, 16]]))];
  return { frames, shadows, death, size, dirs };
}

export function trimmed(bm) {
  return bounds(bm);
}

// ------------------------------------------------------------ Phase 2 ----
// Map-level palette swap (tan -> steel), used to give the Commando and
// Tactical droids the Trooper Droid's leg poses in their own armor.
const TAN_TO_STEEL = { a: 'g', A: 'G', e: 'h', E: 'H' };
const steelMap = (rows) => rows.map((r) => r.replace(/[aAeE]/g, (c) => TAN_TO_STEEL[c]));
// Stretch a leg pose by repeating two of its shin rows (taller droid).
const stretch = (rows, at) => rows.flatMap((r, i) => (at.includes(i) ? [r, r] : [r]));

const deathFrom = (walk0, maps, sparks) => deathSet(walk0, maps, sparks);

export function buildCommando() {
  const def = { ...D2.COMMANDO, legs: D.TROOPER_DROID.legs.map(steelMap) };
  const walk = assembleWalker(def);
  return finish(walk, deathFrom(walk[0], D2.COMMANDO.death, [[['a', 16, 4], ['c', 6, 16]], [['b', 10, 12], ['c', 22, 18]]]));
}

export function buildTactical() {
  const def = { ...D2.TACTICAL, legs: D.TROOPER_DROID.legs.map((m) => stretch(steelMap(m), [5, 10])) };
  const walk = assembleWalker(def);
  return finish(walk, deathFrom(walk[0], D2.TACTICAL.death, [[['a', 16, 6], ['c', 6, 18]], [['b', 10, 14], ['c', 24, 20]]]));
}

function walkerFrom(def, sparks) {
  const walk = assembleWalker(def);
  return finish(walk, deathFrom(walk[0], def.death, sparks));
}
// Quadruped: two leg pairs (the droid leg poses in steel), the front pair
// half a cycle ahead of the back pair.
export function buildShieldWalker() {
  const S = D2.SHIELD_WALKER;
  const upper = fromMap(S.upper);
  const poses = D.TROOPER_DROID.legs.map((m) => fromMap(steelMap(m)));
  const cyc = [...poses, ...poses.map(mirrorX)];
  const lh = cyc[0].h;
  const walk = cyc.map((_, i) => {
    const bm = new Bitmap(upper.w + 4, S.hip[1] + lh + 3);
    blit(bm, cyc[(i + 3) % 6], 8, S.hip[1] + 2);
    blit(bm, cyc[i], -4, S.hip[1] + 2);
    blit(bm, upper, 0, 1 + BOB[i] + 1);
    return bm;
  });
  return finish(walk, deathFrom(walk[0], S.death, [[['a', 20, 8], ['c', 8, 20]], [['b', 14, 14], ['c', 30, 22]]]));
}
export function buildCrawler() { return walkerFrom(D2.CRAWLER, [[['a', 24, 2], ['c', 8, 8]], [['b', 16, 4], ['c', 32, 10]]]); }
export function buildSiegeWalker() { return walkerFrom(D2.SIEGE_WALKER, [[['a', 22, 8], ['c', 10, 20]], [['b', 16, 12], ['a', 30, 4]]]); }

// Tracked tank: tread rows roll 1px per frame (4 frames), hull bobs on 2.
export function buildHeavyTank() {
  const T = D2.HEAVY_TANK;
  const turret = fromMap(T.turret), hull = fromMap(T.hull);
  const W = Math.max(turret.w + 4, hull.w), H = turret.h + hull.h + T.tread.length - 1;
  const walk = [0, 1, 2, 3].map((f) => {
    const bm = new Bitmap(W, H + 1);
    const bob = f % 2;
    const tread = T.tread.map((r, i) => (i < 2 ? r[0] + rot(r.slice(1, -1), f) + r[r.length - 1] : r));
    blit(bm, fromMap(tread), 0, H + 1 - tread.length);
    blit(bm, hull, 0, turret.h - 1 + bob);
    blit(bm, turret, 4, bob);
    return bm;
  });
  return finish(walk, deathFrom(walk[0], T.death, [[['a', 30, 6], ['c', 12, 10]], [['b', 20, 8], ['a', 6, 2]]]));
}

// Wheeled carrier: 2 spoke frames, slight hull bounce.
export function buildCarrier() {
  const C = D2.CARRIER;
  const hull = fromMap(C.hull);
  const wheels = C.wheel.map((m) => fromMap(m));
  const walk = [0, 1, 2, 3].map((f) => {
    const bm = new Bitmap(hull.w, hull.h + 6);
    blit(bm, hull, 0, f === 2 ? 1 : 0);
    for (const x of C.wheelX) blit(bm, wheels[f % 2], x, hull.h - 4);
    return bm;
  });
  return finish(walk, deathFrom(walk[0], C.death, [[['a', 24, 4], ['c', 8, 10]], [['b', 16, 6], ['c', 30, 12]]]));
}

// Air units: mirrored top-down hull + thruster frames -> 32 headings.
function airHull(top, flames, size, pivotFrac = 0.45) {
  const shade = { g: 'G', G: 'h', h: 'H', H: 'H', a: 'A', A: 'e', e: 'E', E: 'E' };
  const bottom = top.slice(0, -1).reverse().map((r) => r.replace(/[gGhHaAeE]/g, (c) => shade[c]));
  const hull = fromMap([...top, ...bottom]);
  const cy = top.length - 1;
  const fly = flames.map((fl) => {
    const bm = new Bitmap(hull.w + 5, hull.h);
    blit(bm, hull, 5, 0);
    for (const dy of [-(cy - 5), cy - 5]) blit(bm, fromMap(fl), 0, cy - 1 + dy);
    return bm;
  });
  const px = 5 + hull.w * pivotFrac, py = cy + 0.5;
  return { fly, px, py, size };
}
export function buildBomber(dirs = FIGHTER_DIRS) {
  const { fly, px, py, size } = airHull(D2.BOMBER_TOP, D2.BOMBER_FLAMES, 56);
  const frames = fly.map((f) => rotations(f, dirs, px, py, size, 4));
  const shadows = frames[0].map((f) => silhouette(f, '#000000', 80));
  const burnt = recolor(fly[0], { [LEGEND.g]: LEGEND.h, [LEGEND.G]: LEGEND.H, [LEGEND.a]: LEGEND.e, [LEGEND.A]: LEGEND.E, [LEGEND.R]: LEGEND.q, [LEGEND.Q]: LEGEND.q });
  const spin = rotations(burnt, 8, px, py, size, 4);
  const death = [silhouette(frames[0][0], '#ffffff'), ...[0, 2, 4, 6, 7].map((d, i) => sparkle(spin[d], i % 2 ? [['c', 20, 26]] : [['a', 26, 22]]))];
  return { frames, shadows, death, size, dirs };
}

// Repair drone: 2 rotor-blur frames, 32 headings.
export function buildRepairDrone(dirs = FIGHTER_DIRS) {
  const srcs = D2.REPAIR_DRONE.map((m) => fromMap(m));
  const size = 30;
  const px = srcs[0].w / 2, py = srcs[0].h / 2;
  const frames = srcs.map((f) => rotations(f, dirs, px, py, size, 4));
  const shadows = frames[0].map((f) => silhouette(f, '#000000', 80));
  const burnt = recolor(srcs[0], { [LEGEND.g]: LEGEND.h, [LEGEND.G]: LEGEND.H, [LEGEND.F]: LEGEND.q, [LEGEND.f]: LEGEND.q, [LEGEND.Q]: LEGEND.q });
  const spin = rotations(burnt, 8, px, py, size, 4);
  const death = [silhouette(frames[0][0], '#ffffff'), ...[0, 2, 4, 6, 7].map((d, i) => sparkle(spin[d], i % 2 ? [['c', 10, 14]] : [['b', 14, 10]]))];
  return { frames, shadows, death, size, dirs };
}
