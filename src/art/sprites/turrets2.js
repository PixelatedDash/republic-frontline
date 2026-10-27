// Phase 2 rotating towers: Repeater Nest, Artillery Battery, Ion Cannon.
// Same method as turrets.js: a 3/4-view base of hand-placed layers plus a
// head authored top-down pointing EAST (RotSprite turns it at load time).
// Ion Arc and Pulse Dome (Ion tier 4) do not aim: their whole emitter is
// part of the base and the energy pixels pulse instead.

import { Bitmap, blit, fromMap, outline } from '../bitmap.js';
import { MOUNT, PLINTH_BAGS, PLINTH_PLATE, BLAST_SHIELD, AMMO_BOX, RADAR_MAST, RADAR_DISH, OPTIC, assemble } from './turrets.js';

// ------------------------------------------------------- shared parts ------
const ARMOR_HOUSING = (h) => [
  '.WWWWWwv.',
  'WwwwwwwvN',
  ...Array.from({ length: h - 4 }, (_, i) => (i < 2 ? 'wMsSMMMvN' : 'wMMMMMMvN')),
  'vvvvvvvuN',
  '.uuuuuuu.',
];
const STEEL_HOUSING = (w, h) => [
  'm'.repeat(w - 1) + 'N',
  ...Array.from({ length: h - 2 }, (_, i) => 'm' + (i < 3 ? 'sS' : 'MM') + 'M'.repeat(w - 4) + 'N'),
  'n'.repeat(w - 1) + 'N',
];
// Ammo drum (steel, seen from above) with a brass feed belt on its right.
// Artillery cradle: painted in the unit color (umber) so the gun reads as
// field artillery at a glance, with a steel trunnion band.
const ART_HOUSING = (w, h) => [
  's'.repeat(w - 1) + 'Z',
  ...Array.from({ length: h - 2 }, (_, i) => (i === 1 || i === h - 4 ? 'S' + 'm'.repeat(w - 3) + 'nZ' : 's' + 'S'.repeat(w - 2) + 'Z')),
  'Z'.repeat(w),
];
const DRUM_TOP = ['.mmM.', 'mmMMNd', 'mMkMND', 'MMMNNd', '.nNN.'];
const SHELL_RACK = [
  'kkkkkkkkk',
  'kdkdkdkdk',
  'kDkDkDkDk',
  'kmkmkmkmk',
  'kMkMkMkMk',
  'kMkMkMkMk',
  'knknknknk',
  'kkkkkkkkk',
];

// Rotary barrel bundle seen from above: 5 rows, barrels separated by dark
// grooves; the grooves alternate between odd and even rows as it spins
// (f = spin frame 0..1). Clamp rings near both ends, bores at the tip.
export const SPIN_FRAMES = 2;
function rotary(len, f) {
  const lit = ['m', 'm', 'M', 'M', 'n'];
  return [0, 1, 2, 3, 4].map((r) => {
    const groove = (r + f) % 2 === 1;
    let row = '';
    for (let i = 0; i < len; i++) {
      if (i === 1 || i === len - 3) row += r < 2 ? 'm' : r < 4 ? 'M' : 'n';
      else if (i === len - 1) row += groove ? 'k' : 'N';
      else row += groove ? (r < 3 ? 'N' : 'k') : lit[r];
    }
    return row;
  });
}
// Flared suppression shroud around the rotary muzzle.
const SHROUD = ['mM.', 'mMN', 'MMN', 'MnN', 'MnN', 'nnN', 'nN.'];
const GUN_SHIELD = ['WW', 'Wv', 'wv', 'wv', 'wv', 'wv', 'wv', 'wv', 'wv', 'wv', 'vu', 'vu', 'uu'];

// Artillery barrels: 3 rows thick (or 5 for the siege gun), bore at the tip.
function barrel3(len, brake = false) {
  const rows = ['m'.repeat(len - 1) + 'M', 'M'.repeat(len - 1) + 'k', 'n'.repeat(len - 1) + 'N'];
  if (!brake) return rows;
  const pad = '.'.repeat(len - 3);
  return [pad + 'mMN', rows[0].slice(0, len - 3) + 'mmM', rows[1].slice(0, len - 3) + 'MMk', rows[2].slice(0, len - 3) + 'nnN', pad + 'nNN'];
}
const SIEGE_BARREL = (() => {
  const len = 15;
  const body = ['m'.repeat(len) , 'm' + 'M'.repeat(len - 1), 'M'.repeat(len - 1) + 'k', 'n'.repeat(len), 'N'.repeat(len)];
  const brake = ['mMMN', 'mMMN', 'MMMN', 'MMkN', 'nnnN', 'nNNN', 'NNNN'];
  return { body, brake };
})();
const RECUP = (len) => ['m'.repeat(len - 1) + 'N'];

// Ion emitter prongs and glow cores (i/I/J = ion ramp, # = white core).
const prong = (len, ring = false) => [
  (ring ? 'mmsSmm' + 'm'.repeat(len - 7) : 'm'.repeat(len - 1)) + 'i',
  (ring ? 'nnSZnn' + 'n'.repeat(len - 7) : 'n'.repeat(len - 1)) + 'I',
];
const CORE_S = ['.i.', 'i#I', '.I.'];
const CORE_M = ['.ii.', 'i##I', 'i#iI', '.II.'];
const CORE_L = ['.iii.', 'i##iI', 'i#iiI', 'iiiIJ', '.IIJ.'];
const ION_HOUSING = (h) => [
  '.WWWWWv',
  'WwwwwvN',
  ...Array.from({ length: h - 4 }, (_, i) => (i % 3 === 1 ? 'wsSZvvN' : 'wwwwvvN')),
  'vvvvvuN',
  '.uuuuu.',
];
const COIL = ['iI', 'kk', 'iI', 'kk', 'iI'];

// ------------------------------------------------------------- heads -------
function assembleN(w, h, parts) {
  const bm = new Bitmap(w, h);
  for (const [map, x, y] of parts) blit(bm, fromMap(map), x, y);
  return outline(bm);
}

const H = {
  repeater_t1: (f) => assembleN(19, 9, [[DRUM_TOP, 1, 1], [STEEL_HOUSING(7, 6), 2, 2], [rotary(10, f), 9, 2]]),
  repeater_t2: (f) => assembleN(22, 11, [[STEEL_HOUSING(8, 8), 2, 2], [DRUM_TOP, 1, 1], [DRUM_TOP, 1, 5], [rotary(12, f), 10, 3]]),
  repeater_t3: (f) => assembleN(24, 13, [[ARMOR_HOUSING(10), 1, 2], [DRUM_TOP, 2, 1], [rotary(13, f), 10, 4], [GUN_SHIELD.slice(0, 11), 10, 1]]),
  repeater_t4a: (f) => assembleN(24, 17, [[ARMOR_HOUSING(13), 1, 2], [DRUM_TOP, 2, 1], [DRUM_TOP, 2, 11], [rotary(13, f), 10, 2], [rotary(13, f), 10, 10], [OPTIC, 7, 7]]),
  repeater_t4b: (f) => assembleN(27, 15, [[ARMOR_HOUSING(11), 1, 2], [DRUM_TOP, 2, 1], [rotary(14, f), 10, 6], [SHROUD, 22, 4], [GUN_SHIELD, 10, 1]]),

  artillery_t1: () => assembleN(19, 9, [[ART_HOUSING(7, 7), 1, 1], [barrel3(10), 8, 3]]),
  artillery_t2: () => assembleN(23, 10, [[ART_HOUSING(8, 8), 1, 1], [barrel3(12, true), 9, 3], [RECUP(5), 9, 2]]),
  artillery_t3: () => assembleN(25, 13, [[ARMOR_HOUSING(10), 1, 1], [barrel3(14, true), 10, 4], [RECUP(6), 10, 3], [RECUP(6), 10, 9], [OPTIC, 4, 5]]),
  artillery_t4a: () => assembleN(29, 15, [[ARMOR_HOUSING(12), 1, 1], [SIEGE_BARREL.body, 10, 5], [SIEGE_BARREL.brake, 24, 4], [RECUP(7), 10, 4], [RECUP(7), 10, 10]]),
  artillery_t4b: () => assembleN(21, 15, [[ARMOR_HOUSING(12), 1, 1], [barrel3(9, true), 10, 1], [barrel3(9, true), 10, 6], [barrel3(9, true), 10, 11], [SHELL_RACK.slice(1, 7).map((r) => r.slice(1, 7)), 2, 5]]),

  ion_t1: () => assembleN(16, 9, [[ION_HOUSING(7), 1, 1], [prong(8), 7, 1], [prong(8), 7, 6], [CORE_S, 8, 3]]),
  ion_t2: () => assembleN(19, 11, [[ION_HOUSING(9), 1, 1], [prong(10, true), 8, 1], [prong(10, true), 8, 8], [CORE_M, 8, 4], [COIL, 3, 3]]),
  ion_t3: () => assembleN(21, 13, [[ION_HOUSING(11), 1, 1], [prong(11, true), 8, 1], [prong(11, true), 8, 10], [prong(7), 12, 5], [CORE_L, 8, 4], [COIL, 3, 4]]),
};

// ------------------------------------------------------------- bases -------
// Static ion emitters (tier 4): drawn as part of the base.
const ARC_MAST = [
  '....kkk....',
  '...ki#ik...',
  '..ki###ik..',
  '..kI#i#Ik..',
  '...kIiIk...',
  '....kJk....',
  'kkkkkmkkkkk',
  'kWwwwmwwwvk',
  '.kkkknkkkk.',
  '....kmk....',
  '..kkkmkkk..',
  '..kWwmwvk..',
  '...kknkk...',
  '....kmk....',
  '.kkkkmkkkk.',
  '.kWwwmwwvk.',
  '..kkknkkk..',
  '....kMk....',
  '...kMnNk...',
  '...kkkkk...',
];
const PULSE_DOME = [
  '......kkkkkk......',
  '....kkWWWWwwkk....',
  '...kWWWWWwwwwvk...',
  '..kWWW##wwwwwvvk..',
  '..kWW#iwwwwwwvvk..',
  '.kWWwwwwwwwwwvvuk.',
  '.kiiiiiiiiiiIIIIk.',
  '.kIIIIIIIIIIJJJJk.',
  '.kwwwwwwwwwvvvvuk.',
  'kWwwwwwwwwwwvvvuuk',
  'ksssssssssssSSSSZk',
  'kSSsssssssSSSSSZZk',
  'kwwwwwwwwwwvvvvuuk',
  'kvvvvvvvvvvvuuuuuk',
  '.kkkkkkkkkkkkkkkk.',
];
const CAPACITOR = [
  '.kkkk.',
  'kmmmMk',
  'kiiiIk',
  'kMMMnk',
  'kiiiIk',
  'kMMMnk',
  'knnnNk',
  '.kkkk.',
];
const SPADE_L = [
  '....kk',
  '...kMk',
  '..kMnk',
  '.kMnk.',
  'kMnk..',
  'kkk...',
];
const SPADE_R = SPADE_L.map((r) => [...r].reverse().join('').replace(/M/g, 'X').replace(/n/g, 'M').replace(/X/g, 'n'));

export const REPEATER = {
  t1: { stripe: 'repeater', flash: 'blue', spin: true, base: [[MOUNT, 0, 0]], head: H.repeater_t1, pivot: [5, 4], mount: [8, 4], muzzleRows: [4] },
  t2: { stripe: 'repeater', flash: 'blue', spin: true, base: [[MOUNT, 0, 0], [PLINTH_BAGS, -2, 12]], head: H.repeater_t2, pivot: [5, 5], mount: [8, 4], muzzleRows: [5] },
  t3: { stripe: 'repeater', flash: 'blue', spin: true, base: [[MOUNT, 0, 0], [PLINTH_BAGS, -2, 12], [AMMO_BOX, -3, 9]], head: H.repeater_t3, pivot: [5, 6], mount: [8, 4], muzzleRows: [6] },
  t4a: { stripe: 'repeater', flash: 'blue', spin: true, base: [[RADAR_MAST, -2, -7], [MOUNT, 0, 0], [BLAST_SHIELD, -2, 11], [AMMO_BOX, 12, 9]], head: H.repeater_t4a, pivot: [5, 8], mount: [8, 4], muzzleRows: [4, 12] },
  t4b: { stripe: 'repeater', flash: 'blue', spin: true, base: [[MOUNT, 0, 0], [BLAST_SHIELD, -2, 11], [AMMO_BOX, -3, 9], [AMMO_BOX, 12, 9]], head: H.repeater_t4b, pivot: [5, 8], mount: [8, 4], muzzleRows: [8] },
};

export const ARTILLERY = {
  t1: { stripe: 'artillery', flash: 'fire', base: [[MOUNT, 0, 0], [SPADE_L, -3, 10], [SPADE_R, 13, 10]], head: H.artillery_t1, pivot: [4, 4], mount: [8, 4], muzzleRows: [4] },
  t2: { stripe: 'artillery', flash: 'fire', base: [[MOUNT, 0, 0], [SPADE_L, -4, 10], [SPADE_R, 14, 10], [PLINTH_BAGS, -2, 12]], head: H.artillery_t2, pivot: [5, 5], mount: [8, 4], muzzleRows: [5] },
  t3: { stripe: 'artillery', flash: 'fire', base: [[MOUNT, 0, 0], [PLINTH_PLATE, -2, 11], [SHELL_RACK, -4, 8], [SPADE_R, 14, 10]], head: H.artillery_t3, pivot: [5, 6], mount: [8, 4], muzzleRows: [6] },
  t4a: { stripe: 'artillery', flash: 'fire', base: [[RADAR_DISH, 11, -8], [MOUNT, 0, 0], [BLAST_SHIELD, -2, 11], [SHELL_RACK, -4, 8]], head: H.artillery_t4a, pivot: [5, 7], mount: [8, 4], muzzleRows: [7] },
  t4b: { stripe: 'artillery', flash: 'fire', base: [[MOUNT, 0, 0], [PLINTH_PLATE, -2, 11], [SHELL_RACK, -4, 8], [SHELL_RACK, 11, 9]], head: H.artillery_t4b, pivot: [5, 7], mount: [8, 4], muzzleRows: [3, 8, 13] },
};

export const ION = {
  t1: { stripe: 'ion', flash: 'ion', base: [[MOUNT, 0, 0]], head: H.ion_t1, pivot: [4, 4], mount: [8, 4], muzzleRows: [4] },
  t2: { stripe: 'ion', flash: 'ion', base: [[MOUNT, 0, 0], [PLINTH_PLATE, -2, 11]], head: H.ion_t2, pivot: [4, 5], mount: [8, 4], muzzleRows: [5] },
  t3: { stripe: 'ion', flash: 'ion', base: [[MOUNT, 0, 0], [PLINTH_PLATE, -2, 11], [CAPACITOR, -3, 7]], head: H.ion_t3, pivot: [5, 6], mount: [8, 4], muzzleRows: [6] },
  // static emitters: `emit` = point (base pixels, 1x) where arcs / pulses originate
  t4a: { stripe: 'ion', flash: 'ion', static: true, base: [[MOUNT, 0, 0], [ARC_MAST, 3, -15], [PLINTH_PLATE, -2, 11], [CAPACITOR, -3, 7], [CAPACITOR, 13, 7]], emit: [8, -12] },
  t4b: { stripe: 'ion', flash: 'ion', static: true, base: [[PULSE_DOME, -1, -2], [BLAST_SHIELD, -2, 11], [CAPACITOR, 15, 6]], emit: [8, 3] },
};
