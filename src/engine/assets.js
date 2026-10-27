// Uploads every Bitmap from buildArt() into the atlas once at load time and
// returns sprite refs with the metadata the renderer needs. Also pre-renders
// each level's ground layer (4 water frames) to canvases.

import { silhouette, toCanvas, fromMap, bounds, crop, mirrorX, nightRim } from '../art/bitmap.js';
import { composeRifle, composeTurret } from '../art/towers.js';
import { MUZZLE_SMALL, MUZZLE_SMALL_B } from '../art/sprites/troopers.js';
import { renderGround, renderLand } from '../art/tilemap.js';
import { icon, ICONS, logoText } from '../art/ui.js';
import { shadowBlob } from '../art/vfx.js';
import { DIRS8 } from '../art/towers.js';

export function buildAssets(art, atlas) {
  const A = (b) => atlas.add(b);
  const all = (arr) => arr.map(A);
  const towers = {};
  for (const [kind, set] of Object.entries(art.towers)) {
    towers[kind] = {};
    for (const [tier, t] of Object.entries(set)) towers[kind][tier] = towerAsset(A, all, kind, t);
  }
  const enemies = {};
  for (const [k, e] of Object.entries(art.enemies)) enemies[k] = enemyAsset(A, all, e);

  const vfx = {};
  for (const [k, v] of Object.entries(art.vfx)) if (k !== 'weather') vfx[k] = Array.isArray(v) ? all(v) : A(v);

  const props = {};
  for (const [k, v] of Object.entries(art.tiles.kamino.props)) props[k] = { ref: A(v), w: v.w, h: v.h };
  const weather = {};
  for (const [k, v] of Object.entries(art.vfx.weather || {})) weather[k] = Array.isArray(v) ? all(v) : A(v);

  const icons = {};
  // icons are 2x detail: drawn through the renderer's HI layer in the UI
  for (const n of Object.keys(ICONS)) icons[n] = Object.assign(A(icon(n)), { hi: 2 });

  const shadows = {};
  for (let w = 6; w <= 68; w += 2) shadows[w] = A(shadowBlob(w, w > 40 ? 10 : w > 20 ? 7 : 5, 80));

  const x = art.extras;
  return {
    towers, enemies, vfx, props, icons, shadows, weather,
    flashSmall: A(fromMap(MUZZLE_SMALL)),
    flashSmallB: A(fromMap(MUZZLE_SMALL_B)),
    proj: { rocket: all(x.rocket), missile: all(x.missile), shell: A(x.shell) },
    portrait: A(x.portrait), hologram: A(x.hologram),
    hologramSize: { w: x.hologram.w, h: x.hologram.h },
    flyby: all(x.flyby), flybyShadow: all(x.flyby.map((f) => silhouette(f, '#000000', 60))),
    emblem: A(art.emblems.republic), emblemSep: A(art.emblems.separatist),
    emblemSize: { w: art.emblems.republic.w, h: art.emblems.republic.h },
    logo: [A(logoText('REPUBLIC', 2)), A(logoText('FRONTLINE', 2, ['#a8f4ff', '#7cf0ff', '#38b8e0', '#1d6f95']))],
    logoSize: [logoText('REPUBLIC', 2), logoText('FRONTLINE', 2)].map((b) => ({ w: b.w, h: b.h })),
  };
}

// Squad-style towers (troopers between back/front layers), turrets with
// RotSprite heads (+ spin frames), static ion emitters, depots.
function towerAsset(A, all, kind, t) {
  if (t.troopers) {
    const troopers = {};
    for (const d of DIRS8) {
      const mk = (x) => ({ ref: A(x.bm), mx: x.mx, my: x.my });
      troopers[d] = { idle: mk(t.troopers[d].idle), breathe: mk(t.troopers[d].breathe), fire: mk(t.troopers[d].fire) };
    }
    return { squad: true, back: A(t.back), front: A(t.front), troopers, slots: t.slots, w: t.w, h: t.h };
  }
  if (t.frames && kind === 'depot') return { depot: true, frames: all(t.frames), w: t.w, h: t.h };
  if (t.static) return { static: true, pulse: all(t.pulse), emit: t.emit, w: t.w, h: t.h, flash: t.flash };
  return { base: A(t.base), heads: all(t.frames), spin: t.spin ? t.spin.map(all) : null, shadows: all(t.shadows), mount: t.mount, muzzles: t.muzzles, frame: t.frame, w: t.w, h: t.h, flash: t.flash };
}

// Walkers / vehicles (side view, mirrored for west) or air units (rotated).
function enemyAsset(A, all, e) {
  const flash = (arr) => all(arr.map((f) => silhouette(f, '#ffffff')));
  if (e.frames) return { air: true, frames: e.frames.map(all), shadows: all(e.shadows), flash: all(e.frames[0].map((f) => silhouette(f, '#ffffff'))), death: all(e.death), size: e.size };
  const out = { w: e.w, h: e.h, walk: all(e.walk), walkW: all(e.walkW), walkF: flash(e.walk), walkWF: flash(e.walkW), death: all(e.death), deathW: all(e.deathW) };
  if (e.roll) Object.assign(out, { roll: all(e.roll), rollW: all(e.rollW), rollF: flash(e.roll), rollWF: flash(e.rollW), deploy: all(e.deploy), deployW: all(e.deployW) });
  return out;
}

// Night outline variant (Umbara) for every droid frame, uploaded on demand.
export function nightEnemyAssets(art, atlas) {
  const A = (b) => atlas.add(nightRim(b));
  const all = (arr) => arr.map(A);
  const out = {};
  for (const [k, e] of Object.entries(art.enemies)) {
    if (e.frames) out[k] = { air: true, frames: e.frames.map(all), shadows: e.shadows.map((f) => atlas.add(f)), flash: e.frames[0].map((f) => atlas.add(silhouette(f, '#ffffff'))), death: all(e.death), size: e.size };
    else {
      const flash = (arr) => arr.map((f) => atlas.add(silhouette(f, '#ffffff')));
      out[k] = { w: e.w, h: e.h, walk: all(e.walk), walkW: all(e.walkW), walkF: flash(e.walk), walkWF: flash(e.walkW), death: all(e.death), deathW: all(e.deathW) };
      if (e.roll) Object.assign(out[k], { roll: all(e.roll), rollW: all(e.rollW), rollF: flash(e.roll), rollWF: flash(e.rollW), deploy: all(e.deploy), deployW: all(e.deployW) });
    }
  }
  return out;
}

// Per-planet assets: land props + the boss (with west-facing mirrors).
export function planetAssets(planetArt, atlas, night = false) {
  const tx = night ? (b) => nightRim(b) : (b) => b;
  const A = (b) => atlas.add(b);
  const all = (arr) => arr.map(A);
  const both = (arr) => ({ e: all(arr.map(tx)), w: all(arr.map((f) => tx(mirrorX(f)))) });
  const props = {};
  if (planetArt.tiles) for (const [k, v] of Object.entries(planetArt.tiles.props)) props[k] = { ref: A(v), w: v.w, h: v.h };
  const { type, art: b } = planetArt.boss;
  let boss;
  if (type === 'dreadnought') {
    boss = { air: true, frames: b.frames.map((set) => all(set.map(tx))), shadows: all(b.shadows), flash: all(b.frames[0].map((f) => silhouette(f, '#ffffff'))), death: all(b.death), size: b.size };
  } else if (type === 'foundry') {
    const W = b.w;
    boss = {
      w: b.w, h: b.h, body: both(b.body), door: both(b.door), vent: both(b.vent), ventBroken: both([b.ventBroken]),
      doorAt: b.doorAt, ventAt: b.ventAt, partW: { door: b.door[0].w, vent: b.vent[0].w },
      mirrorX: (x, pw) => W - x - pw, death: both(b.death),
      flash: both(b.walk.map((f) => silhouette(f, '#ffffff'))),
    };
  } else {
    const sets = type === 'tidebreaker' ? { walk: b.walk, deploy: b.deploy, emerge: b.emerge } : type === 'reaper' ? { walk: b.walk, armored: b.armored } : { p1: b.phases[0], p2: b.phases[1], p3: b.phases[2] };
    boss = { w: b.w, h: b.h, death: both(b.death), flash: both(b.walk.map((f) => silhouette(f, '#ffffff'))) };
    for (const [k, v] of Object.entries(sets)) boss[k] = both(v);
  }
  boss.type = type;
  return { props, boss };
}

export function shadowFor(assets, w) {
  const k = Math.max(6, Math.min(68, (Math.round(w / 2) * 2)));
  return assets.shadows[k];
}

// Pre-rendered ground layers: one per hazard animation frame (Kamino sea or
// the land planet's chasm / ravine / swamp / lava).
export function buildGroundLayers(level, tiles, createCanvas, land = false) {
  const n = land ? tiles.hazard.length : tiles.water.length;
  return Array.from({ length: n }, (_, f) => toCanvas(land ? renderLand(level.grid, tiles, f) : renderGround(level.grid, tiles, f), createCanvas));
}

// Build-bar icon: the tier-1 tower, cropped to fit a slot (2x detail).
export function towerIcon(art, type) {
  const t = art.towers[type].t1;
  const bm = t.troopers ? composeRifle(t, 'S') : type === 'depot' ? t.frames[0] : composeTurret(t, 6);
  const b = bounds(bm);
  const w = Math.min(52, b.w), h = Math.min(40, b.h);
  // tall structures show their most characteristic part
  const y = type === 'sharpshooter' ? b.y + 4 : type === 'depot' ? b.y + ((b.h - h) >> 1) - 4 : b.y + b.h - h;
  return crop(bm, b.x + ((b.w - w) >> 1), y, w, h);
}
