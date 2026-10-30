// Meta-progression data (spec §12): tech tree, Heroic tower sets,
// achievements and archive entries. Pure data + pure helpers, shared by the
// game, the save code and the tests.

import { TOWERS } from './towers.js';
import { ENEMIES } from './enemies.js';
import { LEVELS, LEVEL_ORDER } from './levels/index.js';

export const MAX_STARS = LEVEL_ORDER.length * 4; // 3 per level + 1 Heroic = 80

// ------------------------------------------------------------ tech tree --
// One branch per tower: two stat nodes (1 and 2 stars, the second needs the
// first) and the two tier-4 specializations (3 stars each, no prerequisite).
// 8 x 9 = 72 stars for the whole tree. Mods multiply the tower's stats in
// the sim (see towerStats in src/sim/sim.js).
const STAT_NODES = {
  rifle: [['FIELD RATIONS', { cost: 0.9 }, '-10% COST'], ['MARKSMAN DRILL', { dmg: 1.15 }, '+15% DAMAGE']],
  rocket: [['LONG TUBES', { range: 1.1 }, '+10% RANGE'], ['HEAVY WARHEADS', { splash: 1.2 }, '+20% SPLASH RADIUS']],
  flak: [['RANGEFINDERS', { range: 1.1 }, '+10% RANGE'], ['PROXIMITY FUSES', { dmg: 1.15 }, '+15% DAMAGE']],
  repeater: [['BULK AMMO', { cost: 0.9 }, '-10% COST'], ['COOLED BARRELS', { rate: 1.1 }, '+10% FIRE RATE']],
  artillery: [['FORWARD SPOTTERS', { range: 1.1 }, '+10% RANGE'], ['HIGH-YIELD SHELLS', { dmg: 1.15 }, '+15% DAMAGE']],
  ion: [['CAPACITOR BANKS', { dmg: 1.2 }, '+20% DAMAGE'], ['FOCUSING COILS', { range: 1.1 }, '+10% RANGE']],
  sharpshooter: [['SCOUT TRAINING', { cost: 0.9 }, '-10% COST'], ['MATCH ROUNDS', { dmg: 1.15 }, '+15% DAMAGE']],
  depot: [['LOGISTICS CORPS', { income: 1.1 }, '+10% INCOME'], ['PREFAB CRATES', { cost: 0.9 }, '-10% COST']],
};

export const TECH = (() => {
  const nodes = [];
  for (const [type, [a, b]] of Object.entries(STAT_NODES)) {
    nodes.push({ id: `${type}.a`, tower: type, cost: 1, name: a[0], mods: a[1], desc: a[2], req: null });
    nodes.push({ id: `${type}.b`, tower: type, cost: 2, name: b[0], mods: b[1], desc: b[2], req: `${type}.a` });
    for (const br of ['t4a', 't4b']) {
      const st = TOWERS[type].tiers[br];
      nodes.push({ id: `${type}.${br}`, tower: type, cost: 3, name: st.name.toUpperCase(), branch: br, desc: (st.blurb || 'TIER-4 SPECIALIZATION.').toUpperCase(), req: null });
    }
  }
  return nodes;
})();
export const TECH_BY_ID = Object.fromEntries(TECH.map((n) => [n.id, n]));
export const TECH_TOTAL = TECH.reduce((a, n) => a + n.cost, 0);

export function starsEarned(save) {
  let n = 0;
  for (const id of LEVEL_ORDER) {
    const lv = save.levels[id];
    if (!lv) continue;
    n += Math.min(3, lv.stars || 0) + (lv.heroic ? 1 : 0);
  }
  return n;
}

export function starsSpent(save) {
  let n = 0;
  for (const id of Object.keys(save.tech || {})) if (save.tech[id] && TECH_BY_ID[id]) n += TECH_BY_ID[id].cost;
  return n;
}

export function canBuy(save, id) {
  const n = TECH_BY_ID[id];
  if (!n || save.tech?.[id]) return false;
  if (n.req && !save.tech?.[n.req]) return false;
  return starsEarned(save) - starsSpent(save) >= n.cost;
}

// Refunds the node and anything that depends on it.
export function refund(save, id) {
  const out = { ...(save.tech || {}) };
  delete out[id];
  for (const n of TECH) if (n.req === id) delete out[n.id];
  return out;
}

// Compact tech block stored in the sim state: stat multipliers per tower and
// the tier-4 branches still locked. `null` = everything unlocked, no mods
// (bots, tests and Sandbox).
export function simTech(save) {
  const mods = {}, locked = {};
  for (const n of TECH) {
    const owned = !!save.tech?.[n.id];
    if (n.branch) {
      if (!owned) (locked[n.tower] ||= []).push(n.branch);
    } else if (owned) {
      const m = (mods[n.tower] ||= {});
      for (const [k, v] of Object.entries(n.mods)) m[k] = (m[k] || 1) * v;
    }
  }
  return { mods, locked };
}

// ------------------------------------------------------------- Heroic ----
// Four tower types per level, fixed, from the towers already unlocked there
// (Kamino 1 only has three). Every set can hit air.
export const HEROIC_TOWERS = {
  'kamino-1': ['rifle', 'rocket', 'flak'],
  'kamino-2': ['rifle', 'rocket', 'flak', 'repeater'],
  'kamino-3': ['rocket', 'flak', 'repeater', 'ion'],
  'kamino-4': ['rifle', 'flak', 'ion', 'artillery'],
  'geonosis-1': ['repeater', 'flak', 'artillery', 'sharpshooter'],
  'geonosis-2': ['rifle', 'rocket', 'ion', 'sharpshooter'],
  'geonosis-3': ['rifle', 'artillery', 'ion', 'flak'],
  'geonosis-4': ['rocket', 'flak', 'repeater', 'sharpshooter'],
  'kashyyyk-1': ['rocket', 'artillery', 'flak', 'ion'],
  'kashyyyk-2': ['rifle', 'repeater', 'artillery', 'sharpshooter'],
  'kashyyyk-3': ['rocket', 'ion', 'flak', 'depot'],
  'kashyyyk-4': ['artillery', 'sharpshooter', 'flak', 'repeater'],
  'umbara-1': ['rifle', 'ion', 'artillery', 'flak'],
  'umbara-2': ['rocket', 'flak', 'ion', 'sharpshooter'],
  'umbara-3': ['flak', 'repeater', 'artillery', 'depot'],
  'umbara-4': ['flak', 'rifle', 'ion', 'rocket'],
  'mustafar-1': ['artillery', 'ion', 'flak', 'sharpshooter'],
  'mustafar-2': ['rocket', 'repeater', 'flak', 'ion'],
  'mustafar-3': ['rifle', 'artillery', 'sharpshooter', 'depot'],
  'mustafar-4': ['rocket', 'ion', 'flak', 'sharpshooter'],
};

export const heroicUnlocked = (save, id) => (save.levels[id]?.wins || 0) > 0;
export const sandboxUnlocked = (save) => (save.levels['geonosis-4']?.wins || 0) > 0;

// --------------------------------------------------------- achievements --
// `check(save, run)` runs after every level (run = that level's result) and
// on the meta screens (run = null). Each medal has its own pixel icon
// (src/art/medals.js, same id).
const PLANETS = ['kamino', 'geonosis', 'kashyyyk', 'umbara', 'mustafar'];
const levelsOf = (p) => LEVEL_ORDER.filter((id) => LEVELS[id].planet === p);
const beat = (save, id) => (save.levels[id]?.wins || 0) > 0;
const totalKills = (save) => Object.values(save.stats.kills).reduce((a, b) => a + b, 0);
const BOSS_LEVELS = LEVEL_ORDER.filter((id) => LEVELS[id].boss);

export const ACHIEVEMENTS = [
  { id: 'first', name: 'FIRST CONTACT', desc: 'WIN YOUR FIRST LEVEL.', check: (s) => LEVEL_ORDER.some((id) => beat(s, id)) },
  { id: 'kamino', name: 'TIDE TURNED', desc: 'DEFEAT THE TIDEBREAKER.', check: (s) => beat(s, 'kamino-4') },
  { id: 'geonosis', name: 'FOUNDRY FALLS', desc: 'DEFEAT THE FOUNDRY COLOSSUS.', check: (s) => beat(s, 'geonosis-4') },
  { id: 'kashyyyk', name: 'TIMBER', desc: 'DEFEAT THE TIMBER REAPER.', check: (s) => beat(s, 'kashyyyk-4') },
  { id: 'umbara', name: 'FIRST LIGHT', desc: 'DEFEAT THE NIGHT DREADNOUGHT.', check: (s) => beat(s, 'umbara-4') },
  { id: 'mustafar', name: 'THE WAR IS OVER', desc: 'DEFEAT THE WARLORD ENGINE.', check: (s) => beat(s, 'mustafar-4') },
  { id: 'flawless', name: 'FLAWLESS', desc: 'WIN A LEVEL WITHOUT A SINGLE LEAK.', check: (s) => LEVEL_ORDER.some((id) => (s.levels[id]?.stars || 0) >= 3) },
  { id: 'umbara-clean', name: 'NO LEAKS ON UMBARA', desc: 'THREE STARS ON EVERY UMBARA LEVEL.', check: (s) => levelsOf('umbara').every((id) => (s.levels[id]?.stars || 0) >= 3) },
  { id: 'planet-perfect', name: 'PLANETARY HONORS', desc: 'THREE STARS ON EVERY LEVEL OF ONE PLANET.', check: (s) => PLANETS.some((p) => levelsOf(p).every((id) => (s.levels[id]?.stars || 0) >= 3)) },
  { id: 'campaign-3', name: 'PERFECT CAMPAIGN', desc: 'THREE STARS ON ALL 20 LEVELS.', check: (s) => LEVEL_ORDER.every((id) => (s.levels[id]?.stars || 0) >= 3) },
  { id: 'master', name: 'JEDI MASTER', desc: 'WIN A LEVEL ON JEDI MASTER.', check: (s) => LEVEL_ORDER.some((id) => s.levels[id]?.master) },
  { id: 'master-bosses', name: 'BOSS SLAYER', desc: 'BEAT EVERY BOSS ON JEDI MASTER.', check: (s) => BOSS_LEVELS.every((id) => s.levels[id]?.master) },
  { id: 'heroic', name: 'HEROIC', desc: 'WIN A HEROIC REPLAY.', check: (s) => LEVEL_ORDER.some((id) => s.levels[id]?.heroic) },
  { id: 'heroic-5', name: 'VALOR', desc: 'WIN FIVE HEROIC REPLAYS.', check: (s) => LEVEL_ORDER.filter((id) => s.levels[id]?.heroic).length >= 5 },
  { id: 'heroic-all', name: 'HERO OF THE REPUBLIC', desc: 'WIN EVERY HEROIC REPLAY.', check: (s) => LEVEL_ORDER.every((id) => s.levels[id]?.heroic) },
  { id: 'three-towers', name: 'SKELETON CREW', desc: 'WIN A LEVEL WITH ONLY 3 TOWERS.', check: (s, r) => !!(r && r.won && r.built <= 3 && !r.sandbox) },
  { id: 'no-sell', name: 'NO RETREAT', desc: 'WIN A PLANET 2+ LEVEL WITHOUT SELLING.', check: (s, r) => !!(r && r.won && r.sold === 0 && !r.levelId.startsWith('kamino') && !r.sandbox) },
  { id: 'eager', name: 'EAGER', desc: 'CALL 10 WAVES EARLY IN ONE LEVEL.', check: (s, r) => !!(r && r.earlyCalls >= 10 && !r.sandbox) },
  { id: 'depots', name: 'QUARTERMASTER', desc: 'RUN 3 SUPPLY DEPOTS AT ONCE.', check: (s, r) => !!(r && r.maxDepots >= 3 && !r.sandbox) },
  { id: 'specialist', name: 'SPECIALIST', desc: 'BUILD A TIER-4 TOWER.', check: (s, r) => !!(r && r.t4Built > 0 && !r.sandbox) },
  { id: 'vents', name: 'VENT BUSTER', desc: 'DESTROY ALL 3 FOUNDRY VENTS IN ONE FIGHT.', check: (s, r) => !!(r && r.ventsDown >= 3 && !r.sandbox) },
  { id: 'kills-1k', name: 'SCRAP METAL', desc: 'DESTROY 1,000 DROIDS.', check: (s) => totalKills(s) >= 1000 },
  { id: 'kills-10k', name: 'SCRAPYARD', desc: 'DESTROY 10,000 DROIDS.', check: (s) => totalKills(s) >= 10000 },
  { id: 'stars-40', name: 'HALFWAY', desc: 'EARN 40 STARS.', check: (s) => starsEarned(s) >= 40 },
  { id: 'stars-80', name: 'FULL HONORS', desc: `EARN ALL ${LEVEL_ORDER.length * 4} STARS.`, check: (s) => starsEarned(s) >= MAX_STARS },
  { id: 'tech-first', name: 'REQUISITION', desc: 'UNLOCK A TECH NODE.', check: (s) => Object.values(s.tech || {}).some(Boolean) },
  { id: 'tech-all', name: 'FULL ARSENAL', desc: 'UNLOCK THE WHOLE TECH TREE.', check: (s) => TECH.every((n) => s.tech?.[n.id]) },
  { id: 'archivist', name: 'ARCHIVIST', desc: 'UNLOCK EVERY ARCHIVE ENTRY.', check: (s) => ARCHIVE.every((a) => s.unlocks[`seen:${a.id}`]) },
  { id: 'veteran', name: 'VETERAN', desc: 'PLAY FOR 5 HOURS.', check: (s) => s.stats.playSeconds >= 5 * 3600 },
];

// Returns the ids newly earned (and records them on the save).
export function awardAchievements(save, run = null, now = Date.now()) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements[a.id]) continue;
    let ok = false;
    try { ok = a.check(save, run); } catch { ok = false; }
    if (ok) { save.achievements[a.id] = now; got.push(a.id); }
  }
  return got;
}

// --------------------------------------------------------------- archive --
// One entry per tower, droid and boss; unlocked on first encounter
// (save.unlocks['seen:<id>']). Lore is original (droid lore lives in enemies.js).
const TOWER_LORE = {
  rifle: 'A FOUR-TROOPER SQUAD DUG IN BEHIND SANDBAGS. THE BACKBONE OF EVERY REPUBLIC LINE.',
  rocket: 'TWO-TROOPER TEAM WITH A SHOULDER LAUNCHER. SLOW TO RELOAD, BUT WHAT IT HITS STAYS DOWN.',
  flak: 'TWIN AUTOCANNONS ON A ROTATING MOUNT. FILLS THE SKY WITH BURSTING SHELLS.',
  repeater: 'A HEAVY ROTARY BLASTER THAT NEEDS A MOMENT TO SPIN UP. THEN IT NEVER STOPS.',
  artillery: 'FIELD GUN THAT LOBS SHELLS OVER THE LINE. CANNOT HIT WHAT IS TOO CLOSE.',
  ion: 'DISCHARGES ION BOLTS THAT FRY DROID SHIELDS AND LOCK UP THEIR MOTORS.',
  sharpshooter: 'A WATCHTOWER WITH A MARKSMAN WHO PICKS OFF ARMOR FROM ACROSS THE FIELD.',
  depot: 'SUPPLY STACKS AND A FREIGHT LIFTER. NO GUNS, BUT IT PAYS FOR THE ONES THAT DO.',
};
const WEAK = {
  blaster: 'BLASTER', explosive: 'EXPLOSIVE', ion: 'ION', piercing: 'PIERCING',
};
function enemyWeakness(id) {
  const e = ENEMIES[id];
  const w = [];
  if (e.shield || e.bubble) w.push('ION VS SHIELDS');
  if (e.body === 'armored') w.push('EXPLOSIVE OR PIERCING VS ARMOR');
  else w.push('BLASTER IS FINE');
  if (e.layer === 'air') w.push('ANTI-AIR ONLY');
  if (id === 'reaper') w.push('PHASE 2 SHELL: EXPLOSIVE OR PIERCING');
  if (id === 'foundry') w.push('TARGET THE VENTS');
  return w.join(' · ');
}
export const ARCHIVE = [
  ...Object.keys(TOWERS).map((id) => ({ id, kind: 'tower', name: TOWERS[id].name.toUpperCase(), lore: TOWER_LORE[id], info: `${(TOWERS[id].dtype ? WEAK[TOWERS[id].dtype] : 'ECONOMY')} · ${TOWERS[id].role.toUpperCase()}` })),
  ...Object.keys(ENEMIES).map((id) => ({ id, kind: ENEMIES[id].boss ? 'boss' : 'enemy', name: ENEMIES[id].name.toUpperCase(), lore: (ENEMIES[id].lore || '').toUpperCase(), info: enemyWeakness(id) })),
];
