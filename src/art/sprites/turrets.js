// Rocket Team and Flak Turret (1x1). Each tier = a 3/4-view base (hand-placed
// layers) + a head authored top-down pointing EAST, which RotSprite turns
// into 16 aim directions at load time. Heads are assembled from hand-placed
// housings and barrel/tube pieces, then outlined.
// `pivot` = rotation point in head pixels, `mount` = where it sits on the base,
// `muzzleRows` = head rows that fire (x = the row's front-most pixel). Stripe keys s/S/Z are swapped per tower.

import { Bitmap, blit, fromMap, outline } from '../bitmap.js';

// ---------------------------------------------------------------- bases ----
// White Republic armor pedestal: lit top, banded front face with unit stripe.
export const MOUNT = [
  '....kkkkkkkk....',
  '..kkWWWWWWwwkk..',
  '.kWWWwwwwwwwwvk.',
  'kWWwwwwwwwwwwwvk',
  'kWwwwwwwwwwwwvvk',
  'kwwwwwwwwwwwvvvk',
  '.kvwwwwwwwwvvvk.',
  'kWkkvvvvvvvvkkuk',
  'kWWwwwwwwwvvvvuk',
  'ksssssssssSSSSZk',
  'kSSsssssSSSSSZZk',
  'kWwwwwwwwwvvvvuk',
  'kwwwwwwwwvvvvuuk',
  'kvvvvvvvvvvuuuuk',
  '.kkkkkkkkkkkkkk.',
];
export const PLINTH_BAGS = [
  '.kkkkkk.kkkkkk.kkkk.',
  'kyyyyyYkyyyyyYkyyyYk',
  'kYYYYYokYYYYYokYYYok',
  'kooooOOkooooOOkoooOk',
  '.kkkkkk.kkkkkk.kkkk.',
];
export const PLINTH_PLATE = [
  'kkkkkkkkkkkkkkkkkkkk',
  'kmmmmmmmmmmmmmmmmmMk',
  'kMmMMMMMMMMMMMMMMmnk',
  'kMMMMMMMMMMMMMMMMMnk',
  'knnnnnnnnnnnnnnnnnNk',
  'kkkkkkkkkkkkkkkkkkkk',
];
export const BLAST_SHIELD = [
  '.kkkkkkkkkkkkkkkkkk.',
  'kWWWWWWWWWWWWWWWWWvk',
  'kWwwwwwwwwwwwwwwwvuk',
  'kSsSsSsSsSsSsSsSsSZk',
  'kwvvvvvvvvvvvvvvvvuk',
  'kvvvvvvvvvvvvvvvvuuk',
  'kkkkkkkkkkkkkkkkkkkk',
];
export const AMMO_BOX = [
  'kkkkkkk',
  'kllllLk',
  'kLdDLjk',
  'kLLLLjk',
  'kjjjjjk',
  'kkkkkkk',
];
export const RADAR_MAST = [
  'kkkkkkk',
  'kmmmMnk',
  '.kMcNk.',
  '..kkk..',
  '...k...',
  '..knk..',
  '..knk..',
  '..knk..',
  '..knk..',
  '..knk..',
  '.knNNk.',
  '.kkkkk.',
];
export const RADAR_DISH = [
  'kk....kk',
  'kWk..kvk',
  'kwWkkwuk',
  '.kwWwvk.',
  '..kkck..',
  '...kk...',
  '...nk...',
  '...nk...',
  '...nk...',
  '...nk...',
  '...nk...',
  '..knNk..',
  '..kkkk..',
];
export const MISSILE_CRATE = [
  'kkkkkkkkkkkkkk',
  'kllllllllllllk',
  'kLkkkkkkkkkkLk',
  'kLkWpkWpkWpkLk',
  'kLkkkkkkkkkkLk',
  'kjjjjjjjjjjjjk',
  'kkkkkkkkkkkkkk',
];

// ------------------------------------------------------- head parts --------
// Flak housing: steel turret block with a stripe-painted top plate.
const FLAK_HOUSING_S = [
  'MMMMMN',
  'MsSMMN',
  'MsSMMN',
  'MsSMMN',
  'MsSMMN',
  'nnnnnN',
];
const FLAK_HOUSING_L = [
  'mmmmmmMN',
  'mMMsSMMN',
  'mMMsSMMN',
  'mMMsSMMN',
  'mMMsSMMN',
  'mMMsSMMN',
  'mMMsSMMN',
  'mMMsSMMN',
  'nnnnnnnN',
];
const FLAK_HOUSING_ARMORED = [
  '.WWWWWwv.',
  'WwwwwwwvN',
  'wMMsSMMvN',
  'wMMsSMMvN',
  'wMMsSMMvN',
  'wMMsSMMvN',
  'wMMsSMMvN',
  'wMMsSMMvN',
  'wMMsSMMvN',
  'vvvvvvvuN',
  '.uuuuuuu.',
];
const DRUM = ['DdD', 'ddD', 'DDD'];
const barrel = (len, brake = false) => {
  const top = 'm'.repeat(len - 1) + 'M', bot = 'n'.repeat(len - 1) + 'N';
  return brake ? ['.'.repeat(len - 3) + 'mmM', top, bot, '.'.repeat(len - 3) + 'nnN'] : [top, bot];
};
// Rocket tubes: olive, 3 rows thick, dark bore at the muzzle.
const tube = (len) => ['l'.repeat(len - 1) + 'k', 'L'.repeat(len - 1) + 'B', 'j'.repeat(len - 1) + 'k'];
export const TUBE_CLAMP = ['mM', 'MN', 'nN'];
const ROCKET_BOX_4 = [
  'llllllllllk',
  'lLLLLLLLLkB',
  'lLLLLLLLLkB',
  'lLLLLLLLLkk',
  'lLLLLLLLLkB',
  'lLLLLLLLLkB',
  'jjjjjjjjjjk',
];
const ROCKET_BOX_9 = [
  'lllllllllllk',
  'lLLLLLLLLLkB',
  'lLLLLLLLLLkB',
  'lLLLLLLLLLkk',
  'lLLLLLLLLLkB',
  'lLLLLLLLLLkB',
  'lLLLLLLLLLkk',
  'lLLLLLLLLLkB',
  'lLLLLLLLLLkB',
  'jjjjjjjjjjjk',
];
export const OPTIC = ['kk', 'cT', 'kk'];
const HEAVY_TUBE = ['l'.repeat(13) + 'k', 'l'.repeat(13) + 'B', 'L'.repeat(13) + 'B', 'j'.repeat(13) + 'k'];
const WARHEAD = ['.dd', 'ddD', 'dDD', '.DD'];
const MISSILE = ['WWWwvpP', 'wwwvvPq'];

export function assemble(w, h, parts) {
  const bm = new Bitmap(w, h);
  for (const [map, x, y] of parts) blit(bm, fromMap(map), x, y);
  return outline(bm);
}

// Heads (bitmaps). Coordinates exclude the 1px outline added by assemble().
const H = {
  flak_t1: () => assemble(16, 8, [[FLAK_HOUSING_S, 1, 1], [barrel(8), 7, 1], [barrel(8), 7, 5]]),
  flak_t2: () => assemble(19, 11, [[FLAK_HOUSING_L, 1, 1], [barrel(9), 9, 1], [barrel(9), 9, 3], [barrel(9), 9, 6], [barrel(9), 9, 8]]),
  flak_t3: () => assemble(20, 13, [[FLAK_HOUSING_ARMORED, 1, 1], [barrel(9), 10, 2], [barrel(9), 10, 4], [barrel(9), 10, 7], [barrel(9), 10, 9]]),
  flak_t4a: () => assemble(22, 17, [[FLAK_HOUSING_ARMORED, 1, 3], [barrel(11, true), 10, 2], [barrel(11, true), 10, 6], [barrel(11, true), 10, 10], [DRUM, 3, 1], [DRUM, 3, 13]]),
  flak_t4b: () => assemble(18, 15, [[FLAK_HOUSING_ARMORED, 1, 2], [MISSILE, 10, 1], [MISSILE, 10, 4], [MISSILE, 10, 9], [MISSILE, 10, 12], [OPTIC, 6, 6]]),
  rocket_t1: () => assemble(16, 7, [[tube(12), 2, 3], [TUBE_CLAMP, 4, 3], [OPTIC, 7, 1]]),
  rocket_t2: () => assemble(15, 10, [[tube(11), 2, 1], [tube(11), 2, 5], [TUBE_CLAMP, 3, 1], [TUBE_CLAMP, 3, 5], [['mm', 'Mn', 'nN'], 3, 3]]),
  rocket_t3: () => assemble(16, 11, [[['MMMMM', 'mMMMN'], 1, 8], [ROCKET_BOX_4, 2, 1], [OPTIC, 6, 3]]),
  rocket_t4a: () => assemble(20, 9, [[HEAVY_TUBE, 1, 3], [WARHEAD, 14, 3], [TUBE_CLAMP, 3, 3], [TUBE_CLAMP, 9, 3], [OPTIC, 6, 1]]),
  rocket_t4b: () => assemble(16, 14, [[['mMMn', 'nnnN'], 1, 6], [ROCKET_BOX_9, 2, 2]]),
};

// Each tower tier: base layers ([map, x, y] in base space, bottom-aligned
// later), head factory, pivot, mount, muzzles.
export const ROCKET = {
  t1: { stripe: 'rocket', flash: 'fire', base: [[MOUNT, 0, 0]], head: H.rocket_t1, pivot: [6, 4], mount: [8, 4], muzzleRows: [4] },
  t2: { stripe: 'rocket', flash: 'fire', base: [[MOUNT, 0, 0], [PLINTH_BAGS, -2, 12]], head: H.rocket_t2, pivot: [6, 4], mount: [8, 4], muzzleRows: [2, 6] },
  t3: { stripe: 'rocket', flash: 'fire', base: [[RADAR_MAST, 11, -7], [MOUNT, 0, 0], [PLINTH_BAGS, -2, 12], [AMMO_BOX, -3, 9]], head: H.rocket_t3, pivot: [7, 4], mount: [8, 4], muzzleRows: [3, 6] },
  t4a: { stripe: 'rocket', flash: 'fire', base: [[RADAR_MAST, -2, -7], [MOUNT, 0, 0], [BLAST_SHIELD, -2, 11]], head: H.rocket_t4a, pivot: [7, 4], mount: [8, 4], muzzleRows: [4] },
  t4b: { stripe: 'rocket', flash: 'fire', base: [[MOUNT, 0, 0], [PLINTH_BAGS, -2, 12], [AMMO_BOX, -3, 9], [AMMO_BOX, 12, 10]], head: H.rocket_t4b, pivot: [7, 7], mount: [8, 4], muzzleRows: [4, 7, 10] },
};

export const FLAK = {
  t1: { stripe: 'flak', flash: 'fire', base: [[MOUNT, 0, 0]], head: H.flak_t1, pivot: [4, 3], mount: [8, 4], muzzleRows: [1, 5] },
  t2: { stripe: 'flak', flash: 'fire', base: [[MOUNT, 0, 0], [PLINTH_PLATE, -2, 11]], head: H.flak_t2, pivot: [5, 5], mount: [8, 4], muzzleRows: [2, 4, 7, 9] },
  t3: { stripe: 'flak', flash: 'fire', base: [[RADAR_DISH, 10, -8], [MOUNT, 0, 0], [PLINTH_PLATE, -2, 11]], head: H.flak_t3, pivot: [5, 6], mount: [8, 4], muzzleRows: [3, 5, 8, 10] },
  t4a: { stripe: 'flak', flash: 'fire', base: [[RADAR_DISH, 11, -8], [RADAR_DISH, -3, -6], [MOUNT, 0, 0], [BLAST_SHIELD, -2, 11]], head: H.flak_t4a, pivot: [5, 8], mount: [8, 4], muzzleRows: [4, 8, 12] },
  t4b: { stripe: 'flak', flash: 'fire', base: [[RADAR_DISH, -3, -8], [MOUNT, 0, 0], [PLINTH_PLATE, -2, 11], [MISSILE_CRATE, 3, 13]], head: H.flak_t4b, pivot: [5, 7], mount: [8, 4], muzzleRows: [2, 5, 10, 13] },
};
