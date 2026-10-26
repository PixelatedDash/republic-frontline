// Clone Rifle Squad: 2x2 sandbag nest manned by troopers. The nest is split
// into a BACK layer (drawn before troopers) and a FRONT layer (after), so the
// front sandbags hide the troopers' legs. Walls are assembled from
// hand-placed sandbag pieces; tier dressing is hand-placed overlay maps.

import { Bitmap, blit, fromMap, rgba, fill } from '../bitmap.js';

// Sandbag front face (stacked brickwork) and top-of-wall pieces.
const BAG_FACE = [
  '.kkkkkk.',
  'kyyyyyYk',
  'kYYYYYok',
  'koooooOk',
  '.kkkkkk.',
];
const BAG_TOP = [
  '.kkkkkk.',
  'kyyyyyyk',
  'kyyyyyYk',
  'kYYYYYok',
];
// Side wall bag seen from above (runs front-to-back).
const BAG_SIDE = [
  '.kkkk.',
  'kyyyyk',
  'kyyyYk',
  'kyyYYk',
  'kyYYok',
  'kYYook',
  'kYoooO',
  '.kkkk.',
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
  const h = 3 + rows * 4 + 1;
  const bm = new Bitmap(w, h);
  for (let r = rows - 1; r >= 0; r--) {
    const off = r % 2 ? -4 : 0;
    for (let x = off; x < w; x += 7) blit(bm, fromMap(tone(BAG_FACE, bagTone(x, r + seed, dark))), x, 3 + r * 4);
  }
  for (let x = -2; x < w; x += 7) blit(bm, fromMap(tone(BAG_TOP, bagTone(x, 9 + seed, dark) === 1 ? 2 : 0)), x, 0);
  // crisp vertical outline at the ends
  for (let y = 1; y < h - 1; y++) {
    if (bm.get(0, y) >>> 24) bm.set(0, y, rgba('#101217'));
    if (bm.get(w - 1, y) >>> 24) bm.set(w - 1, y, rgba('#101217'));
  }
  return bm;
}

function sideWall(h, seed = 0) {
  const bm = new Bitmap(6, h);
  for (let y = 0; y < h; y += 7) blit(bm, fromMap(tone(BAG_SIDE, bagTone(seed, y, false))), 0, y);
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

export const NEST_W = 32;
export const NEST_H = 48; // sprite canvas; bottom row = footprint bottom
const BASE_Y = NEST_H - 32; // top of the 32x32 footprint inside the canvas

// Trooper stand positions (feet) per tier, relative to the canvas.
export const SQUAD_SLOTS = {
  t1: [[9, 44], [16, 39], [23, 44]],
  t2: [[9, 44], [16, 39], [23, 44]],
  t3: [[8, 42], [16, 37], [24, 42]],
  t4a: [[7, 42], [15, 43], [23, 42], [11, 36], [20, 36]],
  t4b: [[11, 41], [21, 41]],
};

function shadowFloor(bm, x, y, w, h) {
  fill(bm, x, y, w, h, '#000000', 56);
}

export function buildNest(tier) {
  const back = new Bitmap(NEST_W, NEST_H);
  const front = new Bitmap(NEST_W, NEST_H);
  const by = BASE_Y;
  const tall = tier === 't3' || tier === 't4a' || tier === 't4b' ? 1 : 0;

  // inner floor shadow (ambient occlusion under the walls)
  shadowFloor(back, 5, by + 12, 22, 12);
  shadowFloor(back, 6, by + 12, 20, 2);
  // back wall (inner face, in shade)
  const bw = wall(NEST_W - 4, 1 + tall, true, 3);
  blit(back, bw, 2, by + 3 - tall * 4);
  // side walls
  blit(back, sideWall(20, 1), 0, by + 9);
  blit(back, sideWall(20, 5), NEST_W - 6, by + 9);

  // front wall: one course (two when fortified)
  const fw = wall(NEST_W, 1 + tall, false, 0);
  blit(front, fw, 0, NEST_H - fw.h);

  if (tier !== 't1') {
    // metal plates bolted over the front face
    const p = fromMap(tall ? PLATE : PLATE_SMALL);
    blit(front, p, 5, NEST_H - p.h - 1);
    blit(front, p, NEST_W - 5 - p.w, NEST_H - p.h - 1);
    blit(back, fromMap(AMMO_CRATE), 21, by + 8);
  }
  if (tier === 't3' || tier === 't4a') {
    blit(back, fromMap(ANTENNA), 3, by - 8);
    blit(back, fromMap(PLATE_SMALL), 12, by - 1);
  }
  if (tier === 't3') {
    blit(back, fromMap(BANNER), 25, by - 9);
  }
  if (tier === 't4a') {
    blit(back, fromMap(ANTENNA), 26, by - 10);
    const gold = BANNER.map((r) => r.replace(/s/g, 'd'));
    blit(back, fromMap(gold), 18, by - 11);
    blit(back, fromMap(PLATE_SMALL), 5, by - 1);
    blit(back, fromMap(PLATE_SMALL), 20, by - 1);
    blit(front, fromMap(PLATE_SMALL), 13, NEST_H - 7);
  }
  if (tier === 't4b') {
    blit(back, fromMap(POLE), 2, by - 8);
    blit(back, fromMap(POLE), 28, by - 8);
    blit(back, fromMap(SCOPE_TRIPOD), 14, by + 5);
    blit(back, fromMap(CAMO_NET), 1, by - 11);
  }
  return { back, front };
}
