// Kamino 1 — "Storm Landing". Tutorial level: one long walkway from the
// north-east landing pads to the command post off the west edge, two
// bridges, and one flight lane cutting straight across the water.

export default {
  id: 'kamino-1',
  planet: 'kamino',
  index: 1,
  name: 'Storm Landing',
  size: [48, 28],
  startCredits: 300,
  tutorial: true,
  towers: ['rifle', 'rocket', 'flak'],
  platforms: [
    [30, 1, 46, 10],
    [14, 3, 27, 13],
    [2, 6, 12, 18],
    [6, 17, 24, 26],
    [37, 14, 46, 25],
  ],
  pads: [[40, 2, 41, 3], [43, 6, 44, 7], [16, 22, 17, 23]],
  // ground paths: waypoints in tile coordinates (tile centers)
  paths: [
    [[48, 4], [34, 4], [34, 9], [20, 9], [20, 21], [9, 21], [9, 12], [-1, 12]],
  ],
  // air lanes: straight-ish flight lines, also in tiles
  lanes: [
    [[48, 1], [30, 14], [-1, 12]],
  ],
  props: [
    ['dome', 37, 6], ['dome', 3, 7], ['dome', 22, 4],
    ['mast', 45, 1], ['mast', 13, 24], ['mast', 26, 12],
    ['floodlight', 31, 2], ['floodlight', 15, 12], ['floodlight', 3, 16], ['floodlight', 23, 18],
    ['crates', 18, 4], ['crates', 11, 7], ['crates', 42, 20],
    ['generator', 7, 25], ['generator', 44, 15],
  ],
  briefing: [
    'COMMANDER VEX: DROID LANDERS ARE DOWN ON THE NORTH-EAST PADS.',
    'THEY WILL PUSH DOWN THE WALKWAYS TOWARD OUR COMMAND POST.',
    'DIG IN ALONG THE ROUTE. NOTHING REACHES THE WEST BRIDGE.',
  ],
  waves: [
    { groups: [{ type: 'trooper', count: 6, gap: 1.4 }] },
    { groups: [{ type: 'trooper', count: 9, gap: 1.1 }] },
    { groups: [{ type: 'trooper', count: 6, gap: 1.2 }, { type: 'rush', count: 4, gap: 1.0, delay: 4 }] },
    { groups: [{ type: 'scuttler', count: 15, gap: 0.35 }, { type: 'trooper', count: 4, gap: 1.2, delay: 3 }] },
    { groups: [{ type: 'shield', count: 3, gap: 3 }, { type: 'trooper', count: 6, gap: 1.0, delay: 2 }] },
    { groups: [{ type: 'fighter', count: 3, gap: 2.2, lane: 0 }, { type: 'trooper', count: 8, gap: 1.0 }] },
    { groups: [{ type: 'rush', count: 10, gap: 0.7 }, { type: 'shield', count: 2, gap: 3, delay: 5 }] },
    { groups: [{ type: 'scuttler', count: 25, gap: 0.25 }, { type: 'fighter', count: 3, gap: 1.8, lane: 0, delay: 2 }] },
    { groups: [{ type: 'shield', count: 5, gap: 2.2 }, { type: 'trooper', count: 10, gap: 0.8, delay: 1 }] },
    { groups: [{ type: 'fighter', count: 6, gap: 1.4, lane: 0 }, { type: 'rush', count: 8, gap: 0.6, delay: 2 }] },
    { groups: [{ type: 'trooper', count: 14, gap: 0.6 }, { type: 'shield', count: 4, gap: 2, delay: 3 }, { type: 'scuttler', count: 20, gap: 0.25, delay: 6 }] },
    { groups: [{ type: 'trooper', count: 16, gap: 0.5 }, { type: 'rush', count: 10, gap: 0.5, delay: 4 }, { type: 'shield', count: 6, gap: 1.6, delay: 6 }, { type: 'fighter', count: 6, gap: 1.2, lane: 0, delay: 8 }, { type: 'scuttler', count: 30, gap: 0.2, delay: 12 }] },
  ],
  // Tutorial script (see src/ui/tutorial.js). `when` gates a step, `until` completes it.
  tutorialSteps: [
    { id: 'build', text: 'DROIDS WILL MARCH DOWN THE WALKWAY. PICK THE RIFLE SQUAD FROM THE BUILD BAR AND PLACE IT NEXT TO THE PATH.', until: 'built', highlight: 'build:rifle' },
    { id: 'preview', text: 'THE PANEL TOP-LEFT SHOWS THE NEXT WAVE. PRESS START WHEN YOU ARE READY.', until: 'waveStarted', highlight: 'start' },
    { id: 'upgrade', when: 'waveEnded:1', text: 'GOOD. TAP YOUR SQUAD, THEN UPGRADE IT. EVERY TIER HITS HARDER AND LOOKS DIFFERENT.', until: 'upgraded' },
    { id: 'target', when: 'upgraded', text: 'TARGETING DECIDES WHO A TOWER SHOOTS. TRY STRONGEST TO FOCUS THE TOUGH ONES.', until: 'targeting', highlight: 'targeting' },
    { id: 'shields', when: 'preview:shield', text: 'SHIELD DROIDS INCOMING. BLASTERS DO HALF DAMAGE TO SHIELDS AND ARMOR. ROCKETS SPLASH AND DO 150% TO ARMOR. HIT THEM WHILE THEY ROLL: THEIR SHIELD IS DOWN.', until: 'ack' },
    { id: 'air', when: 'preview:fighter', text: 'STRIKE FIGHTERS FLY THEIR OWN LANE OVER THE WATER. ONLY TOWERS MARKED AIR CAN HIT THEM. BUILD A FLAK TURRET UNDER THE LANE.', until: 'built:flak', highlight: 'build:flak' },
    { id: 'early', when: 'waveEnded:6', text: 'CALLING THE NEXT WAVE EARLY PAYS BONUS CREDITS. BANKED CREDITS ALSO EARN 5% INTEREST EACH WAVE.', until: 'ack' },
  ],
};
