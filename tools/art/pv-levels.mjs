// Dev contact sheet of every level's ground render (output dir = argv[2]).
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { buildArt } from '../../src/art/index.js';
import { buildLandTiles, renderLand, renderGround } from '../../src/art/tilemap.js';
import { Bitmap, blit, toCanvas, fill } from '../../src/art/bitmap.js';
import { LEVELS, LEVEL_ORDER, buildLevel } from '../../src/data/levels/index.js';
const out = process.argv[2];
const art = buildArt();
const tiles = {};
const down = (bm, k) => { const o = new Bitmap(bm.w / k | 0, bm.h / k | 0); for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = bm.d[y * k * bm.w + x * k]; return o; };
const ids = process.argv[3] ? LEVEL_ORDER.filter((i) => i.startsWith(process.argv[3])) : LEVEL_ORDER;
const cols = 4, K = 4, W = 48 * 32 / K, H = 28 * 32 / K;
const sheet = fill(new Bitmap(cols * (W + 6), Math.ceil(ids.length / cols) * (H + 6)), 0, 0, cols * (W + 6), Math.ceil(ids.length / cols) * (H + 6), '#101217');
ids.forEach((id, i) => {
  const def = LEVELS[id], lv = buildLevel(def);
  let g;
  if (def.planet === 'kamino') g = renderGround(lv.grid, art.tiles.kamino, 0);
  else { tiles[def.planet] ||= buildLandTiles(def.planet); g = renderLand(lv.grid, tiles[def.planet], 0); }
  const t = def.planet === 'kamino' ? art.tiles.kamino : tiles[def.planet];
  for (const [n, tx, ty] of def.props || []) { const p = t.props[n]; const sz = n === 'trunk' || n === 'dome' ? 2 : 1; blit(g, p, tx * 32 + ((sz * 32 - p.w) >> 1), (ty + sz) * 32 - p.h); }
  // lanes in red dots
  for (const l of lv.lanes) for (let d = 0; d < l.len; d += 24) { let j = 1; while (j < l.cum.length - 1 && l.cum[j] < d) j++; const a = l.pts[j - 1], b = l.pts[j], s = (d - l.cum[j - 1]) / (l.cum[j] - l.cum[j - 1]); fill(g, Math.round(a[0] + (b[0] - a[0]) * s) - 3, Math.round(a[1] + (b[1] - a[1]) * s) - 3, 6, 6, '#ff3b24'); }
  blit(sheet, down(g, K), (i % cols) * (W + 6) + 3, Math.floor(i / cols) * (H + 6) + 3);
});
writeFileSync(`${out}/levels.png`, toCanvas(sheet, createCanvas).toBuffer('image/png'));
