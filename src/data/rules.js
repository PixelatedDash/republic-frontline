// Global rules: damage table, difficulty, economy, status effects.

// Damage multiplier by damage type vs. target part (spec §6).
// `shell` is the Timber Reaper's phase-2 armor shell (spec: armored body
// class with a high multiplier against Blaster/Ion; needs Explosive or
// Piercing).
export const DAMAGE = {
  blaster: { unarmored: 1.0, armored: 0.5, shield: 0.5, shell: 0.2 },
  explosive: { unarmored: 1.0, armored: 1.5, shield: 0.75, shell: 1.5 },
  ion: { unarmored: 0.75, armored: 0.75, shield: 2.5, shell: 0.2 },
  piercing: { unarmored: 1.0, armored: 1.75, shield: 1.0, shell: 1.75 },
};

export const DIFFICULTY = {
  padawan: { name: 'Padawan', hp: 0.8, credits: 1.2, count: 1.0, lives: 25, bossLeak: 10 },
  jedi: { name: 'Jedi', hp: 1.0, credits: 1.0, count: 1.0, lives: 20, bossLeak: 15 },
  master: { name: 'Jedi Master', hp: 1.35, credits: 1.0, count: 1.2, lives: 10, bossLeak: 'loss' },
  heroic: { name: 'Heroic', hp: 1.35, credits: 1.0, count: 1.2, lives: 11, bossLeak: 'loss', towerLimit: 4 },
};

export const ECONOMY = {
  interestRate: 0.05,
  // per-wave interest cap scales slightly per planet
  interestCap: { kamino: 60, geonosis: 65, kashyyyk: 70, umbara: 75, mustafar: 80 },
  earlyCall: { base: 30, minMult: 0.3 }, // bonus = base * timeLeft/total * mult(wave)
  sellRefund: 0.7,
  depotMax: 3,
  countdown: 18, // seconds between a wave finishing its spawns and the next wave
};

export const STATUS = {
  shieldDelay: 3, // s without damage before shields recharge
  stunWindow: 4, // repeat stuns within this window are halved
  stunMax: 3, // after this many stuns in the window: immune
  stunImmune: 4,
  bossStunMult: 0.25,
  slowCap: 0.5,
  relayRadius: 112,
};

export const SIM_HZ = 60;
export const DT = 1 / SIM_HZ;
