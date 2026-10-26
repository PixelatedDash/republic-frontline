// Canvas 2D renderer. One canvas at device resolution. The world pass uses
// an integer world scale W, the UI pass the integer screen scale S. Every
// sprite comes from the atlas; positions snap to whole art pixels.

import { Bitmap, rgba } from '../art/bitmap.js';
import { FONT7, FONT5, measure as measureText } from '../art/font.js';
import { panel as panelBm, button as buttonBm } from '../art/ui.js';

export class Renderer {
  constructor(canvas, atlas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.atlas = atlas;
    this.fonts = new Map();
    this.cache = new Map();
    this.drawCalls = 0;
  }

  resize(sc) {
    this.sc = sc;
    this.canvas.width = sc.dw;
    this.canvas.height = sc.dh;
    this.canvas.style.width = `${sc.dw / sc.dpr}px`;
    this.canvas.style.height = `${sc.dh / sc.dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  begin(color = '#0c1116') {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.imageSmoothingEnabled = false;
    c.fillStyle = color;
    c.fillRect(0, 0, this.sc.dw, this.sc.dh);
    this.drawCalls = 0;
  }

  world(cam) {
    this.mode = 'world';
    this.scale = cam.Z;
    // smoothing only matters during the 120 ms zoom ease; at rest Z is an integer
    this.ctx.setTransform(cam.Z, 0, 0, cam.Z, cam.offX, cam.offY);
  }

  // Draw a 2x-detail sprite inside the UI layer at the HI scale, positioned
  // in UI art px (keeps whole device pixels).
  hi(ref, ux, uy, a = 1, k = this.sc.HI) {
    if (!ref) return;
    const { S, ox, oy } = this.sc;
    const c = this.ctx;
    c.save();
    c.setTransform(k, 0, 0, k, Math.round(ox + ux * S), Math.round(oy + uy * S));
    if (a !== 1) c.globalAlpha = a;
    c.drawImage(ref.page, ref.x, ref.y, ref.w, ref.h, 0, 0, ref.w, ref.h);
    c.restore();
    this.drawCalls++;
  }

  ui() {
    const { S, ox, oy } = this.sc;
    this.mode = 'ui';
    this.scale = S;
    this.ctx.setTransform(S, 0, 0, S, ox, oy);
  }

  alpha(a) {
    this.ctx.globalAlpha = a;
  }

  // Additive glow batch: switch composite once per layer.
  beginAdd() {
    this.ctx.globalCompositeOperation = 'lighter';
  }
  endAdd() {
    this.ctx.globalCompositeOperation = 'source-over';
  }

  spr(ref, x, y, a = 1) {
    if (!ref) return;
    if (ref.hi && this.mode === 'ui') return this.hi(ref, x, y, a);
    const c = this.ctx;
    if (a !== 1) c.globalAlpha = a;
    c.drawImage(ref.page, ref.x, ref.y, ref.w, ref.h, Math.round(x), Math.round(y), ref.w, ref.h);
    if (a !== 1) c.globalAlpha = 1;
    this.drawCalls++;
  }

  // Draw a raw canvas (pre-rendered ground layer) at art px.
  canvasAt(cv, x, y) {
    this.ctx.drawImage(cv, Math.round(x), Math.round(y));
    this.drawCalls++;
  }

  rect(x, y, w, h, color, a = 1) {
    const c = this.ctx;
    c.globalAlpha = a;
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    c.globalAlpha = 1;
  }

  // ---- bitmap font ----
  glyphs(font, color) {
    const key = font.h + color;
    let g = this.fonts.get(key);
    if (g) return g;
    g = {};
    const c = rgba(color);
    for (const [ch, rows] of Object.entries(font.glyphs)) {
      const bm = new Bitmap(rows[0].length, rows.length);
      rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') bm.set(x, y, c); });
      g[ch] = { ref: this.atlas.add(bm), w: bm.w };
    }
    this.fonts.set(key, g);
    return g;
  }

  measure(str, font = FONT7) {
    return measureText(String(str), font);
  }

  text(str, x, y, color = '#e6ece9', { font = FONT7, align = 'left', shadow = '#0c1116' } = {}) {
    str = String(str);
    const w = measureText(str, font);
    let cx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    if (shadow) this.textRun(str, cx, y + 1, shadow, font);
    this.textRun(str, cx, y, color, font);
    return w;
  }

  // Integer-scaled text for banners/titles (n x the UI scale, still crisp).
  textBig(str, x, y, color, n = 2, { shadow = '#0c1116', align = 'center' } = {}) {
    str = String(str);
    const w = measureText(str, FONT7) * n;
    const sx = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    const c = this.ctx;
    c.save();
    c.translate(sx, Math.round(y));
    c.scale(n, n);
    if (shadow) this.textRun(str, 0, 1, shadow, FONT7);
    this.textRun(str, 0, 0, color, FONT7);
    c.restore();
    return w;
  }

  textRun(str, x, y, color, font) {
    const g = this.glyphs(font, color);
    let cx = x;
    for (const ch of str) {
      const gl = g[ch] || g[ch.toUpperCase()] || g['?'];
      if (gl) this.spr(gl.ref, cx, y);
      cx += (gl ? gl.w : 2) + font.spacing;
    }
  }

  // ---- cached 9-slice chrome ----
  cached(key, make) {
    let r = this.cache.get(key);
    if (!r) {
      r = this.atlas.add(make());
      this.cache.set(key, r);
    }
    return r;
  }

  panel(x, y, w, h, opts = {}) {
    const ref = this.cached(`p${w}x${h}${opts.title ? 't' : ''}${opts.alpha ?? ''}`, () => panelBm(w, h, opts));
    this.spr(ref, x, y);
  }

  button(x, y, w, h, opts = {}) {
    const ref = this.cached(`b${w}x${h}${opts.style || 'n'}${opts.pressed ? 'p' : ''}`, () => buttonBm(w, h, opts));
    this.spr(ref, x, y);
  }
}

export { FONT7, FONT5 };
