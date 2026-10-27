// Dev preview for bosses (output dir = argv[2]).
import { preview } from './preview.mjs';
import * as BS from '../../src/art/bosses.js';
const out = process.argv[2];
const only = process.argv[3];
if (!only || only === 'tide') { const t = BS.buildTidebreaker(); preview(`${out}/tide.png`, [...t.walk, ...t.deploy.slice(0, 2), ...t.emerge.filter((_, i) => i % 2), ...t.death], { n: 2, cols: 4 }); }
if (!only || only === 'foundry') { const f = BS.buildFoundry(); preview(`${out}/foundry.png`, [...f.walk.slice(0, 2), f.compose(0, { doorState: 2, broken: [1] }), f.compose(1, { doorState: 1, broken: [0, 2] }), ...f.death], { n: 2, cols: 3 }); }
if (!only || only === 'reaper') { const r = BS.buildReaper(); preview(`${out}/reaper.png`, [...r.walk.slice(0, 2), ...r.armored.slice(0, 2), ...r.death], { n: 2, cols: 4 }); }
if (!only || only === 'dread') { const d = BS.buildDreadnought(); preview(`${out}/dread.png`, [d.frames[0][0], d.frames[1][4], d.frames[2][8], d.frames[0][20], ...d.death], { n: 1, cols: 4 }); }
if (!only || only === 'warlord') { const w = BS.buildWarlord(); preview(`${out}/warlord.png`, [...w.phases[0].slice(0, 2), w.phases[1][2], w.phases[2][3], ...w.death], { n: 2, cols: 4 }); }
