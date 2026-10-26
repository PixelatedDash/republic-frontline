// Visual effects driven by sim events. Visual-only randomness (own RNG).
// Everything is pooled: particles, decals, corpses, damage numbers.
// Dynamic quality scales particle spawn rates and decoration; it never
// touches gameplay. Reduce Effects disables shake and cuts particles.

import { Pool } from '../engine/pool.js';
import { Rng } from '../engine/rng.js';
import { FONT5 } from '../art/font.js';

const QUALITY_MULT = [1, 0.7, 0.45, 0.25];

function makeParticle() {
  return { frames: null, fd: 0.05, t: 0, life: 0, x: 0, y: 0, vx: 0, vy: 0, ay: 0, fade: false, glow: null, glowA: 1, loop: false, layer: 0, text: null, color: '#fff', drag: 0 };
}

export class Fx {
  constructor(assets, audio) {
    this.a = assets;
    this.audio = audio;
    this.rng = new Rng(4242);
    this.particles = new Pool(1500, makeParticle);
    this.decals = new Pool(60, () => ({ ref: null, x: 0, y: 0, t: 0, life: 0 }));
    this.corpses = new Pool(220, () => ({ e: null, frames: null, t: 0, x: 0, y: 0, air: false, alt: 0, vx: 0, life: 0 }));
    this.shake = 0;
    this.quality = 0;
    this.reduce = false;
    this.damageNumbers = false;
    this.towerFire = new Map(); // tower id -> seconds since last shot
    this.lightning = 0;
    this.timers = { lightning: 6, flyby: 12, artillery: 5, smoke: 0 };
    this.flybys = [];
    this.uiEvents = []; // consumed by the HUD (banners, leaks, income)
    this.rain = Array.from({ length: 140 }, () => ({ x: this.rng.range(0, 1), y: this.rng.range(0, 1), s: this.rng.range(0.8, 1.2) }));
  }

  get mult() {
    return QUALITY_MULT[this.quality] * (this.reduce ? 0.4 : 1);
  }

  spawn(frames, x, y, o = {}) {
    if (o.optional && this.rng.next() > this.mult) return null;
    const p = this.particles.acquire();
    if (!p) return null;
    p.frames = frames; p.fd = o.fd ?? 0.05; p.t = 0; p.x = x; p.y = y;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.ay = o.ay || 0; p.drag = o.drag || 0;
    p.life = o.life ?? (Array.isArray(frames) ? frames.length * p.fd : 0.3);
    p.fade = !!o.fade; p.glow = o.glow || null; p.glowA = o.glowA ?? 1; p.loop = !!o.loop;
    p.layer = o.layer || 0; p.text = o.text || null; p.color = o.color || '#ffffff';
    return p;
  }

  addShake(px) {
    if (!this.reduce) this.shake = Math.min(6, Math.max(this.shake, px));
  }

  decal(ref, x, y) {
    const d = this.decals.acquireOrOldest();
    d.ref = ref; d.x = x; d.y = y; d.t = 0; d.life = 40;
  }

  sfx(name, o) {
    this.audio && this.audio.sfx(name, o);
  }

  // ------------------------------------------------------------- events --
  consume(events, sim) {
    const v = this.a.vfx;
    for (const e of events) {
      switch (e.t) {
        case 'shot':
          this.towerFire.set(e.tower, 0);
          if (e.type === 'rifle') this.sfx('blaster', { vol: 0.7 });
          else if (e.type === 'rocket') this.sfx('rocket', { vol: 0.8 });
          else if (e.kind === 'missile') this.sfx('whoosh');
          else this.sfx('flak', { vol: 0.5, pitch: 1.6 });
          break;
        case 'hit': {
          if (e.shield) {
            this.spawn(v.shield, e.x, e.y - (e.air ? 24 : 8), { fd: 0.05 });
            this.sfx('shieldHum', { vol: 0.6 });
          } else if (e.armor) {
            this.spawn(v.sparksMetal, e.x, e.y - (e.air ? 24 : 6), { fd: 0.04, optional: true });
            this.sfx('armorClank', { vol: 0.6 });
          } else if (e.dtype === 'blaster') {
            this.spawn(v.sparksRep, e.x + this.rng.range(-2, 2), e.y - (e.air ? 24 : 6) + this.rng.range(-2, 2), { fd: 0.04, glow: v.glowRep, glowA: 0.6 });
          }
          if (this.damageNumbers && e.dmg >= 1) {
            this.spawn(null, e.x, e.y - 14, { text: String(Math.round(e.dmg)) + (e.crit ? '!' : ''), color: e.crit ? '#ffd27a' : e.shield ? '#e2a6ff' : '#ffffff', vy: -14, life: 0.7, fade: true, layer: 2 });
          }
          break;
        }
        case 'explode': {
          const big = e.size === 'm';
          const frames = big ? v.expM : v.expS;
          this.spawn(frames, e.x, e.y - (e.air ? 22 : 4), { fd: 0.045, glow: v.glowFire, glowA: big ? 1 : 0.7 });
          if (!e.air) {
            this.decal(v.scorch[big ? 1 : 0], e.x, e.y);
            this.spawn(v.smoke, e.x + this.rng.range(-3, 3), e.y - 6, { fd: 0.12, vy: -6, vx: this.rng.range(-3, 3), optional: true });
            for (let i = 0; i < (big ? 3 : 2); i++)
              this.spawn([v.debris[this.rng.int(0, v.debris.length - 1)]], e.x, e.y - 4, { vx: this.rng.range(-40, 40), vy: this.rng.range(-60, -25), ay: 180, life: 0.45, optional: true });
          }
          this.addShake(big ? 2 : 1);
          if (e.kind === 'flak') this.sfx('flak', { vol: 0.8 });
          else this.sfx(big ? 'explosionM' : 'explosionS', { vol: e.kind === 'bomblet' ? 0.4 : 0.8 });
          break;
        }
        case 'fizzle':
          this.spawn(v.sparksRep.slice(1), e.x, e.y, { fd: 0.04, optional: true });
          break;
        case 'death': {
          const c = this.corpses.acquire();
          if (c) {
            c.type = e.type; c.face = e.face; c.t = 0; c.x = e.x; c.y = e.y; c.air = e.air;
            c.alt = e.air ? 22 : 0; c.vx = e.face * 25; c.life = e.air ? 0.7 : 5.5;
          }
          this.spawn(v.sparksMetal, e.x, e.y - 8, { fd: 0.05 });
          this.sfx('droidDeath', { vol: 0.6 });
          break;
        }
        case 'leak':
          this.uiEvents.push({ t: 'leak', lives: e.lives });
          this.sfx('leak');
          break;
        case 'wave':
          this.uiEvents.push({ t: 'banner', text: `WAVE ${e.n}`, sub: e.n === e.total ? 'FINAL WAVE' : null });
          this.sfx('horn');
          break;
        case 'waveEnd':
          if (e.income > 0) this.uiEvents.push({ t: 'income', text: `+${e.income} INTEREST` });
          break;
        case 'earlyCall':
          if (e.bonus > 0) this.uiEvents.push({ t: 'income', text: `+${e.bonus} EARLY CALL` });
          break;
        case 'build':
        case 'upgrade':
          for (let i = 0; i < 3; i++) this.spawn(v.smoke, e.x + this.rng.range(-8, 8), e.y + 4, { fd: 0.08, vx: this.rng.range(-8, 8), vy: -4 });
          this.sfx(e.t === 'build' ? 'place' : 'upgrade');
          break;
        case 'sell':
          this.spawn(v.smoke, e.x, e.y + 2, { fd: 0.08 });
          this.sfx('sell');
          break;
        case 'deploy':
          this.sfx('shieldHum', { vol: 0.4, pitch: 0.7 });
          break;
        case 'victory':
          this.sfx('victory');
          break;
        case 'defeat':
          this.sfx('defeat');
          break;
      }
    }
  }

  // ------------------------------------------------------------- update --
  update(dt, sim, view) {
    for (const [id, t] of this.towerFire) this.towerFire.set(id, t + dt);
    const ps = this.particles;
    for (let i = ps.count - 1; i >= 0; i--) {
      const p = ps.items[i];
      p.t += dt;
      if (p.t >= p.life) { ps.releaseAt(i); continue; }
      p.vy += p.ay * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    const ds = this.decals;
    for (let i = ds.count - 1; i >= 0; i--) {
      const d = ds.items[i];
      d.t += dt;
      if (d.t >= d.life) ds.releaseAt(i);
    }
    const cs = this.corpses;
    for (let i = cs.count - 1; i >= 0; i--) {
      const c = cs.items[i];
      c.t += dt;
      if (c.air) {
        c.x += c.vx * dt;
        c.alt = Math.max(0, c.alt - 40 * dt);
        if (c.t >= c.life) {
          this.spawn(this.a.vfx.expS, c.x, c.y - 2, { fd: 0.05, glow: this.a.vfx.glowFire });
          this.sfx('explosionS', { vol: 0.6 });
        }
      }
      if (c.t >= c.life) cs.releaseAt(i);
    }
    // projectile trails
    if (sim) {
      this.trailT = (this.trailT || 0) + dt;
      if (this.trailT > 0.05) {
        this.trailT = 0;
        for (const p of sim.state.projectiles)
          if ((p.kind === 'rocket' || p.kind === 'missile') && p.delay <= 0)
            this.spawn(this.a.vfx.smoke, p.x, p.y, { fd: 0.07, optional: true, vy: -3 });
      }
    }
    this.shake = Math.max(0, this.shake - dt * 14);
    this.ambient(dt, view);
  }

  ambient(dt, view) {
    const T = this.timers, v = this.a.vfx;
    this.lightning = Math.max(0, this.lightning - dt * 2.5);
    if ((T.lightning -= dt) <= 0) {
      T.lightning = this.rng.range(9, 22);
      this.lightning = 0.55;
      setTimeout(() => this.sfx('thunder', { vol: 0.7 }), this.rng.range(250, 900));
    }
    if (!view) return;
    // decorative only: skipped at the lowest quality levels
    if (this.quality < 2 && (T.flyby -= dt) <= 0) {
      T.flyby = this.rng.range(18, 40);
      const fromLeft = this.rng.next() < 0.5;
      const y = this.rng.range(view.y0 + 20, view.y1 - 20);
      const dir = fromLeft ? (this.rng.next() < 0.5 ? 0 : 15) : (this.rng.next() < 0.5 ? 8 : 7);
      const a = (dir / 16) * Math.PI * 2;
      this.flybys.push({ x: fromLeft ? view.x0 - 30 : view.x1 + 30, y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, dir, t: 0 });
    }
    for (let i = this.flybys.length - 1; i >= 0; i--) {
      const f = this.flybys[i];
      f.x += f.vx * dt; f.y += f.vy * dt; f.t += dt;
      if (f.t > 8) this.flybys.splice(i, 1);
    }
    if (this.quality < 3 && (T.artillery -= dt) <= 0) {
      T.artillery = this.rng.range(5, 12);
      const edge = this.rng.next() < 0.5 ? view.mapX0 - 10 : view.mapX1 + 10;
      this.spawn([v.glowFire], edge, this.rng.range(view.mapY0, view.mapY1), { life: 0.35, fade: true, glow: v.glowFire, glowA: 0.8, optional: true, layer: 3 });
    }
    if (this.quality < 2 && (T.smoke -= dt) <= 0) {
      T.smoke = this.rng.range(0.6, 1.4);
      this.spawn(v.smokeBig, this.rng.range(view.x0, view.x1), this.rng.range(view.y0, view.y1), { fd: 0.6, vx: this.rng.range(4, 9), vy: -2, optional: true, fade: true, layer: 1 });
    }
  }

  // ------------------------------------------------------------- draw ----
  drawDecals(r) {
    const ds = this.decals;
    for (let i = 0; i < ds.count; i++) {
      const d = ds.items[i];
      const a = d.t > d.life - 3 ? (d.life - d.t) / 3 : 1;
      r.spr(d.ref, d.x - (d.ref.w >> 1), d.y - (d.ref.h >> 1), a);
    }
  }

  // Corpses: death frames (flash -> stagger -> collapse -> debris that fades).
  drawCorpses(r) {
    const cs = this.corpses, E = this.a.enemies;
    for (let i = 0; i < cs.count; i++) {
      const c = cs.items[i];
      if (c.air) {
        const set = E.fighter.death;
        const f = set[Math.min(set.length - 1, 1 + Math.floor(c.t / 0.12) % (set.length - 1))];
        r.spr(E.fighter.shadows[0], c.x - 10 + (c.alt >> 2), c.y - 10 + 2, 0.5);
        r.spr(c.t < 0.05 ? set[0] : f, c.x - 10, c.y - 10 - c.alt);
        continue;
      }
      const set = E[c.type];
      const frames = c.face < 0 ? set.deathW : set.death;
      const idx = c.t < 0.06 ? 0 : c.t < 0.22 ? 1 : c.t < 0.5 ? 2 : 3;
      const a = c.t > c.life - 1 ? Math.max(0, c.life - c.t) : 1;
      r.spr(frames[idx], c.x - (set.w >> 1), c.y - set.h + 1, a);
    }
  }

  drawParticles(r, layer = 0) {
    const ps = this.particles;
    for (let i = 0; i < ps.count; i++) {
      const p = ps.items[i];
      if (p.layer !== layer) continue;
      const a = p.fade ? 1 - p.t / p.life : 1;
      if (p.text) {
        r.text(p.text, p.x, p.y, p.color, { font: FONT5, align: 'center', shadow: '#101217' });
        continue;
      }
      if (!p.frames) continue;
      const f = Array.isArray(p.frames) ? p.frames[Math.min(p.frames.length - 1, Math.floor(p.t / p.fd))] : p.frames;
      if (layer === 3) continue; // glow-only particles
      r.spr(f, p.x - (f.w >> 1), p.y - (f.h >> 1), a);
    }
  }

  // Additive pass: glows of particles + projectile glows, batched.
  drawGlows(r, sim) {
    r.beginAdd();
    const ps = this.particles;
    for (let i = 0; i < ps.count; i++) {
      const p = ps.items[i];
      if (!p.glow) continue;
      const k = 1 - p.t / p.life;
      r.spr(p.glow, p.x - (p.glow.w >> 1), p.y - (p.glow.h >> 1), Math.max(0, k * p.glowA));
    }
    if (sim) {
      const v = this.a.vfx;
      for (const p of sim.state.projectiles) {
        if (p.delay > 0) continue;
        const g = p.kind === 'bolt' ? v.glowRep : p.kind === 'flak' ? v.glowFire : null;
        if (g) r.spr(g, p.x - (g.w >> 1), p.y - (g.h >> 1), p.kind === 'flak' ? 0.5 : 0.8);
      }
    }
    r.endAdd();
  }

  drawFlybys(r) {
    for (const f of this.flybys) {
      r.spr(this.a.flybyShadow[f.dir], f.x - 9 + 24, f.y - 9 + 60, 0.6);
      r.spr(this.a.flyby[f.dir], f.x - 9, f.y - 9);
    }
  }

  counts() {
    return { particles: this.particles.count, particleCap: this.particles.capacity, decals: this.decals.count, corpses: this.corpses.count, dropped: this.particles.dropped };
  }
}
