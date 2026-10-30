// PWA icons from the art code (spec §16): node tools/export-icons.mjs
// Each size is drawn at an exact integer scale of an art-pixel icon.
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildArt } from '../src/art/index.js';
import { appIcon } from '../src/art/icon.js';
import { scale, toCanvas } from '../src/art/bitmap.js';

const art = buildArt();
mkdirSync('icons', { recursive: true });
const out = [
  ['icons/icon-192.png', 96, 2, false],
  ['icons/icon-512.png', 128, 4, false],
  ['icons/maskable-512.png', 128, 4, true],
  ['icons/apple-touch-icon.png', 90, 2, true], // iOS rounds the corners itself
];
for (const [file, size, k, maskable] of out) {
  writeFileSync(file, toCanvas(scale(appIcon(art, size, maskable), k), createCanvas).toBuffer('image/png'));
  console.log(file, size * k);
}
