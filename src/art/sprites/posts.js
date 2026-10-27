// Sharpshooter Post (1x1 watchtower with one marksman) and Supply Depot
// (2x2 logistics yard). Both are hand-placed 1x part maps, laid out on a 1x
// canvas and upscaled with hd(). The watchtower is split into a BACK layer
// (legs, deck) and a FRONT layer (parapet, deck face, roof poles) so the
// 2x trooper stands between them, like the Rifle Squad nest.

import { PLINTH_BAGS, BLAST_SHIELD } from './turrets.js';

// ------------------------------------------------------------ watchtower ---
export const POST_W = 20, POST_H = 40; // 1x canvas; bottom row = footprint bottom

// Steel legs with X bracing (12 rows), tie bar, feet. `top` = first leg row.
function legs(top, bottom = POST_H - 1) {
  const X = [
    '..kmNkn......nkmNk..',
    '..kmNk.n....n.kmNk..',
    '..kmNk..n..n..kmNk..',
    '..kmNk...nn...kmNk..',
    '..kmNk...nn...kmNk..',
    '..kmNk..n..n..kmNk..',
    '..kmNk.n....n.kmNk..',
    '..kmNkn......nkmNk..',
  ];
  const tie = '..kmNknnnnnnnnkmNk..';
  const leg = '..kmNk........kmNk..';
  const rows = [];
  let y = top;
  while (y < bottom - 1) {
    for (const r of X) { if (y >= bottom - 2) break; rows.push([r, y++]); }
    if (y < bottom - 1) rows.push([tie, y++]);
  }
  rows.push(['.kMMNNk......kMMNNk.', bottom - 1]);
  rows.push(['.kkkkkk......kkkkkk.', bottom]);
  return rows;
}
const DECK_TOP = [
  '..kkkkkkkkkkkkkkkk..',
  '..kmmmmmmmmmmmmmMk..',
  '..kMMMMMMMMMMMMMnk..',
];
const DECK_FACE = [
  '..kkkkkkkkkkkkkkkk..',
  '..kmmmmmmmmmmmmmMk..',
  '..knnnnnnnnnnnnnNk..',
  '..kkkkkkkkkkkkkkkk..',
];
const PIPE_RAIL = [
  '..kk............kk..',
  '..kmkkkkkkkkkkkkMk..',
  '..kmmmmmmmmmmmmmMk..',
  '..kNkkkkkkkkkkkknk..',
  '..kNk..........knk..',
];
const LADDER = ['kMMk', 'k..k'];
const ROOF_CANVAS = [
  '.kkkkkkkkkkkkkkkkkk.',
  'kllllllllllllllllLLk',
  'kLLLLLLLLLLLLLLLLLjk',
  'kjLjLjLjLjLjLjLjLjjk',
  '.kkkkkkkkkkkkkkkkkk.',
];
const ROOF_ARMOR = [
  '.kkkkkkkkkkkkkkkkkk.',
  'kWWWWWWWWWWWWWWWWwvk',
  'kwwwwwwwwwwwwwwwwvuk',
  'ksssssssssssssssSSZk',
  '.kkkkkkkkkkkkkkkkkk.',
];
const POLE = ['knk'];
const SEARCHLIGHT = [
  '.kkkk',
  'kTTmk',
  'k#TMk',
  'kTtnk',
  '.kkkk',
  '..kn.',
  '..kn.',
];
const SCOPE = [
  'kkkkkk.',
  'kTmmMNk',
  'kkkkkk.',
  '..kNk..',
  '.kNkNk.',
  'kNk.kNk',
];
const PENNANT = [
  'kk.....',
  'kNkkkk.',
  'kNssSSk',
  'kNsSZk.',
  'kNkkk..',
  'kNk....',
  'kNk....',
  'kNk....',
];
const COIL_BANK = [
  '.kkkkkkkkkkkkkk.',
  'kmmmmmmmmmmmmmMk',
  'kMkiIkMkiIkMkiIk',
  'kMkiIkMkiIkMkiIk',
  'kMkIJkMkIJkMkIJk',
  'knnnnnnnnnnnnnNk',
  '.kkkkkkkkkkkkkk.',
];

// Layers per tier: [map, x, y] in 1x post space. `deck` = row of the deck
// surface (trooper feet stand on deck + 1).
export const SHARPSHOOTER = {
  t1: {
    deck: 22, weapon: 'longrifle', stripe: 'sharpshooter',
    back: [...legs(29).map(([r, y]) => [[r], 0, y]), [DECK_TOP, 0, 22]],
    front: [[PIPE_RAIL, 0, 20], [DECK_FACE, 0, 25], [LADDER, 8, 29], [LADDER, 8, 31], [LADDER, 8, 33], [LADDER, 8, 35], [LADDER, 8, 37]],
  },
  t2: {
    deck: 18, weapon: 'longrifle', stripe: 'sharpshooter',
    back: [...legs(25).map(([r, y]) => [[r], 0, y]), [DECK_TOP, 0, 18], ...Array.from({ length: 13 }, (_, i) => [POLE, 3, 5 + i]), ...Array.from({ length: 13 }, (_, i) => [POLE, 14, 5 + i])],
    front: [[ROOF_CANVAS, 0, 0], [PLINTH_BAGS, 0, 16], [DECK_FACE, 0, 21], ...Array.from({ length: 11 }, (_, i) => [POLE, 1, 5 + i]), ...Array.from({ length: 11 }, (_, i) => [POLE, 16, 5 + i])],
  },
  t3: {
    deck: 18, weapon: 'longrifle', stripe: 'sharpshooter',
    back: [...legs(25).map(([r, y]) => [[r], 0, y]), [DECK_TOP, 0, 18], ...Array.from({ length: 13 }, (_, i) => [POLE, 3, 5 + i]), ...Array.from({ length: 13 }, (_, i) => [POLE, 14, 5 + i])],
    front: [[ROOF_ARMOR, 0, 0], [BLAST_SHIELD, 0, 15], [DECK_FACE, 0, 21], ...Array.from({ length: 10 }, (_, i) => [POLE, 1, 5 + i]), ...Array.from({ length: 10 }, (_, i) => [POLE, 16, 5 + i]), [SEARCHLIGHT, 15, 6], [PLINTH_BAGS, 0, 35]],
  },
  t4a: {
    deck: 18, weapon: 'longrifle', stripe: 'breaker',
    back: [...legs(25).map(([r, y]) => [[r], 0, y]), [DECK_TOP, 0, 18], ...Array.from({ length: 13 }, (_, i) => [POLE, 3, 5 + i]), ...Array.from({ length: 13 }, (_, i) => [POLE, 14, 5 + i]), [SCOPE, 12, 12]],
    front: [[ROOF_ARMOR, 0, 0], [PENNANT, 2, -6], [BLAST_SHIELD, 0, 15], [DECK_FACE, 0, 21], ...Array.from({ length: 10 }, (_, i) => [POLE, 1, 5 + i]), ...Array.from({ length: 10 }, (_, i) => [POLE, 16, 5 + i]), [PLINTH_BAGS, 0, 35]],
  },
  t4b: {
    deck: 18, weapon: 'railrifle', stripe: 'sharpshooter',
    back: [...legs(25).map(([r, y]) => [[r], 0, y]), [DECK_TOP, 0, 18], ...Array.from({ length: 13 }, (_, i) => [POLE, 3, 5 + i]), ...Array.from({ length: 13 }, (_, i) => [POLE, 14, 5 + i])],
    front: [[ROOF_ARMOR, 0, 0], [BLAST_SHIELD, 0, 15], [DECK_FACE, 0, 21], ...Array.from({ length: 10 }, (_, i) => [POLE, 1, 5 + i]), ...Array.from({ length: 10 }, (_, i) => [POLE, 16, 5 + i]), [SEARCHLIGHT, 15, 6], [COIL_BANK, 2, 32]],
  },
};

// -------------------------------------------------------------- depot ------
export const DEPOT_W = 32, DEPOT_H = 44; // 1x canvas; bottom row = footprint bottom

const FLOOR = [
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'kMMMMMMMMMMMMMMMMMMMMMMMMMMMMMnk',
  'kndDnnnnnnnnnnnnnnnnnnnnnnnndDNk',
  'knDnnnnnnnnnnnnnnnnnnnnnnnnnnDNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'kNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'kNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'kNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNk',
  'knnnnnnnnnnnnnnNnnnnnnnnnnnnnnNk',
  'knDnnnnnnnnnnnnNnnnnnnnnnnnnnDNk',
  'kndDnnnnnnnnnnnNnnnnnnnnnnnndDNk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  'knnnnnnnnnnnnnnnnnnnnnnnnnnnnnNk',
  'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
];
const CRATE = [
  '.kkkkkk.',
  'kllllllk',
  'kLLLLLLk',
  'kkkkkkkk',
  'kLdDLLjk',
  'kLLLLLjk',
  'kjjjjjjk',
  'kkkkkkkk',
];
const CRATE_WHITE = [
  '.kkkkkk.',
  'kWWWWwwk',
  'kwwwwwvk',
  'kkkkkkkk',
  'kwsSwvuk',
  'kwwwvvuk',
  'kvvvvuuk',
  'kkkkkkkk',
];
const BARREL = [
  '.kkkk.',
  'kmmmMk',
  'kMMMnk',
  'kkkkkk',
  'kmMMnk',
  'kpPPPk',
  'kmMMnk',
  'kMMnNk',
  '.kkkk.',
];
const TENT = [
  '.......kkkk.......',
  '.....kkllllkk.....',
  '...kkllllllLLkk...',
  '..klllllllLLLLLk..',
  '.kllllllllLLLLLLk.',
  'kllllllLLLLLLLLjjk',
  'kLLLLLLLLLLLLLjjjk',
  'kLLLLLkkkkkLLjjjjk',
  'kLLLLkBBBBBkjjjjjk',
  'kjLLkBBBBBBBkjjjjk',
  'kjjjkBBBBBBBkjjjjk',
  'kjjjkBBBBBBBkjjjjk',
  'kkkkkkkkkkkkkkkkkk',
];
const HUT = [
  '..kkkkkkkkkkkkkkkk..',
  '.kmmmmmmmmmmmmmmmMk.',
  'kmMMMMMMMMMMMMMMMMnk',
  'kMMMMMMMMMMMMMMMMMnk',
  'kkkkkkkkkkkkkkkkkkkk',
  'kWWWWWWWWWWWWWWWWWvk',
  'kWwwwwwwwwwwwwwwwvuk',
  'kssssssssssssssSSSZk',
  'kSSSSSSSSSSSSSSSZZZk',
  'kwwkkkkkwwwwkkkkkwuk',
  'kwkbbbbbkwwkTTTtkvuk',
  'kwkbBBBBkwwkTTttkvuk',
  'kwkbBBBBkwwkTtttkvuk',
  'kwkbBBBBkwwkkkkkkvuk',
  'kwkbBBBBkwwwwwwwvvuk',
  'kvkbBBBBkvvvvvvvvuuk',
  'kvkbBBBBkvvvvvvvuuuk',
  'kkkkkkkkkkkkkkkkkkkk',
];
const ANTENNA = ['.k.', 'kxk', '.k.', '.n.', '.n.', '.n.', '.n.', '.n.', 'knk'];
const CRANE = [
  'kkkkkkkkkkkkkk',
  'kddddddddddddk',
  'kDDDDDDDDDdDDk',
  'kkknkkkkkkkdDk',
  '...n......kdDk',
  '...n......kdDk',
  '..kMk.....kdDk',
  '.kkkkkk...kdDk',
  '.klllLk...kdDk',
  '.kLdDjk...kdDk',
  '.kjjjjk...kdDk',
  '.kkkkkk...kdDk',
  '..........kdDk',
  '..........kdDk',
  '..........kdDk',
  '..........kdDk',
  '.........kMMNk',
  '.........kkkkk',
];
const VAULT = [
  '...kkkkkkkkkkkkkkkkkk...',
  '..kdddddddddddddddddDk..',
  '.kmmmmmmmmmmmmmmmmmmmMk.',
  'kmMMMMMMMMMMMMMMMMMMMMnk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
  'kWWWWWWWWWWWWWWWWWWWWWvk',
  'kWwwwwwwwwwwwwwwwwwwwvuk',
  'kddddddddddddddddddDDDDk',
  'kwwwwwwwkkkkkkkkwwwwwvuk',
  'kwkkkkwkdddddDDDkwkkkvuk',
  'kwkTTkwkddkkkkDDkwkcckuk',
  'kwkTtkwkdkDddkDDkwkxxkuk',
  'kwkkkkwkdkdDDkDDkwkkkvuk',
  'kwwwwwwkdkkkkkDDkwwwwvuk',
  'kwwwwwwkddDDDDDDkwwwvvuk',
  'kvvvvvvkDDDDDDDDkvvvvuuk',
  'kvvvvvvkkkkkkkkkkvvvuuuk',
  'kkkkkkkkkkkkkkkkkkkkkkkk',
];
const CHIPS = [
  '.kkk.kkk.',
  'kdddkdddk',
  'kDDDkDDDk',
  'kdddkdddk',
  'kDDDkDDDk',
  '.kkk.kkk.',
];
const RELAY_MAST = [
  'kk.........kk',
  'kWkk.....kkvk',
  '.kWWkkkkkwvk.',
  '.kWwwwwwwwvk.',
  '..kkwwwwvkk..',
  '....kkxkk....',
  '.....kmk.....',
  '....kmnNk....',
  '....kn.Nk....',
  '....knkNk....',
  '....kn.Nk....',
  '....knkNk....',
  '....kn.Nk....',
  '....knkNk....',
  '....kn.Nk....',
  '....knkNk....',
  '...kmn.NNk...',
  '...knkkkNk...',
  '...kn...Nk...',
  '..kmnkkkNNk..',
  '..kkkkkkkkk..',
];

// Layers per tier in 1x depot space ([map, x, y]); `beacon` keys blink.
export const DEPOT = {
  t1: [[FLOOR, 0, 17], [TENT, 3, 14], [CRATE, 21, 20], [CRATE, 22, 26], [CRATE, 14, 31], [BARREL, 5, 31]],
  t2: [[FLOOR, 0, 17], [ANTENNA, 15, 6], [HUT, 2, 12], [CRATE, 23, 24], [CRATE_WHITE, 22, 31], [BARREL, 5, 32], [CRATE, 13, 33]],
  t3: [[FLOOR, 0, 17], [ANTENNA, 15, 6], [HUT, 2, 12], [CRANE, 18, 10], [CRATE_WHITE, 23, 31], [BARREL, 4, 32], [CRATE, 13, 33]],
  t4a: [[FLOOR, 0, 17], [ANTENNA, 4, 4], [VAULT, 4, 10], [CHIPS, 3, 31], [CHIPS, 21, 31], [CRATE_WHITE, 12, 33]],
  t4b: [[FLOOR, 0, 17], [RELAY_MAST, 19, 0], [HUT, 1, 12], [ANTENNA, 4, 6], [CRATE_WHITE, 23, 31], [BARREL, 4, 32], [CRATE, 13, 33]],
};
