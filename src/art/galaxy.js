// Galaxy map art (spec §8): rotating planet globes, the Republic cruiser
// that flies between them, and a nebula backdrop.
// Planet surfaces are hand-placed 32x16 maps (digits = that planet's mood
// palette, light to dark). Code only wraps them onto a sphere (like the
// RotSprite pass for turrets): top-left light, the night side drops two
// shades down the same palette with ordered dithering, 1px dark outline.

import { Bitmap, fromMap, rgba } from './bitmap.js';
import { OUTLINE, PLANET_PALETTES } from './palettes.js';
import { hd } from './rotsprite.js';

const SURFACE = {
  kamino: [
    '22221111222233332222111122223333',
    '33322223666655566663333222655663',
    '66556666665566669966655666666556',
    '65566996655666656655566690655666',
    '56666556666112266665566666655665',
    '66655666612222116666665566666556',
    '65566665566112666556666116666655',
    '66666955666666665566661226556666',
    '56655666666556666669666611666655',
    '66666556662211666566655666665566',
    '66556666612222166666556666955666',
    '65566666661126666656666666556666',
    '66665566666666556666666556666556',
    '33666633336666333366663333663333',
    '22333322223333222233332222332222',
    '11222211112222111122221111221111',
  ],
  geonosis: [
    '33333344443333334444333333444433',
    '22223333222233332222333322223333',
    '22122221122222112222211222221122',
    '11221112222111122211122111221112',
    '21112211543211122111222112111221',
    '11122111455411211121111221111211',
    '12211211234321112211211111221112',
    '11111122111111221111122211111111',
    '22111112211111121154311112211222',
    '21122111122211111145541111122112',
    '11222111111221112123321112111122',
    '22112221111122211111111222111222',
    '22222112222111222221122222112222',
    '33222333322223333222333322233333',
    '33333334433333443333344333334433',
    '44444444444444444444444444444444',
  ],
  kashyyyk: [
    '11111222111112221111122211112221',
    '22233332222333322223333222233332',
    '33343333344333343333443333433334',
    '32233223322333332223333223322332',
    '22333322333222333322233332223332',
    '33221233332211223333122233332233',
    '33322233322233223332223333222333',
    '43333344333333443333334433333443',
    '33223333223333332233333322333322',
    '32233322332223333223332233322233',
    '22332233223332233223322332233223',
    '33343334433334333443333433344333',
    '33333333333333333333333333333333',
    '22233332222333322223333222233332',
    '11122221111222211112222111122221',
    '11111111111111111111111111111111',
  ],
  umbara: [
    '11111222111112221111122211112221',
    '22223333222233332222333322223333',
    '33343333344333343363443333433334',
    '43333443333343333443333443373334',
    '33363333443333344333363333443333',
    '44443344443364444344443344443344',
    '44444444444444444444444484444444',
    '44644444444444464444444444444644',
    '44444448444444444444644444444444',
    '44444444444464444444444448444444',
    '44464444444444444444444444444444',
    '34444443444444434444444344444443',
    '33443333443333443333443333443333',
    '33333333333333333333333333333333',
    '22223333222233332222333322223333',
    '11112222111122221111222211112222',
  ],
  mustafar: [
    '22222233222222332222223322222233',
    '33323333332233333332333333223333',
    '33338833333334433333883333333443',
    '43386783444333443338678344433344',
    '33338833334433333333883333443333',
    '44433334443333883444333344433333',
    '33443344334338678333443344334433',
    '34433443344333883443344334433443',
    '33888333443333333443338833334433',
    '38676833334433443333386783333334',
    '33888334433333344333338833344333',
    '44333344333883344333443333883344',
    '33443333444386783344333344868833',
    '33333443333388833333443333383333',
    '22223333222233332222333322223333',
    '11112222111122221111222211112222',
  ],
};

// Lit/night colors: the same planet palette, sorted by luminance; the night
// side sits two steps darker (never off-palette).
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
}
function ramps(planet) {
  const pal = PLANET_PALETTES[planet.toUpperCase()];
  const order = pal.map((c, i) => [lum(c), i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  const darker = (i, k) => pal[order[Math.min(order.length - 1, order.indexOf(i) + k)]];
  return { pal, darker, lightest: pal[order[0]] };
}

// Scale2x on a character grid (keeps hand-placed shapes, rounds corners).
function scale2xMap(rows) {
  const h = rows.length, w = rows[0].length, out = [];
  const at = (x, y) => rows[Math.max(0, Math.min(h - 1, y))][((x % w) + w) % w];
  for (let y = 0; y < h; y++) {
    let r0 = '', r1 = '';
    for (let x = 0; x < w; x++) {
      const E = at(x, y), B = at(x, y - 1), D = at(x - 1, y), F = at(x + 1, y), H = at(x, y + 1);
      if (B !== H && D !== F) {
        r0 += D === B ? D : E; r0 += B === F ? F : E;
        r1 += D === H ? D : E; r1 += H === F ? F : E;
      } else { r0 += E + E; r1 += E + E; }
    }
    out.push(r0, r1);
  }
  return out;
}
const TEX = {};
const texOf = (planet) => (TEX[planet] ||= scale2xMap(scale2xMap(SURFACE[planet])));

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const L = (() => { const v = [-0.62, -0.52, 0.58], m = Math.hypot(...v); return v.map((x) => x / m); })();

// One frame of a globe, diameter D art px, rotated by `rot` (0..1).
export function planetFrame(planet, D, rot) {
  const tex = texOf(planet);
  const TW = tex[0].length, TH = tex.length;
  const { pal, darker } = ramps(planet);
  const out = new Bitmap(D, D);
  const r = D / 2 - 1, c = D / 2 - 0.5;
  const ok = rgba(OUTLINE[0]);
  const rim = rgba(ramps(planet).lightest);
  for (let y = 0; y < D; y++)
    for (let x = 0; x < D; x++) {
      const nx = (x - c) / r, ny = (y - c) / r, d2 = nx * nx + ny * ny;
      if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2);
      const lon = Math.atan2(nx, nz) / (Math.PI * 2) + 0.5 + rot;
      const lat = Math.asin(ny) / Math.PI + 0.5;
      const u = Math.floor((((lon % 1) + 1) % 1) * TW) % TW, v = Math.min(TH - 1, Math.floor(lat * TH));
      const ch = tex[v][u];
      const idx = ch === '0' ? 9 : Number(ch) - 1;
      const light = nx * L[0] + ny * L[1] + nz * L[2];
      const t = BAYER[(y & 3) * 4 + (x & 3)];
      let col = pal[idx];
      if (light < 0.05) col = darker(idx, light < -0.25 || t < 0.5 ? 3 : 2);
      else if (light < 0.3 && t < (0.3 - light) / 0.25) col = darker(idx, 2);
      out.d[y * D + x] = rgba(col);
    }
  // 1px outline just inside the circle edge
  const o = new Bitmap(D, D);
  o.d.set(out.d);
  for (let y = 0; y < D; y++)
    for (let x = 0; x < D; x++) {
      if (!out.d[y * D + x]) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X >= D || Y >= D || !out.d[Y * D + X]; });
      // lit limb: atmosphere rim in the planet's lightest color, else outline
      const nx = (x - c) / r, ny = (y - c) / r;
      if (edge) o.d[y * D + x] = nx * L[0] + ny * L[1] > 0.35 ? rim : ok;
    }
  return o;
}

export function planetFrames(planet, D, n = 32) {
  return Array.from({ length: n }, (_, i) => planetFrame(planet, D, i / n));
}

// Original Republic frigate: long armored hull, bridge tower aft, twin
// engines; faces right. Two engine-flicker frames.
const CRUISER = [
  '...........kkk......................',
  '..........kWWvk.....................',
  '..........kTtvk.....................',
  '.....kkkkkkWWvvkkkkkkkkkkkkkk.......',
  '...kkmMMkWWWWWWWWWWWWWWWWWWwwkkk....',
  '..kCkmMMkWwwwwwwwwwwwwwwwwwwwwvvkk..',
  '.kCCkmMNkWwppppppppppppppwwwwvvvvvk.',
  'kCCCkmMNkWvvvvvvvvvvvvvvvvvvvvvuuuuk',
  '.kCCkmMNkvvvvvvvvvvvvvvvvvvvvuuuukk.',
  '..kCkmMMkvvvvuuuuuuuuuuuuuuuukkk....',
  '...kkkkkkkkkkkkkkkkkkkkkkkkkkk......',
];
export function cruiser() {
  return [0, 1].map((f) => hd(fromMap(f ? CRUISER.map((r) => r.replace(/C/g, 'c')) : CRUISER)));
}

// Nebula backdrop: soft dithered clouds in the UI accent and Umbara violet,
// generated once (VFX; ordered dithering, palette colors only).
export function nebula(w, h, seed = 7) {
  const out = new Bitmap(w, h);
  const cols = ['#38b8e0', '#a46cff', '#1d6f95', '#6a4bb0', '#1a252c', '#2e2a42'].map((c) => rgba(c));
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const blobs = Array.from({ length: 9 }, () => ({ x: rnd() * w, y: rnd() * h, r: (0.15 + rnd() * 0.25) * Math.max(w, h), k: Math.floor(rnd() * 2) }));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let a = 0, k = 0;
      for (const b of blobs) {
        const d = Math.hypot((x - b.x) / b.r, (y - b.y) / (b.r * 0.6));
        const v = Math.max(0, 1 - d);
        if (v > a) { a = v; k = b.k; }
      }
      // wispy edges: cheap layered sine noise breaks the ellipses up
      a += Math.sin(x * 0.13 + Math.sin(y * 0.07) * 3) * 0.16 + Math.sin(y * 0.19 + x * 0.05 + Math.sin(x * 0.03) * 2) * 0.12 - 0.12;
      const t = BAYER[(y & 3) * 4 + (x & 3)];
      if (a > 0.85 && t < (a - 0.85) * 1.5) out.d[y * w + x] = cols[k];
      else if (a > 0.55 && t < (a - 0.55) * 1.2) out.d[y * w + x] = cols[2 + k];
      else if (a > 0.12 && t < (a - 0.12) * 1.6) out.d[y * w + x] = cols[4 + k];
    }
  return out;
}
