// Tower sprite builders. Produce every frame the game (and the export tools)
// need: base layers, 16 RotSprite head directions, recoil frames, muzzle
// points. Rifle Squad uses 8 hand-authored trooper facings instead.

import { Bitmap, blit, fromMap, silhouette, mirrorX } from './bitmap.js';
import { rotations, hd } from './rotsprite.js';
import { ROCKET, FLAK } from './sprites/turrets.js';
import { buildNest, SQUAD_SLOTS, NEST_W, NEST_H } from './sprites/rifle.js';
import { buildTrooper, stripeSwap, TROOPER_FRAME, DIRS8, MUZZLE_SMALL, MUZZLE_MED } from './sprites/troopers.js';
import { MUZZLE_FIRE } from './vfx.js';

export const TIERS = ['t1', 't2', 't3', 't4a', 't4b'];
export const TIER_NAMES = {
  rifle: { t1: 'Rifle Squad I', t2: 'Rifle Squad II', t3: 'Rifle Squad III', t4a: 'Elite Squad', t4b: 'Marksman Squad' },
  rocket: { t1: 'Rocket Team I', t2: 'Rocket Team II', t3: 'Rocket Team III', t4a: 'Tandem Launcher', t4b: 'Cluster Pod' },
  flak: { t1: 'Flak Turret I', t2: 'Flak Turret II', t3: 'Flak Turret III', t4a: 'Burst Flak', t4b: 'Interceptor Battery' },
};

// 2x detail: bases/heads are built from the hand-placed 1x parts, upscaled
// with Scale2x + 1px outlines, then heads get 32 RotSprite directions.
const TURRET_W = 48, TURRET_H = 68, HEAD_FRAME = 72;
export const TURRET_DIRS = 32;

export function buildTurret(def, dirs = TURRET_DIRS) {
  const base1 = new Bitmap(TURRET_W / 2, TURRET_H / 2);
  let bottom = 0;
  for (const [m, , y] of def.base) bottom = Math.max(bottom, y + m.length);
  const ox1 = 4, oy1 = TURRET_H / 2 - bottom;
  for (const [m, x, y] of def.base) blit(base1, fromMap(m), ox1 + x, oy1 + y);
  const baseOut = stripeSwap(hd(base1), def.stripe);
  const head = stripeSwap(hd(def.head()), def.stripe);
  const px = def.pivot[0] * 2 + 1, py = def.pivot[1] * 2 + 1;
  const ox = ox1 * 2, oy = oy1 * 2;
  const frames = rotations(head, dirs, px, py, HEAD_FRAME, 4);
  const shadows = frames.map((f) => silhouette(f, '#000000', 70));
  const mount = [ox + def.mount[0] * 2, oy + def.mount[1] * 2];
  // muzzle points per direction, in head-frame coordinates
  const muzzles = [];
  for (let i = 0; i < dirs; i++) {
    const a = (i / dirs) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    muzzles.push(def.muzzleRows.map((my1) => {
      const my = my1 * 2 + 1;
      let mx = head.w - 1;
      while (mx > 0 && !(head.get(mx, my) >>> 24)) mx--;
      const dx = mx - px, dy = my - py;
      return [Math.round(HEAD_FRAME / 2 + c * dx - s * dy), Math.round(HEAD_FRAME / 2 + s * dx + c * dy)];
    }));
  }
  return { base: baseOut, frames, shadows, mount, muzzles, dirs, frame: HEAD_FRAME, w: TURRET_W, h: TURRET_H, flash: def.flash };
}

// Compose a full turret frame (base + head shadow + head [+ flash]) for previews.
export const COMPOSE_W = 80, COMPOSE_H = 88;
export function composeTurret(t, dir, { firing = false } = {}) {
  const bm = new Bitmap(COMPOSE_W, COMPOSE_H);
  const bx = (COMPOSE_W - t.w) >> 1, by = COMPOSE_H - t.h;
  blit(bm, t.base, bx, by);
  const a = (dir / t.dirs) * Math.PI * 2;
  const rx = firing ? -Math.round(Math.cos(a) * 2) : 0, ry = firing ? -Math.round(Math.sin(a) * 2) : 0;
  const hx = bx + t.mount[0] - t.frame / 2 + rx, hy = by + t.mount[1] - t.frame / 2 + ry;
  blit(bm, t.shadows[dir], hx + 2, hy + 4);
  blit(bm, t.frames[dir], hx, hy);
  if (firing) {
    const fl = fromMap(t.flash === 'fire' ? MUZZLE_FIRE : MUZZLE_MED);
    for (const [mx, my] of t.muzzles[dir]) blit(bm, fl, hx + mx - (fl.w >> 1), hy + my - (fl.h >> 1));
  }
  return bm;
}

export function buildRocket(tier) { return buildTurret(ROCKET[tier]); }
export function buildFlak(tier) { return buildTurret(FLAK[tier]); }

const SQUAD_CFG = {
  t1: ['carbine', 'rifle'], t2: ['carbine', 'rifle'], t3: ['carbine', 'rifle'],
  t4a: ['carbine', 'elite'], t4b: ['longrifle', 'marksman'],
};

export function buildRifle(tier) {
  const nest = buildNest(tier);
  const [weapon, stripe] = SQUAD_CFG[tier];
  const troopers = {};
  for (const d of DIRS8) troopers[d] = { idle: buildTrooper(d, weapon, stripe, 0), breathe: buildTrooper(d, weapon, stripe, 0, 1), fire: buildTrooper(d, weapon, stripe, 2) };
  return { ...nest, troopers, slots: SQUAD_SLOTS[tier], w: NEST_W, h: NEST_H };
}

export function composeRifle(r, dir, { firing = false } = {}) {
  const bm = new Bitmap(r.w, r.h);
  blit(bm, r.back);
  const d = typeof dir === 'number' ? DIRS8[dir] : dir;
  const slots = [...r.slots].sort((a, b) => a[1] - b[1]);
  const flash = fromMap(MUZZLE_SMALL);
  slots.forEach(([x, y], i) => {
    const t = r.troopers[d][firing && i % 2 === 0 ? 'fire' : 'idle'];
    const tx = x - TROOPER_FRAME.footX, ty = y - TROOPER_FRAME.footY;
    blit(bm, t.bm, tx, ty);
    if (firing && i % 2 === 0) blit(bm, flash, tx + t.mx - (flash.w >> 1), ty + t.my - (flash.h >> 1));
  });
  blit(bm, r.front);
  return bm;
}

export { DIRS8, mirrorX };
