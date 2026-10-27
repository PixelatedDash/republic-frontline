// Mustafar: black rock, lava rivers ('H'), magma crust ('X'). Every droid
// type plus Siege Walkers. Mustafar 4 is The Warlord Engine (finale).

const ALL = ['rifle', 'rocket', 'flak', 'repeater', 'ion', 'artillery', 'sharpshooter', 'depot'];

export const MUSTAFAR = [
  {
    id: 'mustafar-1', planet: 'mustafar', index: 1, name: 'Lava Fields',
    size: [48, 28], startCredits: 760, towers: ALL,
    paths: [[[-1, 20], [14, 20], [14, 6], [34, 6], [34, 22], [48, 22]]],
    lanes: [[[-1, 2], [48, 26]], [[-1, 14], [48, 14]]],
    hazards: [[18, 10, 30, 17], [0, 0, 10, 3], [38, 0, 47, 4], [0, 24, 10, 27], [38, 25, 47, 27]],
    rough: [[4, 9, 6, 10], [41, 12, 43, 13], [22, 24, 24, 25]],
    props: [['rig', 2, 14], ['rig', 44, 16], ['obsidian', 11, 1], ['obsidian', 36, 9], ['vent', 21, 21], ['vent', 30, 2], ['obsidian', 46, 7], ['vent', 8, 22]],
    briefing: ['ADMIRAL TESK: MUSTAFAR. THE LAST SEPARATIST STRONGHOLD.', 'SIEGE WALKERS COST FIVE LIVES EACH IF THEY GET THROUGH.', 'EVERYTHING YOU HAVE LEARNED, YOU WILL NEED HERE.'],
    recipes: [
      'commando:2 trooper:2', 'siege rush:2', 'bomber:2 fighter:1', 'tactical:1 shieldwalker:1 rush:2', 'tank:2 repair:1 trooper:2', 'carrier:2 crawler:2',
      'siege:1 commando:2 rush:2', 'bomber:3 fighter:1', 'shieldwalker:2 tactical:2 trooper:2', 'siege:2 repair:1 rush:2', 'scuttler:3 carrier:2', 'tank:2 bomber:2 trooper:2',
      'siege:2 shieldwalker:1 rush:3', 'crawler:3 tactical:2 scuttler:2', 'fighter:3 bomber:3', 'siege:2 tank:2 rush:3', 'carrier:3 repair:2 commando:2',
      'shieldwalker:2 crawler:2 bomber:2 trooper:3', 'siege:2 tactical:2 tank:2 rush:3', 'bomber:3 fighter:2 siege:1 scuttler:2', 'siege:3 shieldwalker:2 tank:2 bomber:2 rush:3',
    ], spread: { lanes: 2 },
  },
  {
    id: 'mustafar-2', planet: 'mustafar', index: 2, name: 'Mining Platforms',
    size: [48, 28], startCredits: 780, towers: ALL,
    paths: [
      [[48, 4], [26, 4], [26, 14], [-1, 14]],
      [[48, 24], [26, 24], [26, 14], [-1, 14]],
    ],
    lanes: [[[48, 14], [-1, 2]], [[48, 14], [-1, 26]]],
    hazards: [[30, 8, 47, 20], [0, 0, 20, 9], [0, 19, 20, 27]],
    rough: [[22, 0, 24, 1], [22, 26, 24, 27], [43, 1, 45, 2]],
    props: [['rig', 30, 1], ['rig', 30, 26], ['obsidian', 46, 6], ['obsidian', 46, 22], ['vent', 22, 18], ['vent', 22, 9], ['obsidian', 2, 12], ['rig', 12, 17]],
    briefing: ['ADMIRAL TESK: THE MINING PLATFORMS FEED TWO ROADS INTO ONE.', 'THE JUNCTION IS YOUR KILL ZONE. EVERYTHING PASSES THROUGH IT.', 'DO NOT LET THE SIEGE GUNS REACH THE WEST GATE.'],
    recipes: [
      'trooper:3 commando:2', 'tank:1 tactical:1 rush:2', 'bomber:2 repair:1', 'siege:1 rush:2 trooper:2', 'shieldwalker:2 crawler:1', 'carrier:2 fighter:2 rush:2',
      'siege:1 tank:2 trooper:2', 'bomber:3 tactical:1', 'crawler:2 shieldwalker:2 rush:2', 'siege:2 commando:2', 'fighter:3 repair:2 scuttler:2', 'tank:2 tactical:2 carrier:1',
      'siege:2 bomber:2 rush:3', 'shieldwalker:2 crawler:2 tactical:1 trooper:2', 'scuttler:3 carrier:3', 'siege:2 tank:2 repair:1 rush:3', 'bomber:3 fighter:3',
      'tactical:2 siege:2 shieldwalker:2 trooper:3', 'tank:3 crawler:2 bomber:2 scuttler:2', 'siege:3 tactical:2 repair:2 rush:3', 'bomber:3 siege:2 tank:2 trooper:3', 'siege:3 shieldwalker:2 crawler:2 bomber:2 tactical:2 rush:3',
    ], spread: { paths: 2, lanes: 2 },
  },
  {
    id: 'mustafar-3', planet: 'mustafar', index: 3, name: 'Rivers of Fire',
    size: [48, 28], startCredits: 800, towers: ALL,
    paths: [[[48, 2], [2, 2], [2, 25], [44, 25], [44, 8], [10, 8], [10, 19], [36, 19], [36, 13], [-1, 13]]],
    lanes: [[[48, 26], [-1, 2]], [[48, 13], [24, 26], [-1, 13]]],
    hazards: [[5, 4, 41, 5], [13, 11, 33, 16], [5, 21, 41, 22], [46, 4, 47, 27]],
    rough: [[39, 10, 41, 11], [5, 10, 7, 11], [20, 26, 22, 27]],
    props: [['rig', 5, 15], ['rig', 40, 15], ['obsidian', 46, 0], ['obsidian', 0, 27], ['vent', 21, 9], ['vent', 26, 17], ['obsidian', 30, 26], ['vent', 15, 23]],
    briefing: ['ADMIRAL TESK: THE ROAD SPIRALS IN BETWEEN THE LAVA RIVERS.', 'IT IS LONG. MAKE EVERY METRE COST THEM.', 'ONE MORE PUSH AND THE WARLORD ENGINE HAS NOWHERE TO HIDE.'],
    recipes: [
      'commando:3 tactical:1', 'siege:1 repair:1 rush:2', 'bomber:2 fighter:2', 'shieldwalker:2 crawler:1 trooper:2', 'tank:2 carrier:1 rush:2', 'siege:1 tactical:1 commando:2',
      'bomber:3 repair:1', 'crawler:2 shieldwalker:2 trooper:2', 'siege:2 rush:3', 'tank:2 bomber:2 rush:2', 'tactical:2 carrier:2 repair:1', 'siege:2 shieldwalker:2 scuttler:2',
      'fighter:3 bomber:3', 'crawler:3 tank:2 rush:3', 'siege:2 tactical:2 repair:1 trooper:2', 'bomber:3 carrier:2', 'shieldwalker:2 siege:2 crawler:1 rush:3',
      'tank:3 bomber:2 tactical:1 scuttler:2', 'siege:3 repair:2 rush:3', 'fighter:3 bomber:3 shieldwalker:1', 'siege:3 tank:2 tactical:2 trooper:3', 'crawler:3 siege:2 bomber:3 rush:3',
      'siege:3 shieldwalker:2 tank:2 bomber:2 tactical:2 scuttler:2',
    ], spread: { lanes: 2 },
  },
  {
    id: 'mustafar-4', planet: 'mustafar', index: 4, name: "Warlord's March", boss: 'warlord',
    size: [48, 28], startCredits: 840, towers: ALL,
    paths: [
      [[48, 14], [34, 14], [34, 4], [14, 4], [14, 24], [-1, 24]],
      [[48, 26], [34, 26], [34, 24], [14, 24], [-1, 24]],
    ],
    lanes: [[[48, 2], [-1, 24]], [[48, 20], [24, 14], [-1, 24]]],
    hazards: [[18, 8, 30, 20], [38, 4, 47, 10], [0, 4, 10, 12], [38, 17, 44, 21]],
    rough: [[2, 16, 4, 17], [44, 23, 46, 24], [22, 0, 24, 1]],
    props: [['rig', 5, 26], ['rig', 36, 0], ['obsidian', 46, 15], ['obsidian', 11, 14], ['vent', 32, 9], ['vent', 16, 20], ['obsidian', 6, 1], ['rig', 42, 13]],
    briefing: ['ADMIRAL TESK: THIS IS IT. THE WARLORD ENGINE IS MARCHING.', 'ARMOR FIRST, THEN SHIELDS, THEN IT GOES BERSERK AND CALLS EVERYTHING IT HAS.', 'STOP IT HERE AND THE WAR IS OVER.'],
    recipes: [
      'commando:3 tactical:1', 'siege:1 bomber:1 scuttler:2 carrier:1', 'shieldwalker:2 crawler:1', 'tank:2 repair:1 trooper:2', 'bomber:3 fighter:2', 'siege:2 tactical:1 scuttler:2',
      'carrier:2 crawler:2', 'shieldwalker:2 siege:1 trooper:2', 'bomber:3 repair:2', 'tank:2 tactical:2 scuttler:2 carrier:1', 'siege:2 crawler:2 scuttler:2', 'fighter:3 bomber:3',
      'shieldwalker:2 tank:2 trooper:2', 'siege:2 tactical:2 repair:1 scuttler:3', 'carrier:3 bomber:2', 'siege:3 shieldwalker:1 scuttler:3 carrier:1', 'tank:3 crawler:2 tactical:1 scuttler:2',
      'bomber:3 fighter:3 repair:1', 'siege:3 tank:2 scuttler:3', 'shieldwalker:2 crawler:2 tactical:2', 'siege:3 bomber:3 trooper:3', 'tank:3 shieldwalker:2 tactical:2 scuttler:3 carrier:1',
      'siege:3 crawler:2 bomber:2 repair:2 scuttler:2', 'siege:3 tank:2 shieldwalker:2 bomber:3 scuttler:3', '@warlord siege:2 tank:2 bomber:2 tactical:1 scuttler:3 carrier:1',
    ], spread: { paths: 2, lanes: 2 },
  },
];
