// App shell: canvas + integer scaling, boot (sprite generation behind a
// progress bar), screen routing, saving, settings, perf monitoring.

import { computeScale, safeInsets } from './engine/scaling.js';
import { Atlas } from './engine/atlas.js';
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { AudioSys } from './engine/audio.js';
import { buildAssets } from './engine/assets.js';
import { buildArtAsync } from './art/index.js';
import { composeRifle, composeTurret } from './art/towers.js';
import { bounds, crop } from './art/bitmap.js';
import { UI } from './ui/ui.js';
import { PerfMonitor } from './ui/debug.js';
import { GameScreen } from './ui/game-screen.js';
import { BootScreen, TitleScreen, BriefingScreen, ResultScreen } from './ui/screens.js';
import { Storage } from './save/storage.js';
import { snapshot } from './sim/sim.js';
import { starsFor } from './save/schema.js';
import { LEVELS } from './data/levels/index.js';

const canvas = document.getElementById('game');
const createCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

const app = {
  canvas,
  createCanvas,
  atlas: new Atlas(createCanvas),
  input: new Input(canvas),
  audio: new AudioSys(),
  perf: new PerfMonitor(),
  storage: new Storage(),
  save: null,
  screen: null,
  lastDifficulty: 'jedi',
};
app.renderer = new Renderer(canvas, app.atlas);
app.ui = new UI(app.renderer);
app.ui.audio = app.audio;
window.__rf = app; // debugging handle

const portraitMq = matchMedia('(orientation: portrait) and (pointer: coarse)');
app.portraitBlocked = () => portraitMq.matches;

function resize() {
  const vv = window.visualViewport;
  const w = vv ? vv.width : innerWidth, h = vv ? vv.height : innerHeight;
  app.sc = computeScale(w, h, window.devicePixelRatio || 1);
  app.renderer.resize(app.sc);
  app.ui.layout(app.sc, safeInsets(document.getElementById('safe'), app.sc.dpr, app.sc.S));
  app.screen?.resize?.();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
window.visualViewport?.addEventListener('resize', resize);
resize();

app.input.onFirstGesture(() => app.audio.unlock());

app.setScreen = (s) => {
  app.screen = s;
  s.resize?.();
};

app.applySettings = () => {
  const s = app.save.settings;
  app.audio.setVolumes({ master: s.master, music: s.music, sfx: s.sfx, muted: s.muted });
  app.storage.save(app.save);
};

app.toTitle = () => app.setScreen(new TitleScreen(app));
app.toBriefing = (levelId) => app.setScreen(new BriefingScreen(app, levelId));
app.startLevel = (levelId, difficulty) => {
  app.save.inProgress = null;
  app.storage.save(app.save);
  app.setScreen(new GameScreen(app, { levelId, difficulty }));
};
app.continueLevel = () => {
  const ip = app.save.inProgress;
  if (!ip) return;
  app.setScreen(new GameScreen(app, { snap: ip.snapshot }));
};
app.restartLevel = (sim) => app.startLevel(sim.state.levelId, sim.state.difficulty);
app.quitLevel = () => {
  app.storage.flush();
  app.toTitle();
};

// Mid-level save at the end of every wave: the full sim incl. RNG state.
app.autosave = (sim) => {
  app.save.inProgress = { levelId: sim.state.levelId, difficulty: sim.state.difficulty, heroic: sim.state.heroic, updatedAt: Date.now(), snapshot: snapshot(sim) };
  app.storage.save(app.save);
};

app.finishLevel = (sim) => {
  const s = sim.state;
  const won = s.phase === 'won';
  const sv = app.save;
  const stars = starsFor(won, s.lives, s.maxLives, s.stats.leaked);
  const lv = sv.levels[s.levelId] || { stars: 0, heroic: false, bestLives: 0, wins: 0 };
  if (won) {
    lv.stars = Math.max(lv.stars, stars);
    lv.wins += 1;
    lv.bestLives = Math.max(lv.bestLives, s.lives);
    sv.stats.wins += 1;
  } else sv.stats.losses += 1;
  sv.levels[s.levelId] = lv;
  for (const [k, n] of Object.entries(s.stats.kills)) sv.stats.kills[k] = (sv.stats.kills[k] || 0) + n;
  sv.stats.creditsEarned += s.stats.creditsEarned;
  sv.inProgress = null;
  app.storage.save(sv, 0);
  app.setScreen(new ResultScreen(app, {
    won, stars, levelId: s.levelId, difficulty: s.difficulty, lives: s.lives, maxLives: s.maxLives,
    kills: s.stats.killsTotal, leaked: s.stats.leaked, credits: s.stats.creditsEarned, seconds: s.time,
    wave: s.waveIndex, totalWaves: s.totalWaves, leakedTypes: s.stats.leakedTypes,
  }));
};

// Build-bar icon: the tier-1 tower, cropped to fit a slot.
app.makeTowerIcon = (type) => {
  const bm = type === 'rifle' ? composeRifle(app.art.towers.rifle.t1, 'S') : composeTurret(app.art.towers[type].t1, 3);
  const b = bounds(bm);
  const w = Math.min(26, b.w), h = Math.min(20, b.h);
  return crop(bm, b.x + ((b.w - w) >> 1), b.y + b.h - h, w, h);
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    app.storage.flush();
    if (app.screen instanceof GameScreen && app.screen.s.phase === 'running') app.screen.paused = true;
  }
});

// ---------------------------------------------------------------- loop ----
let last = performance.now();
function frame(t) {
  const dtMs = Math.min(100, t - last);
  last = t;
  app.perf.frame(dtMs);
  const events = app.input.drain();
  if (app.screen) {
    if (app.screen instanceof GameScreen && app.save) app.save.stats.playSeconds += dtMs / 1000;
    app.screen.update(dtMs / 1000, events);
    app.screen.render();
  }
  requestAnimationFrame(frame);
}

async function boot() {
  const bootScreen = new BootScreen(app);
  app.setScreen(bootScreen);
  requestAnimationFrame(frame);
  await app.storage.init();
  app.save = await app.storage.load();
  app.art = await buildArtAsync((p) => { bootScreen.progress = p * 0.9; });
  await new Promise((r) => setTimeout(r, 0));
  app.assets = buildAssets(app.art, app.atlas);
  bootScreen.progress = 1;
  bootScreen.ready = true;
  app.applySettings();
  // dev shortcuts: ?skip=1 jumps straight into Kamino 1
  const q = new URLSearchParams(location.search);
  if (q.get('skip')) app.startLevel('kamino-1', q.get('difficulty') || 'jedi');
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#ff8a7a;position:fixed;top:8px;left:8px;font:12px monospace;white-space:pre-wrap">${e.stack || e}</pre>`);
});

export { LEVELS };
