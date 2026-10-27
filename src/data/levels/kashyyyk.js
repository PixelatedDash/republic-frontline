// Kashyyyk: giant forest, misty ravines ('H'), root knots ('X'), 2x2
// trunks. Swarms and splitters. Kashyyyk 4 is the Timber Reaper.

const ALL = ['rifle', 'rocket', 'flak', 'repeater', 'ion', 'artillery', 'sharpshooter', 'depot'];

export const KASHYYYK = [
  {
    id: 'kashyyyk-1', planet: 'kashyyyk', index: 1, name: 'Canopy Walk',
    size: [48, 28], startCredits: 560, towers: ALL,
    paths: [[[24, -1], [24, 6], [8, 6], [8, 20], [40, 20], [40, 10], [48, 10]]],
    lanes: [[[-1, 26], [48, 4]]],
    hazards: [[12, 10, 20, 15], [28, 9, 36, 16], [0, 23, 6, 27]],
    rough: [[3, 2, 5, 3], [43, 14, 45, 15], [30, 24, 32, 25]],
    props: [['trunk', 1, 9], ['trunk', 44, 1], ['trunk', 22, 24], ['fern', 17, 3], ['fern', 36, 23], ['log', 11, 25], ['lamp', 22, 8], ['lamp', 38, 18], ['fern', 46, 21]],
    briefing: ['MASTER SERGEANT KADE: THE DROIDS DROPPED CARRIERS INTO THE FOREST.', 'EACH ONE IS FULL OF SCUTTLERS. CRACK IT AND THEY SPILL OUT.', 'SPLASH WEAPONS EARN THEIR KEEP HERE.'],
    recipes: [
      'scuttler:2 trooper:1', 'carrier', 'rush:2 commando:1', 'scuttler:3', 'carrier:2 trooper:1', 'tank:1 fighter:1',
      'scuttler:3 shield:1', 'carrier:2 rush:1', 'bomber:1 commando:2', 'scuttler:3 carrier:1', 'tank:2 shield:1', 'carrier:2 fighter:2',
      'scuttler:3 commando:2', 'carrier:2 tank:1 bomber:1', 'scuttler:3 shield:2 rush:1', 'carrier:3 tank:2', 'scuttler:3 carrier:2 bomber:2 commando:1',
    ],
  },
  {
    id: 'kashyyyk-2', planet: 'kashyyyk', index: 2, name: 'Root Maze',
    size: [48, 28], startCredits: 580, towers: ALL,
    paths: [[[-1, 24], [6, 24], [6, 4], [14, 4], [14, 24], [22, 24], [22, 4], [30, 4], [30, 24], [38, 24], [38, 4], [48, 4]]],
    lanes: [[[-1, 14], [48, 14]], [[-1, 2], [48, 26]]],
    hazards: [[9, 8, 11, 20], [25, 8, 27, 20], [41, 10, 46, 18]],
    rough: [[1, 3, 3, 4], [17, 11, 19, 12], [33, 15, 35, 16], [43, 25, 45, 26]],
    props: [['trunk', 1, 12], ['trunk', 17, 0], ['trunk', 33, 0], ['fern', 18, 18], ['fern', 34, 9], ['log', 44, 21], ['lamp', 2, 20], ['lamp', 18, 26], ['fern', 46, 6]],
    briefing: ['MASTER SERGEANT KADE: THE TRAIL DOUBLES BACK ON ITSELF FIVE TIMES.', 'CRAWLER WALKERS CARRY SHIELD NODES. ION FIRST, THEN THE HEAVY GUNS.', 'ONE GOOD POSITION CAN COVER TWO STRETCHES OF ROAD.'],
    recipes: [
      'crawler:1 trooper:2', 'scuttler:3', 'carrier:2 commando:1', 'crawler:2 rush:1', 'fighter:2 scuttler:1', 'tank:1 crawler:1',
      'carrier:2 shield:1', 'crawler:2 bomber:1', 'scuttler:3 commando:2', 'tank:2 crawler:1', 'carrier:2 fighter:2', 'crawler:3 shield:1',
      'scuttler:3 tank:2', 'bomber:2 crawler:2', 'carrier:3 commando:2', 'crawler:3 tank:2', 'scuttler:3 carrier:2 bomber:2',
      'crawler:3 tank:2 carrier:2 fighter:1',
    ], spread: { lanes: 2 },
  },
  {
    id: 'kashyyyk-3', planet: 'kashyyyk', index: 3, name: 'Ravine Bridges',
    size: [48, 28], startCredits: 600, towers: ALL,
    paths: [
      [[-1, 6], [18, 6], [18, 22], [48, 22]],
      [[30, -1], [30, 12], [18, 12], [18, 22], [48, 22]],
    ],
    lanes: [[[48, 2], [-1, 26]], [[-1, 14], [48, 12]]],
    hazards: [[0, 14, 14, 18], [22, 15, 47, 18], [34, 3, 38, 10]],
    rough: [[6, 1, 8, 2], [42, 25, 44, 26], [24, 25, 26, 26]],
    props: [['trunk', 2, 9], ['trunk', 40, 6], ['trunk', 8, 23], ['fern', 23, 4], ['fern', 45, 12], ['log', 30, 25], ['lamp', 20, 9], ['lamp', 33, 20], ['fern', 14, 2]],
    briefing: ['MASTER SERGEANT KADE: TWO COLUMNS, ONE CROSSING OVER THE RAVINE.', 'REPAIR DRONES ARE FLYING WITH THEM. THEY HEAL EVERYTHING NEARBY.', 'SHOOT THE DRONES FIRST OR YOU WILL BE SHOOTING THE SAME DROIDS TWICE.'],
    recipes: [
      'carrier:1 trooper:2', 'repair:1 commando:2', 'crawler:2 scuttler:1', 'tank:1 repair:1', 'scuttler:3 fighter:1', 'carrier:2 repair:1',
      'crawler:2 bomber:1', 'tank:2 repair:1 rush:1', 'scuttler:3 carrier:2', 'crawler:2 repair:2', 'bomber:2 fighter:2', 'tank:2 carrier:2',
      'crawler:3 repair:2 shield:1', 'scuttler:3 tank:2 bomber:1', 'carrier:3 repair:2 commando:1', 'crawler:3 tank:2 repair:1', 'bomber:2 fighter:2 repair:2 carrier:1',
      'scuttler:3 crawler:3 tank:2 repair:2', 'carrier:3 crawler:2 tank:2 bomber:2 repair:2',
    ], spread: { paths: 2, lanes: 2 },
  },
  {
    id: 'kashyyyk-4', planet: 'kashyyyk', index: 4, name: "Reaper's Clearing", boss: 'reaper',
    size: [48, 28], startCredits: 630, towers: ALL,
    paths: [[[48, 6], [10, 6], [10, 14], [38, 14], [38, 22], [-1, 22]]],
    lanes: [[[48, 26], [-1, 2]], [[48, 14], [-1, 14]]],
    hazards: [[14, 9, 34, 11], [14, 17, 34, 19], [0, 9, 5, 13], [42, 0, 47, 3]],
    rough: [[3, 25, 5, 26], [44, 9, 46, 10], [22, 1, 24, 2]],
    props: [['trunk', 2, 1], ['trunk', 42, 17], ['trunk', 6, 25], ['fern', 28, 2], ['fern', 46, 24], ['log', 18, 25], ['lamp', 8, 9], ['lamp', 40, 9], ['fern', 2, 16]],
    briefing: ['MASTER SERGEANT KADE: A HARVESTER IS CUTTING ITS WAY TOWARD US.', 'WHEN IT IS HURT IT BOLTS ON A SHELL. BLASTERS AND ION BOUNCE OFF THAT.', 'HAVE ROCKETS, ARTILLERY OR SNIPERS READY FOR THE SECOND HALF.'],
    recipes: [
      'carrier:2 rush:1', 'crawler:1 repair:1 trooper:1', 'scuttler:3 commando:1', 'tank:2 fighter:1', 'carrier:2 crawler:1', 'bomber:2 repair:1',
      'scuttler:3 tank:1', 'crawler:2 carrier:2', 'repair:2 commando:2 shield:1', 'tank:2 bomber:1', 'scuttler:3 crawler:2', 'carrier:3 fighter:2',
      'tank:2 crawler:2 repair:1', 'bomber:2 carrier:2', 'scuttler:3 tank:2 repair:2', 'crawler:3 carrier:2 commando:2', 'tank:3 bomber:2 repair:1',
      'scuttler:3 crawler:3 carrier:2', 'tank:2 crawler:2 bomber:2 repair:2', '@reaper carrier:2 crawler:2 repair:1',
    ], spread: { lanes: 2 },
  },
];
