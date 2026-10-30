// Phase 3 meta screens (spec §8, §12, §17): galaxy map + planet view,
// tech tree terminal, medals + stats, archives, and the campaign ending.

import { COLORS } from './ui.js';
import { wrapText } from './game-screen.js';
import { LEVELS, LEVEL_ORDER } from '../data/levels/index.js';
import { ENEMIES } from '../data/enemies.js';
import { TOWERS } from '../data/towers.js';
import {
  MAX_STARS, TECH, TECH_BY_ID, TECH_TOTAL, starsEarned, starsSpent, canBuy, refund,
  ACHIEVEMENTS, awardAchievements, ARCHIVE, sandboxUnlocked, heroicUnlocked,
} from '../data/meta.js';

export const PLANETS = ['kamino', 'geonosis', 'kashyyyk', 'umbara', 'mustafar'];
const PLANET_NAME = { kamino: 'KAMINO', geonosis: 'GEONOSIS', kashyyyk: 'KASHYYYK', umbara: 'UMBARA', mustafar: 'MUSTAFAR' };
const PLANET_BLURB = {
  kamino: 'STORM OCEAN · PLATFORM CITIES',
  geonosis: 'RED DESERT · DROID FOUNDRIES',
  kashyyyk: 'GIANT FORESTS · SWARMS',
  umbara: 'ENDLESS NIGHT · HEAVY AIR',
  mustafar: 'LAVA WORLD · THE FINALE',
};
const POS = { kamino: [0.13, 0.64], geonosis: [0.31, 0.36], kashyyyk: [0.5, 0.66], umbara: [0.69, 0.38], mustafar: [0.87, 0.62] };

export const levelsOf = (p) => LEVEL_ORDER.filter((id) => LEVELS[id].planet === p);
export function levelUnlocked(app, id) {
  const i = LEVEL_ORDER.indexOf(id);
  if (i <= 0 || app.unlockAll) return true;
  return (app.save.levels[LEVEL_ORDER[i - 1]]?.wins || 0) > 0;
}
const planetOpen = (app, p) => levelUnlocked(app, levelsOf(p)[0]);
const planetStars = (app, p) => levelsOf(p).reduce((a, id) => { const lv = app.save.levels[id]; return a + Math.min(3, lv?.stars || 0) + (lv?.heroic ? 1 : 0); }, 0);

function routeUi(app, events, onKey) {
  const ui = app.ui;
  for (const e of events) {
    if (e.type === 'down') ui.down(e.id, e.x, e.y);
    else if (e.type === 'move') ui.move(e.id, e.x, e.y);
    else if (e.type === 'up' || e.type === 'cancel') ui.up(e.id, e.x, e.y);
    else if (e.type === 'key') onKey?.(e.key);
  }
}

// Draw a 2x-detail sprite centred in a box: full HI scale, or half / quarter
// when it would not fit (whole device pixels either way).
export function fitHi(app, ref, x, y, w, h, maxUp = 1) {
  const sc = app.sc, r = app.renderer;
  // whole device pixels per art pixel only (k = HI x m must be an integer)
  const ks = [];
  for (let m = maxUp; m >= 1; m--) ks.push(sc.HI * m);
  for (let d = 2; sc.HI / d >= 1; d *= 2) if (Number.isInteger(sc.HI / d)) ks.push(sc.HI / d);
  const size = (k) => [ref.w * k / sc.S, ref.h * k / sc.S];
  let k = ks.find((q) => { const [iw, ih] = size(q); return iw <= w && ih <= h; });
  const clip = k === undefined;
  if (clip) k = ks[ks.length - 1];
  const [iw, ih] = size(k);
  if (clip) { r.ctx.save(); r.ctx.beginPath(); r.ctx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); r.ctx.clip(); }
  r.hi(ref, Math.round(x + (w - iw) / 2), Math.round(y + (h - ih) / 2), 1, k);
  if (clip) r.ctx.restore();
}

// Parallax starfield + drifting nebula (galaxy, tech, medals, archives).
export class Space {
  constructor(app) {
    this.app = app;
    this.t = 0;
    this.stars = Array.from({ length: 220 }, (_, i) => ({ x: (i * 97.13) % 1, y: (i * 61.71 + (i % 7) * 0.13) % 1, z: 1 + (i % 3), tw: (i * 0.37) % 1 }));
  }
  update(dt) { this.t += dt; }
  draw(r, ui, px = 0, py = 0) {
    const G = this.app.ensureGalaxy();
    r.begin('#0c0b15');
    r.ui();
    const neb = G.nebula;
    const k = Math.max(1, Math.ceil(Math.max(ui.vw / neb.width, ui.vh / neb.height)));
    r.ctx.save();
    r.ctx.scale(k, k);
    r.ctx.globalAlpha = 0.85;
    r.canvasAt(neb, Math.round(-((this.t * 0.6 + px * 0.2) % 8) / k) - 2, Math.round(-py * 0.1 / k) - 2);
    r.ctx.restore();
    for (const s of this.stars) {
      const x = ((((s.x * ui.vw - this.t * 2 * s.z - px * s.z * 0.3) % ui.vw) + ui.vw) % ui.vw);
      const y = ((((s.y * ui.vh - py * s.z * 0.3) % ui.vh) + ui.vh) % ui.vh);
      const tw = 0.5 + 0.5 * Math.sin(this.t * (1 + s.tw * 2) + s.tw * 9);
      const c = s.z === 3 ? '#e6ece9' : s.z === 2 ? '#7d8d90' : '#4f5d63';
      r.rect(x, y, 1, 1, c, s.z === 3 ? 0.5 + tw * 0.5 : 0.8);
      if (s.z === 3 && tw > 0.92) { r.rect(x - 1, y, 3, 1, c, 0.35); r.rect(x, y - 1, 1, 3, c, 0.35); }
    }
  }
}

// ----------------------------------------------------------- galaxy map --
export class GalaxyScreen {
  constructor(app, { planet = null } = {}) {
    this.app = app;
    this.G = app.ensureGalaxy();
    this.space = new Space(app);
    this.t = 0;
    const firstOpen = [...PLANETS].reverse().find((p) => planetOpen(app, p)) || 'kamino';
    this.at = planet || app.galaxyAt || firstOpen;
    const [sx, sy] = POS[this.at];
    this.ship = { fx: sx, fy: sy, tx: sx, ty: sy, k: 1, face: 1, then: null };
    this.planet = planet;
    this.zoom = planet ? 1 : 0;
    this.zoomDir = 0;
    this.sel = null;
    app.audio.playMusic('galaxy');
  }

  update(dt, events) {
    this.t += dt;
    this.space.update(dt);
    routeUi(this.app, events, (k) => {
      if (k !== 'Escape') return;
      if (this.planet) this.leavePlanet();
      else this.app.toTitle();
    });
    const s = this.ship;
    if (s.k < 1) {
      s.k = Math.min(1, s.k + dt / 1.1);
      if (s.k >= 1 && s.then) { const f = s.then; s.then = null; f(); }
    }
    if (this.zoomDir) {
      this.zoom = Math.min(1, Math.max(0, this.zoom + this.zoomDir * dt / 0.45));
      if (this.zoom === 0 && this.zoomDir < 0) { this.zoomDir = 0; this.planet = null; }
      if (this.zoom === 1 && this.zoomDir > 0) this.zoomDir = 0;
    }
  }

  shipPos() {
    const s = this.ship, k = s.k, e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const mx = (s.fx + s.tx) / 2, my = Math.min(s.fy, s.ty) - 0.14;
    const x = (1 - e) ** 2 * s.fx + 2 * (1 - e) * e * mx + e * e * s.tx;
    const y = (1 - e) ** 2 * s.fy + 2 * (1 - e) * e * my + e * e * s.ty;
    return { x, y };
  }

  choose(p) {
    if (!planetOpen(this.app, p) || this.zoomDir) return;
    const enter = () => { this.planet = p; this.sel = null; this.zoomDir = 1; this.app.audio.sfx('upgrade', { pitch: 0.7 }); };
    if (p === this.at && this.ship.k >= 1) return enter();
    const cur = this.shipPos();
    this.ship = { fx: cur.x, fy: cur.y, tx: POS[p][0], ty: POS[p][1], k: 0, face: POS[p][0] >= cur.x ? 1 : -1, then: enter };
    this.at = this.app.galaxyAt = p;
    this.app.audio.sfx('wave', { vol: 0.4, pitch: 1.4 });
  }

  leavePlanet() {
    if (this.zoomDir) return;
    this.zoomDir = -1;
    this.sel = null;
  }

  render() {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, A = app.assets, G = this.G;
    const z = this.zoom, ez = z < 0.5 ? 2 * z * z : 1 - (-2 * z + 2) ** 2 / 2;
    this.space.draw(r, ui, ez * 40, 0);
    ui.beginFrame();
    const vw = ui.vw, vh = ui.vh, ins = ui.ins;
    const top = 6 + ins.top, L = 6 + ins.left, R = vw - 6 - ins.right, bot = vh - 6 - ins.bottom;
    const HI = app.sc.HI, sd = G.smallD / 2, bd = G.bigD / 2; // sizes in UI px
    const fr = (n) => Math.floor(this.t * 3) % n;

    // planets (fade out the others while zoomed)
    const others = 1 - ez;
    if (others > 0.02) {
      for (let i = 0; i < PLANETS.length - 1; i++) {
        const a = POS[PLANETS[i]], b = POS[PLANETS[i + 1]];
        const open = planetOpen(app, PLANETS[i + 1]);
        const n = Math.ceil(Math.hypot((b[0] - a[0]) * vw, (b[1] - a[1]) * vh) / 6);
        for (let j = 1; j < n; j++) {
          if ((j + Math.floor(this.t * 4)) % 2 && open) continue;
          r.rect(Math.round((a[0] + (b[0] - a[0]) * j / n) * vw), Math.round((a[1] + (b[1] - a[1]) * j / n) * vh), 2, 2, open ? COLORS.accent : '#33404a', others * (open ? 0.8 : 0.5));
        }
      }
    }
    PLANETS.forEach((p, i) => {
      const open = planetOpen(app, p);
      const cx = POS[p][0] * vw, cy = POS[p][1] * vh;
      if (p === this.planet && z > 0) return;
      if (others <= 0.02) return;
      const frames = G.small[p];
      const ref = frames[(Math.floor(this.t * 4) + i * 5) % frames.length];
      r.hi(ref, Math.round(cx - sd), Math.round(cy - sd), (open ? 1 : 0.35) * others);
      if (!open) r.spr(A.icons.lock, Math.round(cx - 4), Math.round(cy - 5), others);
      r.alpha(others);
      r.text(PLANET_NAME[p], cx, cy + sd + 3, open ? COLORS.text : COLORS.faint, { align: 'center' });
      if (open) r.text(`${planetStars(app, p)} / 16`, cx, cy + sd + 12, COLORS.warn, { align: 'center' });
      r.alpha(1);
      if (!this.planet) {
        ui.hit(`g:${p}`, cx - sd - 4, cy - sd - 4, sd * 2 + 8, sd * 2 + 22);
        if (ui.clicked(`g:${p}`)) this.choose(p);
      }
    });
    // the cruiser
    if (others > 0.02) {
      const sp = this.shipPos();
      const set = this.ship.face >= 0 ? G.cruiser.r : G.cruiser.l;
      const bob = Math.round(Math.sin(this.t * 2) * 1);
      const flying = this.ship.k < 1;
      const off = flying ? 0 : -sd - 10;
      r.hi(set[fr(2)], Math.round(sp.x * vw - G.cruiserW / 2), Math.round(sp.y * vh + off - G.cruiserH / 2 + bob), others);
    }

    // zoomed planet
    if (this.planet && z > 0) {
      const p = this.planet;
      const gx = POS[p][0] * vw, gy = POS[p][1] * vh;
      const vx = Math.max(L + bd + 4, vw * 0.24), vy = vh * 0.52;
      const cx = gx + (vx - gx) * ez, cy = gy + (vy - gy) * ez;
      const big = G.big(p);
      const ref = big[Math.floor(this.t * 4) % big.length];
      const sc = (sd + (bd - sd) * ez) / bd;
      const k = HI * sc;
      const half = bd * sc;
      r.hi(ref, cx - half, cy - half, 1, k);
      if (z >= 1) this.drawPlanetView(p, cx, cy, top, L, R, bot);
    }

    // chrome
    if (!this.planet) {
      r.text('GALAXY MAP', L, top, COLORS.accent);
      r.text('SELECT A PLANET', L, top + 10, COLORS.dim);
      r.text(`STARS ${starsEarned(app.save)} / ${MAX_STARS}`, R, top, COLORS.warn, { align: 'right' });
      const free = starsEarned(app.save) - starsSpent(app.save);
      if (ui.button('g:back', L, bot - T, 64, T, { label: 'BACK' })) app.toTitle();
      if (ui.button('g:tech', R - 110, bot - T, 110, T, { label: free > 0 ? `TECH TREE (${free})` : 'TECH TREE', style: free > 0 ? 'accent' : 'normal' })) app.go(() => app.toTech());
    }
    ui.endFrame();
  }

  drawPlanetView(p, pcx, pcy, top, L, R, bot) {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, A = app.assets, vw = ui.vw, vh = ui.vh;
    const bd = this.G.bigD / 2;
    r.textBig(PLANET_NAME[p], pcx, Math.max(top, pcy - bd - 26), COLORS.text, 2);
    r.text(PLANET_BLURB[p], pcx, pcy + bd + 6, COLORS.dim, { align: 'center' });
    r.text(`STARS ${planetStars(app, p)} / 16`, pcx, pcy + bd + 15, COLORS.warn, { align: 'center' });
    // route + level nodes
    const ids = levelsOf(p);
    const x0 = Math.max(pcx + bd + 16, vw * 0.46), x1 = R - 8;
    const pts = ids.map((id, i) => [Math.round(x0 + (i + 0.5) * (x1 - x0) / 4), Math.round(vh * (i % 2 ? 0.44 : 0.26))]);
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const open = levelUnlocked(app, ids[i + 1]);
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 5);
      for (let j = 1; j < n; j++) r.rect(Math.round(ax + (bx - ax) * j / n), Math.round(ay + (by - ay) * j / n), 2, 2, open ? COLORS.accent : '#33404a', open ? 0.8 : 0.5);
    }
    ids.forEach((id, i) => {
      const [x, y] = pts[i];
      const def = LEVELS[id], lv = app.save.levels[id], open = levelUnlocked(app, id);
      const s = T + 4;
      if (ui.button(`pv:${id}`, x - s / 2, y - s / 2, s, s, { label: open ? String(def.index) : null, icon: open ? null : A.icons.lock, style: def.boss ? 'bad' : this.sel === id ? 'accent' : 'normal', active: this.sel === id, disabled: !open })) this.sel = id;
      if (!open) return;
      for (let k = 0; k < 3; k++) r.spr(k < (lv?.stars || 0) ? A.icons.star : A.icons.starEmpty, x - 19 + k * 10, y + s / 2 + 2);
      r.spr(lv?.heroic ? A.icons.heroic : A.icons.heroicEmpty, x + 12, y + s / 2 + 2);
      if (def.boss) r.text('BOSS', x, y - s / 2 - 9, COLORS.bad, { align: 'center' });
    });
    // selected level panel
    const pw = Math.min(260, x1 - x0 + 16), ph = 2 * T + 30;
    const px = Math.round(x1 - pw + 8), py = bot - ph;
    if (this.sel) {
      const id = this.sel, def = LEVELS[id], lv = app.save.levels[id];
      r.panel(px, py, pw, ph, { title: true });
      ui.block('pv:panel', px, py, pw, ph);
      r.text(`${def.index} - ${def.name.toUpperCase()}`, px + 6, py + 5, COLORS.accent);
      const best = lv?.wins ? `BEST ${lv.bestLives} LIVES · ${lv.wins} WIN${lv.wins > 1 ? 'S' : ''}${lv.heroic ? ' · HEROIC' : ''}` : 'NOT YET WON';
      r.text(def.boss ? `BOSS: ${ENEMIES[def.boss].name.toUpperCase()}` : `${def.waves.length} WAVES`, px + 6, py + 15, def.boss ? COLORS.bad : COLORS.dim);
      r.text(best, px + pw - 6, py + 15, COLORS.dim, { align: 'right' });
      const sb = sandboxUnlocked(app.save);
      const bw = sb ? Math.floor((pw - 16) / 2) : pw - 12;
      if (ui.button('pv:deploy', px + 6, py + ph - T - 6, bw, T, { label: 'BRIEFING', style: 'accent' })) app.go(() => app.toBriefing(id));
      if (sb && ui.button('pv:sandbox', px + 10 + bw, py + ph - T - 6, bw, T, { label: 'SANDBOX' })) app.go(() => app.startSandbox(id));
    } else {
      r.text('SELECT A LEVEL', (x0 + x1) / 2, py + ph - T, COLORS.faint, { align: 'center' });
    }
    if (ui.button('pv:back', L, bot - T, 70, T, { label: 'GALAXY' })) this.leavePlanet();
  }
}

// ------------------------------------------------------------ tech tree --
export class TechScreen {
  constructor(app) {
    this.app = app;
    this.space = new Space(app);
    this.sel = null;
    this.t = 0;
  }
  update(dt, events) {
    this.t += dt;
    if (this.medal) this.medal.t -= dt;
    this.space.update(dt);
    routeUi(this.app, events, (k) => { if (k === 'Escape') this.app.go(() => this.app.toGalaxy()); });
  }
  buy(id) {
    const s = this.app.save;
    if (!canBuy(s, id)) return;
    s.tech = { ...s.tech, [id]: true };
    this.app.audio.sfx('upgrade');
    this.changed();
  }
  undo(id) {
    const s = this.app.save;
    s.tech = refund(s, id);
    this.app.audio.sfx('sell');
    this.changed();
  }
  changed() {
    const got = awardAchievements(this.app.save);
    if (got.length) this.medal = { name: ACHIEVEMENTS.find((a) => a.id === got[0]).name, t: 2.5 };
    this.app.saveProgress();
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, A = app.assets, s = app.save;
    this.space.draw(r, ui);
    ui.beginFrame();
    const vw = ui.vw, vh = ui.vh, ins = ui.ins;
    const top = 6 + ins.top, L = 6 + ins.left, R = vw - 6 - ins.right, bot = vh - 6 - ins.bottom;
    // terminal frame
    const W = R - L, H = bot - top;
    r.panel(L, top, W, H, { title: true, alpha: 245 });
    ui.block('tech:bg', L, top, W, H);
    for (let y = top + 2; y < bot - 2; y += 3) r.rect(L + 2, y, W - 4, 1, '#7cf0ff', 0.03);
    const free = starsEarned(s) - starsSpent(s);
    r.text('REQUISITION TERMINAL', L + 8, top + 6, COLORS.accent);
    if (this.medal?.t > 0) r.text(`MEDAL EARNED: ${this.medal.name}`, (L + R) / 2, top + 6, COLORS.warn, { align: 'center' });
    r.text(`STARS AVAILABLE ${free}`, R - 8, top + 6, free > 0 ? COLORS.warn : COLORS.dim, { align: 'right' });
    r.text(`TREE ${starsSpent(s)} / ${TECH_TOTAL} · EARNED ${starsEarned(s)} / ${MAX_STARS} · REFUNDS ARE FREE`, L + 8, top + 16, COLORS.dim);
    // 8 columns
    const types = Object.keys(TOWERS);
    const detailH = T + 26;
    const cw = Math.floor((W - 22) / types.length);
    const gy = top + 26;
    const iconH = 28, rowsY = gy + iconH + 12;
    const nodeH = Math.max(14, Math.min(T + 10, Math.floor((bot - detailH - 12 - rowsY) / 3) - 6));
    const rowY = (j) => rowsY + j * (nodeH + 6);
    types.forEach((type, i) => {
      const x = L + 16 + i * cw;
      const icon = r.cached(`slotIcon:${type}`, () => app.makeTowerIcon(type));
      fitHi(app, icon, x + 2, gy, cw - 4, iconH);
      r.text(TOWERS[type].short.split(' ')[0].slice(0, Math.floor((cw - 2) / 5)), x + cw / 2, gy + iconH + 2, COLORS.dim, { align: 'center' });
      const nodes = TECH.filter((n) => n.tower === type);
      const bw = cw - 4;
      const place = [[x + 2, rowY(0), bw], [x + 2, rowY(1), bw], [x + 2, rowY(2), (bw >> 1) - 1], [x + 2 + (bw >> 1) + 1, rowY(2), (bw >> 1) - 1]];
      nodes.forEach((n, j) => {
        const [nx, ny, nw] = place[j];
        const owned = !!s.tech[n.id], buy = canBuy(s, n.id);
        const style = owned ? 'good' : buy ? 'accent' : 'normal';
        if (ui.button(`tech:${n.id}`, nx, ny, nw, nodeH, { label: owned ? null : String(n.cost), icon: owned ? A.icons.check : null, style, active: this.sel === n.id })) this.sel = n.id;
        if (j === 1) r.rect(nx + (nw >> 1), ny - 6, 1, 6, owned || s.tech[n.req] ? COLORS.accent : '#33404a');
      });
    });
    // row labels at the left edge
    r.text('I', L + 7, rowY(0) + ((nodeH - 7) >> 1), COLORS.faint);
    r.text('II', L + 5, rowY(1) + ((nodeH - 7) >> 1), COLORS.faint);
    r.text('IV', L + 4, rowY(2) + ((nodeH - 7) >> 1), COLORS.faint);
    // details
    const dy = bot - detailH - 4;
    if (this.sel) {
      const n = TECH_BY_ID[this.sel];
      const owned = !!s.tech[n.id];
      r.text(`${TOWERS[n.tower].name.toUpperCase()} · ${n.name}`, L + 8, dy, COLORS.accent);
      const lines = wrapText(n.desc, Math.floor((W - 140) / 5));
      lines.slice(0, 2).forEach((l, i) => r.text(l, L + 8, dy + 10 + i * 9, COLORS.text));
      const need = n.req && !s.tech[n.req] ? `NEEDS ${TECH_BY_ID[n.req].name}` : '';
      if (need) r.text(need, L + 8, dy + 28, COLORS.warn);
      const bx = R - 8 - 116;
      if (owned) { if (ui.button('tech:refund', bx, dy + 4, 116, T, { label: `REFUND ${n.cost}` })) this.undo(n.id); }
      else if (ui.button('tech:buy', bx, dy + 4, 116, T, { label: `UNLOCK ${n.cost}`, style: 'accent', disabled: !canBuy(s, n.id) })) this.buy(n.id);
    } else {
      r.text('TAP A NODE. TIER-4 SPECIALIZATIONS (IV) UNLOCK HERE.', L + 8, dy + 4, COLORS.dim);
      r.text('EARN STARS IN THE CAMPAIGN AND HEROIC REPLAYS.', L + 8, dy + 14, COLORS.faint);
    }
    if (ui.button('tech:back', L + 6, bot - T - 4, 64, T, { label: 'BACK' })) app.go(() => app.toGalaxy());
    ui.endFrame();
  }
}

// ------------------------------------------------------- medals + stats --
export class MedalsScreen {
  constructor(app, tab = 'medals') {
    this.app = app;
    this.space = new Space(app);
    this.tab = tab;
    this.sel = null;
    this.M = app.ensureMedals();
    if (awardAchievements(app.save).length) app.saveProgress();
  }
  update(dt, events) {
    this.space.update(dt);
    routeUi(this.app, events, (k) => { if (k === 'Escape') this.app.go(() => this.app.toTitle()); });
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, s = app.save;
    this.space.draw(r, ui);
    ui.beginFrame();
    const vw = ui.vw, vh = ui.vh, ins = ui.ins;
    const top = 6 + ins.top, L = 6 + ins.left, R = vw - 6 - ins.right, bot = vh - 6 - ins.bottom;
    const W = R - L, H = bot - top;
    r.panel(L, top, W, H, { title: true, alpha: 240 });
    ui.block('m:bg', L, top, W, H);
    const tw = 80;
    if (ui.button('m:tab:medals', L + 6, top + 4, tw, T, { label: 'MEDALS', active: this.tab === 'medals' })) this.tab = 'medals';
    if (ui.button('m:tab:stats', L + 10 + tw, top + 4, tw, T, { label: 'STATS', active: this.tab === 'stats' })) this.tab = 'stats';
    const got = ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
    r.text(this.tab === 'medals' ? `${got} / ${ACHIEVEMENTS.length} EARNED` : `STARS ${starsEarned(s)} / ${MAX_STARS}`, R - 8, top + 4 + ((T - 7) >> 1), COLORS.warn, { align: 'right' });
    const y0 = top + T + 10;
    if (this.tab === 'medals') {
      // medals at 2x when the screen has room for every row plus details
      let n = 2, mw = 30, mh = 40, gap = 10;
      const fits = (mw2, mh2, g) => { const c = Math.floor((W - 12) / (mw2 + g)); return Math.ceil(ACHIEVEMENTS.length / c) * (mh2 + 6) + y0 + 32 < bot - T - 8; };
      if (!fits(mw, mh, gap)) { n = 1; mw = 15; mh = 20; gap = 6; }
      const cols = Math.max(5, Math.floor((W - 12) / (mw + gap)));
      const cw = Math.floor((W - 12) / cols);
      const rowsH = Math.ceil(ACHIEVEMENTS.length / cols) * (mh + 6);
      ACHIEVEMENTS.forEach((a, i) => {
        const x = L + 6 + (i % cols) * cw + ((cw - mw) >> 1), y = y0 + Math.floor(i / cols) * (mh + 6);
        const on = !!s.achievements[a.id];
        if (this.sel === a.id) r.rect(x - 3, y - 2, mw + 6, mh + 4, COLORS.accent, 0.25);
        r.hi(on ? this.M[a.id].on : this.M[a.id].off, x, y, 1, app.sc.HI * n);
        ui.hit(`m:${a.id}`, x - 3, y - 2, mw + 6, mh + 4);
        if (ui.clicked(`m:${a.id}`)) this.sel = a.id;
      });
      const dy = y0 + rowsH + 2;
      if (this.sel) {
        const a = ACHIEVEMENTS.find((q) => q.id === this.sel);
        const when = s.achievements[a.id];
        r.text(a.name, L + 8, dy, when ? COLORS.warn : COLORS.dim);
        r.text(a.desc, L + 8, dy + 10, COLORS.text);
        r.text(when ? `EARNED ${new Date(when).toISOString().slice(0, 10)}` : 'NOT YET EARNED', L + 8, dy + 20, COLORS.faint);
      } else r.text('TAP A MEDAL FOR DETAILS', L + 8, dy, COLORS.faint);
    } else this.drawStats(L + 8, y0, W - 16, bot - y0 - T - 8);
    if (ui.button('m:back', R - 70, bot - T - 4, 64, T, { label: 'BACK' })) app.go(() => app.toTitle());
    ui.endFrame();
  }
  drawStats(x, y, w, h) {
    const app = this.app, r = app.renderer, s = app.save, A = app.assets;
    const st = s.stats;
    const total = Object.values(st.kills).reduce((a, b) => a + b, 0);
    const hrs = Math.floor(st.playSeconds / 3600), mins = Math.floor((st.playSeconds % 3600) / 60);
    const rows = [
      ['DROIDS DESTROYED', total.toLocaleString('en-US')],
      ['PLAYTIME', `${hrs}H ${String(mins).padStart(2, '0')}M`],
      ['CREDITS EARNED', Math.round(st.creditsEarned).toLocaleString('en-US')],
      ['WINS / LOSSES', `${st.wins} / ${st.losses}`],
      ['LEVELS WON', `${LEVEL_ORDER.filter((id) => s.levels[id]?.wins).length} / ${LEVEL_ORDER.length}`],
      ['HEROIC WINS', `${LEVEL_ORDER.filter((id) => s.levels[id]?.heroic).length} / ${LEVEL_ORDER.length}`],
    ];
    const half = Math.floor(w * 0.42);
    rows.forEach(([k, v], i) => { r.text(k, x, y + i * 10, COLORS.dim); r.text(v, x + half - 4, y + i * 10, COLORS.text, { align: 'right' }); });
    // best runs: most lives kept per planet
    let by = y + rows.length * 10 + 6;
    r.text('BEST RUNS', x, by, COLORS.accent);
    by += 10;
    for (const p of PLANETS) {
      const best = levelsOf(p).map((id) => [id, s.levels[id]?.bestLives || 0]).sort((a, b) => b[1] - a[1])[0];
      if (by > y + h - 8) break;
      r.text(PLANET_NAME[p], x, by, COLORS.dim);
      r.text(best[1] ? `${LEVELS[best[0]].name.toUpperCase()} · ${best[1]} LIVES` : '-', x + half - 4, by, COLORS.text, { align: 'right' });
      by += 9;
    }
    // kills by type
    const kx = x + half + 12;
    r.text('KILLS BY TYPE', kx, y, COLORS.accent);
    const types = Object.keys(ENEMIES).filter((t) => !ENEMIES[t].boss);
    const colW = Math.floor((w - half - 12) / 2);
    types.forEach((t, i) => {
      const cx = kx + (i % 2) * colW, cy = y + 11 + Math.floor(i / 2) * 9;
      const name = ENEMIES[t].name.toUpperCase().split(' ')[0];
      if (cy > y + h - 6) return;
      r.text(name.slice(0, Math.max(4, Math.floor((colW - 26) / 5))), cx, cy, COLORS.dim);
      r.text(String(st.kills[t] || 0), cx + colW - 6, cy, COLORS.text, { align: 'right' });
    });
  }
}

// ------------------------------------------------------------- archives --
export class ArchivesScreen {
  constructor(app) {
    this.app = app;
    this.space = new Space(app);
    this.tab = 'tower';
    this.sel = 'rifle';
    this.t = 0;
  }
  update(dt, events) {
    this.t += dt;
    this.space.update(dt);
    routeUi(this.app, events, (k) => { if (k === 'Escape') this.app.go(() => this.app.toTitle()); });
  }
  // Draw a 2x-detail sprite centred in a box: full HI scale, or half when
  // it would not fit (both keep whole device pixels).
  fit(ref, x, y, w, h, up = 1) {
    fitHi(this.app, ref, x, y, w, h, up);
  }
  seen(id) {
    return this.app.unlockAll || !!this.app.save.unlocks[`seen:${id}`];
  }
  preview(entry) {
    const app = this.app, A = app.assets;
    if (entry.kind === 'tower') return { ref: app.renderer.cached(`slotIcon:${entry.id}`, () => app.makeTowerIcon(entry.id)) };
    if (entry.kind === 'enemy') {
      const set = A.enemies[entry.id];
      const frames = set.walk || set.frames?.[0] || [];
      return { ref: frames[Math.floor(this.t * 8) % frames.length] };
    }
    const B = app.ensurePlanet(Object.values(LEVELS).find((l) => l.boss === entry.id).planet).P.boss;
    const frames = (B.walk || B.p1 || B.body)?.e || B.frames?.[0] || [];
    return { ref: frames[Math.floor(this.t * 6) % frames.length] };
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, A = app.assets;
    this.space.draw(r, ui);
    ui.beginFrame();
    const vw = ui.vw, vh = ui.vh, ins = ui.ins;
    const top = 6 + ins.top, L = 6 + ins.left, R = vw - 6 - ins.right, bot = vh - 6 - ins.bottom;
    const W = R - L, H = bot - top;
    r.panel(L, top, W, H, { title: true, alpha: 240 });
    ui.block('a:bg', L, top, W, H);
    const tabs = [['tower', 'TOWERS'], ['enemy', 'DROIDS'], ['boss', 'BOSSES']];
    const tw = 70;
    tabs.forEach(([k, label], i) => {
      if (ui.button(`a:tab:${k}`, L + 6 + i * (tw + 4), top + 4, tw, T, { label, active: this.tab === k })) { this.tab = k; this.sel = ARCHIVE.find((e) => e.kind === k).id; }
    });
    const total = ARCHIVE.filter((e) => this.seen(e.id)).length;
    r.text(`${total} / ${ARCHIVE.length} ENTRIES`, R - 8, top + 4 + ((T - 7) >> 1), COLORS.warn, { align: 'right' });
    // icon grid (left)
    const list = ARCHIVE.filter((e) => e.kind === this.tab);
    const gw = Math.min(Math.floor(W * 0.42), 4 * (T + 4));
    const per = Math.max(2, Math.floor(gw / (T + 4)));
    const y0 = top + T + 10;
    list.forEach((e, i) => {
      const x = L + 6 + (i % per) * (T + 4), y = y0 + Math.floor(i / per) * (T + 4);
      const known = this.seen(e.id);
      if (ui.button(`a:${e.id}`, x, y, T, T, { label: known ? null : '?', active: this.sel === e.id })) this.sel = e.id;
      if (known) {
        const ref = e.kind === 'enemy' ? (A.enemies[e.id].walk || A.enemies[e.id].frames[0])[0] : this.preview(e).ref;
        if (ref) this.fit(ref, x + 2, y + 2, T - 4, T - 4);
      }
    });
    // detail (right)
    const e = ARCHIVE.find((q) => q.id === this.sel);
    const dx = L + 12 + gw, dw = R - 8 - dx;
    let dy = y0;
    if (!e || !this.seen(e.id)) {
      r.text('UNKNOWN', dx, dy, COLORS.dim);
      r.text('ENCOUNTER IT IN BATTLE TO UNLOCK THIS ENTRY.', dx, dy + 12, COLORS.faint);
    } else {
      r.text(e.name, dx, dy, e.kind === 'boss' ? COLORS.bad : COLORS.accent);
      dy += 11;
      const pv = this.preview(e);
      const boxH = 52;
      r.rect(dx, dy, dw, boxH, '#05080b', 0.5);
      if (pv.ref) this.fit(pv.ref, dx + 2, dy + 2, dw - 4, boxH - 4, 3);
      dy += boxH + 4;
      const stat = (k, v) => { r.text(k, dx, dy, COLORS.dim); r.text(v, dx + 52, dy, COLORS.text); dy += 9; };
      if (e.kind === 'tower') {
        const t = TOWERS[e.id], t1 = t.tiers.t1;
        stat('DAMAGE', (t.dtype || 'NONE').toUpperCase());
        stat('COST', String(t1.cost));
        stat('TIER IV', `${t.tiers.t4a.name.toUpperCase()} / ${t.tiers.t4b.name.toUpperCase()}`);
      } else {
        const d = ENEMIES[e.id];
        stat('LAYER', d.layer.toUpperCase());
        stat('BODY', `${d.body.toUpperCase()}${d.shield ? ' + SHIELD' : ''}`);
        stat('HP', `${d.hp}${d.shield ? ` + ${d.shield} SHIELD` : ''} · SPEED ${d.speed}`);
        if (!d.boss) stat('BOUNTY', `${d.bounty} · COSTS ${d.lifeCost} LIFE${d.lifeCost > 1 ? 'S' : ''}`);
      }
      dy += 2;
      for (const l of wrapText(e.info, Math.floor(dw / 5))) { r.text(l, dx, dy, COLORS.warn); dy += 9; }
      dy += 2;
      for (const l of wrapText(e.lore, Math.floor(dw / 5))) { if (dy > bot - T - 14) break; r.text(l, dx, dy, COLORS.text); dy += 9; }
    }
    if (ui.button('a:back', L + 6, bot - T - 4, 64, T, { label: 'BACK' })) app.go(() => app.toTitle());
    ui.endFrame();
  }
}

// ------------------------------------------------------------ ending ----
// Victory cinematic after the Warlord Engine falls (spec §8).
const ENDING = [
  'THE WARLORD ENGINE HAS FALLEN.',
  'WITHOUT ITS COMMAND SIGNAL, THE DROID ARMY STALLS ACROSS FIVE WORLDS.',
  'KAMINO, GEONOSIS, KASHYYYK, UMBARA, MUSTAFAR: EVERY LINE HELD.',
  'THE FRONTLINE MOVES ON. THE REPUBLIC ENDURES.',
];
export class EndingScreen {
  constructor(app, next) {
    this.app = app;
    this.next = next;
    this.space = new Space(app);
    this.t = 0;
    app.audio.playMusic('menu');
  }
  update(dt, events) {
    this.t += dt;
    this.space.update(dt * 3);
    if (this.t > 1.5 && events.some((e) => e.type === 'up' || e.type === 'key')) this.app.go(this.next);
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, G = app.ensureGalaxy(), A = app.assets;
    this.space.draw(r, ui, this.t * 30, 0);
    ui.beginFrame();
    const vw = ui.vw, vh = ui.vh;
    // the cruiser crosses the screen, Mustafar recedes behind it
    const m = G.small.mustafar;
    r.hi(m[Math.floor(this.t * 4) % m.length], Math.round(vw * 0.78 - this.t * 3), Math.round(vh * 0.2), Math.max(0.3, 1 - this.t * 0.05));
    const cx = -60 + ((this.t * 34) % (vw + 120));
    r.hi(G.cruiser.r[Math.floor(this.t * 6) % 2], Math.round(cx), Math.round(vh * 0.32 + Math.sin(this.t) * 2));
    const es = A.emblemSize;
    if (this.t > 1) r.hi(A.emblem, Math.round(vw / 2 - es.w * app.sc.HI / app.sc.S), Math.round(vh * 0.44), Math.min(1, (this.t - 1) / 1.5), app.sc.HI * 2);
    let y = Math.round(vh * 0.44) + Math.round(es.h * app.sc.HI * 2 / app.sc.S) + 8;
    ENDING.forEach((line, i) => {
      const a = Math.min(1, Math.max(0, (this.t - 2 - i * 2.2) / 0.8));
      if (a <= 0) return;
      for (const l of wrapText(line, Math.floor((vw - 40) / 5))) { r.alpha(a); r.text(l, vw / 2, y, i === 0 ? COLORS.warn : COLORS.text, { align: 'center' }); r.alpha(1); y += 10; }
      y += 3;
    });
    if (this.t > 11) r.text('CAMPAIGN COMPLETE · HEROIC REPLAYS AND SANDBOX AWAIT', vw / 2, vh - 22, COLORS.accent, { align: 'center' });
    if (this.t > 1.5 && Math.floor(this.t * 2) % 2) r.text('TAP TO CONTINUE', vw / 2, vh - 11, COLORS.faint, { align: 'center' });
    ui.endFrame();
  }
}

export { heroicUnlocked };
