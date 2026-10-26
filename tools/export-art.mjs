// Phase 0 art deck. Imports and runs the real src/art code in Node
// (@napi-rs/canvas for PNG encoding), writes every sprite strip and slide to
// art-preview/, then builds art-preview.pptx with pptxgenjs. Each slide is a
// 1920x1080 PNG placed at native size on a 20x11.25in layout (96 px/in).
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
import { panel, button, icon, ICONS, rangeCircle, gridCell, logoText } from '../src/art/ui.js';
import { drawText, FONT5 } from '../src/art/font.js';
import { Slide, C, SW, SH, wrap } from './art/slide.mjs';
import { composeScene } from './art/scene.mjs';
import { kaminoMockGrid, MOCK_PROPS } from './art/kamino-mock-map.mjs';
import { VIEW, drawTopHud, drawBuildBar, drawPlacement, drawInfoPanel, towerIcon } from './art/hud.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'art-preview');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'sprites'), { recursive: true });
mkdirSync(join(OUT, 'slides'), { recursive: true });

const png = (bm, rel, n = 4) => {
  const f = join(OUT, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, toCanvas(n === 1 ? bm : scale(bm, n), createCanvas).toBuffer('image/png'));
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

// ------------------------------------------------------------ sprite PNGs --
// Every frame set as a 4x strip (source of truth for review).
for (const tier of TIERS) {
  const r = art.towers.rifle[tier];
  png(r.back, `sprites/towers/rifle-${tier}-back.png`);
  png(r.front, `sprites/towers/rifle-${tier}-front.png`);
  png(strip(DIRS8.map((d) => r.troopers[d].idle.bm), 2), `sprites/towers/rifle-${tier}-trooper-8dir-idle.png`);
  png(strip(DIRS8.map((d) => r.troopers[d].fire.bm), 2), `sprites/towers/rifle-${tier}-trooper-8dir-fire.png`);
  png(strip(DIRS8.map((d) => composeRifle(r, d)), 4), `sprites/towers/rifle-${tier}-composite-8dir.png`);
  png(composeRifle(r, 'S', { firing: true }), `sprites/towers/rifle-${tier}-firing.png`);
  for (const kind of ['rocket', 'flak']) {
    const t = art.towers[kind][tier];
    png(t.base, `sprites/towers/${kind}-${tier}-base.png`);
    png(strip(t.frames, 2), `sprites/towers/${kind}-${tier}-head-16dir.png`);
    png(strip(t.frames.map((_, i) => composeTurret(t, i)), 2), `sprites/towers/${kind}-${tier}-composite-16dir.png`);
    png(strip(t.frames.map((_, i) => composeTurret(t, i, { firing: true })).filter((_, i) => i % 4 === 0), 2), `sprites/towers/${kind}-${tier}-firing.png`);
  }
}
for (const [k, e] of Object.entries(art.enemies)) {
  if (k === 'fighter') {
    png(strip(e.frames[0], 2), `sprites/enemies/fighter-16dir-a.png`);
    png(strip(e.frames[1], 2), `sprites/enemies/fighter-16dir-b.png`);
    png(strip(e.shadows, 2), `sprites/enemies/fighter-shadow-16dir.png`);
    png(strip(e.death, 2), `sprites/enemies/fighter-death.png`);
    continue;
  }
  png(strip(e.walk, 2), `sprites/enemies/${k}-walk.png`);
  png(strip(e.walkW, 2), `sprites/enemies/${k}-walk-west.png`);
  png(strip(e.death, 2), `sprites/enemies/${k}-death.png`);
  if (e.roll) png(strip([...e.roll, ...e.deploy], 2), `sprites/enemies/${k}-roll-deploy.png`);
}
png(strip(K.ground, 0), 'sprites/tiles/kamino-ground.png');
png(K.path, 'sprites/tiles/kamino-path.png');
png(K.pad, 'sprites/tiles/kamino-pad.png');
png(strip(K.water, 0), 'sprites/tiles/kamino-water-4f.png');
png(K.cliff, 'sprites/tiles/kamino-cliff.png');
png(K.bridgeFace, 'sprites/tiles/kamino-bridge-face.png');
for (const [n, b] of Object.entries(K.props)) png(b, `sprites/props/kamino-${n}.png`);
for (const [n, v] of Object.entries(art.vfx)) {
  if (Array.isArray(v)) png(strip(v, 2), `sprites/vfx/${n}.png`);
  else png(v, `sprites/vfx/${n}.png`);
}
for (const n of Object.keys(ICONS)) png(icon(n), `sprites/ui/icon-${n}.png`);
png(art.emblems.republic, 'sprites/ui/emblem-republic.png', 8);
png(art.emblems.separatist, 'sprites/ui/emblem-separatist.png', 8);

// ------------------------------------------------------------ map mockup ---
const GRID = kaminoMockGrid();
const MOCK = {
  ox: 4 * 16, oy: 0,
  props: MOCK_PROPS,
  towers: [
    { type: 'rifle', tier: 't2', tx: 8, ty: 5, dir: 'E', firing: true },
    { type: 'rocket', tier: 't1', tx: 13, ty: 6, dir: 2 },
    { type: 'flak', tier: 't1', tx: 22, ty: 6, dir: 12, firing: true },
    { type: 'rocket', tier: 't3', tx: 26, ty: 6, dir: 6, firing: true },
    { type: 'rifle', tier: 't1', tx: 28, ty: 9, dir: 'W' },
    { type: 'flak', tier: 't2', tx: 6, ty: 9, dir: 14 },
  ],
  enemies: [
    { type: 'trooper', x: 11 * 16 + 8, y: 7 * 16 + 10, frame: 1, facing: 'E' },
    { type: 'trooper', x: 11 * 16 + 4, y: 6 * 16 + 4, frame: 3, facing: 'E' },
    { type: 'rush', x: 17 * 16, y: 8 * 16 + 12, frame: 2, facing: 'E' },
    { type: 'shield', x: 21 * 16, y: 8 * 16 + 12, frame: 0, facing: 'E', anim: 'roll' },
    { type: 'trooper', x: 24 * 16 + 8, y: 6 * 16 + 12, frame: 0, facing: 'E' },
    { type: 'scuttler', x: 27 * 16, y: 4 * 16 + 12, frame: 1, facing: 'E' },
    { type: 'scuttler', x: 28 * 16 + 2, y: 4 * 16 + 9, frame: 3, facing: 'E' },
    { type: 'scuttler', x: 29 * 16 - 3, y: 4 * 16 + 13, frame: 0, facing: 'E' },
    { type: 'scuttler', x: 30 * 16, y: 4 * 16 + 10, frame: 2, facing: 'E' },
    { type: 'trooper', x: 19 * 16, y: 8 * 16 + 13, frame: 2, facing: 'E', anim: 'death' },
  ],
  air: [{ x: 18 * 16, y: 3 * 16, dir: 1, alt: 26 }, { x: 31 * 16, y: 13 * 16, dir: 14, alt: 24, frame: 1 }],
  bolts: [
    { x: 10 * 16 + 6, y: 6 * 16 + 4, dir: 0 }, { x: 13 * 16, y: 6 * 16 + 4, dir: 1 },
    { x: 22 * 16 + 12, y: 4 * 16 + 4, dir: 13 }, { x: 23 * 16, y: 7 * 16, dir: 9, side: 'sep' },
    { x: 26 * 16, y: 9 * 16 + 4, dir: 7, side: 'sep' },
  ],
  fx: [],
  decals: [],
};
MOCK.decals.push({ bm: art.vfx.scorch[1], x: 15 * 16, y: 8 * 16 + 8 }, { bm: art.vfx.scorch[0], x: 25 * 16 + 4, y: 5 * 16 + 4 }, { bm: art.vfx.scorch[2], x: 20 * 16, y: 4 * 16 });
MOCK.fx.push(
  { bm: art.vfx.expM[3], x: 24 * 16 + 4, y: 4 * 16 + 4, glow: art.vfx.glowFire },
  { bm: art.vfx.smoke[2], x: 15 * 16 + 4, y: 7 * 16 + 10 },
  { bm: art.vfx.smokeBig[3], x: 20 * 16, y: 3 * 16 + 4 },
  { bm: art.vfx.sparksRep[0], x: 11 * 16 + 9, y: 7 * 16 },
  { bm: art.vfx.expS[2], x: 18 * 16 + 4, y: 2 * 16 + 4, glow: art.vfx.glowFire },
);
const mockup = composeScene(art, GRID, MOCK, { ox: MOCK.ox, oy: MOCK.oy, w: 480, h: 270 });
// ------------------------------------------------------------ slide 1 -------
{
  const s = new Slide('', '');
  const logo1 = logoText('REPUBLIC', 3);
  const logo2 = logoText('FRONTLINE', 3, ['#a8f4ff', '#7cf0ff', '#38b8e0', '#1d6f95']);
  s.img(art.emblems.republic, 96, 90, 8);
  s.img(logo1, 300, 96, 2);
  s.img(logo2, 300, 96 + logo1.h * 2 + 8, 2);
  s.text('PHASE 0 - ART DIRECTION PREVIEW', 304, 96 + (logo1.h + logo2.h) * 2 + 30, { n: 3, color: C.dim });
  s.img(art.emblems.separatist, 1690, 110, 6);
  s.text('SEPARATIST', 1688, 210, { n: 2, color: C.dim });
  const pts = [
    'VIEW: TOP-DOWN 3/4 (CLASSIC 16-BIT RPG ANGLE). FRONTS AND TOPS VISIBLE. UNITS AND TOWERS Y-SORTED WITH DROP SHADOWS. LIGHT FROM THE TOP-LEFT.',
    'TILES ARE 16x16 ART PX. MAPS ARE ABOUT 48x28 TILES (768x448), LARGER THAN THE SCREEN, WITH PAN AND INTEGER ZOOM.',
    'SCREEN SCALE S IS ALWAYS AN INTEGER: THE LARGEST S WITH FLOOR(DEVICE HEIGHT / S) >= 260. IPHONE 12 LANDSCAPE: S=4, VIEW 633x292. 1080P: S=4, 480x270. 1440P: S=5, 512x288.',
    'WORLD ZOOM W IS AN INTEGER FROM FIT-MAP UP TO 3S. POSITIONS SNAP TO WHOLE ART PIXELS. SMOOTHING OFF EVERYWHERE.',
    'PALETTE: MUTED, DESATURATED ENVIRONMENTS. ONLY ENERGY IS SATURATED - REPUBLIC BOLTS BLUE/CYAN, SEPARATIST BOLTS RED/ORANGE, ION WHITE-BLUE, DROID SHIELDS VIOLET.',
    'SPRITES ARE HAND-PLACED PIXEL MAPS (STRINGS OF PALETTE KEYS) IN SRC/ART. CODE ONLY DOES PALETTE SWAPS, TIER OVERLAYS, FLASHES, OUTLINES AND FRAME ASSEMBLY.',
    '1PX DARK OUTLINES, 3-4 SHADE RAMPS PER MATERIAL, NO PILLOW SHADING, NO ORPHAN PIXELS.',
    'TURRET AIM: 16 DIRECTIONS BUILT AT LOAD TIME WITH ROTSPRITE (SCALE2X x3, ROTATE, MAJORITY DOWNSAMPLE, ORPHAN CLEANUP). TROOPERS: 5 HAND-AUTHORED FACINGS + MIRRORS = 8.',
    'GLOWS ARE PIXEL-RING HALOS DRAWN ADDITIVELY, ONE COMPOSITE SWITCH PER LAYER. NO BLUR FILTERS.',
    'EVERY IMAGE IN THIS DECK IS RENDERED BY TOOLS/EXPORT-ART.MJS FROM THE SAME SRC/ART CODE THE GAME RUNS.',
  ];
  let y = 430;
  for (const p of pts) {
    fill(s.bm, 100, y + 4, 8, 8, C.accent);
    y += s.lines(wrap(p, 120), 124, y, { n: 2 }) + 10;
  }
  // first look: a slice of the battlefield at 2x
  s.img(crop(mockup, 150, 40, 300, 200), 1260, 460, 2);
  s.text('KAMINO, DEFAULT ZOOM, 2X', 1260, 870, { n: 2, color: C.dim });
  addSlide('title', s, 'Title and art direction summary.');
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
  const raw = (tier, dir, firing) => (isRifle ? composeRifle(art.towers.rifle[tier], DIRS8[dir], { firing }) : composeTurret(art.towers[kind][tier], dir, { firing }));
  // crop every frame to one shared rect (union of all tiers/dirs) so cells line up
  let ub = null;
  for (const tier of TIERS) for (let d = 0; d < (isRifle ? 8 : 16); d++) for (const f of [false, true]) {
    const b = bounds(raw(tier, d, f));
    ub = ub ? { x0: Math.min(ub.x0, b.x), y0: Math.min(ub.y0, b.y), x1: Math.max(ub.x1, b.x + b.w), y1: Math.max(ub.y1, b.y + b.h) } : { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
  }
  const compose = (tier, dir, firing) => crop(raw(tier, dir, firing), ub.x0, ub.y0, ub.x1 - ub.x0, ub.y1 - ub.y0);
  const idleDir = isRifle ? 2 : 3, fireDir = isRifle ? 1 : 5;
  const colW = 372;
  TIERS.forEach((tier, i) => {
    const x = 36 + i * colW;
    s.text(TIER_NAMES[kind][tier], x, 122, { n: 2, color: tier.startsWith('t4') ? C.warn : C.title });
    s.text(info.tiers[tier], x, 146, { n: 2, color: C.dim });
    const a = s.cell(compose(tier, idleDir, false), x, 176, 4, { bg: 'checker', pad: 3 });
    s.cell(compose(tier, idleDir, false), x + a.w + 12, 176, 4, { bg: 'ground', ground: GROUND, pad: 3 });
    const y2 = 176 + a.h + 14;
    const b = s.cell(compose(tier, fireDir, true), x, y2, 4, { bg: 'checker', pad: 3 });
    s.cell(compose(tier, fireDir, true), x + b.w + 12, y2, 4, { bg: 'ground', ground: GROUND, pad: 3 });

  });
  const cellH = (ub.y1 - ub.y0 + 6) * 4;
  const yRow = 176 + 2 * (cellH + 14) + 16;
  s.text(isRifle ? 'FIRING ROW ABOVE. AIM SAMPLE: TIER III, ALL 8 TROOPER FACINGS' : 'FIRING ROW ABOVE (RECOIL + FLASH). AIM SAMPLE: TIER III, ALL 16 ROTSPRITE DIRECTIONS', 36, yRow, { n: 2, color: C.accent });
  const dirs = isRifle ? 8 : 16;
  const frames = Array.from({ length: dirs }, (_, d) => compose('t3', d, false));
  const fw = frames[0].w + 2;
  const bar = new Bitmap(fw * dirs + 4, frames[0].h + 6);
  for (let j = 0; j < bar.h; j += 16) for (let i = 0; i < bar.w; i += 16) blit(bar, GROUND, i, j);
  frames.forEach((f, d) => blit(bar, f, 3 + d * fw, bar.h - f.h - 3));
  const scaleN = Math.min(4, Math.floor((SW - 72) / bar.w));
  s.img(bar, 36, yRow + 28, scaleN);
  addSlide(`tower-${kind}`, s, `${info.title}: tiers I-III plus both tier-4 branches. Idle and firing frames on checker and Kamino ground; aim sample below.`);
}

// ------------------------------------------------------------ enemy slides --
function enemyRow(s, y, key, frames, death, { extraLabel = '' } = {}) {
  const inf = ENEMY_INFO[key];
  s.text(inf.name, 40, y, { n: 3, color: C.title });
  s.text(inf.role, 40, y + 30, { n: 2, color: C.dim });
  if (extraLabel) s.text(extraLabel, 40, y + 54, { n: 2, color: C.accent });
  const st = strip(frames, 3);
  const a = s.cell(st, 520, y, 4, { bg: 'checker', pad: 3 });
  const b = s.cell(st, 520 + a.w + 16, y, 4, { bg: 'ground', ground: PATHT, pad: 3 });
  s.cell(strip(death, 3), 520 + a.w + b.w + 32, y, 4, { bg: 'ground', ground: GROUND, pad: 3 });
  return a.h;
}
{
  const s = new Slide('Droid army I', 'walk cycles (checker / walkway) + death (flash, spark, collapse, debris)');
  const e = art.enemies;
  let y = 130;
  y += enemyRow(s, y, 'trooper', e.trooper.walk, e.trooper.death) + 70;
  y += enemyRow(s, y, 'rush', e.rush.walk, e.rush.death) + 70;
  y += enemyRow(s, y, 'scuttler', e.scuttler.walk, e.scuttler.death) + 50;
  // swarm sample
  s.text('SCUTTLER SWARM AT 1:1 x4', 40, y, { n: 2, color: C.accent });
  const sw = new Bitmap(160, 40);
  for (let j = 0; j < 40; j += 16) for (let i = 0; i < 160; i += 16) blit(sw, PATHT, i, j);
  for (let i = 0; i < 26; i++) blit(sw, e.scuttler.walk[i % 4], 4 + ((i * 53) % 146), 4 + ((i * 11) % 29));
  s.img(sw, 520, y, 4);
  addSlide('enemies-1', s, 'Trooper Droid, Rush Droid, Scuttler.');
}
{
  const s = new Slide('Droid army II', 'shield droid modes, strike fighter (air)');
  const e = art.enemies;
  let y = 130;
  enemyRow(s, y, 'shield', [...e.shield.roll, ...e.shield.deploy, ...e.shield.walk], e.shield.death, { extraLabel: 'ROLL x2, DEPLOY, WALK x4' });
  // shield up sample
  y += 130;
  s.text('SHIELD UP (HEX BUBBLE, VIOLET)', 40, y + 40, { n: 2, color: C.accent });
  const bub = new Bitmap(28, 30);
  for (let j = 0; j < 30; j += 16) for (let i = 0; i < 28; i += 16) blit(bub, PATHT, i, j);
  blit(bub, e.shield.walk[0], 7, 29 - e.shield.walk[0].h);
  blit(bub, art.vfx.shield[1], 4, 6);
  s.cell(bub, 520, y, 4, { bg: '#25333b', pad: 0 });
  y += 160;
  s.text(ENEMY_INFO.fighter.name, 40, y, { n: 3, color: C.title });
  s.text(ENEMY_INFO.fighter.role, 40, y + 30, { n: 2, color: C.dim });
  s.text('16 ROTSPRITE HEADINGS OVER WATER, SHADOW ON THE SURFACE BELOW', 40, y + 54, { n: 2, color: C.accent });
  const f = e.fighter;
  const bar = new Bitmap(16 * 22 + 4, 44);
  for (let j = 0; j < 44; j += 16) for (let i = 0; i < bar.w; i += 16) blit(bar, K.water[0], i, j);
  for (let d = 0; d < 16; d++) { blit(bar, f.shadows[d], 2 + d * 22 + 5, 20); blit(bar, f.frames[d % 2][d], 2 + d * 22, 2); }
  s.img(bar, 40, y + 90, 4);
  y += 90 + 44 * 4 + 30;
  s.text('THRUSTER FLICKER (2 FRAMES) + DEATH TUMBLE', 40, y, { n: 2, color: C.accent });
  s.cell(strip([f.frames[0][0], f.frames[1][0]], 3), 40, y + 30, 4, { bg: 'checker', pad: 3 });
  s.cell(strip(f.death, 3), 400, y + 30, 4, { bg: 'checker', pad: 3 });
  addSlide('enemies-2', s, 'Shield Droid: rolls on twin treads, deploys into a slow walker with shield up. Strike Fighter: air unit.');
}

// ------------------------------------------------------------ tileset ------
{
  const s = new Slide('Kamino tileset', 'storm ocean, stilted platform city');
  const items = [
    ['GROUND A', K.ground[0]], ['GROUND B', K.ground[1]], ['GROUND C', K.ground[2]], ['WALKWAY (PATH)', K.path], ['PAD (NO BUILD)', K.pad],
    ['WATER F1', K.water[0]], ['WATER F2', K.water[1]], ['WATER F3', K.water[2]], ['WATER F4', K.water[3]], ['PLATFORM EDGE', K.cliff], ['BRIDGE TRUSS', K.bridgeFace],
  ];
  items.forEach(([n, b], i) => {
    const x = 40 + (i % 6) * 300, y = 130 + Math.floor(i / 6) * 150;
    s.img(b, x, y, 6);
    s.text(n, x, y + 104, { n: 2, color: C.dim });
  });
  let y = 470;
  s.text('PROPS (UNBUILDABLE) - CHECKER / GROUND', 40, y, { n: 2, color: C.accent });
  let x = 40;
  for (const [n, b] of Object.entries(K.props)) {
    if (n === 'rail') continue;
    const c1 = s.cell(b, x, y + 30, 4, { bg: 'checker', pad: 2 });
    const c2 = s.cell(b, x, y + 40 + c1.h, 4, { bg: 'ground', ground: GROUND, pad: 2 });
    const lw = s.text(n.toUpperCase(), x, y + 50 + c1.h + c2.h, { n: 2, color: C.dim });
    x += Math.max(c1.w, lw) + 40;
  }
  // autotile sample
  const grid = ['WWWWWWWWW', 'WGGGGWWWW', 'WGPPPBBBP', 'WGPGGWWWG', 'WGPXXWWWG', 'WGPGGGWGG', 'WWWWWWWWW'];
  const g = renderGround(grid, K, 0);
  s.text('AUTOTILE SAMPLE x2', 1480, y, { n: 2, color: C.accent });
  s.img(g, 1480, y + 30, 2);
  addSlide('kamino-tiles', s, 'Ground variants, walkway, pad, 4-frame water, platform edge with stilts, bridge truss, props, autotile sample.');
}

png(mockup, 'kamino-mockup-2x.png', 2);
{
  const s = new Slide('Kamino map mockup', '480x270 reference view, exported 2x');
  s.img(mockup, 40, 130, 2);
  const notes = [
    'DRAW ORDER: GROUND, DECALS, PATH, SHADOWS, UNITS + TOWERS (Y-SORTED), AIR, BOLTS, PARTICLES, ADDITIVE GLOWS, RAIN, STORM WASH.',
    'PLATFORMS ARE MID-GRAY SO WHITE CLONE ARMOR AND TAN DROIDS STAY READABLE.',
    'THE WALKWAY GRATING IS THE ENEMY PATH. BRIDGES SHOW A TRUSS; PLATFORM EDGES SHOW STILTS INTO THE SURF.',
    'WATER, PADS AND PROPS ARE UNBUILDABLE.',
    'BLUE BOLTS = REPUBLIC, RED BOLTS = SEPARATIST.',
    'FULL MAP IS 48x28 TILES; THIS IS ONE SCREEN AT DEFAULT ZOOM ON 1080P.',
  ];
  let y = 140;
  for (const n of notes) y += s.lines(wrap(n, 38), 1040, y, { n: 2 }) + 18;
  addSlide('kamino-mockup', s, 'One screen of the Kamino mockup map with towers, enemies, air units and effects.');
}

// ------------------------------------------------------------ readability --
{
  const R = {
    props: MOCK_PROPS,
    towers: [],
    enemies: [],
    air: [],
    bolts: [],
    fx: [],
    decals: [{ bm: art.vfx.scorch[1], x: 22 * 16, y: 21 * 16 }],
  };
  // all 15 tower variants on the lower platforms
  const spots = {
    rifle: [[4, 16], [4, 21], [11, 24], [13, 15], [6, 24]],
    rocket: [[7, 17], [8, 17], [10, 17], [12, 17], [14, 18]],
    flak: [[7, 19], [11, 21], [13, 21], [15, 21], [15, 22]],
  };
  for (const kind of ['rifle', 'rocket', 'flak'])
    TIERS.forEach((tier, i) => {
      const [tx, ty] = spots[kind][i];
      R.towers.push({ type: kind, tier, tx, ty, dir: kind === 'rifle' ? DIRS8[(i * 3) % 8] : (i * 5) % 16, firing: i === 2 });
    });
  const e = (type, x, y, o = {}) => R.enemies.push({ type, x, y, facing: 'E', frame: (x + y) % 4, ...o });
  e('trooper', 3 * 16, 20 * 16 + 10);
  e('trooper', 5 * 16, 20 * 16 + 9);
  e('rush', 7 * 16 + 4, 20 * 16 + 11);
  e('shield', 9 * 16 + 8, 21 * 16 + 4, { anim: 'roll' });
  e('shield', 9 * 16 + 8, 23 * 16 + 10, {});
  e('trooper', 13 * 16, 23 * 16 + 10);
  for (let i = 0; i < 8; i++) e('scuttler', 17 * 16 + i * 9, 23 * 16 + 6 + (i % 3) * 3);
  e('rush', 25 * 16, 23 * 16 + 10);
  e('trooper', 27 * 16 + 8, 21 * 16 + 10, { facing: 'E' });
  e('trooper', 18 * 16, 23 * 16 + 9, { anim: 'death', frame: 2 });
  R.air.push({ x: 20 * 16, y: 18 * 16, dir: 0, alt: 24 }, { x: 24 * 16, y: 19 * 16 + 8, dir: 2, alt: 22, frame: 1 });
  R.bolts.push({ x: 6 * 16, y: 19 * 16, dir: 2 }, { x: 22 * 16, y: 22 * 16, dir: 8, side: 'sep' });
  R.fx.push({ bm: art.vfx.expM[2], x: 12 * 16, y: 22 * 16 + 4, glow: art.vfx.glowFire }, { bm: art.vfx.shield[0], x: 9 * 16 + 8, y: 23 * 16 });
  const view = composeScene(art, GRID, R, { ox: 0, oy: 28 * 16 - 270, w: 480, h: 270, seed: 9 });
  png(view, 'readability-4x.png', 4);
  const s = new Slide('', '');
  s.img(view, 0, 0, 4);
  fill(s.bm, 0, 0, 980, 50, '#0c1116', 210);
  s.text('READABILITY - ACTUAL DEFAULT ZOOM (1080P, S=4). ALL 15 TOWER VARIANTS + 5 DROIDS', 16, 16, { n: 2, color: C.title });
  addSlide('readability', s, 'Readability check: everything at actual default-zoom size (1 art px = 4 screen px).');
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
  let y = 124;
  s.text('REPUBLIC BOLTS - 16 ANGLES (WITH ADDITIVE PIXEL-RING GLOW)', 40, y, { n: 2, color: C.accent });
  s.img(strip(art.vfx.boltRep.map((b) => withGlow(b, art.vfx.glowRep)), 0), 40, y + 26, 4);
  y += 26 + 17 * 4 + 20;
  s.text('SEPARATIST BOLTS - 16 ANGLES', 40, y, { n: 2, color: C.accent });
  s.img(strip(art.vfx.boltSep.map((b) => withGlow(b, art.vfx.glowSep)), 0), 40, y + 26, 4);
  y += 26 + 17 * 4 + 24;
  s.text('ION ARC (3 FRAMES)', 40, y, { n: 2, color: C.accent });
  s.img(strip(art.vfx.ionArc.map((b) => withGlow(b, art.vfx.glowIon)), 4), 40, y + 26, 4);
  s.text('ION BURST', 1300, y, { n: 2, color: C.accent });
  s.img(strip(art.vfx.ionBurst.map((b) => withGlow(b, art.vfx.glowIon)), 0), 1300, y + 26, 4);
  y += 26 + 19 * 4 + 24;
  s.text('MUZZLE FLASHES (BLASTER S/M, ROCKET/FLAK, BACKBLAST)', 40, y, { n: 2, color: C.accent });
  const flashes = [fromMap(['.C.', 'C#C', '.C.']), fromMap(['..c..', '.cCc.', 'cC#Cc', '.cCc.', '..c..']), art.vfx.muzzleFire, art.vfx.backblast];
  s.img(strip(flashes.map((b, i) => withGlow(b, i < 2 ? art.vfx.glowRep : art.vfx.glowFire)), 2), 40, y + 26, 4);
  s.text('IMPACT SPARKS (REP / SEP / ARMOR METAL)', 1000, y, { n: 2, color: C.accent });
  s.img(strip([...art.vfx.sparksRep, ...art.vfx.sparksSep, ...art.vfx.sparksMetal].map((b) => withGlow(b, art.vfx.glowRep)), 1), 1000, y + 26, 4);
  y += 26 + 30 * 4 + 24;
  s.text('SHIELD HIT - HEX BUBBLE RIPPLE (4 FRAMES)', 40, y, { n: 2, color: C.accent });
  s.img(strip(art.vfx.shield.map((b) => { const c = new Bitmap(b.w + 4, b.h + 4); fill(c, 0, 0, c.w, c.h, dark); blit(c, b, 2, 2); return c; }), 2), 40, y + 26, 4);
  s.text('HIT FLASH (1-2 FRAMES)', 1000, y, { n: 2, color: C.accent });
  const tr = art.enemies.trooper.walk[0];
  s.img(strip([tr, silhouette(tr, '#ffffff'), tr], 3), 1000, y + 26, 4);
  addSlide('vfx-1', s, 'Bolts, glows, ion, flashes, sparks, shield ripple, hit flash.');
}
{
  const s = new Slide('VFX II', 'explosions S/M/L, smoke, scorch decals, debris, rain');
  let y = 124;
  const row = (name, frames, n = 4) => {
    s.text(name, 40, y, { n: 2, color: C.accent });
    const st = strip(frames, 2);
    const c = new Bitmap(st.w + 4, st.h + 4);
    for (let j = 0; j < c.h; j += 16) for (let i = 0; i < c.w; i += 16) blit(c, GROUND, i, j);
    blit(c, st, 2, 2);
    s.img(c, 40, y + 26, n);
    y += 26 + c.h * n + 20;
  };
  row('EXPLOSION S (ROCKET HIT)', art.vfx.expS);
  row('EXPLOSION M', art.vfx.expM);
  row('EXPLOSION L (ARTILLERY / BOSS)', art.vfx.expL, 3);
  y -= 0;
  const y0 = y;
  row('SMOKE PUFF (DRIFTS, FADES)', art.vfx.smoke);
  y = y0;
  s.text('SCORCH DECALS (POOLED, OLDEST FADES)', 900, y, { n: 2, color: C.accent });
  const sc = strip(art.vfx.scorch, 4);
  const c = new Bitmap(sc.w + 8, sc.h + 8);
  for (let j = 0; j < c.h; j += 16) for (let i = 0; i < c.w; i += 16) blit(c, GROUND, i, j);
  blit(c, sc, 4, 4);
  s.img(c, 900, y + 26, 4);
  s.text('DEBRIS + RAIN + SPLASH', 1500, y, { n: 2, color: C.accent });
  const d = strip([...art.vfx.debris, art.vfx.rain, ...art.vfx.splash], 3);
  const c2 = new Bitmap(d.w + 6, d.h + 6);
  fill(c2, 0, 0, c2.w, c2.h, '#34434a');
  blit(c2, d, 3, 3);
  s.img(c2, 1500, y + 26, 4);
  addSlide('vfx-2', s, 'Explosion frame strips (pixel fireball -> breakup -> smoke), smoke puff, scorch decals, debris, rain.');
}

// ------------------------------------------------------------ UI -----------
{
  const ox = 9 * 16, oy = 2 * 16;
  const scene = composeScene(art, GRID, { ...MOCK, towers: MOCK.towers.filter((t) => t.tx > 12), bolts: [], fx: [] }, { ox, oy, w: VIEW.w, h: VIEW.h, seed: 3 });
  drawTopHud(scene, art, { speed: 1 });
  drawBuildBar(scene, art, { selected: 'rocket' });
  drawPlacement(scene, art, { tx: 22, ty: 10, ox, oy, valid: true, type: 'rocket', range: 56 });
  png(scene, 'hud-placement-2x.png', 2);
  const s = new Slide('UI I', 'iPhone 12 landscape view 633x292 (S=4), 2x. Placing a tower');
  s.img(scene, 40, 124, 2);
  const notes = [
    'TOP-LEFT: LIVES, CREDITS, WAVE X/Y.',
    'NEXT-WAVE PREVIEW: ICONS + COUNTS, AIR / ARMOR / SHIELD WARNINGS, CALL-EARLY BONUS.',
    'TOP-RIGHT: PAUSE, 1x 2x 3x, MENU.',
    'BUILD BAR: TOWER + COST, LOCKED SLOTS.',
    'DRAG GHOST: RANGE CIRCLE, GREEN/RED TILES, CONFIRM / CANCEL. GHOST SITS ABOVE THE FINGER.',
    'EVERY TAP TARGET IS 33x33 ART PX = 44x44 CSS PX ON THIS PHONE.',
  ];
  let y = 140;
  for (const n of notes) y += s.lines(wrap(n, 26), 1340, y, { n: 2 }) + 16;
  s.text('INVALID SPOT', 40, 124 + 292 * 2 + 30, { n: 2, color: C.accent });
  const bad = new Bitmap(60, 56);
  for (let j = 0; j < 56; j += 16) for (let i = 0; i < 60; i += 16) blit(bad, K.path, i, j);
  blit(bad, gridCell(false), 22, 22);
  const rc = rangeCircle(24, { valid: false });
  blit(bad, rc, 30 - (rc.w >> 1), 30 - (rc.h >> 1));
  s.img(bad, 40, 124 + 292 * 2 + 60, 4);
  s.text('BUTTONS: NORMAL / PRESSED (SQUASH) / ACCENT / GOOD / BAD', 360, 124 + 292 * 2 + 30, { n: 2, color: C.accent });
  const bts = strip([button(40, 33), button(40, 33, { pressed: true }), button(40, 33, { style: 'accent' }), button(40, 33, { style: 'good' }), button(40, 33, { style: 'bad' })], 4);
  s.img(bts, 360, 124 + 292 * 2 + 60, 4);
  addSlide('ui-placement', s, 'HUD with drag-ghost placement at the iPhone 12 view size. Placeholder numbers.');
}
{
  const ox = 9 * 16, oy = 2 * 16;
  const towers = MOCK.towers.map((t) => (t.tx === 26 && t.ty === 6 ? { ...t, tier: 't2', firing: false } : t));
  const scene = composeScene(art, GRID, { ...MOCK, towers, bolts: MOCK.bolts.slice(2), fx: MOCK.fx.slice(0, 2) }, { ox, oy, w: VIEW.w, h: VIEW.h, seed: 5 });
  // selected tower: range circle around the rocket III at (26,6)
  const rc = rangeCircle(60);
  blit(scene, rc, 26 * 16 + 8 - ox - (rc.w >> 1), 6 * 16 + 8 - oy - (rc.h >> 1));
  drawTopHud(scene, art, { speed: 2, lives: 17, flashLives: true });
  drawBuildBar(scene, art, { selected: null });
  drawInfoPanel(scene, art, VIEW.w - 186, 42);
  png(scene, 'hud-info-2x.png', 2);
  const s = new Slide('UI II', 'tower selected: range circle + info panel, 2x');
  s.img(scene, 40, 124, 2);
  const notes = [
    'INFO PANEL: DPS, DAMAGE TYPE, HITS AIR, TARGETING MODE (FIRST / LAST / STRONGEST / CLOSEST / AIR PRIORITY).',
    'NEXT UPGRADE AS A DIFF: GREEN = BETTER, RED = WORSE.',
    'UPGRADE AND SELL (WITH CURRENT SELL VALUE).',
    'LIVES FLASH RED AFTER A LEAK.',
  ];
  let y = 140;
  for (const n of notes) y += s.lines(wrap(n, 26), 1340, y, { n: 2 }) + 16;
  s.text('ICONS', 40, 124 + 292 * 2 + 30, { n: 2, color: C.accent });
  const ics = Object.keys(ICONS).map((n) => icon(n));
  const st = strip(ics, 4);
  const back = new Bitmap(st.w + 8, st.h + 8);
  fill(back, 0, 0, back.w, back.h, '#222c35');
  blit(back, st, 4, 4);
  s.img(back, 40, 124 + 292 * 2 + 60, 4);
  s.text('DAMAGE NUMBERS (OPTIONAL)', 1340, 124 + 292 * 2 + 30, { n: 2, color: C.accent });
  const dn = new Bitmap(60, 14);
  fill(dn, 0, 0, 60, 14, '#34434a');
  drawText(dn, '12', 2, 3, { color: '#ffffff', font: FONT5, outline: '#101217' });
  drawText(dn, '36!', 18, 3, { color: '#ffd27a', font: FONT5, outline: '#101217' });
  drawText(dn, '+24', 38, 3, { color: '#9ef08a', font: FONT5, outline: '#101217' });
  s.img(dn, 1340, 124 + 292 * 2 + 60, 4);
  addSlide('ui-info', s, 'Tower info panel and icon set. Placeholder numbers.');
}

// ------------------------------------------------------------ icon/emblem --
function appIcon(size = 48, maskable = false) {
  const bm = new Bitmap(size, size);
  // steel plate with bevel, dark storm-blue field, emblem centered
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      let c = '#1c2a36';
      if (!maskable) {
        if (edge === 0) c = '#101217';
        else if (edge === 1) c = x < y ? '#4f5d63' : (size - 1 - x < size - 1 - y ? '#151c23' : '#7d8d90');
        else if (edge < 4) c = '#33404a';
      }
      if (c === '#1c2a36' && ((x + y) % 2 === 0) && Math.hypot(x - size / 2, y - size / 2) < size * 0.34) c = '#22344a';
      fill(bm, x, y, 1, 1, c);
    }
  const g = art.vfx.glowRep;
  blitAdd(bm, scale(g, 3), (size - g.w * 3) >> 1, (size - g.h * 3) >> 1);
  const em = art.emblems.republic;
  blit(bm, em, (size - em.w) >> 1, ((size - em.h) >> 1) + 1);
  return bm;
}
{
  const s = new Slide('App icon + title emblem', 'concept; final icons exported from this code in Phase 4');
  const ic = appIcon(48);
  s.img(ic, 60, 140, 8);
  s.text('APP ICON 48 ART PX (x8 = 384)', 60, 140 + 384 + 16, { n: 2, color: C.dim });
  const mk = appIcon(48, true);
  s.img(mk, 500, 140, 8);
  s.text('MASKABLE (FULL BLEED, SAFE ZONE)', 500, 140 + 384 + 16, { n: 2, color: C.dim });
  // maskable safe-zone circle guide
  const guide = new Bitmap(384, 384);
  for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) if (Math.abs(Math.hypot(x - 192, y - 192) - 154) < 1) guide.set(x, y, 0x80ffffff);
  blit(s.bm, guide, 500, 140);
  s.img(ic, 940, 140, 4);
  s.img(ic, 940 + 220, 140, 2);
  s.img(ic, 940 + 340, 140, 1);
  s.text('4x / 2x / 1x', 940, 140 + 200, { n: 2, color: C.dim });
  const logo1 = logoText('REPUBLIC', 3);
  const logo2 = logoText('FRONTLINE', 3, ['#a8f4ff', '#7cf0ff', '#38b8e0', '#1d6f95']);
  const ty = 680;
  s.img(art.emblems.republic, 60, ty, 8);
  s.img(logo1, 260, ty + 10, 2);
  s.img(logo2, 260, ty + 10 + logo1.h * 2 + 6, 2);
  s.text('TITLE LOCKUP: ORIGINAL KITE-SHIELD EMBLEM, BEVELED PIXEL LETTERING FROM THE GAME FONT', 60, ty + 230, { n: 2, color: C.dim });
  s.img(art.emblems.separatist, 1500, ty, 8);
  s.text('SEPARATIST EMBLEM', 1500, ty + 140, { n: 2, color: C.dim });
  png(ic, 'icon-concept-8x.png', 8);
  png(mk, 'icon-concept-maskable-8x.png', 8);
  addSlide('icon-emblem', s, 'App icon concept (standard + maskable), title lockup and both faction emblems.');
}

// ------------------------------------------------------------ deck ---------
const pptx = new pptxgen();
pptx.defineLayout({ name: 'RF1080', width: SW / 96, height: SH / 96 });
pptx.layout = 'RF1080';
pptx.title = 'Republic Frontline - Phase 0 Art Preview';
for (const sl of slides) {
  const slide = pptx.addSlide();
  slide.background = { color: '0C1116' };
  slide.addImage({ path: join(OUT, sl.file), x: 0, y: 0, w: SW / 96, h: SH / 96 });
  slide.addNotes(sl.notes + '\nSource PNG: art-preview/' + sl.file + ' (the PNGs are the source of truth; PowerPoint may smooth when zoomed).');
}
await pptx.writeFile({ fileName: join(ROOT, 'art-preview.pptx') });
console.log(`art-preview: ${slides.length} slides, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
