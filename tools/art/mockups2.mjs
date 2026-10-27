// One map mockup per Phase 2 planet (26x14 tiles = 832x448 world px at 2x
// detail), each featuring that planet's boss, new towers and new droids.

import { scene } from './scene.mjs';

const c = (t) => t * 32 + 16; // tile center
const feet = (t) => t * 32 + 26; // ground unit standing on a path row

export const GRIDS = {
  geonosis: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGXGGGGGGGGGGGGGGGGXGGG',
    'PPPPPPPPPGGGGGGGGGGGGGGGGG',
    'GGGGGGGGPGGGGGGGGGGGGGGGGG',
    'GGXGGGGGPGGGGGGGGGGXGGGGGG',
    'GGGGGGGGPGGGGGGGGGGGGGGGGG',
    'GGGGGGGGPGGGGGGGGGGGGGGGGG',
    'GGGGGGGGPGGGGHHHHHHGGGGGGG',
    'GGGGGGGGPGGGGHHHHHHGGGGGGG',
    'GGGGGGGGPPPPPBBBBBBPPPPPPP',
    'GGGGXGGGGGGGGHHHHHHGGGGGGG',
    'GGGGGGGGGGGGGHHHHHHGGGXGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
  kashyyyk: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGXGGGG',
    'GGGPPPPPPPPPPPGGGGGGGGGGGG',
    'GGGPGGGGGGGGGPGGGGGGGGGGGG',
    'HHHBHHHHHGGGGPGGGGXGGGGGGG',
    'HHHBHHHHHGGGGPGGGGGGGGGGGG',
    'GGGPGGGXGGGGGPPPPPPPPPPGGG',
    'GGGPGGGGGGGGGGGGGGGGGGPGGG',
    'GGGPGGGGGGGGGGGGGGGGGGPGGG',
    'PPPPGGGGGGGHHHHHHHHHHHBHHH',
    'GGGGGGGGGGGHHHHHHHHHHHBHHH',
    'GGGXGGGGGGGGGGGGGGGGGGPGGG',
    'GGGGGGGGGGGGGGGGGGGGGGPPPP',
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
  umbara: [
    'GGGGGGGGHHHHHHHHGGGGGGGGGG',
    'GGXGGGGGHHHHHHHHGGGGGXGGGG',
    'PPPPPPPPBBBBBBBBPPPPPPGGGG',
    'GGGGGGGGHHHHHHHHGGGGGPGGGG',
    'GGGGGGGGHHHHHHHHGGGGGPGGGG',
    'GGGGXGGGGGGGGGGGGGGGGPGGGG',
    'GGGGGGGGGGGGGGGGGGGGGPGGGG',
    'GGGGGGPPPPPPPPPPPPPPPPGGGG',
    'GGGGGGPGGGGGGGGGGGGGGGGGGG',
    'HHHHHHBHHHHHHHGGGGGXGGGGGG',
    'HHHHHHBHHHHHHHGGGGGGGGGGGG',
    'GGGGGGPPPPPPPPPPPPPPPPPPPP',
    'GGXGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
  mustafar: [
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
    'GGGGXGGGGGGGGGGGGGGXGGGGGG',
    'PPPPPPPPPPPPPGGGGGGGGGGGGG',
    'GGGGGGGGGGGGPGGGGGGGGGGGGG',
    'HHHHHHHHHHHHBHHHHHHHHHHHHH',
    'HHHHHHHHHHHHBHHHHHHHHHHHHH',
    'GGGGGGGGGGGGPGGGGGGGGGXGGG',
    'GGXGGGGGGGGGPPPPPPPPPPGGGG',
    'GGGGGGGGGGGGGGGGGGGGGPGGGG',
    'GGGGGGGGGGGGGGGGGGGGGPGGGG',
    'GGGGGGGGHHHHHHHHGGGGGPGGGG',
    'GGGGGGGGHHHHHHHHGGGGGPGGGG',
    'PPPPPPPPBBBBBBBBPPPPPPGGGG',
    'GGGGGGGGGGGGGGGGGGGGGGGGGG',
  ],
};

export function mockups(art1, art2) {
  const V = art1.vfx, B = art2.bosses;
  const bolt = (d) => V.boltRep[d];
  const out = {};

  out.geonosis = scene(art1, art2, 'geonosis', GRIDS.geonosis, {
    frame: 0,
    decals: [[V.scorch[1], c(6), c(9)], [V.scorch[0], c(3), c(3)]],
    props: [['spire', 3, 0], ['spire', 24, 4], ['stack', 16, 3], ['pillar', 24, 12], ['wreck', 11, 4], ['spire', 1, 11], ['stack', 14, 12]],
    towers: [
      ['depot', 't2', 4, 5], ['repeater', 't2', 6, 3, 0, true], ['artillery', 't3', 11, 6, 12], ['ion', 't1', 10, 11, 26, true],
      ['sharpshooter', 't4a', 20, 7, 3, true], ['rifle', 't1', 19, 11, 6], ['ion', 't4b', 15, 5], ['repeater', 't4a', 2, 0, 4],
    ],
    ground: [['commando', c(3), feet(2)], ['commando', c(5) + 8, feet(2), 2], ['tank', c(8), feet(6), 1], ['carrier', c(10) + 10, feet(9), 1], ['trooper', c(19), feet(9), 3], ['trooper', c(20), feet(9), 0]],
    bosses: [[B.foundry.compose(0, { doorState: 2, broken: [1] }), c(23), feet(9) + 4, 130]],
    air: [['bomber', c(15), c(3), 0], ['fighter', c(17), c(1), 2]],
    fx: [[bolt(0), c(7) + 4, feet(2) - 22], [V.expM[4], c(8), feet(6) - 16], [V.smoke[3], c(12), c(8)]],
    glow: [[V.glowRep, c(7) + 4, feet(2) - 22], [V.glowFire, c(8), feet(6) - 16], [V.glowIon, c(10) + 6, feet(9) - 18]],
  });

  out.kashyyyk = scene(art1, art2, 'kashyyyk', GRIDS.kashyyyk, {
    frame: 2,
    props: [['trunk', 0, 0, 2], ['trunk', 16, 7, 2], ['trunk', 24, 0, 2], ['fern', 9, 1], ['fern', 19, 4], ['log', 6, 11], ['lamp', 12, 3], ['lamp', 21, 5], ['fern', 1, 12]],
    towers: [
      ['rocket', 't3', 5, 4, 20], ['flak', 't4b', 10, 4, 24], ['sharpshooter', 't3', 15, 3, 3, true], ['ion', 't4a', 8, 7],
      ['depot', 't4a', 18, 11], ['repeater', 't3', 14, 8, 26, true], ['artillery', 't4b', 1, 7, 28],
    ],
    ground: [
      ['scuttler', c(6), feet(2), 0], ['scuttler', c(6) + 14, feet(2) - 4, 2], ['scuttler', c(7) + 6, feet(2) + 2, 4], ['scuttler', c(8), feet(2) - 2, 1], ['scuttler', c(8) + 16, feet(2), 3],
      ['carrier', c(13), feet(4), 0], ['crawler', c(17), feet(6), 1], ['trooper', c(22), feet(11), 2],
    ],
    bosses: [[B.reaper.armored[1], c(19) + 4, feet(6) + 2, 120]],
    air: [['repair', c(14), c(7), 8], ['repair', c(16), c(8), 6], ['fighter', c(4), c(11), 30]],
    fx: [[bolt(26), c(14) + 6, c(7)], [V.expS[5], c(13), feet(4) - 14]],
    glow: [[V.glowFire, c(13), feet(4) - 14], [V.glowRep, c(14) + 6, c(7)]],
  });

  out.umbara = scene(art1, art2, 'umbara', GRIDS.umbara, {
    frame: 3,
    night: true,
    props: [['glowplant', 1, 4], ['glowplant', 17, 4], ['spores', 23, 7], ['tree', 3, 8], ['tree', 24, 12], ['glowplant', 15, 9], ['spores', 5, 0], ['tree', 18, 0]],
    towers: [
      ['ion', 't4b', 12, 5], ['flak', 't4b', 18, 5, 20], ['repeater', 't4a', 9, 8, 24, true], ['rifle', 't4a', 22, 8, 5],
      ['sharpshooter', 't4b', 2, 5, 1, true], ['artillery', 't2', 15, 12, 18],
    ],
    ground: [['shieldwalker', c(4), feet(2)], ['tactical', c(17), feet(2)], ['commando', c(18) + 10, feet(2), 3], ['crawler', c(13), feet(7), 1], ['trooper', c(9), feet(7), 4], ['shield', c(19), feet(11), 2]],
    bosses: [],
    air: [['dreadnought', c(10), c(4) + 8, 0, 60], ['bomber', c(20), c(10), 16], ['fighter', c(6), c(12), 0], ['fighter', c(8), c(13), 1]],
    fx: [[V.shield[5], c(4), feet(2) - 24, 0.55], [bolt(26), c(9), c(7) - 6]],
    glow: [[V.glowIon, c(12) + 16, c(5) - 30], [V.glowRep, c(9), c(7) - 6]],
  });

  const w = B.warlord.phases[2][1];
  out.mustafar = scene(art1, art2, 'mustafar', GRIDS.mustafar, {
    frame: 5,
    decals: [[V.scorch[2], c(16), c(7)], [V.scorch[1], c(5), c(2)]],
    props: [['rig', 2, 0], ['rig', 22, 9], ['obsidian', 9, 0], ['obsidian', 24, 1], ['vent', 6, 6], ['vent', 17, 9], ['obsidian', 1, 9]],
    towers: [
      ['artillery', 't4a', 15, 9, 22, true], ['sharpshooter', 't4b', 9, 7, 2, true], ['repeater', 't4b', 18, 6, 6, true],
      ['depot', 't4b', 3, 7], ['rocket', 't4a', 14, 1, 10], ['flak', 't4a', 6, 1, 24], ['ion', 't3', 23, 6, 14],
    ],
    ground: [['siege', c(2), feet(2)], ['tactical', c(7), feet(2), 1], ['tank', c(10), feet(2), 2], ['siege', c(17), feet(7), 3], ['commando', c(4), feet(12), 0]],
    bosses: [[w, c(21) - 6, feet(9) + 34, 110]],
    air: [['bomber', c(12), c(10), 24]],
    fx: [[V.expL[6], c(17), feet(7) - 20], [V.smokeBig[4], c(19), c(6) - 10], [bolt(10), c(13), c(3)]],
    glow: [[V.glowFire, c(17), feet(7) - 20], [V.glowFire, c(21), feet(9) - 60]],
  });
  return out;
}
