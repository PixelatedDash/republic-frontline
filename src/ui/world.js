// Draws the battlefield in the spec's order: ground -> decals -> (path is
// part of the ground layer) -> overlays -> shadows -> units/towers/props
// (y-sorted) -> air -> projectiles -> particles -> additive glows ->
// weather. Positions are interpolated between sim steps and snapped to
// whole art pixels by the renderer.

import { TOWERS } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { PROP_SIZE } from '../data/levels/index.js';
import { DIRS8 } from '../art/towers.js';
import { rangeCircle, gridCell, gridDots } from '../art/ui.js';
import { shadowFor } from '../engine/assets.js';

const TAU = Math.PI * 2;
export const AIR_ALT = 22;

export function dir8(a) {
  return ((Math.round(a / (TAU / 8)) % 8) + 8) % 8;
}
export function dir16(a) {
  return ((Math.round(a / (TAU / 16)) % 16) + 16) % 16;
}

// Reusable y-sort buffer (no per-frame allocation of draw items).
const items = [];
let nItems = 0;
function item() {
  if (nItems >= items.length) items.push({ y: 0, k: 0, o: null, x: 0, yy: 0 });
  return items[nItems++];
}
// Insertion sort: the order barely changes between frames, so this is
// close to linear and allocation-free.
function sortItems(n) {
  for (let i = 1; i < n; i++) {
    const it = items[i];
    let j = i - 1;
    while (j >= 0 && items[j].y > it.y) { items[j + 1] = items[j]; j--; }
    items[j + 1] = it;
  }
}

export function towerSpritePos(t) {
  if (t.type === 'rifle') return { x: t.tx * 16, y: (t.ty + 2) * 16 - 48 };
  return { x: t.tx * 16 - 4, y: (t.ty + 1) * 16 - 34 };
}

export function drawTower(r, A, t, fireAge = 9, alpha = 1) {
  const pos = towerSpritePos(t);
  if (t.type === 'rifle') {
    const a = A.towers.rifle[t.tier];
    const d = DIRS8[dir8(t.aim)];
    r.spr(a.back, pos.x, pos.y, alpha);
    const slots = a.sorted || (a.sorted = [...a.slots].map((s, i) => [...s, i]).sort((p, q) => p[1] - q[1]));
    for (const [sx, sy, i] of slots) {
      const firing = fireAge < 0.09 && i % 2 === (Math.floor(fireAge * 100) % 2);
      const tr = a.troopers[d][firing ? 'fire' : 'idle'];
      const tx = pos.x + sx - 8, ty = pos.y + sy - 17;
      r.spr(tr.ref, tx, ty, alpha);
      if (firing) r.spr(A.flashSmall, tx + tr.mx - 1, ty + tr.my - 1);
    }
    r.spr(a.front, pos.x, pos.y, alpha);
    return;
  }
  const a = A.towers[t.type][t.tier];
  const dir = dir16(t.aim);
  const recoil = fireAge < 0.07 ? 1 : 0;
  const hx = pos.x + a.mount[0] - a.frame / 2 - Math.round(Math.cos(t.aim) * recoil);
  const hy = pos.y + a.mount[1] - a.frame / 2 - Math.round(Math.sin(t.aim) * recoil);
  r.spr(a.base, pos.x, pos.y, alpha);
  r.spr(a.shadows[dir], hx + 1, hy + 2, alpha);
  r.spr(a.heads[dir], hx, hy, alpha);
  if (fireAge < 0.06) for (const [mx, my] of a.muzzles[dir]) r.spr(A.vfx.muzzleFire, hx + mx - 2, hy + my - 2);
}

function enemyFrame(A, e) {
  const set = A.enemies[e.type];
  const west = e.face < 0;
  const fl = e.flash > 0;
  if (e.mode === 'roll') return (west ? (fl ? set.rollWF : set.rollW) : fl ? set.rollF : set.roll)[Math.floor(e.anim / 3) % 2];
  if (e.mode === 'deploy') return (west ? set.deployW : set.deploy)[0];
  const list = west ? (fl ? set.walkWF : set.walkW) : fl ? set.walkF : set.walk;
  return list[Math.floor(e.anim / 5) % 4];
}

export function drawWorld(v) {
  const { r, A, sim, fx, cam, ground, alpha, sel, placing, settings, waterFrame } = v;
  const s = sim.state;
  r.world(cam);
  r.canvasAt(ground[waterFrame], 0, 0);
  fx.drawDecals(r);

  // overlays on the ground: placement grid + ghost tiles + range circles
  if (placing) {
    if (settings.showGrid) r.spr(r.cached('gridDots', () => gridDots(sim.level.w * 16, sim.level.h * 16)), 0, 0);
    const n = TOWERS[placing.type].size;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const ok = sim.level.buildable(placing.tx + x, placing.ty + y) && placing.valid;
        r.spr(r.cached(ok ? 'cellOk' : 'cellBad', () => gridCell(ok)), (placing.tx + x) * 16, (placing.ty + y) * 16);
      }
    const st = TOWERS[placing.type].tiers.t1;
    const cx = (placing.tx + n / 2) * 16, cy = (placing.ty + n / 2) * 16;
    const rc = r.cached(`rc${st.range}${placing.valid}`, () => rangeCircle(st.range, { valid: placing.valid, min: st.minRange || 0 }));
    r.spr(rc, cx - (rc.w >> 1), cy - (rc.h >> 1));
  }
  if (sel) {
    const st = TOWERS[sel.type].tiers[sel.tier];
    const rc = r.cached(`rc${st.range}true`, () => rangeCircle(st.range, { min: st.minRange || 0 }));
    r.spr(rc, sel.x - (rc.w >> 1), sel.y - (rc.h >> 1));
  }

  // shadows
  for (const t of s.towers) {
    const n = TOWERS[t.type].size;
    const sh = shadowFor(A, n * 16 - 2);
    r.spr(sh, t.x - (sh.w >> 1) + 2, (t.ty + n) * 16 - sh.h - 1);
  }
  for (const e of s.enemies) {
    const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
    if (e.air) {
      const f = A.enemies.fighter;
      const d = dir16(Math.atan2(e.y - e.py, e.x - e.px) || 0);
      r.spr(f.shadows[d], x - 10 + (AIR_ALT >> 2), y - 10 + 2, 0.55);
    } else {
      const set = A.enemies[e.type];
      const sh = shadowFor(A, set.w * 0.7);
      r.spr(sh, x - (sh.w >> 1), y - (sh.h >> 1));
    }
  }
  fx.drawCorpses(r);

  // y-sorted: props, towers, ground droids
  nItems = 0;
  for (const p of sim.level.def.props) {
    const it = item();
    const n = PROP_SIZE[p[0]] || 1;
    it.k = 0; it.o = p; it.y = (p[2] + n) * 16;
  }
  for (const t of s.towers) {
    const it = item();
    it.k = 1; it.o = t; it.y = (t.ty + TOWERS[t.type].size) * 16;
  }
  for (const e of s.enemies) {
    if (e.air) continue;
    const it = item();
    it.k = 2; it.o = e;
    it.x = e.px + (e.x - e.px) * alpha;
    it.yy = e.py + (e.y - e.py) * alpha;
    it.y = it.yy;
  }
  sortItems(nItems);
  for (let i = 0; i < nItems; i++) {
    const it = items[i];
    if (it.k === 0) {
      const [name, tx, ty] = it.o;
      const pr = A.props[name];
      const n = PROP_SIZE[name] || 1;
      r.spr(pr.ref, tx * 16 + ((n * 16 - pr.w) >> 1), (ty + n) * 16 - pr.h);
    } else if (it.k === 1) {
      drawTower(r, A, it.o, fx.towerFire.get(it.o.id) ?? 9);
    } else {
      const e = it.o;
      const set = A.enemies[e.type];
      const f = enemyFrame(A, e);
      r.spr(f, it.x - (set.w >> 1), it.yy - set.h + 1);
      if (e.shieldActive && e.shield > 0) r.spr(A.vfx.shield[3], it.x - 10, it.yy - 19, 0.45);
    }
  }

  // air units
  for (const e of s.enemies) {
    if (!e.air) continue;
    const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
    const f = A.enemies.fighter;
    const d = dir16(Math.atan2(e.y - e.py, e.x - e.px) || 0);
    r.spr(e.flash > 0 ? f.flash[d] : f.frames[Math.floor(s.tick / 4) % 2][d], x - 10, y - 10 - AIR_ALT);
  }

  // projectiles
  const V = A.vfx;
  for (const p of s.projectiles) {
    if (p.delay > 0) continue;
    const x = p.px + (p.x - p.px) * alpha;
    let y = p.py + (p.y - p.py) * alpha;
    if (p.air) y -= AIR_ALT * Math.min(1, Math.max(0, 1 - Math.hypot(p.tx - p.x, p.ty - p.y) / p.d0));
    const d = dir16(Math.atan2(p.vy, p.vx));
    const ref = p.kind === 'bolt' ? V.boltRep[d] : p.kind === 'rocket' ? A.proj.rocket[d] : p.kind === 'missile' ? A.proj.missile[d] : A.proj.shell;
    r.spr(ref, x - (ref.w >> 1), y - (ref.h >> 1));
  }

  fx.drawParticles(r, 0);
  fx.drawGlows(r, sim);
  fx.drawFlybys(r);
  fx.drawParticles(r, 1);

  // health bars (only when damaged)
  for (const e of s.enemies) {
    if (e.hp >= e.maxHp && e.shield >= e.maxShield) continue;
    const x = Math.round(e.px + (e.x - e.px) * alpha), y = Math.round(e.py + (e.y - e.py) * alpha);
    const h = e.air ? 10 + AIR_ALT + 2 : A.enemies[e.type].h + 2;
    const w = ENEMIES[e.type].radius >= 6 ? 12 : 8;
    const bx = x - (w >> 1), by = y - h;
    r.rect(bx - 1, by - 1, w + 2, e.maxShield ? 5 : 3, '#101217');
    const f = e.hp / e.maxHp;
    r.rect(bx, by, Math.max(1, Math.round(w * f)), 1, f > 0.5 ? '#9ef08a' : f > 0.25 ? '#ffd27a' : '#ff8a7a');
    if (e.maxShield) r.rect(bx, by + 2, Math.round(w * (e.shield / e.maxShield)), 1, '#e2a6ff');
  }
  fx.drawParticles(r, 2);
}
