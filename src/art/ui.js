// UI kit (drawn at screen scale S on its own layer): 9-slice panels and
// buttons, icons, range circles, placement grid, title lettering.

import { Bitmap, blit, fromMap, rgba, pack, outline as addOutline } from './bitmap.js';
import { UI, UI_ACCENT, UI_GOOD, UI_BAD, UI_WARN, REPUBLIC_BOLT } from './palettes.js';
import { drawText, measure, FONT7 } from './font.js';
import { hd } from './rotsprite.js';

// UI legend: digits = UI ramp (1 light .. 8 dark).
export const UI_LEGEND = {
  1: UI[0], 2: UI[1], 3: UI[2], 4: UI[3], 5: UI[4], 6: UI[5], 7: UI[6], 8: UI[7],
  c: UI_ACCENT[0], x: UI_ACCENT[1], z: UI_ACCENT[2],
  G: UI_GOOD[0], g: UI_GOOD[1], r: UI_BAD[0], i: UI_BAD[1], y: UI_WARN[0], Y: UI_WARN[1],
};

const PANEL = [
  '.kkkkkkk.',
  'k4444445k',
  'k4666667k',
  'k4666667k',
  'k4666667k',
  'k4666667k',
  'k4666667k',
  'k5777777k',
  '.kkkkkkk.',
];
const PANEL_TITLE = [
  '.kkkkkkk.',
  'kzxxxxxzk',
  'kx55555zk',
  'kx66666zk',
  'kx66666zk',
  'kx66666zk',
  'kx66666zk',
  'kz77777zk',
  '.kkkkkkk.',
];
const BUTTON = [
  '.kkkkkkk.',
  'k2222223k',
  'k2333334k',
  'k2333334k',
  'k3444445k',
  'k6666666k',
  'k7777777k',
  '.kkkkkkk.',
];
const BUTTON_DOWN = [
  '.........',
  '.kkkkkkk.',
  'k5555555k',
  'k4444445k',
  'k4444445k',
  'k4444445k',
  'k6666666k',
  '.kkkkkkk.',
];
const BUTTON_ACCENT = BUTTON.map((r) => r.replace(/2/g, 'c').replace(/3/g, 'x').replace(/4/g, 'x').replace(/5/g, 'z').replace(/6/g, 'z').replace(/7/g, '8'));
const BUTTON_GOOD = BUTTON.map((r) => r.replace(/2/g, 'G').replace(/[34]/g, 'g').replace(/[56]/g, '5').replace(/7/g, '7'));
const BUTTON_BAD = BUTTON.map((r) => r.replace(/2/g, 'r').replace(/[34]/g, 'i').replace(/[56]/g, '5').replace(/7/g, '7'));

// Stretch a template: keep `top`/`bottom` rows and `left`/`right` columns,
// repeat row `top` / column `left` to fill.
function nine(tpl, w, h, top = 2, bottom = 2, left = 2, right = 2, legend = UI_LEGEND, alpha = 255) {
  const src = fromMap(tpl, legend);
  const out = new Bitmap(w, h);
  const mapIdx = (v, size, a, b, n) => (v < a ? v : v >= size - b ? n - (size - v) : a);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = mapIdx(x, w, left, right, src.w), sy = mapIdx(y, h, top, bottom, src.h);
      let p = src.d[sy * src.w + sx];
      if (p && alpha < 255 && sx > 0 && sy > 0 && sx < src.w - 1 && sy < src.h - 1) p = (p & 0xffffff) | (alpha << 24);
      out.d[y * w + x] = p >>> 0;
    }
  return out;
}

export function panel(w, h, { title = false, alpha = 235 } = {}) {
  return nine(title ? PANEL_TITLE : PANEL, w, h, 2, 2, 2, 2, UI_LEGEND, alpha);
}

export function button(w, h, { style = 'normal', pressed = false } = {}) {
  const tpl = pressed ? BUTTON_DOWN : { normal: BUTTON, accent: BUTTON_ACCENT, good: BUTTON_GOOD, bad: BUTTON_BAD }[style];
  return nine(tpl, w, h, 2, 3, 2, 2);
}

export const ICONS = {
  lives: ['..kkkkk..', '.kWWsSwk.', 'kWWWsSwvk', 'kWWWsSwvk', 'kTttttttk', 'kvWWwwvuk', '.kvvvvuk.', '..kkkkk..'],
  credits: ['..kkkkk..', '.kdddddk.', 'kddWddDDk', 'kdWkkkDDk', 'kdWkdkDDk', 'kdWkkkDDk', 'kddDDDDDk', '.kDDDDDk.', '..kkkkk..'],
  wave: ['..kkkk...', '.kaaaAk..', '.kAAqRk..', '.kAAAQk..', '..kkkk...', '.kaaaAk..', 'kEkAAAAk.', '.kkkkkk..'],
  pause: ['kkk.kkk', 'kWk.kWk', 'kWk.kWk', 'kWk.kWk', 'kWk.kWk', 'kvk.kvk', 'kkk.kkk'],
  play: ['kk.....', 'kWkk...', 'kWWWkk.', 'kWWWWWk', 'kWWWvkk', 'kWvkk..', 'kkk....'],
  menu: ['kkkkkkk', 'kWWWWvk', 'kkkkkkk', 'kWWWWvk', 'kkkkkkk', 'kWWWWvk', 'kkkkkkk'],
  lock: ['..kkk..', '.kvkvk.', '.kk.kk.', 'kkkkkkk', 'kddddDk', 'kdDkDDk', 'kdDkDDk', 'kDDDDDk', 'kkkkkkk'],
  check: ['......kk', '.....kGk', 'kk..kGk.', 'kGkkGk..', '.kGGk...', '..kk....'],
  cross: ['kk...kk', 'krk.krk', '.krkrk.', '..krk..', '.krkrk.', 'krk.krk', 'kk...kk'],
  air: ['...k...', '..kyk..', '.kkykk.', 'kyyyyyk', 'kkkykkk', '..kyk..', '.kyyyk.', '.kkkkk.'],
  armor: ['kkkkkkk', 'kwwwwvk', 'kwvvvuk', 'kwvvvuk', '.kvvuk.', '..kuk..', '...k...'],
  shield: ['..kkk..', '.kVVVk.', 'kVVUUXk', 'kVUUUXk', 'kVUUXXk', '.kUXXk.', '..kkk..'],
  upgrade: ['...k...', '..kGk..', '.kGGGk.', 'kGGGGGk', 'kkkGkkk', '..kGk..', '..kkk..'],
  sell: ['..kkkkk..', '.kdddddk.', 'kddddDDDk', 'kdkkkkkDk', 'kdddDDDDk', '.kDDDDDk.', '..kkkkk..'],
  target: ['..kck..', '.k.c.k.', 'k..c..k', 'cccCccc', 'k..c..k', '.k.c.k.', '..kck..'],
  star: ['....k....', '...kdk...', 'kkkkddkkk', 'kddddddDk', '.kdddDDk.', '..kdDDk..', '.kdDkkDk.', '.kDk..kDk', '.kk....kk'],
  heroic: ['.kk.kk.', '.kVkUk.', '..kVk..', '.kkkkk.', 'kddddDk', 'kdWdDDk', 'kddDDDk', '.kDDDk.', '..kkk..'],
  heroicEmpty: ['.kk.kk.', '.k5k6k.', '..k5k..', '.kkkkk.', 'k55556k', 'k55566k', 'k55666k', '.k666k.', '..kkk..'],
  starEmpty: ['....k....', '...k5k...', 'kkkk55kkk', 'k5555556k', '.k55566k.', '..k566k..', '.k56kk6k.', '.k6k..k6k', '.kk....kk'],
};

// Icons are hand-placed at UI scale and shown at 2x detail (Scale2x +
// 1px outlines) through the renderer's HI layer.
export function icon(name) {
  return hd(fromMap(ICONS[name], UI_LEGEND));
}

// Range circle: 2px ring (light over dark) + sparse dithered fill.
export function rangeCircle(r, { color = REPUBLIC_BOLT[2], min = 0, valid = true } = {}) {
  const s = r * 2 + 3, c = r + 1;
  const bm = new Bitmap(s, s);
  const ring = rgba(valid ? color : UI_BAD[0], 230);
  const ringDark = rgba(valid ? '#0b4fd6' : UI_BAD[1], 150);
  const fillC = rgba(valid ? color : UI_BAD[0], 46);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d <= r - 0.5 && (x + y) % 2 === 0 && (y % 2 === 0) && d > min + 0.5) bm.set(x, y, fillC);
      if (Math.abs(d - r) < 0.5 || Math.abs(d - (r - 1)) < 0.5) bm.set(x, y, ring);
      else if (Math.abs(d - (r - 2)) < 0.5) bm.set(x, y, ringDark);
      if (min && Math.abs(d - min) < 0.5) bm.set(x, y, rgba(UI_WARN[0], 200));
    }
  return bm;
}

export function gridCell(valid, size = 32) {
  const bm = new Bitmap(size, size);
  const L = size - 1, C = Math.round(size * 0.2);
  const edge = rgba(valid ? UI_GOOD[0] : UI_BAD[0], 200);
  const body = rgba(valid ? UI_GOOD[1] : UI_BAD[1], 70);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const e = x <= 1 || y <= 1 || x >= L - 1 || y >= L - 1;
      const corner = (x < C || x > L - C) && (y < C || y > L - C);
      if (e && corner) bm.set(x, y, edge);
      else if (!e) bm.set(x, y, body);
    }
  return bm;
}

// Faint full-map build grid (dots at tile corners).
export function gridDots(w, h, step = 32) {
  const bm = new Bitmap(w, h);
  const c = rgba('#e6ece9', 50);
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) { bm.set(x, y, c); bm.set(x + 1, y, c); bm.set(x, y + 1, c); bm.set(x - 1, y, c); bm.set(x, y - 1, c); }
  return bm;
}

// Beveled title lettering: FONT7 glyphs at `n`x, banded light->dark, outlined.
export function logoText(text, n = 3, ramp = ['#f4f6f1', '#d6dbd6', '#a6aeb0', '#6b7378']) {
  const w = measure(text, FONT7) + 2, h = FONT7.h + 2;
  const mask = new Bitmap(w, h);
  drawText(mask, text, 1, 1, { color: '#ffffff' });
  const big = new Bitmap(w * n, h * n);
  for (let y = 0; y < big.h; y++)
    for (let x = 0; x < big.w; x++) {
      if (!(mask.get((x / n) | 0, (y / n) | 0) >>> 24)) continue;
      const gy = (y - n) / (5 * n); // 0..1 over cap height
      const band = gy < 0.3 ? 0 : gy < 0.55 ? 1 : gy < 0.85 ? 2 : 3;
      big.set(x, y, rgba(ramp[band]));
    }
  let out = addOutline(big, '#101217', true);
  out = addOutline(out, '#101217');
  // hard drop shadow
  const res = new Bitmap(out.w + 2, out.h + 3);
  const sh = new Bitmap(out.w, out.h);
  for (let i = 0; i < out.d.length; i++) if (out.d[i]) sh.d[i] = pack(5, 8, 12, 200);
  blit(res, sh, 2, 3);
  blit(res, out, 0, 0);
  return res;
}

export { drawText, measure };
