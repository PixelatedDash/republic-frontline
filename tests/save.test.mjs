import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, mergeSaves, emptySave, SAVE_VERSION, starsFor } from '../src/save/schema.js';

test('migrations: v0 prototype save upgrades to current version', () => {
  const d = migrate({ stars: { 'kamino-1': 2 }, kills: 50, updatedAt: 5 });
  assert.equal(d.saveVersion, SAVE_VERSION);
  assert.equal(d.levels['kamino-1'].stars, 2);
  assert.equal(d.stats.kills.trooper, 50);
  assert.equal(d.settings.master, 0.8);
  assert.equal(d.updatedAt, 5);
});

test('migrations: v1 gains settings and inProgress.heroic', () => {
  const v1 = { ...emptySave(1), saveVersion: 1, inProgress: { levelId: 'kamino-1', updatedAt: 1, snapshot: {} } };
  delete v1.settings;
  const d = migrate(v1);
  assert.equal(d.saveVersion, SAVE_VERSION);
  assert.equal(d.inProgress.heroic, false);
  assert.equal(d.settings.showGrid, true);
});

test('migrations: refuses a save from a newer build', () => {
  assert.throws(() => migrate({ saveVersion: SAVE_VERSION + 1 }));
});

test('merge: max per field, never loses progress', () => {
  const a = emptySave(100);
  a.levels['kamino-1'] = { stars: 3, heroic: false, bestLives: 20, wins: 2 };
  a.stats.kills = { trooper: 500, rush: 10 };
  a.achievements.firstWin = 90;
  const b = emptySave(200);
  b.levels['kamino-1'] = { stars: 2, heroic: true, bestLives: 18, wins: 5 };
  b.levels['kamino-2'] = { stars: 1, heroic: false, bestLives: 4, wins: 1 };
  b.stats.kills = { trooper: 300, scuttler: 40 };
  b.unlocks.sandbox = true;
  b.settings.master = 0.2;
  const m = mergeSaves(a, b);
  assert.deepEqual(m.levels['kamino-1'], { stars: 3, heroic: true, bestLives: 20, wins: 5 });
  assert.equal(m.levels['kamino-2'].stars, 1);
  assert.deepEqual(m.stats.kills, { trooper: 500, rush: 10, scuttler: 40 });
  assert.equal(m.unlocks.sandbox, true);
  assert.equal(m.achievements.firstWin, 90);
  assert.equal(m.settings.master, 0.2, 'settings follow the newer doc');
  assert.equal(m.updatedAt, 200);
  // order does not matter for progress
  assert.deepEqual(mergeSaves(b, a).levels, m.levels);
});

test('merge: newer in-progress snapshot wins', () => {
  const a = emptySave(10);
  a.inProgress = { levelId: 'kamino-1', updatedAt: 50, snapshot: { wave: 4 } };
  const b = emptySave(20);
  b.inProgress = { levelId: 'kamino-1', updatedAt: 40, snapshot: { wave: 2 } };
  assert.equal(mergeSaves(a, b).inProgress.snapshot.wave, 4);
  b.inProgress.updatedAt = 60;
  assert.equal(mergeSaves(a, b).inProgress.snapshot.wave, 2);
  const c = emptySave(30);
  assert.equal(mergeSaves(a, c).inProgress.snapshot.wave, 4, 'missing snapshot never erases one');
});

test('stars: 3 no leaks, 2 if >= 50% lives, else 1', () => {
  assert.equal(starsFor(true, 20, 20, 0), 3);
  assert.equal(starsFor(true, 12, 20, 8), 2);
  assert.equal(starsFor(true, 9, 20, 11), 1);
  assert.equal(starsFor(false, 0, 20, 20), 0);
});
