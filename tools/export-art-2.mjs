// Phase 2 art checkpoint exporter. Runs the real src/art code in Node
// (@napi-rs/canvas), writes every new sprite strip and slide to
// art-preview-2/, then builds art-preview-2.pptx (same format as the Phase 0
// deck: 1920x1080 slide PNGs placed at native size, 96 px/in).
//
//   node tools/export-art-2.mjs

import { createCanvas } from '@napi-rs/canvas';
import pptxgen from 'pptxgenjs';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildArt, buildArtPhase2, TIERS, TIER_NAMES, ENEMY_INFO, BOSS_INFO } from '../src/art/index.js';
import { Bitmap, blit, fill, scale, strip, toCanvas, silhouette, bounds, crop } from '../src/art/bitmap.js';
import { composeRifle, composeTurret, DIRS8 } from '../src/art/towers.js';
import * as P from '../src/art/palettes.js';
import { Slide, C, SW, wrap } from './art/slide.mjs';
import { mockups } from './art/mockups2.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'art-preview-2');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'slides'), { recursive: true });

const png = (bm, rel, n = 2) => {
  const f = join(OUT, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, toCanvas(n === 1 ? bm : scale(bm, n), createCanvas).toBuffer('image/png'));
};
const tiled = (w, h, tile) => {
  const b = new Bitmap(w, h);
  for (let j = 0; j < h; j += tile.h) for (let i = 0; i < w; i += tile.w) blit(b, tile, i, j);
  return b;
};

const t0 = Date.now();
const art1 = buildArt();
const art = buildArtPhase2();
const T = art.tiles;
const GEO = T.geonosis.ground[0], GEOP = T.geonosis.path;
const slides = [];
const addSlide = (name, s, notes) => {
  const file = `slides/${String(slides.length + 1).padStart(2, '0')}-${name}.png`;
  s.save(join(OUT, file));
  slides.push({ file, notes });
};
const mock = mockups(art1, art);

// ------------------------------------------------------------ sprite PNGs --
for (const [kind, set] of Object.entries(art.towers))
  for (const tier of TIERS) {
    const t = set[tier];
    if (kind === 'sharpshooter') {
      png(strip(DIRS8.map((d) => composeRifle(t, d)), 4), `sprites/towers/${kind}-${tier}-composite-8dir.png`);
      png(strip(DIRS8.map((d) => t.troopers[d].fire.bm), 2), `sprites/towers/${kind}-${tier}-trooper-8dir-fire.png`);
    } else if (kind === 'depot') png(strip(t.frames, 4), `sprites/towers/${kind}-${tier}-blink.png`);
    else if (t.static) png(strip(t.pulse, 4), `sprites/towers/${kind}-${tier}-pulse-4f.png`);
    else {
      png(t.base, `sprites/towers/${kind}-${tier}-base.png`);
      png(strip(t.frames, 2), `sprites/towers/${kind}-${tier}-head-32dir.png`, 1);
      png(strip(t.frames.map((_, i) => composeTurret(t, i)).filter((_, i) => i % 2 === 0), 2), `sprites/towers/${kind}-${tier}-composite-16of32.png`, 1);
    }
  }
for (const [k, e] of Object.entries(art.enemies)) {
  if (e.frames) {
    e.frames.forEach((set, i) => png(strip(set, 2), `sprites/enemies/${k}-32dir-f${i}.png`, 1));
    png(strip(e.death, 2), `sprites/enemies/${k}-death.png`);
    continue;
  }
  png(strip(e.walk, 2), `sprites/enemies/${k}-move-${e.walk.length}f.png`);
  png(strip(e.death, 2), `sprites/enemies/${k}-death-6f.png`);
}
{
  const B = art.bosses;
  png(strip(B.tidebreaker.walk, 4), 'sprites/bosses/tidebreaker-walk.png');
  png(strip(B.tidebreaker.deploy, 4), 'sprites/bosses/tidebreaker-phase2-deploy.png');
  png(strip(B.tidebreaker.emerge, 4), 'sprites/bosses/tidebreaker-emerge-8f.png');
  png(strip(B.foundry.walk, 4), 'sprites/bosses/foundry-crawl.png');
  png(strip([...B.foundry.vent, B.foundry.ventBroken], 4), 'sprites/bosses/foundry-vent-weakpoint.png');
  png(strip(B.foundry.door, 4), 'sprites/bosses/foundry-door.png');
  png(strip(B.reaper.walk, 4), 'sprites/bosses/reaper-phase1.png');
  png(strip(B.reaper.armored, 4), 'sprites/bosses/reaper-phase2-armor.png');
  png(strip(B.dreadnought.frames[0], 2), 'sprites/bosses/dreadnought-32dir.png', 1);
  B.warlord.phases.forEach((p, i) => png(strip(p, 4), `sprites/bosses/warlord-phase${i + 1}.png`));
  for (const [k, b] of Object.entries(B)) png(strip(b.death, 4), `sprites/bosses/${k}-death.png`);
}
for (const [p, t] of Object.entries(T)) {
  png(strip([...t.ground, t.path, t.cliff], 0), `sprites/tiles/${p}-tiles.png`);
  png(strip(t.hazard, 0), `sprites/tiles/${p}-hazard-8f.png`);
  for (const [n, b] of Object.entries(t.props)) png(b, `sprites/props/${p}-${n}.png`);
}
for (const [p, b] of Object.entries(mock)) png(b, `${p}-mockup-1x.png`, 1);

// ------------------------------------------------------------ title -------
{
  const s = new Slide('Phase 2 art checkpoint', 'full content, before wiring it in');
  const pts = [
    '5 NEW TOWERS, EACH WITH TIERS I-III AND BOTH TIER-4 BRANCHES: REPEATER NEST, ARTILLERY BATTERY, ION CANNON, SHARPSHOOTER POST, SUPPLY DEPOT.',
    '9 NEW DROIDS: COMMANDO, TACTICAL, HEAVY TANK, DROID CARRIER, SHIELD WALKER, CRAWLER WALKER, SIEGE WALKER (GROUND); BOMBER GUNSHIP, REPAIR DRONE (AIR, 32 HEADINGS).',
    '5 BOSSES WITH EVERY PHASE AND WEAK POINT: TIDEBREAKER, FOUNDRY COLOSSUS, TIMBER REAPER, NIGHT DREADNOUGHT, THE WARLORD ENGINE.',
    '4 PLANET TILESETS (GEONOSIS, KASHYYYK, UMBARA, MUSTAFAR): GROUND VARIANTS, PATH, ROUGH, HAZARD (8 FRAMES), CLIFF EDGE, PROPS. ONE MAP MOCKUP EACH.',
    'SAME RULES AS PHASE 0: HAND-PLACED PIXEL MAPS, 2X WORLD DETAIL, 1PX DARK OUTLINES, TOP-LEFT LIGHT, MUTED ENVIRONMENTS, ONLY ENERGY SATURATED. EVERY IMAGE IS RENDERED FROM SRC/ART.',
    'MOCKUP SLIDES SHOW THE WORLD AT THE 1080P DEFAULT ZOOM (2 DEVICE PX PER ART PX), SO THEY DOUBLE AS READABILITY CHECKS.',
  ];
  let y = 150;
  for (const p of pts) {
    fill(s.bm, 60, y + 4, 8, 8, C.accent);
    y += s.lines(wrap(p, 70), 84, y, { n: 2 }) + 14;
  }
  s.img(crop(mock.umbara, 160, 0, 560, 448), 1120, 140, 1);
  s.img(crop(mock.mustafar, 400, 140, 420, 300), 1120, 610, 1);
  s.text('UMBARA AND MUSTAFAR MOCKUPS, 1:1', 1120, 930, { n: 2, color: C.dim });
  addSlide('title', s, 'Phase 2 art checkpoint overview.');
}

// ------------------------------------------------------------ towers -------
const TOWER_INFO = {
  repeater: { title: 'Repeater Nest', role: 'BLASTER · GROUND · ROTARY SPIN-UP · 1x1', tiers: { t1: 'ROTARY GUN, DRUM FEED', t2: 'LONGER BUNDLE, TWIN DRUMS', t3: 'ARMORED, GUN SHIELD', t4a: 'TWIN: TWO ROTARIES', t4b: 'SUPPRESSION: SHROUD, SLOWS' } },
  artillery: { title: 'Artillery Battery', role: 'EXPLOSIVE · GROUND · LONG + MIN RANGE · 1x1', tiers: { t1: 'FIELD GUN, SPADES', t2: 'MUZZLE BRAKE, SANDBAGS', t3: 'ARMORED, SHELL RACK', t4a: 'SIEGE HOWITZER: HUGE GUN', t4b: 'BARRAGE: TRIPLE TUBES' } },
  ion: { title: 'Ion Cannon', role: 'ION · GROUND + AIR · STRIPS SHIELDS, STUNS · 1x1', tiers: { t1: 'TWIN PRONGS, CORE', t2: 'COIL RINGS, BIGGER CORE', t3: 'TRIPLE PRONG, CAPACITOR', t4a: 'ION ARC: CHAIN MAST', t4b: 'PULSE DOME: AREA PULSE' } },
  sharpshooter: { title: 'Sharpshooter Post', role: 'PIERCING · GROUND + AIR · VERY LONG RANGE · 1x1', tiers: { t1: 'STEEL SCAFFOLD, RAIL', t2: 'TALLER, SANDBAGS, CANVAS', t3: 'ARMOR PLATE, SEARCHLIGHT', t4a: 'ARMOR BREAKER: SPOTTER', t4b: 'RAIL MARKSMAN: COIL BANK' } },
  depot: { title: 'Supply Depot', role: 'ECONOMY · 2x2 · MAX 3 PER MAP', tiers: { t1: 'TENT AND CRATES', t2: 'PREFAB HUT, BEACON', t3: '+ CARGO CRANE', t4a: 'CREDIT EXCHANGE: VAULT', t4b: 'COMMAND RELAY: DISH MAST' } },
};
for (const kind of Object.keys(TOWER_INFO)) {
  const info = TOWER_INFO[kind];
  const s = new Slide(info.title, info.role);
  const set = art.towers[kind];
  const post = kind === 'sharpshooter', depot = kind === 'depot';
  const nd = post ? 8 : depot ? 2 : 32;
  const raw = (tier, dir, firing) => {
    const t = set[tier];
    if (post) return composeRifle(t, DIRS8[dir], { firing });
    if (depot) return t.frames[dir % 2];
    return composeTurret(t, t.static ? dir % 4 : dir, { firing, spin: dir & 1 });
  };
  let ub = null;
  for (const tier of TIERS) for (let d = 0; d < nd; d++) for (const f of [false, true]) {
    const b = bounds(raw(tier, d, f));
    ub = ub ? { x0: Math.min(ub.x0, b.x), y0: Math.min(ub.y0, b.y), x1: Math.max(ub.x1, b.x + b.w), y1: Math.max(ub.y1, b.y + b.h) } : { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h };
  }
  const compose = (tier, dir, firing) => crop(raw(tier, dir, firing), ub.x0, ub.y0, ub.x1 - ub.x0, ub.y1 - ub.y0);
  const idleDir = post ? 1 : depot ? 0 : 2, fireDir = post ? 7 : depot ? 1 : 29;
  const colW = 372;
  const n = depot ? 2 : 2;
  let cellH = 0;
  TIERS.forEach((tier, i) => {
    const x = 36 + i * colW;
    s.text(TIER_NAMES[kind][tier], x, 122, { n: 2, color: tier.startsWith('t4') ? C.warn : C.title });
    s.text(info.tiers[tier], x, 146, { n: 2, color: C.dim });
    const a = s.cell(compose(tier, idleDir, false), x, 176, n, { bg: 'checker', pad: 4 });
    s.cell(compose(tier, idleDir, false), x + a.w + 12, 176, n, { bg: 'ground', ground: GEO, pad: 4 });
    const y2 = 176 + a.h + 14;
    s.cell(compose(tier, fireDir, true), x, y2, n, { bg: 'checker', pad: 4 });
    s.cell(compose(tier, fireDir, true), x + a.w + 12, y2, n, { bg: 'ground', ground: GEO, pad: 4 });
    cellH = a.h;
  });
  const yRow = 176 + 2 * (cellH + 14) + 16;
  const label = post ? 'IDLE ROW, FIRING ROW. AIM SAMPLE: TIER III, ALL 8 MARKSMAN FACINGS'
    : depot ? 'TOP ROW: BEACONS ON. BOTTOM ROW: BEACON BLINK FRAME. NO AIM (ECONOMY BUILDING)'
    : kind === 'ion' ? 'IDLE ROW, FIRING ROW. TIER 4 EMITTERS DO NOT AIM: THEIR ION GLOW PULSES (4 FRAMES). AIM SAMPLE: TIER III, 16 OF 32'
    : 'IDLE ROW, FIRING ROW (RECOIL + FLASH' + (kind === 'repeater' ? ', BARREL SPIN' : '') + '). AIM SAMPLE: TIER III, 16 OF 32 ROTSPRITE DIRECTIONS';
  s.text(label, 36, yRow, { n: 2, color: C.accent });
  if (!depot) {
    const dirs = post ? [...Array(8).keys()] : [...Array(32).keys()].filter((d) => d % 2 === 0);
    const frames = dirs.map((d) => compose('t3', d, false));
    const fw = frames[0].w + 2;
    const bar = tiled(fw * frames.length + 4, frames[0].h + 6, GEO);
    frames.forEach((f, i) => blit(bar, f, 3 + i * fw, bar.h - f.h - 3));
    s.img(bar, 36, yRow + 28, Math.max(1, Math.min(2, Math.floor((SW - 72) / bar.w))));
  }
  addSlide(`tower-${kind}`, s, `${info.title}: tiers I-III plus both tier-4 branches, idle and firing, on checker and Geonosis ground.`);
}

// ------------------------------------------------------------ droids -------
function enemyRow(s, y, key, frames, death, ground, extra = '') {
  const inf = ENEMY_INFO[key];
  s.text(inf.name, 40, y, { n: 3, color: C.title });
  s.text(inf.role, 40, y + 30, { n: 2, color: C.dim });
  if (extra) s.text(extra, 40, y + 54, { n: 2, color: C.accent });
  const st = strip(frames, 4), ds = strip(death, 4);
  const n = 560 + (st.w + ds.w + 16) * 3 + 24 < SW - 20 && (st.h + 8) * 6 + 10 < 300 ? 3 : 2;
  const a = s.cell(st, 560, y, n, { bg: 'checker', pad: 4 });
  s.cell(st, 560, y + a.h + 10, n, { bg: 'ground', ground, pad: 4 });
  s.cell(ds, 560 + a.w + 24, y, n, { bg: 'ground', ground, pad: 4 });
  return a.h * 2 + 10;
}
{
  const s = new Slide('Droid army III', 'walk cycles (checker / path) + deaths');
  const e = art.enemies;
  let y = 120;
  y += enemyRow(s, y, 'commando', e.commando.walk, e.commando.death, GEOP, '6-FRAME WALK') + 24;
  y += enemyRow(s, y, 'tactical', e.tactical.walk, e.tactical.death, T.umbara.path, '6-FRAME WALK') + 24;
  enemyRow(s, y, 'shieldwalker', e.shieldwalker.walk, e.shieldwalker.death, T.kashyyyk.path, 'QUADRUPED, 6-FRAME GAIT');
  addSlide('droids-3', s, 'Commando Droid, Tactical Droid, Shield Walker.');
}
{
  const s = new Slide('Droid army IV', 'walkers and armor');
  const e = art.enemies;
  let y = 120;
  y += enemyRow(s, y, 'crawler', e.crawler.walk, e.crawler.death, T.kashyyyk.path, 'SIX LEGS, TRIPOD GAIT') + 24;
  y += enemyRow(s, y, 'siege', e.siege.walk, e.siege.death, T.mustafar.path, 'ELITE HEAVY BIPED') + 24;
  enemyRow(s, y, 'tank', e.tank.walk, e.tank.death, GEOP, 'TREADS ROLL 4 FRAMES');
  addSlide('droids-4', s, 'Crawler Walker, Siege Walker, Heavy Tank.');
}
{
  const s = new Slide('Droid army V', 'carrier + air units (32 headings)');
  const e = art.enemies;
  let y = 120;
  y += enemyRow(s, y, 'carrier', e.carrier.walk, e.carrier.death, GEOP, 'WHEELS SPIN, SCUTTLERS RIDE IN THE BAYS') + 30;
  for (const k of ['bomber', 'repair']) {
    const f = e[k];
    s.text(ENEMY_INFO[k].name, 40, y, { n: 3, color: C.title });
    s.text(ENEMY_INFO[k].role, 40, y + 30, { n: 2, color: C.dim });
    s.text(`16 OF ${f.dirs} HEADINGS + SHADOW, ${f.frames.length} ${k === 'bomber' ? 'THRUSTER' : 'ROTOR'} FRAMES, DEATH TUMBLE`, 40, y + 54, { n: 2, color: C.accent });
    const sz = f.size + 4;
    const bar = tiled(16 * sz + 8, sz + 30, T.umbara.ground[0]);
    for (let i = 0; i < 16; i++) { const d = i * 2; blit(bar, f.shadows[d], 4 + i * sz + 11, 30, { alpha: 0.55 }); blit(bar, f.frames[i % f.frames.length][d], 4 + i * sz, 0); }
    const sc = Math.min(2, Math.floor((SW - 80) / bar.w)) || 1;
    s.img(bar, 40, y + 84, sc);
    s.cell(strip(f.death, 4), 40 + bar.w * sc + 20, y + 84, 2, { bg: 'checker', pad: 4 });
    y += 84 + bar.h * sc + 30;
  }
  addSlide('droids-5', s, 'Droid Carrier, Bomber Gunship, Repair Drone.');
}

// ------------------------------------------------------------ bosses -------
function bossSlide(key, rows, sub) {
  const inf = BOSS_INFO[key];
  const s = new Slide(inf.name, `${inf.planet.toUpperCase()} BOSS`);
  s.text(inf.role.toUpperCase(), 40, 120, { n: 2, color: C.dim });
  let y = 160;
  const budget = Math.floor((sub ? 960 : 1040) - 160) / rows.length - 50;
  for (const [label, frames, ground] of rows) {
    s.text(label, 40, y, { n: 2, color: C.accent });
    const st = strip(frames, 6);
    const sc = Math.max(1, Math.min(3, Math.floor((SW - 100) / (st.w + 12)), Math.floor(budget / (st.h + 12))));
    const a = s.cell(st, 40, y + 26, sc, ground ? { bg: 'ground', ground, pad: 6 } : { bg: 'checker', pad: 6 });
    y += 26 + a.h + 24;
  }
  if (sub) s.lines(wrap(sub, 150), 40, Math.min(y, 1000), { n: 2, color: C.text });
  addSlide(`boss-${key}`, s, `${inf.name}: phases, weak points, animation.`);
}
const B = art.bosses;
const K1 = art1.tiles.kamino;
bossSlide('tidebreaker', [
  ['WALK (4 FRAMES) + PHASE 2: DORSAL BAY OPEN, TROOP DROIDS DEPLOY', [...B.tidebreaker.walk.slice(0, 2), ...B.tidebreaker.deploy.slice(0, 2)], K1.ground[0]],
  ['ENTRANCE: RISES OUT OF THE SEA (8 FRAMES, FOAM AT THE WATERLINE)', B.tidebreaker.emerge.filter((_, i) => i % 2 === 1).concat([B.tidebreaker.emerge[7]]), K1.water[0], 1],
  ['DEATH: FLASH, BURNING, WRECK', B.tidebreaker.death, K1.ground[0]],
], 'AMPHIBIOUS ASSAULT WALKER. SIX CRAB LEGS IN A TRIPOD GAIT, FRONTAL RAM, SENSOR TOWER.');
bossSlide('foundry', [
  ['CRAWL (TREADS ROLL) + ASSEMBLY DOOR CLOSED / OPENING / OPEN (DROIDS EMERGE)', [B.foundry.walk[0], B.foundry.walk[1], B.foundry.compose(0, { doorState: 1 }), B.foundry.compose(1, { doorState: 2 })], GEO, 1],
  ['WEAK POINTS: 3 EXHAUST VENTS WITH THEIR OWN HP - INTACT (2 GLOW FRAMES) / DESTROYED', [B.foundry.vent[0], B.foundry.vent[1], B.foundry.ventBroken, B.foundry.compose(0, { broken: [0] }), B.foundry.compose(0, { broken: [0, 2] })], GEO, 1],
  ['DEATH', B.foundry.death, GEO, 1],
], 'EACH DESTROYED VENT SLOWS PRODUCTION. VENTS ARE SEPARATE SPRITES WITH POSITIONS SO THE GAME DRAWS EACH STATE INDEPENDENTLY.');
bossSlide('reaper', [
  ['PHASE 1: EXPOSED CHASSIS, SAWS SPIN (2 FRAMES), TREADS ROLL', B.reaper.walk, T.kashyyyk.ground[0], 1],
  ['PHASE 2: ARMOR SHELL RAISED (ARMORED, HIGH MULTIPLIER VS BLASTER / ION)', B.reaper.armored, T.kashyyyk.ground[0], 1],
  ['DEATH', B.reaper.death, T.kashyyyk.ground[0], 1],
]);
{
  const d = B.dreadnought;
  const dirs = [0, 4, 8, 12, 16, 20, 24, 28].map((i) => d.frames[i % 3][i]);
  bossSlide('dreadnought', [
    ['8 OF 32 HEADINGS (ROTSPRITE), 3 ENGINE FLICKER FRAMES', dirs, T.umbara.ground[0], 1],
    ['DEATH', d.death, T.umbara.hazard[0], 1],
  ], 'AIR BOSS. DROPS BOMBERS. LIGHTS-OUT PULSE (TOWER RANGE -20% FOR 4 S) IS A RUNTIME EFFECT DRAWN IN PHASE 2 WIRING.');
}
bossSlide('warlord', [
  ['PHASE 1 ARMOR (PLATES OVER THE GENERATORS) - PHASE 2 SHIELDS (VIOLET CORES + FINS) - PHASE 3 ENRAGE (FIRE CRACKS, BURNING STACKS, WHITE EYE)', [B.warlord.phases[0][0], B.warlord.phases[1][1], B.warlord.phases[2][2]], T.mustafar.ground[0], 1],
  ['WALK CYCLE (PHASE 1)', B.warlord.phases[0], T.mustafar.ground[0], 1],
  ['DEATH', B.warlord.death, T.mustafar.ground[0], 1],
]);

// ------------------------------------------------------------ tilesets -----
const PLANET_TEXT = {
  geonosis: ['Geonosis tileset', 'WIND-RIPPLED DUST, HAUL ROAD, CANYON CHASM, BOULDERS', ['TERMITE SPIRE', 'FOUNDRY STACK', 'MESA PILLAR', 'DROID WRECK']],
  kashyyyk: ['Kashyyyk tileset', 'MOSS FLOOR, PLANK WALKWAYS, MISTY RAVINE, ROOT KNOTS', ['GIANT TRUNK 2x2', 'FERN', 'FALLEN LOG', 'LANTERN']],
  umbara: ['Umbara tileset', 'NIGHT SOIL, FLAGSTONE CAUSEWAY, GLOWING SWAMP, FUNGUS', ['GLOWBULB PLANT', 'SPORE PODS', 'TWISTED TREE']],
  mustafar: ['Mustafar tileset', 'BLACK ROCK, BASALT ROAD, LAVA (ANIMATED), MAGMA CRUST', ['MINING RIG', 'OBSIDIAN SPIRE', 'FUMAROLE']],
};
for (const [p, t] of Object.entries(T)) {
  const [title, sub, propNames] = PLANET_TEXT[p];
  const s = new Slide(title, sub);
  const items = [['GROUND A', t.ground[0]], ['GROUND B', t.ground[1]], ['GROUND C', t.ground[2]], ['PATH', t.path], ['ROUGH (NO BUILD)', (() => { const g = t.ground[0].clone(); blit(g, t.rough); return g; })()], ['CLIFF EDGE', t.cliff], ['BRIDGE', t.bridge]];
  items.forEach(([n, b], i) => { const x = 40 + i * 262; s.img(b, x, 130, 3); s.text(n, x, 236, { n: 2, color: C.dim }); });
  s.text('HAZARD: 8 FRAMES', 40, 290, { n: 2, color: C.accent });
  s.img(strip(t.hazard, 4), 40, 316, 3);
  s.text('PROPS (UNBUILDABLE) - CHECKER / GROUND', 40, 450, { n: 2, color: C.accent });
  let x = 40;
  Object.values(t.props).forEach((b, i) => {
    const a = s.cell(b, x, 480, 3, { bg: 'checker', pad: 3 });
    s.cell(b, x, 480 + a.h + 12, 3, { bg: 'ground', ground: t.ground[0], pad: 3 });
    s.text(propNames[i] || '', x, 480 + a.h * 2 + 24, { n: 2, color: C.dim });
    x += a.w + 40;
  });
  s.text('PALETTE', 1500, 450, { n: 2, color: C.accent });
  P.PLANET_PALETTES[p.toUpperCase()].forEach((h, i) => { fill(s.bm, 1500 + (i % 4) * 92, 480 + (i >> 2) * 92, 86, 86, '#000000'); fill(s.bm, 1503 + (i % 4) * 92, 483 + (i >> 2) * 92, 80, 80, h); });
  addSlide(`tiles-${p}`, s, `${title}: tiles, hazard animation, props.`);
}

// ------------------------------------------------------------ mockups ------
const MOCK_TEXT = {
  geonosis: 'FOUNDRY COLOSSUS ON THE HAUL ROAD (ONE VENT DESTROYED, DOOR OPEN). REPEATER, ARTILLERY, ION, PULSE DOME, ARMOR BREAKER, DEPOT. COMMANDOS, TANK, CARRIER, BOMBER.',
  kashyyyk: 'TIMBER REAPER (PHASE 2 SHELL) ON THE WALKWAY. SCUTTLER SWARM, CARRIER, CRAWLER, REPAIR DRONES. ION ARC, CREDIT EXCHANGE, BARRAGE BATTERY, SHARPSHOOTER III.',
  umbara: 'NIGHT DREADNOUGHT OVER THE SWAMP. SHIELD WALKER (BUBBLE), TACTICAL DROID, CRAWLER, BOMBER, FIGHTERS. UNITS GET A COOL NIGHT OUTLINE SO THEY STAY READABLE.',
  mustafar: 'THE WARLORD ENGINE IN PHASE 3 (ENRAGE). SIEGE WALKERS, TACTICAL, TANK, BOMBER. SIEGE HOWITZER FIRING, RAIL MARKSMAN, SUPPRESSION GUN, COMMAND RELAY.',
};
for (const [p, b] of Object.entries(mock)) {
  const s = new Slide(`${p} mockup`, '26x14 TILES AT THE 1080P DEFAULT ZOOM');
  s.img(b, (SW - b.w * 2) >> 1, 116, 2);
  s.lines(wrap(MOCK_TEXT[p], 150), 40, 116 + b.h * 2 + 12, { n: 2, color: C.text });
  addSlide(`mockup-${p}`, s, `${p} map mockup with its boss.`);
}

// ------------------------------------------------------------ silhouettes --
{
  const s = new Slide('Silhouette check', 'all 14 droids + 5 bosses, black on white, default zoom');
  const all = [
    ...['trooper', 'rush', 'scuttler', 'shield', 'fighter'].map((k) => [k, art1.enemies[k]]),
    ...Object.entries(art.enemies),
  ];
  let x = 40, y = 150;
  for (const [k, e] of all) {
    const img = e.walk ? e.walk[0] : e.frames[0][0];
    const sil = silhouette(img, '#000000');
    const a = s.cell(sil, x, y, 2, { bg: '#e6ece9', pad: 4, w: 54, h: 50 });
    s.text((ENEMY_INFO[k]?.name || k).toUpperCase(), x, y + a.h + 8, { n: 1, color: C.dim });
    x += a.w + 30;
    if (x > SW - 200) { x = 40; y += a.h + 50; }
  }
  y += 160;
  x = 40;
  const bossImgs = [B.tidebreaker.walk[0], B.foundry.walk[0], B.reaper.walk[0], B.dreadnought.frames[0][0], B.warlord.phases[0][0]];
  for (const img of bossImgs) {
    const a = s.cell(silhouette(img, '#000000'), x, y, 1, { bg: '#e6ece9', pad: 6 });
    x += a.w + 26;
  }
  addSlide('silhouettes', s, 'Every enemy identifiable by silhouette alone.');
}

// ------------------------------------------------------------ pptx --------
const pptx = new pptxgen();
pptx.defineLayout({ name: 'RF1080', width: SW / 96, height: 1080 / 96 });
pptx.layout = 'RF1080';
pptx.title = 'Republic Frontline - Phase 2 Art Checkpoint';
for (const sl of slides) {
  const slide = pptx.addSlide();
  slide.background = { color: '0C1116' };
  slide.addImage({ path: join(OUT, sl.file), x: 0, y: 0, w: SW / 96, h: 1080 / 96 });
  slide.addNotes(sl.notes);
}
await pptx.writeFile({ fileName: join(ROOT, 'art-preview-2.pptx') });
console.log(`art-preview-2: ${slides.length} slides in ${Date.now() - t0} ms`);
