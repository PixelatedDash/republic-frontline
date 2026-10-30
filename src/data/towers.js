// Tower data. Ranges/splash in art pixels (1 tile = 32), rate in shots/s,
// `cost` on t1 = build cost, on later tiers = upgrade cost.
// Special fields: spin (repeater rate ramp), minRange, slow, stun, chain,
// pulse, pierce, armorBreak, barrage, income (depot, per wave end), aura
// (depot relay: nearby fire-rate bonus).

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

Object.assign(TOWERS, {
  repeater: {
    name: 'Repeater Nest',
    short: 'REPEATER',
    size: 1,
    dtype: 'blaster',
    role: 'Rotary blaster. Spins up while firing. Ground only.',
    tiers: {
      t1: { name: 'Repeater Nest I', cost: 150, dmg: 4, rate: 6, range: 96, ground: true, air: false, proj: 'bolt', projSpeed: 720, spin: { min: 0.3, time: 1.6 } },
      t2: { name: 'Repeater Nest II', cost: 120, dmg: 6, rate: 6.5, range: 100, ground: true, air: false, proj: 'bolt', projSpeed: 720, spin: { min: 0.3, time: 1.5 } },
      t3: { name: 'Repeater Nest III', cost: 180, dmg: 8, rate: 7.5, range: 108, ground: true, air: false, proj: 'bolt', projSpeed: 760, spin: { min: 0.35, time: 1.4 } },
      t4a: { name: 'Twin Repeater', cost: 300, dmg: 8, rate: 13, range: 112, ground: true, air: false, proj: 'bolt', projSpeed: 760, spin: { min: 0.35, time: 1.4 }, blurb: 'Two rotaries: sustained damage.' },
      t4b: { name: 'Suppression Gun', cost: 300, dmg: 7, rate: 8, range: 116, ground: true, air: false, proj: 'bolt', projSpeed: 760, spin: { min: 0.35, time: 1.4 }, slow: { v: 0.3, t: 0.8 }, blurb: 'Every hit slows the target 30%.' },
    },
  },
  artillery: {
    name: 'Artillery Battery',
    short: 'ARTILLERY',
    size: 1,
    dtype: 'explosive',
    role: 'Long-range shells with a minimum range. Ground only.',
    tiers: {
      t1: { name: 'Artillery Battery I', cost: 200, dmg: 48, rate: 0.35, range: 200, minRange: 64, splash: 40, ground: true, air: false, proj: 'shell', projSpeed: 230 },
      t2: { name: 'Artillery Battery II', cost: 160, dmg: 68, rate: 0.38, range: 216, minRange: 64, splash: 44, ground: true, air: false, proj: 'shell', projSpeed: 240 },
      t3: { name: 'Artillery Battery III', cost: 240, dmg: 92, rate: 0.4, range: 232, minRange: 64, splash: 48, ground: true, air: false, proj: 'shell', projSpeed: 250 },
      t4a: { name: 'Siege Howitzer', cost: 380, dmg: 320, rate: 0.28, range: 264, minRange: 72, splash: 56, ground: true, air: false, proj: 'shell', projSpeed: 250, heavy: true, blurb: 'One huge impact. Shakes the ground.' },
      t4b: { name: 'Barrage Battery', cost: 380, dmg: 64, rate: 0.42, range: 240, minRange: 64, splash: 36, ground: true, air: false, proj: 'shell', projSpeed: 250, barrage: { count: 4, spread: 44 }, blurb: 'Scattered multi-shell barrage.' },
    },
  },
  ion: {
    name: 'Ion Cannon',
    short: 'ION CANNON',
    size: 1,
    dtype: 'ion',
    role: 'Strips shields and stuns droids. Ground and air.',
    tiers: {
      t1: { name: 'Ion Cannon I', cost: 170, dmg: 10, rate: 1.0, range: 112, ground: true, air: true, proj: 'ion', projSpeed: 900, stun: 0.5 },
      t2: { name: 'Ion Cannon II', cost: 140, dmg: 15, rate: 1.1, range: 120, ground: true, air: true, proj: 'ion', projSpeed: 900, stun: 0.6 },
      t3: { name: 'Ion Cannon III', cost: 200, dmg: 22, rate: 1.2, range: 128, ground: true, air: true, proj: 'ion', projSpeed: 960, stun: 0.7 },
      t4a: { name: 'Ion Arc', cost: 320, dmg: 26, rate: 1.0, range: 136, ground: true, air: true, proj: 'arc', stun: 0.5, chain: { count: 4, range: 80, falloff: 0.8 }, blurb: 'Lightning chains between 4 droids.' },
      t4b: { name: 'Pulse Dome', cost: 320, dmg: 30, rate: 0.45, range: 100, ground: true, air: true, proj: 'pulse', stun: 0.6, pulse: true, blurb: 'Periodic ion pulse hits everything in range.' },
    },
  },
  sharpshooter: {
    name: 'Sharpshooter Post',
    short: 'SHARPSHOOTER',
    size: 1,
    dtype: 'piercing',
    role: 'Very long range, slow, piercing. Ground and air.',
    tiers: {
      t1: { name: 'Sharpshooter Post I', cost: 240, dmg: 42, rate: 0.4, range: 180, ground: true, air: true, proj: 'snipe' },
      t2: { name: 'Sharpshooter Post II', cost: 200, dmg: 60, rate: 0.45, range: 192, ground: true, air: true, proj: 'snipe' },
      t3: { name: 'Sharpshooter Post III', cost: 290, dmg: 84, rate: 0.5, range: 204, ground: true, air: true, proj: 'snipe' },
      t4a: { name: 'Armor Breaker', cost: 450, dmg: 100, rate: 0.5, range: 216, ground: true, air: true, proj: 'snipe', armorBreak: { v: 1.25, t: 4 }, blurb: 'Hits crack armor: every tower deals more for 4 s.' },
      t4b: { name: 'Rail Marksman', cost: 450, dmg: 125, rate: 0.4, range: 240, ground: true, air: true, proj: 'snipe', pierce: { count: 5, width: 12 }, blurb: 'Shots pierce through a line of droids.' },
    },
  },
  depot: {
    name: 'Supply Depot',
    short: 'SUPPLY DEPOT',
    size: 2,
    dtype: null,
    role: 'Earns credits at the end of every wave. Max 3 per map.',
    tiers: {
      t1: { name: 'Supply Depot I', cost: 150, income: 30, rate: 0, range: 0, ground: false, air: false },
      t2: { name: 'Supply Depot II', cost: 120, income: 48, rate: 0, range: 0, ground: false, air: false },
      t3: { name: 'Supply Depot III', cost: 160, income: 68, rate: 0, range: 0, ground: false, air: false },
      t4a: { name: 'Credit Exchange', cost: 260, income: 105, rate: 0, range: 0, ground: false, air: false, blurb: 'Much more income.' },
      t4b: { name: 'Command Relay', cost: 240, income: 0, rate: 0, range: 112, ground: false, air: false, aura: { rate: 0.15 }, blurb: 'No income. Towers in range fire 15% faster.' },
    },
  },
});

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
// `st` overrides the data tier (the sim's tech-adjusted stats).
export function towerDps(type, tier, st = null) {
  const t = st || tierStats(type, tier);
  if (!t.rate) return 0;
  const crit = t.crit ? 1 + t.crit.chance * (t.crit.mult - 1) : 1;
  const bomb = t.bomblets ? t.bomblets.count * t.bomblets.dmg * 0.3 : 0;
  const multi = (t.salvo || 1) * (t.barrage ? t.barrage.count * 0.6 : 1) * (t.chain ? 1 + (t.chain.count - 1) * 0.6 : 1) * (t.pierce ? 1.8 : 1) * (t.pulse ? 2.5 : 1);
  const spin = t.spin ? (1 + t.spin.min) / 2 + 0.25 : 1;
  return (t.dmg * crit + bomb) * t.rate * multi * spin;
}
