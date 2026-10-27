import { preview } from './preview.mjs';
import { buildArt, buildArtPhase2 } from '../../src/art/index.js';
import { mockups } from './mockups2.mjs';
const out = process.argv[2];
const m = mockups(buildArt(), buildArtPhase2());
for (const [k, b] of Object.entries(m)) preview(`${out}/mock-${k}.png`, [b], { n: 1, gap: 0 });
