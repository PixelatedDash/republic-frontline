// Art deck exporter. Imports and runs the real src/art code in Node
// (@napi-rs/canvas), writes every sprite strip and slide to art-preview/,
// then builds art-preview.pptx with pptxgenjs. Each slide is a 1920x1080 PNG
// placed at native size on a 20x11.25in layout (96 px/in).
//
// World art is 2x detail, so sprite strips are exported at 2x (same physical
// size as the old 4x exports of 1x art). The mockup, readability and HUD
// slides are frames rendered by the real GameScreen running headless.
//
//   node tools/export-art.mjs

import { createCanvas } from '@napi-rs/canvas';
import pptxgen from 'pptxgenjs';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildArt, TIERS, TIER_NAMES, ENEMY_INFO } from '../src/art/index.js';
import { Bitmap, blit, blitAdd, fill, scale, strip, toCanvas, fromMap, silhouette, bounds, crop } from '../src/art/bitmap.js';
import { composeRifle, composeTurret, DIRS8 } from '../src/art/towers.js';
import { renderGround } from '../src/art/tilemap.js';
import * as P from '../src/art/palettes.js';
import { button, icon, ICONS, rangeCircle, gridCell, logoText } from '../src/art/ui.js';
import { MUZZLE_SMALL, MUZZLE_MED } from '../src/art/sprites/troopers.js';
import { Slide, C, SW, SH, wrap } from './art/slide.mjs';
import { headlessApp, startGame, advance, spotsNearPath } from './art/headless.mjs';
import { build, startWave } from '../src/sim/sim.js';
import { TILE } from '../src/data/levels/index.js';
import { appIcon as sharedAppIcon } from '../src/art/icon.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'art-preview');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'sprites'), { recursive: true });
mkdirSync(join(OUT, 'slides'), { recursive: true });

const png = (bm, rel, n = 2) => {
  const f = join(OUT, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, toCanvas(n === 1 ? bm : scale(bm, n), createCanvas).toBuffer('image/png'));
};
const canvasBitmap = (cv) => {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
  return new Bitmap(cv.width, cv.height, new Uint32Array(d.data.buffer.slice(0)));
};
// Exact half-size of a frame rendered at even integer scales.
const half = (bm) => {
  const out = new Bitmap(bm.w >> 1, bm.h >> 1);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.d[y * out.w + x] = bm.d[y * 2 * bm.w + x * 2];
  return out;
};

const t0 = Date.now();
const art = buildArt();
const K = art.tiles.kamino;
const GROUND = K.ground[0];
const PATHT = K.path;
const slides = [];
const addSlide = (name, s, notes) => {
  const file = `slides/${String(slides.length + 1).padStart(2, '0')}-${name}.png`;
  s.save(join(OUT, file));
  slides.push({ file, notes });
};
const tiled = (w, h, tile) => {
  const b = new Bitmap(w, h);
  for (let j = 0; j < h; j += tile.h) for (let i = 0; i < w; i += tile.w) blit(b, tile, i, j);
  return b;
};

// ------------------------------------------------------------ sprite PNGs --
for (const tier of TIERS) {
  const r = art.towers.rifle[tier];
  png(r.back, `sprites/towers/rifle-${tier}-back.png`);
  png(r.front, `sprites/towers/rifle-${tier}-front.png`);
  png(strip(DIRS8.map((d) => r.troopers[d].idle.bm), 2), `sprites/towers/rifle-${tier}-trooper-8dir-idle.png`);
  png(strip(DIRS8.map((d) => r.troopers[d].fire.bm), 2), `sprites/towers/rifle-${tier}-trooper-8dir-fire.png`);
  png(strip(DIRS8.map((d) => composeRifle(r, d)), 4), `sprites/towers/rifle-${tier}-composite-8dir.png`);
  for (const kind of ['rocket', 'flak']) {
    const t = art.towers[kind][tier];
    png(t.base, `sprites/towers/${kind}-${tier}-base.png`);
    png(strip(t.frames, 2), `sprites/towers/${kind}-${tier}-head-32dir.png`, 1);
    png(strip(t.frames.map((_, i) => composeTurret(t, i)).filter((_, i) => i % 2 === 0), 2), `sprites/towers/${kind}-${tier}-composite-16of32.png`, 1);
  }
}
for (const [k, e] of Object.entries(art.enemies)) {
  if (k === 'fighter') {
    e.frames.forEach((set, i) => png(strip(set, 2), `sprites/enemies/fighter-32dir-thrust${i}.png`, 1));
    png(strip(e.death, 2), 'sprites/enemies/fighter-death.png');
    continue;
  }
  png(strip(e.walk, 2), `sprites/enemies/${k}-walk-6f.png`);
  png(strip(e.death, 2), `sprites/enemies/${k}-death-6f.png`);
  if (e.roll) png(strip([...e.roll, ...e.deploy], 2), `sprites/enemies/${k}-roll-deploy.png`);
}
png(strip(K.ground, 0), 'sprites/tiles/kamino-ground.png');
png(strip([K.path, K.pad, K.cliff, K.bridgeFace], 0), 'sprites/tiles/kamino-path-pad-edge-bridge.png');
png(strip(K.water, 0), 'sprites/tiles/kamino-water-8f.png');
for (const [n, b] of Object.entries(K.props)) png(b, `sprites/props/kamino-${n}.png`);
for (const [n, v] of Object.entries(art.vfx)) png(Array.isArray(v) ? strip(v, 2) : v, `sprites/vfx/${n}.png`);
for (const n of Object.keys(ICONS)) png(icon(n), `sprites/ui/icon-${n}.png`);
png(art.emblems.republic, 'sprites/ui/emblem-republic.png', 4);
png(art.emblems.separatist, 'sprites/ui/emblem-separatist.png', 4);

// ------------------------------------------------------- in-game frames ----
// One battle state shared by the mockup / readability / UI shots: real
// Kamino 1 level, every tower variant, the mixed final wave in progress.
function stageBattle(app) {
  const g = startGame(app, { levelId: 'kamino-1', difficulty: 'jedi', seed: 11 });
  const s = g.sim.state;
  s.credits = 99999;
  const view = { x0: 19, y0: 1, x1: 41, y1: 15 }; // tiles around the first bridge
  const free = (p, n) => s.towers.every((t) => {
    const m = t.type === 'rifle' ? 2 : 1;
    return p.tx >= t.tx + m + 1 || p.tx + n + 1 <= t.tx || p.ty >= t.ty + m + 1 || p.ty + n + 1 <= t.ty;
  });
  for (const tier of TIERS)
    for (const type of ['rifle', 'rocket', 'flak']) {
      const n = type === 'rifle' ? 2 : 1;
      const ok = (p) => p.d > 24 && p.d < 110 && p.tx >= view.x0 && p.ty >= view.y0 && p.tx + n <= view.x1 && p.ty + n <= view.y1 && free(p, n);
      const spot = spotsNearPath(g.sim, type).find((p) => ok(p) && build(g.sim, type, p.tx, p.ty).ok);
      if (spot) s.towers[s.towers.length - 1].tier = tier;
    }
  s.waveIndex = 11; // final wave: every droid type
  startWave(g.sim);
  advance(g, 60 * 6); // towers fire for a while: scorch marks, smoke
  // then line up one of each droid type along the visible walkway / lane
  s.pending.length = 0;
  const lineup = [['trooper', 180], ['trooper', 240], ['rush', 320], ['trooper', 400], ['shield', 520, 'walk'], ['scuttler', 600], ['scuttler', 614], ['scuttler', 628], ['scuttler', 642], ['shield', 760, 'roll'], ['rush', 860], ['trooper', 940], ['fighter', 420], ['fighter', 640]];
  lineup.forEach(([type], i) => s.pending.push({ at: s.time, type, path: 0, lane: 0, wave: 11, o: i }));
  s.waveLeft[11] += lineup.length;
  advance(g, 1);
  const fresh = s.enemies.slice(-lineup.length);
  fresh.forEach((e, i) => {
    const [, dist, mode] = lineup[i];
    e.dist = dist;
    if (mode === 'walk') { e.mode = 'walk'; e.shieldActive = true; }
    e.hp = e.maxHp * 4; // survive the next few frames
    e.maxHp = e.hp;
  });
  advance(g, 20);
  s.credits = 640;
  g.creditsShown = 640;
  g.cam.centerOn(29 * TILE, 8.5 * TILE);
  advance(g, 2);
  return g;
}

function frame(cssW, cssH, dpr, setup) {
  const { app, canvas } = headlessApp(art, cssW, cssH, dpr);
  const g = stageBattle(app);
  setup?.(g, app);
  g.render();
  return { bm: canvasBitmap(canvas), g, app };
}

const shot1080 = frame(1920, 1080, 1);
const mock = frame(960, 540, 1, (g) => { g.hideHud = true; });
png(mock.bm, 'kamino-mockup-1x.png', 1);
png(shot1080.bm, 'readability-1080p.png', 1);

// ------------------------------------------------------------ slide 1 -------
{
  const s = new Slide('', '');
  const logo1 = logoText('REPUBLIC', 3);
  const logo2 = logoText('FRONTLINE', 3, ['#a8f4ff', '#7cf0ff', '#38b8e0', '#1d6f95']);
  s.img(art.emblems.republic, 96, 90, 4);
  s.img(logo1, 300, 96, 2);
  s.img(logo2, 300, 96 + logo1.h * 2 + 8, 2);
  s.text('ART DIRECTION · 2X DETAIL', 304, 96 + (logo1.h + logo2.h) * 2 + 30, { n: 3, color: C.dim });
  s.img(art.emblems.separatist, 1690, 110, 3);
  s.text('SEPARATIST', 1688, 210, { n: 2, color: C.dim });
  const pts = [
    'VIEW: TOP-DOWN 3/4 (CLASSIC 16-BIT RPG ANGLE). FRONTS AND TOPS VISIBLE. UNITS AND TOWERS Y-SORTED WITH DROP SHADOWS. LIGHT FROM THE TOP-LEFT.',
    'WORLD ART IS 2X DETAIL: TILES ARE 32x32 ART PX, MAPS 48x28 TILES (1536x896). UI ART AND FONTS STAY AT THE SPEC SCALE SO TEXT STAYS READABLE.',
    'UI SCALE S = LARGEST INTEGER WITH FLOOR(DEVICE HEIGHT / S) >= 260. WORLD SCALE SW = SAME RULE AT 520. IPHONE 12: S=4, SW=2. 1080P: S=4, SW=2. 1440P: S=5, SW=2.',
    'WORLD ZOOM IS AN INTEGER AT REST (FIT-MAP UP TO 3 x SW), EASED OVER 120 MS BETWEEN STEPS. PANNING HAS MOMENTUM.',
    'PALETTE: MUTED, DESATURATED ENVIRONMENTS. ONLY ENERGY IS SATURATED - REPUBLIC BOLTS BLUE/CYAN, SEPARATIST BOLTS RED/ORANGE, ION WHITE-BLUE, DROID SHIELDS VIOLET.',
    'CHARACTERS, TILES AND WALK POSES ARE HAND-PLACED 2X PIXEL MAPS. TURRET PARTS, PROPS, ICONS AND EMBLEMS ARE HAND-PLACED THEN UPSCALED (SCALE2X + 1PX OUTLINES + RIM LIGHT).',
    'ANIMATION: 6-FRAME WALKS AND DEATHS, 8 TROOPER FACINGS WITH BREATHING AND RECOIL, 32 TURRET AND FIGHTER HEADINGS (ROTSPRITE) WITH SMOOTHED TURNING, 10-15 FRAME FIREBALLS.',
    'GLOWS ARE PIXEL-RING HALOS DRAWN ADDITIVELY, ONE COMPOSITE SWITCH PER LAYER. NO BLUR FILTERS. NO ORPHAN PIXELS (LINT CHECKED).',
    'EVERY IMAGE IN THIS DECK IS RENDERED FROM SRC/ART; MOCKUP, READABILITY AND HUD SLIDES ARE FRAMES FROM THE REAL GAME RUNNING HEADLESS.',
  ];
  let y = 430;
  for (const p of pts) {
    fill(s.bm, 100, y + 4, 8, 8, C.accent);
    y += s.lines(wrap(p, 112), 124, y, { n: 2 }) + 10;
  }
  s.img(crop(mock.bm, 300, 120, 580, 400), 1290, 460, 1);
  s.text('KAMINO 1, IN-GAME FRAME, 1:1', 1290, 870, { n: 2, color: C.dim });
  addSlide('title', s, 'Title and art direction summary (2x detail).');
}

// ------------------------------------------------------------ slide 2 -------
{
  const s = new Slide('Palettes', 'faction ramps, energy, planet moods');
  const left = [
    ['REPUBLIC', P.REPUBLIC], ['SEPARATIST', P.SEPARATIST], ['CLONE ARMOR', P.CLONE_ARMOR], ['UNIT STRIPES', [...P.STRIPES.rifle, ...P.STRIPES.rocket, ...P.STRIPES.flak, ...P.STRIPES.elite, ...P.STRIPES.marksman]],
    ['GUNMETAL', P.GUNMETAL], ['SANDBAG / CANVAS', [...P.SANDBAG, ...P.CANVAS]], ['DROID TAN', P.DROID_TAN], ['DROID STEEL', P.DROID_STEEL],
    ['REPUBLIC BOLT', P.REPUBLIC_BOLT], ['SEPARATIST BOLT', P.SEPARATIST_BOLT], ['ION', P.ION], ['DROID SHIELD', P.SHIELD], ['FIRE', P.FIRE], ['SMOKE / SCORCH', [...P.SMOKE, ...P.SCORCH]],
  ];
  const right = [
    ['KAMINO', P.KAMINO, 'STORM OCEAN, GRAY-TEAL. RAIN, LIGHTNING'],
    ['GEONOSIS', P.GEONOSIS, 'RUST, OCHRE, DUST. DUST STORMS, HEAT SHIMMER'],
    ['KASHYYYK', P.KASHYYYK, 'DEEP GREENS AND BROWNS. MIST, FALLING LEAVES'],
    ['UMBARA', P.UMBARA, 'NEAR-BLACK, PURPLE + BIOLUMINESCENT CYAN/VIOLET'],
    ['MUSTAFAR', P.MUSTAFAR, 'CHARCOAL + LAVA ORANGE-RED. EMBERS'],
  ];
  let y = 130;
  for (const [n, pal] of left) {
    s.text(n, 60, y + 8, { n: 2, color: C.dim });
    pal.forEach((h, i) => { fill(s.bm, 330 + i * 34, y, 32, 32, '#000000'); fill(s.bm, 332 + i * 34, y + 2, 28, 28, h); });
    y += 64;
  }
  y = 130;
  for (const [n, pal, d] of right) {
    s.text(n, 1000, y, { n: 3, color: C.title });
    pal.forEach((h, i) => { fill(s.bm, 1000 + i * 70, y + 34, 66, 66, '#000000'); fill(s.bm, 1003 + i * 70, y + 37, 60, 60, h); });
    s.text(d, 1000, y + 110, { n: 2, color: C.dim });
    y += 176;
  }
  addSlide('palettes', s, 'All palettes are named arrays in src/art/palettes.js.');
}

// ------------------------------------------------------------ tower slides --
const TOWER_INFO = {
  rifle: { title: 'Clone Rifle Squad', role: 'BLASTER · GROUND + AIR · 2x2 SANDBAG NEST', tiers: { t1: '3 TROOPERS, SANDBAGS', t2: '+ ARMOR PLATES, AMMO', t3: '+ WALLS, ANTENNA, BANNER', t4a: 'ELITE: 5 TROOPERS, FASTER', t4b: 'MARKSMAN: RANGE + CRITS' } },
  rocket: { title: 'Rocket Team', role: 'EXPLOSIVE · GROUND (AIR FROM T3) · 1x1', tiers: { t1: 'SINGLE LAUNCH TUBE', t2: 'TWIN TUBES, SANDBAGS', t3: '4-CELL POD + RADAR: AIR', t4a: 'TANDEM: HEAVY ANTI-ARMOR', t4b: 'CLUSTER: WIDE SPLASH' } },
  flak: { title: 'Flak Turret', role: 'EXPLOSIVE AIRBURST · AIR ONLY · 1x1', tiers: { t1: 'TWIN BARRELS', t2: 'QUAD BARRELS, PLATED', t3: 'ARMORED HOUSING + RADAR', t4a: 'BURST: AREA AIR DAMAGE', t4b: 'INTERCEPTOR: HOMING AA' } },
};
for (const kind of ['rifle', 'rocket', 'flak']) {
  const info = TOWER_INFO[kind];
  const s = new Slide(info.title, info.role);
  const isRifle = kind === 'rifle';
  const nd = isRifle ? 8 : art.towers[kind].t1.frames.length;
  const raw = (tier, dir, firing) => (isRifle ? composeRifle(art.towers.rifle[tier], DIRS8[dir], { firing }) : composeTurret(art.towers[kind][tier], dir, { firing }));
  let ub = null;
  for (const tier of TIERS) for (let d = 0; d < nd; d++) for (const f of [false, true]) {
    const b = bounds(raw(tier, d, f));
    ub = ub ? { x0: Math.min(ub.x0, b.x), y0: Math.min(ub.y0, b.y), x1: Math.max(ub.x1, b.x + b.w), y1: Math.max(ub.y1, b.y + b.h) } : { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
  }
  const compose = (tier, dir, firing) => crop(raw(tier, dir, firing), ub.x0, ub.y0, ub.x1 - ub.x0, ub.y1 - ub.y0);
  const idleDir = isRifle ? 2 : Math.round(nd * 0.19), fireDir = isRifle ? 1 : Math.round(nd * 0.31);
  const colW = 372;
  let cellH = 0;
  TIERS.forEach((tier, i) => {
    const x = 36 + i * colW;
    s.text(TIER_NAMES[kind][tier], x, 122, { n: 2, color: tier.startsWith('t4') ? C.warn : C.title });
    s.text(info.tiers[tier], x, 146, { n: 2, color: C.dim });
    const a = s.cell(compose(tier, idleDir, false), x, 176, 2, { bg: 'checker', pad: 4 });
    s.cell(compose(tier, idleDir, false), x + a.w + 12, 176, 2, { bg: 'ground', ground: GROUND, pad: 4 });
    const y2 = 176 + a.h + 14;
    s.cell(compose(tier, fireDir, true), x, y2, 2, { bg: 'checker', pad: 4 });
    s.cell(compose(tier, fireDir, true), x + a.w + 12, y2, 2, { bg: 'ground', ground: GROUND, pad: 4 });
    cellH = a.h;
  });
  const yRow = 176 + 2 * (cellH + 14) + 16;
  s.text(isRifle ? 'IDLE ROW, FIRING ROW (RECOIL + FLASH). AIM SAMPLE: TIER III, ALL 8 TROOPER FACINGS' : `IDLE ROW, FIRING ROW (RECOIL + FLASH). AIM SAMPLE: TIER III, 16 OF ${nd} ROTSPRITE DIRECTIONS`, 36, yRow, { n: 2, color: C.accent });
  const dirs = isRifle ? [...Array(8).keys()] : [...Array(nd).keys()].filter((d) => d % (nd / 16) === 0);
  const frames = dirs.map((d) => compose('t3', d, false));
  const fw = frames[0].w + 2;
  const bar = tiled(fw * frames.length + 4, frames[0].h + 6, GROUND);
  frames.forEach((f, i) => blit(bar, f, 3 + i * fw, bar.h - f.h - 3));
  s.img(bar, 36, yRow + 28, Math.max(1, Math.min(2, Math.floor((SW - 72) / bar.w))));
  addSlide(`tower-${kind}`, s, `${info.title}: tiers I-III plus both tier-4 branches. Idle and firing frames on checker and Kamino ground; aim sample below.`);
}

// ------------------------------------------------------------ enemy slides --
function enemyRow(s, y, key, frames, death, { extraLabel = '' } = {}) {
  const inf = ENEMY_INFO[key];
  s.text(inf.name, 40, y, { n: 3, color: C.title });
  s.text(inf.role, 40, y + 30, { n: 2, color: C.dim });
  if (extraLabel) s.text(extraLabel, 40, y + 54, { n: 2, color: C.accent });
  const st = strip(frames, 4);
  const a = s.cell(st, 480, y, 2, { bg: 'checker', pad: 4 });
  const b = s.cell(st, 480, y + a.h + 10, 2, { bg: 'ground', ground: PATHT, pad: 4 });
  s.cell(strip(death, 4), 480 + a.w + 24, y, 2, { bg: 'ground', ground: GROUND, pad: 4 });
  return a.h + b.h + 10;
}
{
  const s = new Slide('Droid army I', '6-frame walks (checker / walkway) + 6-frame deaths');
  const e = art.enemies;
  let y = 130;
  y += enemyRow(s, y, 'trooper', e.trooper.walk, e.trooper.death) + 30;
  y += enemyRow(s, y, 'rush', e.rush.walk, e.rush.death) + 30;
  y += enemyRow(s, y, 'scuttler', e.scuttler.walk, e.scuttler.death) + 30;
  s.text('DEATH: FLASH, RECOIL, STAGGER, FALL, COLLAPSE, DEBRIS (FADES)', 40, Math.min(y, 1040), { n: 2, color: C.accent });
  addSlide('enemies-1', s, 'Trooper Droid, Rush Droid, Scuttler.');
}
{
  const s = new Slide('Droid army II', 'shield droid modes, strike fighter (air)');
  const e = art.enemies;
  let y = 130;
  y += enemyRow(s, y, 'shield', [...e.shield.roll, ...e.shield.deploy, ...e.shield.walk], e.shield.death, { extraLabel: 'TREADS x4, DEPLOY x2, WALK x6' });
  y += 20;
  s.text('SHIELD UP (HEX BUBBLE, VIOLET)', 40, y + 30, { n: 2, color: C.accent });
  const bub = tiled(56, 60, PATHT);
  blit(bub, e.shield.walk[0], 28 - (e.shield.w >> 1), 58 - e.shield.h);
  blit(bub, art.vfx.shield[1], 8, 12);
  s.cell(bub, 480, y, 2, { bg: '#25333b', pad: 0 });
  y += 140;
  s.text(ENEMY_INFO.fighter.name, 40, y, { n: 3, color: C.title });
  s.text(ENEMY_INFO.fighter.role, 40, y + 30, { n: 2, color: C.dim });
  const f = e.fighter;
  s.text(`16 OF ${f.dirs} ROTSPRITE HEADINGS, SHADOW ON THE WATER`, 40, y + 54, { n: 2, color: C.accent });
  const step = f.dirs / 16;
  const bar = tiled(16 * 46 + 8, 88, K.water[0]);
  for (let i = 0; i < 16; i++) { const d = i * step; blit(bar, f.shadows[d], 4 + i * 46 + 11, 44); blit(bar, f.frames[i % 3][d], 4 + i * 46, 2); }
  s.img(bar, 40, y + 84, 2);
  y += 84 + 88 * 2 + 24;
  s.text('THRUSTER FLICKER (3 FRAMES) + DEATH TUMBLE', 40, y, { n: 2, color: C.accent });
  const c = s.cell(strip(f.frames.map((set) => set[0]), 4), 40, y + 28, 2, { bg: 'checker', pad: 4 });
  s.cell(strip(f.death, 4), 60 + c.w, y + 28, 2, { bg: 'checker', pad: 4 });
  addSlide('enemies-2', s, 'Shield Droid: tread sled, deploys into a slow walker with shield up. Strike Fighter: air unit.');
}

// ------------------------------------------------------------ tileset ------
{
  const s = new Slide('Kamino tileset', '32x32 tiles at 2x detail');
  const items = [
    ['GROUND A', K.ground[0]], ['GROUND B', K.ground[1]], ['GROUND C', K.ground[2]], ['WALKWAY (PATH)', K.path], ['PAD (NO BUILD)', K.pad], ['PLATFORM EDGE', K.cliff], ['BRIDGE TRUSS', K.bridgeFace],
  ];
  items.forEach(([n, b], i) => {
    const x = 40 + i * 262;
    s.img(b, x, 130, 3);
    s.text(n, x, 236, { n: 2, color: C.dim });
  });
  s.text('WATER: 8 FRAMES', 40, 280, { n: 2, color: C.accent });
  s.img(strip(K.water, 4), 40, 306, 3);
  const y = 440;
  s.text('PROPS (UNBUILDABLE) - CHECKER / GROUND', 40, y, { n: 2, color: C.accent });
  let x = 40;
  for (const [n, b] of Object.entries(K.props)) {
    if (n === 'rail') continue;
    const c1 = s.cell(b, x, y + 30, 2, { bg: 'checker', pad: 4 });
    const c2 = s.cell(b, x, y + 40 + c1.h, 2, { bg: 'ground', ground: GROUND, pad: 4 });
    const lw = s.text(n.toUpperCase(), x, y + 50 + c1.h + c2.h, { n: 2, color: C.dim });
    x += Math.max(c1.w, lw) + 40;
  }
  const grid = ['WWWWWWWWW', 'WGGGGWWWW', 'WGPPPBBBP', 'WGPGGWWWG', 'WGPXXWWWG', 'WGPGGGWGG', 'WWWWWWWWW'];
  s.text('AUTOTILE SAMPLE x2', 1300, y, { n: 2, color: C.accent });
  s.img(renderGround(grid, K, 0), 1300, y + 30, 2);
  addSlide('kamino-tiles', s, 'Ground variants, walkway, pad, 8-frame water, platform edge with stilts, bridge truss, props, autotile sample.');
}

// ------------------------------------------------------------ map mockup ---
{
  const s = new Slide('Kamino map mockup', 'in-game frame, 960x540 art px (the 480x270 reference view at 2x detail), 1:1');
  s.img(mock.bm, 40, 130, 1);
  const notes = [
    'REAL KAMINO 1 LEVEL, REAL SIM: THE MIXED FINAL WAVE AGAINST ALL 15 TOWER VARIANTS.',
    'DRAW ORDER: GROUND, DECALS, OVERLAYS, SHADOWS, UNITS + TOWERS (Y-SORTED), AIR, BOLTS, PARTICLES, ADDITIVE GLOWS, WEATHER.',
    'PLATFORMS ARE MID-GRAY RIVETED PLATES SO WHITE ARMOR AND TAN DROIDS STAY READABLE.',
    'THE WALKWAY GRATING IS THE ENEMY PATH. BRIDGES SHOW A TRUSS; PLATFORM EDGES SHOW STILTS INTO THE SURF.',
    'BLUE BOLTS = REPUBLIC. DROID SHIELDS ARE VIOLET.',
  ];
  let y = 140;
  for (const n of notes) y += s.lines(wrap(n, 40), 1030, y, { n: 2 }) + 18;
  addSlide('kamino-mockup', s, 'One screen of Kamino 1 rendered by the game (HUD hidden).');
}

// ------------------------------------------------------------ readability --
{
  const s = new Slide('', '');
  s.img(shot1080.bm, 0, 0, 1);
  addSlide('readability', s, 'Readability: the exact 1080p frame (UI S=4, world SW=2), HUD included.');
}

// ------------------------------------------------------------ VFX ----------
{
  const s = new Slide('VFX I', 'bolts, glows, ion, muzzle flashes, impacts, shield ripple');
  const dark = '#0c1418';
  const withGlow = (bm, gl) => {
    const c = new Bitmap(Math.max(bm.w, gl.w) + 4, Math.max(bm.h, gl.h) + 4);
    fill(c, 0, 0, c.w, c.h, dark);
    blitAdd(c, gl, (c.w - gl.w) >> 1, (c.h - gl.h) >> 1);
    blit(c, bm, (c.w - bm.w) >> 1, (c.h - bm.h) >> 1);
    return c;
  };
  const sixteen = (arr) => arr.filter((_, i) => i % (arr.length / 16) === 0);
  let y = 124;
  s.text('REPUBLIC BOLTS - 16 OF 32 ANGLES (WITH ADDITIVE PIXEL-RING GLOW)', 40, y, { n: 2, color: C.accent });
  const rb = strip(sixteen(art.vfx.boltRep).map((b) => withGlow(b, art.vfx.glowRep)), 0);
  s.img(rb, 40, y + 26, 2);
  y += 26 + rb.h * 2 + 16;
  s.text('SEPARATIST BOLTS', 40, y, { n: 2, color: C.accent });
  s.img(strip(sixteen(art.vfx.boltSep).map((b) => withGlow(b, art.vfx.glowSep)), 0), 40, y + 26, 2);
  y += 26 + rb.h * 2 + 16;
  s.text('ION ARC (4 FRAMES)', 40, y, { n: 2, color: C.accent });
  const ia = strip(art.vfx.ionArc.map((b) => withGlow(b, art.vfx.glowIon)), 4);
  s.img(ia, 40, y + 26, 2);
  s.text('ION BURST', 1300, y, { n: 2, color: C.accent });
  s.img(strip(art.vfx.ionBurst.map((b) => withGlow(b, art.vfx.glowIon)), 0), 1300, y + 26, 2);
  y += 26 + ia.h * 2 + 16;
  s.text('MUZZLE FLASHES (BLASTER S/M, ROCKET/FLAK)', 40, y, { n: 2, color: C.accent });
  const flashes = [fromMap(MUZZLE_SMALL), fromMap(MUZZLE_MED), art.vfx.muzzleFire, art.vfx.backblast];
  s.img(strip(flashes.map((b, i) => withGlow(b, i < 2 ? art.vfx.glowRep : art.vfx.glowFire)), 2), 40, y + 26, 2);
  s.text('IMPACT SPARKS (REP / SEP / ARMOR METAL)', 900, y, { n: 2, color: C.accent });
  s.img(strip([...art.vfx.sparksRep, ...art.vfx.sparksSep, ...art.vfx.sparksMetal].map((b) => withGlow(b, art.vfx.glowRep)), 1), 900, y + 26, 2);
  y += 26 + 52 * 2 + 16;
  s.text('SHIELD HIT - HEX BUBBLE RIPPLE (6 FRAMES)', 40, y, { n: 2, color: C.accent });
  s.img(strip(art.vfx.shield.map((b) => { const c = new Bitmap(b.w + 4, b.h + 4); fill(c, 0, 0, c.w, c.h, dark); blit(c, b, 2, 2); return c; }), 2), 40, y + 26, 2);
  s.text('HIT FLASH (1-2 FRAMES)', 1300, y, { n: 2, color: C.accent });
  const tr = art.enemies.trooper.walk[0];
  s.img(strip([tr, silhouette(tr, '#ffffff'), tr], 4), 1300, y + 26, 2);
  addSlide('vfx-1', s, 'Bolts, glows, ion, flashes, sparks, shield ripple, hit flash.');
}
{
  const s = new Slide('VFX II', 'explosions S/M/L, smoke, scorch decals, debris, rain');
  let y = 124;
  const row = (name, frames, maxW = SW - 80) => {
    s.text(name, 40, y, { n: 2, color: C.accent });
    const st = strip(frames, 2);
    const c = tiled(st.w + 4, st.h + 4, GROUND);
    blit(c, st, 2, 2);
    const n = Math.max(1, Math.min(2, Math.floor(maxW / c.w)));
    s.img(c, 40, y + 26, n);
    y += 26 + c.h * n + 16;
  };
  row('EXPLOSION S (ROCKET HIT) - 10 FRAMES', art.vfx.expS);
  row('EXPLOSION M - 12 FRAMES', art.vfx.expM);
  row('EXPLOSION L (ARTILLERY / BOSS) - 15 FRAMES', art.vfx.expL);
  const y0 = y;
  row('SMOKE PUFF - 8 FRAMES', art.vfx.smoke, 860);
  y = y0;
  s.text('SCORCH DECALS', 940, y, { n: 2, color: C.accent });
  const sc = strip(art.vfx.scorch, 6);
  const c = tiled(sc.w + 8, sc.h + 8, GROUND);
  blit(c, sc, 4, 4);
  s.img(c, 940, y + 26, 2);
  s.text('DEBRIS + RAIN + SPLASH', 1500, y, { n: 2, color: C.accent });
  const d = strip([...art.vfx.debris, art.vfx.rain, ...art.vfx.splash], 4);
  const c2 = new Bitmap(d.w + 6, d.h + 6);
  fill(c2, 0, 0, c2.w, c2.h, '#34434a');
  blit(c2, d, 3, 3);
  s.img(c2, 1500, y + 26, 2);
  addSlide('vfx-2', s, 'Explosion frame strips (fireball -> breakup -> smoke), smoke puff, scorch decals, debris, rain.');
}

// ------------------------------------------------------------ UI -----------
// iPhone 12 landscape (844x390 CSS @3x = 2532x1170). Shown at exactly half
// size: every scale on that screen is even, so halving is lossless.
const iphone = (setup) => frame(844, 390, 3, setup);
{
  const { bm, app } = iphone((g) => {
    g.pick('rocket');
    const spot = spotsNearPath(g.sim, 'rocket').find((p) => p.d > 40 && p.d < 90 && p.tx > 24 && p.tx < 36 && p.ty > 3 && p.ty < 13);
    Object.assign(g.placing, { tx: spot.tx, ty: spot.ty, valid: true, touch: true });
    g.cam.centerOn((spot.tx + 2) * TILE, (spot.ty + 1) * TILE);
    g.paused = true;
  });
  const s = new Slide('UI I', `iPhone 12 landscape (2532x1170): UI S=${app.sc.S}, world SW=${app.sc.SW}, shown at half size`);
  s.img(half(bm), 40, 124, 1);
  const notes = [
    'TOP-LEFT: LIVES, CREDITS, WAVE X/Y.',
    'NEXT-WAVE PREVIEW: ICONS + COUNTS, AIR / ARMOR / SHIELD WARNINGS, START OR CALL-EARLY BONUS.',
    'TOP-RIGHT: PAUSE, 1x 2x 3x, MENU.',
    'BUILD BAR: TOWER + COST, LOCKED SLOTS.',
    'DRAG GHOST: RANGE CIRCLE, GREEN/RED TILES, CONFIRM / CANCEL. THE GHOST SITS ABOVE THE FINGER.',
    `EVERY TAP TARGET IS >= ${app.ui.T} UI PX = 44 CSS PX ON THIS PHONE.`,
  ];
  let y = 140;
  for (const n of notes) y += s.lines(wrap(n, 24), 1340, y, { n: 2 }) + 16;
  s.text('BUTTONS: NORMAL / PRESSED (SQUASH) / ACCENT / GOOD / BAD', 40, 124 + 585 + 30, { n: 2, color: C.accent });
  s.img(strip([button(40, 33), button(40, 33, { pressed: true }), button(40, 33, { style: 'accent' }), button(40, 33, { style: 'good' }), button(40, 33, { style: 'bad' })], 4), 40, 124 + 585 + 60, 4);
  s.text('INVALID SPOT', 1340, 124 + 585 + 30, { n: 2, color: C.accent });
  const bad = tiled(120, 112, K.path);
  blit(bad, gridCell(false), 44, 40);
  const rc = rangeCircle(48, { valid: false });
  blit(bad, rc, 60 - (rc.w >> 1), 56 - (rc.h >> 1));
  s.img(bad, 1340, 124 + 585 + 60, 2);
  addSlide('ui-placement', s, 'HUD with drag-ghost placement, rendered by the game at the iPhone 12 size.');
}
{
  const { bm } = iphone((g) => {
    const t = g.sim.state.towers.find((q) => q.type === 'rocket' && q.tier === 't2') || g.sim.state.towers[0];
    g.selId = t.id;
    g.cam.centerOn(t.x + 120, t.y);
    g.paused = true;
  });
  const s = new Slide('UI II', 'tower selected: range circle + info panel (iPhone 12, half size)');
  s.img(half(bm), 40, 124, 1);
  const notes = [
    'INFO PANEL: DPS, DAMAGE TYPE, HITS AIR, TARGETING MODE (FIRST / LAST / STRONGEST / CLOSEST / AIR PRIORITY).',
    'NEXT UPGRADE AS A DIFF: GREEN = BETTER, RED = WORSE. ROWS SHRINK ON SHORT SCREENS.',
    'UPGRADE AND SELL SIDE BY SIDE; SELL ASKS FOR A SECOND TAP.',
    'TIER 4: BOTH SPECIALIZATIONS SIDE BY SIDE, LOCKED ONCE CHOSEN.',
  ];
  let y = 140;
  for (const n of notes) y += s.lines(wrap(n, 24), 1340, y, { n: 2 }) + 16;
  s.text('ICONS (2X DETAIL)', 40, 124 + 585 + 30, { n: 2, color: C.accent });
  const ics = strip(Object.keys(ICONS).map((n) => icon(n)), 6);
  const back = new Bitmap(ics.w + 12, ics.h + 12);
  fill(back, 0, 0, back.w, back.h, '#222c35');
  blit(back, ics, 6, 6);
  s.img(back, 40, 124 + 585 + 60, 3);
  addSlide('ui-info', s, 'Tower info panel and icon set, rendered by the game.');
}

// ------------------------------------------------------------ icon/emblem --
const appIcon = (size, maskable) => sharedAppIcon(art, size, maskable);
{
  const s = new Slide('App icon + title emblem', 'concept at 2x detail; final icons exported from this code in Phase 4');
  const ic = appIcon(96);
  s.img(ic, 60, 140, 4);
  s.text('APP ICON 96 ART PX (x4 = 384)', 60, 140 + 384 + 16, { n: 2, color: C.dim });
  const mk = appIcon(96, true);
  s.img(mk, 500, 140, 4);
  s.text('MASKABLE (FULL BLEED, SAFE ZONE)', 500, 140 + 384 + 16, { n: 2, color: C.dim });
  const guide = new Bitmap(384, 384);
  for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) if (Math.abs(Math.hypot(x - 192, y - 192) - 154) < 1) guide.set(x, y, 0x80ffffff);
  blit(s.bm, guide, 500, 140);
  s.img(ic, 940, 140, 2);
  s.img(ic, 940 + 220, 140, 1);
  s.text('2x / 1x', 940, 140 + 200, { n: 2, color: C.dim });
  const logo1 = logoText('REPUBLIC', 3);
  const logo2 = logoText('FRONTLINE', 3, ['#a8f4ff', '#7cf0ff', '#38b8e0', '#1d6f95']);
  const ty = 680;
  s.img(art.emblems.republic, 60, ty, 4);
  s.img(logo1, 260, ty + 10, 2);
  s.img(logo2, 260, ty + 10 + logo1.h * 2 + 6, 2);
  s.text('TITLE LOCKUP: ORIGINAL KITE-SHIELD EMBLEM, BEVELED PIXEL LETTERING FROM THE GAME FONT', 60, ty + 230, { n: 2, color: C.dim });
  s.img(art.emblems.separatist, 1500, ty, 4);
  s.text('SEPARATIST EMBLEM', 1500, ty + 140, { n: 2, color: C.dim });
  png(ic, 'icon-concept-4x.png', 4);
  png(mk, 'icon-concept-maskable-4x.png', 4);
  addSlide('icon-emblem', s, 'App icon concept (standard + maskable), title lockup and both faction emblems.');
}

// ------------------------------------------------------------ deck ---------
const pptx = new pptxgen();
pptx.defineLayout({ name: 'RF1080', width: SW / 96, height: SH / 96 });
pptx.layout = 'RF1080';
pptx.title = 'Republic Frontline - Art Preview (2x detail)';
for (const sl of slides) {
  const slide = pptx.addSlide();
  slide.background = { color: '0C1116' };
  slide.addImage({ path: join(OUT, sl.file), x: 0, y: 0, w: SW / 96, h: SH / 96 });
  slide.addNotes(sl.notes + '\nSource PNG: art-preview/' + sl.file + ' (the PNGs are the source of truth; PowerPoint may smooth when zoomed).');
}
await pptx.writeFile({ fileName: join(ROOT, 'art-preview.pptx') });
console.log(`art-preview: ${slides.length} slides, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
