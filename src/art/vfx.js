// VFX frames. Effects (unlike characters) are generated procedurally, but
// always in art pixels, from the fixed palettes, with ordered dithering
// instead of blur. Glows are pixel rings meant for additive ("lighter")
// drawing, batched per layer by the renderer.

import { Bitmap, blit, fromMap, rgba, pack } from './bitmap.js';
import { hd } from './rotsprite.js';
import { REPUBLIC_BOLT, SEPARATIST_BOLT, ION, FIRE, SMOKE, SCORCH, SPARK, SHIELD } from './palettes.js';

// Visual-only seeded RNG (gameplay uses src/engine/rng.js).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const dither = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)];

function line(x0, y0, x1, y1, cb) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, i = 0;
  for (;;) {
    cb(x0, y0, i++);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// ------------------------------------------------------------- bolts -------
// Elongated streak per direction: white-hot head, saturated body, dim tail,
// plus a 1px translucent sheath. Direction 0 = east, clockwise.
export function boltFrames(pal, dirs = 32, len = 16) {
  const size = len + 7;
  const c = (size / 2) | 0;
  const out = [];
  for (let d = 0; d < dirs; d++) {
    const a = (d / dirs) * Math.PI * 2;
    const hx = Math.round(c + Math.cos(a) * (len / 2)), hy = Math.round(c + Math.sin(a) * (len / 2));
    const tx = Math.round(c - Math.cos(a) * (len / 2)), ty = Math.round(c - Math.sin(a) * (len / 2));
    const bm = new Bitmap(size, size);
    const pts = [];
    line(hx, hy, tx, ty, (x, y, i) => pts.push([x, y, i]));
    // 2px core: duplicate the line one pixel across the travel direction
    const px = Math.abs(Math.sin(a)) > Math.abs(Math.cos(a)) ? 1 : 0, py = 1 - px;
    const n0 = pts.length;
    for (let k = 0; k < n0; k++) pts.push([pts[k][0] + px, pts[k][1] + py, pts[k][2]]);
    const n = n0;
    const sheath = rgba(pal[3], 150);
    for (const [x, y] of pts)
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!(bm.get(x + ox, y + oy) >>> 24)) bm.set(x + ox, y + oy, sheath);
    for (const [x, y, i] of pts) {
      const t = i / Math.max(1, n - 1);
      bm.set(x, y, rgba(t < 0.15 ? pal[0] : t < 0.35 ? pal[1] : t < 0.8 ? pal[2] : pal[3]));
    }
    out.push(bm);
  }
  return out;
}

// ------------------------------------------------------------- glows -------
// Soft halo from quantized pixel rings (no blur filter).
export function glow(hex, r, peak = 150) {
  const s = r * 2 + 1;
  const bm = new Bitmap(s, s);
  const n = parseInt(hex.slice(1), 16);
  const R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - r, y - r) / (r + 0.5);
      if (d >= 1) continue;
      const band = Math.ceil((1 - d) * 3) / 3; // 3 rings
      bm.set(x, y, pack(R, G, B, Math.round(peak * band * band)));
    }
  return bm;
}

// ------------------------------------------------------------- ion ---------
export function ionArc(len = 40, frames = 3, seed = 7) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const rnd = mulberry32(seed + f * 31);
    const h = 25, bm = new Bitmap(len, h);
    let y = 12;
    const pts = [];
    for (let x = 0; x < len; x += 6) {
      const ny = x === 0 || x + 6 >= len ? 12 : Math.max(2, Math.min(h - 3, 12 + Math.round((rnd() - 0.5) * 18)));
      line(x, y, Math.min(len - 1, x + 6), ny, (px, py) => { pts.push([px, py]); pts.push([px, py + 1]); });
      y = ny;
    }
    const halo = rgba(ION[3], 120);
    for (const [x, py] of pts) for (const [ox, oy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (!(bm.get(x + ox, py + oy) >>> 24)) bm.set(x + ox, py + oy, halo);
    for (const [x, py] of pts) bm.set(x, py, rgba(ION[f === 1 ? 0 : 1]));
    // branch
    const bx = 8 + Math.floor(rnd() * (len - 16));
    const by = pts.find((p) => p[0] === bx)?.[1] ?? 12;
    line(bx, by, bx + 8, by + (rnd() < 0.5 ? -8 : 8), (px, py) => bm.set(px, py, rgba(ION[2])));
    out.push(bm);
  }
  return out;
}

export function ionBurst(frames = 4) {
  const maps = [
    ['...i...', '..iIi..', '.iIIIi.', 'iIIIIIi', '.iIIIi.', '..iIi..', '...i...'],
    ['i..i..i', '.i.I.i.', '..III..', 'iIIIIIi', '..III..', '.i.I.i.', 'i..i..i'],
    ['i.....i', '...i...', '.i.I.i.', '..III..', '.i.I.i.', '...i...', 'i.....i'],
    ['.......', '...i...', '..i.i..', '.i...i.', '..i.i..', '...i...', '.......'],
  ];
  return maps.slice(0, frames).map((m) => fromMap(m, { i: ION[2], I: ION[0] }));
}

// ------------------------------------------------------------- fireballs ---
// size: radius in px. Frames: flash -> fireball -> breakup -> smoke.
export function explosion(radius, frames = 8, seed = 1) {
  const rnd = mulberry32(seed * 977 + radius);
  // a dominant core plus lumps spread evenly around it (no lopsided shapes)
  const blobs = [{ x: 0, y: 0, r: radius * 0.72 }];
  const nb = 5 + Math.round(radius / 3);
  const a0 = rnd() * Math.PI * 2;
  for (let i = 0; i < nb; i++) {
    const a = a0 + (i / nb) * Math.PI * 2 + (rnd() - 0.5) * 0.6, d = radius * (0.38 + rnd() * 0.22);
    blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.85, r: radius * (0.28 + rnd() * 0.2) });
  }
  const s = radius * 2 + 4, c = s / 2;
  const out = [];
  for (let f = 0; f < frames; f++) {
    const t = f / (frames - 1);
    const grow = 0.45 + 0.65 * Math.min(1, t * 2.2);
    const heat = Math.max(0, 1 - t * 1.25);
    const bm = new Bitmap(s, s);
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        let v = 0;
        for (const b of blobs) {
          const bx = c + b.x * grow, by = c + b.y * grow - t * radius * 0.35;
          const d = Math.hypot(x + 0.5 - bx, y + 0.5 - by) / (b.r * grow);
          if (d < 1) v = Math.max(v, 1 - d);
        }
        // erosion: late frames break into holes
        v -= t * t * (0.35 + 0.25 * Math.sin(x * 1.7 + y * 2.3 + seed));
        if (v <= 0) continue;
        if (v < 0.12 + dither(x, y) * 0.18) continue;
        const k = v * heat + dither(x, y) * 0.15;
        let hex;
        if (heat > 0.05 && k > 0.62) hex = FIRE[f === 0 ? 0 : 1];
        else if (heat > 0.05 && k > 0.46) hex = FIRE[2];
        else if (heat > 0.05 && k > 0.32) hex = FIRE[3];
        else if (heat > 0.1 && k > 0.2) hex = FIRE[4];
        else if (heat > 0.25 && k > 0.12) hex = FIRE[5];
        else hex = SMOKE[Math.min(4, 1 + Math.floor((1 - v) * 3) + (t > 0.8 ? 1 : 0))];
        bm.set(x, y, rgba(hex));
      }
    out.push(bm);
  }
  return out;
}

export function smokePuff(r = 6, frames = 6, seed = 3) {
  const rnd = mulberry32(seed);
  const blobs = [{ x: 0, y: 0, r: r * 0.75 }, ...Array.from({ length: 4 }, () => ({ x: (rnd() - 0.5) * r, y: (rnd() - 0.5) * r * 0.6, r: r * (0.45 + rnd() * 0.3) }))];
  const s = r * 2 + 6, c = s / 2;
  const out = [];
  for (let f = 0; f < frames; f++) {
    const t = f / (frames - 1);
    const g = 0.6 + t * 0.6;
    const bm = new Bitmap(s, s);
    const field = (px, py) => {
      let v = 0;
      for (const b of blobs) {
        const d = Math.hypot(px - (c + b.x * g), py - (c + b.y * g - t * 3)) / (b.r * g);
        if (d < 1) v = Math.max(v, 1 - d);
      }
      return v;
    };
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = field(x + 0.5, y + 0.5);
        if (v <= 0 || v < t * 0.32 + dither(x, y) * 0.14) continue;
        // dense core lit from the top-left, thin dithered rim in shade
        const lit = field(x + 1, y + 1) > v - 0.02; // surface faces the top-left light
        const shade = v > 0.5 ? (lit ? 0 : 1) : v > 0.25 ? (lit ? 1 : 2) : 3;
        bm.set(x, y, rgba(SMOKE[Math.min(4, shade + (t > 0.7 ? 1 : 0))], Math.round(215 - t * 70)));
      }
    out.push(bm);
  }
  return out;
}

export function scorch(r = 9, seed = 5) {
  const rnd = mulberry32(seed);
  const s = r * 2 + 2, c = s / 2;
  const bm = new Bitmap(s, s);
  const lobes = Array.from({ length: 6 }, () => ({ a: rnd() * Math.PI * 2, k: 0.7 + rnd() * 0.5 }));
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = x + 0.5 - c, dy = (y + 0.5 - c) * 1.45; // flattened for 3/4 ground
      const a = Math.atan2(dy, dx);
      let k = 0.75;
      for (const l of lobes) k += 0.12 * Math.cos(a - l.a) * l.k;
      const d = Math.hypot(dx, dy) / (r * k);
      if (d > 1) continue;
      if (d > 0.7 && dither(x, y) < (d - 0.7) / 0.3) continue;
      bm.set(x, y, rgba(SCORCH[d < 0.35 ? 2 : d < 0.65 ? 1 : 0], d < 0.65 ? 220 : 170));
    }
  // a few debris specks
  for (let i = 0; i < 5; i++) {
    const a = rnd() * Math.PI * 2, d = r * (0.8 + rnd() * 0.3);
    bm.set(Math.round(c + Math.cos(a) * d), Math.round(c + (Math.sin(a) * d) / 1.45), rgba(SMOKE[3]));
  }
  return bm;
}

// ------------------------------------------------------------- shields -----
// Hex-bubble ripple: a hex lattice masked to an ellipse, bright at the impact
// side, expanding and fading over 4 frames.
const HEX = [
  '...VVVV...',
  '..V....V..',
  '.V......V.',
  'V........V',
  '.V......V.',
  '..V....V..',
  '...VVVV...',
];
export function shieldRipple(w = 20, h = 22, frames = 4) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const bm = new Bitmap(w, h);
    const cx = w / 2, cy = h / 2;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = Math.hypot((x + 0.5 - cx) / (w / 2), (y + 0.5 - cy) / (h / 2));
        if (d > 1) continue;
        const rim = d > 0.92;
        const row = HEX[(y + (Math.floor(x / 10) % 2) * 3) % 7];
        const onHex = row[x % 10] === 'V';
        // ripple band travels outward from the impact (left side)
        const band = Math.abs(d - f / (frames - 1)) < 0.28;
        if (rim) bm.set(x, y, rgba(SHIELD[f < 2 ? 1 : 2], 210 - f * 40));
        else if (onHex && band) bm.set(x, y, rgba(SHIELD[f === 0 ? 0 : 1], 200 - f * 35));
        else if (onHex && f < 2) bm.set(x, y, rgba(SHIELD[2], 70));
      }
    out.push(bm);
  }
  return out;
}

// ------------------------------------------------------------- small fx ----
export const MUZZLE_FIRE = [
  '....F....',
  '...FfF...',
  '..FfFfF..',
  '.FfF#FfF.',
  'FfF###FfF',
  '.FfF#FfF.',
  '..FfFfF..',
  '...FfF...',
  '....F....',
];
export const BACKBLAST = [
  '..s..',
  '.sfs.',
  'sfFfs',
  '.sfs.',
  '..s..',
];
export function impactSparks(pal, frames = 4) {
  const maps = [
    ['....a....', '...aBa...', '..aBWBa..', '.aBWWWBa.', 'aBWWWWWBa', '.aBWWWBa.', '..aBWBa..', '...aBa...', '....a....'],
    ['a.......a', '.a..B..a.', '...BWB...', '..BWWWB..', '.BWWWWWB.', '..BWWWB..', '...BWB...', '.a..B..a.', 'a.......a'],
    ['a.......a', '.........', '..a.B.a..', '...BWB...', '..BWWWB..', '...BWB...', '..a.B.a..', '.........', 'a.......a'],
    ['a.......a', '.........', '.........', '....B....', '...B.B...', '....B....', '.........', '.........', 'a.......a'],
  ];
  return maps.slice(0, frames).map((m) => fromMap(m, { a: pal[3], B: pal[2], W: pal[0] }));
}
export function metalSparks() {
  const maps = [
    ['........a', '.......a.', '..b..ba..', '...bWWb..', '...WWWW..', '..bWWb...', '.ab..b...', 'a........', '.........'],
    ['a.......b', '.a.....b.', '.........', '...b.a...', '....W....', '...a.b...', '.........', '.b.....a.', 'b.......a'],
    ['b........', '.........', '......a..', '.........', '...a.....', '.........', '.......b.', '.........', '..a......'],
  ];
  return maps.map((m) => fromMap(m, { a: SPARK[2], b: SPARK[1], W: SPARK[0] }));
}
export const DEBRIS = [
  ['kk', 'hk'],
  ['.k.', 'kGk', '.kk'],
  ['kkk', 'kAk'],
  ['k.', 'kk'],
];
export function rainStreak() {
  const bm = new Bitmap(3, 11);
  const c1 = rgba('#d6e6e6', 160), c2 = rgba('#a6bcbd', 120), c3 = rgba('#8aa1a2', 70);
  [[2, 0, c1], [2, 1, c1], [2, 2, c1], [2, 3, c2], [1, 4, c2], [1, 5, c2], [1, 6, c2], [1, 7, c3], [0, 8, c3], [0, 9, c3], [0, 10, c3]].forEach(([x, y, c]) => bm.set(x, y, c));
  return bm;
}
export function rainSplash() {
  const maps = [
    ['.....', '..0..', '.....'],
    ['.....', '.0.0.', '..9..'],
    ['0...0', '.....', '.9.9.'],
  ];
  return maps.map((m) => hd(fromMap(m, { 0: '#d6e4e4', 9: '#8fa5a6' }), false));
}

// Weather motes (hand-placed): dust (Geonosis), leaves (Kashyyyk), spores
// (Umbara, glowing), embers (Mustafar).
const W_LG = { 1: '#c9a27a', 2: '#a06c48', 3: '#7f8c5e', 4: '#8a6a48', 5: '#465334', 6: '#3be3d7', 7: '#a46cff', 8: '#ffb347', 9: '#ff6a1f' };
const LEAF = [['.33', '345', '45.'], ['3..', '334', '.45'], ['.3.', '345', '.5.'], ['..3', '.34', '345']];
function weatherSprites() {
  const m = (rows) => fromMap(rows, W_LG);
  return {
    dust: [m(['1']), m(['12']), m(['2'])],
    leaf: LEAF.map(m),
    spore: [m(['6']), m(['.6.', '666', '.6.']), m(['7']), m(['.7.', '777', '.7.'])],
    ember: [m(['8']), m(['9']), m(['8', '9'])],
  };
}

// Expanding ion ring for the Pulse Dome (pixel circles, ion ramp).
export function pulseRing(r, frames = 6) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const rr = Math.round(r * (0.3 + 0.7 * (f + 1) / frames));
    const size = rr * 2 + 3;
    const bm = new Bitmap(size, size);
    const c = size >> 1;
    const cols = [ION[1], ION[2], ION[3]];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - c, (y - c) * 1.15);
        const k = Math.abs(d - rr);
        if (k < 1) bm.set(x, y, rgba(cols[Math.min(2, f >> 1)]));
        else if (k < 2 && f < frames - 1) bm.set(x, y, rgba(cols[2], 160));
      }
    out.push(bm);
  }
  return out;
}

export function buildVfx() {
  return {
    weather: weatherSprites(),
    pulse: pulseRing(100),
    boltRep: boltFrames(REPUBLIC_BOLT),
    boltSep: boltFrames(SEPARATIST_BOLT),
    glowRep: glow(REPUBLIC_BOLT[2], 10),
    glowSep: glow(SEPARATIST_BOLT[2], 10),
    glowIon: glow(ION[2], 14),
    glowFire: glow(FIRE[3], 24, 120),
    ionArc: ionArc(80, 4),
    ionBurst: ionBurst().map((b) => hd(b, false)),
    expS: explosion(12, 10, 1),
    expM: explosion(20, 12, 2),
    expL: explosion(34, 15, 3),
    smoke: smokePuff(16, 8, 3),
    smokeBig: smokePuff(22, 9, 9),
    scorch: [scorch(14, 5), scorch(20, 11), scorch(30, 17)],
    shield: shieldRipple(40, 44, 6),
    sparksRep: impactSparks(REPUBLIC_BOLT),
    sparksSep: impactSparks(SEPARATIST_BOLT),
    sparksMetal: metalSparks(),
    muzzleFire: fromMap(MUZZLE_FIRE),
    backblast: hd(fromMap(BACKBLAST, { s: SMOKE[1] }), false),
    debris: DEBRIS.map((m) => hd(fromMap(m))),
    rain: rainStreak(),
    splash: rainSplash(),
  };
}

// Soft elliptical ground shadow (top-left light -> drawn under the feet).
export function shadowBlob(w, h = 3, alpha = 80) {
  const bm = new Bitmap(w, h);
  const cx = w / 2, cy = h / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.hypot((x + 0.5 - cx) / (w / 2), (y + 0.5 - cy) / (h / 2));
      if (d <= 1) bm.set(x, y, pack(0, 0, 0, d < 0.6 ? alpha : Math.round(alpha * 0.6)));
    }
  return bm;
}

// Blue hologram treatment for briefing transmissions: luminance -> cyan
// ramp, alternate rows dimmed as scanlines. Flicker is applied at draw time.
const HOLO = ['#e2fdff', '#9ff0ff', '#56cdf2', '#2a8cc4', '#134e80'];
export function hologram(src) {
  const out = new Bitmap(src.w, src.h);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      const p = src.d[y * src.w + x];
      if (!(p >>> 24)) continue;
      const lum = ((p & 255) + ((p >>> 8) & 255) + ((p >>> 16) & 255)) / 765;
      const i = lum > 0.8 ? 0 : lum > 0.62 ? 1 : lum > 0.42 ? 2 : lum > 0.22 ? 3 : 4;
      out.set(x, y, rgba(HOLO[i], y % 2 ? 150 : 235));
    }
  return out;
}
