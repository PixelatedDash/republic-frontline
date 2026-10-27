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
    this.aim = new Map(); // tower id -> displayed (smoothed) aim angle
    this.lightning = 0;
    this.timers = { lightning: 6, flyby: 12, artillery: 5, smoke: 0 };
    this.flybys = [];
    this.uiEvents = []; // consumed by the HUD (banners, leaks, income)
    this.planet = 'kamino';
    this.E = assets.enemies; // enemy sprite table (night-outlined on Umbara)
    this.P = null; // planet assets (props, boss)
    this.beams = []; // sniper tracers + ion arcs: { pts, t, life, kind }
    this.bossDoor = new Map(); // boss id -> seconds since its assembly door opened
    this.bossRise = new Map(); // boss id -> seconds of entrance cinematic watched (visual rise)
    this.erupt = 0; // Mustafar eruption glow
    this.storm = 0; // Geonosis dust storm haze
    this.rain = Array.from({ length: 220 }, () => ({ x: this.rng.range(0, 1), y: this.rng.range(0, 1), s: this.rng.range(0.8, 1.2) }));
  }

  get mult() {
    return QUALITY_MULT[this.quality] * (this.reduce ? 0.4 : 1);
  }

  spawn(frames, x, y, o = {}) {
    if (o.optional && this.rng.next() > this.mult) return null;
    const p = this.particles.acquire();
    if (!p) return null;
    p.frames = frames; p.fd = o.fd ?? 0.05; p.t = -(o.delay || 0); p.x = x; p.y = y;
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
          if (e.kind === 'snipe') {
            this.beams.push({ pts: [[e.x, e.y - 34], [e.tx, e.ty - (e.air ? 44 : 10)]], t: 0, life: 0.12, kind: 'snipe' });
            this.sfx('sniper', { vol: 0.8 });
          } else if (e.type === 'rifle') this.sfx('blaster', { vol: 0.7 });
          else if (e.type === 'repeater') this.sfx('repeater', { vol: 0.45 });
          else if (e.type === 'rocket') this.sfx('rocket', { vol: 0.8 });
          else if (e.type === 'artillery') { this.sfx('artillery', { vol: 0.8 }); this.sfx('whistle', { vol: 0.6 }); }
          else if (e.type === 'ion') this.sfx('ion', { vol: 0.6 });
          else if (e.kind === 'missile') this.sfx('whoosh');
          else this.sfx('flak', { vol: 0.5, pitch: 1.6 });
          break;
        case 'arc':
          this.towerFire.set(e.tower, 0);
          this.beams.push({ pts: e.pts, t: 0, life: 0.16, kind: 'arc', seed: this.rng.int(0, 999) });
          this.sfx('ion', { vol: 0.8, pitch: 0.8 });
          break;
        case 'pulse':
          this.towerFire.set(e.tower, 0);
          this.spawn(v.pulse, e.x, e.y - 6, { fd: 0.05, glow: v.glowIon, glowA: 0.8 });
          this.sfx('ion', { vol: 0.7, pitch: 0.6 });
          this.sfx('shieldHum', { vol: 0.5, pitch: 1.4 });
          break;
        case 'hit': {
          if (e.shield) {
            this.spawn(v.shield, e.x, e.y - (e.air ? 48 : 18), { fd: 0.045 });
            this.sfx('shieldHum', { vol: 0.6 });
          } else if (e.armor) {
            this.spawn(v.sparksMetal, e.x, e.y - (e.air ? 48 : 12), { fd: 0.04, optional: true });
            this.sfx('armorClank', { vol: 0.6 });
          } else if (e.dtype === 'blaster') {
            this.spawn(v.sparksRep, e.x + this.rng.range(-4, 4), e.y - (e.air ? 48 : 12) + this.rng.range(-4, 4), { fd: 0.035, glow: v.glowRep, glowA: 0.6 });
          }
          if (this.damageNumbers && e.dmg >= 1) {
            this.spawn(null, e.x, e.y - (e.air ? 60 : 30), { text: String(Math.round(e.dmg)) + (e.crit ? '!' : ''), color: e.crit ? '#ffd27a' : e.shield ? '#e2a6ff' : '#ffffff', vy: -28, life: 0.7, fade: true, layer: 2 });
          }
          break;
        }
        case 'explode': {
          const huge = e.size === 'l', big = e.size === 'm' || huge;
          const frames = huge ? v.expL : big ? v.expM : v.expS;
          this.spawn(frames, e.x, e.y - (e.air ? 44 : 8), { fd: 0.038, glow: v.glowFire, glowA: big ? 1 : 0.7, delay: e.delay || 0 });
          if (!e.air) {
            this.decal(v.scorch[huge ? 2 : big ? 1 : 0], e.x, e.y);
            this.spawn(v.smoke, e.x + this.rng.range(-6, 6), e.y - 12, { fd: 0.1, vy: -12, vx: this.rng.range(-6, 6), optional: true });
            for (let i = 0; i < (big ? 3 : 2); i++)
              this.spawn([v.debris[this.rng.int(0, v.debris.length - 1)]], e.x, e.y - 8, { vx: this.rng.range(-80, 80), vy: this.rng.range(-120, -50), ay: 360, life: 0.45, optional: true });
          }
          this.addShake(huge ? 5 : big ? 2 : 1);
          if (e.kind === 'flak') this.sfx('flak', { vol: 0.8 });
          else this.sfx(huge ? 'explosionL' : big ? 'explosionM' : 'explosionS', { vol: e.kind === 'bomblet' ? 0.4 : 0.8 });
          break;
        }
        case 'fizzle':
          this.spawn(v.sparksRep.slice(1), e.x, e.y, { fd: 0.04, optional: true });
          break;
        case 'death': {
          const c = this.corpses.acquire();
          if (c) {
            c.type = e.type; c.face = e.face; c.t = 0; c.x = e.x; c.y = e.y; c.air = e.air; c.boss = !!e.boss;
            c.alt = e.air ? (e.boss ? 60 : 44) : 0; c.vx = e.face * 50; c.life = e.boss ? (e.air ? 1.6 : 9) : e.air ? 0.7 : 5.5;
          }
          this.spawn(v.sparksMetal, e.x, e.y - (e.air ? 48 : 16), { fd: 0.05 });
          this.sfx('droidDeath', { vol: 0.6 });
          if (e.boss) {
            // a chain of big blasts over the hull, then the wreck burns
            for (let i = 0; i < 7; i++)
              this.spawn(i % 2 ? v.expL : v.expM, e.x + this.rng.range(-50, 50), e.y - (e.air ? 60 : 30) + this.rng.range(-26, 18), { fd: 0.05, glow: v.glowFire, delay: i * 0.18 });
            this.addShake(6);
            this.sfx('explosionL');
            setTimeout(() => this.sfx('explosionL', { vol: 0.8, pitch: 0.8 }), 450);
            this.uiEvents.push({ t: 'bossDown', type: e.type });
          }
          break;
        }
        case 'ventDown':
          this.spawn(v.expM, e.x, e.y, { fd: 0.04, glow: v.glowFire });
          this.addShake(3);
          this.sfx('explosionM');
          this.uiEvents.push({ t: 'income', text: 'VENT DESTROYED' });
          break;
        case 'bossSpawn':
          this.uiEvents.push({ t: 'boss', id: e.id, type: e.type, x: e.x, y: e.y });
          break;
        case 'bossPhase':
          this.uiEvents.push({ t: 'bossPhase', type: e.type, phase: e.phase });
          this.addShake(4);
          this.spawn(v.expM, e.x, e.y - 30, { fd: 0.05, glow: v.glowFire });
          this.sfx('explosionM');
          this.sfx('siren', { vol: 0.5 });
          break;
        case 'bossSpawnUnit':
          this.bossDoor.set(e.id, 0);
          break;
        case 'lightsOut':
          this.uiEvents.push({ t: 'lightsOut' });
          this.lightsOut = 0.6;
          this.sfx('shieldHum', { vol: 0.8, pitch: 0.4 });
          break;
        case 'drop':
          this.spawn(v.smoke, e.x, e.y, { fd: 0.08, optional: true });
          break;
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
          for (let i = 0; i < 4; i++) this.spawn(v.smoke, e.x + this.rng.range(-16, 16), e.y + 8, { fd: 0.07, vx: this.rng.range(-16, 16), vy: -8 });
          this.sfx(e.t === 'build' ? 'place' : 'upgrade');
          break;
        case 'sell':
          this.spawn(v.smoke, e.x, e.y + 4, { fd: 0.07 });
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
    // turrets turn toward their target at a fixed rate (visual only)
    if (sim) for (const t of sim.state.towers) {
      let a = this.aim.get(t.id);
      if (a === undefined) { this.aim.set(t.id, t.aim); continue; }
      let d = t.aim - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const step = 10 * Math.max(dt, 1 / 120);
      a += Math.abs(d) <= step ? d : Math.sign(d) * step;
      this.aim.set(t.id, a);
    }
    const ps = this.particles;
    for (let i = ps.count - 1; i >= 0; i--) {
      const p = ps.items[i];
      p.t += dt;
      if (p.t >= p.life) { ps.releaseAt(i); continue; }
      if (p.t < 0) continue;
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
        c.alt = Math.max(0, c.alt - 80 * dt);
        if (c.t >= c.life) {
          this.spawn(c.boss ? this.a.vfx.expL : this.a.vfx.expS, c.x, c.y - 4, { fd: 0.04, glow: this.a.vfx.glowFire });
          this.sfx(c.boss ? 'explosionL' : 'explosionS', { vol: 0.6 });
          if (c.boss) this.addShake(5);
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
            this.spawn(this.a.vfx.smoke, p.x, p.y, { fd: 0.06, optional: true, vy: -6 });
      }
    }
    for (let i = this.beams.length - 1; i >= 0; i--) if ((this.beams[i].t += dt) >= this.beams[i].life) this.beams.splice(i, 1);
    for (const [id, t] of this.bossDoor) this.bossDoor.set(id, t + dt);
    this.lightsOut = Math.max(0, (this.lightsOut || 0) - dt);
    this.shake = Math.max(0, this.shake - dt * 14);
    this.ambient(dt, view);
  }

  ambient(dt, view) {
    const T = this.timers, v = this.a.vfx;
    this.lightning = Math.max(0, this.lightning - dt * 2.5);
    this.erupt = Math.max(0, this.erupt - dt * 1.2);
    if ((T.lightning -= dt) <= 0) {
      if (this.planet === 'kamino') {
        T.lightning = this.rng.range(9, 22);
        this.lightning = 0.55;
        setTimeout(() => this.sfx('thunder', { vol: 0.7 }), this.rng.range(250, 900));
      } else if (this.planet === 'mustafar') {
        // distant eruptions: an orange glow and a low rumble
        T.lightning = this.rng.range(12, 26);
        this.erupt = 0.6;
        setTimeout(() => this.sfx('thunder', { vol: 0.6, pitch: 0.6 }), this.rng.range(100, 400));
      } else T.lightning = 30;
    }
    // Geonosis: dust storms build and fade
    if (this.planet === 'geonosis') this.storm = 0.5 + 0.5 * Math.sin((this.stormT = (this.stormT || 0) + dt) * 0.09);
    if (!view) return;
    // decorative only: skipped at the lowest quality levels
    if (this.quality < 2 && (T.flyby -= dt) <= 0) {
      T.flyby = this.rng.range(18, 40);
      const fromLeft = this.rng.next() < 0.5;
      const y = this.rng.range(view.y0 + 20, view.y1 - 20);
      const dir = fromLeft ? (this.rng.next() < 0.5 ? 0 : 15) : (this.rng.next() < 0.5 ? 8 : 7);
      const a = (dir / 16) * Math.PI * 2;
      this.flybys.push({ x: fromLeft ? view.x0 - 60 : view.x1 + 60, y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, dir, t: 0 });
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
      this.spawn(v.smokeBig, this.rng.range(view.x0, view.x1), this.rng.range(view.y0, view.y1), { fd: 0.55, vx: this.rng.range(8, 18), vy: -4, optional: true, fade: true, layer: 1 });
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

  // Corpses: flash -> recoil -> stagger -> falling -> collapsed -> debris (fades).
  drawCorpses(r) {
    const cs = this.corpses, E = this.a.enemies;
    const T = [0.05, 0.11, 0.2, 0.3, 0.6];
    for (let i = 0; i < cs.count; i++) {
      const c = cs.items[i];
      if (c.air) {
        const src = c.boss ? this.P.boss : this.E[c.type] || E.fighter;
        const set = src.death, h = src.size >> 1;
        const f = set[Math.min(set.length - 1, 1 + Math.floor(c.t / 0.1) % (set.length - 1))];
        r.spr(src.shadows[0], c.x - h + (c.alt >> 2), c.y - h + 4, 0.5);
        r.spr(c.t < 0.05 ? set[0] : f, c.x - h, c.y - h - c.alt);
        continue;
      }
      if (c.boss) {
        const B = this.P.boss, frames = B.death[c.face < 0 ? 'w' : 'e'];
        const f = c.t < 0.12 ? frames[0] : c.t < 2.5 ? frames[1] : frames[2];
        r.spr(f, c.x - (B.w >> 1), c.y - B.h + 1, c.t > c.life - 1.5 ? Math.max(0, (c.life - c.t) / 1.5) : 1);
        continue;
      }
      const set = this.E[c.type] || E[c.type];
      const frames = c.face < 0 ? set.deathW : set.death;
      let idx = 0;
      while (idx < T.length && c.t >= T[idx]) idx++;
      const a = c.t > c.life - 1 ? Math.max(0, c.life - c.t) : 1;
      r.spr(frames[Math.min(idx, frames.length - 1)], c.x - (set.w >> 1), c.y - set.h + 1, a);
    }
  }

  aimOf(t) {
    return this.aim.get(t.id) ?? t.aim;
  }

  // Damage numbers live in the UI layer so they stay legible at any zoom.
  drawTexts(r, toUI) {
    const ps = this.particles;
    for (let i = 0; i < ps.count; i++) {
      const p = ps.items[i];
      if (!p.text) continue;
      const u = toUI(p.x, p.y);
      r.text(p.text, u.x, u.y, p.color, { font: FONT5, align: 'center', shadow: '#101217' });
    }
  }

  drawParticles(r, layer = 0) {
    const ps = this.particles;
    for (let i = 0; i < ps.count; i++) {
      const p = ps.items[i];
      if (p.layer !== layer || p.t < 0) continue;
      const a = p.fade ? 1 - p.t / p.life : 1;
      if (p.text) continue;
      if (!p.frames) continue;
      const f = Array.isArray(p.frames) ? p.frames[Math.min(p.frames.length - 1, Math.floor(p.t / p.fd))] : p.frames;
      if (layer === 3) continue; // glow-only particles
      r.spr(f, p.x - (f.w >> 1), p.y - (f.h >> 1), a);
    }
  }

  // Additive pass: glows of particles + projectile glows, batched.
  drawGlows(r, sim, alpha = 1) {
    r.beginAdd();
    const ps = this.particles;
    for (let i = 0; i < ps.count; i++) {
      const p = ps.items[i];
      if (!p.glow || p.t < 0) continue;
      const k = 1 - p.t / p.life;
      r.spr(p.glow, p.x - (p.glow.w >> 1), p.y - (p.glow.h >> 1), Math.max(0, k * p.glowA));
    }
    if (sim) {
      const v = this.a.vfx;
      for (const p of sim.state.projectiles) {
        if (p.delay > 0) continue;
        const g = p.kind === 'bolt' ? v.glowRep : p.kind === 'flak' ? v.glowFire : null;
        const x = p.px + (p.x - p.px) * alpha, y = p.py + (p.y - p.py) * alpha;
        if (g) r.spr(g, x - (g.w >> 1), y - (g.h >> 1), p.kind === 'flak' ? 0.5 : 0.8);
      }
    }
    r.endAdd();
  }

  // Sniper tracers (white-cyan line) and ion arcs (jagged lightning), drawn
  // as runs of art pixels.
  drawBeams(r) {
    for (const b of this.beams) {
      const a = 1 - b.t / b.life;
      for (let i = 1; i < b.pts.length; i++) {
        const [x0, y0] = b.pts[i - 1], [x1, y1] = b.pts[i];
        const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / 2));
        let jx = 0, jy = 0;
        for (let k = 0; k <= n; k++) {
          const t = k / n;
          if (b.kind === 'arc' && k % 4 === 0) {
            const h = ((b.seed + i * 31 + k * 17) * 2654435761) >>> 0;
            jx = ((h & 7) - 3.5) * (k && k < n ? 1 : 0);
            jy = (((h >> 3) & 7) - 3.5) * (k && k < n ? 1 : 0);
          }
          const x = Math.round(x0 + (x1 - x0) * t + jx), y = Math.round(y0 + (y1 - y0) * t + jy);
          if (b.kind === 'snipe') { r.rect(x, y, 2, 1, '#e4f6ff', a); r.rect(x, y + 1, 2, 1, '#5aa8ff', a * 0.6); }
          else { r.rect(x, y, 2, 2, k % 3 ? '#9fd8ff' : '#ffffff', a); }
        }
      }
    }
  }

  // Lights for Umbara's darkness: a soft pool at every tower.
  drawLights(r, sim) {
    const v = this.a.vfx;
    r.beginAdd();
    for (const t of sim.state.towers) {
      const g = t.dim > 0 ? null : v.glowFire;
      if (g) r.spr(g, t.x - (g.w >> 1), t.y - 12 - (g.h >> 1), 0.35);
      r.spr(v.glowIon, t.x - (v.glowIon.w >> 1), t.y - 24 - (v.glowIon.h >> 1), t.dim > 0 ? 0.1 : 0.45);
    }
    r.endAdd();
  }

  // Weather in UI space: rain (Kamino), dust (Geonosis), leaves (Kashyyyk),
  // spores (Umbara), embers (Mustafar), plus the planet's screen tint.
  drawWeather(r, ui, time) {
    const { vw, vh } = ui;
    const n = Math.round(this.rain.length * (this.reduce ? 0.4 : [1, 0.8, 0.55, 0.35][this.quality]));
    const W = this.a.weather;
    const wrap = (v, m) => ((v % m) + m) % m;
    for (let i = 0; i < n; i++) {
      const d = this.rain[i];
      if (this.planet === 'kamino') {
        const y = wrap(d.y * (vh + 20) + time * 220 * d.s, vh + 20) - 10;
        const x = wrap(d.x * (vw + 40) - time * 60 * d.s, vw + 40) - 20;
        r.hi(this.a.vfx.rain, x, y, 0.8);
      } else if (this.planet === 'geonosis') {
        if (i % 2) continue;
        const x = wrap(d.x * (vw + 40) + time * (90 + 120 * this.storm) * d.s, vw + 40) - 20;
        const y = wrap(d.y * vh + Math.sin(time * 2 + i) * 6, vh);
        r.hi(W.dust[i % 3], x, y, 0.5 + 0.4 * this.storm);
      } else if (this.planet === 'kashyyyk') {
        if (i % 6) continue;
        const y = wrap(d.y * (vh + 20) + time * 18 * d.s, vh + 20) - 10;
        const x = wrap(d.x * (vw + 40) + Math.sin(time * 1.3 + i) * 14 + time * 6, vw + 40) - 20;
        r.hi(W.leaf[Math.floor(time * 4 + i) % W.leaf.length], x, y, 0.9);
      } else if (this.planet === 'umbara') {
        if (i % 4) continue;
        const y = wrap(d.y * (vh + 20) - time * 8 * d.s, vh + 20) - 10;
        const x = wrap(d.x * vw + Math.sin(time * 0.7 + i) * 10, vw);
        const glow = (Math.floor(time * 2 + i) % 4) < 2;
        r.hi(W.spore[(i % 2) * 2 + (glow ? 1 : 0)], x, y, glow ? 0.9 : 0.5);
      } else if (this.planet === 'mustafar') {
        if (i % 3) continue;
        const y = wrap(d.y * (vh + 20) - time * 26 * d.s, vh + 20) - 10;
        const x = wrap(d.x * vw + Math.sin(time * 1.7 + i) * 8, vw);
        r.hi(W.ember[i % 3], x, y, (Math.floor(time * 6 + i) % 3) ? 0.9 : 0.4);
      }
    }
    if (this.planet === 'kamino' && this.lightning > 0) r.rect(0, 0, vw, vh, '#dff4ff', this.lightning * 0.5);
    if (this.planet === 'geonosis') r.rect(0, 0, vw, vh, '#c08f63', 0.05 + 0.1 * this.storm);
    if (this.planet === 'kashyyyk') r.rect(0, 0, vw, vh, '#a7ad84', 0.06);
    if (this.planet === 'mustafar') r.rect(0, 0, vw, vh, '#ff6a1f', 0.03 + this.erupt * 0.25);
    if (this.lightsOut > 0) r.rect(0, 0, vw, vh, '#05040c', this.lightsOut * 0.6);
  }

  drawFlybys(r) {
    for (const f of this.flybys) {
      r.spr(this.a.flybyShadow[f.dir], f.x - 18 + 48, f.y - 18 + 120, 0.6);
      r.spr(this.a.flyby[f.dir], f.x - 18, f.y - 18);
    }
  }

  counts() {
    return { particles: this.particles.count, particleCap: this.particles.capacity, decals: this.decals.count, corpses: this.corpses.count, dropped: this.particles.dropped };
  }
}
