// Balance pass: for one level, find the highest droid HP scale at which
// the balanced bot still wins Jedi in >= 3 of 5 seeds and Padawan in 5 of 5.
//   node tools/sim/tune.mjs --level geonosis-3 [--lo 0.3 --hi 4]
// Prints JSON { level, hp, jedi, padawan }.

import { createSim, runToEnd } from '../../src/sim/sim.js';
import { LEVELS, composeLevel } from '../../src/data/levels/index.js';
import { makeBot } from './bots.mjs';

const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((x) => x.trim().split(/\s+/)));
const id = a.level;
let lo = Number(a.lo || 0.3), hi = Number(a.hi || 6);

function wins(hp, difficulty, seeds = 5) {
  composeLevel(LEVELS[id], hp);
  let w = 0, lives = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const s = runToEnd(createSim({ levelId: id, difficulty, seed }), makeBot('balanced'));
    if (s.phase === 'won') { w++; lives += s.lives / s.maxLives; }
  }
  return { w, lives: w ? lives / w : 0 };
}
const ok = (hp) => wins(hp, 'jedi').w >= 3 && wins(hp, 'padawan').w === 5;

if (!ok(lo)) {
  console.log(JSON.stringify({ level: id, hp: null, note: `fails even at hp=${lo}` }));
} else {
  while (hi - lo > 0.05) {
    const mid = Math.round(((lo + hi) / 2) * 100) / 100;
    if (ok(mid)) lo = mid; else hi = mid;
  }
  const j = wins(lo, 'jedi'), p = wins(lo, 'padawan');
  console.log(JSON.stringify({ level: id, hp: lo, jedi: j, padawan: p }));
}
