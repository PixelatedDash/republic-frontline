// Composes a battlefield frame from src/art output in the game's draw order:
// ground -> decals -> path -> shadows -> units/towers (y-sorted) -> air ->
// projectiles -> particles (additive glows batched) -> weather -> overlay.
// Used for the Phase 0 map mockup, readability shot and HUD backgrounds.

import { Bitmap, blit, blitAdd, crop, silhouette, fill } from '../../src/art/bitmap.js';
import { renderGround, TILE } from '../../src/art/tilemap.js';
import { composeRifle, composeTurret } from '../../src/art/towers.js';
import { shadowBlob, mulberry32 } from '../../src/art/vfx.js';

const FOOT = { rifle: 2, rocket: 1, flak: 1 };

export function checkFootprint(grid, type, tx, ty) {
  const n = FOOT[type] || 1;
  for (let y = ty; y < ty + n; y++)
    for (let x = tx; x < tx + n; x++)
      if (grid[y]?.[x] !== 'G') throw new Error(`${type} at ${tx},${ty} overlaps '${grid[y]?.[x]}' at ${x},${y}`);
}

export function composeScene(art, grid, s, { ox = 0, oy = 0, w = 480, h = 270, frame = 0, rain = true, seed = 4 } = {}) {
  const tiles = art.tiles.kamino;
  const world = renderGround(grid, tiles, frame);
  // decals
  for (const d of s.decals || []) blit(world, d.bm, d.x - (d.bm.w >> 1), d.y - (d.bm.h >> 1));
  const items = [];
  // props
  for (const [name, tx, ty] of s.props || []) {
    const bm = tiles.props[name];
    const fp = name === 'dome' ? 2 : 1;
    const x = tx * TILE + ((fp * TILE - bm.w) >> 1), y = (ty + fp) * TILE - bm.h;
    items.push({ y: (ty + fp) * TILE, bm, x, by: y, shadow: name === 'dome' ? null : shadowBlob(bm.w, 3, 70) });
  }
  // towers
  for (const t of s.towers || []) {
    checkFootprint(grid, t.type, t.tx, t.ty);
    const fp = FOOT[t.type];
    let bm;
    if (t.type === 'rifle') bm = composeRifle(art.towers.rifle[t.tier], t.dir ?? 'S', { firing: t.firing });
    else bm = composeTurret(art.towers[t.type][t.tier], t.dir ?? 4, { firing: t.firing });
    const x = t.tx * TILE + ((fp * TILE - bm.w) >> 1), y = (t.ty + fp) * TILE - bm.h;
    items.push({ y: (t.ty + fp) * TILE, bm, x, by: y, towerShadow: true });
  }
  // ground enemies: feet position in world px
  for (const e of s.enemies || []) {
    const set = art.enemies[e.type];
    const west = e.facing === 'W';
    const list = (e.anim === 'roll' ? (west ? set.rollW : set.roll) : e.anim === 'death' ? (west ? set.deathW : set.death) : west ? set.walkW : set.walk);
    const bm = list[(e.frame || 0) % list.length];
    items.push({ y: e.y, bm, x: e.x - (bm.w >> 1), by: e.y - bm.h + 1, shadow: e.anim === 'death' ? null : shadowBlob(Math.max(6, (bm.w * 0.7) | 0), 3, 80) });
  }
  // shadows layer
  for (const it of items) {
    if (it.shadow) blit(world, it.shadow, it.x + ((it.bm.w - it.shadow.w) >> 1), it.y - 2);
    if (it.towerShadow) blit(world, silhouette(it.bm, '#000000', 55), it.x + 2, it.by + 1);
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) blit(world, it.bm, it.x, it.by);
  // air units (shadow far below on the ground, sprite at altitude)
  for (const f of s.air || []) {
    const set = art.enemies.fighter;
    const bm = set.frames[(f.frame || 0) % 2][f.dir];
    const alt = f.alt ?? 22;
    blit(world, set.shadows[f.dir], f.x - (bm.w >> 1) + (alt >> 2), f.y - (bm.h >> 1) + alt);
    blit(world, bm, f.x - (bm.w >> 1), f.y - (bm.h >> 1));
  }
  // projectiles
  const glows = [];
  for (const b of s.bolts || []) {
    const set = b.side === 'sep' ? art.vfx.boltSep : art.vfx.boltRep;
    const bm = set[b.dir];
    blit(world, bm, b.x - (bm.w >> 1), b.y - (bm.h >> 1));
    glows.push([b.side === 'sep' ? art.vfx.glowSep : art.vfx.glowRep, b.x, b.y]);
  }
  // particles
  for (const p of s.fx || []) {
    blit(world, p.bm, p.x - (p.bm.w >> 1), p.y - (p.bm.h >> 1));
    if (p.glow) glows.push([p.glow, p.x, p.y]);
  }
  // additive pass, batched once
  for (const [g, x, y] of glows) blitAdd(world, g, x - (g.w >> 1), y - (g.h >> 1));
  let view = crop(world, ox, oy, w, h);
  // weather: slanted rain streaks + splashes (visual RNG)
  if (rain) {
    const rnd = mulberry32(seed);
    for (let i = 0; i < (w * h) / 900; i++) blit(view, art.vfx.rain, (rnd() * w) | 0, (rnd() * h) | 0);
    for (let i = 0; i < (w * h) / 4000; i++) blit(view, art.vfx.splash[(rnd() * 3) | 0], (rnd() * w) | 0, (rnd() * h) | 0);
  }
  // storm overlay: cool dark wash at the top edge
  const ov = new Bitmap(w, h);
  for (let y = 0; y < 24; y++) fill(ov, 0, y, w, 1, '#0c1418', Math.round(70 * (1 - y / 24)));
  blit(view, ov);
  return view;
}
