// Boss builders: assemble the hand-placed 1x parts from sprites/bosses.js
// into animation frames, then upscale to 2x detail with hd(). Phase
// changes are overlays (bay doors, armor shells, glowing cracks), weak
// points are separate sprites with positions so the game can draw their
// intact / destroyed state independently.

import { Bitmap, blit, fromMap, mirrorX, recolor, silhouette, rgba, shift } from './bitmap.js';
import { hd, rotations } from './rotsprite.js';
import { LEGEND, KAMINO } from './palettes.js';
import * as B from './sprites/bosses.js';

export const BOSS_INFO = {
  tidebreaker: { name: 'Tidebreaker', planet: 'Kamino', role: 'Amphibious assault walker · rises from the sea · phase 2 deploys troop droids' },
  foundry: { name: 'Foundry Colossus', planet: 'Geonosis', role: 'Crawling droid factory · spawns units · 3 exhaust vents are weak points' },
  reaper: { name: 'Timber Reaper', planet: 'Kashyyyk', role: 'Saw-armed harvester tank · phase 2 raises an armor shell' },
  dreadnought: { name: 'Night Dreadnought', planet: 'Umbara', role: 'Air gunship · drops bombers · knocks out tower lights' },
  warlord: { name: 'The Warlord Engine', planet: 'Mustafar', role: 'Super-walker · phase 1 armor, phase 2 shields, phase 3 enrage' },
};

const FAR = { g: 'h', G: 'h', H: 'H', h: 'H' };
const farMap = (rows) => rows.map((r) => r.replace(/[gGhH]/g, (c) => FAR[c]));

function rot(str, n) {
  n %= str.length;
  return str.slice(str.length - n) + str.slice(0, str.length - n);
}
const rollTread = (tread, f) => tread.map((r, i) => (i < 2 ? r[0] + rot(r.slice(1, -1), f) + r[r.length - 1] : r));

// Darkened, scorched copy used for burning / wreck frames.
const SCORCH = (() => {
  const m = {};
  const pairs = [['a', 'e'], ['A', 'E'], ['e', 'E'], ['E', 'H'], ['g', 'h'], ['G', 'H'], ['h', 'H'], ['W', 'v'], ['w', 'u'], ['R', 'q'], ['Q', 'q'], ['p', 'P'], ['V', 'X'], ['U', 'X'], ['m', 'n'], ['M', 'N'], ['n', 'N']];
  for (const [f, t] of pairs) m[LEGEND[f]] = LEGEND[t];
  return m;
})();
const scorch = (bm) => recolor(bm, SCORCH);

// Fire flecks laid over wrecks (hand-placed 1x tufts, upscaled).
const FLAME_TUFT = ['.F.', 'FfF', 'kfk'];
function burning(bm2x, points) {
  const out = scorch(bm2x);
  const tuft = hd(fromMap(FLAME_TUFT), false);
  for (const [x, y] of points) blit(out, tuft, x, y);
  return out;
}

function deathFrames(frame, points) {
  return [silhouette(frame, '#ffffff'), burning(frame, points), shift(scorch(scorch(frame)), 0, 4)];
}

// ---------------------------------------------------------------- Tidebreaker
export function buildTidebreaker() {
  const T = B.TIDE;
  const TY = 6; // headroom for the sensor tower
  const shell = new Bitmap(fromMap(T.shell).w + 2, fromMap(T.shell).h + TY);
  blit(shell, fromMap(T.tower), T.towerAt[0], T.towerAt[1] + TY);
  blit(shell, fromMap(T.shell), 0, TY);
  blit(shell, fromMap(T.ram), T.ramAt[0], T.ramAt[1] + TY);
  const shellOpen = shell.clone();
  blit(shellOpen, fromMap(T.bay), T.bayAt[0], T.bayAt[1] + TY);
  const near = T.legs.map((m) => fromMap(m));
  const far = T.legs.map((m) => fromMap(farMap(m)));
  const legH = near[0].h;
  const W = shell.w + 2, H = shell.h + legH - 4;
  const frame = (sh, i) => {
    const bm = new Bitmap(W, H + 1);
    const top = shell.h - 5;
    T.legX.forEach((x, j) => blit(bm, far[(i + j + 1) % 2], x + 7, top + 1));
    const bob = i % 2;
    blit(bm, sh, 0, bob);
    T.legX.forEach((x, j) => blit(bm, near[(i + j) % 2], x, top + 1 + (((i + j) % 2) ? 0 : 0)));
    return hd(bm);
  };
  const walk = [0, 1, 2, 3].map((i) => frame(shell, i));
  const deploy = [0, 1, 2, 3].map((i) => frame(shellOpen, i));
  // Rising out of the sea: reveal from the top down, foam at the waterline.
  const foam = [rgba(KAMINO[9]), rgba(KAMINO[0])];
  const emerge = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => {
    const src = walk[0];
    const line = Math.round((src.h * k) / 8);
    const bm = new Bitmap(src.w, src.h);
    for (let y = 0; y < line; y++) for (let x = 0; x < src.w; x++) bm.d[y * src.w + x] = src.d[y * src.w + x];
    for (let x = 0; x < src.w; x++) {
      const solid = src.get(x, Math.min(src.h - 1, line)) >>> 24 || src.get(x, Math.max(0, line - 1)) >>> 24;
      if (!solid || line >= src.h) continue;
      if ((x + k) % 3 !== 0) bm.set(x, line - 1, foam[(x >> 1) % 2]);
      if ((x + k) % 5 === 0 && line > 1) bm.set(x, line - 2, foam[1]);
    }
    return bm;
  });
  const death = deathFrames(walk[0], [[30, 4], [62, 10], [90, 6], [46, 20]]);
  return { w: walk[0].w, h: walk[0].h, walk, deploy, emerge, death };
}

// ----------------------------------------------------------- Foundry Colossus
export function buildFoundry() {
  const F = B.FOUNDRY;
  const hull = new Bitmap(fromMap(F.hull).w + 7, fromMap(F.hull).h);
  blit(hull, fromMap(F.hull));
  blit(hull, fromMap(F.jaw), F.jawAt[0], F.jawAt[1]);
  const tread = (f) => fromMap(rollTread(F.tread, f));
  const VY = 9; // vent stacks rise above the hull
  const W = hull.w, H = VY + hull.h + F.tread.length - 2;
  const body = [0, 1, 2, 3].map((f) => {
    const bm = new Bitmap(W, H);
    blit(bm, hull, 0, VY + (f % 2));
    blit(bm, tread(f), 0, H - F.tread.length);
    return hd(bm);
  });
  const door = F.door.map((m) => hd(fromMap(m)));
  const vent = F.vent.map((m) => hd(fromMap(m)));
  const ventBroken = hd(fromMap(F.ventBroken));
  // part positions in 2x frame coordinates
  const doorAt = [F.doorAt[0] * 2, (F.doorAt[1] + VY) * 2];
  const ventAt = F.ventX.map((x) => [x * 2, 0]);
  const compose = (f, { doorState = 0, broken = [] } = {}) => {
    const bm = body[f].clone();
    blit(bm, door[doorState], doorAt[0], doorAt[1] + (f % 2) * 2);
    ventAt.forEach(([x, y], i) => blit(bm, broken.includes(i) ? ventBroken : vent[f % 2], x, y + (f % 2) * 2 + 2));
    return bm;
  };
  const walk = [0, 1, 2, 3].map((f) => compose(f));
  const death = deathFrames(compose(0, { broken: [0, 1, 2] }), [[20, 30], [60, 26], [96, 30], [40, 40]]);
  return { w: W * 2, h: H * 2, body, door, vent, ventBroken, doorAt, ventAt, walk, compose, death };
}

// -------------------------------------------------------------- Timber Reaper
export function buildReaper() {
  const R = B.REAPER;
  const TOP = 12; // headroom for the raised saw arm
  const base = fromMap(R.hull);
  const W = 72, H = TOP + base.h + R.tread.length - 2;
  const saws = R.saw.map((m) => fromMap(m));
  const frame = (f, armored) => {
    const bm = new Bitmap(W, H);
    const bob = f % 2;
    blit(bm, fromMap(R.armUp), R.armUpAt[0], R.armUpAt[1] + TOP + bob);
    blit(bm, base, 0, TOP + bob);
    if (armored) blit(bm, fromMap(R.shell), R.shellAt[0], R.shellAt[1] + TOP + bob);
    blit(bm, fromMap(R.armLow), R.armLowAt[0], R.armLowAt[1] + TOP + bob);
    blit(bm, saws[f % 2], R.sawUpAt[0], R.sawUpAt[1] + TOP + bob);
    blit(bm, saws[(f + 1) % 2], R.sawLowAt[0], R.sawLowAt[1] + TOP + bob);
    blit(bm, fromMap(rollTread(R.tread, f)), 0, H - R.tread.length);
    return hd(bm);
  };
  const walk = [0, 1, 2, 3].map((f) => frame(f, false));
  const armored = [0, 1, 2, 3].map((f) => frame(f, true));
  const death = deathFrames(walk[0], [[24, 26], [60, 30], [100, 20], [80, 40]]);
  return { w: W * 2, h: H * 2, walk, armored, death };
}

// ---------------------------------------------------------- Night Dreadnought
export const DREAD_DIRS = 32;
export function buildDreadnought(dirs = DREAD_DIRS) {
  const top = B.DREAD_TOP;
  const shade = { g: 'G', G: 'h', h: 'H', H: 'H' };
  const bottom = top.slice(0, -1).reverse().map((r) => r.replace(/[gGhH]/g, (c) => shade[c]));
  const rows = [...top, ...bottom];
  const hull1 = fromMap(rows);
  const cy = top.length - 1;
  const engines = [1, 4, 11].flatMap((y) => [y, 2 * cy - y]);
  const fly = B.DREAD_FLAMES.map((fl) => {
    const bm = new Bitmap(hull1.w + 4, hull1.h);
    blit(bm, hull1, 4, 0);
    for (const y of engines) blit(bm, fromMap(fl), 4 - fromMap(fl).w + 1, y < cy ? y : y - 1);
    return hd(bm);
  });
  const px = fly[0].w * 0.45, py = cy * 2 + 1;
  const size = 132;
  const frames = fly.map((f) => rotations(f, dirs, px, py, size, 4));
  const shadows = frames[0].map((f) => silhouette(f, '#000000', 80));
  const death = [silhouette(frames[0][0], '#ffffff'), burning(frames[0][0], [[40, 50], [70, 60], [90, 74]]), scorch(scorch(frames[0][2]))];
  return { frames, shadows, death, size, dirs };
}

// --------------------------------------------------------- The Warlord Engine
export function buildWarlord() {
  const Wd = B.WARLORD;
  const TOP = 4;
  const hull = fromMap(Wd.hull);
  const near = Wd.legs.map((m) => fromMap(m));
  const far = Wd.legs.map((m) => fromMap(farMap(m)));
  const cyc = (set) => [set[0], set[1], mirrorX(set[0]), set[1]];
  const N = cyc(near), Fa = cyc(far);
  const W = hull.w + 2, H = TOP + Wd.legAt[0][1] + near[0].h;
  const overlay = (bm, phase, dy) => {
    const at = (m, x, y) => blit(bm, fromMap(m), x, y + TOP + dy);
    if (phase === 1) for (const [x, y] of Wd.sockets) at(Wd.plate, x, y);
    if (phase === 2) {
      for (const [x, y] of Wd.sockets) at(Wd.core, x + 2, y + 2);
      for (const [x, y] of Wd.finAt) at(Wd.fin, x, y);
    }
    if (phase === 3) {
      for (const [x, y] of Wd.sockets) at(Wd.coreDead, x + 2, y + 2);
      at(Wd.cracks, Wd.cracksAt[0], Wd.cracksAt[1]);
      at(Wd.eyeRage, Wd.eyeAt[0], Wd.eyeAt[1]);
      at(Wd.stackFlame, Wd.stackFlameAt[0], Wd.stackFlameAt[1]);
    }
  };
  const frame = (i, phase) => {
    const bm = new Bitmap(W, H);
    const bob = i % 2;
    blit(bm, Fa[(i + 2) % 4], Wd.legAt[0][0], Wd.legAt[0][1] + TOP);
    blit(bm, hull, 0, TOP + bob);
    overlay(bm, phase, bob);
    blit(bm, N[i], Wd.legAt[1][0], Wd.legAt[1][1] + TOP);
    return hd(bm);
  };
  const phases = [1, 2, 3].map((p) => [0, 1, 2, 3].map((i) => frame(i, p)));
  const death = deathFrames(phases[2][0], [[30, 30], [70, 24], [100, 40], [50, 60]]);
  return { w: W * 2, h: H * 2, phases, walk: phases[0], death };
}
