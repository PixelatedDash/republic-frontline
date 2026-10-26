// Local persistence: IndexedDB first, localStorage fallback. Always saves
// locally first (cloud sync is layered on top in Phase 4).

import { migrate, emptySave } from './schema.js';

const DB = 'republic-frontline';
const STORE = 'kv';
const KEY = 'save';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export class Storage {
  constructor() {
    this.db = null;
    this.mode = 'none';
    this.timer = null;
    this.pending = null;
  }

  async init() {
    try {
      this.db = await openDb();
      this.mode = 'indexeddb';
    } catch {
      try {
        localStorage.setItem('__rf_test', '1');
        localStorage.removeItem('__rf_test');
        this.mode = 'localstorage';
      } catch {
        this.mode = 'memory';
      }
    }
  }

  async load() {
    let raw = null;
    try {
      if (this.mode === 'indexeddb') {
        raw = await new Promise((res, rej) => {
          const r = this.db.transaction(STORE).objectStore(STORE).get(KEY);
          r.onsuccess = () => res(r.result ?? null);
          r.onerror = () => rej(r.error);
        });
      } else if (this.mode === 'localstorage') {
        const s = localStorage.getItem(DB + ':' + KEY);
        raw = s ? JSON.parse(s) : null;
      }
    } catch (e) {
      console.warn('save load failed', e);
    }
    try {
      return raw ? migrate(raw) : emptySave(Date.now());
    } catch (e) {
      console.warn('save migrate failed', e);
      return emptySave(Date.now());
    }
  }

  async write(doc) {
    try {
      if (this.mode === 'indexeddb') {
        await new Promise((res, rej) => {
          const tx = this.db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(doc, KEY);
          tx.oncomplete = res;
          tx.onerror = () => rej(tx.error);
        });
      } else if (this.mode === 'localstorage') {
        localStorage.setItem(DB + ':' + KEY, JSON.stringify(doc));
      }
    } catch (e) {
      console.warn('save write failed', e);
    }
  }

  // Debounced save; flush() writes immediately (visibilitychange -> hidden).
  save(doc, delay = 400) {
    doc.updatedAt = Date.now();
    this.pending = doc;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), delay);
  }

  flush() {
    clearTimeout(this.timer);
    if (!this.pending) return Promise.resolve();
    const d = this.pending;
    this.pending = null;
    return this.write(JSON.parse(JSON.stringify(d)));
  }
}
