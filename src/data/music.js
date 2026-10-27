// Original synth-orchestral chiptune, written as data for the sequencer in
// src/engine/audio.js. Steps are 16th notes. Layers: base (always on),
// mid (fades in when a wave is big), high (big waves / climaxes).

const NOTE = { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 };
export function noteHz(n) {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  return 440 * 2 ** ((NOTE[m[1]] + (Number(m[2]) - 4) * 12) / 12);
}

const CH = {
  Dm: ['D3', 'F3', 'A3'], Bb: ['Bb2', 'D3', 'F3'], Gm: ['G2', 'Bb2', 'D3'], A: ['A2', 'C#3', 'E3'],
  F: ['F2', 'A2', 'C3'], C: ['C3', 'E3', 'G3'], Em: ['E3', 'G3', 'B3'], D: ['D3', 'F#3', 'A3'],
  B: ['B2', 'D#3', 'F#3'], Am: ['A2', 'C3', 'E3'], G: ['G2', 'B2', 'D3'], Cm: ['C3', 'Eb3', 'G3'],
  Ab: ['Ab2', 'C3', 'Eb3'], Fm: ['F2', 'Ab2', 'C3'], E: ['E2', 'G#2', 'B2'],
};
const up = (n, oct = 1) => n.replace(/\d$/, (d) => String(Number(d) + oct));

function pad(chords) {
  const s = [];
  for (const c of chords) { s.push({ n: CH[c], len: 16 }); for (let i = 1; i < 16; i++) s.push(null); }
  return s;
}
function bass(chords, pattern = 'x.......x.......', oct = -1) {
  const s = [];
  for (const c of chords) for (let i = 0; i < 16; i++) s.push(pattern[i] === 'x' ? { n: up(CH[c][0], oct), len: 2 } : pattern[i] === 'o' ? { n: CH[c][2].replace(/\d$/, (d) => String(Number(d) + oct)), len: 2 } : null);
  return s;
}
function arp(chords, order = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 2, 1, 3]) {
  const s = [];
  for (const c of chords) {
    const tones = [...CH[c].map((n) => up(n)), up(CH[c][0], 2)];
    for (let i = 0; i < 16; i++) s.push({ n: tones[order[i]] });
  }
  return s;
}
function drum(pattern, bars, v = 1) {
  const s = [];
  for (let b = 0; b < bars; b++) for (let i = 0; i < 16; i++) s.push(pattern[i] === 'x' ? { v } : pattern[i] === 'o' ? { v: v * 0.5 } : null);
  return s;
}
function timp(chords, every = 2) {
  const s = [];
  chords.forEach((c, b) => { for (let i = 0; i < 16; i++) s.push(i === 0 && b % every === 0 ? { n: up(CH[c][0], -1) } : i === 12 && b % every === every - 1 ? { n: up(CH[c][0], -1) } : null); });
  return s;
}
// Melody tokens are 8th notes: note name, '.' = hold, '-' = rest.
function melody(str) {
  const tok = str.trim().split(/\s+/).filter((t) => t !== '|');
  const s = [];
  for (let i = 0; i < tok.length; i++) {
    const t = tok[i];
    if (t === '.' || t === '-') { s.push(null, null); continue; }
    let len = 2;
    for (let j = i + 1; j < tok.length && tok[j] === '.'; j++) len += 2;
    s.push({ n: t, len }, null);
  }
  return s;
}

const KAMINO = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'F', 'C', 'A'];
const MENU = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'];
const BOSS = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B'];
const GALAXY = ['Am', 'F', 'C', 'G'];
const GEONOSIS = ['Em', 'F', 'Em', 'D', 'Em', 'F', 'G', 'E'];
const KASHYYYK = ['Am', 'Em', 'F', 'C', 'Am', 'G', 'F', 'Em'];
const UMBARA = ['Cm', 'Ab', 'Fm', 'G', 'Cm', 'Ab', 'Fm', 'G'];
const MUSTAFAR = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Gm', 'Bb', 'A'];

export const TRACKS = {
  kamino: {
    bpm: 78,
    channels: [
      { inst: 'strings', layer: 'base', steps: pad(KAMINO) },
      { inst: 'bass', layer: 'base', steps: bass(KAMINO, 'x.......x...o...') },
      { inst: 'arp', layer: 'mid', steps: arp(KAMINO) },
      { inst: 'timpani', layer: 'mid', steps: timp(KAMINO) },
      { inst: 'snare', layer: 'high', steps: drum('x..ox.o.x..oxoxo', 8, 0.9) },
      { inst: 'brass', layer: 'high', steps: melody(`
        D4 . . F4 E4 . D4 . | F4 . G4 . A4 . . . | Bb4 . A4 . G4 . F4 . | E4 . . . A3 . . . |
        D4 . . F4 E4 . D4 . | C4 . D4 . F4 . . . | E4 . G4 . C5 . Bb4 . | A4 . . . . . - - `) },
    ],
  },
  menu: {
    bpm: 96,
    channels: [
      { inst: 'strings', layer: 'base', steps: pad(MENU) },
      { inst: 'bass', layer: 'base', steps: bass(MENU, 'x...x...x...x.o.') },
      { inst: 'brass', layer: 'base', steps: melody(`
        F4 . . C5 . . A4 . | G4 . . E4 . C4 . . | D4 . F4 . A4 . . D5 | C5 . Bb4 . A4 . G4 . |
        F4 . . C5 . . A4 . | G4 . . C5 . . E5 . | D5 . . Bb4 . . G4 . | A4 . . . G4 . . . `) },
      { inst: 'snare', layer: 'base', steps: drum('x.o.x.o.x.oox.o.', 8, 0.7) },
      { inst: 'timpani', layer: 'base', steps: timp(MENU, 4) },
      { inst: 'arp', layer: 'mid', steps: arp(MENU, [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3]) },
    ],
  },
  boss: {
    bpm: 132,
    channels: [
      { inst: 'bass', layer: 'base', steps: bass(BOSS, 'x.x.x.x.x.x.x.ox') },
      { inst: 'strings', layer: 'base', steps: pad(BOSS) },
      { inst: 'snare', layer: 'base', steps: drum('....x.......x.oo', 8, 1) },
      { inst: 'timpani', layer: 'base', steps: timp(BOSS, 1) },
      { inst: 'arp', layer: 'mid', steps: arp(BOSS, [0, 3, 2, 3, 1, 3, 2, 3, 0, 3, 2, 3, 1, 3, 2, 3]) },
      { inst: 'brass', layer: 'mid', steps: melody(`
        E4 . . . G4 . F#4 . | E4 . . . B3 . . . | C4 . . . E4 . G4 . | F#4 . . . D4 . . . |
        E4 . . . G4 . B4 . | A4 . G4 . F#4 . E4 . | C5 . . . B4 . A4 . | B4 . . . - - - - `) },
      { inst: 'hat', layer: 'high', steps: drum('x.x.x.x.x.x.x.x.', 8) },
    ],
  },
  galaxy: {
    bpm: 70,
    channels: [
      { inst: 'strings', layer: 'base', steps: pad(GALAXY) },
      { inst: 'arp', layer: 'base', steps: arp(GALAXY, [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3]) },
      { inst: 'bass', layer: 'base', steps: bass(GALAXY, 'x...............') },
    ],
  },
  // Geonosis: dry, driving march in E (flat second), dusty brass.
  geonosis: {
    bpm: 100,
    channels: [
      { inst: 'bass', layer: 'base', steps: bass(GEONOSIS, 'x..x..x.x..x..x.') },
      { inst: 'strings', layer: 'base', steps: pad(GEONOSIS) },
      { inst: 'snare', layer: 'mid', steps: drum('x...x.o.x...x.oo', 8, 0.8) },
      { inst: 'timpani', layer: 'mid', steps: timp(GEONOSIS, 2) },
      { inst: 'brass', layer: 'high', steps: melody(`
        E4 . F4 . E4 . . B3 | C4 . . . B3 . . . | E4 . G4 . F4 . E4 . | D4 . . . - - - - |
        E4 . F4 . G4 . . A4 | B4 . A4 . G4 . F4 . | G4 . . . F4 . E4 . | E4 . . . - - - - `) },
      { inst: 'arp', layer: 'high', steps: arp(GEONOSIS, [0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 3]) },
    ],
  },
  // Kashyyyk: slow, wooded and wary; plucked arps under long string pads.
  kashyyyk: {
    bpm: 84,
    channels: [
      { inst: 'strings', layer: 'base', steps: pad(KASHYYYK) },
      { inst: 'arp', layer: 'base', steps: arp(KASHYYYK, [0, 2, 1, 2, 3, 2, 1, 2, 0, 2, 1, 2, 3, 2, 1, 2]) },
      { inst: 'bass', layer: 'mid', steps: bass(KASHYYYK, 'x.......x.o.....') },
      { inst: 'timpani', layer: 'mid', steps: timp(KASHYYYK, 4) },
      { inst: 'brass', layer: 'high', steps: melody(`
        A4 . . . E4 . . . | G4 . . . B4 . . . | C5 . . . A4 . . . | G4 . . . E4 . . . |
        A4 . . . C5 . B4 . | A4 . . . G4 . . . | F4 . A4 . C5 . . . | B4 . . . - - - - `) },
      { inst: 'snare', layer: 'high', steps: drum('x.......x...o...', 8, 0.6) },
    ],
  },
  // Umbara: near-silent night, low pulse, a lone high line.
  umbara: {
    bpm: 72,
    channels: [
      { inst: 'strings', layer: 'base', steps: pad(UMBARA) },
      { inst: 'bass', layer: 'base', steps: bass(UMBARA, 'x...........x...') },
      { inst: 'arp', layer: 'mid', steps: arp(UMBARA, [0, 3, 1, 3, 2, 3, 1, 3, 0, 3, 1, 3, 2, 3, 1, 3]) },
      { inst: 'hat', layer: 'mid', steps: drum('..x...x...x...x.', 8, 0.5) },
      { inst: 'brass', layer: 'high', steps: melody(`
        C5 . . . . . Bb4 . | Ab4 . . . G4 . . . | F4 . . . Ab4 . C5 . | B4 . . . - - - - |
        C5 . . . Eb5 . D5 . | C5 . . . Ab4 . . . | F4 . G4 . Ab4 . F4 . | G4 . . . - - - - `) },
      { inst: 'timpani', layer: 'high', steps: timp(UMBARA, 2) },
    ],
  },
  // Mustafar: the finale; heavy timpani and full brass over a churning bass.
  mustafar: {
    bpm: 112,
    channels: [
      { inst: 'bass', layer: 'base', steps: bass(MUSTAFAR, 'x.x...x.x.x...xo') },
      { inst: 'strings', layer: 'base', steps: pad(MUSTAFAR) },
      { inst: 'timpani', layer: 'base', steps: timp(MUSTAFAR, 1) },
      { inst: 'snare', layer: 'mid', steps: drum('x..ox..ox..oxoxo', 8, 0.9) },
      { inst: 'arp', layer: 'mid', steps: arp(MUSTAFAR) },
      { inst: 'brass', layer: 'high', steps: melody(`
        D4 . . . A4 . . . | F4 . G4 . A4 . . . | Bb4 . . . A4 . G4 . | A4 . . . - - - - |
        D5 . . . C5 . Bb4 . | A4 . . . G4 . F4 . | G4 . Bb4 . A4 . G4 . | A4 . . . . . - - `) },
    ],
  },
};
