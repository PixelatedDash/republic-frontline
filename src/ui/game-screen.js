// The battle screen: runs the sim at a fixed 60 Hz (speed = more steps per
// frame, never a bigger step), routes input to the HUD or the world, draws
// the world and the HUD, and autosaves the full sim at every wave end.

import { createSim, restore, snapshot, step, startWave, build, upgrade, sell, setTargeting, canPlace, wavePreview, TARGET_MODES, towerCenter, upgradeCost, towerStats, tierOptions, sandboxSpawn } from '../sim/sim.js';
import { simTech, HEROIC_TOWERS, TECH_BY_ID } from '../data/meta.js';
import { TOWERS, nextTiers, towerDps } from '../data/towers.js';
import { ENEMIES } from '../data/enemies.js';
import { DT, DIFFICULTY } from '../data/rules.js';
import { Camera } from '../engine/camera.js';
import { buildGroundLayers } from '../engine/assets.js';
import { sellValue } from '../sim/rules.js';
import { Fx } from '../fx/fx.js';
import { drawWorld, drawTower, towerSpritePos } from './world.js';
import { COLORS } from './ui.js';
import { Tutorial } from './tutorial.js';
import { drawSettings } from './settings.js';
import { drawDebug } from './debug.js';
import { FONT5 } from '../art/font.js';
import { TILE } from '../data/levels/index.js';

const BUILD_KEYS = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i'];
const SLOT_TYPES = ['rifle', 'rocket', 'flak', 'repeater', 'artillery', 'ion', 'sharpshooter', 'depot'];
const EDGE = { kamino: '#1f2c33', geonosis: '#43291d', kashyyyk: '#2a2016', umbara: '#0c0b15', mustafar: '#131011' };
const MODE_LABEL = { first: 'FIRST', last: 'LAST', strongest: 'STRONGEST', closest: 'CLOSEST', air: 'AIR PRIORITY' };

export class GameScreen {
  constructor(app, { levelId = 'kamino-1', difficulty = 'jedi', heroic = false, sandbox = false, snap = null, seed = null }) {
    this.app = app;
    this.sim = snap ? restore(snap) : createSim({
      levelId, difficulty, heroic, sandbox, seed: seed ?? ((Date.now() & 0xffff) + 1),
      allowedTowers: heroic ? HEROIC_TOWERS[levelId] : null,
      tech: sandbox ? null : simTech(app.save),
    });
    this.sandbox = !!this.sim.state.sandbox;
    this.spawner = { type: 'trooper', count: 10 };
    this.level = this.sim.level;
    // per-planet art: ground tiles, props, boss; Umbara droids get night outlines
    const planet = (this.planet = this.level.def.planet);
    const pa = app.ensurePlanet(planet);
    const land = planet !== 'kamino';
    this.P = pa.P;
    this.ground = buildGroundLayers(this.level, land ? pa.tiles : app.art.tiles.kamino, app.createCanvas, land);
    this.cam = new Camera(this.level.w * TILE, this.level.h * TILE);
    this.fx = new Fx(app.assets, app.audio);
    this.fx.planet = planet;
    this.fx.P = this.P;
    this.E = this.fx.E = planet === 'umbara' ? app.nightEnemies() : app.assets.enemies;
    this.cine = null; // boss entrance cinematic
    this.speed = 1;
    this.paused = false;
    this.acc = 0;
    this.placing = null;
    this.selId = 0;
    this.menu = null;
    this.banner = null;
    this.floaters = [];
    this.livesFlash = 0;
    this.creditsShown = this.sim.state.credits;
    this.sellConfirm = 0;
    this.time = 0;
    this.endT = 0;
    this.drag = null;
    this.pinch = null;
    this.touchIds = new Map();
    const def = this.level.def;
    this.tutorial = def.tutorial && !snap && !app.save.levels[def.id]?.wins ? new Tutorial(def.tutorialSteps) : null;
    this.tutPaused = false;
    this.resize();
    // start view: centre on the path entry for the first wave
    const p0 = this.level.paths[0].pts[1];
    this.cam.centerOn(p0[0] - 120, p0[1] + 80);
    app.audio.playMusic(this.s.enemies.some((e) => e.boss) ? 'boss' : planet);
  }

  resize() {
    this.cam.setViewport(this.app.sc);
    this.icons = null; // slot icon sizes depend on the scale
  }

  get s() {
    return this.sim.state;
  }

  selected() {
    return this.selId ? this.s.towers.find((t) => t.id === this.selId) : null;
  }

  // ------------------------------------------------------------- input ---
  handleInput(events) {
    const ui = this.app.ui;
    for (const e of events) {
      if (e.type === 'key') { this.key(e); continue; }
      if (e.type === 'wheel') {
        if (!this.menu) this.cam.zoomTo(this.cam.W + (e.dy > 0 ? -1 : 1), e.x, e.y);
        continue;
      }
      if (e.type === 'down') {
        if (ui.down(e.id, e.x, e.y)) continue;
        if (this.menu) continue;
        this.cam.stop();
        this.touchIds.set(e.id, { x: e.x, y: e.y, sx: e.x, sy: e.y, ptype: e.ptype, button: e.button, moved: false, t: performance.now(), vx: 0, vy: 0 });
        if (this.touchIds.size === 2) {
          const [a, b] = [...this.touchIds.values()];
          this.pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), W0: this.cam.W, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
          this.drag = null;
        } else if (this.placing && e.ptype !== 'mouse') {
          this.placing.dragging = true;
          this.moveGhost(e.x, e.y, true);
        }
        continue;
      }
      if (e.type === 'move') {
        if (ui.move(e.id, e.x, e.y)) continue;
        const p = this.touchIds.get(e.id);
        if (!p) {
          if (e.ptype === 'mouse' && this.placing && !this.menu) this.moveGhost(e.x, e.y, false);
          continue;
        }
        const dx = e.x - p.x, dy = e.y - p.y;
        const now = performance.now(), dtm = Math.max(1, now - p.t) / 1000;
        p.vx = p.vx * 0.6 + (dx / dtm) * 0.4; p.vy = p.vy * 0.6 + (dy / dtm) * 0.4; p.t = now;
        p.x = e.x; p.y = e.y;
        if (Math.hypot(e.x - p.sx, e.y - p.sy) > 8 * this.app.sc.dpr) p.moved = true;
        if (this.pinch && this.touchIds.size >= 2) {
          const [a, b] = [...this.touchIds.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          this.cam.panBy(cx - this.pinch.cx, cy - this.pinch.cy);
          this.pinch.cx = cx; this.pinch.cy = cy;
          const target = Math.round(this.pinch.W0 * (d / this.pinch.d0));
          this.cam.zoomTo(target, cx, cy);
        } else if (this.placing && (p.ptype !== 'mouse' || this.placing.dragging)) {
          this.moveGhost(e.x, e.y, p.ptype !== 'mouse');
        } else if (p.moved) {
          this.cam.panBy(dx, dy);
        }
        continue;
      }
      if (e.type === 'up' || e.type === 'cancel') {
        if (ui.up(e.id, e.x, e.y)) continue;
        const p = this.touchIds.get(e.id);
        this.touchIds.delete(e.id);
        if (this.touchIds.size < 2) this.pinch = null;
        if (!p || e.type === 'cancel' || this.menu) continue;
        if (this.placing) {
          if (p.ptype === 'mouse') {
            if (e.button === 2) this.placing = null;
            else if (!p.moved) this.confirmPlace();
          } else this.placing.dragging = false;
          continue;
        }
        if (!p.moved && e.button !== 2) this.tapWorld(e.x, e.y);
        else if (p.moved && !this.pinch && performance.now() - p.t < 80) this.cam.fling(p.vx, p.vy);
      }
    }
  }

  key(e) {
    const k = e.key.toLowerCase();
    if (this.menu) {
      if (k === 'escape') this.menu = this.menu === 'settings' ? 'pause' : null;
      return;
    }
    if (k === ' ') this.paused = !this.paused;
    else if (k >= '1' && k <= (this.sandbox ? '5' : '3') && k.length === 1) { this.speed = Number(k); this.paused = false; }
    else if (k === 'escape') {
      if (this.placing) this.placing = null;
      else if (this.selId) this.selId = 0;
      else this.menu = 'pause';
    } else if (k === 'enter' || k === 'n') this.callWave();
    else if (BUILD_KEYS.includes(k)) this.pick(SLOT_TYPES[BUILD_KEYS.indexOf(k)]);
    else if (k === 'z' && this.selected()) this.doUpgrade(tierOptions(this.s, this.selected())[0]);
  }

  moveGhost(dx, dy, touch) {
    const n = TOWERS[this.placing.type].size;
    // touch: ghost sits above the finger so the finger never hides it
    const off = touch ? 56 * this.app.sc.dpr : 0;
    const w = this.cam.toWorld(dx, dy - off);
    this.placing.tx = Math.round(w.x / TILE - n / 2);
    this.placing.ty = Math.round(w.y / TILE - n / 2);
    this.placing.touch = touch;
    this.placing.valid = canPlace(this.sim, this.placing.type, this.placing.tx, this.placing.ty).ok;
  }

  pick(type) {
    if (!type || !this.s.allowedTowers.includes(type)) return;
    this.selId = 0;
    const n = TOWERS[type].size;
    const c = this.cam.toWorld(this.app.sc.dw / 2, this.app.sc.dh / 2);
    this.placing = { type, tx: Math.round(c.x / TILE - n / 2), ty: Math.round(c.y / TILE - n / 2), valid: false, touch: false, dragging: false };
    const m = this.app.input.mouse;
    if (m.inside && m.type === 'mouse') this.moveGhost(m.x, m.y, false);
    else {
      this.placing.touch = true;
      this.placing.valid = canPlace(this.sim, type, this.placing.tx, this.placing.ty).ok;
    }
  }

  confirmPlace() {
    const p = this.placing;
    if (!p) return;
    const r = build(this.sim, p.type, p.tx, p.ty);
    if (!r.ok) {
      this.app.audio.sfx('leak', { vol: 0.5, pitch: 1.6 });
      return;
    }
    this.tutorial?.signal('built');
    this.tutorial?.signal(`built:${p.type}`);
    if (!this.app.input.shift) this.placing = null;
  }

  tapWorld(dx, dy) {
    const w = this.cam.toWorld(dx, dy);
    const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
    const t = this.s.towers.find((q) => tx >= q.tx && ty >= q.ty && tx < q.tx + TOWERS[q.type].size && ty < q.ty + TOWERS[q.type].size);
    this.selId = t ? t.id : 0;
    this.sellConfirm = 0;
  }

  callWave() {
    const r = startWave(this.sim);
    if (r.ok) {
      this.tutorial?.signal('waveStarted');
      this.paused = false;
    }
  }

  doUpgrade(tier) {
    const t = this.selected();
    if (!t || !tier) return;
    if (upgrade(this.sim, t.id, tier).ok) this.tutorial?.signal('upgraded');
    else this.app.audio.sfx('leak', { vol: 0.5, pitch: 1.6 });
  }

  // ------------------------------------------------------------- update --
  update(dt, events) {
    this.time += dt;
    // boss entrance: ~3 s letterboxed pan to the boss, sim paused, tap to skip
    if (this.cine) {
      const c = this.cine;
      c.t += dt;
      const k = Math.min(1, c.t / 1.1), ease = 1 - (1 - k) ** 3;
      this.cam.centerOn(c.fx + (c.x - c.fx) * ease, c.fy + (c.y - c.fy) * ease);
      this.fx.bossRise.set(c.id, c.t);
      if (c.t > 3.2 || events.some((e) => e.type === 'down' || e.type === 'key')) this.cine = null;
      events = [];
    }
    this.handleInput(events);
    this.cam.update(dt);
    const portrait = this.app.portraitBlocked();
    const tut = this.tutorial?.update();
    // mid-wave tutorial messages pause the action until handled
    this.tutPaused = !!(tut && tut.when && this.s.phase === 'running' && !tut.id.startsWith('upgrade') && !tut.id.startsWith('target'));
    const running = !this.paused && !this.menu && !portrait && !this.tutPaused && !this.cine && (this.s.phase === 'running');
    if (running) {
      this.acc += dt * this.speed;
      const maxSteps = 4 * this.speed;
      let n = 0;
      while (this.acc >= DT && n < maxSteps) {
        step(this.sim);
        this.acc -= DT;
        n++;
      }
      if (n >= maxSteps) this.acc = 0; // drop the backlog instead of spiralling
    }
    const alpha = running ? this.acc / DT : 1;
    this.alpha = Math.min(1, alpha);
    this.processEvents();
    this.fx.reduce = this.app.save.settings.reduceEffects;
    this.fx.damageNumbers = this.app.save.settings.damageNumbers;
    this.fx.quality = this.app.perf.quality;
    this.fx.update(running ? dt * this.speed : 0, this.sim, this.viewBounds());
    // shake in whole device pixels
    const sh = this.fx.shake;
    this.cam.shakeX = sh > 0.3 ? Math.round((Math.random() * 2 - 1) * sh * this.cam.W * 0.5) : 0;
    this.cam.shakeY = sh > 0.3 ? Math.round((Math.random() * 2 - 1) * sh * this.cam.W * 0.5) : 0;
    // ticking credits + timers
    const d = this.s.credits - this.creditsShown;
    this.creditsShown += Math.abs(d) < 1 ? d : Math.sign(d) * Math.max(1, Math.abs(d) * 8 * dt);
    this.livesFlash = Math.max(0, this.livesFlash - dt);
    this.sellConfirm = Math.max(0, this.sellConfirm - dt);
    if (this.banner) { this.banner.t += dt; if (this.banner.t > 2.4) this.banner = null; }
    for (const f of this.floaters) f.t += dt;
    this.floaters = this.floaters.filter((f) => f.t < 1.6);
    // music layers follow the size of the fight
    const n = this.s.enemies.length;
    this.app.audio.setIntensity(n > 30 ? 1 : n > 12 ? 0.5 : n > 0 ? 0.2 : 0);
    if (this.selId && !this.selected()) this.selId = 0;
    if (this.s.phase === 'won' || this.s.phase === 'lost') {
      this.endT += dt;
      if (this.endT > 1.8 && !this.ended) {
        this.ended = true;
        this.app.finishLevel(this.sim);
      }
    }
  }

  processEvents() {
    const evs = this.sim.events;
    if (!evs.length) return;
    const un = this.app.save.unlocks;
    for (const e of evs) {
      if ((e.t === 'spawn' || e.t === 'build') && !un[`seen:${e.type}`] && e.type !== 'vent') un[`seen:${e.type}`] = true;
      if (e.t === 'waveEnd') {
        this.tutorial?.signal(`waveEnded:${e.n}`);
        if (!this.sandbox) this.app.autosave(this.sim);
      }
      if (e.t === 'wave') {
        const pv = wavePreview(this.sim);
        if (pv) for (const g of pv.groups) this.tutorial?.signal(`preview:${g.type}`);
      }
      if (e.t === 'countdown') {
        const pv = wavePreview(this.sim);
        if (pv) for (const g of pv.groups) this.tutorial?.signal(`preview:${g.type}`);
      }
    }
    this.fx.consume(evs, this.sim);
    evs.length = 0;
    for (const u of this.fx.uiEvents) {
      if (u.t === 'banner') this.banner = { text: u.text, sub: u.sub, t: 0 };
      if (u.t === 'leak') this.livesFlash = 0.6;
      if (u.t === 'income') this.floaters.push({ text: u.text, t: 0 });
      if (u.t === 'boss') {
        const c0 = this.cam.toWorld(this.app.sc.dw / 2, this.app.sc.dh / 2);
        this.cine = { t: 0, id: u.id, type: u.type, x: u.x, y: u.y - 40, fx: c0.x, fy: c0.y };
        this.app.audio.sfx('siren');
        this.app.audio.playMusic('boss');
        this.fx.addShake(3);
      }
      if (u.t === 'bossPhase') this.banner = { text: `PHASE ${u.phase}`, sub: ENEMIES[u.type].name.toUpperCase(), t: 0 };
      if (u.t === 'bossDown') {
        this.banner = { text: 'BOSS DESTROYED', sub: ENEMIES[u.type].name.toUpperCase(), t: 0 };
        this.app.audio.playMusic(this.planet);
      }
      if (u.t === 'lightsOut') this.floaters.push({ text: 'LIGHTS OUT: RANGE -20%', t: 0 });
    }
    this.fx.uiEvents.length = 0;
  }

  viewBounds() {
    const a = this.cam.toWorld(0, 0), b = this.cam.toWorld(this.app.sc.dw, this.app.sc.dh);
    return { x0: a.x, y0: a.y, x1: b.x, y1: b.y, mapX0: 0, mapY0: 0, mapX1: this.level.w * TILE, mapY1: this.level.h * TILE };
  }

  // ------------------------------------------------------------- render --
  render() {
    const app = this.app, r = app.renderer, ui = app.ui;
    r.begin(EDGE[this.planet] || '#1f2c33'); // colour beyond the map edge
    const sel = this.selected();
    drawWorld({
      r, A: app.assets, P: this.P, E: this.E, sim: this.sim, fx: this.fx, cam: this.cam, ground: this.ground, alpha: this.alpha ?? 1,
      sel, placing: this.placing, settings: app.save.settings, waterFrame: Math.floor(this.time * 6), time: this.time,
    });
    // Umbara: perpetual night; towers cast pools of light, energy glows on top
    if (this.planet === 'umbara') {
      r.ui();
      r.rect(0, 0, ui.vw, ui.vh, '#05040c', 0.42);
      r.world(this.cam);
      this.fx.drawLights(r, this.sim);
      this.fx.drawGlows(r, this.sim, this.alpha ?? 1);
      this.fx.drawBeams(r);
    }
    if (this.placing) {
      const p = this.placing;
      const t = { type: p.type, tier: 't1', tx: p.tx, ty: p.ty, aim: Math.PI / 2, id: -1 };
      drawTower(r, app.assets, t, 9, 0.65, t.aim, this.time);
    }
    // weather (screen space, world-independent)
    r.ui();
    this.fx.drawTexts(r, (x, y) => { const sp = this.cam.toScreen(x, y); return ui.toUI(sp.x, sp.y); });
    this.fx.drawWeather(r, ui, this.time);
    ui.beginFrame();
    if (this.cine) this.drawCinematic();
    else if (!this.hideHud) this.drawHud();
    ui.endFrame();
  }

  // Letterboxed boss entrance: bars slide in, name card, siren.
  drawCinematic() {
    const r = this.app.renderer, ui = this.app.ui, c = this.cine;
    const k = Math.min(1, c.t / 0.35), out = c.t > 2.8 ? Math.min(1, (c.t - 2.8) / 0.4) : 0;
    const bar = Math.round(ui.vh * 0.14 * k * (1 - out));
    r.rect(0, 0, ui.vw, bar, '#05080b');
    r.rect(0, ui.vh - bar, ui.vw, bar, '#05080b');
    ui.block('cine', 0, 0, ui.vw, ui.vh);
    if (c.t > 0.5 && out < 1) {
      const d = ENEMIES[c.type];
      const a = Math.min(1, (c.t - 0.5) / 0.3);
      r.rect(0, ui.vh * 0.62 - 4, ui.vw, 34, '#05080b', 0.6 * a * (1 - out));
      if (Math.floor(c.t * 4) % 2 || c.t > 1.2) r.textBig('WARNING', ui.vw / 2, ui.vh * 0.62 - 2, COLORS.bad, 1);
      r.textBig(d.name.toUpperCase(), ui.vw / 2, ui.vh * 0.62 + 10, COLORS.text, 2);
      r.text(d.lore.toUpperCase(), ui.vw / 2, ui.vh - bar + 4 - 14, COLORS.dim, { align: 'center' });
    }
    r.text('TAP TO SKIP', ui.vw - 8, bar ? bar - 10 : 4, COLORS.faint, { align: 'right' });
  }

  // Big boss HP bar with name, shield bar and phase pips.
  drawBossBar(top) {
    const r = this.app.renderer, ui = this.app.ui;
    const b = this.s.enemies.find((e) => e.boss);
    if (!b) return;
    const d = ENEMIES[b.type];
    const w = Math.min(200, Math.floor(ui.vw * 0.36)), x = Math.round((ui.vw - w) / 2), y = top + ui.T + 14;
    r.panel(x - 4, y - 3, w + 8, 22);
    r.text(d.name.toUpperCase(), x, y, COLORS.bad);
    const n = (d.phases?.length || 0) + 1;
    for (let i = 0; i < n; i++) r.rect(x + w - 6 - i * 7, y + 1, 5, 5, i < n - (b.phase || 0) ? COLORS.bad : '#33404a');
    r.rect(x, y + 9, w, 5, '#101217');
    r.rect(x, y + 9, Math.max(1, Math.round(w * b.hp / b.maxHp)), 5, '#ff5a3c');
    if (b.maxShield > 0) r.rect(x, y + 15, Math.round(w * b.shield / b.maxShield), 2, '#e2a6ff');
  }

  drawHud() {
    const app = this.app, r = app.renderer, ui = app.ui, A = app.assets, s = this.s;
    const T = ui.T, ins = ui.ins, vw = ui.vw, vh = ui.vh;
    const L = 4 + ins.left, R = vw - 4 - ins.right, top = 4 + ins.top, bot = vh - 4 - ins.bottom;
    this.drawBossBar(top);

    // --- resources
    const rw = 156;
    r.panel(L, top, rw, 17);
    ui.block('hud:res', L, top, rw, 17);
    r.spr(A.icons.lives, L + 5, top + 4);
    const lf = this.livesFlash > 0 && Math.floor(this.livesFlash * 10) % 2 === 0;
    r.text(String(s.lives), L + 17, top + 5, lf ? COLORS.bad : COLORS.text);
    r.spr(A.icons.credits, L + 40, top + 4);
    r.text(String(Math.round(this.creditsShown)), L + 52, top + 5, COLORS.warn);
    r.spr(A.icons.wave, L + 88, top + 4);
    r.text(this.sandbox ? 'SANDBOX' : `WAVE ${Math.max(1, s.waveIndex)}/${s.totalWaves}`, L + 100, top + 5, this.sandbox ? COLORS.accent : COLORS.text);
    this.floaters.forEach((f, i) => r.text(f.text, L + 52, top + 20 + i * 9 - f.t * 6, COLORS.good, {}));

    // --- next-wave preview + start / call early
    const pv = this.sandbox ? null : wavePreview(this.sim);
    const py = top + 20 + (this.floaters.length ? 0 : 0);
    if (this.sandbox) this.drawSpawner(L, py);
    if (pv && s.phase !== 'won' && s.phase !== 'lost') {
      const pw = rw;
      let tallest = 0;
      for (const g of pv.groups) { const set = A.enemies[g.type]; if (set) tallest = Math.max(tallest, (set.walk ? set.h : set.size * 0.8) * app.sc.HIR); }
      const ph = Math.max(30, Math.round(14 + tallest + 2));
      r.panel(L, py, pw, ph, { title: true });
      ui.block('hud:prev', L, py, pw, ph);
      const label = s.phase === 'setup' ? `WAVE ${pv.index + 1}` : s.countdown > 0 ? `NEXT WAVE ${pv.index + 1} IN ${Math.ceil(s.countdown)}` : `NEXT: WAVE ${pv.index + 1}`;
      r.text(label, L + 6, py + 4, COLORS.accent);
      let x = L + 6;
      for (const g of pv.groups) {
        if (ENEMIES[g.type].boss) {
          r.text('BOSS', x, py + ph - 11, Math.floor(this.time * 3) % 2 ? COLORS.bad : COLORS.warn);
          x += 28;
          continue;
        }
        const set = A.enemies[g.type];
        const ref = set.walk ? set.walk[1] : set.frames[0][0];
        const k = app.sc.HIR;
        const w = (set.walk ? set.w : set.size) * k, hh = (set.walk ? set.h : set.size * 0.8) * k;
        const clipW = Math.min(w, 16);
        r.hi(ref, x - Math.round((w - clipW) / 2), py + ph - 3 - Math.round(hh));
        r.text(`x${g.count}`, x + clipW, py + ph - 9, COLORS.dim, { font: FONT5 });
        x += clipW + 14;
        if (x > L + pw - 30) break;
      }
      const warn = [pv.air && ['air', 'AIR'], pv.armor && ['armor', 'ARMOR'], pv.shield && ['shield', 'SHIELD']].filter(Boolean);
      warn.forEach(([ic, txt], i) => {
        r.spr(A.icons[ic], L + pw - 9 - i * 10, py + 3);
      });
      const canCall = s.phase === 'setup' || (s.countdown > 0);
      if (canCall) {
        const bonus = s.phase === 'setup' ? 0 : Math.floor(30 * (s.countdown / Math.max(1, s.countdownTotal)) * Math.max(0.3, 1 - (s.waveIndex / Math.max(1, s.totalWaves - 1)) * 0.7));
        const lbl = s.phase === 'setup' ? 'START' : `CALL +${bonus}`;
        const bw = Math.max(T + 18, r.measure(lbl) + 14);
        const hl = this.tutorial?.current()?.highlight === 'start' && Math.floor(this.time * 3) % 2;
        if (ui.button('hud:call', L + pw + 3, py, bw, T, { label: lbl, style: hl ? 'good' : 'accent' })) this.callWave();
      }
    }

    // --- speed / pause / menu
    const speeds = this.sandbox ? 5 : 3;
    const bx = R - (speeds + 2) * (T + 2) + 2;
    if (ui.button('hud:pause', bx, top, T, T, { icon: this.paused ? A.icons.play : A.icons.pause, active: this.paused })) this.paused = !this.paused;
    for (let i = 1; i <= speeds; i++)
      if (ui.button(`hud:spd${i}`, bx + i * (T + 2), top, T, T, { label: `${i}x`, active: this.speed === i && !this.paused })) { this.speed = i; this.paused = false; }
    if (ui.button('hud:menu', bx + (speeds + 1) * (T + 2), top, T, T, { icon: A.icons.menu })) this.menu = 'pause';
    if (s.heroic) r.text(`HEROIC: ${s.allowedTowers.length} TOWER TYPES`, R, top + T + 4, COLORS.warn, { align: 'right' });
    if (this.paused && !this.menu) r.text('PAUSED - YOU CAN STILL BUILD', this.sandbox ? Math.max(vw / 2, L + 160 + 70) : vw / 2, top + T + 16, COLORS.warn, { align: 'center' });

    // --- build bar
    const slots = SLOT_TYPES.map((t) => (TOWERS[t] && s.allowedTowers.includes(t) ? t : null));
    const BT = Math.max(T, 30);
    const sw = BT + 3;
    const total = slots.length * sw + 5;
    const x0 = Math.round((vw - total) / 2), y0 = bot - BT - 4;
    r.panel(x0, y0 - 3, total, BT + 7);
    ui.block('hud:bar', x0, y0 - 3, total, BT + 7);
    slots.forEach((type, i) => {
      const x = x0 + 4 + i * sw;
      if (!type) {
        ui.button(`hud:slot${i}`, x, y0, BT, BT, { icon: A.icons.lock, disabled: true });
        return;
      }
      const cost = towerStats(s, type, 't1').cost;
      const afford = s.credits >= cost;
      const active = this.placing?.type === type;
      const hl = this.tutorial?.current()?.highlight === `build:${type}` && Math.floor(this.time * 3) % 2;
      if (ui.button(`hud:slot${i}`, x, y0, BT, BT, { active, style: hl ? 'good' : 'normal' })) {
        if (active) this.placing = null;
        else this.pick(type);
      }
      const ic = this.slotIcon(type);
      const dy = active ? 1 : 0;
      r.hi(ic.ref, x + ((BT - ic.w) >> 1), y0 + Math.max(1, BT - 9 - ic.h) + dy, afford ? 1 : 0.45);
      r.rect(x + 2, y0 + BT - 10 + dy, BT - 4, 7, '#0c1116', 0.75);
      r.text(this.sandbox ? 'FREE' : String(cost), x + BT / 2, y0 + BT - 9 + dy, afford ? COLORS.warn : COLORS.bad, { font: FONT5, align: 'center', shadow: null });
      if (BT >= 26) r.text(BUILD_KEYS[i].toUpperCase(), x + 3, y0 + 2 + dy, COLORS.faint, { font: FONT5, shadow: null });
    });

    // --- placement confirm (touch)
    if (this.placing && this.placing.touch) {
      const n = TOWERS[this.placing.type].size;
      const sp = this.cam.toScreen((this.placing.tx + n) * TILE, this.placing.ty * TILE);
      const p = ui.toUI(sp.x, sp.y);
      let cx = Math.round(p.x + 6);
      if (cx + T > R) cx = Math.round(ui.toUI(this.cam.toScreen(this.placing.tx * TILE, 0).x, 0).x - T - 6);
      const cy = Math.round(Math.min(Math.max(top + T + 4, p.y - 4), y0 - 2 * T - 10));
      if (ui.button('hud:ok', cx, cy, T, T, { icon: A.icons.check, style: 'good', disabled: !this.placing.valid })) this.confirmPlace();
      if (ui.button('hud:no', cx, cy + T + 4, T, T, { icon: A.icons.cross, style: 'bad' })) this.placing = null;
    }
    if (this.placing) {
      const st = TOWERS[this.placing.type];
      const msg = this.placing.touch ? `DRAG TO PLACE ${st.short}` : `CLICK TO PLACE ${st.short} - RIGHT CLICK / ESC CANCELS`;
      r.text(msg, vw / 2, top + T + 6, COLORS.text, { align: 'center' });
    }

    // --- info panel
    const sel = this.selected();
    if (sel) this.drawInfo(sel, R, top + T + 4, y0 - 8);

    // --- tutorial
    const tut = this.tutorial?.current();
    if (tut && !this.menu) this.drawTutorial(tut, L, y0 - 8);

    // --- banner
    if (this.banner) {
      const b = this.banner;
      const k = Math.min(1, b.t / 0.25), out = b.t > 2 ? (b.t - 2) / 0.4 : 0;
      const x = Math.round(-120 + (vw / 2 + 120) * (1 - (1 - k) ** 3) + out * (vw / 2 + 140));
      const y = Math.round(vh * 0.3);
      r.rect(0, y - 4, vw, b.sub ? 27 : 18, '#05080b', 0.55 * (1 - out));
      r.textBig(b.text, x, y - 2, COLORS.text, 2);
      if (b.sub) r.text(b.sub, x, y + 14, COLORS.warn, { align: 'center' });
    }

    // --- end state
    if (s.phase === 'won' || s.phase === 'lost') {
      r.rect(0, 0, vw, vh, '#05080b', Math.min(0.5, this.endT * 0.4));
      r.text(s.phase === 'won' ? 'SECTOR HELD' : 'LINE BROKEN', vw / 2, vh / 2 - 4, s.phase === 'won' ? COLORS.good : COLORS.bad, { align: 'center' });
    }

    if (this.tutPaused && !this.menu) r.text('TACTICAL PAUSE', vw / 2, top + T + 6, COLORS.accent, { align: 'center' });

    // --- debug overlay
    if (app.save.settings.debug) {
      const c = this.fx.counts();
      drawDebug(r, app.perf, {
        ...c, enemies: s.enemies.length, projectiles: s.projectiles.length, S: app.sc.S, W: this.cam.W, vw, vh,
        dpr: app.sc.dpr.toFixed(2), draws: r.drawCalls, atlas: app.atlas.pages.length, speed: this.paused ? 0 : this.speed,
      }, L, top + 54);
    }

    // --- menus
    if (this.menu === 'pause') this.drawPause();
    else if (this.menu === 'settings') { if (drawSettings(ui, app)) this.menu = 'pause'; }
  }

  slotIcon(type) {
    this.icons = this.icons || {};
    if (!this.icons[type]) {
      const A = this.app.assets;
      // rifle: front-wall + troopers crop; turrets: base + head
      const r = this.app.renderer;
      const key = `slotIcon:${type}`;
      const ref = r.cached(key, () => this.app.makeTowerIcon(type));
      const k = this.app.sc.HIR;
      this.icons[type] = { ref, w: Math.round(ref.w * k), h: Math.round(ref.h * k) };
    }
    return this.icons[type];
  }

  drawInfo(t, R, y, maxY) {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, s = this.s;
    const def = TOWERS[t.type], st = towerStats(s, t.type, t.tier);
    const nexts = nextTiers(t.tier);
    const open = tierOptions(s, t);
    const dps = (tier) => towerDps(t.type, tier, towerStats(s, t.type, tier));
    const w = 170;
    const x = R - w;
    const rowH = 9;
    const branch = nexts.length > 1;
    const avail = maxY - y;
    // diff rows shrink on short screens so every button keeps a full tap size
    const fixed = 14 + 3 * rowH + 2 + T + 6 + T + 8;
    const diffRows = branch || !nexts.length ? 0 : Math.max(1, Math.min(4, Math.floor((avail - fixed - (rowH + 1) - (T + 4)) / rowH)));
    let h = fixed + (branch ? rowH + T + 4 : nexts.length ? rowH + 1 + diffRows * rowH + 2 : 12);
    h = Math.min(h, avail);
    r.panel(x, y, w, h, { title: true });
    ui.block('info:bg', x, y, w, h);
    r.text(st.name.toUpperCase(), x + 6, y + 4, COLORS.accent);
    const tierN = t.tier.startsWith('t4') ? 4 : Number(t.tier[1]);
    for (let i = 0; i < 4; i++) r.rect(x + w - 34 + i * 7, y + 6, 5, 5, i < tierN ? COLORS.accent : '#33404a');
    let cy = y + 16;
    const row = (k, v, c = COLORS.text) => { r.text(k, x + 6, cy, COLORS.dim); r.text(v, x + 64, cy, c); cy += rowH; };
    if (!st.rate) {
      // Supply Depot: income or the relay aura instead of weapon stats
      row('INCOME', st.income ? `+${st.income} / WAVE` : 'NONE', st.income ? COLORS.good : COLORS.dim);
      row('AURA', st.aura ? `+${Math.round(st.aura.rate * 100)}% FIRE RATE` : 'NONE', st.aura ? COLORS.good : COLORS.dim);
      row('DEPOTS', `${s.towers.filter((o) => o.type === 'depot').length} / 3`);
      cy += 2 + T + 6;
    } else {
      row('DPS', dps(t.tier).toFixed(1));
      row('DAMAGE', def.dtype.toUpperCase());
      row('HITS AIR', st.air ? 'YES' : 'NO', st.air ? COLORS.good : COLORS.bad);
      r.text(`KILLS ${t.kills}`, x + w - 6, y + 16, COLORS.faint, { align: 'right' });
      // targeting (pulse domes hit everything in range: no mode)
      cy += 2;
      if (st.pulse) r.text('HITS ALL IN RANGE', x + w / 2, cy + ((T - 7) >> 1), COLORS.dim, { align: 'center' });
      else {
        const modes = TARGET_MODES.filter((m) => m !== 'air' || st.air);
        const mi = Math.max(0, modes.indexOf(t.mode));
        const hl = this.tutorial?.current()?.highlight === 'targeting' && Math.floor(this.time * 3) % 2;
        if (ui.button('info:prev', x + 6, cy, T, T, { label: '<' })) { setTargeting(this.sim, t.id, modes[(mi + modes.length - 1) % modes.length]); this.tutorial?.signal('targeting'); }
        r.panel(x + 6 + T + 2, cy, w - 12 - 2 * (T + 2), T);
        r.text(MODE_LABEL[t.mode], x + w / 2, cy + ((T - 7) >> 1), hl ? COLORS.good : COLORS.text, { align: 'center' });
        if (ui.button('info:next', x + w - 6 - T, cy, T, T, { label: '>' })) { setTargeting(this.sim, t.id, modes[(mi + 1) % modes.length]); this.tutorial?.signal('targeting'); }
      }
      cy += T + 6;
    }
    const sv = sellValue(t, s.wavesEnded);
    const sellLabel = this.sellConfirm > 0 ? `CONFIRM ${sv}` : `SELL ${sv}`;
    const sell = (bx, bw, by) => {
      if (ui.button('info:sell', bx, by, bw, T, { label: sellLabel, style: this.sellConfirm > 0 ? 'bad' : 'normal' })) {
        if (this.sellConfirm > 0) { sell(this.sim, t.id); this.selId = 0; }
        else this.sellConfirm = 2.5;
      }
    };
    if (!nexts.length) {
      r.text('MAX TIER', x + w / 2, cy, COLORS.dim, { align: 'center' });
      cy += 12;
      sell(x + 6, w - 12, Math.min(cy, y + h - T - 5));
    } else if (branch) {
      r.text('PICK ONE - LOCKED AFTER', x + 6, cy, COLORS.warn);
      cy += rowH;
      const bw = Math.floor((w - 15) / 2);
      nexts.forEach((b, i) => {
        const bs = towerStats(s, t.type, b);
        const locked = !open.includes(b);
        const afford = s.credits >= bs.cost;
        const sub = locked ? 'TECH TREE' : String(bs.cost);
        if (ui.button(`info:up:${b}`, x + 6 + i * (bw + 3), cy, bw, T, { label: bs.name.toUpperCase(), sub, icon: locked && T < 28 ? this.app.assets.icons.lock : null, style: afford && !locked ? 'accent' : 'normal', disabled: !afford || locked })) this.doUpgrade(b);
      });
      cy += T + 4;
      sell(x + 6, w - 12, Math.min(cy, y + h - T - 5));
    } else {
      const ns = towerStats(s, t.type, nexts[0]);
      r.text(`NEXT: ${ns.name.toUpperCase()}`, x + 6, cy, COLORS.dim);
      cy += rowH + 1;
      const rows = [
        ...(st.rate ? [['DPS', dps(t.tier), dps(nexts[0]), (v) => v.toFixed(1)], ['RANGE', st.range, ns.range, String]] : [['INCOME', st.income || 0, ns.income || 0, String]]),
        ['SPLASH', st.splash || 0, ns.splash || 0, String],
        ['AIR', st.air ? 1 : 0, ns.air ? 1 : 0, (v) => (v ? 'YES' : 'NO')],
      ].filter((d, i) => i < 2 || d[1] !== d[2]).slice(0, diffRows);
      for (const [k, a, b2, fmt] of rows) {
        const c = b2 > a ? COLORS.good : b2 < a ? COLORS.bad : COLORS.dim;
        r.text(k, x + 6, cy, COLORS.dim); r.text(fmt(a), x + 60, cy, COLORS.text); r.text('>', x + 92, cy, COLORS.dim); r.text(fmt(b2), x + 104, cy, c);
        cy += rowH;
      }
      cy = Math.min(cy + 2, y + h - T - 5);
      const cost = upgradeCost(t, nexts[0], s);
      const afford = s.credits >= cost;
      const uw = Math.round((w - 15) * 0.56);
      if (ui.button('info:up', x + 6, cy, uw, T, { label: `UPGRADE ${cost}`, style: afford ? 'accent' : 'normal', disabled: !afford })) this.doUpgrade(nexts[0]);
      sell(x + 9 + uw, w - 15 - uw, cy);
    }
  }

  drawTutorial(step, x, bottom) {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T;
    const w = Math.min(230, Math.floor(ui.vw * 0.42));
    const lines = wrapText(step.text, Math.floor((w - 40) / 5));
    const needOk = step.until === 'ack';
    const h = Math.max(32, 10 + lines.length * 9 + (needOk ? T + 4 : 0));
    const y = bottom - h;
    r.panel(x, y, w, h, { title: true });
    ui.block('tut:bg', x, y, w, h);
    const flick = 0.75 + 0.25 * Math.sin(this.time * 31) * Math.sin(this.time * 7);
    r.hi(app.assets.hologram, x + 3, y + 3, flick);
    lines.forEach((l, i) => r.text(l, x + 32, y + 5 + i * 9, COLORS.accent));
    if (needOk && ui.button('tut:ok', x + w - 50, y + h - T - 4, 46, T, { label: 'OK', style: 'accent' })) this.tutorial.ack();
  }

  drawPause() {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T;
    r.rect(0, 0, ui.vw, ui.vh, '#05080b', 0.6);
    ui.block('pause:bg', 0, 0, ui.vw, ui.vh);
    const w = 160, h = 22 + 4 * (T + 4) + 4;
    const x = (ui.vw - w) >> 1, y = (ui.vh - h) >> 1;
    r.panel(x, y, w, h, { title: true });
    r.text('PAUSED', x + 8, y + 6, COLORS.accent);
    let cy = y + 20;
    const b = (id, label, style) => { const c = ui.button(id, x + 8, cy, w - 16, T, { label, style }); cy += T + 4; return c; };
    if (b('pause:resume', 'RESUME', 'accent')) this.menu = null;
    if (b('pause:restart', 'RESTART', 'normal')) app.restartLevel(this.sim);
    if (b('pause:settings', 'SETTINGS', 'normal')) this.menu = 'settings';
    if (b('pause:quit', this.sandbox ? 'LEAVE SANDBOX' : 'QUIT TO MENU', 'bad')) app.quitLevel(this.sim);
  }

  // Sandbox spawner: droid type, count, spawn, boss list, invincible base.
  drawSpawner(L, y) {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, A = app.assets, s = this.s, sp = this.spawner;
    const types = Object.keys(ENEMIES);
    const w = 156, h = 18 + 3 * (T + 3);
    r.panel(L, y, w, h, { title: true });
    ui.block('sb:bg', L, y, w, h);
    r.text('SPAWNER', L + 6, y + 4, COLORS.accent);
    let cy = y + 15;
    const i = types.indexOf(sp.type);
    if (ui.button('sb:prev', L + 4, cy, T, T, { label: '<' })) sp.type = types[(i + types.length - 1) % types.length];
    r.text(ENEMIES[sp.type].name.toUpperCase().slice(0, 18), L + w / 2, cy + ((T - 7) >> 1), ENEMIES[sp.type].boss ? COLORS.bad : COLORS.text, { align: 'center' });
    if (ui.button('sb:next', L + w - 4 - T, cy, T, T, { label: '>' })) sp.type = types[(i + 1) % types.length];
    cy += T + 3;
    const boss = !!ENEMIES[sp.type].boss;
    if (ui.button('sb:minus', L + 4, cy, T, T, { label: '-', disabled: boss })) sp.count = Math.max(1, sp.count - (sp.count > 10 ? 5 : 1));
    r.text(boss ? 'BOSS x1' : `x${sp.count}`, L + 4 + T + 18, cy + ((T - 7) >> 1), COLORS.text, { align: 'center' });
    if (ui.button('sb:plus', L + 4 + T + 36, cy, T, T, { label: '+', disabled: boss })) sp.count = Math.min(60, sp.count + (sp.count >= 10 ? 5 : 1));
    if (ui.button('sb:spawn', L + 4 + 2 * T + 40, cy, w - 8 - 2 * T - 40, T, { label: 'SPAWN', style: 'accent' })) {
      sandboxSpawn(this.sim, sp.type, sp.count);
      if (boss) app.audio.sfx('siren');
    }
    cy += T + 3;
    const inv = !!s.sandbox.invincible;
    if (ui.button('sb:inv', L + 4, cy, w - 8, T, { label: `INVINCIBLE BASE: ${inv ? 'ON' : 'OFF'}`, style: inv ? 'good' : 'normal' })) s.sandbox.invincible = !inv;
  }
}

export function wrapText(str, max) {
  const out = [];
  let line = '';
  for (const word of str.split(' ')) {
    if ((line + ' ' + word).trim().length > max) { out.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  return out;
}
