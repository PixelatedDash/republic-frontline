// Immediate-mode UI drawn at screen scale S. Widgets register hit regions
// while drawing; the next frame's pointer events are tested against them
// (top-most first). A pointer that starts on a region is captured by the UI
// and never reaches the world (no accidental panning or placing).

import { FONT7 } from '../art/font.js';
import { UI as C, UI_ACCENT, UI_GOOD, UI_BAD, UI_WARN } from '../art/palettes.js';

export const COLORS = { text: C[0], dim: C[2], faint: C[3], accent: UI_ACCENT[0], good: UI_GOOD[0], bad: UI_BAD[0], warn: UI_WARN[0], dark: '#0c1116' };

export class UI {
  constructor(renderer) {
    this.r = renderer;
    this.regions = [];
    this.prev = [];
    this.clicks = new Set();
    this.captured = new Map(); // pointerId -> region id
    this.sliders = new Map(); // id -> value being dragged
    this.pressedId = null;
    this.audio = null;
  }

  layout(sc, insets) {
    this.sc = sc;
    this.vw = sc.vw;
    this.vh = sc.vh;
    this.T = Math.max(sc.tap, 20);
    this.ins = insets;
  }

  toUI(dx, dy) {
    return { x: (dx - this.sc.ox) / this.sc.S, y: (dy - this.sc.oy) / this.sc.S };
  }

  beginFrame() {
    this.prev = this.regions;
    this.regions = [];
  }

  regionAt(x, y) {
    for (let i = this.prev.length - 1; i >= 0; i--) {
      const r = this.prev[i];
      if (x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h) return r;
    }
    return null;
  }

  // Pointer routing. Returns true when the UI consumed the event.
  down(id, dx, dy) {
    const p = this.toUI(dx, dy);
    const r = this.regionAt(p.x, p.y);
    if (!r) return false;
    this.captured.set(id, r.id);
    this.pressedId = r.id;
    if (r.slider) this.sliders.set(r.id, Math.min(1, Math.max(0, (p.x - r.x) / r.w)));
    return true;
  }
  move(id, dx, dy) {
    if (!this.captured.has(id)) return false;
    const rid = this.captured.get(id);
    const r = this.prev.find((q) => q.id === rid);
    if (r && r.slider) {
      const p = this.toUI(dx, dy);
      this.sliders.set(rid, Math.min(1, Math.max(0, (p.x - r.x) / r.w)));
    }
    return true;
  }
  up(id, dx, dy) {
    if (!this.captured.has(id)) return false;
    const rid = this.captured.get(id);
    this.captured.delete(id);
    const p = this.toUI(dx, dy);
    const r = this.regionAt(p.x, p.y);
    if (r && r.id === rid && !r.slider && !r.block) {
      this.clicks.add(rid);
      this.audio && this.audio.sfx('click');
    }
    if (this.pressedId === rid) this.pressedId = null;
    return true;
  }
  isCaptured(id) {
    return this.captured.has(id);
  }

  hit(id, x, y, w, h, extra = {}) {
    this.regions.push({ id, x, y, w, h, ...extra });
  }
  // Swallow clicks over an area (modal backdrops, panels).
  block(id, x, y, w, h) {
    this.hit(id, x, y, w, h, { block: true });
  }

  clicked(id) {
    if (this.clicks.has(id)) {
      this.clicks.delete(id);
      return true;
    }
    return false;
  }

  endFrame() {
    this.clicks.clear();
  }

  // ------------------------------------------------------------ widgets --
  button(id, x, y, w, h, { label = null, icon = null, style = 'normal', disabled = false, active = false, color = null, sub = null } = {}) {
    const r = this.r;
    const pressed = active || (this.pressedId === id && [...this.captured.values()].includes(id));
    const st = disabled ? 'normal' : style;
    r.button(x, y, w, h, { style: st, pressed });
    const dy = pressed ? 1 : 0;
    const a = disabled ? 0.45 : 1;
    if (icon) {
      r.alpha(a);
      r.spr(icon, x + ((w - icon.w) >> 1), y + ((h - 3 - icon.h) >> 1) + dy);
      r.alpha(1);
    }
    if (label) {
      const dark = st === 'accent' || st === 'good';
      const col = color || (disabled ? COLORS.faint : dark ? COLORS.dark : COLORS.text);
      const ty = sub ? y + ((h - 3) >> 1) - 7 + dy : y + ((h - 3 - FONT7.h + 2) >> 1) + dy;
      r.text(label, x + w / 2, ty, col, { align: 'center', shadow: dark ? null : COLORS.dark });
      if (sub) r.text(sub, x + w / 2, ty + 9, dark ? COLORS.dark : COLORS.dim, { align: 'center', shadow: null });
    }
    if (!disabled) this.hit(id, x, y, w, h);
    else this.block(id + ':off', x, y, w, h);
    return !disabled && this.clicked(id);
  }

  slider(id, x, y, w, h, value, label) {
    const r = this.r;
    const v = this.sliders.has(id) && [...this.captured.values()].includes(id) ? this.sliders.get(id) : value;
    r.text(label, x, y, COLORS.dim);
    const by = y + 9, bh = Math.max(6, h - 10);
    r.rect(x, by + (bh >> 1) - 1, w, 3, '#101217');
    r.rect(x, by + (bh >> 1) - 1, Math.round(w * v), 3, COLORS.accent);
    const kx = x + Math.round(w * v) - 3;
    r.rect(kx, by, 6, bh, '#101217');
    r.rect(kx + 1, by + 1, 4, bh - 2, COLORS.text);
    r.text(String(Math.round(v * 100)), x + w, y, COLORS.text, { align: 'right' });
    this.hit(id, x - 4, by - 2, w + 8, bh + 4, { slider: true });
    if (this.sliders.has(id) && ![...this.captured.values()].includes(id)) {
      const nv = this.sliders.get(id);
      this.sliders.delete(id);
      return nv;
    }
    return v;
  }

  toggle(id, x, y, w, h, on, label) {
    const clicked = this.button(id, x, y, w, h, { label: `${label}: ${on ? 'ON' : 'OFF'}`, style: on ? 'accent' : 'normal' });
    return clicked ? !on : on;
  }
}
