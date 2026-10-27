// Dev preview for Phase 2 towers (scratch output dir passed as argv[2]).
import { preview } from './preview.mjs';
import { buildRepeater, buildArtillery, buildIon, composeTurret, TIERS } from '../../src/art/towers.js';
const out = process.argv[2];
for (const [name, fn] of [['repeater', buildRepeater], ['artillery', buildArtillery], ['ion', buildIon]]) {
  const ts = TIERS.map((t) => fn(t));
  const row = [];
  for (const t of ts) for (const d of [0, 4, 8, 12, 20, 28]) row.push(composeTurret(t, d, { firing: d === 8, spin: d >> 2 }));
  preview(`${out}/${name}.png`, row, { n: 3, cols: 6 });
}
import { buildSharpshooter, buildDepot, composeRifle } from '../../src/art/towers.js';
{
  const row = [];
  for (const t of TIERS) { const s = buildSharpshooter(t); row.push(composeRifle(s, 'SE'), composeRifle(s, 'W', { firing: true })); }
  preview(`${out}/sharpshooter.png`, row, { n: 3, cols: 10 });
  const d = TIERS.map((t) => buildDepot(t).frames[0]);
  preview(`${out}/depot.png`, d, { n: 3, cols: 5 });
}
