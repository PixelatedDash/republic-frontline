// Balance pass: for one level, find the highest droid HP scale at which
// the balanced bot still wins Jedi in >= 3 of 5 seeds and Padawan in 5 of 5,
// and the next step down passes too (bot results are not perfectly monotonic
// in HP, so a lone passing value is not trusted). Falls back to Jedi >= 1/5
// (the spec gate) when no value reaches 3/5.
//   node tools/sim/tune.mjs --level geonosis-3 [--lo 0.3 --hi 2.5]
// Prints JSON { level, hp, jedi, padawan }.

import { createSim, runToEnd } from '../../src/sim/sim.js';
import { LEVELS, composeLevel } from '../../src/data/levels/index.js';
import { makeBot } from './bots.mjs';

const a = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map((x) => x.trim().split(/\s+/)));
const id = a.level;
const lo = Number(a.lo || 0.3), hi = Number(a.hi || 2.5);
const STEP = 0.05;

const memo = new Map();
function wins(hp, difficulty, seeds = 5) {
  const key = `${hp}:${difficulty}`;
  if (memo.has(key)) return memo.get(key);
  composeLevel(LEVELS[id], hp);
  let w = 0, lives = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const s = runToEnd(createSim({ levelId: id, difficulty, seed }), makeBot('balanced'));
    if (s.phase === 'won') { w++; lives += s.lives / s.maxLives; }
  }
  const r = { w, lives: w ? lives / w : 0 };
  memo.set(key, r);
  return r;
}
// Pass/fail only, stopping as soon as the outcome is decided.
function reaches(hp, difficulty, need, seeds = 5) {
  const key = `${hp}:${difficulty}`;
  if (memo.has(key)) return memo.get(key).w >= need;
  composeLevel(LEVELS[id], hp);
  let w = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    if (runToEnd(createSim({ levelId: id, difficulty, seed }), makeBot('balanced')).phase === 'won') w++;
    if (w >= need) return true;
    if (w + seeds - seed < need) return false;
  }
  return false;
}
const ok = (hp, jediMin) => reaches(hp, 'jedi', jediMin) && reaches(hp, 'padawan', 5);
const round = (x) => Math.round(x * 100) / 100;

// Coarse 0.1 steps from the top, then try the half step above the hit.
function scan(jediMin) {
  for (let h = hi; h >= lo + STEP - 1e-9; h = round(h - 2 * STEP))
    if (ok(h, jediMin) && ok(round(h - STEP), jediMin)) return ok(round(h + STEP), jediMin) && h + STEP <= hi ? round(h + STEP) : h;
  return null;
}

const hp = scan(3) ?? scan(1);
if (hp === null) {
  console.log(JSON.stringify({ level: id, hp: null, note: `no robust value in [${lo}, ${hi}]` }));
} else {
  composeLevel(LEVELS[id], hp);
  console.log(JSON.stringify({ level: id, hp, jedi: wins(hp, 'jedi'), padawan: wins(hp, 'padawan') }));
}
