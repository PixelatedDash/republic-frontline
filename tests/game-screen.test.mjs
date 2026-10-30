// Speed 1x/2x/3x, pause, and building while paused, through the real
// GameScreen on a headless canvas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { headlessApp, startGame } from '../tools/art/headless.mjs';
import { buildArt } from '../src/art/index.js';
import { startWave, canPlace } from '../src/sim/sim.js';

const art = buildArt();

test('speed controls step the sim 1x / 2x / 3x; pause stops it; building works while paused', () => {
  const { app } = headlessApp(art, 844, 390, 3);
  const g = startGame(app, { levelId: 'kamino-2', difficulty: 'jedi', seed: 1 });
  startWave(g.sim);
  const run = (n) => { const t0 = g.s.tick; for (let i = 0; i < n; i++) g.update(1 / 60, []); return g.s.tick - t0; };
  run(5);
  for (const sp of [1, 2, 3]) {
    g.speed = sp;
    const d = run(60);
    assert.ok(Math.abs(d - 60 * sp) <= sp, `speed ${sp}: ${d} ticks in 60 frames`);
  }
  g.paused = true;
  assert.equal(run(60), 0, 'paused: no sim steps');
  // build while paused
  let spot = null;
  for (let ty = 0; ty < g.level.h && !spot; ty++) for (let tx = 0; tx < g.level.w && !spot; tx++) if (canPlace(g.sim, 'rifle', tx, ty).ok) spot = [tx, ty];
  const before = g.s.towers.length;
  g.placing = { type: 'rifle', tx: spot[0], ty: spot[1], valid: true, touch: false };
  g.confirmPlace();
  assert.equal(g.s.towers.length, before + 1, 'built while paused');
  g.render();
});
