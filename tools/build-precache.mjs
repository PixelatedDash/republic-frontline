// Writes the precache list + a content-hash version into sw.js (spec §16).
// Run before every commit that adds, removes or changes game files:
//   node tools/build-precache.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const ROOTS = ['index.html', 'manifest.webmanifest', 'src', 'vendor', 'icons', '.nojekyll'];
const files = [];
function walk(p) {
  let st;
  try { st = statSync(p); } catch { return; }
  if (st.isDirectory()) for (const n of readdirSync(p).sort()) walk(join(p, n));
  else if (!p.endsWith('.DS_Store') && !p.endsWith('.nojekyll')) files.push(p);
}
ROOTS.forEach(walk);
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(f));
const version = hash.digest('hex').slice(0, 12);
const list = ['./', ...files.map((f) => './' + f.split('\\').join('/'))];
const sw = readFileSync('sw.js', 'utf8');
const block = `// PRECACHE-START\nconst VERSION = '${version}';\nconst FILES = ${JSON.stringify(list, null, 2).replace(/"/g, "'")};\n// PRECACHE-END`;
const out = sw.replace(/\/\/ PRECACHE-START[\s\S]*?\/\/ PRECACHE-END/, block);
writeFileSync('sw.js', out);
console.log(`sw.js: ${list.length} files, version ${version}`);
