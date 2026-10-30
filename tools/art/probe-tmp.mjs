import { headlessApp, startGame } from './headless.mjs';
import { buildArt } from '../../src/art/index.js';
import { startWave } from '../../src/sim/sim.js';
import { makeBot } from '../sim/bots.mjs';
const art = buildArt();
const id = process.argv[2] || 'kamino-2';
for (const seed of [1, 2, 3]) {
  const { app } = headlessApp(art, 844, 390, 3);
  const g = startGame(app, { levelId: id, difficulty: 'jedi', seed });
  const r = app.renderer, spr = r.spr.bind(r);
  const bad = new Map();
  r.spr = (ref, ...a) => { if (!ref) { const k = new Error().stack.split('\n')[2].trim(); bad.set(k, (bad.get(k) || 0) + 1); return; } return spr(ref, ...a); };
  const bot = makeBot('balanced');
  bot(g.sim); startWave(g.sim); g.speed = 3;
  let frames = 0;
  while (g.s.phase === 'running' && frames < 60 * 60 * 25) {
    if (g.s.tick % 15 === 0) bot(g.sim);
    g.update(1 / 60, []);
    g.render();
    frames++;
  }
  console.log(id, seed, g.s.phase, [...bad].map(([k, n]) => `${n}x ${k}`).join('\n  ') || 'no undefined sprites');
}
