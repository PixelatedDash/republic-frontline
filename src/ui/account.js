// Account screen (spec §15): username + password, no sign-up. The canvas
// draws the panel; two native inputs sit over it (text entry, password
// managers and the iOS keyboard need real form fields).

import { COLORS } from './ui.js';
import { Space } from './meta-screens.js';
import { ACCOUNT_EMAIL_DOMAIN } from '../config.js';

function form() {
  let f = document.getElementById('login');
  if (f) return f;
  f = document.createElement('form');
  f.id = 'login';
  f.autocomplete = 'on';
  f.innerHTML = `
    <input name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="USERNAME OR EMAIL">
    <input name="password" type="password" autocomplete="current-password" placeholder="PASSWORD">
    <button type="submit">LOG IN</button>`;
  document.body.appendChild(f);
  return f;
}

export class AccountScreen {
  constructor(app) {
    this.app = app;
    this.space = new Space(app);
    this.msg = '';
    this.busy = false;
    this.f = null;
  }
  showForm(show) {
    if (!show) { if (this.f) this.f.style.display = 'none'; return; }
    this.f = form();
    this.f.style.display = 'flex';
    this.f.onsubmit = (e) => {
      e.preventDefault();
      this.submit(this.f.username.value, this.f.password.value);
    };
  }
  async submit(user, pass) {
    if (this.busy || !user || !pass) return;
    this.busy = true;
    this.msg = 'LOGGING IN...';
    const r = await this.app.cloud.login(user, pass);
    this.busy = false;
    this.msg = r.ok ? 'LOGGED IN · PROGRESS MERGED' : r.error;
    if (r.ok && this.f) this.f.password.value = '';
  }
  leave() {
    this.showForm(false);
    this.app.go(() => this.app.toTitle());
  }
  update(dt, events) {
    this.space.update(dt);
    const ui = this.app.ui;
    for (const e of events) {
      if (e.type === 'down') ui.down(e.id, e.x, e.y);
      else if (e.type === 'move') ui.move(e.id, e.x, e.y);
      else if (e.type === 'up' || e.type === 'cancel') ui.up(e.id, e.x, e.y);
      else if (e.type === 'key' && e.key === 'Escape') this.leave();
    }
  }
  render() {
    const app = this.app, r = app.renderer, ui = app.ui, T = ui.T, c = app.cloud;
    this.space.draw(r, ui);
    ui.beginFrame();
    const w = Math.min(320, ui.vw - 16), h = Math.min(ui.vh - 12, 196);
    const x = (ui.vw - w) >> 1, y = (ui.vh - h) >> 1;
    r.panel(x, y, w, h, { title: true });
    ui.block('acc:bg', x, y, w, h);
    r.text('ACCOUNT', x + 8, y + 6, COLORS.accent);
    r.text(c.label(true), x + w - 8, y + 6, c.state === 'synced' ? COLORS.good : c.state === 'offline' ? COLORS.warn : COLORS.dim, { align: 'right' });
    let cy = y + 22;
    const line = (s, col = COLORS.text) => { r.text(s, x + 8, cy, col); cy += 10; };
    if (!c.configured) {
      this.showForm(false);
      line('CLOUD SYNC IS NOT SET UP FOR THIS COPY.', COLORS.warn);
      line('THE GAME SAVES ON THIS DEVICE AND PLAYS FULLY');
      line('OFFLINE. TO SYNC PHONE AND DESKTOP, FOLLOW');
      line('"SUPABASE SETUP" IN THE README, THEN FILL IN');
      line('SRC/CONFIG.JS.');
    } else if (c.user) {
      this.showForm(false);
      line(`LOGGED IN AS ${String(c.user.email || '').toUpperCase().replace('@' + ACCOUNT_EMAIL_DOMAIN.toUpperCase(), '')}`);
      line('PROGRESS SYNCS AFTER EVERY LEVEL, TECH CHANGE,', COLORS.dim);
      line('WHEN THE APP IS HIDDEN, AND EVERY MINUTE.', COLORS.dim);
      if (c.error && c.state === 'offline') line(c.error.toUpperCase().slice(0, 52), COLORS.warn);
      cy += 4;
      if (ui.button('acc:sync', x + 8, cy, (w - 20) >> 1, T, { label: 'SYNC NOW', style: 'accent' })) c.pull();
      if (ui.button('acc:out', x + 12 + ((w - 20) >> 1), cy, (w - 20) >> 1, T, { label: 'LOG OUT' })) { c.logout(); this.msg = 'LOGGED OUT · LOCAL SAVE KEPT'; }
    } else {
      line('LOG IN TO SYNC YOUR PROGRESS.', COLORS.dim);
      this.showForm(true);
      // place the HTML form over the panel (CSS px)
      const sc = app.sc, k = sc.S / sc.dpr;
      const fx = (sc.ox / sc.dpr) + (x + 8) * k, fy = (sc.oy / sc.dpr) + cy * k, fw = (w - 16) * k;
      Object.assign(this.f.style, { left: `${fx}px`, top: `${fy}px`, width: `${fw}px` });
    }
    if (this.msg) r.text(this.msg.slice(0, 56), x + 8, y + h - T - 18, this.msg.startsWith('LOGGED') ? COLORS.good : COLORS.warn);
    if (ui.button('acc:back', x + 8, y + h - T - 6, 70, T, { label: 'BACK' })) this.leave();
    ui.endFrame();
  }
}
