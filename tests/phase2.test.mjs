import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, step, build, upgrade, dealDamage, towerRateMult, startWave } from '../src/sim/sim.js';
import { applyDamage, applySlot, leakCost, newSlot } from '../src/sim/rules.js';
import { DIFFICULTY, ECONOMY } from '../src/data/rules.js';
import { ENEMIES } from '../src/data/enemies.js';
import { LEVELS, LEVEL_ORDER, buildLevel } from '../src/data/levels/index.js';
import { TOWERS } from '../src/data/towers.js';

// A running sim with an open-ended wave 0 that tests add droids to.
function arena(levelId = 'geonosis-1') {
  const sim = createSim({ levelId });
  const s = sim.state;
  Object.assign(s, { phase: 'running', waveIndex: 1, totalWaves: 99 });
  s.waveLeft[0] = 0; s.waveSpawned[0] = true; s.wavePaid[0] = false;
  return sim;
}
function spawn(sim, type, path = 0) {
  const s = sim.state;
  s.pending.push({ at: s.time, type, path, lane: 0, wave: 0, o: s.pending.length });
  s.waveLeft[0]++;
  step(sim);
  sim.events.length = 0;
  return s.enemies.filter((e) => e.type === type).at(-1);
}
const ticks = (sim, n) => { for (let i = 0; i < n; i++) { step(sim); sim.events.length = 0; } };

test('bubble pool absorbs first (shield column), then the body', () => {
  const e = { bubble: 30, shield: 0, hp: 40, body: 'unarmored' };
  applyDamage(e, 100, 'blaster');
  assert.equal(e.bubble, 0);
  assert.equal(e.hp, 0); // 60 raw went into the 30-point bubble at 50%, 40 raw killed the body
});

test("Reaper shell: blaster/ion bounce off, explosive/piercing don't", () => {
  const mk = () => ({ shield: 0, hp: 1000, body: 'shell' });
  const a = mk(); applyDamage(a, 100, 'blaster'); assert.equal(1000 - a.hp, 20);
  const b = mk(); applyDamage(b, 100, 'ion'); assert.equal(1000 - b.hp, 20);
  const c = mk(); applyDamage(c, 100, 'explosive'); assert.equal(1000 - c.hp, 150);
  const d = mk(); applyDamage(d, 100, 'piercing'); assert.equal(1000 - d.hp, 175);
});

test('armor break raises the armored multiplier for every damage type', () => {
  const e = { shield: 0, hp: 100, body: 'armored', armorBreak: newSlot() };
  applySlot(e.armorBreak, 1.25, 4);
  applyDamage(e, 40, 'blaster');
  assert.equal(100 - e.hp, 50);
});

test('boss leaks follow the difficulty table', () => {
  assert.equal(leakCost(ENEMIES.foundry, DIFFICULTY.jedi), 15);
  assert.equal(leakCost(ENEMIES.foundry, DIFFICULTY.padawan), 10);
  assert.equal(leakCost(ENEMIES.foundry, DIFFICULTY.master), Infinity);
  assert.equal(leakCost(ENEMIES.tank, DIFFICULTY.jedi), 3);
  assert.equal(leakCost(ENEMIES.siege, DIFFICULTY.jedi), 5);
});

test('shield walker projects a bubble onto nearby allies, not itself', () => {
  const sim = arena();
  const w = spawn(sim, 'shieldwalker');
  const t = spawn(sim, 'trooper');
  ticks(sim, 60); // the trooper walks faster; check while it is still in range
  assert.ok(t.bubble > 0 && t.bubble <= t.bubbleMax);
  assert.equal(w.bubbleMax, 0);
});

test('tactical aura speeds up allies by 20% (non-stacking)', () => {
  const sim = arena();
  const a = spawn(sim, 'trooper');
  const sim2 = arena();
  spawn(sim2, 'tactical'); spawn(sim2, 'tactical');
  const b = spawn(sim2, 'trooper');
  ticks(sim, 60); ticks(sim2, 60);
  const ratio = (b.dist - 0) / (a.dist - 0);
  assert.ok(ratio > 1.15 && ratio < 1.25, `ratio ${ratio}`);
});

test('repair drones heal nearby droids', () => {
  const sim = arena('kashyyyk-1');
  const d = spawn(sim, 'repair');
  const t = spawn(sim, 'trooper');
  t.hp = t.maxHp / 2;
  t.x = d.x; t.y = d.y; // keep it under the drone for the check
  const before = t.hp;
  step(sim);
  assert.ok(t.hp > before);
});

test('carrier splits into 6 scuttlers that belong to its wave', () => {
  const sim = arena('kashyyyk-1');
  const c = spawn(sim, 'carrier');
  const left = sim.state.waveLeft[0];
  dealDamage(sim, c, 1e6, 'explosive');
  assert.equal(sim.state.enemies.filter((e) => e.type === 'scuttler' && e.alive).length, 6);
  assert.equal(sim.state.waveLeft[0], left - 1 + 6);
});

test('bomber troopers never land right at the exit', () => {
  const sim = arena('geonosis-3');
  const b = spawn(sim, 'bomber');
  const end = sim.level.paths[0].pts.at(-1);
  b.x = end[0]; b.y = end[1];
  dealDamage(sim, b, 1e6, 'explosive');
  const tr = sim.state.enemies.filter((e) => e.type === 'trooper');
  assert.equal(tr.length, 3);
  for (const t of tr) assert.ok(t.dist <= sim.level.paths[t.route].len * 0.66);
});

test('Timber Reaper raises its shell below 60% HP', () => {
  const sim = arena('kashyyyk-4');
  const r = spawn(sim, 'reaper');
  assert.equal(r.body, 'unarmored');
  dealDamage(sim, r, r.maxHp * 0.45, 'piercing');
  assert.equal(r.body, 'shell');
  assert.equal(r.phase, 1);
});

test('Warlord Engine: shields at 66%, enrage at 33%', () => {
  const sim = arena('mustafar-4');
  const w = spawn(sim, 'warlord');
  dealDamage(sim, w, w.maxHp * 0.36 / 1.5, 'explosive'); // explosive does 150% to armor
  assert.equal(w.phase, 1);
  assert.ok(w.maxShield > 0 && w.shield > 0);
  w.shield = 0;
  w.hp = w.maxHp * 0.3;
  dealDamage(sim, w, 1, 'explosive');
  assert.equal(w.phase, 2);
  assert.equal(w.body, 'unarmored');
  assert.equal(w.speedMult, 1.5);
});

test('Foundry vents are weak points; each lost vent slows production', () => {
  const sim = arena('geonosis-4');
  const f = spawn(sim, 'foundry');
  const vents = sim.state.enemies.filter((e) => e.part && e.parent === f.id);
  assert.equal(vents.length, 3);
  dealDamage(sim, vents[0], 1e6, 'blaster');
  step(sim);
  assert.equal(f.ventsAlive, 2);
  f.timers.spawn = 0;
  step(sim);
  assert.ok(Math.abs(f.timers.spawn - ENEMIES.foundry.spawner.every * (1 + ENEMIES.foundry.spawner.slowPerVent)) < 0.1);
});

test('Tidebreaker stays put while it rises from the sea', () => {
  const sim = arena('kamino-4');
  const t = spawn(sim, 'tidebreaker');
  ticks(sim, 60 * 2);
  assert.equal(t.mode, 'emerge');
  assert.ok(t.dist < 1);
  ticks(sim, 60);
  assert.equal(t.mode, 'walk');
});

test('command relays do not stack (strongest only)', () => {
  const sim = arena('geonosis-2');
  sim.state.credits = 1e6;
  const spots = [];
  for (let ty = 0; ty < sim.level.h - 1 && spots.length < 3; ty++)
    for (let tx = 0; tx < sim.level.w - 1 && spots.length < 3; tx++) if (build(sim, 'depot', tx, ty).ok) spots.push([tx, ty]);
  const depots = sim.state.towers.filter((t) => t.type === 'depot');
  for (const d of depots.slice(0, 2)) for (const tier of ['t2', 't3', 't4b']) upgrade(sim, d.id, tier);
  // a rifle squad next to the two relays
  let rifle = null;
  for (let ty = 0; ty < 6 && !rifle; ty++) for (let tx = 0; tx < 8 && !rifle; tx++) if (build(sim, 'rocket', tx, ty).ok) rifle = sim.state.towers.at(-1);
  step(sim);
  const m = towerRateMult(sim, rifle);
  assert.ok(m === 1 || Math.abs(m - 1.15) < 1e-9, `mult ${m}`);
});

test('depot income is paid at wave end, max 3 depots', () => {
  const sim = createSim({ levelId: 'geonosis-2' });
  const s = sim.state;
  s.credits = 1000;
  let n = 0;
  for (let ty = 0; ty < sim.level.h - 1; ty++) for (let tx = 0; tx < sim.level.w - 1; tx++) if (build(sim, 'depot', tx, ty).ok) n++;
  assert.equal(n, ECONOMY.depotMax);
  const before = s.credits;
  startWave(sim);
  const kill = () => { for (const e of s.enemies) if (e.alive) dealDamage(sim, e, 1e6, 'piercing'); };
  for (let i = 0; i < 60 * 60 && s.wavesEnded === 0; i++) { kill(); step(sim); sim.events.length = 0; }
  assert.equal(s.wavesEnded, 1);
  const bounty = s.stats.creditsEarned - 3 * TOWERS.depot.tiers.t1.income;
  assert.ok(s.credits - before >= 3 * TOWERS.depot.tiers.t1.income);
  assert.ok(bounty >= 0);
});

test('every level builds, has 12-25 waves, and at least 4 have several entries', () => {
  let multi = 0;
  assert.equal(LEVEL_ORDER.length, 20);
  for (const id of LEVEL_ORDER) {
    const def = LEVELS[id];
    const lv = buildLevel(def);
    assert.ok(def.waves.length >= 12 && def.waves.length <= 25, `${id}: ${def.waves.length} waves`);
    if (lv.paths.length > 1) multi++;
    if (def.index === 4) assert.ok(def.waves.at(-1).groups.some((g) => ENEMIES[g.type].boss), `${id} boss wave`);
  }
  assert.ok(multi >= 4);
});

test('all 8 towers are unlocked by Geonosis 4', () => {
  assert.equal(LEVELS['geonosis-4'].towers.length, 8);
});

test('Phase 1 (v1) mid-level snapshots restore with sane Phase 2 fields', async () => {
  const { restore, snapshot } = await import('../src/sim/sim.js');
  const sim = arena('kamino-1');
  const e = spawn(sim, 'shield');
  const snap = snapshot(sim);
  snap.v = 1;
  for (const x of snap.enemies) { delete x.regen; delete x.bubble; delete x.bubbleMax; delete x.speedMult; }
  for (const t of snap.towers) { delete t.dim; delete t.spin; }
  const r = restore(snap);
  for (let i = 0; i < 300; i++) { step(r); r.events.length = 0; }
  for (const x of r.state.enemies) assert.ok(Number.isFinite(x.shield) && Number.isFinite(x.hp));
  assert.equal(r.state.v, 3);
  assert.equal(r.state.tech, null);
  assert.equal(r.state.stats.sold, 0);
  assert.ok(e);
});
