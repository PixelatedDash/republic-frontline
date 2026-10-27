// Boot, title, briefing (pre-level) and result screens for the Phase 1
// slice. The full galaxy map / meta screens arrive in Phase 3.

import { COLORS } from './ui.js';
import { drawSettings } from './settings.js';
import { LEVELS, buildLevel } from '../data/levels/index.js';
import { ENEMIES } from '../data/enemies.js';
import { DIFFICULTY } from '../data/rules.js';
import { wrapText } from './game-screen.js';
import { buildGroundLayers } from '../engine/assets.js';

// Shared animated backdrop: the Kamino battlefield drifting under rain.
class Backdrop {
  constructor(app) {
    this.app = app;
    const level = buildLevel(LEVELS['kamino-1']);
    this.ground = buildGroundLayers(level, app.art.tiles.kamino, app.createCanvas);
    this.t = 0;
    this.light = 0;
    this.nextLight = 3;
  }
  update(dt) {
    this.t += dt;
    this.light = Math.max(0, this.light - dt * 2.5);
    if ((this.nextLight -= dt) <= 0) { this.nextLight = 7 + Math.random() * 9; this.light = 0.5; this.app.audio.sfx('thunder', { vol: 0.5 }); }
  }
  draw(r, ui) {
    // world-density pass (2x detail art at the world scale)
    const sc = this.app.sc;
    const g = this.ground[Math.floor(this.t * 6) % this.ground.length];
    // integer scale that still covers the whole screen
    const k = Math.max(sc.SW, Math.ceil(sc.dw / g.width), Math.ceil(sc.dh / g.height));
    const vw = sc.dw / k, vh = sc.dh / k;
    const span = Math.max(0, g.width - vw), spanY = Math.max(0, g.height - vh);
    const x = -Math.round((Math.sin(this.t * 0.03) * 0.5 + 0.5) * span);
    const y = -Math.round((Math.cos(this.t * 0.021) * 0.5 + 0.5) * spanY);
    r.ctx.setTransform(k, 0, 0, k, 0, 0);
    r.mode = 'world';
    r.canvasAt(g, x, y);
    r.ui();
    r.rect(0, 0, ui.vw, ui.vh, '#05080b', 0.45);
    const drop = this.app.assets.vfx.rain;
    for (let i = 0; i < 140; i++) {
      const sx = (i * 97.3) % 1, sy = (i * 57.7) % 1;
      const yy = ((sy * (ui.vh + 20) + this.t * 200) % (ui.vh + 20)) - 10;
      const xx = ((((sx * (ui.vw + 40) - this.t * 55) % (ui.vw + 40)) + ui.vw + 40) % (ui.vw + 40)) - 20;
      r.hi(drop, xx, yy, 0.7);
    }
    if (this.light > 0) r.rect(0, 0, ui.vw, ui.vh, '#dff4ff', this.light * 0.4);
  }
}

// ---------------------------------------------------------------- boot ----
export class BootScreen {
  constructor(app) {
    this.app = app;
    this.progress = 0;
    this.ready = false;
    this.t = 0;
  }
  update(dt, events) {
    this.t += dt;
    if (this.ready && events.some((e) => e.type === 'up' || e.type === 'key')) this.app.toTitle();
  }
  render() {
    const { renderer: r, ui } = this.app;
    r.begin('#0c1116');
    r.ui();
    const w = Math.min(200, ui.vw - 40), x = (ui.vw - w) >> 1, y = ui.vh >> 1;
    r.text('REPUBLIC FRONTLINE', ui.vw / 2, y - 24, COLORS.text, { align: 'center' });
    r.rect(x - 1, y - 1, w + 2, 8, '#33404a');
    r.rect(x, y, w, 6, '#151c23');
    r.rect(x, y, Math.round(w * this.progress), 6, COLORS.accent);
    const msg = this.ready ? (Math.floor(this.t * 2) % 2 ? 'TAP TO BEGIN' : '') : `BUILDING SPRITES ${Math.round(this.progress * 100)}%`;
    r.text(msg, ui.vw / 2, y + 14, COLORS.dim, { align: 'center' });
  }
}

// ---------------------------------------------------------------- title ---
export class TitleScreen {
  constructor(app) {
    this.app = app;
    this.bg = new Backdrop(app);
    this.menu = null;
    app.audio.playMusic('menu');
  }
  update(dt, events) {
    this.bg.update(dt);
    const ui = this.app.ui;
    for (const e of events) {
      if (e.type === 'down') ui.down(e.id, e.x, e.y);
      else if (e.type === 'move') ui.move(e.id, e.x, e.y);
      else if (e.type === 'up' || e.type === 'cancel') ui.up(e.id, e.x, e.y);
      else if (e.type === 'key' && e.key === 'Escape') this.menu = null;
    }
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, A = app.assets, T = ui.T;
    r.begin();
    this.bg.draw(r, ui);
    ui.beginFrame();
    const cx = ui.vw >> 1;
    const es = A.emblemSize;
    const ls = A.logoSize;
    const ew = Math.round(es.w * app.sc.HI * 2 / app.sc.S), eh = Math.round(es.h * app.sc.HI * 2 / app.sc.S);
    const blockW = ew + 10 + Math.max(ls[0].w, ls[1].w);
    const lx = Math.round(cx - blockW / 2), ly = Math.max(10, Math.round(ui.vh * 0.12));
    r.hi(A.emblem, lx, ly, 1, app.sc.HI * 2);
    r.spr(A.logo[0], lx + ew + 10, ly + 4);
    r.spr(A.logo[1], lx + ew + 10, ly + 6 + ls[0].h);
    const bw = Math.min(170, ui.vw - 40);
    let by = ly + eh + 14;
    const btn = (id, label, style, disabled = false) => { const c = ui.button(id, cx - bw / 2, by, bw, T, { label, style, disabled }); by += T + 5; return c; };
    const ip = app.save.inProgress;
    if (!this.menu) {
      if (ip && btn('t:continue', `CONTINUE (WAVE ${ip.snapshot.wavesEnded + 1})`, 'accent')) app.continueLevel();
      if (btn('t:play', 'PLAY: KAMINO I', ip ? 'normal' : 'accent')) app.toBriefing('kamino-1');
      if (btn('t:settings', 'SETTINGS', 'normal')) this.menu = 'settings';
    }
    r.text('PHASE 1 VERTICAL SLICE · LOCAL SAVE', 6 + ui.ins.left, ui.vh - 11 - ui.ins.bottom, COLORS.faint);
    if (ui.vw >= 460) r.text('ARCHIVES · MEDALS · ACCOUNT: LATER PHASES', ui.vw - 6 - ui.ins.right, ui.vh - 11 - ui.ins.bottom, COLORS.faint, { align: 'right' });
    if (this.menu === 'settings' && drawSettings(ui, app)) this.menu = null;
    if (app.save.settings.debug) r.text(`S ${app.sc.S} VIEW ${ui.vw}x${ui.vh} DPR ${app.sc.dpr} TAP ${app.sc.tap}`, 6, 6, COLORS.dim);
    ui.endFrame();
  }
}

// ------------------------------------------------------------- briefing ---
export class BriefingScreen {
  constructor(app, levelId) {
    this.app = app;
    this.levelId = levelId;
    this.def = LEVELS[levelId];
    this.bg = new Backdrop(app);
    this.t = 0;
    this.difficulty = app.lastDifficulty || 'jedi';
    const types = new Set();
    for (const w of this.def.waves) for (const g of w.groups) types.add(g.type);
    this.types = [...types];
  }
  update(dt, events) {
    this.t += dt;
    this.bg.update(dt);
    const ui = this.app.ui;
    for (const e of events) {
      if (e.type === 'down') ui.down(e.id, e.x, e.y);
      else if (e.type === 'move') ui.move(e.id, e.x, e.y);
      else if (e.type === 'up' || e.type === 'cancel') ui.up(e.id, e.x, e.y);
      else if (e.type === 'key' && e.key === 'Enter') this.deploy();
      else if (e.type === 'key' && e.key === 'Escape') this.app.toTitle();
    }
  }
  deploy() {
    this.app.lastDifficulty = this.difficulty;
    this.app.startLevel(this.levelId, this.difficulty);
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, A = app.assets, T = ui.T;
    r.begin();
    this.bg.draw(r, ui);
    ui.beginFrame();
    const w = Math.min(420, ui.vw - 16), h = Math.min(ui.vh - 12, 230);
    const x = (ui.vw - w) >> 1, y = (ui.vh - h) >> 1;
    r.panel(x, y, w, h, { title: true });
    r.text(`KAMINO ${this.def.index} - ${this.def.name.toUpperCase()}`, x + 8, y + 6, COLORS.accent);
    // hologram transmission: flicker + typed lines
    const hs = A.hologramSize;
    const flick = this.t < 0.4 ? (Math.floor(this.t * 30) % 2 ? 0.2 : 0.9) : 0.78 + 0.22 * Math.sin(this.t * 37) * Math.sin(this.t * 5.3);
    const pw = Math.round(hs.w * app.sc.HI * 2 / app.sc.S), ph = Math.round(hs.h * app.sc.HI * 2 / app.sc.S);
    r.rect(x + 8, y + 18, pw + 8, ph + 8, '#0b2533', 0.8);
    r.hi(A.hologram, x + 12 + (Math.floor(this.t * 2) % 7 === 0 ? 1 : 0), y + 22, flick, app.sc.HI * 2);
    r.text('INCOMING TRANSMISSION', x + 8, y + 30 + ph, COLORS.dim);
    const tx = x + 8 + pw + 16, tw = w - (tx - x) - 8;
    let chars = Math.floor(this.t * 45);
    let ty = y + 20;
    for (const line of this.def.briefing) {
      for (const l of wrapText(line, Math.floor(tw / 5))) {
        const shown = l.slice(0, Math.max(0, chars));
        chars -= l.length;
        r.text(shown, tx, ty, COLORS.accent);
        ty += 9;
      }
      ty += 3;
    }
    // expected enemies
    let ey = Math.max(ty + 4, y + 30 + ph + 12);
    r.text('EXPECTED CONTACTS', x + 8, ey, COLORS.dim);
    ey += 10;
    let ex = x + 8;
    for (const t of this.types) {
      const set = A.enemies[t];
      const ref = set.walk ? set.walk[0] : set.frames[0][0];
      const k = app.sc.HIR;
      const hw = (set.walk ? set.w : set.size) * k, hh = (set.walk ? set.h : set.size * 0.9) * k;
      r.hi(ref, ex, ey + 20 - Math.round(hh));
      ex += Math.round(hw) + 6;
    }
    // difficulty
    const dy = y + h - 2 * T - 12;
    if (ey + 24 + 7 < dy - 10) r.text(this.types.map((t) => ENEMIES[t].name.toUpperCase()).join(', '), x + 8, ey + 24, COLORS.faint);
    r.text('DIFFICULTY', x + 8, dy - 9, COLORS.dim);
    const dw = Math.floor((w - 16 - 8) / 3);
    ['padawan', 'jedi', 'master'].forEach((d, i) => {
      const D = DIFFICULTY[d];
      if (ui.button(`b:diff:${d}`, x + 8 + i * (dw + 4), dy, dw, T, { label: D.name.toUpperCase(), active: this.difficulty === d, sub: T >= 28 ? `${D.lives} LIVES` : null })) this.difficulty = d;
    });
    const by = y + h - T - 6;
    if (ui.button('b:back', x + 8, by, 70, T, { label: 'BACK' })) app.toTitle();
    if (ui.button('b:go', x + w - 8 - 110, by, 110, T, { label: 'DEPLOY', style: 'accent' })) this.deploy();
    ui.endFrame();
  }
}

// --------------------------------------------------------------- result ---
const TIPS = {
  trooper: 'TROOPER DROIDS COME IN NUMBERS. MORE RIFLE SQUADS ALONG THE FIRST STRETCH THIN THEM OUT EARLY.',
  rush: 'RUSH DROIDS OUTRUN SLOW WEAPONS. PUT FAST-FIRING SQUADS AT THE END OF THE ROUTE AS A BACKSTOP.',
  scuttler: 'SCUTTLER SWARMS SLIP PAST SINGLE-TARGET FIRE. ROCKET SPLASH CLEARS THEM IN BUNCHES.',
  shield: 'SHIELD DROIDS SHRUG OFF BLASTERS. HIT THEM WHILE THEY ROLL, OR USE ROCKETS ONCE THEY DEPLOY.',
  fighter: 'STRIKE FIGHTERS IGNORE THE WALKWAY. BUILD FLAK OR RIFLE SQUADS UNDER THEIR FLIGHT LANE.',
};

export class ResultScreen {
  constructor(app, r) {
    this.app = app;
    this.r = r;
    this.bg = new Backdrop(app);
    this.t = 0;
    this.popped = 0;
    app.audio.playMusic(r.won ? 'menu' : 'galaxy');
  }
  update(dt, events) {
    this.t += dt;
    this.bg.update(dt);
    const ui = this.app.ui;
    for (const e of events) {
      if (e.type === 'down') ui.down(e.id, e.x, e.y);
      else if (e.type === 'move') ui.move(e.id, e.x, e.y);
      else if (e.type === 'up' || e.type === 'cancel') ui.up(e.id, e.x, e.y);
    }
    const shown = Math.min(this.r.stars, Math.floor((this.t - 0.5) / 0.45) + 1);
    if (this.r.won && shown > this.popped && this.t > 0.5) {
      this.popped = shown;
      this.app.audio.sfx('upgrade', { pitch: 1 + shown * 0.12 });
    }
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, A = app.assets, T = ui.T, res = this.r;
    r.begin();
    this.bg.draw(r, ui);
    ui.beginFrame();
    const w = Math.min(300, ui.vw - 16), h = Math.min(ui.vh - 12, 200);
    const x = (ui.vw - w) >> 1, y = (ui.vh - h) >> 1;
    r.panel(x, y, w, h, { title: true });
    r.textBig(res.won ? 'VICTORY' : 'DEFEAT', x + w / 2, y + 10, res.won ? COLORS.good : COLORS.bad, 2);
    let cy = y + 34;
    if (res.won) {
      for (let i = 0; i < 3; i++) {
        const on = i < this.popped;
        const k = on ? Math.min(1, (this.t - 0.5 - i * 0.45) / 0.15) : 1;
        const ref = on ? A.icons.star : A.icons.starEmpty;
        const n = on && k < 1 ? 3 : 2;
        r.hi(ref, Math.round(x + w / 2 - 40 + i * 28 - (n * 9) / 2 + 9), cy - (n - 2) * 4, 1, app.sc.HI * n);
      }
      cy += 28;
    } else {
      r.text(`HELD UNTIL WAVE ${res.wave} OF ${res.totalWaves}`, x + w / 2, cy, COLORS.text, { align: 'center' });
      cy += 12;
      const worst = Object.entries(res.leakedTypes).sort((a, b) => b[1] - a[1])[0];
      if (worst) for (const l of wrapText('TIP: ' + TIPS[worst[0]], Math.floor((w - 16) / 5))) { r.text(l, x + 8, cy, COLORS.warn); cy += 9; }
      cy += 4;
    }
    const stat = (k, v) => { r.text(k, x + 16, cy, COLORS.dim); r.text(String(v), x + w - 16, cy, COLORS.text, { align: 'right' }); cy += 9; };
    stat('LIVES', `${res.lives}/${res.maxLives}`);
    stat('DROIDS DESTROYED', res.kills);
    stat('LEAKED', res.leaked);
    stat('CREDITS EARNED', res.credits);
    stat('TIME', `${Math.floor(res.seconds / 60)}:${String(Math.floor(res.seconds % 60)).padStart(2, '0')}`);
    const by = y + h - T - 8;
    const bw = Math.floor((w - 16 - 8) / 2);
    if (ui.button('r:retry', x + 8, by, bw, T, { label: res.won ? 'REPLAY' : 'RETRY', style: res.won ? 'normal' : 'accent' })) app.startLevel(res.levelId, res.difficulty);
    if (ui.button('r:menu', x + 16 + bw, by, bw, T, { label: 'MENU', style: res.won ? 'accent' : 'normal' })) app.toTitle();
    ui.endFrame();
  }
}
