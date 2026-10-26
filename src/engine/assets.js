// Uploads every Bitmap from buildArt() into the atlas once at load time and
// returns sprite refs with the metadata the renderer needs. Also pre-renders
// each level's ground layer (4 water frames) to canvases.

import { silhouette, toCanvas, fromMap } from '../art/bitmap.js';
import { MUZZLE_SMALL } from '../art/sprites/troopers.js';
import { renderGround } from '../art/tilemap.js';
import { icon, ICONS, logoText } from '../art/ui.js';
import { shadowBlob } from '../art/vfx.js';
import { DIRS8 } from '../art/towers.js';

export function buildAssets(art, atlas) {
  const A = (b) => atlas.add(b);
  const all = (arr) => arr.map(A);
  const towers = { rifle: {}, rocket: {}, flak: {} };
  for (const [tier, r] of Object.entries(art.towers.rifle)) {
    const troopers = {};
    for (const d of DIRS8) {
      const mk = (t) => ({ ref: A(t.bm), mx: t.mx, my: t.my });
      troopers[d] = { idle: mk(r.troopers[d].idle), fire: mk(r.troopers[d].fire) };
    }
    towers.rifle[tier] = { back: A(r.back), front: A(r.front), troopers, slots: r.slots, w: r.w, h: r.h };
  }
  for (const kind of ['rocket', 'flak'])
    for (const [tier, t] of Object.entries(art.towers[kind]))
      towers[kind][tier] = { base: A(t.base), heads: all(t.frames), shadows: all(t.shadows), mount: t.mount, muzzles: t.muzzles, frame: t.frame, w: t.w, h: t.h, flash: t.flash };

  const enemies = {};
  for (const [k, e] of Object.entries(art.enemies)) {
    if (k === 'fighter') {
      enemies[k] = {
        frames: e.frames.map(all), shadows: all(e.shadows),
        flash: all(e.frames[0].map((f) => silhouette(f, '#ffffff'))),
        death: all(e.death), size: e.size,
      };
      continue;
    }
    const flash = (arr) => all(arr.map((f) => silhouette(f, '#ffffff')));
    enemies[k] = {
      w: e.w, h: e.h,
      walk: all(e.walk), walkW: all(e.walkW), walkF: flash(e.walk), walkWF: flash(e.walkW),
      death: all(e.death), deathW: all(e.deathW),
    };
    if (e.roll) Object.assign(enemies[k], {
      roll: all(e.roll), rollW: all(e.rollW), rollF: flash(e.roll), rollWF: flash(e.rollW),
      deploy: all(e.deploy), deployW: all(e.deployW),
    });
  }

  const vfx = {};
  for (const [k, v] of Object.entries(art.vfx)) vfx[k] = Array.isArray(v) ? all(v) : A(v);

  const props = {};
  for (const [k, v] of Object.entries(art.tiles.kamino.props)) props[k] = { ref: A(v), w: v.w, h: v.h };

  const icons = {};
  for (const n of Object.keys(ICONS)) icons[n] = A(icon(n));

  const shadows = {};
  for (let w = 4; w <= 34; w += 2) shadows[w] = A(shadowBlob(w, w > 16 ? 5 : 3, 80));

  const x = art.extras;
  return {
    towers, enemies, vfx, props, icons, shadows,
    flashSmall: A(fromMap(MUZZLE_SMALL)),
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

export function shadowFor(assets, w) {
  const k = Math.max(4, Math.min(34, (Math.round(w / 2) * 2)));
  return assets.shadows[k];
}

export function buildGroundLayers(level, tiles, createCanvas) {
  return [0, 1, 2, 3].map((f) => toCanvas(renderGround(level.grid, tiles, f), createCanvas));
}
