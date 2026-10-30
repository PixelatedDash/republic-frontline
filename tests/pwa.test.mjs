import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const sw = readFileSync('sw.js', 'utf8');
const files = JSON.parse(sw.match(/const FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"'));

function walk(p, out = []) {
  if (statSync(p).isDirectory()) for (const n of readdirSync(p)) walk(join(p, n), out);
  else if (!p.endsWith('.DS_Store')) out.push('./' + p);
  return out;
}

test('service worker precaches every game file (run tools/build-precache.mjs if this fails)', () => {
  const want = ['./index.html', './manifest.webmanifest', './vendor/supabase.js', ...walk('src'), ...walk('icons')];
  for (const f of want) assert.ok(files.includes(f), `missing from sw.js: ${f}`);
  for (const f of files) if (f !== './') assert.ok(existsSync(f), `precached file does not exist: ${f}`);
});

test('manifest: standalone landscape PWA with 192/512/maskable icons that exist', () => {
  const m = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(m.start_url, './');
  assert.equal(m.scope, './');
  assert.equal(m.display, 'standalone');
  assert.deepEqual(m.display_override, ['fullscreen', 'standalone']);
  assert.equal(m.orientation, 'landscape');
  const sizes = m.icons.map((i) => `${i.sizes}:${i.purpose}`);
  for (const s of ['192x192:any', '512x512:any', '512x512:maskable']) assert.ok(sizes.includes(s), s);
  for (const i of m.icons) {
    const png = readFileSync(i.src);
    const w = png.readUInt32BE(16), h = png.readUInt32BE(20);
    assert.equal(`${w}x${h}`, i.sizes, i.src);
  }
});

test('index.html: iOS web-app tags, manifest and touch icon', () => {
  const html = readFileSync('index.html', 'utf8');
  for (const s of ['apple-mobile-web-app-capable', 'mobile-web-app-capable', 'black-translucent', 'viewport-fit=cover', 'rel="manifest"', 'rel="apple-touch-icon"']) assert.ok(html.includes(s), s);
});

test('config: the client never ships a service-role key', () => {
  const cfg = readFileSync('src/config.js', 'utf8');
  assert.ok(!/service_role|sb_secret_/i.test(cfg.replace(/\/\/.*$/gm, '')));
});
