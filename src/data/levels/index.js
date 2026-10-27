// Level registry + builder. buildLevel() turns a hand-designed level
// definition into the tile grid (G ground, P path, B bridge, W water,
// X pad), a blocked mask for props, and pixel polylines for paths/lanes.
// Pure data code: used by the sim, the renderer and the headless tools.

import kamino1 from './kamino-1.js';
import { KAMINO } from './kamino.js';
import { GEONOSIS } from './geonosis.js';
import { KASHYYYK } from './kashyyyk.js';
import { UMBARA } from './umbara.js';
import { MUSTAFAR } from './mustafar.js';

import { compose } from './waves.js';
import { STRENGTH, GROWTH, POWER } from '../balance.js';

export const PLANETS = ['kamino', 'geonosis', 'kashyyyk', 'umbara', 'mustafar'];
export const LEVELS = Object.fromEntries([kamino1, ...KAMINO, ...GEONOSIS, ...KASHYYYK, ...UMBARA, ...MUSTAFAR].map((l) => [l.id, l]));

// Turn each level's hand-written wave recipes into waves at its tuned strength.
export function composeLevel(def, hp = STRENGTH[def.id]?.hp ?? 1) {
  def.hpScale = hp;
  if (!def.recipes) return def;
  def.waves = compose(def.recipes, { b0: STRENGTH[def.id].b0, g: GROWTH, pow: POWER, paths: def.spread?.paths || 1, lanes: def.spread?.lanes || 1 });
  return def;
}
for (const def of Object.values(LEVELS)) composeLevel(def);
export const LEVEL_ORDER = Object.keys(LEVELS);
export const TILE = 32;

export const PROP_SIZE = { dome: 2, mast: 1, floodlight: 1, crates: 1, generator: 1, trunk: 2 };

function polyline(waypoints) {
  const pts = waypoints.map(([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}

export function buildLevel(def) {
  const [W, H] = def.size;
  // Kamino: sea ('W') with platforms. Land planets: ground with hazard
  // rects ('H': chasm / ravine / swamp / lava) and rough rects ('X').
  const land = def.planet !== 'kamino';
  const HZ = land ? 'H' : 'W';
  const g = Array.from({ length: H }, () => Array(W).fill(land ? 'G' : 'W'));
  const inside = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const rect = (list, c) => { for (const [x0, y0, x1, y1] of list || []) for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) g[y][x] = c; };
  rect(def.platforms, 'G');
  rect(def.hazards, 'H');
  rect(def.pads, 'X');
  rect(def.rough, 'X');
  for (const wp of def.paths) {
    for (let i = 0; i < wp.length - 1; i++) {
      let [x, y] = wp[i];
      const [x1, y1] = wp[i + 1];
      if (x !== x1 && y !== y1) throw new Error(`${def.id}: path segments must be axis-aligned`);
      for (;;) {
        if (inside(x, y)) g[y][x] = g[y][x] === HZ || g[y][x] === 'B' ? 'B' : 'P';
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
