// Umbara: perpetual night, glowing swamp ('H'), fungus ('X'). Shield
// walkers, tactical droids, heavy air. Umbara 4 is the Night Dreadnought.

const ALL = ['rifle', 'rocket', 'flak', 'repeater', 'ion', 'artillery', 'sharpshooter', 'depot'];

export const UMBARA = [
  {
    id: 'umbara-1', planet: 'umbara', index: 1, name: 'Glow March',
    size: [48, 28], startCredits: 660, towers: ALL,
    paths: [[[-1, 14], [12, 14], [12, 4], [28, 4], [28, 24], [40, 24], [40, 12], [48, 12]]],
    lanes: [[[-1, 2], [48, 26]], [[-1, 26], [24, 14], [48, 2]]],
    hazards: [[15, 8, 24, 20], [0, 0, 7, 8], [31, 6, 46, 9], [33, 15, 37, 21]],
    rough: [[2, 22, 4, 23], [43, 2, 45, 3], [18, 25, 20, 26]],
    props: [['glowplant', 9, 9], ['glowplant', 44, 18], ['spores', 26, 26], ['tree', 3, 17], ['tree', 46, 4], ['glowplant', 30, 1], ['spores', 11, 23], ['tree', 22, 1]],
    briefing: ['CAPTAIN RAEL: NO SUN ON UMBARA. YOUR GUNS SEE FINE; YOUR EYES WILL NOT.', 'SHIELD WALKERS PROJECT BUBBLES ONTO EVERYTHING AROUND THEM.', 'BREAK THE WALKER AND THE BUBBLES GO WITH IT.'],
    recipes: [
      'shieldwalker:1 trooper:2', 'commando:2 rush:1', 'bomber:1 fighter:2', 'shieldwalker:2 scuttler:1', 'tank:1 crawler:1', 'carrier:2 repair:1',
      'shieldwalker:2 commando:2', 'bomber:2 fighter:1', 'crawler:2 shieldwalker:1', 'tank:2 repair:1', 'scuttler:3 shieldwalker:2', 'bomber:2 carrier:2',
      'shieldwalker:3 tank:1', 'fighter:2 bomber:2 repair:1', 'crawler:3 shieldwalker:2', 'tank:2 carrier:2 bomber:1', 'shieldwalker:3 commando:2 fighter:2',
      'tank:2 shieldwalker:2 bomber:2 scuttler:1', 'shieldwalker:3 crawler:2 tank:2 bomber:2',
    ], spread: { lanes: 2 },
  },
  {
    id: 'umbara-2', planet: 'umbara', index: 2, name: 'Twin Causeways',
    size: [48, 28], startCredits: 680, towers: ALL,
    paths: [
      [[-1, 6], [20, 6], [20, 12], [48, 12]],
      [[-1, 22], [26, 22], [26, 16], [48, 16]],
    ],
    lanes: [[[-1, 14], [48, 2]], [[-1, 14], [48, 26]]],
    hazards: [[0, 9, 16, 19], [30, 0, 40, 9], [30, 19, 40, 27], [22, 14, 24, 14]],
    rough: [[4, 1, 6, 2], [44, 21, 46, 22], [44, 5, 46, 6], [10, 25, 12, 26]],
    props: [['glowplant', 24, 2], ['glowplant', 24, 25], ['spores', 44, 9], ['tree', 2, 3], ['tree', 2, 25], ['glowplant', 46, 18], ['spores', 18, 26], ['tree', 42, 2]],
    briefing: ['CAPTAIN RAEL: TWO CAUSEWAYS THROUGH THE SWAMP, BOTH LIVE.', 'TACTICAL DROIDS ARE LEADING THEM. EVERYTHING NEAR ONE MOVES FASTER.', 'KILL THE COMMANDERS AND THE COLUMNS SLOW DOWN.'],
    recipes: [
      'tactical:1 trooper:3', 'shieldwalker:1 commando:2', 'bomber:2 fighter:1', 'tactical:1 rush:3', 'tank:2 repair:1', 'carrier:2 tactical:1',
      'shieldwalker:2 crawler:1', 'bomber:2 fighter:2', 'tactical:2 commando:3', 'tank:2 shieldwalker:1', 'scuttler:3 tactical:1 carrier:1', 'bomber:2 repair:2',
      'crawler:2 tactical:2', 'tank:2 shieldwalker:2', 'fighter:3 bomber:2', 'tactical:2 rush:3 shieldwalker:1', 'tank:3 crawler:2 repair:1',
      'bomber:3 tactical:2', 'shieldwalker:2 tank:2 tactical:2 fighter:2', 'tactical:2 crawler:2 tank:2 bomber:2 shieldwalker:1',
    ], spread: { paths: 2, lanes: 2 },
  },
  {
    id: 'umbara-3', planet: 'umbara', index: 3, name: 'Spore Crossing',
    size: [48, 28], startCredits: 700, towers: ALL,
    paths: [
      [[-1, 4], [24, 4], [24, 14], [48, 14]],
      [[-1, 24], [24, 24], [24, 14], [48, 14]],
      [[12, -1], [12, 9], [24, 9], [24, 14], [48, 14]],
    ],
    lanes: [[[-1, 14], [48, 2]], [[-1, 14], [48, 26]], [[24, -1], [24, 28]]],
    hazards: [[0, 9, 9, 19], [28, 3, 44, 10], [28, 18, 44, 25], [14, 12, 20, 20]],
    rough: [[2, 1, 4, 2], [45, 20, 46, 21], [16, 26, 18, 27]],
    props: [['glowplant', 5, 6], ['glowplant', 5, 21], ['spores', 26, 26], ['tree', 46, 4], ['tree', 46, 24], ['glowplant', 20, 1], ['spores', 34, 12], ['tree', 3, 26]],
    briefing: ['CAPTAIN RAEL: THREE ROUTES CONVERGE ON THE SPORE CROSSING.', 'THE AIR WILL BE THICK WITH GUNSHIPS. KEEP FLAK ON EVERY LANE.', 'HOLD THE CROSSING AND NOTHING GETS EAST.'],
    recipes: [
      'trooper:3 tactical:1', 'bomber:2 repair:1', 'shieldwalker:1 commando:2 rush:1', 'fighter:3 bomber:1', 'tank:2 tactical:1', 'carrier:2 crawler:1',
      'bomber:3 repair:1', 'shieldwalker:2 tactical:1 commando:1', 'fighter:3 scuttler:2', 'tank:2 crawler:2', 'bomber:3 fighter:2', 'tactical:2 shieldwalker:2',
      'carrier:2 tank:2 repair:1', 'bomber:3 fighter:3', 'crawler:3 tactical:2', 'tank:3 shieldwalker:2', 'bomber:3 repair:2 fighter:2',
      'tactical:2 tank:2 crawler:2', 'bomber:3 shieldwalker:2 tank:2', 'fighter:3 bomber:3 tactical:2 tank:2', 'shieldwalker:2 tank:2 bomber:3 crawler:2 tactical:2',
    ], spread: { paths: 3, lanes: 3 },
  },
  {
    id: 'umbara-4', planet: 'umbara', index: 4, name: 'Dark Skies', boss: 'dreadnought',
    size: [48, 28], startCredits: 730, towers: ALL,
    paths: [[[48, 4], [30, 4], [30, 24], [10, 24], [10, 10], [-1, 10]]],
    lanes: [[[48, 20], [24, 12], [-1, 6]], [[48, 8], [-1, 20]]],
    hazards: [[34, 9, 47, 19], [14, 6, 26, 19], [0, 14, 6, 27]],
    rough: [[44, 25, 46, 26], [2, 1, 4, 2], [20, 1, 22, 2]],
    props: [['glowplant', 36, 1], ['glowplant', 8, 3], ['spores', 33, 26], ['tree', 46, 2], ['tree', 4, 7], ['glowplant', 26, 26], ['spores', 13, 1], ['tree', 40, 22]],
    briefing: ['CAPTAIN RAEL: A DREADNOUGHT IS COMING IN LOW OVER THE SWAMP.', 'IT DROPS BOMBERS AND BLINDS OUR GUNS: TOWERS NEAR IT LOSE RANGE FOR A WHILE.', 'IT FLIES. ONLY ANTI-AIR CAN TOUCH IT.'],
    recipes: [
      'trooper:2 tactical:1', 'bomber:2 fighter:1', 'shieldwalker:1 commando:2', 'tank:2 repair:1', 'fighter:3 bomber:1', 'crawler:2 tactical:1',
      'carrier:2 bomber:2', 'shieldwalker:2 tank:1', 'fighter:3 repair:2', 'tactical:2 commando:3', 'bomber:3 crawler:1', 'tank:2 shieldwalker:2',
      'fighter:3 bomber:2', 'tactical:2 carrier:2 repair:1', 'tank:3 crawler:2', 'bomber:3 fighter:2 repair:1', 'shieldwalker:2 tactical:2 tank:2',
      'bomber:3 tank:2', 'crawler:2 shieldwalker:2 fighter:3', 'tank:2 tactical:2 bomber:3', 'shieldwalker:2 crawler:2 tank:2 bomber:2',
      '@dreadnought fighter:2 bomber:1 tactical:1',
    ], spread: { lanes: 2 },
  },
];
