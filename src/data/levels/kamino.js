// Kamino 2-4. Platforms over the storm sea; path tiles over water become
// bridges automatically. Kamino 4 is the Tidebreaker boss level.

const K = ['rifle', 'rocket', 'flak'];

export const KAMINO = [
  {
    id: 'kamino-2', planet: 'kamino', index: 2, name: 'Twin Landings',
    size: [48, 28], startCredits: 320, towers: [...K, 'repeater'],
    platforms: [[31, 1, 46, 6], [33, 7, 42, 13], [19, 8, 31, 20], [33, 19, 46, 26], [4, 14, 18, 22], [1, 4, 14, 12]],
    paths: [
      [[48, 3], [38, 3], [38, 10], [26, 10], [26, 18], [10, 18], [10, 8], [-1, 8]],
      [[48, 24], [36, 24], [36, 18], [10, 18], [10, 8], [-1, 8]],
    ],
    lanes: [[[48, 14], [24, 5], [-1, 8]]],
    props: [['dome', 42, 1], ['dome', 21, 12], ['mast', 41, 12], ['mast', 3, 10], ['floodlight', 33, 2], ['floodlight', 29, 15], ['floodlight', 6, 21], ['crates', 14, 15], ['crates', 40, 21], ['generator', 2, 5], ['generator', 44, 25]],
    briefing: ['COMMANDER VEX: TWO LANDING GROUPS, NORTH AND SOUTH.', 'THEY MEET AT THE CENTRAL PLATFORM. HOLD THE JUNCTION.', 'REPEATER NESTS ARE CLEARED FOR DEPLOYMENT.'],
    recipes: [
      'trooper', 'trooper:3 rush:1', 'scuttler:2 trooper:1', 'shield:1 trooper:2', 'rush', 'fighter:1 trooper:2',
      'scuttler:3 rush:1', 'shield:2 trooper:1', 'fighter:2 rush:2', 'trooper:2 shield:2 scuttler:1', 'rush:2 fighter:1 shield:1', 'scuttler:2 shield:2 trooper:2',
      'trooper:2 rush:2 shield:2 fighter:1 scuttler:1',
    ], spread: { paths: 2 },
  },
  {
    id: 'kamino-3', planet: 'kamino', index: 3, name: 'Spire Causeway',
    size: [48, 28], startCredits: 340, towers: [...K, 'repeater', 'ion'],
    platforms: [[0, 1, 15, 14], [1, 15, 8, 25], [9, 18, 26, 25], [17, 3, 27, 17], [28, 2, 38, 10], [29, 11, 39, 23], [40, 16, 47, 24]],
    paths: [[[-1, 3], [12, 3], [12, 12], [4, 12], [4, 22], [22, 22], [22, 6], [34, 6], [34, 20], [48, 20]]],
    lanes: [[[-1, 14], [24, 26], [48, 10]], [[-1, 26], [48, 2]]],
    props: [['dome', 6, 6], ['dome', 24, 10], ['mast', 15, 20], ['mast', 37, 14], ['floodlight', 1, 18], ['floodlight', 30, 3], ['floodlight', 45, 22], ['crates', 9, 9], ['crates', 18, 15], ['generator', 31, 16], ['generator', 2, 24]],
    briefing: ['COMMANDER VEX: THE CAUSEWAY WINDS PAST THE CLONING SPIRES.', 'SHIELDED DROIDS ARE MASSING. ION CANNONS CAN STRIP THEM BARE.', 'USE THE LENGTH OF THE ROUTE. MAKE THEM WALK THROUGH FIRE.'],
    recipes: [
      'trooper', 'shield:1 trooper:2', 'rush:2 scuttler:1', 'shield:2 trooper:1', 'fighter:1 rush:2', 'scuttler',
      'shield:3 trooper:1', 'fighter:2 trooper:2', 'rush:2 shield:2', 'scuttler:2 fighter:1', 'shield:3 rush:1', 'trooper:2 fighter:2 scuttler:1',
      'shield:3 rush:2 fighter:1', 'trooper:2 rush:2 shield:3 fighter:2 scuttler:1',
    ], spread: { lanes: 2 },
  },
  {
    id: 'kamino-4', planet: 'kamino', index: 4, name: 'Sea Wall', boss: 'tidebreaker',
    size: [48, 28], startCredits: 380, towers: [...K, 'repeater', 'ion', 'artillery'],
    platforms: [[24, 1, 46, 7], [24, 8, 32, 12], [8, 4, 22, 13], [10, 14, 22, 22], [0, 15, 9, 21], [26, 16, 46, 23], [33, 24, 46, 26]],
    paths: [
      [[44, 14], [40, 14], [40, 20], [28, 20], [28, 8], [14, 8], [14, 18], [-1, 18]],
      [[48, 4], [28, 4], [28, 8], [14, 8], [14, 18], [-1, 18]],
    ],
    lanes: [[[48, 12], [20, 2], [-1, 18]]],
    props: [['dome', 42, 1], ['dome', 9, 5], ['mast', 31, 11], ['mast', 21, 21], ['floodlight', 25, 2], ['floodlight', 8, 12], ['floodlight', 44, 17], ['crates', 18, 4], ['crates', 34, 22], ['generator', 2, 16], ['generator', 30, 17]],
    briefing: ['COMMANDER VEX: SENSORS SHOW SOMETHING HUGE UNDER THE WAVES.', 'IT WILL CLIMB OUT OF THE EAST SEA ONTO THE CAUSEWAY. ARTILLERY IS ONLINE.', 'IF IT REACHES THE COMMAND POST, KAMINO FALLS.'],
    recipes: [
      'trooper:2 rush:1', 'shield:1 trooper:2', 'scuttler:2 rush:1', 'fighter:1 shield:2', 'trooper:2 rush:2', 'shield:2 scuttler:1',
      'fighter:2 trooper:1', 'rush:2 shield:2', 'scuttler:2 fighter:1 trooper:1', 'shield:3 trooper:2', 'rush:2 fighter:2 shield:1', 'scuttler:2 shield:2 rush:1',
      'trooper:2 shield:2 fighter:2', 'rush:2 shield:3 scuttler:1', '@tidebreaker trooper:2 shield:2 fighter:1',
    ], spread: { paths: 2 },
  },
];
