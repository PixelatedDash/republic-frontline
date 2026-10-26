import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, step, startWave, build, upgrade, sell, setTargeting, snapshot, restore, stateHash, runToEnd, canPlace, wavePreview } from '../src/sim/sim.js';
import { makeBot } from '../tools/sim/bots.mjs';
import { ECONOMY } from '../src/data/rules.js';
import { earlyCallBonus } from '../src/sim/rules.js';

const ticks = (sim, n) => { for (let i = 0; i < n; i++) { step(sim); sim.events.length = 0; } };

test('deterministic replay: same seed + same actions = same result', () => {
  const a = runToEnd(createSim({ levelId: 'kamino-1', seed: 7 }), makeBot('balanced'));
  const b = runToEnd(createSim({ levelId: 'kamino-1', seed: 7 }), makeBot('balanced'));
  assert.equal(stateHash(a), stateHash(b));
  assert.ok(a.tick > 1000);
});

test('snapshot/restore mid-level continues identically (incl. RNG state)', () => {
  const bot = makeBot('balanced');
  const full = createSim({ levelId: 'kamino-1', seed: 3 });
  const part = createSim({ levelId: 'kamino-1', seed: 3 });
  bot(full); startWave(full);
  bot(part); startWave(part);
  const drive = (sim, n) => { for (let i = 0; i < n && sim.state.phase === 'running'; i++) { if (sim.state.tick % 15 === 0) bot(sim); step(sim); sim.events.length = 0; } };
  drive(full, 6000);
  drive(part, 3000);
  const resumed = restore(JSON.parse(JSON.stringify(snapshot(part))));
  drive(resumed, 3000);
  assert.equal(stateHash(resumed.state), stateHash(full.state));
});

test('placement: only on free buildable ground; credits are spent', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  assert.equal(canPlace(sim, 'rocket', 0, 0).why, 'terrain'); // water
  assert.equal(canPlace(sim, 'rocket', 34, 5).why, 'terrain'); // walkway
  const r = build(sim, 'rocket', 32, 6);
  assert.ok(r.ok);
  assert.equal(sim.state.credits, 300 - 160);
  assert.equal(canPlace(sim, 'rifle', 31, 5).why, 'occupied');
});

test('sell: full refund before firing, 70% after', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  const { id } = build(sim, 'rifle', 31, 5);
  assert.equal(sell(sim, id).value, 100);
  const b = build(sim, 'rifle', 35, 5);
  upgrade(sim, b.id);
  startWave(sim);
  ticks(sim, 60 * 40);
  const t = sim.state.towers.find((x) => x.id === b.id);
  assert.ok(t.fired, 'tower should have fired');
  assert.equal(sell(sim, b.id).value, Math.floor(190 * 0.7));
});

test('tier-4 branch is chosen once and locked', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  sim.state.credits = 5000;
  const { id } = build(sim, 'rocket', 32, 6);
  assert.ok(upgrade(sim, id).ok);
  assert.ok(upgrade(sim, id).ok);
  assert.equal(upgrade(sim, id, 't2').ok, false);
  assert.ok(upgrade(sim, id, 't4b').ok);
  assert.equal(upgrade(sim, id, 't4a').ok, false);
  assert.equal(sim.state.towers[0].tier, 't4b');
});

test('targeting modes; air priority only on towers that hit air', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  const r = build(sim, 'rocket', 32, 6);
  assert.equal(setTargeting(sim, r.id, 'strongest').ok, true);
  assert.equal(setTargeting(sim, r.id, 'air').ok, false);
  const f = build(sim, 'rifle', 35, 5);
  assert.equal(setTargeting(sim, f.id, 'air').ok, true);
});

test('countdown starts when a wave finishes spawning, even with droids alive', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  startWave(sim);
  ticks(sim, 60 * 9); // wave 1: 6 troopers, 1.4 s apart -> done spawning at 7 s
  assert.ok(sim.state.enemies.length > 0, 'droids still on the field');
  assert.ok(sim.state.countdown > 0 && sim.state.countdown <= ECONOMY.countdown);
});

test('calling early pays a bonus proportional to the time left', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  startWave(sim);
  ticks(sim, 60 * 9);
  const before = sim.state.credits;
  const left = sim.state.countdown;
  const r = startWave(sim);
  assert.ok(r.ok);
  assert.equal(sim.state.waveIndex, 2);
  assert.equal(r.bonus, earlyCallBonus(left, ECONOMY.countdown, 1, 12));
  assert.ok(r.bonus > 0);
  assert.equal(sim.state.credits, before + r.bonus);
});

test('leaks cost lifeCost; interest paid at wave end', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  startWave(sim);
  let leaks = 0, interest = null;
  for (let i = 0; i < 60 * 120 && interest === null; i++) {
    step(sim);
    for (const e of sim.events) {
      if (e.t === 'leak') leaks++;
      if (e.t === 'waveEnd') interest = e.interest;
    }
    sim.events.length = 0;
  }
  assert.equal(leaks, 6);
  assert.equal(sim.state.lives, 14);
  assert.equal(interest, Math.min(60, Math.floor(300 * 0.05)));
});

test('shield droid rolls with shields down, deploys after damage', () => {
  const sim = createSim({ levelId: 'kamino-1' });
  sim.state.waveIndex = 4; // wave 5 has shield droids
  startWave(sim);
  sim.state.phase = 'running';
  // force a launch of wave 5
  sim.state.countdown = 0;
  ticks(sim, 2);
  const e = sim.state.enemies.find((x) => x.type === 'shield');
  assert.ok(e);
  assert.equal(e.mode, 'roll');
  assert.equal(e.shieldActive, false);
  ticks(sim, 60 * 3);
  assert.notEqual(e.mode, 'roll');
});

test('wave preview reports counts and threat flags (Jedi Master +20%)', () => {
  const j = wavePreview(createSim({ levelId: 'kamino-1' }), 5);
  assert.equal(j.air, true);
  assert.deepEqual(j.groups.find((g) => g.type === 'trooper'), { type: 'trooper', count: 8 });
  const m = wavePreview(createSim({ levelId: 'kamino-1', difficulty: 'master' }), 5);
  assert.equal(m.groups.find((g) => g.type === 'trooper').count, 10);
});
