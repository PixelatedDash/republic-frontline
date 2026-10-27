// Runs the real GameScreen headless in Node on a @napi-rs/canvas, so the
// deck's mockup / readability / HUD slides are exactly the in-game frame.

import { createCanvas } from '@napi-rs/canvas';
import { Atlas } from '../../src/engine/atlas.js';
import { Renderer } from '../../src/engine/renderer.js';
import { buildAssets, towerIcon } from '../../src/engine/assets.js';
import { computeScale } from '../../src/engine/scaling.js';
import { UI } from '../../src/ui/ui.js';
import { GameScreen } from '../../src/ui/game-screen.js';
import { emptySave } from '../../src/save/schema.js';
import { canPlace } from '../../src/sim/sim.js';
import { TOWERS } from '../../src/data/towers.js';

const silent = { sfx() {}, playMusic() {}, setIntensity() {}, setVolumes() {} };

// cssW/cssH/dpr describe the screen being emulated (e.g. iPhone 12: 844x390 @3).
export function headlessApp(art, cssW, cssH, dpr) {
  const sc = computeScale(cssW, cssH, dpr);
  const canvas = createCanvas(sc.dw, sc.dh);
  const atlas = new Atlas(createCanvas);
  const app = {
    createCanvas, atlas, art, sc, audio: silent,
    save: emptySave(0),
    perf: { quality: 0, fps: 60, avg: 16.6, times: new Float32Array(240), i: 0, budget: 18 },
    input: { mouse: {}, shift: false },
    portraitBlocked: () => false,
    autosave() {}, finishLevel() {},
  };
  app.assets = buildAssets(art, atlas);
  app.renderer = new Renderer(canvas, atlas);
  app.renderer.resize(sc);
  app.ui = new UI(app.renderer);
  app.ui.layout(sc, { top: 0, right: 0, bottom: 0, left: 0 });
  app.makeTowerIcon = (type) => towerIcon(art, type);
  return { app, canvas };
}

export function startGame(app, opts) {
  const g = new GameScreen(app, opts);
  app.screen = g;
  g.tutorial = null;
  return g;
}

// Advance the game n frames at 60 fps (no input).
export function advance(g, n) {
  for (let i = 0; i < n; i++) g.update(1 / 60, []);
}

// Free buildable spots for a tower type, closest to the enemy path first.
export function spotsNearPath(sim, type) {
  const n = TOWERS[type].size;
  const pts = sim.level.paths[0].pts;
  const out = [];
  for (let ty = 0; ty < sim.level.h; ty++)
    for (let tx = 0; tx < sim.level.w; tx++) {
      if (!canPlace(sim, type, tx, ty).ok && canPlace(sim, type, tx, ty).why !== 'credits') continue;
      const cx = (tx + n / 2) * 32, cy = (ty + n / 2) * 32;
      let best = Infinity;
      for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, segDist(cx, cy, pts[i], pts[i + 1]));
      out.push({ tx, ty, d: best });
    }
  return out.sort((a, b) => a.d - b.d);
}

function segDist(x, y, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t));
}

export function png(canvas) {
  return canvas.toBuffer('image/png');
}
