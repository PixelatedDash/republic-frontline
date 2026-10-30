// QA sweep: plays every level through the real GameScreen (balanced bot,
// headless canvas), rendering every few frames, and reports any exception.
//   node tools/art/qa-sweep.mjs [level ...]
import { headlessApp, startGame } from './headless.mjs';
import { buildArt } from '../../src/art/index.js';
import { LEVEL_ORDER } from '../../src/data/levels/index.js';
import { startWave } from '../../src/sim/sim.js';
import { makeBot } from '../sim/bots.mjs';

const art = buildArt();
const levels = process.argv.slice(2).length ? process.argv.slice(2) : LEVEL_ORDER;
let failed = 0;
for (const id of levels) {
  const { app } = headlessApp(art, 844, 390, 3);
  const g = startGame(app, { levelId: id, difficulty: 'jedi', seed: 3 });
  const bot = makeBot('balanced');
  const t0 = Date.now();
  let err = null, frames = 0;
  try {
    bot(g.sim);
    startWave(g.sim);
    g.speed = 3;
    while (g.s.phase === 'running' && frames < 60 * 60 * 25) {
      if (g.s.tick % 15 === 0) bot(g.sim);
      g.update(1 / 60, []);
      if (g.cine) g.cine.t = 99; // skip boss cinematics
      if (frames % 20 === 0) g.render();
      if (frames % 600 === 0 && g.s.towers[0]) { g.selId = g.s.towers[frames / 600 % g.s.towers.length | 0].id; }
      frames++;
    }
    g.render();
  } catch (e) { err = e; }
  if (err) failed++;
  console.log(`${id.padEnd(12)} ${g.s.phase.padEnd(8)} wave ${g.s.waveIndex}/${g.s.totalWaves} frames ${frames} ${((Date.now() - t0) / 1000).toFixed(0)}s ${err ? 'ERROR ' + err.stack.split('\n').slice(0, 3).join(' | ') : 'ok'}`);
}
process.exit(failed ? 1 : 0);
