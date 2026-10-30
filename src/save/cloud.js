// Cloud saves (spec §15): one Supabase row per user, merged with the local
// save by mergeSaves (max per field, newer in-progress level wins). The game
// is offline-first: everything saves locally first, and sync only ever adds.
// Uploads: after a level, after tech changes, on hide, and every 60 s while
// anything changed. Download + merge on login and on launch.

import { SUPABASE_URL, SUPABASE_KEY, ACCOUNT_EMAIL_DOMAIN } from '../config.js';
import { mergeSaves, SAVE_VERSION } from './schema.js';

export const loginEmail = (input, domain = ACCOUNT_EMAIL_DOMAIN) => {
  const s = String(input).trim();
  return s.includes('@') ? s : `${s.toLowerCase()}@${domain}`;
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (globalThis.supabase?.createClient) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`could not load ${src}`));
    document.head.appendChild(el);
  });
}

export class Cloud {
  constructor(app, { url = SUPABASE_URL, key = SUPABASE_KEY } = {}) {
    this.app = app;
    this.url = url;
    this.key = key;
    this.client = null;
    this.user = null;
    this.state = this.configured ? 'offline' : 'off'; // off | out | syncing | synced | offline
    this.dirty = false;
    this.timer = null;
    this.error = '';
  }
  get configured() {
    return !!(this.url && this.key);
  }
  // Short label for the main menu and Settings.
  label(short = false) {
    if (short) return { off: 'LOCAL ONLY', out: 'NOT LOGGED IN', syncing: 'SYNCING', synced: 'SYNCED', offline: 'OFFLINE' }[this.state];
    return { off: 'LOCAL SAVE · CLOUD SYNC NOT SET UP', out: 'NOT LOGGED IN', syncing: 'SYNCING...', synced: 'SYNCED', offline: 'OFFLINE · SAVED LOCALLY' }[this.state];
  }

  async init() {
    if (!this.configured) return;
    try {
      await loadScript('./vendor/supabase.js');
      this.client = globalThis.supabase.createClient(this.url, this.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'republic-frontline-auth' } });
      const { data } = await this.client.auth.getSession();
      this.user = data.session?.user || null;
      this.state = this.user ? 'syncing' : 'out';
      if (this.user) await this.pull();
    } catch (e) {
      this.state = 'offline';
      this.error = String(e.message || e);
    }
    setInterval(() => { if (this.dirty) this.push(); }, 60000);
    addEventListener('online', () => { if (this.user) this.pull(); });
  }

  async login(username, password) {
    if (!this.client) return { ok: false, error: 'CLOUD SYNC IS NOT SET UP' };
    const { data, error } = await this.client.auth.signInWithPassword({ email: loginEmail(username), password });
    if (error) return { ok: false, error: error.message.toUpperCase() };
    this.user = data.user;
    await this.pull(); // local progress merges into the cloud automatically
    return { ok: true };
  }

  async logout() {
    if (this.client) await this.client.auth.signOut();
    this.user = null;
    this.state = this.configured ? 'out' : 'off';
  }

  // Download, merge with the local save, then upload the merged result.
  async pull() {
    if (!this.user) return;
    this.state = 'syncing';
    try {
      const { data, error } = await this.client.from('saves').select('data, updated_at').eq('user_id', this.user.id).maybeSingle();
      if (error) throw error;
      if (data?.data) {
        const merged = mergeSaves(this.app.save, data.data);
        this.app.replaceSave(merged);
      }
      this.dirty = true;
      await this.push();
    } catch (e) {
      this.state = 'offline';
      this.error = String(e.message || e);
    }
  }

  async push() {
    if (!this.user || !this.client) return;
    clearTimeout(this.timer);
    this.state = 'syncing';
    try {
      const doc = JSON.parse(JSON.stringify(this.app.save));
      const { error } = await this.client.from('saves').upsert({
        user_id: this.user.id, data: doc, save_version: SAVE_VERSION, updated_at: new Date(doc.updatedAt || Date.now()).toISOString(),
      });
      if (error) throw error;
      this.dirty = false;
      this.state = 'synced';
    } catch (e) {
      this.state = 'offline';
      this.error = String(e.message || e);
    }
  }

  // Something changed: upload soon (debounced). `now` for level ends / hide.
  changed(now = false) {
    this.dirty = true;
    if (!this.user) return;
    clearTimeout(this.timer);
    if (now) this.push();
    else this.timer = setTimeout(() => this.push(), 2500);
  }
}
