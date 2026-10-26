// Level registry + builder. buildLevel() turns a hand-designed level
// definition into the tile grid (G ground, P path, B bridge, W water,
// X pad), a blocked mask for props, and pixel polylines for paths/lanes.
// Pure data code: used by the sim, the renderer and the headless tools.

import kamino1 from './kamino-1.js';

export const LEVELS = { 'kamino-1': kamino1 };
export const TILE = 16;

export const PROP_SIZE = { dome: 2, mast: 1, floodlight: 1, crates: 1, generator: 1 };

function polyline(waypoints) {
  const pts = waypoints.map(([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}

export function buildLevel(def) {
  const [W, H] = def.size;
  const g = Array.from({ length: H }, () => Array(W).fill('W'));
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  for (const [x0, y0, x1, y1] of def.platforms) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = 'G';
  for (const [x0, y0, x1, y1] of def.pads || []) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = 'X';
  for (const wp of def.paths) {
    for (let i = 0; i < wp.length - 1; i++) {
      let [x, y] = wp[i];
      const [x1, y1] = wp[i + 1];
      if (x !== x1 && y !== y1) throw new Error(`${def.id}: path segments must be axis-aligned`);
      for (;;) {
        if (inside(x, y)) g[y][x] = g[y][x] === 'W' || g[y][x] === 'B' ? 'B' : 'P';
        if (x === x1 && y === y1) break;
        x += Math.sign(x1 - x);
        y += Math.sign(y1 - y);
      }
    }
  }
  const blocked = new Uint8Array(W * H);
  for (const [name, tx, ty] of def.props || []) {
    const n = PROP_SIZE[name] || 1;
    for (let y = ty; y < ty + n; y++)
      for (let x = tx; x < tx + n; x++) {
        if (g[y]?.[x] !== 'G') throw new Error(`${def.id}: prop ${name} at ${tx},${ty} not on ground`);
        blocked[y * W + x] = 1;
      }
  }
  const grid = g.map((r) => r.join(''));
  return {
    def,
    id: def.id,
    w: W,
    h: H,
    grid,
    blocked,
    paths: def.paths.map(polyline),
    lanes: (def.lanes || []).map(polyline),
    buildable(tx, ty) {
      return inside(tx, ty) && grid[ty][tx] === 'G' && !blocked[ty * W + tx];
    },
  };
}
