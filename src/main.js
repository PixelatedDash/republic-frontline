// App shell: canvas + integer scaling, boot (sprite generation behind a
// progress bar), screen routing, saving, settings, perf monitoring.

import { computeScale, safeInsets } from './engine/scaling.js';
import { Atlas } from './engine/atlas.js';
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { AudioSys } from './engine/audio.js';
import { buildAssets, towerIcon, planetAssets, nightEnemyAssets } from './engine/assets.js';
import { buildArtAsync, buildPlanetArt } from './art/index.js';
import { UI } from './ui/ui.js';
import { PerfMonitor } from './ui/debug.js';
import { GameScreen } from './ui/game-screen.js';
import { BootScreen, TitleScreen, BriefingScreen, ResultScreen, CampaignScreen } from './ui/screens.js';
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
app.toCampaign = () => app.setScreen(new CampaignScreen(app));

// Per-planet art (land tiles, props, boss) is built the first time a level
// of that planet opens, then kept. Umbara also gets night-outlined droids.
app.planets = {};
app.ensurePlanet = (planet) => {
  if (!app.planets[planet]) {
    const pa = buildPlanetArt(planet);
    app.planets[planet] = { tiles: pa.tiles, P: planetAssets(pa, app.atlas, planet === 'umbara') };
  }
  return app.planets[planet];
};
app.nightEnemies = () => (app.night ||= nightEnemyAssets(app.art, app.atlas));
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

app.makeTowerIcon = (type) => towerIcon(app.art, type);

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
  requestAnimationFrame(frame);
  if (!app.screen) return;
  try {
    if (app.screen instanceof GameScreen && app.save) app.save.stats.playSeconds += dtMs / 1000;
    app.screen.update(dtMs / 1000, events);
    app.screen.render();
  } catch (e) {
    // keep the loop alive; report each distinct error once
    const key = String(e && e.stack).slice(0, 200);
    if (!app.errors?.has(key)) { (app.errors ||= new Set()).add(key); console.error(e); }
  }
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
  // dev shortcuts: ?skip=1 (Kamino 1) or ?skip=<level-id>, ?unlock=1 opens every level
  const q = new URLSearchParams(location.search);
  app.unlockAll = !!q.get('unlock');
  const skip = q.get('skip');
  if (skip) app.startLevel(LEVELS[skip] ? skip : 'kamino-1', q.get('difficulty') || 'jedi');
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#ff8a7a;position:fixed;top:8px;left:8px;font:12px monospace;white-space:pre-wrap">${e.stack || e}</pre>`);
});

export { LEVELS };
