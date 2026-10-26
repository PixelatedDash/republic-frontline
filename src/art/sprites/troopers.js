// Clone troopers: original plate armor, domed helmet with a center crest and
// a wraparound visor band (no T-visor). Stripe keys s/S/Z are palette-swapped
// per unit. Hand-authored facings: E, SE, S, NE, N. W, SW, NW are mirrors.
// Direction index (clockwise from east): 0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE.

export const TROOPER = {
  E: [
    '..kkkk...',
    '.kssSSk..',
    'kWWWWwwk.',
    'kWWwkTtk.',
    'kvWwwttk.',
    '.kvvwvk..',
    '.kSsWwk..',
    'kSsWwwvk.',
    'kZSwwvvk.',
    '.kbkbbk..',
    '.kWwkvk..',
    '.kwvkvk..',
    '.kbbkBk..',
    '.kkk.kk..',
  ],
  SE: [
    '..kkkkk..',
    '.kWWsSwk.',
    'kWWWsSwvk',
    'kWWwTttuk',
    'kvWwwvvuk',
    '.kkvvvkk.',
    'kssWWwvSk',
    'ksSWwwvZk',
    'kbkwwvkbk',
    '.kbbbbbk.',
    '.kWwkwvk.',
    '.kwvkvuk.',
    '.kbbkbBk.',
    '.kkk.kkk.',
  ],
  S: [
    '..kkkkk..',
    '.kWWsSwk.',
    'kWWWsSwvk',
    'kTttttttk',
    'kvWWwwvuk',
    '.kkvvvkk.',
    'ksSWWwSZk',
    'kwkWwwkvk',
    'kwkwwvkuk',
    'kbkbbbkbk',
    '.kWwkwvk.',
    '.kwvkvuk.',
    '.kbBkbBk.',
    '.kkk.kkk.',
  ],
  NE: [
    '..kkkkk..',
    '.kWWWsSk.',
    'kWWWWsSvk',
    'kWWWwwvTk',
    'kvWwwvvuk',
    '.kkvvvkk.',
    'kSWWwwvsk',
    'kSnnnnvSk',
    'kZnNNnvZk',
    '.kbbbbbk.',
    '.kWwkwvk.',
    '.kwvkvuk.',
    '.kbBkbBk.',
    '.kkk.kkk.',
  ],
  N: [
    '..kkkkk..',
    '.kWWsSwk.',
    'kWWWsSwvk',
    'kWWWsSvvk',
    'kvWwwvvuk',
    '.kkvvvkk.',
    'kSWnnnvSk',
    'kZWnNnvZk',
    'kwknNnkuk',
    'kbkbbbkbk',
    '.kWwkwvk.',
    '.kwvkvuk.',
    '.kbBkbBk.',
    '.kkk.kkk.',
  ],
};

// Weapons are a separate layer so the same body carries a carbine or a long
// rifle. ox/oy = where the weapon map sits on the 9x14 body; mx/my = muzzle.
export const WEAPONS = {
  carbine: {
    E: { ox: 4, oy: 6, mx: 10, my: 7, map: ['..kk..', 'kkMnnk', 'kNNNnk', '.kk...'] },
    SE: { ox: 4, oy: 6, mx: 9, my: 11, map: ['kk...', 'kMk..', 'kNnk.', '.kNnk', '..kNk', '...k.'] },
    S: { ox: 3, oy: 7, mx: 4, my: 13, map: ['kkk', 'kMk', 'knk', 'kNk', 'kNk', '.k.'] },
    NE: { ox: 4, oy: 2, mx: 8, my: 2, map: ['...k.', '..kmk', '.kMk.', 'kNk..', 'kk...'] },
    N: { ox: 5, oy: 1, mx: 6, my: 1, map: ['.k.', 'kmk', 'kMk', 'kNk', 'kkk'] },
  },
  longrifle: {
    E: { ox: 3, oy: 6, mx: 13, my: 7, map: ['...kk.....', 'kkkMnnnnnk', 'kNNNnkkkk.', '.kk.......'] },
    SE: { ox: 4, oy: 6, mx: 10, my: 12, map: ['kk....', 'kMk...', 'kNnk..', '.kNnk.', '..kNnk', '...knk', '....k.'] },
    S: { ox: 3, oy: 7, mx: 4, my: 15, map: ['kkk', 'kMk', 'knk', 'kNk', 'kNk', 'knk', 'knk', '.k.'] },
    NE: { ox: 4, oy: 0, mx: 9, my: 0, map: ['....k.', '...kmk', '..kmk.', '.kMk..', 'kNk...', 'kk....'] },
    N: { ox: 5, oy: -1, mx: 6, my: -1, map: ['.k.', 'kmk', 'kmk', 'kMk', 'kNk', 'kkk'] },
  },
};

// Muzzle flash pixel maps (energy colors), drawn centered on the muzzle.
export const MUZZLE_SMALL = [
  '.C.',
  'C#C',
  '.C.',
];
export const MUZZLE_MED = [
  '..c..',
  '.cCc.',
  'cC#Cc',
  '.cCc.',
  '..c..',
];

import { Bitmap, blit, fromMap, mirrorX, recolor } from '../bitmap.js';
import { STRIPES, LEGEND } from '../palettes.js';

export const DIRS8 = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const MIRROR = { W: 'E', SW: 'SE', NW: 'NE' };
// Frame is 18x20; body sits at (4,4) so the feet land on (8,17).
export const TROOPER_FRAME = { w: 18, h: 20, footX: 8, footY: 17 };

export function stripeSwap(bm, name) {
  if (name === 'rifle') return bm;
  const to = STRIPES[name];
  return recolor(bm, { [LEGEND.s]: to[0], [LEGEND.S]: to[1], [LEGEND.Z]: to[2] });
}

// Returns { bm, mx, my } with muzzle position in frame coordinates.
export function buildTrooper(dir, weapon = 'carbine', stripe = 'rifle', recoil = 0) {
  const src = MIRROR[dir] || dir;
  const flip = !!MIRROR[dir];
  const w = WEAPONS[weapon][src];
  const bm = new Bitmap(TROOPER_FRAME.w, TROOPER_FRAME.h);
  const body = fromMap(TROOPER[src]);
  const gun = fromMap(w.map);
  // recoil pushes the gun (and body slightly) back along the aim
  const ax = { E: 1, SE: 1, S: 0, NE: 1, N: 0 }[src];
  const ay = { E: 0, SE: 1, S: 1, NE: -1, N: -1 }[src];
  const rx = -ax * recoil, ry = -ay * recoil;
  const behind = src === 'N' || src === 'NE';
  if (behind) blit(bm, gun, 4 + w.ox + rx, 4 + w.oy + ry);
  blit(bm, body, 4, 4);
  if (!behind) blit(bm, gun, 4 + w.ox + rx, 4 + w.oy + ry);
  let out = stripeSwap(flip ? mirrorX(bm) : bm, stripe);
  let mx = 4 + w.mx + rx, my = 4 + w.my + ry;
  if (flip) mx = TROOPER_FRAME.w - 1 - mx;
  return { bm: out, mx, my };
}
