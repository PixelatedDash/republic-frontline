// The game simulation. Pure logic: no DOM, no canvas, no Math.random.
// All mutable state lives in `sim.state` (plain JSON-serializable data, ids
// instead of references). Visual/audio layers read `sim.events`, which the
// caller clears after consuming. Fixed timestep: call step() at 60 Hz.

import { ENEMIES } from '../data/enemies.js';
import { TOWERS, nextTiers } from '../data/towers.js';
import { DIFFICULTY, ECONOMY, STATUS, DT } from '../data/rules.js';
import { LEVELS, buildLevel, TILE } from '../data/levels/index.js';
import { seedState, rand } from '../engine/rng.js';
import { SpatialHash } from './spatial.js';
import * as R from './rules.js';

export const SAVE_SIM_VERSION = 3;
export const TARGET_MODES = ['first', 'last', 'strongest', 'closest', 'air'];

// ------------------------------------------------------------------ setup --
// tech: { mods, locked } from the tech tree (src/data/meta.js simTech), or
// null = every tier-4 branch open, no stat mods (bots, tests, Sandbox).
// sandbox: no waves, unlimited credits, spawns via sandboxSpawn().
export function createSim({ levelId, difficulty = 'jedi', seed = 1, heroic = false, allowedTowers = null, tech = null, sandbox = false }) {
  const def = LEVELS[levelId];
  if (!def) throw new Error(`unknown level ${levelId}`);
  const diff = DIFFICULTY[heroic ? 'heroic' : difficulty];
  const state = {
    v: SAVE_SIM_VERSION,
    levelId, difficulty, heroic, seed,
    rng: seedState(seed),
    tick: 0, time: 0,
    lives: diff.lives, maxLives: diff.lives,
    credits: Math.round(def.startCredits * diff.credits),
    phase: 'setup',
    waveIndex: 0,
    totalWaves: def.waves.length,
    countdown: 0, countdownTotal: 0,
    pending: [],
    waveLeft: [],
    waveSpawned: [],
    wavePaid: [],
    wavesEnded: 0,
    enemies: [], towers: [], projectiles: [],
    nextId: 1,
    allowedTowers: allowedTowers || def.towers,
    tech: tech ? JSON.parse(JSON.stringify(tech)) : null,
    sandbox: sandbox ? { invincible: false } : null,
    stats: { kills: {}, killsTotal: 0, leaked: 0, creditsEarned: 0, built: 0, shots: 0, leakedTypes: {}, bossKills: 0, sold: 0, earlyCalls: 0, ventsDown: 0, maxDepots: 0, t4Built: 0 },
  };
  if (sandbox) {
    state.credits = SANDBOX_CREDITS;
    state.totalWaves = 0;
    state.phase = 'running';
  }
  return attach(state);
}

function attach(state) {
  const level = buildLevel(LEVELS[state.levelId]);
  return {
    state,
    level,
    events: [],
    emit: true,
    hash: new SpatialHash(level.w * TILE, level.h * TILE, 64),
    byId: new Map(),
    scratch: new Array(512),
    scratch2: new Array(512),
    dmgOut: {},
    auras: { speed: [], bubble: [], heal: [], relay: [] },
  };
}

export function snapshot(sim) {
  return JSON.parse(JSON.stringify(sim.state));
}

export function restore(snap) {
  return attach(migrateState(JSON.parse(JSON.stringify(snap))));
}

// v1 (Phase 1) mid-level snapshots lack the Phase 2 per-entity fields.
function migrateState(s) {
  if ((s.v || 1) < 2) {
    for (const e of s.enemies) {
      e.regen ??= ENEMIES[e.type]?.shieldRegen || 0;
      e.bubble ??= 0;
      e.bubbleMax ??= 0;
      e.speedMult ??= 1;
    }
    for (const t of s.towers) { t.spin ??= 0; t.idle ??= 0; t.dim ??= 0; }
    s.stats.bossKills ??= 0;
    s.v = 2;
  }
  if (s.v < 3) {
    s.tech ??= null;
    s.sandbox ??= null;
    for (const k of ['sold', 'earlyCalls', 'ventsDown', 'maxDepots', 't4Built']) s.stats[k] ??= 0;
    s.v = 3;
  }
  return s;
}

function ev(sim, e) {
  if (sim.emit) sim.events.push(e);
}

const diffOf = (s) => DIFFICULTY[s.heroic ? 'heroic' : s.difficulty];
const SANDBOX_CREDITS = 99999;

// Effective tower stats: the data tier x the tech-tree mods in state.tech.
// Merged objects are cached per tech block (snapshots stay plain JSON).
const statCache = new WeakMap();
export function towerStats(s, type, tier) {
  const base = TOWERS[type].tiers[tier];
  const m = s?.tech?.mods?.[type];
  if (!m) return base;
  let c = statCache.get(s.tech);
  if (!c) statCache.set(s.tech, (c = new Map()));
  const key = type + tier;
  let st = c.get(key);
  if (!st) {
    st = { ...base };
    if (m.cost) st.cost = Math.round(base.cost * m.cost);
    if (m.dmg && base.dmg) st.dmg = base.dmg * m.dmg;
    if (m.range && base.range) st.range = Math.round(base.range * m.range);
    if (m.rate && base.rate) st.rate = base.rate * m.rate;
    if (m.splash && base.splash) st.splash = Math.round(base.splash * m.splash);
    if (m.income && base.income) st.income = Math.round(base.income * m.income);
    c.set(key, st);
  }
  return st;
}

// Next tiers a tower can take, minus tier-4 branches the tech tree still locks.
export function tierOptions(s, t) {
  const locked = s.tech?.locked?.[t.type];
  const opts = nextTiers(t.tier);
  return locked ? opts.filter((x) => !locked.includes(x)) : opts;
}
// Droid HP / shield multiplier: difficulty x the level's tuned hpScale.
const hpMultOf = (s) => diffOf(s).hp * (LEVELS[s.levelId].hpScale || 1);

// ------------------------------------------------------------------ paths --
export function pointOnPath(path, d, out) {
  const { pts, cum } = path;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1], b = pts[i];
  const seg = cum[i] - cum[i - 1] || 1;
  const t = Math.min(1, Math.max(0, (d - cum[i - 1]) / seg));
  out.x = a[0] + (b[0] - a[0]) * t;
  out.y = a[1] + (b[1] - a[1]) * t;
  out.dx = (b[0] - a[0]) / seg;
  out.dy = (b[1] - a[1]) / seg;
  return out;
}
const P = { x: 0, y: 0, dx: 0, dy: 0 };

// Closest point on any ground path to (x, y): { route, dist }.
export function nearestOnPaths(level, x, y) {
  let best = { route: 0, dist: 0, d2: Infinity };
  level.paths.forEach((p, route) => {
    for (let i = 1; i < p.pts.length; i++) {
      const a = p.pts[i - 1], b = p.pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
      const cx = a[0] + dx * t, cy = a[1] + dy * t;
      const d2 = (cx - x) ** 2 + (cy - y) ** 2;
      if (d2 < best.d2) best = { route, dist: p.cum[i - 1] + Math.sqrt(L2) * t, d2 };
    }
  });
  return best;
}

// ------------------------------------------------------------------ waves --
export function wavePreview(sim, index = sim.state.waveIndex) {
  const def = LEVELS[sim.state.levelId];
  const w = def.waves[index];
  if (!w) return null;
  const mult = diffOf(sim.state).count;
  const counts = {};
  for (const g of w.groups) counts[g.type] = (counts[g.type] || 0) + (ENEMIES[g.type].boss ? g.count : Math.ceil(g.count * mult));
  const types = Object.keys(counts);
  return {
    index,
    groups: types.map((t) => ({ type: t, count: counts[t] })),
    air: types.some((t) => ENEMIES[t].layer === 'air'),
    armor: types.some((t) => ENEMIES[t].body === 'armored'),
    shield: types.some((t) => ENEMIES[t].shield > 0 || ENEMIES[t].bubble),
    boss: types.find((t) => ENEMIES[t].boss) || null,
  };
}

function launchWave(sim) {
  const s = sim.state;
  const def = LEVELS[s.levelId];
  const w = s.waveIndex;
  const wave = def.waves[w];
  const mult = diffOf(s).count;
  let total = 0;
  const list = [];
  wave.groups.forEach((g, gi) => {
    const n = ENEMIES[g.type].boss ? g.count : Math.ceil(g.count * mult);
    const gap = g.gap * (g.count / n); // keep group duration when counts grow
    const paths = Array.isArray(g.path) ? g.path : [g.path || 0];
    const lanes = Array.isArray(g.lane) ? g.lane : [g.lane || 0];
    for (let i = 0; i < n; i++) list.push({ at: s.time + (g.delay || 0) + i * gap, type: g.type, path: paths[i % paths.length], lane: lanes[i % lanes.length], wave: w, o: gi * 1000 + i });
    total += n;
  });
  list.sort((a, b) => a.at - b.at || a.o - b.o);
  for (const p of list) s.pending.push(p);
  s.pending.sort((a, b) => a.at - b.at || a.wave - b.wave || a.o - b.o);
  s.waveLeft[w] = total;
  s.waveSpawned[w] = false;
  s.wavePaid[w] = false;
  s.waveIndex++;
  s.countdown = 0;
  s.countdownTotal = 0;
  s.phase = 'running';
  ev(sim, { t: 'wave', n: w + 1, total: s.totalWaves, size: total, boss: wave.groups.some((g) => ENEMIES[g.type].boss) });
}

// Start the first wave (from setup) or call the next wave early.
export function startWave(sim) {
  const s = sim.state;
  if (s.phase === 'setup') {
    launchWave(sim);
    return { ok: true, bonus: 0 };
  }
  if (s.phase !== 'running' || s.countdown <= 0 || s.waveIndex >= s.totalWaves) return { ok: false };
  const bonus = R.earlyCallBonus(s.countdown, s.countdownTotal, s.waveIndex, s.totalWaves);
  s.credits += bonus;
  s.stats.creditsEarned += bonus;
  s.stats.earlyCalls++;
  ev(sim, { t: 'earlyCall', bonus });
  launchWave(sim);
  return { ok: true, bonus };
}

// Sandbox spawner: `count` droids of `type` (a boss spawns alone), spread
// over the level's ground paths or air lanes, a short gap apart.
export function sandboxSpawn(sim, type, count = 1) {
  const s = sim.state;
  if (!s.sandbox || !ENEMIES[type]) return { ok: false };
  const d = ENEMIES[type];
  const air = d.layer === 'air';
  const routes = air ? sim.level.lanes.length : sim.level.paths.length;
  const n = d.boss ? 1 : Math.max(1, Math.min(60, count));
  const gap = d.boss ? 0 : Math.max(0.2, 1.2 - n * 0.02);
  for (let i = 0; i < n; i++) s.pending.push({ at: s.time + i * gap, type, path: i % routes, lane: i % routes, wave: 0, o: s.nextId + i });
  s.pending.sort((a, b) => a.at - b.at || a.o - b.o);
  s.waveLeft[0] = (s.waveLeft[0] || 0) + n;
  return { ok: true, count: n };
}

// ---------------------------------------------------------------- enemies --
function makeEnemy(sim, type, wave, air, route, dist, ofs) {
  const s = sim.state;
  const d = ENEMIES[type];
  const hpMult = hpMultOf(s);
  const path = air ? sim.level.lanes[route] : sim.level.paths[route];
  pointOnPath(path, dist, P);
  const e = {
    id: s.nextId++, type, wave, air,
    body: d.body,
    hp: d.hp * hpMult, maxHp: d.hp * hpMult,
    shield: d.shield * hpMult, maxShield: d.shield * hpMult, shieldActive: true, shieldDelay: 0, regen: d.shieldRegen || 0,
    bubble: 0, bubbleMax: 0,
    speed: d.speed, speedMult: 1, route, dist, ofs,
    x: P.x - P.dy * ofs, y: P.y + P.dx * ofs, px: 0, py: 0, face: P.dx < 0 ? -1 : 1,
    stun: R.newStunState(), slow: R.newSlot(), armorBreak: R.newSlot(),
    mode: 'walk', modeT: 0, rolled: 0,
    flash: 0, alive: true, anim: 0,
  };
  e.px = e.x;
  e.py = e.y;
  if (d.roll) {
    e.mode = 'roll';
    e.shieldActive = false;
  }
  if (d.boss) {
    e.boss = true;
    e.phase = 0;
    e.timers = {};
    if (d.emerge) { e.mode = 'emerge'; e.modeT = d.emerge; }
    if (d.spawner) e.timers.spawn = d.spawner.every;
    if (d.launch) e.timers.launch = d.launch.every * 0.6;
    if (d.lightsOut) e.timers.lights = d.lightsOut.every * 0.5;
  }
  s.enemies.push(e);
  return e;
}

function spawnEnemy(sim, p) {
  const d = ENEMIES[p.type];
  const air = d.layer === 'air';
  const ofs = air || d.boss ? 0 : (rand(sim.state.rng) - 0.5) * 12;
  const route = Math.min(air ? sim.level.lanes.length - 1 : sim.level.paths.length - 1, air ? p.lane : p.path);
  const e = makeEnemy(sim, p.type, p.wave, air, route, 0, ofs);
  ev(sim, { t: 'spawn', id: e.id, type: e.type, x: e.x, y: e.y, boss: !!e.boss });
  if (e.boss) {
    if (d.vents) {
      e.parts = [];
      d.vents.xs.forEach((ox, i) => {
        const v = makeEnemy(sim, 'trooper', e.wave, false, e.route, e.dist + 0.5, 0);
        Object.assign(v, { type: 'vent', part: true, parent: e.id, slot: i, ox, oy: d.vents.y, body: 'unarmored', hp: d.vents.hp * hpMultOf(sim.state), maxHp: d.vents.hp * hpMultOf(sim.state) });
        e.parts.push(v.id);
      });
      e.ventsAlive = d.vents.count;
    }
    ev(sim, { t: 'bossSpawn', id: e.id, type: e.type, x: e.x, y: e.y });
  }
}

// Extra droids released mid-wave (splits, drops, boss spawns) join the
// source's wave so it cannot end before they are resolved.
function spawnExtra(sim, type, wave, route, dist, ofs = 0) {
  const s = sim.state;
  const d = ENEMIES[type];
  const air = d.layer === 'air';
  const path = air ? sim.level.lanes[route] : sim.level.paths[route];
  const e = makeEnemy(sim, type, wave, air, route, Math.max(0, Math.min(path.len - 1, dist)), ofs);
  s.waveLeft[wave] = (s.waveLeft[wave] || 0) + 1;
  ev(sim, { t: 'spawn', id: e.id, type, x: e.x, y: e.y, extra: true });
  return e;
}

// Auras (non-stacking: strongest source in range wins), collected once per step.
function collectAuras(sim) {
  const A = sim.auras;
  A.speed.length = A.bubble.length = A.heal.length = A.relay.length = 0;
  for (const e of sim.state.enemies) {
    if (!e.alive || e.part) continue;
    const d = ENEMIES[e.type];
    if (d.aura) A.speed.push({ x: e.x, y: e.y, r: d.aura.r, v: d.aura.speed, id: e.id });
    if (d.bubble) A.bubble.push({ x: e.x, y: e.y, r: d.bubble.r, v: d.bubble.v * hpMultOf(sim.state), regen: d.bubble.regen, id: e.id });
    if (d.heal) A.heal.push({ x: e.x, y: e.y, r: d.heal.r, v: d.heal.rate, id: e.id });
  }
  for (const t of sim.state.towers) {
    const st = towerStats(sim.state, t.type, t.tier);
    if (st.aura) A.relay.push({ x: t.x, y: t.y, r: st.range, v: st.aura.rate, id: t.id });
  }
}

function strongest(list, x, y, selfId) {
  let best = null;
  for (const a of list) if (a.id !== selfId && (!best || a.v > best.v) && (a.x - x) ** 2 + (a.y - y) ** 2 <= a.r * a.r) best = a;
  return best;
}

function updateEnemy(sim, e) {
  const s = sim.state;
  const d = ENEMIES[e.type];
  e.px = e.x;
  e.py = e.y;
  if (e.flash > 0) e.flash--;
  if (e.part) return; // weak points ride on their parent (positioned in step)
  R.tickStun(e.stun, DT);
  R.tickSlot(e.slow, DT);
  R.tickSlot(e.armorBreak, DT);
  if (e.shieldActive) R.tickShield(e, DT, e.regen);
  // Shield Walker bubble: refill toward the strongest bubble in range.
  const bub = strongest(sim.auras.bubble, e.x, e.y, e.id);
  e.bubbleMax = bub ? bub.v : 0;
  if (bub) e.bubble = Math.min(e.bubbleMax, e.bubble + bub.regen * DT);
  else e.bubble = 0;
  const heal = strongest(sim.auras.heal, e.x, e.y, e.id);
  if (heal && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + heal.v * DT);
  if (e.boss) updateBoss(sim, e, d);
  let speed = d.speed * e.speedMult;
  if (e.mode === 'roll') speed = d.roll.speed;
  else if (e.mode === 'deploy' || e.mode === 'emerge') {
    speed = 0;
    e.modeT -= DT;
    if (e.modeT <= 0) {
      const wasDeploy = e.mode === 'deploy';
      e.mode = 'walk';
      if (wasDeploy) {
        e.shieldActive = true;
        ev(sim, { t: 'deploy', id: e.id, x: e.x, y: e.y });
      }
    }
  }
  if (e.stun.t > 0) speed = 0;
  const aura = strongest(sim.auras.speed, e.x, e.y, e.id);
  if (aura) speed *= 1 + aura.v;
  speed *= R.slowFactor(e.slow);
  const step = speed * DT;
  e.dist += step;
  e.anim += step;
  if (e.mode === 'roll') {
    e.rolled += step;
    if (e.rolled >= d.roll.dist) beginDeploy(e, d);
  }
  const path = e.air ? sim.level.lanes[e.route] : sim.level.paths[e.route];
  if (e.dist >= path.len) {
    leak(sim, e);
    return;
  }
  pointOnPath(path, e.dist, P);
  e.x = P.x - P.dy * e.ofs;
  e.y = P.y + P.dx * e.ofs;
  if (Math.abs(P.dx) > 0.3) e.face = P.dx < 0 ? -1 : 1;
}

function beginDeploy(e, d) {
  if (e.mode !== 'roll') return;
  e.mode = 'deploy';
  e.modeT = d.roll.deploy;
}

// ------------------------------------------------------------------ bosses --
function updateBoss(sim, e, d) {
  const T = e.timers;
  const s = sim.state;
  if (e.mode === 'emerge') return;
  if (d.spawner) {
    T.spawn -= DT;
    if (T.spawn <= 0) {
      const lost = d.vents.count - e.ventsAlive;
      T.spawn = d.spawner.every * (1 + d.spawner.slowPerVent * lost);
      const k = (T.n = (T.n || 0) + 1);
      spawnExtra(sim, d.spawner.types[k % d.spawner.types.length], e.wave, e.route, e.dist - 30, (rand(s.rng) - 0.5) * 10);
      ev(sim, { t: 'bossSpawnUnit', id: e.id, x: e.x, y: e.y });
    }
  }
  const ph = e.phase > 0 ? d.phases[e.phase - 1] : null;
  if (ph?.deploy) {
    T.deploy -= DT;
    if (T.deploy <= 0) {
      T.deploy = ph.deploy.every;
      for (let i = 0; i < ph.deploy.count; i++) spawnExtra(sim, ph.deploy.type, e.wave, e.route, e.dist - 10 - i * 14, (i % 2 ? 8 : -8));
      ev(sim, { t: 'bossSpawnUnit', id: e.id, x: e.x, y: e.y });
    }
  }
  if (ph?.minions) {
    T.minion -= DT;
    if (T.minion <= 0) {
      T.minion = ph.minions.every;
      const k = (T.m = (T.m || 0) + 1);
      spawnExtra(sim, ph.minions.types[k % ph.minions.types.length], e.wave, e.route, e.dist + 20, (k % 2 ? 10 : -10));
      ev(sim, { t: 'bossSpawnUnit', id: e.id, x: e.x, y: e.y });
    }
  }
  if (d.launch) {
    T.launch -= DT;
    if (T.launch <= 0) {
      T.launch = d.launch.every;
      spawnExtra(sim, d.launch.type, e.wave, e.route, e.dist + 10);
      ev(sim, { t: 'bossSpawnUnit', id: e.id, x: e.x, y: e.y });
    }
  }
  if (d.lightsOut) {
    T.lights -= DT;
    if (T.lights <= 0) {
      T.lights = d.lightsOut.every;
      const L = d.lightsOut;
      for (const t of s.towers) if ((t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= L.r * L.r) t.dim = L.t;
      ev(sim, { t: 'lightsOut', id: e.id, x: e.x, y: e.y, r: L.r });
    }
  }
}

function checkPhase(sim, e) {
  const d = ENEMIES[e.type];
  if (!d.phases) return;
  while (e.phase < d.phases.length && e.hp / e.maxHp <= d.phases[e.phase].at) {
    const ph = d.phases[e.phase];
    e.phase++;
    if (ph.body) e.body = ph.body;
    if (ph.shield) {
      e.maxShield = e.shield = ph.shield * hpMultOf(sim.state);
      e.shieldActive = true;
      e.regen = ph.shieldRegen || 0;
    }
    if (ph.speedMult) e.speedMult = ph.speedMult;
    if (ph.deploy) {
      for (let i = 0; i < ph.deploy.first; i++) spawnExtra(sim, ph.deploy.type, e.wave, e.route, e.dist - 12 - i * 12, (i % 2 ? 9 : -9));
      e.timers.deploy = ph.deploy.every;
    }
    if (ph.minions) e.timers.minion = 1;
    ev(sim, { t: 'bossPhase', id: e.id, type: e.type, phase: e.phase + 1, x: e.x, y: e.y });
  }
}

function leak(sim, e) {
  const s = sim.state;
  e.alive = false;
  e.leaked = true;
  const d = ENEMIES[e.type];
  const cost = s.sandbox?.invincible ? 0 : R.leakCost(d, diffOf(s));
  s.lives = Math.max(0, s.lives - cost);
  s.stats.leaked += 1;
  s.stats.leakedTypes[e.type] = (s.stats.leakedTypes[e.type] || 0) + 1;
  s.waveLeft[e.wave]--;
  if (e.parts) for (const id of e.parts) { const p = sim.byId.get(id); if (p) p.alive = false; }
  ev(sim, { t: 'leak', id: e.id, type: e.type, cost: Number.isFinite(cost) ? cost : s.maxLives, lives: s.lives, boss: !!e.boss });
}

function kill(sim, e, towerId) {
  const s = sim.state;
  e.alive = false;
  if (e.part) {
    const parent = sim.byId.get(e.parent);
    if (parent && parent.alive) parent.ventsAlive--;
    s.stats.ventsDown++;
    s.credits += 20;
    s.stats.creditsEarned += 20;
    ev(sim, { t: 'ventDown', id: e.id, parent: e.parent, slot: e.slot, x: e.x, y: e.y });
    return;
  }
  const d = ENEMIES[e.type];
  s.credits += d.bounty;
  s.stats.creditsEarned += d.bounty;
  s.stats.kills[e.type] = (s.stats.kills[e.type] || 0) + 1;
  s.stats.killsTotal++;
  if (e.boss) s.stats.bossKills++;
  s.waveLeft[e.wave]--;
  const t = sim.byId.get(towerId);
  if (t && t.tier) t.kills++;
  if (e.parts) for (const id of e.parts) { const p = sim.byId.get(id); if (p) p.alive = false; }
  ev(sim, { t: 'death', id: e.id, type: e.type, x: e.x, y: e.y, air: e.air, face: e.face, bounty: d.bounty, boss: !!e.boss });
  if (d.split) for (let i = 0; i < d.split.count; i++) spawnExtra(sim, d.split.type, e.wave, e.route, e.dist - 4 - (i >> 1) * 8, (i % 2 ? 7 : -7) + ((i >> 1) - 1) * 3);
  if (d.drops) {
    // troopers land on the nearest stretch of road, never in its last third
    const n = nearestOnPaths(sim.level, e.x, e.y);
    const dist = Math.min(n.dist, sim.level.paths[n.route].len * 0.66);
    for (let i = 0; i < d.drops.count; i++) spawnExtra(sim, d.drops.type, e.wave, n.route, dist - i * 10, (i - 1) * 7);
    ev(sim, { t: 'drop', x: e.x, y: e.y, count: d.drops.count });
  }
}

// Deal damage to one enemy; handles flashes, deploy triggers, phases, kills.
function damage(sim, e, raw, dtype, towerId, crit = false) {
  if (!e.alive) return;
  const out = R.applyDamage(e, raw, dtype, sim.dmgOut);
  e.flash = 2;
  if (e.mode === 'roll') beginDeploy(e, ENEMIES[e.type]);
  ev(sim, { t: 'hit', id: e.id, x: e.x, y: e.y, dtype, shield: out.shieldHit, armor: out.armorHit, broke: !!out.shieldBroke, dmg: out.dealt, crit, air: e.air, boss: !!e.boss });
  out.shieldBroke = false;
  if (out.killed) kill(sim, e, towerId);
  else if (e.boss) checkPhase(sim, e);
}

function stunOf(sim, e, base) {
  if (!base || e.part) return;
  R.applyStun(e.stun, base, !!e.boss);
}

function splash(sim, x, y, r, raw, dtype, air, towerId, extra) {
  const n = sim.hash.query(x, y, r, sim.scratch);
  for (let i = 0; i < n; i++) {
    const e = sim.scratch[i];
    if (!e.alive || (air !== null && e.air !== air)) continue;
    damage(sim, e, raw, dtype, towerId);
    if (extra) extra(e);
  }
}

// ----------------------------------------------------------------- towers --
export function towerCenter(type, tx, ty) {
  const n = TOWERS[type].size;
  return { x: (tx + n / 2) * TILE, y: (ty + n / 2) * TILE };
}

export function canPlace(sim, type, tx, ty) {
  const s = sim.state;
  if (!TOWERS[type]) return { ok: false, why: 'unknown' };
  if (!s.allowedTowers.includes(type)) return { ok: false, why: 'locked' };
  const n = TOWERS[type].size;
  for (let y = ty; y < ty + n; y++)
    for (let x = tx; x < tx + n; x++) {
      if (!sim.level.buildable(x, y)) return { ok: false, why: 'terrain' };
      for (const t of s.towers) {
        const m = TOWERS[t.type].size;
        if (x >= t.tx && x < t.tx + m && y >= t.ty && y < t.ty + m) return { ok: false, why: 'occupied' };
      }
    }
  if (type === 'depot' && !R.canBuildDepot(s.towers)) return { ok: false, why: 'depotLimit' };
  if (s.credits < towerStats(s, type, 't1').cost) return { ok: false, why: 'credits' };
  return { ok: true };
}

export function build(sim, type, tx, ty) {
  const c = canPlace(sim, type, tx, ty);
  if (!c.ok) return c;
  const s = sim.state;
  const cost = towerStats(s, type, 't1').cost;
  s.credits -= cost;
  const { x, y } = towerCenter(type, tx, ty);
  const t = { id: s.nextId++, type, tier: 't1', tx, ty, x, y, spent: cost, fired: false, cd: 0.2, target: 0, aim: Math.PI / 2, mode: 'first', kills: 0, placedWavesEnded: s.wavesEnded, salvo: 0, salvoT: 0, retarget: 0, spin: 0, idle: 0, dim: 0 };
  s.towers.push(t);
  s.stats.built++;
  if (type === 'depot') s.stats.maxDepots = Math.max(s.stats.maxDepots, s.towers.filter((q) => q.type === 'depot').length);
  ev(sim, { t: 'build', id: t.id, type, x, y });
  return { ok: true, id: t.id };
}

export function upgradeCost(tower, tier, s = null) {
  return towerStats(s, tower.type, tier).cost;
}

export function upgrade(sim, id, tier) {
  const s = sim.state;
  const t = s.towers.find((x) => x.id === id);
  if (!t) return { ok: false, why: 'missing' };
  const options = tierOptions(s, t);
  const want = tier || options[0];
  if (!options.includes(want)) return { ok: false, why: nextTiers(t.tier).includes(want) ? 'locked' : 'tier' };
  const cost = upgradeCost(t, want, s);
  if (s.credits < cost) return { ok: false, why: 'credits' };
  s.credits -= cost;
  t.spent += cost;
  t.tier = want;
  if (want === 't4a' || want === 't4b') s.stats.t4Built++;
  ev(sim, { t: 'upgrade', id, tier: want, x: t.x, y: t.y, type: t.type });
  return { ok: true };
}

export function sell(sim, id) {
  const s = sim.state;
  const i = s.towers.findIndex((x) => x.id === id);
  if (i < 0) return { ok: false };
  const t = s.towers[i];
  const v = R.sellValue(t, s.wavesEnded);
  s.credits += v;
  s.stats.sold++;
  s.towers.splice(i, 1);
  ev(sim, { t: 'sell', id, value: v, x: t.x, y: t.y, type: t.type });
  return { ok: true, value: v };
}

export function setTargeting(sim, id, mode) {
  const t = sim.state.towers.find((x) => x.id === id);
  if (!t || !TARGET_MODES.includes(mode)) return { ok: false };
  const st = TOWERS[t.type].tiers[t.tier];
  if (!st.rate) return { ok: false };
  if (mode === 'air' && !st.air) return { ok: false };
  t.mode = mode;
  t.target = 0;
  return { ok: true };
}

function canHit(st, e) {
  return e.air ? st.air : st.ground;
}

// Effective range: lights-out (Night Dreadnought) cuts it for a while.
export function towerRange(t, st) {
  return t.dim > 0 ? st.range * 0.8 : st.range;
}

function acquire(sim, t, st, range) {
  const n = sim.hash.query(t.x, t.y, range, sim.scratch);
  const min2 = (st.minRange || 0) ** 2;
  let best = null, score = -Infinity;
  for (let i = 0; i < n; i++) {
    const e = sim.scratch[i];
    if (!e.alive || !canHit(st, e)) continue;
    if (min2 && (e.x - t.x) ** 2 + (e.y - t.y) ** 2 < min2) continue;
    let sc;
    switch (t.mode) {
      case 'last': sc = -e.dist; break;
      case 'strongest': sc = e.hp + e.shield + e.bubble; break;
      case 'closest': sc = -((e.x - t.x) ** 2 + (e.y - t.y) ** 2); break;
      case 'air': sc = (e.air ? 1e6 : 0) + e.dist; break;
      default: sc = e.dist;
    }
    if (sc > score || (sc === score && best && e.id < best.id)) { score = sc; best = e; }
  }
  return best;
}

function inRange(t, e, r, minR = 0) {
  const d2 = (e.x - t.x) ** 2 + (e.y - t.y) ** 2;
  return d2 <= r * r && d2 >= minR * minR;
}

function updateTower(sim, t) {
  const s = sim.state;
  const st = towerStats(s, t.type, t.tier);
  if (t.dim > 0) t.dim = Math.max(0, t.dim - DT);
  if (!st.rate) return; // Supply Depot
  t.cd -= DT;
  const range = towerRange(t, st);
  // Pulse Dome: hits everything in range, no target needed.
  if (st.pulse) {
    if (t.cd > 0) return;
    const n = sim.hash.query(t.x, t.y, range, sim.scratch2);
    let any = false;
    for (let i = 0; i < n; i++) if (sim.scratch2[i].alive) { any = true; break; }
    if (!any) { t.cd = 0; return; }
    t.cd += 1 / (st.rate * rateMult(sim, t));
    t.fired = true;
    splash(sim, t.x, t.y, range, st.dmg, 'ion', null, t.id, (e) => stunOf(sim, e, st.stun));
    ev(sim, { t: 'pulse', tower: t.id, type: t.type, tier: t.tier, x: t.x, y: t.y, r: range });
    s.stats.shots++;
    return;
  }
  let target = sim.byId.get(t.target);
  if (--t.retarget <= 0 || !target || !target.alive || !inRange(t, target, range, st.minRange) || !canHit(st, target)) {
    target = acquire(sim, t, st, range);
    t.target = target ? target.id : 0;
    t.retarget = 8;
  }
  if (target) t.aim = Math.atan2(target.y - t.y, target.x - t.x);
  // Repeater spin: winds up while it has a target, winds down when idle.
  if (st.spin) {
    if (target) t.spin = Math.min(st.spin.time, t.spin + DT);
    else t.spin = Math.max(0, t.spin - DT * 1.5);
  }
  if (t.cd > 0 || !target) {
    if (t.cd < 0) t.cd = 0;
    return;
  }
  let rate = st.rate * rateMult(sim, t);
  if (st.spin) rate *= st.spin.min + (1 - st.spin.min) * (t.spin / st.spin.time);
  t.cd += 1 / rate;
  t.fired = true;
  if (st.proj === 'snipe') snipe(sim, t, st, target, range);
  else if (st.proj === 'arc') arc(sim, t, st, target);
  else {
    const shots = st.barrage ? st.barrage.count : st.salvo || 1;
    for (let k = 0; k < shots; k++) fire(sim, t, st, target, k, shots);
  }
  s.stats.shots++;
}

// Command Relay aura: strongest relay in range (non-stacking).
export function towerRateMult(sim, t) {
  return rateMult(sim, t);
}
function rateMult(sim, t) {
  const a = strongest(sim.auras.relay, t.x, t.y, t.id);
  return a ? 1 + a.v : 1;
}

// Sharpshooter: instant piercing shot (tracer only). Rail Marksman passes
// through every droid on the line, Armor Breaker cracks the target's armor.
function snipe(sim, t, st, target, range) {
  const s = sim.state;
  const a = Math.atan2(target.y - t.y, target.x - t.x);
  const hits = [target];
  if (st.pierce) {
    const ux = Math.cos(a), uy = Math.sin(a);
    const n = sim.hash.query(t.x + ux * range / 2, t.y + uy * range / 2, range / 2 + 16, sim.scratch2);
    const line = [];
    for (let i = 0; i < n; i++) {
      const e = sim.scratch2[i];
      if (!e.alive || e === target || !canHit(st, e)) continue;
      const along = (e.x - t.x) * ux + (e.y - t.y) * uy;
      const off = Math.abs((e.x - t.x) * uy - (e.y - t.y) * ux);
      if (along > 0 && along <= range && off <= st.pierce.width) line.push([along, e]);
    }
    line.sort((p, q) => p[0] - q[0] || p[1].id - q[1].id);
    for (const [, e] of line.slice(0, st.pierce.count - 1)) hits.push(e);
  }
  const end = st.pierce ? { x: t.x + Math.cos(a) * range, y: t.y + Math.sin(a) * range } : { x: target.x, y: target.y };
  ev(sim, { t: 'shot', tower: t.id, type: t.type, tier: t.tier, kind: 'snipe', x: t.x, y: t.y, tx: end.x, ty: end.y, aim: a, air: target.air });
  for (const e of hits) {
    if (st.armorBreak) R.applySlot(e.armorBreak, st.armorBreak.v, st.armorBreak.t);
    damage(sim, e, st.dmg, 'piercing', t.id);
  }
}

// Ion Arc: lightning chains to the nearest droid not yet hit.
function arc(sim, t, st, target) {
  const C = st.chain;
  const pts = [[t.x, t.y - 20]];
  const hit = new Set();
  let cur = target, dmg = st.dmg;
  for (let k = 0; k < C.count && cur; k++) {
    hit.add(cur.id);
    pts.push([cur.x, cur.y - (cur.air ? 44 : 10)]);
    stunOf(sim, cur, st.stun);
    damage(sim, cur, dmg, 'ion', t.id);
    dmg *= C.falloff;
    const n = sim.hash.query(cur.x, cur.y, C.range, sim.scratch2);
    let next = null, bd = Infinity;
    for (let i = 0; i < n; i++) {
      const e = sim.scratch2[i];
      if (!e.alive || hit.has(e.id) || !canHit(st, e)) continue;
      const d2 = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
      if (d2 < bd || (d2 === bd && next && e.id < next.id)) { bd = d2; next = e; }
    }
    cur = next;
  }
  ev(sim, { t: 'arc', tower: t.id, type: t.type, tier: t.tier, pts, x: t.x, y: t.y });
}

function fire(sim, t, st, target, k, shots) {
  const s = sim.state;
  const crit = st.crit ? rand(s.rng) < st.crit.chance : false;
  const dmg = st.dmg * (crit ? st.crit.mult : 1);
  const lob = st.proj === 'shell';
  // spread salvo launch angles a little (visual + missile arcs)
  const spread = shots > 1 && !lob ? (k - (shots - 1) / 2) * 0.35 : 0;
  const a = t.aim + spread;
  let tx = target.x, ty = target.y;
  if (lob) {
    // lead the target along its path a little; barrage shells scatter
    const lead = (Math.hypot(tx - t.x, ty - t.y) / st.projSpeed) * 0.6;
    tx += (target.x - target.px) * 60 * lead;
    ty += (target.y - target.py) * 60 * lead;
    if (st.barrage) {
      const ang = rand(s.rng) * Math.PI * 2, r = rand(s.rng) * st.barrage.spread;
      tx += Math.cos(ang) * r;
      ty += Math.sin(ang) * r * 0.8;
    }
  }
  const p = {
    id: s.nextId++, kind: st.proj, tower: t.id, target: target.id,
    x: t.x + Math.cos(a) * 12, y: t.y - 8 + Math.sin(a) * 12, px: 0, py: 0,
    tx, ty, vx: Math.cos(a), vy: Math.sin(a),
    speed: st.projSpeed, dmg, dtype: TOWERS[t.type].dtype, splash: st.splash || 0,
    air: target.air, crit, ttl: 6, bomb: st.bomblets ? 1 : 0, delay: k * (lob ? 0.18 : 0.12), d0: 1,
    stun: st.stun || 0, slow: st.slow ? 1 : 0, heavy: st.heavy ? 1 : 0,
  };
  p.d0 = Math.max(1, Math.hypot(tx - p.x, ty - p.y));
  p.px = p.x;
  p.py = p.y;
  s.projectiles.push(p);
  if (k === 0) ev(sim, { t: 'shot', tower: t.id, type: t.type, tier: t.tier, kind: st.proj, x: t.x, y: t.y, tx: target.x, ty: target.y, aim: t.aim, air: target.air });
}

// ------------------------------------------------------------ projectiles --
const NON_HOMING = { flak: 1, shell: 1 };
function updateProjectile(sim, p) {
  p.px = p.x;
  p.py = p.y;
  if (p.delay > 0) {
    p.delay -= DT;
    return true;
  }
  p.ttl -= DT;
  const tgt = sim.byId.get(p.target);
  if (tgt && tgt.alive && !NON_HOMING[p.kind]) {
    p.tx = tgt.x;
    p.ty = tgt.y;
  }
  const dx = p.tx - p.x, dy = p.ty - p.y;
  const dist = Math.hypot(dx, dy);
  if (p.kind === 'missile' && dist > 1) {
    // turn toward the target at a limited rate for a visible arc
    const want = Math.atan2(dy, dx);
    let cur = Math.atan2(p.vy, p.vx);
    let diff = want - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cur += Math.max(-6 * DT, Math.min(6 * DT, diff));
    p.vx = Math.cos(cur);
    p.vy = Math.sin(cur);
  } else if (dist > 0) {
    p.vx = dx / dist;
    p.vy = dy / dist;
  }
  const step = p.speed * DT;
  if (dist <= step + 1 || p.ttl <= 0) {
    p.x = p.tx;
    p.y = p.ty;
    impact(sim, p, tgt);
    return false;
  }
  p.x += p.vx * step;
  p.y += p.vy * step;
  return true;
}

function impact(sim, p, tgt) {
  const s = sim.state;
  if (p.splash > 0) {
    splash(sim, p.x, p.y, p.splash, p.dmg, p.dtype, p.air, p.tower);
    ev(sim, { t: 'explode', x: p.x, y: p.y, size: p.heavy ? 'l' : p.splash >= 48 ? 'm' : 's', kind: p.kind, air: p.air });
    if (p.bomb) {
      const st = TOWERS[sim.byId.get(p.tower)?.type || 'rocket'].tiers.t4b.bomblets;
      for (let i = 0; i < st.count; i++) {
        const a = rand(s.rng) * Math.PI * 2, r = rand(s.rng) * st.spread;
        const bx = p.x + Math.cos(a) * r, by = p.y + Math.sin(a) * r * 0.8;
        splash(sim, bx, by, st.splash, st.dmg, p.dtype, p.air, p.tower);
        ev(sim, { t: 'explode', x: bx, y: by, size: 's', kind: 'bomblet', air: p.air, delay: 0.08 * (i + 1) });
      }
    }
  } else if (tgt && tgt.alive) {
    if (p.stun) stunOf(sim, tgt, p.stun);
    if (p.slow) {
      const st = TOWERS[sim.byId.get(p.tower)?.type || 'repeater']?.tiers.t4b.slow;
      if (st) R.applySlot(tgt.slow, st.v, st.t);
    }
    damage(sim, tgt, p.dmg, p.dtype, p.tower, p.crit);
  } else {
    ev(sim, { t: 'fizzle', x: p.x, y: p.y, kind: p.kind });
  }
}

// ------------------------------------------------------------------- step --
export function step(sim) {
  const s = sim.state;
  if (s.phase !== 'running') return;
  s.tick++;
  s.time = s.tick * DT;

  if (s.countdown > 0) {
    s.countdown -= DT;
    if (s.countdown <= 0) launchWave(sim);
  }
  // spawns
  while (s.pending.length && s.pending[0].at <= s.time) spawnEnemy(sim, s.pending.shift());
  // wave finished spawning -> countdown to the next one
  const last = s.waveIndex - 1;
  if (last >= 0 && !s.waveSpawned[last] && !s.pending.some((p) => p.wave === last)) {
    s.waveSpawned[last] = true;
    if (s.waveIndex < s.totalWaves && s.countdown <= 0) {
      s.countdown = s.countdownTotal = ECONOMY.countdown;
      ev(sim, { t: 'countdown', seconds: ECONOMY.countdown });
    }
  }

  sim.byId.clear();
  for (const e of s.enemies) if (e.alive) sim.byId.set(e.id, e);
  collectAuras(sim);
  for (const e of s.enemies) if (e.alive) updateEnemy(sim, e);
  // weak points follow their parent
  for (const e of s.enemies) {
    if (!e.part || !e.alive) continue;
    const par = sim.byId.get(e.parent);
    if (!par || !par.alive) { e.alive = false; continue; }
    e.x = par.x + e.ox * par.face;
    e.y = par.y + e.oy;
    e.dist = par.dist + 0.5;
  }

  sim.hash.clear();
  sim.byId.clear();
  for (const e of s.enemies) if (e.alive) { sim.hash.insert(e); sim.byId.set(e.id, e); }
  for (const t of s.towers) sim.byId.set(t.id, t);

  for (const t of s.towers) updateTower(sim, t);

  let w = 0;
  const ps = s.projectiles;
  for (let i = 0; i < ps.length; i++) if (updateProjectile(sim, ps[i])) ps[w++] = ps[i];
  ps.length = w;

  // compact enemies in place
  let k = 0;
  const es = s.enemies;
  for (let i = 0; i < es.length; i++) if (es[i].alive) es[k++] = es[i];
  es.length = k;

  // wave end: all of a wave's droids spawned and resolved -> income
  for (let i = 0; i < s.waveIndex; i++) {
    if (!s.wavePaid[i] && s.waveSpawned[i] && s.waveLeft[i] <= 0) {
      s.wavePaid[i] = true;
      s.wavesEnded++;
      const planet = LEVELS[s.levelId].planet;
      const intr = R.interest(s.credits, planet);
      let depot = 0;
      for (const t of s.towers) depot += towerStats(s, t.type, t.tier).income || 0;
      s.credits += intr + depot;
      s.stats.creditsEarned += intr + depot;
      ev(sim, { t: 'waveEnd', n: i + 1, interest: intr, depot, income: intr + depot });
    }
  }

  if (s.sandbox) {
    s.credits = SANDBOX_CREDITS;
    return;
  }
  if (s.lives <= 0) {
    s.phase = 'lost';
    ev(sim, { t: 'defeat', wave: s.waveIndex });
  } else if (s.waveIndex >= s.totalWaves && s.pending.length === 0 && s.enemies.length === 0) {
    s.phase = 'won';
    ev(sim, { t: 'victory', lives: s.lives });
  }
}

// Convenience for tools/tests: run until the level ends or `maxTicks`.
export function runToEnd(sim, controller = null, maxTicks = 60 * 60 * 60) {
  if (sim.state.phase === 'setup') {
    if (controller) controller(sim);
    startWave(sim);
  }
  for (let i = 0; i < maxTicks && sim.state.phase === 'running'; i++) {
    if (controller && sim.state.tick % 15 === 0) controller(sim);
    step(sim);
    sim.events.length = 0;
  }
  return sim.state;
}

// Stable hash of the state for determinism tests.
export function stateHash(state) {
  const str = JSON.stringify(state);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}

// Direct damage entry point for tools and tests.
export function dealDamage(sim, e, raw, dtype) {
  damage(sim, e, raw, dtype, 0);
}

export { STATUS };
