// Tiny RGBA bitmap used by every sprite builder. Pure JS: no DOM, no canvas,
// so it runs identically in the browser and in Node. Pixels are packed
// 0xAABBGGRR (little-endian ImageData layout).

import { LEGEND } from './palettes.js';

const cache = new Map();
export function rgba(hex, alpha = 255) {
  const key = hex + alpha;
  let v = cache.get(key);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    v = ((alpha << 24) | (b << 16) | (g << 8) | r) >>> 0;
    cache.set(key, v);
  }
  return v;
}
export const A = (p) => p >>> 24;
export const R = (p) => p & 255;
export const G = (p) => (p >>> 8) & 255;
export const B = (p) => (p >>> 16) & 255;
export const pack = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;

export class Bitmap {
  constructor(w, h, data) {
    this.w = w;
    this.h = h;
    this.d = data || new Uint32Array(w * h);
  }
  get(x, y) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x];
  }
  set(x, y, p) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = p;
  }
  clone() {
    return new Bitmap(this.w, this.h, this.d.slice());
  }
}

// Parse a hand-placed pixel map: array of equal-length strings of legend keys.
export function fromMap(rows, legend = {}) {
  const lg = { ...LEGEND, ...legend };
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const bm = new Bitmap(w, h);
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const hex = lg[ch];
      if (!hex) throw new Error(`Unknown pixel key '${ch}' at ${x},${y}`);
      bm.d[y * w + x] = rgba(hex);
    }
  }
  return bm;
}

// Alpha-composite src onto dst at (x, y).
export function blit(dst, src, x = 0, y = 0, { alpha = 1, flipX = false } = {}) {
  x |= 0;
  y |= 0;
  for (let sy = 0; sy < src.h; sy++) {
    const dy = y + sy;
    if (dy < 0 || dy >= dst.h) continue;
    for (let sx = 0; sx < src.w; sx++) {
      const dx = x + sx;
      if (dx < 0 || dx >= dst.w) continue;
      const p = src.d[sy * src.w + (flipX ? src.w - 1 - sx : sx)];
      const sa = ((p >>> 24) * alpha) | 0;
      if (sa === 0) continue;
      const i = dy * dst.w + dx;
      if (sa >= 255) {
        dst.d[i] = p;
        continue;
      }
      const q = dst.d[i];
      const da = q >>> 24;
      const oa = sa + ((da * (255 - sa)) / 255);
      const mix = (cs, cd) => Math.round((cs * sa + (cd * da * (255 - sa)) / 255) / oa);
      dst.d[i] = pack(mix(R(p), R(q)), mix(G(p), G(q)), mix(B(p), B(q)), Math.round(oa));
    }
  }
  return dst;
}

// Additive blend (used to bake glow previews; the game does this on canvas).
export function blitAdd(dst, src, x = 0, y = 0) {
  for (let sy = 0; sy < src.h; sy++) {
    for (let sx = 0; sx < src.w; sx++) {
      const p = src.d[sy * src.w + sx];
      const a = p >>> 24;
      if (!a) continue;
      const dx = x + sx, dy = y + sy;
      if (dx < 0 || dy < 0 || dx >= dst.w || dy >= dst.h) continue;
      const i = dy * dst.w + dx;
      const q = dst.d[i];
      const f = a / 255;
      const qa = q >>> 24;
      dst.d[i] = pack(
        Math.min(255, R(q) + R(p) * f),
        Math.min(255, G(q) + G(p) * f),
        Math.min(255, B(q) + B(p) * f),
        Math.max(qa, a),
      );
    }
  }
  return dst;
}

export function mirrorX(src) {
  const out = new Bitmap(src.w, src.h);
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) out.d[y * src.w + x] = src.d[y * src.w + src.w - 1 - x];
  return out;
}

export function pad(src, l, t = l, r = l, b = t) {
  const out = new Bitmap(src.w + l + r, src.h + t + b);
  return blit(out, src, l, t);
}

export function crop(src, x, y, w, h) {
  const out = new Bitmap(w, h);
  return blit(out, src, -x, -y);
}

// Replace colors: map of fromHex -> toHex (or packed values).
export function recolor(src, map) {
  const m = new Map();
  for (const [f, t] of Object.entries(map)) m.set(rgba(f), t === null ? 0 : rgba(t));
  const out = src.clone();
  for (let i = 0; i < out.d.length; i++) {
    const r = m.get(out.d[i]);
    if (r !== undefined) out.d[i] = r;
  }
  return out;
}

// Every opaque pixel becomes `hex` (hit flash / silhouettes).
export function silhouette(src, hex = '#ffffff', alpha = 255) {
  const c = rgba(hex, alpha);
  const out = new Bitmap(src.w, src.h);
  for (let i = 0; i < src.d.length; i++) if (src.d[i] >>> 24) out.d[i] = c;
  return out;
}

// Add a 1px outline around opaque pixels into transparent neighbors.
// diagonal=false gives the cleaner 4-neighbor outline used on most sprites.
export function outline(src, hex = '#101217', diagonal = false) {
  const c = rgba(hex);
  const out = src.clone();
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      if (src.get(x, y) >>> 24) continue;
      let hit = (src.get(x - 1, y) | src.get(x + 1, y) | src.get(x, y - 1) | src.get(x, y + 1)) >>> 24;
      if (!hit && diagonal)
        hit = (src.get(x - 1, y - 1) | src.get(x + 1, y - 1) | src.get(x - 1, y + 1) | src.get(x + 1, y + 1)) >>> 24;
      if (hit) out.set(x, y, c);
    }
  return out;
}

// Remove orphan pixels: opaque pixels with no opaque 4-neighbor.
export function cleanOrphans(src) {
  const out = src.clone();
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      if (!(src.get(x, y) >>> 24)) continue;
      const n = (src.get(x - 1, y) >>> 24 ? 1 : 0) + (src.get(x + 1, y) >>> 24 ? 1 : 0) +
        (src.get(x, y - 1) >>> 24 ? 1 : 0) + (src.get(x, y + 1) >>> 24 ? 1 : 0);
      if (n === 0) out.set(x, y, 0);
    }
  return out;
}

export function scale(src, n) {
  const out = new Bitmap(src.w * n, src.h * n);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) out.d[y * out.w + x] = src.d[((y / n) | 0) * src.w + ((x / n) | 0)];
  return out;
}

export function fill(bm, x, y, w, h, hex, alpha = 255) {
  const c = typeof hex === 'number' ? hex : rgba(hex, alpha);
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) bm.set(i, j, c);
  return bm;
}

// Bounding box of opaque pixels.
export function bounds(src) {
  let x0 = src.w, y0 = src.h, x1 = -1, y1 = -1;
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++)
      if (src.d[y * src.w + x] >>> 24) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? { x: 0, y: 0, w: 0, h: 0 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Shift every opaque pixel by (dx, dy) inside the same frame.
export function shift(src, dx, dy) {
  const out = new Bitmap(src.w, src.h);
  return blit(out, src, dx, dy);
}

// Convert to a canvas from any factory: (w, h) => canvas with getContext('2d').
export function toCanvas(src, createCanvas) {
  const cv = createCanvas(src.w, src.h);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const img = ctx.createImageData(src.w, src.h);
  new Uint32Array(img.data.buffer).set(src.d);
  ctx.putImageData(img, 0, 0);
  return cv;
}

// Pack many bitmaps horizontally into one strip.
export function strip(frames, gap = 0) {
  const h = Math.max(...frames.map((f) => f.h));
  const w = frames.reduce((s, f) => s + f.w, 0) + gap * (frames.length - 1);
  const out = new Bitmap(w, h);
  let x = 0;
  for (const f of frames) {
    blit(out, f, x, h - f.h);
    x += f.w + gap;
  }
  return out;
}
