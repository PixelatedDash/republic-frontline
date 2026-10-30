// Benchmark scene (spec §19, `?bench=1`): a Sandbox game on Mustafar 2 held
// at ~250 droids (ground + air), a dense tower line for projectiles, and the
// particle pool topped up to ~1500. Frame times after a warm-up are kept in
// window.__bench for tools/bench/run.mjs.

import { GameScreen } from './game-screen.js';
import { build, canPlace, sandboxSpawn } from '../sim/sim.js';
import { TILE } from '../data/levels/index.js';

const TARGET = { enemies: 250, projectiles: 400, particles: 1500 };
const MIX = ['trooper', 'rush', 'scuttler', 'commando', 'tank', 'shieldwalker', 'fighter', 'bomber', 'crawler', 'tactical'];
const TOWERS = ['rocket', 'flak', 'repeater', 'rifle', 'ion', 'artillery'];

export class BenchScreen extends GameScreen {
  constructor(app, { level = 'mustafar-2', warmup = 4, seconds = 30 } = {}) {
    super(app, { levelId: level, sandbox: true, seed: 7 });
    this.s.sandbox.invincible = true;
    this.hideHud = false;
    this.bench = { warmup, seconds, t: 0, times: [], quality: [], counts: [], done: false };
    globalThis.__bench = this.bench;
    // dense tower line along every path
    let i = 0;
    for (let ty = 0; ty < this.level.h && this.s.towers.length < 40; ty += 2)
      for (let tx = 0; tx < this.level.w && this.s.towers.length < 40; tx += 2) {
        const type = TOWERS[i % TOWERS.length];
        if (!canPlace(this.sim, type, tx, ty).ok) continue;
        const near = this.level.paths.some((p) => p.pts.some(([x, y]) => Math.abs(x - (tx + 0.5) * TILE) < 3 * TILE && Math.abs(y - (ty + 0.5) * TILE) < 3 * TILE));
        if (!near) continue;
        const r = build(this.sim, type, tx, ty);
        if (r.ok) i++;
      }
    for (const t of this.s.towers) t.tier = 't3';
    this.k = 0;
    // frame the busiest part of the map
    const mid = this.level.paths[0].pts[Math.floor(this.level.paths[0].pts.length / 2)];
    this.cam.centerOn(mid[0], mid[1]);
  }

  update(dt, events) {
    const s = this.s;
    const pending = s.pending.length;
    if (s.enemies.length + pending < TARGET.enemies) {
      sandboxSpawn(this.sim, MIX[this.k++ % MIX.length], Math.min(60, TARGET.enemies - s.enemies.length - pending));
      s.pending.forEach((p, i) => { p.at = Math.min(p.at, s.time + i * 0.04); });
    }
    // tower bolts land within a frame or two, so long-flight shells (1 dmg,
    // same code path as artillery) hold the projectile count near the target
    for (let n = 0; n < 40 && s.projectiles.length < TARGET.projectiles; n++) {
      const t = s.towers[(this.k + n) % s.towers.length];
      const e = s.enemies[(this.k * 7 + n) % Math.max(1, s.enemies.length)];
      if (!t || !e) break;
      const tx = e.x + (Math.random() - 0.5) * 60, ty = e.y + (Math.random() - 0.5) * 60;
      s.projectiles.push({
        id: s.nextId++, kind: 'shell', tower: t.id, target: 0, x: t.x, y: t.y - 8, px: t.x, py: t.y - 8, tx, ty, vx: 1, vy: 0,
        speed: 140, dmg: 1, dtype: 'explosive', splash: 24, air: false, crit: false, ttl: 6, bomb: 0, delay: 0,
        d0: Math.max(1, Math.hypot(tx - t.x, ty - t.y)), stun: 0, slow: 0, heavy: 0,
      });
    }
    // filler smoke keeps the particle pool near its cap
    const fx = this.fx, A = this.app.assets;
    const v = this.viewBounds();
    for (let n = 0; n < 60 && fx.particles.count < TARGET.particles; n++)
      fx.spawn(A.vfx.smoke, v.x0 + Math.random() * (v.x1 - v.x0), v.y0 + Math.random() * (v.y1 - v.y0), { fd: 0.09, vy: -8, life: 1.2 });
    super.update(dt, events);
    const b = this.bench;
    b.t += dt;
    if (b.t > b.warmup && !b.done) {
      b.times.push(dt * 1000);
      if (b.times.length % 30 === 0) {
        b.quality.push(this.app.perf.quality);
        b.counts.push({ enemies: s.enemies.length, projectiles: s.projectiles.length, particles: fx.particles.count });
      }
      if (b.t > b.warmup + b.seconds) b.done = true;
    }
  }
}
