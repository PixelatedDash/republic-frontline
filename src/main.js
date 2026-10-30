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
import { BootScreen, TitleScreen, BriefingScreen, ResultScreen } from './ui/screens.js';
import { GalaxyScreen, TechScreen, MedalsScreen, ArchivesScreen, EndingScreen } from './ui/meta-screens.js';
import { planetFrames, cruiser, nebula } from './art/galaxy.js';
import { medal } from './art/medals.js';
import { mirrorX, toCanvas } from './art/bitmap.js';
import { ACHIEVEMENTS, awardAchievements } from './data/meta.js';
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
app.toGalaxy = (planet = null) => app.setScreen(new GalaxyScreen(app, { planet }));
app.toTech = () => app.setScreen(new TechScreen(app));
app.toMedals = () => app.setScreen(new MedalsScreen(app));
app.toArchives = () => app.setScreen(new ArchivesScreen(app));
app.saveProgress = () => app.storage.save(app.save);

// Screen transitions: a pixel iris closes over the old screen, the switch
// happens while fully covered, then it opens on the new one.
app.go = (fn) => {
  if (app.trans) return;
  app.trans = { t: 0, fn, done: false };
};
const TRANS = 0.22;
function drawTransition(dt) {
  const tr = app.trans;
  tr.t += dt;
  if (!tr.done && tr.t >= TRANS) { tr.done = true; tr.fn(); }
  const cover = tr.t < TRANS ? tr.t / TRANS : Math.max(0, 1 - (tr.t - TRANS) / TRANS);
  if (tr.t >= TRANS * 2) app.trans = null;
  const r = app.renderer, ui = app.ui;
  r.ui();
  const B = 8, cx = ui.vw / 2, cy = ui.vh / 2, maxD = Math.hypot(cx, cy);
  for (let y = 0; y < ui.vh; y += B)
    for (let x = 0; x < ui.vw; x += B) {
      const d = Math.hypot(x + B / 2 - cx, y + B / 2 - cy) / maxD;
      if (d > 1 - cover * 1.05) r.rect(x, y, B, B, '#05080b');
    }
}

// Galaxy map art: small globes for every planet at once, the big zoomed
// globe per planet on first use, the cruiser and the nebula (lazy).
app.ensureGalaxy = () => {
  if (app.galaxy) return app.galaxy;
  const add = (b) => Object.assign(app.atlas.add(b), { hi: 2 });
  const SMALL = 56, BIG = 128, N = 24;
  const small = {};
  for (const p of ['kamino', 'geonosis', 'kashyyyk', 'umbara', 'mustafar']) small[p] = planetFrames(p, SMALL, N).map(add);
  const bigCache = {};
  const cr = cruiser();
  app.galaxy = {
    small,
    big: (p) => (bigCache[p] ||= planetFrames(p, BIG, N).map(add)),
    // sizes in UI px follow the current scale
    get smallD() { return SMALL * app.sc.HIR; },
    get bigD() { return BIG * app.sc.HIR; },
    cruiser: { r: cr.map(add), l: cr.map((b) => add(mirrorX(b))) },
    get cruiserW() { return cr[0].w * app.sc.HIR; },
    get cruiserH() { return cr[0].h * app.sc.HIR; },
    nebula: toCanvas(nebula(360, 200), createCanvas),
  };
  return app.galaxy;
};
app.ensureMedals = () => {
  if (app.medals) return app.medals;
  const add = (b) => Object.assign(app.atlas.add(b), { hi: 2 });
  app.medals = {};
  for (const a of ACHIEVEMENTS) app.medals[a.id] = { on: add(medal(a.id, true)), off: add(medal(a.id, false)) };
  return app.medals;
};

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
app.startLevel = (levelId, difficulty, heroic = false) => {
  app.save.inProgress = null;
  app.storage.save(app.save);
  app.setScreen(new GameScreen(app, { levelId, difficulty, heroic }));
};
app.startSandbox = (levelId) => app.setScreen(new GameScreen(app, { levelId, sandbox: true }));
app.continueLevel = () => {
  const ip = app.save.inProgress;
  if (!ip) return;
  app.setScreen(new GameScreen(app, { snap: ip.snapshot }));
};
app.restartLevel = (sim) => app.go(() => (sim.state.sandbox ? app.startSandbox(sim.state.levelId) : app.startLevel(sim.state.levelId, sim.state.difficulty, sim.state.heroic)));
app.quitLevel = (sim) => {
  app.storage.flush();
  app.go(() => (sim?.state.sandbox ? app.toGalaxy(LEVELS[sim.state.levelId].planet) : app.toTitle()));
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
  const lv = sv.levels[s.levelId] || { stars: 0, heroic: false, bestLives: 0, wins: 0, master: false };
  const firstFinale = won && s.levelId === 'mustafar-4' && !lv.wins;
  if (won) {
    lv.stars = Math.max(lv.stars, stars);
    lv.wins += 1;
    lv.bestLives = Math.max(lv.bestLives, s.lives);
    if (s.heroic) lv.heroic = true; // +1 star, once per level
    else if (s.difficulty === 'master') lv.master = true;
    sv.stats.wins += 1;
  } else sv.stats.losses += 1;
  sv.levels[s.levelId] = lv;
  for (const [k, n] of Object.entries(s.stats.kills)) sv.stats.kills[k] = (sv.stats.kills[k] || 0) + n;
  sv.stats.creditsEarned += s.stats.creditsEarned;
  sv.inProgress = null;
  const st = s.stats;
  const medals = awardAchievements(sv, { won, levelId: s.levelId, difficulty: s.difficulty, heroic: !!s.heroic, built: st.built, sold: st.sold, earlyCalls: st.earlyCalls, maxDepots: st.maxDepots, t4Built: st.t4Built, ventsDown: st.ventsDown });
  app.storage.save(sv, 0);
  const result = () => app.setScreen(new ResultScreen(app, {
    won, stars, levelId: s.levelId, difficulty: s.difficulty, heroic: !!s.heroic, lives: s.lives, maxLives: s.maxLives,
    kills: s.stats.killsTotal, leaked: s.stats.leaked, credits: s.stats.creditsEarned, seconds: s.time,
    wave: s.waveIndex, totalWaves: s.totalWaves, leakedTypes: s.stats.leakedTypes, medals,
  }));
  app.go(() => (firstFinale ? app.setScreen(new EndingScreen(app, result)) : result()));
};

app.makeTowerIcon = (type) => towerIcon(app.art, type);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    app.storage.flush();
    if (app.screen instanceof GameScreen && app.screen.s.phase === 'running') app.screen.paused = true;
    else app.storage.flush();
  }
});

// ---------------------------------------------------------------- loop ----
let last = performance.now();
function frame(t) {
  const dtMs = Math.min(100, t - last);
  last = t;
  app.perf.frame(dtMs);
  let events = app.input.drain();
  requestAnimationFrame(frame);
  if (!app.screen) return;
  try {
    if (app.screen instanceof GameScreen && app.save) app.save.stats.playSeconds += dtMs / 1000;
    if (app.trans) events = [];
    app.screen.update(dtMs / 1000, events);
    app.screen.render();
    if (app.trans) drawTransition(dtMs / 1000);
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
  if (skip) app.startLevel(LEVELS[skip] ? skip : 'kamino-1', q.get('difficulty') || 'jedi', !!q.get('heroic'));
  if (q.get('sandbox')) app.startSandbox(LEVELS[q.get('sandbox')] ? q.get('sandbox') : 'geonosis-1');
  if (q.get('screen') === 'galaxy') app.toGalaxy(q.get('planet'));
  if (q.get('screen') === 'tech') app.toTech();
  if (q.get('screen') === 'medals') app.toMedals();
  if (q.get('screen') === 'archives') app.toArchives();
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#ff8a7a;position:fixed;top:8px;left:8px;font:12px monospace;white-space:pre-wrap">${e.stack || e}</pre>`);
});

export { LEVELS };
