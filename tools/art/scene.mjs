// Static battlefield compositor for the Phase 2 map mockups. Uses the same
// draw order as the game (ground -> decals -> shadows -> y-sorted props /
// towers / ground units -> air -> projectiles -> additive glows) and the
// same placement rules (sprite bottoms on footprint bottoms, AIR_ALT).

import { Bitmap, blit, blitAdd, nightRim } from '../../src/art/bitmap.js';
import { composeRifle, composeTurret, COMPOSE_W, COMPOSE_H, DIRS8 } from '../../src/art/towers.js';
import { renderLand, TILE } from '../../src/art/tilemap.js';
import { shadowBlob } from '../../src/art/vfx.js';

const AIR_ALT = 44;

export function scene(art1, art2, planet, grid, items) {
  const tiles = art2.tiles[planet];
  const ground = renderLand(grid, tiles, items.frame || 0);
  const bm = new Bitmap(ground.w, ground.h);
  blit(bm, ground);
  for (const [ref, x, y] of items.decals || []) blit(bm, ref, x - (ref.w >> 1), y - (ref.h >> 1));

  const draws = []; // [bottomY, fn]
  const shadow = (w, x, y) => { const s = shadowBlob(Math.max(6, Math.round(w)), 6, 90); blit(bm, s, x - (s.w >> 1), y - 3); };

  for (const [name, tx, ty, n = 1] of items.props || []) {
    const p = tiles.props[name];
    const x = tx * TILE + ((n * TILE - p.w) >> 1), y = (ty + n) * TILE - p.h;
    draws.push([y + p.h, () => blit(bm, p, x, y)]);
  }
  for (const [type, tier, tx, ty, dir = 0, firing = false] of items.towers || []) {
    const t = (art2.towers[type] || art1.towers[type])[tier];
    let img, x, y;
    if (type === 'rifle') { img = composeRifle(t, DIRS8[dir % 8], { firing }); x = tx * TILE; y = (ty + 2) * TILE - img.h; }
    else if (type === 'sharpshooter') { img = composeRifle(t, DIRS8[dir % 8], { firing }); x = tx * TILE + 16 - (img.w >> 1); y = (ty + 1) * TILE - img.h; }
    else if (type === 'depot') { img = t.frames[0]; x = tx * TILE; y = (ty + 2) * TILE - img.h; }
    else { img = composeTurret(t, dir, { firing, spin: dir & 1 }); x = tx * TILE + 16 - COMPOSE_W / 2; y = (ty + 1) * TILE - COMPOSE_H; }
    const n = type === 'rifle' || type === 'depot' ? 2 : 1;
    shadow(n * TILE - 4, tx * TILE + n * 16 + 4, (ty + n) * TILE - 2);
    draws.push([y + img.h, () => blit(bm, img, x, y)]);
  }
  for (const [type, x, y, f = 0, west = false, src = art2.enemies[type] || art1.enemies[type]] of items.ground || []) {
    const set = src;
    const list = west ? set.walkW : set.walk;
    const img = items.night ? nightRim(list[f % list.length]) : list[f % list.length];
    shadow(set.w * 0.7, x, y);
    draws.push([y, () => blit(bm, img, x - (img.w >> 1), y - img.h + 1)]);
  }
  for (const [img, x, y, sw] of items.bosses || []) {
    shadow(sw || img.w * 0.8, x, y);
    draws.push([y, () => blit(bm, img, x - (img.w >> 1), y - img.h + 1)]);
  }
  draws.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of draws) fn();

  for (const [type, x, y, dir = 0, alt = AIR_ALT] of items.air || []) {
    const e = type === 'dreadnought' ? art2.bosses.dreadnought : art2.enemies[type] || art1.enemies[type];
    const h = e.size >> 1;
    blit(bm, e.shadows[dir], x - h + (alt >> 2), y - h + 4, { alpha: 0.55 });
    blit(bm, items.night ? nightRim(e.frames[0][dir]) : e.frames[0][dir], x - h, y - h - alt);
  }
  for (const [ref, x, y, alpha = 1] of items.fx || []) blit(bm, ref, x - (ref.w >> 1), y - (ref.h >> 1), { alpha });
  for (const [ref, x, y] of items.glow || []) blitAdd(bm, ref, x - (ref.w >> 1), y - (ref.h >> 1));
  return bm;
}
