// Pure rule functions: damage with shield overflow, stun diminishing
// returns, non-stacking effect slots, economy. No DOM, no randomness.

import { DAMAGE, STATUS, ECONOMY } from '../data/rules.js';

// ---------------------------------------------------------------- damage --
// Damage hits the shield pool first (Shield column). Whatever raw damage is
// left after the pool breaks carries into the body (body column).
// `armorMult` lets effects such as Armor Breaker change the armored column.
export function applyDamage(e, raw, dtype, out = {}) {
  const m = DAMAGE[dtype];
  out.shieldHit = false;
  out.armorHit = false;
  out.dealt = 0;
  out.killed = false;
  let rest = raw;
  if (e.shield > 0 && e.shieldActive !== false) {
    out.shieldHit = true;
    const eff = rest * m.shield;
    if (eff < e.shield) {
      e.shield -= eff;
      out.dealt += eff;
      rest = 0;
    } else {
      const used = e.shield / m.shield; // raw damage consumed by the pool
      out.dealt += e.shield;
      e.shield = 0;
      rest -= used;
      out.shieldBroke = true;
    }
  }
  if (rest > 0) {
    let bm = m[e.body];
    if (e.body === 'armored') {
      out.armorHit = true;
      if (e.armorBreak && e.armorBreak.t > 0) bm = Math.max(bm, e.armorBreak.v);
    }
    const eff = rest * bm;
    e.hp -= eff;
    out.dealt += eff;
  }
  e.shieldDelay = STATUS.shieldDelay;
  if (e.hp <= 0) {
    e.hp = 0;
    out.killed = true;
  }
  return out;
}

// Shield recharge after `shieldDelay` seconds without damage.
export function tickShield(e, dt, regen) {
  if (e.maxShield <= 0) return;
  if (e.shieldDelay > 0) e.shieldDelay -= dt;
  else if (e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + regen * dt);
}

// ---------------------------------------------------------------- stun ----
// Each repeat stun within `stunWindow` s lasts half the previous one. After
// `stunMax` stuns in the window the target is immune for `stunImmune` s.
// Bosses take `bossStunMult` of every duration.
export function newStunState() {
  return { t: 0, count: 0, last: 0, window: 0, immune: 0 };
}

export function applyStun(s, base, boss = false) {
  if (s.immune > 0) return 0;
  let dur;
  if (s.window > 0 && s.count > 0) {
    dur = s.last / 2;
    s.count++;
  } else {
    dur = base;
    s.count = 1;
  }
  s.last = dur;
  s.window = STATUS.stunWindow;
  const eff = boss ? dur * STATUS.bossStunMult : dur;
  s.t = Math.max(s.t, eff);
  if (s.count >= STATUS.stunMax) {
    s.immune = STATUS.stunImmune;
    s.count = 0;
    s.window = 0;
  }
  return eff;
}

export function tickStun(s, dt) {
  if (s.t > 0) s.t = Math.max(0, s.t - dt);
  if (s.window > 0) {
    s.window -= dt;
    if (s.window <= 0) { s.window = 0; s.count = 0; }
  }
  if (s.immune > 0) s.immune = Math.max(0, s.immune - dt);
}

// ---------------------------------------------------------------- slots ---
// Same-kind effects never stack: a slot holds the strongest active value.
// A weaker effect cannot replace a stronger one; an equal one refreshes time.
export function newSlot() {
  return { v: 0, t: 0 };
}

export function applySlot(slot, v, t) {
  if (slot.t <= 0 || v > slot.v) {
    slot.v = v;
    slot.t = t;
  } else if (v === slot.v) {
    slot.t = Math.max(slot.t, t);
  }
}

export function tickSlot(slot, dt) {
  if (slot.t > 0) {
    slot.t -= dt;
    if (slot.t <= 0) { slot.t = 0; slot.v = 0; }
  }
}

export function slowFactor(slot) {
  return 1 - Math.min(STATUS.slowCap, slot.t > 0 ? slot.v : 0);
}

// Auras (speed, fire rate, shield bubble): strongest source in range wins.
export function strongestAura(sources, x, y) {
  let best = 0;
  for (const s of sources) if (s.v > best && (s.x - x) ** 2 + (s.y - y) ** 2 <= s.r * s.r) best = s.v;
  return best;
}

// ---------------------------------------------------------------- economy -
export function interest(credits, planet) {
  return Math.min(Math.floor(credits * ECONOMY.interestRate), ECONOMY.interestCap[planet] ?? 60);
}

// Bonus multiplier shrinks over the level's later waves, floor 30%.
export function earlyCallMult(waveIndex, totalWaves) {
  if (totalWaves <= 1) return 1;
  const t = waveIndex / (totalWaves - 1);
  return Math.max(ECONOMY.earlyCall.minMult, 1 - t * (1 - ECONOMY.earlyCall.minMult));
}

export function earlyCallBonus(timeLeft, total, waveIndex, totalWaves) {
  if (total <= 0 || timeLeft <= 0) return 0;
  return Math.floor(ECONOMY.earlyCall.base * (timeLeft / total) * earlyCallMult(waveIndex, totalWaves));
}

// 70% of everything spent; 100% if the tower never fired. Depots: 100% only
// if no wave has ended since placement.
export function sellValue(tower, wavesEnded = 0) {
  const full = tower.type === 'depot' ? tower.placedWavesEnded === wavesEnded : !tower.fired;
  return full ? tower.spent : Math.floor(tower.spent * ECONOMY.sellRefund);
}

export function canBuildDepot(towers) {
  return towers.filter((t) => t.type === 'depot').length < ECONOMY.depotMax;
}
