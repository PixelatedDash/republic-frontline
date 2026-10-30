// Spec §21 checks that are cheap to run in Node.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSim, step, build, upgrade, sandboxSpawn, canPlace, towerCenter } from '../src/sim/sim.js';
import { TOWERS, nextTiers } from '../src/data/towers.js';

const PATHS = (t) => [['t1'], ['t1', 't2'], ['t1', 't2', 't3'], ['t1', 't2', 't3', 't4a'], ['t1', 't2', 't3', 't4b']][t];

// A free tile whose tower centre is within `r` px of the first path's start.
function spotNear(sim, type, r) {
  const p = sim.level.paths[0].pts;
  const [px, py] = p[1];
  for (let ty = 0; ty < sim.level.h; ty++)
    for (let tx = 0; tx < sim.level.w; tx++) {
      if (!canPlace(sim, type, tx, ty).ok) continue;
      const c = towerCenter(type, tx, ty);
      const d = Math.hypot(c.x - px, c.y - py);
      if (d < r && d > (TOWERS[type].tiers.t1.minRange || 0) + 20) return [tx, ty];
    }
  return null;
}

test('all 8 towers x 3 tiers x 2 branches build, upgrade and fire (depots: income / aura)', () => {
  for (const type of Object.keys(TOWERS)) {
    for (let path = 0; path < 5; path++) {
      const tiers = PATHS(path);
      const sim = createSim({ levelId: 'geonosis-2', sandbox: true, seed: 1 });
      const spot = spotNear(sim, type, 110);
      assert.ok(spot, `${type}: no spot near the path`);
      const r = build(sim, type, ...spot);
      assert.ok(r.ok, `${type} build`);
      const t = sim.state.towers[0];
      for (const tier of tiers.slice(1)) assert.ok(upgrade(sim, t.id, tier).ok, `${type} -> ${tier}`);
      assert.equal(t.tier, tiers.at(-1));
      const st = TOWERS[type].tiers[t.tier];
      if (!st.rate) {
        assert.ok(st.income > 0 || st.aura, `${type} ${t.tier} pays or buffs`);
        continue;
      }
      sandboxSpawn(sim, st.ground ? 'tank' : 'bomber', 6);
      if (st.air) sandboxSpawn(sim, 'bomber', 3);
      for (let i = 0; i < 60 * 25 && !t.fired; i++) { step(sim); sim.events.length = 0; }
      assert.ok(t.fired, `${type} ${t.tier} fired`);
    }
    assert.deepEqual(nextTiers('t3'), ['t4a', 't4b']);
  }
});
