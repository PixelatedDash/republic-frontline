// Tower data. Ranges/splash in art pixels (1 tile = 32), rate in shots/s,
// `cost` on t1 = build cost, on later tiers = upgrade cost.
// Phase 1 slice: Rifle Squad, Rocket Team, Flak Turret. The other five
// towers arrive in Phase 2.

export const TOWERS = {
  rifle: {
    name: 'Clone Rifle Squad',
    short: 'RIFLE SQUAD',
    size: 2,
    dtype: 'blaster',
    role: 'Cheap all-rounder. Hits ground and air.',
    tiers: {
      t1: { name: 'Rifle Squad I', cost: 100, dmg: 6, rate: 2.4, range: 104, ground: true, air: true, proj: 'bolt', projSpeed: 640 },
      t2: { name: 'Rifle Squad II', cost: 90, dmg: 9, rate: 2.6, range: 112, ground: true, air: true, proj: 'bolt', projSpeed: 640 },
      t3: { name: 'Rifle Squad III', cost: 150, dmg: 13, rate: 2.8, range: 120, ground: true, air: true, proj: 'bolt', projSpeed: 680 },
      t4a: { name: 'Elite Squad', cost: 260, dmg: 15, rate: 4.6, range: 124, ground: true, air: true, proj: 'bolt', projSpeed: 720, blurb: 'More troopers, faster fire.' },
      t4b: { name: 'Marksman Squad', cost: 260, dmg: 30, rate: 1.6, range: 180, ground: true, air: true, proj: 'bolt', projSpeed: 840, crit: { chance: 0.25, mult: 2.5 }, blurb: 'Longer range, critical hits.' },
    },
  },
  rocket: {
    name: 'Rocket Team',
    short: 'ROCKET TEAM',
    size: 1,
    dtype: 'explosive',
    role: 'Splash damage, strong against armor. Hits air from tier III.',
    tiers: {
      t1: { name: 'Rocket Team I', cost: 160, dmg: 30, rate: 0.55, range: 120, splash: 32, ground: true, air: false, proj: 'rocket', projSpeed: 300 },
      t2: { name: 'Rocket Team II', cost: 140, dmg: 26, rate: 0.62, range: 128, splash: 36, ground: true, air: false, proj: 'rocket', projSpeed: 310, salvo: 2 },
      t3: { name: 'Rocket Team III', cost: 200, dmg: 34, rate: 0.66, range: 136, splash: 40, ground: true, air: true, proj: 'rocket', projSpeed: 330, salvo: 2 },
      t4a: { name: 'Tandem Launcher', cost: 320, dmg: 150, rate: 0.55, range: 156, splash: 16, ground: true, air: true, proj: 'rocket', projSpeed: 360, blurb: 'Heavy single-target anti-armor.' },
      t4b: { name: 'Cluster Pod', cost: 320, dmg: 34, rate: 0.6, range: 140, splash: 60, ground: true, air: true, proj: 'rocket', projSpeed: 300, bomblets: { count: 5, dmg: 14, splash: 28, spread: 44 }, blurb: 'Wide splash against swarms.' },
    },
  },
  flak: {
    name: 'Flak Turret',
    short: 'FLAK TURRET',
    size: 1,
    dtype: 'explosive',
    role: 'Airburst shells. Air targets only.',
    tiers: {
      t1: { name: 'Flak Turret I', cost: 140, dmg: 14, rate: 1.2, range: 148, splash: 28, ground: false, air: true, proj: 'flak', projSpeed: 480 },
      t2: { name: 'Flak Turret II', cost: 120, dmg: 21, rate: 1.4, range: 156, splash: 32, ground: false, air: true, proj: 'flak', projSpeed: 500 },
      t3: { name: 'Flak Turret III', cost: 180, dmg: 30, rate: 1.6, range: 168, splash: 36, ground: false, air: true, proj: 'flak', projSpeed: 520 },
      t4a: { name: 'Burst Flak', cost: 280, dmg: 38, rate: 2.2, range: 172, splash: 60, ground: false, air: true, proj: 'flak', projSpeed: 540, blurb: 'Area air damage.' },
      t4b: { name: 'Interceptor Battery', cost: 280, dmg: 30, rate: 0.9, range: 224, splash: 20, ground: false, air: true, proj: 'missile', projSpeed: 300, salvo: 4, blurb: 'Homing anti-air missiles.' },
    },
  },
};

export const TIER_ORDER = ['t1', 't2', 't3'];
export const BRANCHES = ['t4a', 't4b'];

export function nextTiers(tier) {
  if (tier === 't1') return ['t2'];
  if (tier === 't2') return ['t3'];
  if (tier === 't3') return BRANCHES;
  return [];
}

export function tierStats(type, tier) {
  return TOWERS[type].tiers[tier];
}

// DPS shown in the info panel (single target, before armor/shields).
export function towerDps(type, tier) {
  const t = tierStats(type, tier);
  const crit = t.crit ? 1 + t.crit.chance * (t.crit.mult - 1) : 1;
  const bomb = t.bomblets ? t.bomblets.count * t.bomblets.dmg * 0.3 : 0;
  return (t.dmg * crit + bomb) * t.rate * (t.salvo || 1);
}
