import test from 'node:test';
import assert from 'node:assert/strict';
import { Cloud, loginEmail } from '../src/save/cloud.js';
import { emptySave, SAVE_VERSION } from '../src/save/schema.js';

test('login: a username maps to username@domain; an email is used as-is', () => {
  assert.equal(loginEmail('Andrew', 'example.invalid'), 'andrew@example.invalid');
  assert.equal(loginEmail('  me@mail.com '), 'me@mail.com');
});

// Minimal stand-in for the Supabase client: one `saves` table.
function fakeClient(row = null, { fail = false } = {}) {
  const db = { row, upserts: [] };
  return {
    db,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => (fail ? { data: null, error: new Error('network') } : { data: db.row, error: null }) }) }),
      upsert: async (r) => { if (fail) return { error: new Error('network') }; db.upserts.push(r); db.row = { data: r.data, updated_at: r.updated_at }; return { error: null }; },
    }),
  };
}
function appWith(save) {
  const app = { save, replaced: 0 };
  app.replaceSave = (d) => { app.save = d; app.replaced++; };
  return app;
}

test('cloud: login/launch merges cloud into local (max per field) and uploads the result', async () => {
  const local = emptySave(100);
  local.levels['kamino-1'] = { stars: 1, heroic: false, bestLives: 5, wins: 1, master: false };
  const remote = emptySave(200);
  remote.levels['kamino-1'] = { stars: 3, heroic: false, bestLives: 20, wins: 2, master: false };
  remote.levels['kamino-2'] = { stars: 2, heroic: false, bestLives: 12, wins: 1, master: false };
  const app = appWith(local);
  const c = new Cloud(app);
  c.client = fakeClient({ data: remote, updated_at: 'x' });
  c.user = { id: 'u1' };
  await c.pull();
  assert.equal(app.replaced, 1);
  assert.equal(app.save.levels['kamino-1'].stars, 3);
  assert.equal(app.save.levels['kamino-2'].stars, 2);
  const up = c.client.db.upserts.at(-1);
  assert.equal(up.user_id, 'u1');
  assert.equal(up.save_version, SAVE_VERSION);
  assert.equal(up.data.levels['kamino-2'].stars, 2);
  assert.equal(c.state, 'synced');
  assert.equal(c.dirty, false);
});

test('cloud: first login with no row uploads local progress; errors leave the local save alone', async () => {
  const local = emptySave(100);
  local.levels['kamino-1'] = { stars: 2, heroic: false, bestLives: 9, wins: 1, master: false };
  const app = appWith(local);
  const c = new Cloud(app);
  c.client = fakeClient(null);
  c.user = { id: 'u1' };
  await c.pull();
  assert.equal(app.replaced, 0);
  assert.equal(c.client.db.upserts.length, 1);
  const off = new Cloud(appWith(local));
  off.client = fakeClient(null, { fail: true });
  off.user = { id: 'u1' };
  await off.pull();
  assert.equal(off.state, 'offline');
  assert.equal(off.app.save.levels['kamino-1'].stars, 2);
});

test('cloud: not configured = local-only, no network', async () => {
  const c = new Cloud(appWith(emptySave()), { url: '', key: '' });
  assert.equal(c.configured, false);
  assert.equal(c.state, 'off');
  await c.push(); // no user, no client: nothing happens
  c.changed(true);
  assert.equal(c.dirty, true);
});
