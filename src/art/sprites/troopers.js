// Clone troopers at 2x detail (18x28 body). Original plate armor: domed
// helmet with a center crest in the unit stripe, wraparound visor band (no
// T-visor), vented jaw, stripe pauldrons. Stripe keys s/S/Z are swapped per
// unit. Hand-authored facings: E, SE, S, NE, N. W, SW, NW are mirrors.
// Direction index (clockwise from east): 0 E, 1 SE, 2 S, 3 SW, 4 W, 5 NW, 6 N, 7 NE.

const LEGS = [
  '...kWWWwkkwwvvk...',
  '...kWWwwk.kwwvuk..',
  '...kbbbbk.kbbbBk..',
  '...kWwwvk.kwvvuk..',
  '..kkuuuuk.kuuuukk.',
  '..kkkkkkk.kkkkkkk.',
];

export const TROOPER = {
  S: [
    '......kkkkkk......',
    '....kkWWsSWwkk....',
    '...kWWWWsSwwwvk...',
    '..kWWWWWsSwwwvvk..',
    '..kWWWWWsSwwwvvk..',
    '.kWWWWWWsSwwwvvuk.',
    '.kWWWWWWWwwwwvvuk.',
    '.kkkkkkkkkkkkkkkk.',
    '.kTTtttttttttttTk.',
    '.kttttttttttttttk.',
    '.kkkkkkkkkkkkkkkk.',
    '.kvWWWWwwwwwwvvuk.',
    '..kvWWwkkkkwvvuk..',
    '...kkvwwwwwvvkk...',
    '..kkkkkbbbbkkkkk..',
    'kssSkWWWWWWwwvkSZk',
    'ksSSkWWWWWwwwvkSZk',
    'kSSZkWWWwwwwvvkZZk',
    'kwvukWWwwwwvvukwuk',
    'kwvukWwwvvwwvukwuk',
    'kwvukwwwwwwvvukwuk',
    'kbbbkkkkkkkkkkkbbk',
    ...LEGS,
  ],
  SE: [
    '......kkkkkk......',
    '....kkWWsSWwkk....',
    '...kWWWsSWwwwvk...',
    '..kWWWWsSWwwwvvk..',
    '..kWWWWsSwwwwvvk..',
    '.kWWWWWsSwwwvvvuk.',
    '.kWWWWWWwwwwvvvuk.',
    '.kWWWkkkkkkkkkkkk.',
    '.kvWkTTtttttttttk.',
    '.kvWkttttttttttTk.',
    '.kvvkkkkkkkkkkkkk.',
    '.kvvWWwwwwwwvvuuk.',
    '..kvvWwwkkkwvvuk..',
    '...kkvvwwwwvvkk...',
    '..kkkkkbbbbkkkkk..',
    'kssSkWWWWWwwvvkSkk',
    'ksSSkWWWWwwwvvkSZk',
    'kSSZkWWWwwwwvukZZk',
    'kwvukWWwwwwvvukvuk',
    'kwvukWwwvvwwvukvuk',
    'kwvukwwwwwwvvukvuk',
    'kbbbkkkkkkkkkkkbbk',
    ...LEGS,
  ],
  E: [
    '.....kkkkkk.......',
    '...kkssSSSskk.....',
    '..kWWWWWWWwwwk....',
    '.kWWWWWWWwwwwvk...',
    '.kWWWWWWwwwwvvvk..',
    'kWWWWWWwwwwvvkkkk.',
    'kWWWWWwwwwvvkTTtk.',
    'kvWWWwwwwvvkttttk.',
    'kvWWwwwwvvvkkkkkk.',
    'kvvwwwwvvuuuuuk...',
    '.kvvwwvvuukkkk....',
    '..kkvvuuuk........',
    '...kkbbbkk........',
    '..kSSsWWwwk.......',
    '.kSsssWWwwvk......',
    '.kZSSsWwwwvk......',
    '.kwZSkWwwwvk......',
    '.kwvukWwwvvk......',
    '.kwvukwwwvvk......',
    '.kbbbkwwvvuk......',
    '..kkkkkkkkk.......',
    '...kWWwwvk........',
    '...kWwwvuk........',
    '...kbbbbBk........',
    '...kWwwvuk........',
    '...kwwvvuk........',
    '..kkuuuuukk.......',
    '..kkkkkkkkk.......',
  ],
  NE: [
    '......kkkkkk......',
    '....kkWsSWwwkk....',
    '...kWWWsSwwwwvk...',
    '..kWWWWsSwwwwvvk..',
    '..kWWWWsSwwwwvvk..',
    '.kWWWWWsSwwwvvvuk.',
    '.kWWWWWWwwwwvvvuk.',
    '.kWWWWWWwwwwvvvkk.',
    '.kvWWWWwwwwwvvkTk.',
    '.kvWWWwwwwwvvukTk.',
    '.kvvWWwwwwvvuukkk.',
    '.kkvvwwwwwvvuukk..',
    '..kkvvvvvvvuukk...',
    '...kkkkkkkkkkk....',
    '..kkkkkbbbbkkkkk..',
    'kSssSkWMmmmNwkSSZk',
    'kSSZkWwMnnnNvukZZk',
    'kwvukWwMnnnNvukvuk',
    'kwvukwwMNNNNvukvuk',
    'kwvukwwkkkkkvukvuk',
    'kwvukwwwwwvvvukvuk',
    'kbbbkkkkkkkkkkkbbk',
    ...LEGS,
  ],
  N: [
    '......kkkkkk......',
    '....kkWWsSWwkk....',
    '...kWWWWsSwwwvk...',
    '..kWWWWWsSwwwvvk..',
    '..kWWWWWsSwwwvvk..',
    '.kWWWWWWsSwwwvvuk.',
    '.kWWWWWWsSwwvvvuk.',
    '.kWWWWWWwwwwvvvuk.',
    '.kvWWWWWwwwwvvuuk.',
    '.kvWWWWwwwwvvvuuk.',
    '.kvvWWWwwwwvvuuuk.',
    '.kkvvWwwwwvvuukk..',
    '..kkvvvvvvvuukk...',
    '...kkkkkkkkkkk....',
    '..kkkkkbbbbkkkkk..',
    'kssSkWMmmmmNwvkSZk',
    'ksSSkWMnnnnNvvkSZk',
    'kSSZkwMnnnnNvukZZk',
    'kwvukwMNNNNNvukvuk',
    'kwvukwkkkkkkvukvuk',
    'kwvukwwwwwwvvukvuk',
    'kbbbkkkkkkkkkkkbbk',
    ...LEGS,
  ],
};

// Weapons are a separate layer. ox/oy = position on the 18x28 body;
// mx/my = muzzle (body coordinates).
export const WEAPONS = {
  carbine: {
    E: { ox: 6, oy: 15, mx: 17, my: 17, map: ['....kk......', 'kkkkMMkkkkk.', 'kNnnnnnnnnMk', 'kNNNkkkkkkk.', '.kk.........'] },
    SE: { ox: 8, oy: 15, mx: 16, my: 22, map: ['kk........', 'kMkk......', 'kNnMk.....', '.kNnMk....', '..kNnMk...', '...kNnMk..', '....kNnMk.', '.....kNnk.', '......kkk.'] },
    S: { ox: 7, oy: 16, mx: 8, my: 24, map: ['kkkk', 'kMMk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNMk', '.kk.'] },
    NE: { ox: 9, oy: 7, mx: 16, my: 7, map: ['.......k', '......kM', '.....kMk', '....kMnk', '...kMnk.', '..kMnk..', '.kNnk...', 'kNNk....', 'kkk.....'] },
    N: { ox: 12, oy: 6, mx: 13, my: 6, map: ['.kk.', 'kMMk', 'kMnk', 'kNnk', 'kNnk', 'kNnk', 'kNNk', 'kkkk'] },
  },
  longrifle: {
    E: { ox: 5, oy: 14, mx: 21, my: 18, map: ['.....kTTk.......', '.....kkkk.......', 'kkkkkMMkkkkkkkk.', 'kNnnnnnnnnnnnnMk', 'kNNNkkkkkkkkkkk.', '.kk.............'] },
    SE: { ox: 8, oy: 15, mx: 19, my: 26, map: ['kk...........', 'kMkk.........', 'kNnMk........', '.kNnMk.......', '..kNnMk......', '...kNnMk.....', '....kNnMk....', '.....kNnMk...', '......kNnMk..', '.......kNnMk.', '........kNnk.', '.........kkk.'] },
    S: { ox: 7, oy: 16, mx: 8, my: 27, map: ['kkkk', 'kMMk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNMk', '.kk.'] },
    NE: { ox: 9, oy: 4, mx: 19, my: 4, map: ['..........k', '.........kM', '........kMk', '.......kMnk', '......kMnk.', '.....kMnk..', '....kMnk...', '...kMnk....', '..kMnk.....', '.kNnk......', 'kNNk.......', 'kkk........'] },
    N: { ox: 12, oy: 2, mx: 13, my: 2, map: ['.kk.', 'kMMk', 'kMnk', 'kMnk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNnk', 'kNNk', 'kkkk'] },
  },
};

// Muzzle flashes (two frames each, energy colors), centered on the muzzle.
export const MUZZLE_SMALL = [
  '...C...',
  '..CcC..',
  '.Cc#cC.',
  'Cc###cC',
  '.Cc#cC.',
  '..CcC..',
  '...C...',
];
export const MUZZLE_SMALL_B = [
  '.......',
  '.C...C.',
  '..c#c..',
  '..###..',
  '..c#c..',
  '.C...C.',
  '.......',
];
export const MUZZLE_MED = [
  '....c....',
  '...cCc...',
  '..cC#Cc..',
  '.cC###Cc.',
  'cC#####Cc',
  '.cC###Cc.',
  '..cC#Cc..',
  '...cCc...',
  '....c....',
];

import { Bitmap, blit, fromMap, mirrorX, recolor } from '../bitmap.js';
import { STRIPES, LEGEND } from '../palettes.js';

export const DIRS8 = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
const MIRROR = { W: 'E', SW: 'SE', NW: 'NE' };
// Frame is 32x40; body sits at (7,6) so the feet land on (16,33).
export const TROOPER_FRAME = { w: 32, h: 40, footX: 16, footY: 33, bx: 7, by: 6 };

export function stripeSwap(bm, name) {
  if (!name || name === 'rifle') return bm;
  const to = STRIPES[name];
  return recolor(bm, { [LEGEND.s]: to[0], [LEGEND.S]: to[1], [LEGEND.Z]: to[2] });
}

// Returns { bm, mx, my } with the muzzle position in frame coordinates.
// recoil: px the gun kicks back; bob: px the body dips (idle breathing).
// Rail rifle (Rail Marksman): the long rifle with glowing accelerator coils
// set into the barrel every third pixel.
WEAPONS.railrifle = Object.fromEntries(Object.entries(WEAPONS.longrifle).map(([d, w]) => {
  let n = 0;
  const map = w.map.map((row) => row.replace(/n/g, () => (n++ % 3 === 1 ? 'i' : 'n')));
  return [d, { ...w, map }];
}));

export function buildTrooper(dir, weapon = 'carbine', stripe = 'rifle', recoil = 0, bob = 0) {
  const src = MIRROR[dir] || dir;
  const flip = !!MIRROR[dir];
  const w = WEAPONS[weapon][src];
  const F = TROOPER_FRAME;
  const bm = new Bitmap(F.w, F.h);
  const body = fromMap(TROOPER[src]);
  const gun = fromMap(w.map);
  const ax = { E: 1, SE: 1, S: 0, NE: 1, N: 0 }[src];
  const ay = { E: 0, SE: 1, S: 1, NE: -1, N: -1 }[src];
  const rx = -ax * recoil, ry = -ay * recoil;
  const behind = src === 'N' || src === 'NE';
  if (behind) blit(bm, gun, F.bx + w.ox + rx, F.by + w.oy + ry + bob);
  blit(bm, body, F.bx, F.by + bob);
  if (!behind) blit(bm, gun, F.bx + w.ox + rx, F.by + w.oy + ry + bob);
  const out = stripeSwap(flip ? mirrorX(bm) : bm, stripe);
  let mx = F.bx + w.mx + rx, my = F.by + w.my + ry + bob;
  if (flip) mx = F.w - 1 - mx;
  return { bm: out, mx, my };
}
