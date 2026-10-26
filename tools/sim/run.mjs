// Headless simulation runner.
//   node tools/sim/run.mjs --level kamino-1 --difficulty jedi --bot balanced --seeds 5
// Prints one line per seed and a summary; --json for machine-readable output.

import { createSim, runToEnd } from '../../src/sim/sim.js';
import { makeBot } from './bots.mjs';
import { pathToFileURL } from 'node:url';

export function runOne({ level, difficulty, bot, seed }) {
  const sim = createSim({ levelId: level, difficulty, seed });
  const t0 = performance.now();
  const s = runToEnd(sim, makeBot(bot));
  return {
    level, difficulty, bot, seed,
    result: s.phase,
    lives: s.lives,
    maxLives: s.maxLives,
    wave: s.waveIndex,
    totalWaves: s.totalWaves,
    credits: s.credits,
    kills: s.stats.killsTotal,
    leaked: s.stats.leaked,
    towers: s.towers.map((t) => `${t.type}:${t.tier}`).join(' '),
    simSeconds: Math.round(s.time),
    ms: Math.round(performance.now() - t0),
  };
}

function args() {
  const a = process.argv.slice(2);
  const o = { level: 'kamino-1', difficulty: 'jedi', bot: 'balanced', seeds: 5, json: false };
  for (let i = 0; i < a.length; i++) {
    const k = a[i].replace(/^--/, '');
    if (k === 'json') o.json = true;
    else o[k] = a[++i];
  }
  o.seeds = Number(o.seeds);
  return o;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const o = args();
  const rows = [];
  for (let seed = 1; seed <= o.seeds; seed++) rows.push(runOne({ ...o, seed }));
  if (o.json) console.log(JSON.stringify(rows, null, 2));
  else {
    for (const r of rows)
      console.log(`${r.level} ${r.difficulty} ${r.bot} seed=${r.seed}: ${r.result.toUpperCase()} lives ${r.lives}/${r.maxLives} wave ${r.wave}/${r.totalWaves} leaked ${r.leaked} kills ${r.kills} credits ${r.credits} (${r.simSeconds}s sim, ${r.ms}ms) [${r.towers}]`);
    const wins = rows.filter((r) => r.result === 'won').length;
    console.log(`wins ${wins}/${rows.length}`);
  }
}
