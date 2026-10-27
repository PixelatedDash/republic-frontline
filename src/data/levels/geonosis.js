// Geonosis: red desert, canyon chasms ('H'), boulder fields ('X'). Armor
// and air arrive. Geonosis 4 is the Foundry Colossus.

const ALL = ['rifle', 'rocket', 'flak', 'repeater', 'ion', 'artillery', 'sharpshooter', 'depot'];

export const GEONOSIS = [
  {
    id: 'geonosis-1', planet: 'geonosis', index: 1, name: 'Dust Road',
    size: [48, 28], startCredits: 450, towers: ALL.filter((t) => t !== 'depot'),
    paths: [[[-1, 5], [20, 5], [20, 14], [8, 14], [8, 22], [30, 22], [30, 10], [48, 10]]],
    lanes: [[[-1, 26], [48, 2]]],
    hazards: [[24, 13, 27, 19], [36, 15, 44, 20], [11, 0, 16, 2], [0, 25, 5, 27]],
    rough: [[2, 9, 4, 10], [40, 4, 42, 5], [16, 25, 18, 26], [34, 1, 35, 2]],
    props: [['spire', 4, 1], ['spire', 26, 7], ['spire', 45, 23], ['stack', 14, 17], ['pillar', 38, 13], ['wreck', 22, 25], ['pillar', 2, 19], ['wreck', 44, 6]],
    briefing: ['GENERAL ORREN: THE DROIDS ARE ROLLING OUT ARMORED UNITS.', 'COMMANDOS WEAR PLATE. BLASTERS DO HALF DAMAGE; ROCKETS AND SNIPERS DO MORE.', 'SHARPSHOOTER POSTS ARE CLEARED. PICK THEM OFF FROM RANGE.'],
    recipes: [
      'trooper:2 commando:1', 'rush:2 trooper:1', 'commando', 'scuttler:2 commando:1', 'fighter:1 trooper:2', 'shield:2 commando:1',
      'commando:2 rush:1', 'fighter:2 scuttler:1', 'commando:2 shield:1', 'rush:2 commando:2', 'fighter:1 commando:2 trooper:1', 'shield:2 scuttler:1 commando:2',
      'commando:3 fighter:1', 'rush:2 shield:2 commando:2', 'commando:3 fighter:2 scuttler:1',
    ],
  },
  {
    id: 'geonosis-2', planet: 'geonosis', index: 2, name: 'Foundry Gate',
    size: [48, 28], startCredits: 470, towers: ALL,
    paths: [
      [[-1, 4], [16, 4], [16, 13], [34, 13], [34, 24], [48, 24]],
      [[-1, 22], [10, 22], [10, 13], [34, 13], [34, 24], [48, 24]],
    ],
    lanes: [[[-1, 13], [24, 2], [48, 24]]],
    hazards: [[20, 16, 30, 21], [22, 3, 30, 8], [38, 5, 44, 10]],
    rough: [[3, 8, 5, 9], [40, 17, 42, 18], [13, 25, 15, 26]],
    props: [['spire', 7, 1], ['spire', 44, 14], ['stack', 18, 10], ['stack', 31, 10], ['pillar', 2, 15], ['pillar', 37, 26], ['wreck', 26, 25], ['spire', 46, 2]],
    briefing: ['GENERAL ORREN: TWO COLUMNS FROM THE FOUNDRY GATE, WITH TANKS.', 'A HEAVY TANK COSTS THREE LIVES IF IT GETS THROUGH. FOCUS IT.', 'SUPPLY DEPOTS ARE AVAILABLE. BUILD ONE EARLY; THEY PAY EVERY WAVE.'],
    recipes: [
      'trooper:2 rush:1', 'commando:2 trooper:1', 'tank', 'scuttler:2 rush:1', 'commando:2 shield:1', 'fighter:2 trooper:1',
      'tank:1 commando:1', 'rush:2 scuttler:2', 'commando:2 fighter:1', 'tank:2 trooper:1', 'shield:2 commando:2', 'fighter:2 rush:2',
      'tank:2 commando:2', 'scuttler:2 shield:2 fighter:1', 'tank:2 commando:2 rush:1', 'tank:2 commando:2 fighter:2 shield:1',
    ], spread: { paths: 2 },
  },
  {
    id: 'geonosis-3', planet: 'geonosis', index: 3, name: 'Spire Field',
    size: [48, 28], startCredits: 490, towers: ALL,
    paths: [[[48, 3], [6, 3], [6, 24], [42, 24], [42, 10], [20, 10], [20, 17], [-1, 17]]],
    lanes: [[[48, 26], [24, 14], [-1, 2]], [[48, 14], [-1, 26]]],
    hazards: [[10, 12, 16, 20], [26, 13, 37, 19], [44, 15, 47, 21]],
    rough: [[1, 7, 3, 8], [24, 6, 26, 7], [38, 26, 40, 27], [12, 0, 14, 1]],
    props: [['spire', 3, 12], ['spire', 22, 21], ['spire', 39, 6], ['stack', 17, 6], ['pillar', 46, 7], ['pillar', 8, 26], ['wreck', 33, 7], ['spire', 30, 26]],
    briefing: ['GENERAL ORREN: THE ROAD SPIRALS THROUGH THE SPIRE FIELD.', 'BOMBERS INBOUND. SHOOT ONE DOWN AND ITS TROOPERS STILL DROP.', 'NO SINGLE WEAPON WILL HOLD THIS. MIX YOUR LINE.'],
    recipes: [
      'commando:2 trooper:1', 'tank:1 rush:2', 'bomber', 'scuttler:3 commando:1', 'fighter:2 shield:1', 'tank:2 commando:1',
      'bomber:2 rush:1', 'shield:2 commando:2', 'scuttler:2 tank:2', 'fighter:2 bomber:1', 'commando:3 shield:1', 'tank:2 bomber:1 rush:1',
      'scuttler:3 shield:2', 'bomber:2 fighter:2', 'tank:2 commando:2 shield:1', 'scuttler:2 tank:2 bomber:2', 'tank:2 commando:2 bomber:2 shield:2 scuttler:1',
    ], spread: { lanes: 2 },
  },
  {
    id: 'geonosis-4', planet: 'geonosis', index: 4, name: 'Colossus Crawl', boss: 'foundry',
    size: [48, 28], startCredits: 520, towers: ALL,
    paths: [
      [[48, 14], [36, 14], [36, 4], [24, 4], [24, 24], [12, 24], [12, 14], [-1, 14]],
      [[48, 26], [24, 26], [24, 24], [12, 24], [12, 14], [-1, 14]],
    ],
    lanes: [[[48, 2], [-1, 14]], [[48, 20], [30, 10], [-1, 14]]],
    hazards: [[28, 7, 33, 12], [14, 4, 20, 10], [38, 18, 44, 22], [2, 20, 8, 25]],
    rough: [[42, 6, 44, 7], [27, 15, 29, 16], [16, 16, 18, 17]],
    props: [['spire', 4, 2], ['spire', 46, 9], ['stack', 30, 16], ['stack', 20, 20], ['pillar', 7, 9], ['pillar', 40, 1], ['wreck', 33, 23], ['spire', 26, 1]],
    briefing: ['GENERAL ORREN: A WALKING FACTORY IS CRAWLING OUT OF THE FOUNDRY.', 'IT BUILDS DROIDS AS IT MOVES. ITS THREE EXHAUST VENTS FEED THE FURNACE.', 'KNOCK OUT THE VENTS TO SLOW PRODUCTION, THEN BRING IT DOWN.'],
    recipes: [
      'commando:2 rush:1', 'tank:1 trooper:2', 'bomber:1 scuttler:2', 'shield:2 commando:2', 'tank:2 rush:1', 'fighter:2 bomber:1',
      'scuttler:3 commando:2', 'tank:2 shield:1', 'bomber:2 commando:1', 'rush:2 tank:2', 'fighter:2 shield:2', 'scuttler:2 tank:2 bomber:1',
      'commando:3 shield:2', 'tank:2 bomber:2', 'scuttler:2 commando:2 fighter:2', 'tank:2 shield:2 bomber:1', 'commando:2 tank:2 bomber:2 scuttler:1',
      '@foundry commando:2 tank:1 bomber:1',
    ], spread: { paths: 2, lanes: 2 },
  },
];
