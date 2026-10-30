import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, step, build, upgrade, towerStats, tierOptions, sandboxSpawn, snapshot, restore } from '../src/sim/sim.js';
import { emptySave, migrate, mergeSaves } from '../src/save/schema.js';
import { TECH, TECH_TOTAL, MAX_STARS, simTech, starsEarned, starsSpent, canBuy, refund, ACHIEVEMENTS, awardAchievements, HEROIC_TOWERS, ARCHIVE } from '../src/data/meta.js';
import { LEVELS, LEVEL_ORDER } from '../src/data/levels/index.js';
import { TOWERS } from '../src/data/towers.js';
import { ENEMIES } from '../src/data/enemies.js';
import { MEDAL_GLYPHS } from '../src/art/medals.js';

test('stars: 20 levels x (3 + 1 Heroic) = 80', () => {
  assert.equal(MAX_STARS, 80);
  const s = emptySave();
  for (const id of LEVEL_ORDER) s.levels[id] = { stars: 3, heroic: true, bestLives: 1, wins: 1, master: false };
  assert.equal(starsEarned(s), 80);
});

test('tech tree: 8 branches, about 70 stars, tier-4 nodes affordable from one planet', () => {
  assert.equal(TECH.length, 32);
  assert.ok(TECH_TOTAL >= 66 && TECH_TOTAL <= 74, `total ${TECH_TOTAL}`);
  for (const type of Object.keys(TOWERS)) {
    const t4 = TECH.filter((n) => n.tower === type && n.branch).reduce((a, n) => a + n.cost, 0);
    assert.ok(t4 <= 12, `${type} tier-4 nodes cost ${t4} (one planet = 12 stars)`);
  }
});

test('tech tree: buy needs stars and prerequisites; refund cascades', () => {
  const s = emptySave();
  assert.equal(canBuy(s, 'rifle.a'), false, 'no stars yet');
  s.levels['kamino-1'] = { stars: 3, heroic: false, bestLives: 20, wins: 1, master: false };
  assert.equal(canBuy(s, 'rifle.b'), false, 'needs rifle.a first');
  assert.equal(canBuy(s, 'rifle.a'), true);
  s.tech['rifle.a'] = true;
  assert.equal(canBuy(s, 'rifle.b'), true);
  s.tech['rifle.b'] = true;
  assert.equal(starsSpent(s), 3);
  assert.equal(canBuy(s, 'rifle.t4a'), false, '0 stars left');
  assert.deepEqual(refund(s, 'rifle.a'), {}, 'refunding a node refunds its dependents');
});

test('tech in the sim: stat mods and locked tier-4 branches', () => {
  const s = emptySave();
  s.tech = { 'rifle.a': true, 'rifle.b': true, 'rocket.t4a': true };
  const sim = createSim({ levelId: 'kamino-1', tech: simTech(s) });
  assert.equal(towerStats(sim.state, 'rifle', 't1').cost, Math.round(TOWERS.rifle.tiers.t1.cost * 0.9));
  assert.ok(Math.abs(towerStats(sim.state, 'rifle', 't1').dmg - TOWERS.rifle.tiers.t1.dmg * 1.15) < 1e-9);
  assert.equal(TOWERS.rifle.tiers.t1.cost, 100, 'data untouched');
  sim.state.credits = 99999;
  const r = build(sim, 'rocket', 2, 6);
  assert.ok(r.ok);
  const t = sim.state.towers[0];
  upgrade(sim, t.id); upgrade(sim, t.id);
  assert.deepEqual(tierOptions(sim.state, t), ['t4a']);
  assert.equal(upgrade(sim, t.id, 't4b').why, 'locked');
  assert.ok(upgrade(sim, t.id, 't4a').ok);
  assert.equal(sim.state.stats.t4Built, 1);
  // no tech = everything open (bots, tests)
  const open = createSim({ levelId: 'kamino-1' });
  assert.deepEqual(tierOptions(open.state, { type: 'rocket', tier: 't3' }), ['t4a', 't4b']);
  // the tech block survives snapshot/restore
  assert.deepEqual(restore(snapshot(sim)).state.tech, sim.state.tech);
});

test('sandbox: no waves, unlimited credits, spawner, invincible base', () => {
  const sim = createSim({ levelId: 'geonosis-2', sandbox: true });
  assert.equal(sim.state.phase, 'running');
  assert.ok(sandboxSpawn(sim, 'rush', 10).ok);
  assert.ok(sandboxSpawn(sim, 'dreadnought', 5).count === 1, 'bosses spawn alone');
  sim.state.sandbox.invincible = true;
  build(sim, 'rocket', 10, 12);
  for (let i = 0; i < 60 * 60; i++) { step(sim); sim.events.length = 0; }
  assert.equal(sim.state.phase, 'running', 'never ends');
  assert.equal(sim.state.lives, sim.state.maxLives, 'invincible');
  assert.equal(sim.state.credits, 99999);
  assert.equal(sandboxSpawn(createSim({ levelId: 'kamino-1' }), 'rush', 1).ok, false, 'only in sandbox');
});

test('save v2 -> v3 adds the tech tree and master flags; merge keeps the newer tech', () => {
  const v2 = { ...emptySave(5), saveVersion: 2, levels: { 'kamino-1': { stars: 2, heroic: false, bestLives: 9, wins: 1 } } };
  delete v2.tech;
  const d = migrate(v2);
  assert.deepEqual(d.tech, {});
  assert.equal(d.levels['kamino-1'].master, false);
  const a = emptySave(100); a.tech = { 'rifle.a': true, 'flak.a': true };
  const b = emptySave(200); b.tech = { 'rifle.a': true };
  a.levels['kamino-1'] = { stars: 3, heroic: false, bestLives: 20, wins: 2, master: true };
  assert.deepEqual(mergeSaves(a, b).tech, { 'rifle.a': true }, 'newer tech wins (refunds are not undone)');
  assert.equal(mergeSaves(a, b).levels['kamino-1'].master, true);
});

test('achievements: 25-30, each with its own medal glyph; awarding is once', () => {
  assert.ok(ACHIEVEMENTS.length >= 25 && ACHIEVEMENTS.length <= 30);
  for (const a of ACHIEVEMENTS) assert.ok(MEDAL_GLYPHS[a.id], a.id);
  const s = emptySave();
  s.levels['kamino-1'] = { stars: 3, heroic: false, bestLives: 20, wins: 1, master: false };
  const got = awardAchievements(s, { won: true, levelId: 'kamino-1', built: 3, sold: 0, earlyCalls: 0, maxDepots: 0, t4Built: 0, ventsDown: 0 }, 7);
  assert.ok(got.includes('first') && got.includes('flawless') && got.includes('three-towers'));
  assert.deepEqual(awardAchievements(s, null, 8), []);
  assert.equal(s.achievements.first, 7);
});

test('heroic sets: 4 (or fewer) towers from those unlocked at that level; archive covers everything', () => {
  for (const id of LEVEL_ORDER) {
    const set = HEROIC_TOWERS[id];
    assert.ok(set && set.length <= 4 && set.every((t) => LEVELS[id].towers.includes(t)), id);
    assert.ok(set.some((t) => TOWERS[t].tiers.t1.air), `${id} can hit air`);
  }
  assert.equal(ARCHIVE.length, Object.keys(TOWERS).length + Object.keys(ENEMIES).length);
});
