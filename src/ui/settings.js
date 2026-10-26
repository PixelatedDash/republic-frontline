// Settings panel (volume sliders, toggles, sync status). Used from the title
// screen and the in-game pause menu. Returns true when closed.

import { COLORS } from './ui.js';

export function drawSettings(ui, app) {
  const r = ui.r, T = ui.T;
  const s = app.save.settings;
  const w = Math.min(300, ui.vw - 16);
  const rows = 3 * 22 + 3 * (T + 4) + 16;
  const h = Math.min(ui.vh - 8, 22 + rows + T + 10);
  const x = (ui.vw - w) >> 1, y = (ui.vh - h) >> 1;
  r.rect(0, 0, ui.vw, ui.vh, '#05080b', 0.6);
  ui.block('settings:bg', 0, 0, ui.vw, ui.vh);
  r.panel(x, y, w, h, { title: true });
  ui.block('settings:panel', x, y, w, h);
  r.text('SETTINGS', x + 8, y + 6, COLORS.accent);
  let cy = y + 20;
  const sw = w - 16;
  let changed = false;
  for (const [key, label] of [['master', 'MASTER'], ['music', 'MUSIC'], ['sfx', 'SFX']]) {
    const v = ui.slider(`set:${key}`, x + 8, cy, sw, 20, s[key], label);
    if (Math.abs(v - s[key]) > 1e-4) { s[key] = v; changed = true; }
    cy += 22;
  }
  const half = (sw - 4) >> 1;
  const tog = (key, label, col, row) => {
    const nv = ui.toggle(`set:${key}`, x + 8 + col * (half + 4), cy + row * (T + 4), half, T, s[key], label);
    if (nv !== s[key]) { s[key] = nv; changed = true; }
  };
  tog('muted', 'MUTE', 0, 0);
  tog('reduceEffects', 'REDUCE FX', 1, 0);
  tog('damageNumbers', 'DMG NUMBERS', 0, 1);
  tog('showGrid', 'GRID', 1, 1);
  tog('debug', 'DEBUG', 0, 2);
  r.text('CLOUD SYNC:', x + 8 + half + 4, cy + 2 * (T + 4) + ((T - 7) >> 1) - 5, COLORS.dim);
  r.text('NOT LOGGED IN', x + 8 + half + 4, cy + 2 * (T + 4) + ((T - 7) >> 1) + 4, COLORS.warn);
  cy += 3 * (T + 4) + 4;
  const done = ui.button('set:close', x + 8, Math.min(cy, y + h - T - 6), sw, T, { label: 'DONE', style: 'accent' });
  if (changed) app.applySettings();
  return done;
}
