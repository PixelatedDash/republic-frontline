// The game simulation. Pure logic: no DOM, no canvas, no Math.random.
// All mutable state lives in `sim.state` (plain JSON-serializable data, ids
// instead of references). Visual/audio layers read `sim.events`, which the
// caller clears after consuming. Fixed timestep: call step() at 60 Hz.

import { ENEMIES } from '../data/enemies.js';
import { TOWERS, nextTiers } from '../data/towers.js';
import { DIFFICULTY, ECONOMY, DT } from '../data/rules.js';
import { LEVELS, buildLevel, TILE } from '../data/levels/index.js';
import { seedState, rand } from '../engine/rng.js';
import { SpatialHash } from './spatial.js';
import * as R from './rules.js';

export const SAVE_SIM_VERSION = 1;
export const TARGET_MODES = ['first', 'last', 'strongest', 'closest', 'air'];

// ------------------------------------------------------------------ setup --
export function createSim({ levelId, difficulty = 'jedi', seed = 1, heroic = false, allowedTowers = null }) {
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
    stats: { kills: {}, killsTotal: 0, leaked: 0, creditsEarned: 0, built: 0, shots: 0, leakedTypes: {} },
  };
  return attach(state);
}

function attach(state) {
  const level = buildLevel(LEVELS[state.levelId]);
  return {
    state,
    level,
    events: [],
    emit: true,
    hash: new SpatialHash(level.w * TILE, level.h * TILE, 32),
    byId: new Map(),
    scratch: new Array(512),
    dmgOut: {},
  };
}

export function snapshot(sim) {
  return JSON.parse(JSON.stringify(sim.state));
}

export function restore(snap) {
  return attach(JSON.parse(JSON.stringify(snap)));
}

function ev(sim, e) {
  if (sim.emit) sim.events.push(e);
}

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

// ------------------------------------------------------------------ waves --
export function wavePreview(sim, index = sim.state.waveIndex) {
  const def = LEVELS[sim.state.levelId];
  const w = def.waves[index];
  if (!w) return null;
  const mult = DIFFICULTY[sim.state.heroic ? 'heroic' : sim.state.difficulty].count;
  const counts = {};
  for (const g of w.groups) counts[g.type] = (counts[g.type] || 0) + Math.ceil(g.count * mult);
  const types = Object.keys(counts);
  return {
    index,
    groups: types.map((t) => ({ type: t, count: counts[t] })),
    air: types.some((t) => ENEMIES[t].layer === 'air'),
    armor: types.some((t) => ENEMIES[t].body === 'armored'),
    shield: types.some((t) => ENEMIES[t].shield > 0),
  };
}

function launchWave(sim) {
  const s = sim.state;
  const def = LEVELS[s.levelId];
  const w = s.waveIndex;
  const wave = def.waves[w];
  const mult = DIFFICULTY[s.heroic ? 'heroic' : s.difficulty].count;
  let total = 0;
  const list = [];
  wave.groups.forEach((g, gi) => {
    const n = Math.ceil(g.count * mult);
    const gap = g.gap * (g.count / n); // keep group duration when counts grow
    for (let i = 0; i < n; i++) list.push({ at: s.time + (g.delay || 0) + i * gap, type: g.type, path: g.path || 0, lane: g.lane ?? 0, wave: w, o: gi * 1000 + i });
    total += n;
  });
  list.sort((a, b) => a.at - b.at || a.o - b.o);
  for (const p of list) s.pending.push(p);
  s.waveLeft[w] = total;
  s.waveSpawned[w] = false;
  s.wavePaid[w] = false;
  s.waveIndex++;
  s.countdown = 0;
  s.countdownTotal = 0;
  s.phase = 'running';
  ev(sim, { t: 'wave', n: w + 1, total: s.totalWaves, size: total });
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
  ev(sim, { t: 'earlyCall', bonus });
  launchWave(sim);
  return { ok: true, bonus };
}

// ---------------------------------------------------------------- enemies --
function spawnEnemy(sim, p) {
  const s = sim.state;
  const d = ENEMIES[p.type];
  const hpMult = DIFFICULTY[s.heroic ? 'heroic' : s.difficulty].hp;
  const air = d.layer === 'air';
  const path = air ? sim.level.lanes[p.lane] : sim.level.paths[p.path];
  pointOnPath(path, 0, P);
  const ofs = air ? 0 : (rand(s.rng) - 0.5) * 6;
  const e = {
    id: s.nextId++, type: p.type, wave: p.wave, air,
    body: d.body,
    hp: d.hp * hpMult, maxHp: d.hp * hpMult,
    shield: d.shield * hpMult, maxShield: d.shield * hpMult, shieldActive: true, shieldDelay: 0,
    speed: d.speed, route: air ? p.lane : p.path, dist: 0, ofs,
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
  s.enemies.push(e);
  ev(sim, { t: 'spawn', id: e.id, type: e.type, x: e.x, y: e.y });
}

function updateEnemy(sim, e) {
  const s = sim.state;
  const d = ENEMIES[e.type];
  e.px = e.x;
  e.py = e.y;
  if (e.flash > 0) e.flash--;
  R.tickStun(e.stun, DT);
  R.tickSlot(e.slow, DT);
  R.tickSlot(e.armorBreak, DT);
  if (e.shieldActive) R.tickShield(e, DT, d.shieldRegen || 0);
  let speed = d.speed;
  if (e.mode === 'roll') speed = d.roll.speed;
  else if (e.mode === 'deploy') {
    speed = 0;
    e.modeT -= DT;
    if (e.modeT <= 0) {
      e.mode = 'walk';
      e.shieldActive = true;
      ev(sim, { t: 'deploy', id: e.id, x: e.x, y: e.y });
    }
  }
  if (e.stun.t > 0) speed = 0;
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

function leak(sim, e) {
  const s = sim.state;
  e.alive = false;
  e.leaked = true;
  const d = ENEMIES[e.type];
  s.lives = Math.max(0, s.lives - d.lifeCost);
  s.stats.leaked += 1;
  s.stats.leakedTypes[e.type] = (s.stats.leakedTypes[e.type] || 0) + 1;
  s.waveLeft[e.wave]--;
  ev(sim, { t: 'leak', id: e.id, type: e.type, cost: d.lifeCost, lives: s.lives });
}

function kill(sim, e, towerId) {
  const s = sim.state;
  e.alive = false;
  const d = ENEMIES[e.type];
  s.credits += d.bounty;
  s.stats.creditsEarned += d.bounty;
  s.stats.kills[e.type] = (s.stats.kills[e.type] || 0) + 1;
  s.stats.killsTotal++;
  s.waveLeft[e.wave]--;
  const t = sim.byId.get(towerId);
  if (t && t.tier) t.kills++;
  ev(sim, { t: 'death', id: e.id, type: e.type, x: e.x, y: e.y, air: e.air, face: e.face, bounty: d.bounty });
}

// Deal damage to one enemy; handles flashes, deploy triggers and kills.
function damage(sim, e, raw, dtype, towerId, crit = false) {
  if (!e.alive) return;
  const out = R.applyDamage(e, raw, dtype, sim.dmgOut);
  e.flash = 2;
  if (e.mode === 'roll') beginDeploy(e, ENEMIES[e.type]);
  ev(sim, { t: 'hit', id: e.id, x: e.x, y: e.y, dtype, shield: out.shieldHit, armor: out.armorHit, broke: !!out.shieldBroke, dmg: out.dealt, crit, air: e.air });
  out.shieldBroke = false;
  if (out.killed) kill(sim, e, towerId);
}

function splash(sim, x, y, r, raw, dtype, air, towerId) {
  const n = sim.hash.query(x, y, r, sim.scratch);
  for (let i = 0; i < n; i++) {
    const e = sim.scratch[i];
    if (e.alive && e.air === air) damage(sim, e, raw, dtype, towerId);
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
  if (s.credits < TOWERS[type].tiers.t1.cost) return { ok: false, why: 'credits' };
  return { ok: true };
}

export function build(sim, type, tx, ty) {
  const c = canPlace(sim, type, tx, ty);
  if (!c.ok) return c;
  const s = sim.state;
  const cost = TOWERS[type].tiers.t1.cost;
  s.credits -= cost;
  const { x, y } = towerCenter(type, tx, ty);
  const t = { id: s.nextId++, type, tier: 't1', tx, ty, x, y, spent: cost, fired: false, cd: 0.2, target: 0, aim: Math.PI / 2, mode: 'first', kills: 0, placedWavesEnded: s.wavesEnded, salvo: 0, salvoT: 0, retarget: 0 };
  s.towers.push(t);
  s.stats.built++;
  ev(sim, { t: 'build', id: t.id, type, x, y });
  return { ok: true, id: t.id };
}

export function upgradeCost(tower, tier) {
  return TOWERS[tower.type].tiers[tier].cost;
}

export function upgrade(sim, id, tier) {
  const s = sim.state;
  const t = s.towers.find((x) => x.id === id);
  if (!t) return { ok: false, why: 'missing' };
  const options = nextTiers(t.tier);
  const want = tier || options[0];
  if (!options.includes(want)) return { ok: false, why: 'tier' };
  const cost = upgradeCost(t, want);
  if (s.credits < cost) return { ok: false, why: 'credits' };
  s.credits -= cost;
  t.spent += cost;
  t.tier = want;
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
  s.towers.splice(i, 1);
  ev(sim, { t: 'sell', id, value: v, x: t.x, y: t.y, type: t.type });
  return { ok: true, value: v };
}

export function setTargeting(sim, id, mode) {
  const t = sim.state.towers.find((x) => x.id === id);
  if (!t || !TARGET_MODES.includes(mode)) return { ok: false };
  const st = TOWERS[t.type].tiers[t.tier];
  if (mode === 'air' && !st.air) return { ok: false };
  t.mode = mode;
  t.target = 0;
  return { ok: true };
}

function canHit(st, e) {
  return e.air ? st.air : st.ground;
}

function acquire(sim, t, st) {
  const n = sim.hash.query(t.x, t.y, st.range, sim.scratch);
  let best = null, score = -Infinity;
  for (let i = 0; i < n; i++) {
    const e = sim.scratch[i];
    if (!e.alive || !canHit(st, e)) continue;
    let sc;
    switch (t.mode) {
      case 'last': sc = -e.dist; break;
      case 'strongest': sc = e.hp + e.shield; break;
      case 'closest': sc = -((e.x - t.x) ** 2 + (e.y - t.y) ** 2); break;
      case 'air': sc = (e.air ? 1e6 : 0) + e.dist; break;
      default: sc = e.dist;
    }
    if (sc > score || (sc === score && best && e.id < best.id)) { score = sc; best = e; }
  }
  return best;
}

function inRange(t, e, r) {
  return (e.x - t.x) ** 2 + (e.y - t.y) ** 2 <= r * r;
}

function updateTower(sim, t) {
  const s = sim.state;
  const st = TOWERS[t.type].tiers[t.tier];
  t.cd -= DT;
  let target = sim.byId.get(t.target);
  if (--t.retarget <= 0 || !target || !target.alive || !inRange(t, target, st.range) || !canHit(st, target)) {
    target = acquire(sim, t, st);
    t.target = target ? target.id : 0;
    t.retarget = 8;
  }
  if (target) t.aim = Math.atan2(target.y - t.y, target.x - t.x);
  if (t.cd > 0 || !target) {
    if (t.cd < 0) t.cd = 0;
    return;
  }
  t.cd += 1 / st.rate;
  t.fired = true;
  const shots = st.salvo || 1;
  for (let k = 0; k < shots; k++) fire(sim, t, st, target, k, shots);
  s.stats.shots++;
}

function fire(sim, t, st, target, k, shots) {
  const s = sim.state;
  const crit = st.crit ? rand(s.rng) < st.crit.chance : false;
  const dmg = st.dmg * (crit ? st.crit.mult : 1);
  // spread salvo launch angles a little (visual + missile arcs)
  const spread = shots > 1 ? (k - (shots - 1) / 2) * 0.35 : 0;
  const a = t.aim + spread;
  const p = {
    id: s.nextId++, kind: st.proj, tower: t.id, target: target.id,
    x: t.x + Math.cos(a) * 6, y: t.y - 4 + Math.sin(a) * 6, px: 0, py: 0,
    tx: target.x, ty: target.y, vx: Math.cos(a), vy: Math.sin(a),
    speed: st.projSpeed, dmg, dtype: TOWERS[t.type].dtype, splash: st.splash || 0,
    air: target.air, crit, ttl: 4, bomb: st.bomblets ? 1 : 0, delay: k * 0.12, d0: 1,
  };
  p.d0 = Math.max(1, Math.hypot(target.x - p.x, target.y - p.y));
  p.px = p.x;
  p.py = p.y;
  s.projectiles.push(p);
  if (k === 0) ev(sim, { t: 'shot', tower: t.id, type: t.type, tier: t.tier, kind: st.proj, x: t.x, y: t.y, tx: target.x, ty: target.y, aim: t.aim, air: target.air });
}

// ------------------------------------------------------------ projectiles --
function updateProjectile(sim, p) {
  p.px = p.x;
  p.py = p.y;
  if (p.delay > 0) {
    p.delay -= DT;
    return true;
  }
  p.ttl -= DT;
  const tgt = sim.byId.get(p.target);
  const homing = p.kind !== 'flak';
  if (tgt && tgt.alive && homing) {
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
    ev(sim, { t: 'explode', x: p.x, y: p.y, size: p.splash >= 24 ? 'm' : 's', kind: p.kind, air: p.air });
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

  for (const e of s.enemies) if (e.alive) updateEnemy(sim, e);

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
      s.credits += intr;
      s.stats.creditsEarned += intr;
      ev(sim, { t: 'waveEnd', n: i + 1, interest: intr, income: intr });
    }
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
export function runToEnd(sim, controller = null, maxTicks = 60 * 60 * 40) {
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
