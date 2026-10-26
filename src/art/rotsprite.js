// RotSprite-style rotation for turret heads: upscale x8 with Scale2x (EPX)
// three times, rotate nearest-neighbor, downsample by block majority, then
// clean stray pixels. Run once at load time; never rotate at draw time.

import { Bitmap, cleanOrphans } from './bitmap.js';

export function scale2x(src) {
  const { w, h } = src;
  const out = new Bitmap(w * 2, h * 2);
  const g = (x, y) => src.d[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const P = g(x, y), A = g(x, y - 1), B = g(x + 1, y), C = g(x - 1, y), D = g(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (C === A && C !== D && A !== B) e0 = A;
      if (A === B && A !== C && B !== D) e1 = B;
      if (D === C && D !== B && C !== A) e2 = C;
      if (B === D && B !== A && D !== C) e3 = D;
      const o = y * 2 * out.w + x * 2;
      out.d[o] = e0;
      out.d[o + 1] = e1;
      out.d[o + out.w] = e2;
      out.d[o + out.w + 1] = e3;
    }
  return out;
}

// Rotate `src` by `angle` radians around pivot (px, py) in source pixels.
// Returns a size x size bitmap whose center is the pivot.
export function rotSprite(src, angle, px = src.w / 2, py = src.h / 2, size = 0) {
  const N = 8;
  const big = scale2x(scale2x(scale2x(src)));
  const out = size || Math.ceil(Math.hypot(src.w, src.h)) + 2;
  const res = new Bitmap(out, out);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const half = out / 2;
  const counts = new Map();
  for (let oy = 0; oy < out; oy++)
    for (let ox = 0; ox < out; ox++) {
      counts.clear();
      let clear = 0;
      // Sample the 8x8 sub-grid of this output pixel in the upscaled space.
      for (let sy = 0; sy < N; sy++)
        for (let sx = 0; sx < N; sx++) {
          const dx = ox - half + (sx + 0.5) / N;
          const dy = oy - half + (sy + 0.5) / N;
          // inverse rotation into source space
          const ux = cos * dx + sin * dy + px;
          const uy = -sin * dx + cos * dy + py;
          const bx = Math.floor(ux * N), by = Math.floor(uy * N);
          if (bx < 0 || by < 0 || bx >= big.w || by >= big.h) { clear++; continue; }
          const p = big.d[by * big.w + bx];
          if (!(p >>> 24)) { clear++; continue; }
          counts.set(p, (counts.get(p) || 0) + 1);
        }
      if (clear > (N * N) / 2) continue;
      let best = 0, bn = -1;
      for (const [p, n] of counts) if (n > bn) { bn = n; best = p; }
      res.d[oy * out + ox] = best;
    }
  return cleanOrphans(res);
}

// Build `dirs` evenly spaced rotations. Direction 0 points east (+x),
// increasing clockwise in screen space (y down).
export function rotations(src, dirs = 16, px, py, size) {
  const frames = [];
  for (let i = 0; i < dirs; i++) frames.push(rotSprite(src, (i / dirs) * Math.PI * 2, px, py, size));
  return frames;
}
