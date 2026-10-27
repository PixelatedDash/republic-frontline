// Enemy data (Jedi baseline; difficulty multiplies HP at spawn).
// speed in art px/s. `radius` is the hit/selection radius in px.
// Body class and layer are binding per spec §9.

export const ENEMIES = {
  trooper: {
    name: 'Trooper Droid', layer: 'ground', body: 'unarmored',
    hp: 40, shield: 0, speed: 44, bounty: 5, lifeCost: 1, radius: 10,
    lore: 'Mass-produced line infantry. Cheap, numerous, and never retreats.',
  },
  rush: {
    name: 'Rush Droid', layer: 'ground', body: 'unarmored',
    hp: 26, shield: 0, speed: 88, bounty: 5, lifeCost: 1, radius: 10,
    lore: 'A sprinter frame built to overrun firing lines before they can traverse.',
  },
  scuttler: {
    name: 'Scuttler', layer: 'ground', body: 'unarmored',
    hp: 9, shield: 0, speed: 60, bounty: 1, lifeCost: 1, radius: 6,
    lore: 'Tick-sized drones released in swarms of dozens.',
  },
  shield: {
    name: 'Shield Droid', layer: 'ground', body: 'unarmored',
    hp: 45, shield: 40, shieldRegen: 12, speed: 30, bounty: 11, lifeCost: 1, radius: 12,
    roll: { speed: 84, dist: 160, deploy: 0.8 },
    lore: 'Races forward on twin treads, then plants itself behind a hex shield.',
  },
  fighter: {
    name: 'Strike Fighter', layer: 'air', body: 'unarmored',
    hp: 30, shield: 0, speed: 100, bounty: 7, lifeCost: 1, radius: 12,
    lore: 'Fast attack craft flying their own lanes straight at the command post.',
  },

  commando: {
    name: 'Commando Droid', layer: 'ground', body: 'armored',
    hp: 70, shield: 0, speed: 50, bounty: 9, lifeCost: 1, radius: 10,
    lore: 'An infiltration frame in sloped plate. Fast for its armor, thin underneath.',
  },
  tank: {
    name: 'Heavy Tank', layer: 'ground', body: 'armored',
    hp: 420, shield: 0, speed: 20, bounty: 40, lifeCost: 3, radius: 18,
    lore: 'A tracked siege hull with a long cannon. Blasters barely scratch it.',
  },
  shieldwalker: {
    name: 'Shield Walker', layer: 'ground', body: 'armored',
    hp: 150, shield: 110, shieldRegen: 14, speed: 24, bounty: 32, lifeCost: 2, radius: 14,
    bubble: { r: 80, v: 50, regen: 12 },
    lore: 'A four-legged projector that wraps nearby droids in a violet bubble.',
  },
  carrier: {
    name: 'Droid Carrier', layer: 'ground', body: 'armored',
    hp: 240, shield: 0, speed: 28, bounty: 20, lifeCost: 2, radius: 16,
    split: { type: 'scuttler', count: 6 },
    lore: 'A wheeled transport packed with Scuttlers. Destroying it lets them loose.',
  },
  bomber: {
    name: 'Bomber Gunship', layer: 'air', body: 'armored',
    hp: 170, shield: 0, speed: 40, bounty: 20, lifeCost: 2, radius: 16,
    drops: { type: 'trooper', count: 3 },
    lore: 'Armored transport-bomber. Shot down, it still delivers its troopers.',
  },
  crawler: {
    name: 'Crawler Walker', layer: 'ground', body: 'armored',
    hp: 200, shield: 90, shieldRegen: 12, speed: 30, bounty: 28, lifeCost: 2, radius: 16,
    lore: 'Six legs, three armored segments, a shield node on every one.',
  },
  repair: {
    name: 'Repair Drone', layer: 'air', body: 'unarmored',
    hp: 70, shield: 0, speed: 36, bounty: 14, lifeCost: 1, radius: 10,
    heal: { r: 88, rate: 10 },
    lore: 'Twin-rotor field mechanic. Patches up every droid around it. Shoot it first.',
  },
  siege: {
    name: 'Siege Walker', layer: 'ground', body: 'armored',
    hp: 1000, shield: 0, speed: 16, bounty: 80, lifeCost: 5, radius: 18,
    lore: 'An elite heavy biped hauling a siege gun. Every one that gets through hurts.',
  },
  tactical: {
    name: 'Tactical Droid', layer: 'ground', body: 'unarmored',
    hp: 130, shield: 70, shieldRegen: 14, speed: 36, bounty: 26, lifeCost: 2, radius: 12,
    aura: { r: 88, speed: 0.2 },
    lore: 'A field commander. Droids around it move 20% faster.',
  },

  // ------------------------------------------------------------- bosses --
  tidebreaker: {
    name: 'Tidebreaker', layer: 'ground', body: 'armored', boss: true,
    hp: 3000, shield: 0, speed: 15, bounty: 200, lifeCost: 'boss', radius: 34,
    emerge: 2.5,
    phases: [{ at: 0.5, deploy: { type: 'trooper', first: 6, every: 6, count: 2 } }],
    lore: 'An amphibious assault walker that climbs out of the sea onto the platforms.',
  },
  foundry: {
    name: 'Foundry Colossus', layer: 'ground', body: 'armored', boss: true,
    hp: 3800, shield: 0, speed: 11, bounty: 260, lifeCost: 'boss', radius: 40,
    vents: { count: 3, hp: 450, xs: [-46, -28, -10], y: -48 },
    spawner: { every: 6, types: ['commando', 'trooper', 'trooper'], slowPerVent: 0.7 },
    lore: 'A crawling droid factory. Its exhaust vents keep the furnace running.',
  },
  reaper: {
    name: 'Timber Reaper', layer: 'ground', body: 'unarmored', boss: true,
    hp: 4500, shield: 0, speed: 13, bounty: 280, lifeCost: 'boss', radius: 36,
    phases: [{ at: 0.6, body: 'shell' }],
    lore: 'A saw-armed harvester. Wounded, it bolts on a shell that shrugs off blasters and ion.',
  },
  dreadnought: {
    name: 'Night Dreadnought', layer: 'air', body: 'armored', boss: true,
    hp: 3600, shield: 0, speed: 18, bounty: 320, lifeCost: 'boss', radius: 40,
    launch: { every: 14, type: 'bomber' },
    lightsOut: { every: 16, r: 200, t: 4, range: 0.8 },
    lore: 'A gunship that hunts by night, dropping bombers and blinding the line.',
  },
  warlord: {
    name: 'The Warlord Engine', layer: 'ground', body: 'armored', boss: true,
    hp: 9000, shield: 0, speed: 11, bounty: 500, lifeCost: 'boss', radius: 40,
    phases: [
      { at: 0.66, shield: 2000, shieldRegen: 30 },
      { at: 0.33, body: 'unarmored', speedMult: 1.5, minions: { every: 5, types: ['rush', 'commando'] } },
    ],
    lore: 'The Separatist super-walker. Armor, then shields, then rage.',
  },
};

export const BOSSES = Object.keys(ENEMIES).filter((k) => ENEMIES[k].boss);
