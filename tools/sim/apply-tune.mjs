// Copy tuner results (JSON lines from tools/sim/tune.mjs) into the hp
// values of src/data/balance.js.   node tools/sim/apply-tune.mjs results/*.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const file = join(dirname(fileURLToPath(import.meta.url)), '../../src/data/balance.js');
let src = readFileSync(file, 'utf8');
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(f, 'utf8').trim().split('\n').at(-1));
  if (r.hp == null) { console.log(`${r.level}: no value (${r.note})`); continue; }
  const re = new RegExp(`('${r.level}': \\{ b0: [\\d.]+, hp: )[\\d.]+`);
  if (!re.test(src)) { console.log(`${r.level}: not in balance.js`); continue; }
  src = src.replace(re, `$1${r.hp}`);
  console.log(`${r.level}: hp ${r.hp}`);
}
writeFileSync(file, src);
