// All palettes as named arrays (light → dark unless noted).
// Rule: environments are muted/desaturated. Only energy (lasers, eyes, ion,
// fire cores) uses fully saturated colors.

// ---- Faction / material ramps ---------------------------------------------
export const OUTLINE = ['#101217'];
export const CLONE_ARMOR = ['#eef0ea', '#c9cec9', '#969ea0', '#5f676c'];
export const UNDERSUIT = ['#3a4048', '#23272d'];
export const VISOR = ['#6f98a6', '#1c2830'];
export const GUNMETAL = ['#b4babb', '#858d90', '#5b6367', '#383e43'];
export const SANDBAG = ['#c2b088', '#9a875f', '#6c5d41', '#463c2b'];
export const CANVAS = ['#9a9b78', '#727458', '#4e503d'];
export const PAINT_RED = ['#a65a43', '#7a3f30'];
export const PAINT_GOLD = ['#c8a75a', '#8f7438'];
export const DROID_TAN = ['#d2c095', '#a6936a', '#75674a', '#4b4231'];
export const DROID_STEEL = ['#9aa0a8', '#6c727b', '#484d55', '#2b2e34'];

// Unit stripe ramps (palette-swapped onto the 's','S','Z' keys).
export const STRIPES = {
  rifle: ['#7f9fc2', '#56759a', '#3a5170'],      // slate blue
  rocket: ['#9aa66a', '#6f7a48', '#4c5532'],     // field olive
  flak: ['#b07a6a', '#875548', '#5f3a31'],       // brick
  elite: ['#d0b060', '#9c7f3c', '#6a5527'],      // dull gold
  marksman: ['#8a9a8a', '#617061', '#434e43'],   // sage
  repeater: ['#6fa39c', '#4b7a74', '#33544f'],   // teal
  artillery: ['#a8875e', '#7c6243', '#55432e'],  // umber
  ion: ['#8088c0', '#5a6196', '#3d426a'],        // indigo
  sharpshooter: ['#a07e9c', '#755b72', '#4f3d4d'], // plum
  depot: ['#b8a35e', '#8a7944', '#5d512e'],      // mustard
  breaker: ['#b08a7a', '#85645a', '#5c443d'],    // dusty rose
};

// ---- Energy (the only fully saturated colors) -----------------------------
export const REPUBLIC_BOLT = ['#ffffff', '#c8f8ff', '#5ce6ff', '#1f9bff', '#0b4fd6'];
export const SEPARATIST_BOLT = ['#ffffff', '#ffe0c0', '#ff8a3a', '#ff3b24', '#b0120c'];
export const ION = ['#ffffff', '#e4f6ff', '#9fd8ff', '#5aa8ff', '#3b5cff'];
export const DROID_EYE = ['#ffd2c4', '#ff4433', '#b8241b'];
export const FIRE = ['#ffffff', '#fff2b0', '#ffc24a', '#ff8a2a', '#e8481c', '#9c2414', '#4a1a12'];
export const SMOKE = ['#9a9a96', '#77787a', '#56585c', '#3c3e43', '#2a2c30'];
export const SCORCH = ['#2b2a28', '#1d1c1b', '#121211'];
export const SPARK = ['#ffffff', '#ffe9a0', '#ffb347'];
// Droid shields are violet so they never read as Republic (blue) energy.
export const SHIELD = ['#fbe8ff', '#e2a6ff', '#b45cff', '#6d2fd0'];

// ---- Faction palettes (deck swatches + UI) ---------------------------------
export const REPUBLIC = ['#eef0ea', '#c9cec9', '#7f9fc2', '#56759a', '#3a5170', '#5ce6ff', '#1f9bff'];
export const SEPARATIST = ['#d2c095', '#a6936a', '#6c727b', '#2b2e34', '#7a3f30', '#ff8a3a', '#ff3b24'];

// ---- Planet mood palettes (muted) ------------------------------------------
export const KAMINO = ['#d9dedb', '#b4bdbb', '#8e9a99', '#69777a', '#4c5a5f', '#34434a', '#25333b', '#1a252c', '#7e9ea1', '#a9c3c2'];
export const GEONOSIS = ['#d8b48a', '#c08f63', '#a06c48', '#7f5136', '#5f3b28', '#43291d', '#2d1c15', '#c9a27a'];
export const KASHYYYK = ['#a7ad84', '#7f8c5e', '#5e6e45', '#465334', '#8a6a48', '#644a32', '#43311f', '#2a2016'];
export const UMBARA = ['#3f3a55', '#2e2a42', '#211e31', '#151322', '#0c0b15', '#3be3d7', '#a46cff', '#6a4bb0'];
export const MUSTAFAR = ['#5a5352', '#433d3d', '#2f2a2b', '#1f1b1c', '#131011', '#ff6a1f', '#ffb347', '#a52a12'];

export const PLANET_PALETTES = { KAMINO, GEONOSIS, KASHYYYK, UMBARA, MUSTAFAR };

// UI chrome (Republic command terminal: muted steel + cyan readouts).
export const UI = ['#e6ece9', '#b8c4c3', '#7d8d90', '#4f5d63', '#33404a', '#222c35', '#151c23', '#0c1116'];
export const UI_ACCENT = ['#7cf0ff', '#38b8e0', '#1d6f95'];
export const UI_GOOD = ['#9ef08a', '#4fae4a'];
export const UI_BAD = ['#ff8a7a', '#c8443a'];
export const UI_WARN = ['#ffd27a', '#c99a3a'];

// ---- Default legend: one character per color -------------------------------
// Sprites are hand-placed pixel maps of these keys. '.' (or space) is clear.
export const LEGEND = {
  k: OUTLINE[0],
  W: CLONE_ARMOR[0], w: CLONE_ARMOR[1], v: CLONE_ARMOR[2], u: CLONE_ARMOR[3],
  b: UNDERSUIT[0], B: UNDERSUIT[1],
  T: VISOR[0], t: VISOR[1],
  s: STRIPES.rifle[0], S: STRIPES.rifle[1], Z: STRIPES.rifle[2],
  m: GUNMETAL[0], M: GUNMETAL[1], n: GUNMETAL[2], N: GUNMETAL[3],
  y: SANDBAG[0], Y: SANDBAG[1], o: SANDBAG[2], O: SANDBAG[3],
  l: CANVAS[0], L: CANVAS[1], j: CANVAS[2],
  p: PAINT_RED[0], P: PAINT_RED[1],
  d: PAINT_GOLD[0], D: PAINT_GOLD[1],
  a: DROID_TAN[0], A: DROID_TAN[1], e: DROID_TAN[2], E: DROID_TAN[3],
  g: DROID_STEEL[0], G: DROID_STEEL[1], h: DROID_STEEL[2], H: DROID_STEEL[3],
  Q: DROID_EYE[0], R: DROID_EYE[1], q: DROID_EYE[2],
  C: REPUBLIC_BOLT[1], c: REPUBLIC_BOLT[2], x: REPUBLIC_BOLT[3],
  F: FIRE[2], f: FIRE[3],
  V: SHIELD[1], U: SHIELD[2], X: SHIELD[3],
  i: ION[2], I: ION[3], J: ION[4],
  '#': '#ffffff',
};

// Kamino tile legend (digits so they never collide with the default keys).
export const KAMINO_LEGEND = {
  1: KAMINO[0], 2: KAMINO[1], 3: KAMINO[2], 4: KAMINO[3], 5: KAMINO[4],
  6: KAMINO[5], 7: KAMINO[6], 8: KAMINO[7], 9: KAMINO[8], 0: KAMINO[9],
};

export function stripeLegend(name) {
  const r = STRIPES[name];
  return { s: r[0], S: r[1], Z: r[2] };
}
