// Tileset builders + a small autotiler that renders a map grid to a ground
// bitmap. Grid cells: G ground, P path, B bridge (path over water), W water,
// X unbuildable pad. Used by the game renderer (pre-rendered ground layer)
// and by the export tools for mockups.

import { Bitmap, blit, fromMap, rgba, fill } from './bitmap.js';
import { hd } from './rotsprite.js';
import { KAMINO_LEGEND } from './palettes.js';
import * as K from './sprites/kamino.js';

export const TILE = 32;
export const WATER_FRAMES = 8;

function scrollMap(rows, dx) {
  return rows.map((r) => {
    const n = r.length, s = ((dx % n) + n) % n;
    return r.slice(n - s) + r.slice(0, n - s);
  });
}

function waterFrames(lg) {
  const base = hd(fromMap(K.WATER_SRC, lg), false);
  // add sparse whitecap glints on top of the upscaled swell
  const glint = rgba(lg[0]), foam = rgba(lg[9]);
  for (const [x, y] of [[6, 4], [22, 11], [13, 21], [28, 26], [3, 29]]) { base.set(x, y, glint); base.set(x + 1, y, foam); base.set(x - 1, y, foam); }
  return Array.from({ length: WATER_FRAMES }, (_, i) => {
    const out = new Bitmap(32, 32);
    const dx = i * 4, dy = i % 2;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) out.d[y * 32 + x] = base.d[((y + dy) % 32) * 32 + ((x - dx + 64) % 32)];
    return out;
  });
}

export function buildKaminoTiles() {
  const lg = KAMINO_LEGEND;
  const t = {
    ground: K.GROUND.map((m) => fromMap(m, lg)),
    path: fromMap(K.PATH, lg),
    pad: fromMap(K.PAD, lg),
    // 8 frames: the swell drifts 4px per frame, odd frames lift one row
    water: waterFrames(lg),
    cliff: fromMap(K.CLIFF, lg),
    bridgeFace: fromMap(K.BRIDGE_FACE, lg),
    foamH: K.FOAM_H.map((r) => fromMap([r], lg)),
    foamV: fromMap(K.FOAM_V, lg),
    props: {
      dome: hd(fromMap(K.DOME_POD, lg)),
      mast: hd(fromMap(K.MAST, lg)),
      floodlight: hd(fromMap(K.FLOODLIGHT, lg)),
      crates: hd(fromMap(K.CRATES, lg)),
      generator: hd(fromMap(K.GENERATOR, lg)),
      rail: hd(fromMap(K.RAIL, lg)),
    },
  };
  return t;
}

const isPlat = (c) => c === 'G' || c === 'P' || c === 'X';
const isPathLike = (c) => c === 'P' || c === 'B';

// Render a grid (array of strings) to a ground bitmap. `frame` picks water anim.
export function renderGround(grid, tiles, frame = 0) {
  const H = grid.length, W = grid[0].length;
  const bm = new Bitmap(W * TILE, H * TILE);
  const at = (x, y) => (y < 0 || y >= H || x < 0 || x >= W ? 'W' : grid[y][x]);
  const dark = rgba('#1a252c');
  const lip = rgba('#d9dedb');
  const groove = rgba('#25333b');
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = at(x, y), px = x * TILE, py = y * TILE;
      if (c === 'W' || c === 'B') {
        blit(bm, tiles.water[frame % WATER_FRAMES], px, py);
        const n = at(x, y - 1);
        if (c === 'W' && isPlat(n)) blit(bm, tiles.cliff, px, py);
        else if (c === 'W' && n === 'B') blit(bm, tiles.bridgeFace, px, py);
        if (c === 'W') {
          if (isPlat(at(x, y + 1))) blit(bm, tiles.foamH[(x + frame) % 2], px, py + 31);
          if (isPlat(at(x - 1, y)) && !isPlat(n)) blit(bm, tiles.foamV, px, py);
          if (isPlat(at(x + 1, y)) && !isPlat(n)) blit(bm, tiles.foamV, px + 31, py);
        }
        if (c === 'B') {
          blit(bm, tiles.path, px, py);
          // bridge side rails (horizontal or vertical span)
          if (isPathLike(at(x - 1, y)) || isPathLike(at(x + 1, y))) {
            fill(bm, px, py, TILE, 1, lip);
            fill(bm, px, py + 1, TILE, 1, groove);
            fill(bm, px, py + 31, TILE, 1, dark);
          } else {
            fill(bm, px, py, 1, TILE, lip);
            fill(bm, px + 1, py, 1, TILE, groove);
            fill(bm, px + 31, py, 1, TILE, dark);
            fill(bm, px + 30, py, 1, TILE, groove);
          }
        }
        continue;
      }
      if (c === 'G') blit(bm, tiles.ground[(x * 5 + y * 3 + ((x * y) % 3)) % 7 === 0 ? 1 : (x * 7 + y * 11) % 9 === 0 ? 2 : 0], px, py);
      if (c === 'X') blit(bm, tiles.pad, px, py);
      if (c === 'P') {
        blit(bm, tiles.path, px, py);
        // curbs where the walkway meets platform
        if (!isPathLike(at(x, y - 1))) { fill(bm, px, py, TILE, 1, lip); fill(bm, px, py + 1, TILE, 1, groove); }
        if (!isPathLike(at(x, y + 1))) { fill(bm, px, py + 31, TILE, 1, lip); fill(bm, px, py + 30, TILE, 1, groove); }
        if (!isPathLike(at(x - 1, y))) { fill(bm, px, py, 1, TILE, lip); fill(bm, px + 1, py, 1, TILE, groove); }
        if (!isPathLike(at(x + 1, y))) { fill(bm, px + 31, py, 1, TILE, lip); fill(bm, px + 30, py, 1, TILE, groove); }
      }
      // platform outer edges
      if (!isPlat(at(x, y - 1)) && at(x, y - 1) !== 'B') { fill(bm, px, py, TILE, 1, dark); fill(bm, px, py + 1, TILE, 1, lip); }
      if (!isPlat(at(x - 1, y)) && at(x - 1, y) !== 'B') fill(bm, px, py, 1, TILE, dark);
      if (!isPlat(at(x + 1, y)) && at(x + 1, y) !== 'B') fill(bm, px + 31, py, 1, TILE, dark);
    }
  return bm;
}
