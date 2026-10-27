// Art lint: fails if any composed tower/enemy frame has an orphan pixel
// (an opaque pixel with no opaque 4-neighbor).   node tools/art/lint-art.mjs
import { buildArt, buildArtPhase2, TIERS } from '../../src/art/index.js';
import { composeRifle, composeTurret, DIRS8 } from '../../src/art/towers.js';

const art = buildArt();
const orphans = (b) => {
  let n = 0;
  for (let y = 0; y < b.h; y++)
    for (let x = 0; x < b.w; x++) {
      if (!(b.get(x, y) >>> 24)) continue;
      if (!((b.get(x - 1, y) | b.get(x + 1, y) | b.get(x, y - 1) | b.get(x, y + 1)) >>> 24)) n++;
    }
  return n;
};
const frames = [];
for (const t of TIERS) {
  for (const d of DIRS8) frames.push([`rifle ${t} ${d}`, composeRifle(art.towers.rifle[t], d)]);
  for (const k of ['rocket', 'flak']) for (let d = 0; d < 16; d++) frames.push([`${k} ${t} dir${d}`, composeTurret(art.towers[k][t], d)]);
}
for (const [k, e] of Object.entries(art.enemies)) {
  if (e.frames) e.frames.flat().forEach((f, i) => frames.push([`${k} ${i}`, f]));
  else [...e.walk, ...e.death.slice(1)].forEach((f, i) => frames.push([`${k} ${i}`, f]));
}
// Phase 2 content
const a2 = buildArtPhase2();
for (const t of TIERS) {
  for (const k of ['repeater', 'artillery', 'ion']) {
    const tw = a2.towers[k][t];
    if (tw.static) tw.pulse.forEach((f, i) => frames.push([`${k} ${t} pulse${i}`, f]));
    else for (let d = 0; d < 32; d += 2) frames.push([`${k} ${t} dir${d}`, composeTurret(tw, d, { spin: d & 1 })]);
  }
  for (const d of DIRS8) frames.push([`sharpshooter ${t} ${d}`, composeRifle(a2.towers.sharpshooter[t], d)]);
  a2.towers.depot[t].frames.forEach((f, i) => frames.push([`depot ${t} ${i}`, f]));
}
const B = a2.bosses;
const bossFrames = { tidebreaker: [...B.tidebreaker.walk, ...B.tidebreaker.deploy], foundry: [...B.foundry.walk, B.foundry.compose(0, { doorState: 2, broken: [0, 1, 2] })], reaper: [...B.reaper.walk, ...B.reaper.armored], dreadnought: B.dreadnought.frames.flat(), warlord: B.warlord.phases.flat() };
for (const [k, list] of Object.entries(bossFrames)) list.forEach((f, i) => frames.push([`boss ${k} ${i}`, f]));
for (const [p, t] of Object.entries(a2.tiles)) Object.entries(t.props).forEach(([n, f]) => frames.push([`prop ${p} ${n}`, f]));

const bad = frames.map(([n, f]) => [n, orphans(f)]).filter(([, c]) => c > 0);
console.log(`lint-art: ${frames.length} frames, ${bad.length} with orphan pixels`);
for (const [n, c] of bad) console.log(`  ${n}: ${c}`);
process.exit(bad.length ? 1 : 0);
