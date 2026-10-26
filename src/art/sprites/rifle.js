// Clone Rifle Squad: 2x2 sandbag nest manned by troopers. The nest is split
// into a BACK layer (drawn before troopers) and a FRONT layer (after), so the
// front sandbags hide the troopers' legs. Walls are assembled from
// hand-placed sandbag pieces; tier dressing is hand-placed overlay maps.

import { Bitmap, blit, fromMap, rgba, fill } from '../bitmap.js';
import { hd } from '../rotsprite.js';

// Sandbag pieces at 2x detail: front face (stacked brickwork), top course,
// and side-wall bags seen from above. Seams and stitching are hand-placed.
const BAG_FACE = [
  '..kkkkkkkkkkkk..',
  '.kyyyyyyyyyyyYk.',
  'kyyyyyyyyyyyYYok',
  'kyyYYYYYYYYYYook',
  'kyYYYYYYYYYYYook',
  'kYYYYYYYYYYoooOk',
  'kYoYYYYYYYoooOOk',
  'koooooooooooOOOk',
  '.kOOOOOOOOOOOOk.',
  '..kkkkkkkkkkkk..',
];
const BAG_TOP = [
  '..kkkkkkkkkkkk..',
  '.kyyyyyyyyyyyyk.',
  'kyyyyyyyyyyyyyYk',
  'kyyyyyyyyyyyyYYk',
  'kyyyyyyyyyyyYYYk',
  'kYyyyyyyyyyYYYok',
  'kYYYYYYYYYYYYoOk',
  'kooooooooooooOOk',
];
const BAG_SIDE = [
  '..kkkkkkkk..',
  '.kyyyyyyyyk.',
  'kyyyyyyyyYYk',
  'kyyyyyyyyYYk',
  'kyyyyyyyYYok',
  'kyyyyyyyYYok',
  'kyyyyyyYYYok',
  'kyYyyyyYYook',
  'kyYYyyYYYook',
  'kYYYYYYYYook',
  'kYYYYYYYoook',
  'kYYYYYYooook',
  'kYooooooooOk',
  'kooooooooOOk',
  '.kOOOOOOOOk.',
  '..kkkkkkkk..',
];

const SHADE = { y: 'Y', Y: 'o', o: 'O', O: 'O' };
const FADE = { y: 'l', Y: 'L', o: 'j', O: 'O' }; // weathered canvas bag
function tone(map, t) {
  if (t === 1) return map.map((r) => r.replace(/[yYoO]/g, (c) => SHADE[c]));
  if (t === 2) return map.map((r) => r.replace(/[yYoO]/g, (c) => FADE[c]));
  return map;
}
// Deterministic per-bag variation so walls are not a perfect grid.
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) % 100;
}
function bagTone(x, y, dark) {
  const r = hash(x + 7, y + 3);
  if (dark) return r < 70 ? 1 : 2;
  return r < 62 ? 0 : r < 82 ? 2 : 1;
}

// Wall of `rows` face courses plus a top course, `w` px wide.
function wall(w, rows, dark = false, seed = 0) {
  const h = 6 + rows * 8 + 2;
  const bm = new Bitmap(w, h);
  for (let r = rows - 1; r >= 0; r--) {
    const off = r % 2 ? -8 : 0;
    for (let x = off; x < w; x += 14) blit(bm, fromMap(tone(BAG_FACE, bagTone(x, r + seed, dark))), x, 6 + r * 8);
  }
  for (let x = -4; x < w; x += 14) blit(bm, fromMap(tone(BAG_TOP, bagTone(x, 9 + seed, dark) === 1 ? 2 : 0)), x, 0);
  // crisp vertical outline at the ends
  for (let y = 1; y < h - 1; y++) {
    if (bm.get(0, y) >>> 24) bm.set(0, y, rgba('#101217'));
    if (bm.get(w - 1, y) >>> 24) bm.set(w - 1, y, rgba('#101217'));
  }
  return bm;
}

function sideWall(h, seed = 0) {
  const bm = new Bitmap(12, h);
  for (let y = 0; y < h; y += 14) blit(bm, fromMap(tone(BAG_SIDE, bagTone(seed, y, false))), 0, y);
  return bm;
}

// Hand-placed tier dressing.
const PLATE = [
  'kkkkkkkkkk',
  'kmmmmmmmmk',
  'kMmMMMMmnk',
  'kMMMMMMMnk',
  'kMmMMMMmnk',
  'knnnnnnnNk',
  'kkkkkkkkkk',
];
const PLATE_SMALL = [
  'kkkkkkk',
  'kmmmmmk',
  'kmMMMnk',
  'kMMMMnk',
  'knnnnNk',
  'kkkkkkk',
];
const AMMO_CRATE = [
  'kkkkkkkk',
  'kLLLLLLk',
  'kljjjjLk',
  'kkkkkkkk',
  'kLdDLLjk',
  'kLLLLLjk',
  'kjjjjjjk',
  'kkkkkkkk',
];
const ANTENNA = [
  '.kk.',
  'kcck',
  '.kk.',
  '.kk.',
  '.kn.',
  '.kn.',
  '.kn.',
  '.kn.',
  '.kn.',
  '.kn.',
  '.kn.',
  '.kn.',
  'knnk',
  'kNNk',
  'kkkk',
];
// Republic pennant: original emblem = white chevron on unit color.
const BANNER = [
  'kk......',
  'knkkkkk.',
  'knsssssk',
  'knsWsWsk',
  'knssWssk',
  'knsssk..',
  'knssk...',
  'knk.....',
  'knk.....',
  'knk.....',
  'knk.....',
  'knk.....',
  'kNk.....',
  'kkk.....',
];
const CAMO_NET = [
  '..kkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '.kLlLjLlLLjlLLlLjLlLLjlLLlLjk.',
  'kLlljLLlLjLLlljLLlLjLLlljLLlLk',
  'kjLlLLjLlLLjLlLLjLlLLjLlLLjLjk',
  'kLjLlLLjLjLlLLjLjLlLLjLjLlLLjk',
  '.kjkLjkjLkjkLjkjLkjkLjkjLkjkk.',
  '..k.kk.k.k.kk.k.k.kk.k.k.kk...',
];
const POLE = ['kk', 'nk', 'nk', 'nk', 'nk', 'nk', 'nk', 'nk', 'nk', 'nk', 'nk', 'nk', 'Nk', 'kk'];
const SCOPE_TRIPOD = [
  '.kkk.',
  'kmMck',
  '.kNk.',
  '.knk.',
  'k.k.k',
  'k.k.k',
  'k...k',
];

export const NEST_W = 64;
export const NEST_H = 96; // sprite canvas; bottom row = footprint bottom
const BASE_Y = NEST_H - 64; // top of the 64x64 footprint inside the canvas

// Trooper stand positions (feet) per tier, relative to the canvas.
export const SQUAD_SLOTS = {
  t1: [[18, 88], [32, 78], [46, 88]],
  t2: [[18, 88], [32, 78], [46, 88]],
  t3: [[16, 84], [32, 74], [48, 84]],
  t4a: [[14, 84], [30, 86], [46, 84], [22, 72], [40, 72]],
  t4b: [[22, 82], [42, 82]],
};

function shadowFloor(bm, x, y, w, h) {
  fill(bm, x, y, w, h, '#000000', 56);
}

const D = (m) => hd(fromMap(m)); // 2x dressing from the hand-placed 1x maps

// Hand-placed 2x armor plates (rivets + panel seam).
const PLATE2 = [
  'kkkkkkkkkkkkkkkkkkkk',
  'kmmmmmmmmmmmmmmmmmMk',
  'kmMMMMMMMMMMMMMMMMnk',
  'kmMmMMMMMMMMMMMmMMnk',
  'kmMMNMMMMMMMMMMMNMnk',
  'kmMMMMMMMMMMMMMMMMnk',
  'kMNNNNNNNNNNNNNNNNnk',
  'kmmmmmmmmmmmmmmmmMnk',
  'kmMMMMMMMMMMMMMMMMnk',
  'kmMmMMMMMMMMMMMmMMnk',
  'kmMMNMMMMMMMMMMMNMnk',
  'kmMMMMMMMMMMMMMMMMnk',
  'knnnnnnnnnnnnnnnnnNk',
  'kkkkkkkkkkkkkkkkkkkk',
];
const PLATE_SMALL2 = [
  'kkkkkkkkkkkkkk',
  'kmmmmmmmmmmmMk',
  'kmMmMMMMMMmMnk',
  'kmMMNMMMMMMNnk',
  'kmMMMMMMMMMMnk',
  'kmMMMMMMMMMMnk',
  'kMNNNNNNNNNNnk',
  'kmmmmmmmmmmMnk',
  'kmMmMMMMMMmMnk',
  'kmMMNMMMMMMNnk',
  'knnnnnnnnnnnNk',
  'kkkkkkkkkkkkkk',
];
const P = (m) => fromMap(m);

export function buildNest(tier) {
  const back = new Bitmap(NEST_W, NEST_H);
  const front = new Bitmap(NEST_W, NEST_H);
  const by = BASE_Y;
  const tall = tier === 't3' || tier === 't4a' || tier === 't4b' ? 1 : 0;

  shadowFloor(back, 10, by + 24, 44, 24);
  shadowFloor(back, 12, by + 24, 40, 4);
  const bw = wall(NEST_W - 8, 1 + tall, true, 3);
  blit(back, bw, 4, by + 6 - tall * 8);
  blit(back, sideWall(40, 1), 0, by + 18);
  blit(back, sideWall(40, 5), NEST_W - 12, by + 18);

  const fw = wall(NEST_W, 1 + tall, false, 0);
  blit(front, fw, 0, NEST_H - fw.h);

  if (tier !== 't1') {
    const p = P(tall ? PLATE2 : PLATE_SMALL2);
    blit(front, p, 10, NEST_H - p.h - 2);
    blit(front, p, NEST_W - 10 - p.w, NEST_H - p.h - 2);
    blit(back, D(AMMO_CRATE), 42, by + 16);
  }
  if (tier === 't3' || tier === 't4a') {
    blit(back, D(ANTENNA), 6, by - 16);
    blit(back, P(PLATE_SMALL2), 24, by - 2);
  }
  if (tier === 't3') blit(back, D(BANNER), 50, by - 18);
  if (tier === 't4a') {
    blit(back, D(ANTENNA), 52, by - 20);
    blit(back, D(BANNER.map((r) => r.replace(/s/g, 'd'))), 36, by - 22);
    blit(back, P(PLATE_SMALL2), 10, by - 2);
    blit(back, P(PLATE_SMALL2), 40, by - 2);
    blit(front, P(PLATE_SMALL2), 26, NEST_H - 14);
  }
  if (tier === 't4b') {
    blit(back, D(POLE), 4, by - 16);
    blit(back, D(POLE), 56, by - 16);
    blit(back, D(SCOPE_TRIPOD), 28, by + 10);
    blit(back, D(CAMO_NET), 2, by - 22);
  }
  return { back, front };
}
