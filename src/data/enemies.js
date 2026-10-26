// Enemy data (Jedi baseline; difficulty multiplies HP at spawn).
// speed in art px/s. `radius` is the hit/selection radius in px.
// Body class and layer are binding per spec §9.

export const ENEMIES = {
  trooper: {
    name: 'Trooper Droid', layer: 'ground', body: 'unarmored',
    hp: 40, shield: 0, speed: 22, bounty: 5, lifeCost: 1, radius: 5,
    lore: 'Mass-produced line infantry. Cheap, numerous, and never retreats.',
  },
  rush: {
    name: 'Rush Droid', layer: 'ground', body: 'unarmored',
    hp: 26, shield: 0, speed: 44, bounty: 5, lifeCost: 1, radius: 5,
    lore: 'A sprinter frame built to overrun firing lines before they can traverse.',
  },
  scuttler: {
    name: 'Scuttler', layer: 'ground', body: 'unarmored',
    hp: 9, shield: 0, speed: 30, bounty: 1, lifeCost: 1, radius: 3,
    lore: 'Tick-sized drones released in swarms of dozens.',
  },
  shield: {
    name: 'Shield Droid', layer: 'ground', body: 'unarmored',
    hp: 45, shield: 40, shieldRegen: 12, speed: 15, bounty: 11, lifeCost: 1, radius: 6,
    roll: { speed: 42, dist: 80, deploy: 0.8 },
    lore: 'Races forward on twin treads, then plants itself behind a hex shield.',
  },
  fighter: {
    name: 'Strike Fighter', layer: 'air', body: 'unarmored',
    hp: 30, shield: 0, speed: 50, bounty: 7, lifeCost: 1, radius: 6,
    lore: 'Fast attack craft flying their own lanes straight at the command post.',
  },
};
