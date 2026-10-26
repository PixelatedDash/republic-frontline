// 1920x1080 slide compositor. Every image is placed at an integer
// nearest-neighbor scale; labels use the game's own pixel font.

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'node:fs';
import { Bitmap, blit, fill, scale, toCanvas, rgba } from '../../src/art/bitmap.js';
import { drawText, measure, FONT7 } from '../../src/art/font.js';

export const SW = 1920, SH = 1080;
export const C = {
  bg: '#0c1116', bar: '#151c23', line: '#33404a', title: '#e6ece9', text: '#b8c4c3', dim: '#7d8d90',
  accent: '#7cf0ff', warn: '#ffd27a', good: '#9ef08a', checkA: '#3a4048', checkB: '#2c3238',
};

export function wrap(str, max) {
  const out = [];
  for (const para of str.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if ((line + ' ' + word).trim().length > max) { out.push(line); line = word; }
      else line = (line + ' ' + word).trim();
    }
    out.push(line);
  }
  return out;
}

export class Slide {
  constructor(title, subtitle = '', { bg = C.bg } = {}) {
    this.bm = fill(new Bitmap(SW, SH), 0, 0, SW, SH, bg);
    if (title) {
      fill(this.bm, 0, 0, SW, 96, C.bar);
      fill(this.bm, 0, 96, SW, 4, C.line);
      fill(this.bm, 48, 30, 8, 36, C.accent);
      this.text(title.toUpperCase(), 72, 26, { n: 5, color: C.title });
      if (subtitle) this.text(subtitle.toUpperCase(), 72 + measure(title.toUpperCase()) * 5 + 40, 44, { n: 2, color: C.dim });
    }
  }
  img(b, x, y, n = 4) {
    blit(this.bm, n === 1 ? b : scale(b, n), x, y);
    return { w: b.w * n, h: b.h * n };
  }
  text(str, x, y, { n = 2, color = C.text } = {}) {
    const s = String(str).toUpperCase();
    const t = new Bitmap(measure(s) + 2, FONT7.h + 2);
    drawText(t, s, 1, 1, { color });
    blit(this.bm, scale(t, n), x - n, y - n);
    return measure(s) * n;
  }
  lines(arr, x, y, { n = 2, color = C.text, gap = 6 } = {}) {
    arr.forEach((l, i) => this.text(l, x, y + i * (FONT7.h * n + gap), { n, color }));
    return arr.length * (FONT7.h * n + gap);
  }
  // Sprite on a checkerboard / ground-tile / dark backdrop.
  cell(b, x, y, n = 4, { bg = 'checker', ground = null, pad = 4, w = 0, h = 0 } = {}) {
    const cw = Math.max(w, b.w + pad * 2), ch = Math.max(h, b.h + pad * 2);
    const back = new Bitmap(cw, ch);
    if (bg === 'checker') {
      for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) back.set(i, j, rgba(((i >> 2) + (j >> 2)) % 2 ? C.checkA : C.checkB));
    } else if (bg === 'ground') {
      for (let j = 0; j < ch; j += ground.h) for (let i = 0; i < cw; i += ground.w) blit(back, ground, i, j);
    } else fill(back, 0, 0, cw, ch, bg);
    blit(back, b, (cw - b.w) >> 1, ch - pad - b.h);
    this.img(back, x, y, n);
    // thin frame
    fill(this.bm, x - 2, y - 2, cw * n + 4, 2, C.line);
    fill(this.bm, x - 2, y + ch * n, cw * n + 4, 2, C.line);
    fill(this.bm, x - 2, y, 2, ch * n, C.line);
    fill(this.bm, x + cw * n, y, 2, ch * n, C.line);
    return { w: cw * n, h: ch * n };
  }
  save(file) {
    writeFileSync(file, toCanvas(this.bm, createCanvas).toBuffer('image/png'));
  }
}
