// Dev helper: render a list of bitmaps side by side, upscaled, on a mid-gray bg.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { Bitmap, blit, fill, scale, toCanvas } from '../../src/art/bitmap.js';
export function preview(file, frames, { n = 8, gap = 3, bg = '#3a4148', cols = 99 } = {}) {
  const rows = [];
  for (let i = 0; i < frames.length; i += cols) rows.push(frames.slice(i, i + cols));
  const W = Math.max(...rows.map(r => r.reduce((s, f) => s + f.w + gap, gap)));
  const H = rows.reduce((s, r) => s + Math.max(...r.map(f => f.h)) + gap, gap);
  const bm = fill(new Bitmap(W, H), 0, 0, W, H, bg);
  let y = gap;
  for (const r of rows) { let x = gap; for (const f of r) { blit(bm, f, x, y); x += f.w + gap; } y += Math.max(...r.map(f => f.h)) + gap; }
  writeFileSync(file, toCanvas(scale(bm, n), createCanvas).toBuffer('image/png'));
}
