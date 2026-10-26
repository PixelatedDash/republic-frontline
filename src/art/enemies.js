// Enemy frame builders (2x detail): 6-frame walk cycles, mirrored facings,
// 6-frame death sequences with spark overlays, tread / thruster animation,
// fighter rotations (32 headings) and shadows.

import { Bitmap, blit, fromMap, mirrorX, recolor, silhouette, bounds, shift } from './bitmap.js';
import { rotations, hd } from './rotsprite.js';
import { LEGEND } from './palettes.js';
import * as D from './sprites/droids.js';
import * as OLD from './sprites/enemies.js'; // 1x death poses, upscaled with hd()

export const ENEMY_INFO = {
  trooper: { name: 'Trooper Droid', role: 'Ground · Unarmored · Basic infantry' },
  rush: { name: 'Rush Droid', role: 'Ground · Unarmored · Fast, fragile' },
  scuttler: { name: 'Scuttler', role: 'Ground · Unarmored · Swarms of 15-40' },
  shield: { name: 'Shield Droid', role: 'Ground · Unarmored · Shield pool · Rolls, then deploys' },
  fighter: { name: 'Strike Fighter', role: 'Air · Unarmored · Fast, low HP' },
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
