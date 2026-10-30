// Boot, title, briefing (pre-level panel) and result screens. The galaxy
// map and the other meta screens live in meta-screens.js.

import { COLORS } from './ui.js';
import { drawSettings } from './settings.js';
import { LEVELS, LEVEL_ORDER, buildLevel } from '../data/levels/index.js';
import { ENEMIES } from '../data/enemies.js';
import { DIFFICULTY } from '../data/rules.js';
import { wrapText } from './game-screen.js';
import { buildGroundLayers } from '../engine/assets.js';
import { HEROIC_TOWERS, heroicUnlocked, ACHIEVEMENTS } from '../data/meta.js';
import { TOWERS } from '../data/towers.js';

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
      if (btn('t:play', 'PLAY', ip ? 'normal' : 'accent')) app.go(() => app.toGalaxy());
      // two half-width rows keep the menu short on phones
      const hw = (bw - 4) >> 1;
      if (ui.button('t:archives', cx - bw / 2, by, hw, T, { label: 'ARCHIVES' })) app.go(() => app.toArchives());
      if (ui.button('t:medals', cx - bw / 2 + hw + 4, by, hw, T, { label: 'MEDALS' })) app.go(() => app.toMedals());
      by += T + 5;
      if (ui.button('t:settings', cx - bw / 2, by, hw, T, { label: 'SETTINGS' })) this.menu = 'settings';
      if (ui.button('t:account', cx - bw / 2 + hw + 4, by, hw, T, { label: 'ACCOUNT' })) app.toAccount?.();
    }
    const sync = app.syncStatus?.() || 'LOCAL SAVE';
    r.text(sync, 6 + ui.ins.left, ui.vh - 11 - ui.ins.bottom, COLORS.faint);
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
    this.heroic = false;
    this.canHeroic = heroicUnlocked(app.save, levelId);
    const types = new Set();
    for (const w of this.def.waves) for (const g of w.groups) types.add(g.type);
    this.types = [...types].filter((t) => !ENEMIES[t].boss);
    app.ensurePlanet?.(this.def.planet);
    this.boss = this.def.boss || null;
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
      else if (e.type === 'key' && e.key === 'Escape') this.app.go(() => this.app.toGalaxy(this.def.planet));
    }
  }
  deploy() {
    this.app.lastDifficulty = this.difficulty;
    const { levelId, difficulty, heroic } = this;
    this.app.go(() => this.app.startLevel(levelId, heroic ? 'master' : difficulty, heroic));
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, A = app.assets, T = ui.T;
    r.begin();
    this.bg.draw(r, ui);
    ui.beginFrame();
    const w = Math.min(420, ui.vw - 16), h = Math.min(ui.vh - 12, 230);
    const x = (ui.vw - w) >> 1, y = (ui.vh - h) >> 1;
    r.panel(x, y, w, h, { title: true });
    r.text(`${this.def.planet.toUpperCase()} ${this.def.index} - ${this.def.name.toUpperCase()}`, x + 8, y + 6, COLORS.accent);
    if (this.boss) r.text(`BOSS: ${ENEMIES[this.boss].name.toUpperCase()}`, x + w - 8, y + 6, COLORS.bad, { align: 'right' });
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
      if (ex + hw > x + w - 8) break;
      r.hi(ref, ex, ey + 20 - Math.round(hh));
      ex += Math.round(hw) + 6;
    }
    // difficulty
    const dy = y + h - 2 * T - 12;
    if (ey + 24 + 7 < dy - 10) {
      const lines = wrapText(this.types.map((t) => ENEMIES[t].name.toUpperCase()).join(', '), Math.floor((w - 16) / 5));
      lines.forEach((l, i) => { if (ey + 24 + i * 9 + 7 < dy - 10) r.text(l, x + 8, ey + 24 + i * 9, COLORS.faint); });
    }
    r.text(this.heroic ? 'HEROIC: MASTER DROIDS · 11 LIVES · BOSS LEAK = LOSS' : 'DIFFICULTY', x + 8, dy - 9, this.heroic ? COLORS.warn : COLORS.dim, {});
    const cols = this.canHeroic ? 4 : 3;
    const dw = Math.floor((w - 16 - 4 * (cols - 1)) / cols);
    if (this.heroic) {
      // the fixed tower set for this level's Heroic replay
      HEROIC_TOWERS[this.levelId].forEach((t, i) => {
        const ref = r.cached(`slotIcon:${t}`, () => app.makeTowerIcon(t));
        const bx = x + 8 + i * (dw + 4);
        r.panel(bx, dy, dw, T);
        r.hi(ref, bx + 3, dy + Math.max(1, (T - ref.h * app.sc.HIR) / 2));
        r.text(TOWERS[t].short.split(' ')[0].slice(0, Math.max(3, Math.floor((dw - 24) / 5))), bx + dw - 4, dy + ((T - 7) >> 1), COLORS.text, { align: 'right' });
      });
    } else {
      ['padawan', 'jedi', 'master'].forEach((d, i) => {
        const D = DIFFICULTY[d];
        if (ui.button(`b:diff:${d}`, x + 8 + i * (dw + 4), dy, dw, T, { label: D.name.toUpperCase(), active: this.difficulty === d, sub: T >= 28 ? `${D.lives} LIVES` : null })) this.difficulty = d;
      });
    }
    const by = y + h - T - 6;
    if (this.canHeroic && ui.button('b:heroic', x + 84, by, 90, T, { label: this.heroic ? 'HEROIC: ON' : 'HEROIC', style: this.heroic ? 'good' : 'normal', icon: null })) this.heroic = !this.heroic;
    if (ui.button('b:back', x + 8, by, 70, T, { label: 'BACK' })) app.go(() => app.toGalaxy(this.def.planet));
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
  commando: 'COMMANDOS WEAR PLATE. ROCKETS, ARTILLERY AND SHARPSHOOTERS DO FAR MORE THAN BLASTERS.',
  tank: 'HEAVY TANKS COST 3 LIVES. FOCUS THEM WITH SHARPSHOOTERS OR A TANDEM LAUNCHER.',
  shieldwalker: 'SHIELD WALKERS BUBBLE EVERYTHING NEAR THEM. ION CANNONS STRIP SHIELDS AT 250%.',
  carrier: 'CARRIERS SPILL SIX SCUTTLERS WHEN THEY DIE. KEEP SPLASH BEHIND YOUR ANTI-ARMOR.',
  bomber: 'BOMBERS DROP TROOPERS WHEN SHOT DOWN. KILL THEM EARLY ON THEIR LANE, WITH GROUND GUNS BEHIND.',
  crawler: 'CRAWLERS CARRY SHIELDS AND ARMOR. ION FIRST, THEN EXPLOSIVES OR PIERCING.',
  repair: 'REPAIR DRONES HEAL EVERYTHING AROUND THEM. SET A FLAK OR RIFLE TOWER TO AIR PRIORITY.',
  siege: 'SIEGE WALKERS COST 5 LIVES. STACK ARMOR BREAKERS AND HOWITZERS ON ONE STRETCH OF ROAD.',
  tactical: 'TACTICAL DROIDS SPEED UP THEIR GROUP. TARGET STRONGEST TO DROP THEM FIRST.',
  tidebreaker: 'THE TIDEBREAKER IS ARMORED. ARTILLERY AND ROCKETS ALONG ITS WHOLE ROUTE.',
  foundry: 'DESTROY THE FOUNDRY VENTS TO SLOW THE DROIDS IT BUILDS.',
  reaper: 'THE REAPER SHELL SHRUGS OFF BLASTERS AND ION. KEEP EXPLOSIVES AND SNIPERS FOR PHASE 2.',
  dreadnought: 'THE DREADNOUGHT FLIES. MASS FLAK AND INTERCEPTORS UNDER ITS LANE, SPREAD OUT AGAINST LIGHTS-OUT.',
  warlord: 'THE WARLORD GOES SHIELDED, THEN BERSERK. HAVE ION FOR PHASE 2 AND SPLASH FOR ITS MINIONS.',
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
    const w = Math.min(300, ui.vw - 16), h = Math.min(ui.vh - 12, 200 + (res.medals?.length ? 32 : 0) + (res.heroic ? 6 : 0));
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
    if (res.won && res.heroic) { r.text('HEROIC VICTORY  +1 STAR', x + w / 2, cy - 6, COLORS.warn, { align: 'center' }); cy += 6; }
    if (res.medals?.length) {
      const M = app.ensureMedals();
      const mx = Math.round(x + w / 2 - (res.medals.length * 19) / 2);
      res.medals.slice(0, 6).forEach((id, i) => r.hi(M[id].on, mx + i * 19, cy));
      r.text(res.medals.length === 1 ? `MEDAL: ${ACHIEVEMENTS.find((a) => a.id === res.medals[0]).name}` : `${res.medals.length} MEDALS EARNED`, x + w / 2, cy + 22, COLORS.warn, { align: 'center' });
      cy += 32;
    }
    const stat = (k, v) => { r.text(k, x + 16, cy, COLORS.dim); r.text(String(v), x + w - 16, cy, COLORS.text, { align: 'right' }); cy += 9; };
    stat('LIVES', `${res.lives}/${res.maxLives}`);
    stat('DROIDS DESTROYED', res.kills);
    stat('LEAKED', res.leaked);
    stat('CREDITS EARNED', res.credits);
    stat('TIME', `${Math.floor(res.seconds / 60)}:${String(Math.floor(res.seconds % 60)).padStart(2, '0')}`);
    const by = y + h - T - 8;
    const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(res.levelId) + 1];
    const bw3 = Math.floor((w - 16 - 8) / 3);
    if (ui.button('r:retry', x + 8, by, bw3, T, { label: res.won ? 'REPLAY' : 'RETRY', style: res.won ? 'normal' : 'accent' })) app.go(() => app.startLevel(res.levelId, res.difficulty, res.heroic));
    if (ui.button('r:map', x + 12 + bw3, by, bw3, T, { label: 'MAP' })) app.go(() => app.toGalaxy(LEVELS[res.levelId].planet));
    if (ui.button('r:next', x + 16 + 2 * bw3, by, bw3, T, { label: 'NEXT', style: res.won ? 'accent' : 'normal', disabled: !res.won || !next })) app.go(() => app.toBriefing(next));
    ui.endFrame();
  }
}
