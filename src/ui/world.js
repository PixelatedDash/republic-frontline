// Draws the battlefield in the spec's order: ground -> decals -> (path is
// part of the ground layer) -> overlays -> shadows -> units/towers/props
// (y-sorted) -> air -> projectiles -> particles -> additive glows ->
// weather. Positions are interpolated between sim steps and snapped to
// whole art pixels by the renderer. World art is 2x detail (32px tiles).

import { TOWERS } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { PROP_SIZE, TILE } from '../data/levels/index.js';
import { DIRS8 } from '../art/towers.js';
import { TROOPER_FRAME } from '../art/sprites/troopers.js';
import { rangeCircle, gridCell, gridDots } from '../art/ui.js';
import { shadowFor } from '../engine/assets.js';

const TAU = Math.PI * 2;
export const AIR_ALT = 44;

export function dirN(a, n) {
  return ((Math.round(a / (TAU / n)) % n) + n) % n;
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

export function towerSpritePos(A, t) {
  const n = TOWERS[t.type].size;
  if (t.type === 'rifle') {
    const a = A.towers.rifle[t.tier];
    return { x: t.tx * TILE + ((n * TILE - a.w) >> 1), y: (t.ty + n) * TILE - a.h };
  }
  const a = A.towers[t.type][t.tier];
  return { x: t.tx * TILE + ((n * TILE - a.w) >> 1), y: (t.ty + n) * TILE - a.h };
}

// aim: displayed (smoothed) angle; fireAge: seconds since last shot.
export function drawTower(r, A, t, fireAge = 9, alpha = 1, aim = t.aim, time = 0) {
  const pos = towerSpritePos(A, t);
  if (t.type === 'rifle') {
    const a = A.towers.rifle[t.tier];
    const d = DIRS8[dirN(aim, 8)];
    r.spr(a.back, pos.x, pos.y, alpha);
    const slots = a.sorted || (a.sorted = [...a.slots].map((s, i) => [...s, i]).sort((p, q) => p[1] - q[1]));
    for (const [sx, sy, i] of slots) {
      const firing = fireAge < 0.09 && i % 2 === (Math.floor(fireAge * 100) % 2);
      const breathe = Math.floor(time * 1.6 + i * 0.7) % 2 === 1;
      const tr = a.troopers[d][firing ? 'fire' : breathe ? 'breathe' : 'idle'];
      const tx = pos.x + sx - TROOPER_FRAME.footX, ty = pos.y + sy - TROOPER_FRAME.footY;
      r.spr(tr.ref, tx, ty, alpha);
      if (firing) {
        const fl = fireAge < 0.045 ? A.flashSmall : A.flashSmallB;
        r.spr(fl, tx + tr.mx - (fl.w >> 1), ty + tr.my - (fl.h >> 1));
      }
    }
    r.spr(a.front, pos.x, pos.y, alpha);
    return;
  }
  const a = A.towers[t.type][t.tier];
  const dir = dirN(aim, a.heads.length);
  const recoil = fireAge < 0.05 ? 2 : fireAge < 0.1 ? 1 : 0;
  const hx = pos.x + a.mount[0] - a.frame / 2 - Math.round(Math.cos(aim) * recoil);
  const hy = pos.y + a.mount[1] - a.frame / 2 - Math.round(Math.sin(aim) * recoil);
  r.spr(a.base, pos.x, pos.y, alpha);
  r.spr(a.shadows[dir], hx + 2, hy + 4, alpha);
  r.spr(a.heads[dir], hx, hy, alpha);
  if (fireAge < 0.08) {
    const fl = A.vfx.muzzleFire;
    for (const [mx, my] of a.muzzles[dir]) r.spr(fl, hx + mx - (fl.w >> 1), hy + my - (fl.h >> 1), fireAge < 0.04 ? 1 : 0.6);
  }
}

const WALK_STEP = 7; // art px travelled per walk frame

function enemyFrame(A, e) {
  const set = A.enemies[e.type];
  const west = e.face < 0;
  const fl = e.flash > 0;
  if (e.mode === 'roll') { const l = west ? (fl ? set.rollWF : set.rollW) : fl ? set.rollF : set.roll; return l[Math.floor(e.anim / 4) % l.length]; }
  if (e.mode === 'deploy') { const l = west ? set.deployW : set.deploy; return l[e.modeT > 0.4 ? 0 : 1]; }
  const list = west ? (fl ? set.walkWF : set.walkW) : fl ? set.walkF : set.walk;
  return list[Math.floor(e.anim / WALK_STEP) % list.length];
}

export function drawWorld(v) {
  const { r, A, sim, fx, cam, ground, alpha, sel, placing, settings, waterFrame, time } = v;
  const s = sim.state;
  r.world(cam);
  r.canvasAt(ground[waterFrame % ground.length], 0, 0);
  fx.drawDecals(r);

  // overlays on the ground: placement grid + ghost tiles + range circles
  if (placing) {
    if (settings.showGrid) r.canvasAt(r.cachedCanvas('gridDots', () => gridDots(sim.level.w * TILE, sim.level.h * TILE, TILE)), 0, 0);
    const n = TOWERS[placing.type].size;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const ok = sim.level.buildable(placing.tx + x, placing.ty + y) && placing.valid;
        r.spr(r.cached(ok ? 'cellOk' : 'cellBad', () => gridCell(ok, TILE)), (placing.tx + x) * TILE, (placing.ty + y) * TILE);
      }
    const st = TOWERS[placing.type].tiers.t1;
    const cx = (placing.tx + n / 2) * TILE, cy = (placing.ty + n / 2) * TILE;
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
    const sh = shadowFor(A, n * TILE - 4);
    r.spr(sh, t.x - (sh.w >> 1) + 4, (t.ty + n) * TILE - sh.h - 2);
  }
  const F = A.enemies.fighter;
  const fh = F.size >> 1;
  for (const e of s.enemies) {
    const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
    if (e.air) {
      const d = dirN(Math.atan2(e.y - e.py, e.x - e.px) || 0, F.shadows.length);
      r.spr(F.shadows[d], x - fh + (AIR_ALT >> 2), y - fh + 4, 0.55);
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
    it.k = 0; it.o = p; it.y = (p[2] + n) * TILE;
  }
  for (const t of s.towers) {
    const it = item();
    it.k = 1; it.o = t; it.y = (t.ty + TOWERS[t.type].size) * TILE;
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
      r.spr(pr.ref, tx * TILE + ((n * TILE - pr.w) >> 1), (ty + n) * TILE - pr.h);
    } else if (it.k === 1) {
      const t = it.o;
      drawTower(r, A, t, fx.towerFire.get(t.id) ?? 9, 1, fx.aimOf(t), time);
    } else {
      const e = it.o;
      const set = A.enemies[e.type];
      r.spr(enemyFrame(A, e), it.x - (set.w >> 1), it.yy - set.h + 1);
      if (e.shieldActive && e.shield > 0) r.spr(A.vfx.shield[5], it.x - 20, it.yy - 40, 0.55);
    }
  }

  // air units
  for (const e of s.enemies) {
    if (!e.air) continue;
    const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
    const d = dirN(Math.atan2(e.y - e.py, e.x - e.px) || 0, F.flash.length);
    const fr = F.frames[Math.floor(s.tick / 3) % F.frames.length];
    r.spr(e.flash > 0 ? F.flash[d] : fr[d], x - fh, y - fh - AIR_ALT);
  }

  // projectiles
  const V = A.vfx;
  for (const p of s.projectiles) {
    if (p.delay > 0) continue;
    const x = p.px + (p.x - p.px) * alpha;
    let y = p.py + (p.y - p.py) * alpha;
    if (p.air) y -= AIR_ALT * Math.min(1, Math.max(0, 1 - Math.hypot(p.tx - p.x, p.ty - p.y) / p.d0));
    const ang = Math.atan2(p.vy, p.vx);
    const ref = p.kind === 'bolt' ? V.boltRep[dirN(ang, V.boltRep.length)] : p.kind === 'rocket' ? A.proj.rocket[dirN(ang, A.proj.rocket.length)] : p.kind === 'missile' ? A.proj.missile[dirN(ang, A.proj.missile.length)] : A.proj.shell;
    r.spr(ref, x - (ref.w >> 1), y - (ref.h >> 1));
  }

  fx.drawParticles(r, 0);
  fx.drawGlows(r, sim, alpha);
  fx.drawFlybys(r);
  fx.drawParticles(r, 1);

  // health bars (only when damaged)
  for (const e of s.enemies) {
    if (e.hp >= e.maxHp && e.shield >= e.maxShield) continue;
    const x = Math.round(e.px + (e.x - e.px) * alpha), y = Math.round(e.py + (e.y - e.py) * alpha);
    const h = e.air ? fh + AIR_ALT + 4 : A.enemies[e.type].h + 4;
    const w = ENEMIES[e.type].radius >= 12 ? 24 : 16;
    const bx = x - (w >> 1), by = y - h;
    r.rect(bx - 1, by - 1, w + 2, e.maxShield ? 8 : 4, '#101217');
    const f = e.hp / e.maxHp;
    r.rect(bx, by, Math.max(1, Math.round(w * f)), 2, f > 0.5 ? '#9ef08a' : f > 0.25 ? '#ffd27a' : '#ff8a7a');
    if (e.maxShield) r.rect(bx, by + 4, Math.round(w * (e.shield / e.maxShield)), 2, '#e2a6ff');
  }
  fx.drawParticles(r, 2);
}
