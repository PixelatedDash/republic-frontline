// Phase 0 HUD mockups at the iPhone 12 landscape view (S=4 -> 633x292 art
// px; min tap target ceil(44*3/4) = 33 art px). Numbers are placeholders.

import { Bitmap, blit, crop, fill, rgba } from '../../src/art/bitmap.js';
import { panel, button, icon, rangeCircle, gridCell, gridDots, drawText, measure } from '../../src/art/ui.js';
import { composeRifle, composeTurret } from '../../src/art/towers.js';
import { UI, UI_GOOD, UI_BAD, UI_ACCENT, UI_WARN } from '../../src/art/palettes.js';
import { FONT5 } from '../../src/art/font.js';

export const VIEW = { w: 633, h: 292, tap: 33 };
const T = VIEW.tap;

export function towerIcon(art, type, tier = 't1') {
  if (type === 'rifle') return crop(composeRifle(art.towers.rifle[tier], 'S'), 1, 21, 30, 25);
  return crop(composeTurret(art.towers[type][tier], 3), 8, 14, 24, 30);
}

function label(bm, text, x, y, color = UI[0], shadow = '#0c1116') {
  return drawText(bm, text, x, y, { color, shadow });
}

function iconButton(bm, x, y, name, { w = T, h = T, style = 'normal', pressed = false, text = null } = {}) {
  blit(bm, button(w, h, { style, pressed }), x, y);
  const dy = pressed ? 1 : 0;
  if (name) {
    const ic = icon(name);
    blit(bm, ic, x + ((w - ic.w) >> 1), y + ((h - 3 - ic.h) >> 1) + dy);
  } else if (text) {
    label(bm, text, x + ((w - measure(text)) >> 1), y + ((h - 3 - 7) >> 1) + dy, style === 'accent' ? '#0c1116' : UI[0], style === 'accent' ? null : '#0c1116');
  }
}

export function drawTopHud(bm, art, { lives = 20, credits = 450, wave = '3/12', speed = 1, flashLives = false } = {}) {
  // resources panel
  blit(bm, panel(150, 21), 4, 4);
  blit(bm, icon('lives'), 10, 10);
  label(bm, String(lives), 22, 11, flashLives ? UI_BAD[0] : UI[0]);
  blit(bm, icon('credits'), 44, 10);
  label(bm, String(credits), 56, 11, UI_WARN[0]);
  blit(bm, icon('wave'), 88, 10);
  label(bm, 'WAVE ' + wave, 100, 11);
  // speed + pause + menu (each >= 33x33)
  const x0 = VIEW.w - 4 - 5 * (T + 2);
  iconButton(bm, x0, 4, 'pause');
  ['1x', '2x', '3x'].forEach((t, i) => iconButton(bm, x0 + (i + 1) * (T + 2), 4, null, { text: t, pressed: speed === i + 1, style: 'normal' }));
  iconButton(bm, x0 + 4 * (T + 2), 4, 'menu');
  // next-wave preview + call early
  blit(bm, panel(150, 37, { title: true }), 4, 28);
  label(bm, 'NEXT WAVE 4', 10, 32, UI_ACCENT[0]);
  const e = art.enemies;
  const mini = [[e.trooper.walk[1], 12], [e.rush.walk[1], 4], [e.fighter.frames[0][0], 3]];
  let mx = 10;
  for (const [s, n] of mini) {
    const ic = crop(s, 0, Math.max(0, s.h - 18), Math.min(s.w, 18), Math.min(18, s.h));
    blit(bm, ic, mx, 42 + (18 - ic.h));
    mx += ic.w + 1;
    drawText(bm, 'x' + n, mx, 52, { color: UI[1], font: FONT5, shadow: '#0c1116' });
    mx += 14;
  }
  blit(bm, icon('air'), mx + 2, 46);
  label(bm, 'AIR', mx + 12, 47, UI_WARN[0]);
  iconButton(bm, 158, 28, null, { w: 52, h: T, style: 'accent', text: 'CALL +24' });
}

export function drawBuildBar(bm, art, { selected = 'rocket' } = {}) {
  const slots = [['rifle', 100], ['rocket', 160], ['flak', 140], null, null, null, null, null];
  const sw = T + 3, total = slots.length * sw - 3 + 8;
  const x0 = (VIEW.w - total) >> 1, y0 = VIEW.h - T - 8;
  blit(bm, panel(total, T + 8), x0, y0 - 4);
  slots.forEach((s, i) => {
    const x = x0 + 4 + i * sw, y = y0;
    const sel = s && s[0] === selected;
    blit(bm, button(T, T, { pressed: sel }), x, y);
    if (!s) {
      const l = icon('lock');
      blit(bm, l, x + ((T - l.w) >> 1), y + 11);
      return;
    }
    const ic = towerIcon(art, s[0]);
    const sc = crop(ic, (ic.w - 27) >> 1, ic.h - 22, 27, 22);
    blit(bm, sc, x + 3, y + 2 + (sel ? 1 : 0));
    const cost = String(s[1]);
    fill(bm, x + 2, y + T - 11 + (sel ? 1 : 0), T - 4, 7, '#0c1116', 170);
    drawText(bm, cost, x + ((T - measure(cost, FONT5)) >> 1), y + T - 10 + (sel ? 1 : 0), { color: UI_WARN[0], font: FONT5 });
  });
}

// Placement state: drag ghost + range circle + valid tiles + confirm buttons.
export function drawPlacement(bm, art, { tx, ty, ox, oy, valid = true, type = 'rocket', range = 56 }) {
  const fp = type === 'rifle' ? 2 : 1;
  const sx = tx * 16 - ox, sy = ty * 16 - oy;
  blit(bm, gridDots(VIEW.w, VIEW.h), -(ox % 16), -(oy % 16));
  for (let j = -1; j <= fp; j++) for (let i = -1; i <= fp; i++) if (i >= 0 && j >= 0 && i < fp && j < fp) blit(bm, gridCell(valid), sx + i * 16, sy + j * 16);
  const rc = rangeCircle(range, { valid });
  const cx = sx + fp * 8, cy = sy + fp * 8;
  blit(bm, rc, cx - (rc.w >> 1), cy - (rc.h >> 1));
  const tw = type === 'rifle' ? composeRifle(art.towers.rifle.t1, 'S') : composeTurret(art.towers[type].t1, 3);
  const ghost = tw.clone();
  for (let i = 0; i < ghost.d.length; i++) if (ghost.d[i] >>> 24) ghost.d[i] = (ghost.d[i] & 0xffffff) | (170 << 24);
  blit(bm, ghost, sx + ((fp * 16 - tw.w) >> 1), sy + fp * 16 - tw.h);
  // confirm / cancel next to the ghost
  iconButton(bm, sx + fp * 16 + 8, sy - 22, 'check', { style: 'good' });
  iconButton(bm, sx + fp * 16 + 8, sy + 14, 'cross', { style: 'bad' });
  // finger contact point, offset below the ghost
  const f = new Bitmap(13, 13);
  for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) { const d = Math.hypot(x - 6, y - 6); if (d < 6.5 && d > 4.5) f.set(x, y, rgba('#ffffff', 90)); }
  blit(bm, f, cx - 6, cy + 30);
  label(bm, 'DRAG', cx - 10, cy + 45, UI[2]);
}

export function drawInfoPanel(bm, art, x, y) {
  const w = 182, h = 214;
  blit(bm, panel(w, h, { title: true }), x, y);
  label(bm, 'ROCKET TEAM II', x + 7, y + 6, UI_ACCENT[0]);
  // tier pips
  for (let i = 0; i < 3; i++) fill(bm, x + w - 34 + i * 9, y + 7, 6, 6, i < 2 ? UI_ACCENT[0] : UI[4]);
  const rows = [
    ['DPS', '18.4', UI[0]],
    ['DAMAGE', 'EXPLOSIVE', UI[0]],
    ['HITS AIR', 'NO (T3)', UI_BAD[0]],
  ];
  rows.forEach(([k, v, c], i) => { label(bm, k, x + 7, y + 22 + i * 10, UI[2]); label(bm, v, x + 76, y + 22 + i * 10, c); });
  // targeting mode selector
  label(bm, 'TARGET', x + 7, y + 58, UI[2]);
  iconButton(bm, x + 7, y + 68, null, { text: '<' });
  blit(bm, panel(w - 14 - 2 * (T + 3), T), x + 7 + T + 3, y + 68);
  label(bm, 'FIRST', x + ((w - measure('FIRST')) >> 1), y + 80);
  iconButton(bm, x + w - 7 - T, y + 68, null, { text: '>' });
  // upgrade diff
  label(bm, 'NEXT: ROCKET TEAM III', x + 7, y + 106, UI[1]);
  const diff = [['DMG', '24', '32', UI_GOOD[0]], ['RANGE', '56', '60', UI_GOOD[0]], ['RATE', '1.2', '1.2', UI[2]], ['AIR', 'NO', 'YES', UI_GOOD[0]]];
  diff.forEach(([k, a, b, c], i) => {
    label(bm, k, x + 7, y + 117 + i * 10, UI[2]);
    label(bm, a, x + 64, y + 117 + i * 10, UI[0]);
    label(bm, '>', x + 92, y + 117 + i * 10, UI[2]);
    label(bm, b, x + 104, y + 117 + i * 10, c);
  });
  iconButton(bm, x + 7, y + h - T - 7, null, { w: 98, style: 'accent', text: 'UPGRADE 160' });
  iconButton(bm, x + 109, y + h - T - 7, null, { w: w - 116, style: 'normal', text: 'SELL 98' });
  return { w, h };
}
