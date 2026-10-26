// Hidden debug overlay (Settings -> Debug): FPS, frame-time graph, entity
// and pool counts, dynamic quality level, scale info, draw calls.

import { FONT5 } from '../art/font.js';

export class PerfMonitor {
  constructor() {
    this.times = new Float32Array(240);
    this.i = 0;
    this.fps = 60;
    this.quality = 0;
    this.overT = 0;
    this.underT = 0;
    this.budget = 1000 / 60 + 1.5;
  }
  // dtMs: time between frames. Adjusts quality after 2 s over budget,
  // restores after 4 s of headroom.
  frame(dtMs) {
    this.times[this.i++ % this.times.length] = dtMs;
    const n = Math.min(this.i, 120);
    let sum = 0;
    for (let k = 1; k <= n; k++) sum += this.times[(this.i - k + this.times.length * 4) % this.times.length];
    this.avg = sum / n;
    this.fps = 1000 / this.avg;
    const dt = dtMs / 1000;
    if (this.avg > this.budget) { this.overT += dt; this.underT = 0; }
    else if (this.avg < 13) { this.underT += dt; this.overT = 0; }
    else { this.overT = 0; this.underT = 0; }
    if (this.overT > 2 && this.quality < 3) { this.quality++; this.overT = 0; }
    if (this.underT > 4 && this.quality > 0) { this.quality--; this.underT = 0; }
    return this.quality;
  }
}

export function drawDebug(r, perf, info, x, y) {
  const w = 120, h = 74;
  r.rect(x, y, w, h, '#05080b', 0.78);
  const line = (t, i, c = '#b8c4c3') => r.text(t, x + 3, y + 3 + i * 7, c, { font: FONT5, shadow: null });
  line(`FPS ${perf.fps.toFixed(0)}  AVG ${perf.avg?.toFixed(1)}MS  Q${perf.quality}`, 0, perf.avg > perf.budget ? '#ff8a7a' : '#9ef08a');
  line(`ENEMIES ${info.enemies}  PROJ ${info.projectiles}`, 1);
  line(`PARTICLES ${info.particles}/${info.particleCap}  DROP ${info.dropped}`, 2);
  line(`DECALS ${info.decals}  CORPSES ${info.corpses}`, 3);
  line(`S ${info.S}  W ${info.W}  VIEW ${info.vw}x${info.vh}  DPR ${info.dpr}`, 4);
  line(`DRAWS ${info.draws}  ATLAS ${info.atlas}  SPD ${info.speed}`, 5);
  // frame-time graph: 120 frames, 16.7 ms line
  const gy = y + h - 4;
  r.rect(x + 3, gy - 17, 114, 1, '#33404a');
  for (let k = 0; k < 114; k++) {
    const v = perf.times[(perf.i - 114 + k + perf.times.length * 4) % perf.times.length];
    const bh = Math.min(28, Math.round(v));
    r.rect(x + 3 + k, gy - bh, 1, bh, v > 17.5 ? '#ff8a7a' : '#38b8e0');
  }
}
