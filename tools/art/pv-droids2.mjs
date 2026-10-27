// Dev preview for Phase 2 droids (output dir = argv[2]).
import { preview } from './preview.mjs';
import * as E from '../../src/art/enemies.js';
const out = process.argv[2];
const ground = [['commando', E.buildCommando], ['tactical', E.buildTactical], ['tank', E.buildHeavyTank], ['carrier', E.buildCarrier], ['shieldwalker', E.buildShieldWalker], ['crawler', E.buildCrawler], ['siege', E.buildSiegeWalker]];
for (const [n, fn] of ground) {
  const e = fn();
  preview(`${out}/${n}.png`, [...e.walk, ...e.death], { n: 4, cols: 6 });
}
for (const [n, fn] of [['bomber', E.buildBomber], ['repair', E.buildRepairDrone]]) {
  const e = fn();
  preview(`${out}/${n}.png`, [...e.frames[0].filter((_, i) => i % 4 === 0), ...e.frames[1].slice(0, 2), ...e.death], { n: 3, cols: 8 });
}
