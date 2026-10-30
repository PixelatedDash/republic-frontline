// Medal icons (spec §12): one per achievement. A hand-placed ribbon and
// disc (rim colors by category) plus a hand-placed 7x7 glyph unique to each
// medal. Locked medals are drawn in gray. Shown at 2x detail via hd().

import { fromMap } from './bitmap.js';
import { hd } from './rotsprite.js';

const RIBBON = [
  '...kkkkkkkkk...',
  '...kaabbbcck...',
  '...kaabbbcck...',
  '...kaabbbcck...',
  '....kabbbck....',
];
const DISC = [
  '.....kkkkk.....',
  '...kk11111kk...',
  '..k11fffff22k..',
  '.k1fffffffff2k.',
  '.k1fffffffff2k.',
  'k1fffffffffff2k',
  'k1fffffffffff2k',
  'k1fffffffffff2k',
  'k1fffffffffff3k',
  'k2fffffffffff3k',
  '.k2fffffffff3k.',
  '.k2fffffffff3k.',
  '..k22fffff33k..',
  '...kk33333kk...',
  '.....kkkkk.....',
];
const GLYPH_X = 4, GLYPH_Y = RIBBON.length + 4;

// Glyph keys: g = engraved dark, h = engraved highlight.
export const MEDAL_GLYPHS = {
  first: ['...g...', '..gg...', '.g.g...', '...g...', '...g...', '...g...', '.ggggg.'],
  kamino: ['.......', '.gg....', 'g..g..g', '....gg.', '.gg....', 'g..g..g', '....gg.'],
  geonosis: ['.g.g.g.', '.ggggg.', 'gg...gg', '.g.h.g.', 'gg...gg', '.ggggg.', '.g.g.g.'],
  kashyyyk: ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', '...g...', '..ggg..'],
  umbara: ['...g...', 'g..g..g', '.ghhhg.', 'ghhhhhg', 'ggggggg', '.......', '.g.g.g.'],
  mustafar: ['g.....g', '.g...g.', '..g.g..', '...g...', '..g.g..', '.g...g.', 'gg...gg'],
  flawless: ['ggggggg', 'g....hg', 'g...h.g', 'gh.h..g', '.gh..g.', '..g.g..', '...g...'],
  'umbara-clean': ['..ggg..', '.gg....', 'gg.....', 'gg.....', 'gg.....', '.gg....', '..ggg..'],
  'planet-perfect': ['.......', '..ggg..', '.ghhhg.', 'ggggggg', '.ghhhg.', '..ggg..', '.......'],
  'campaign-3': ['...h...', '..hgh..', '...g...', '.......', '.h...h.', 'hgh.hgh', '.g...g.'],
  master: ['.......', 'g..g..g', 'gg.g.gg', 'ggggggg', 'ghghghg', 'ggggggg', '.......'],
  'master-bosses': ['.ggggg.', 'g.....g', 'g.h.h.g', 'g.....g', '.g.g.g.', '..ggg..', '.......'],
  heroic: ['g.....g', 'g.....g', 'gg...gg', '.g.h.g.', '.gg.gg.', '..ggg..', '...g...'],
  'heroic-5': ['g.....g', '.......', '...g...', '..ghg..', '...g...', '.......', 'g.....g'],
  'heroic-all': ['...g...', 'g.ggg.g', 'ggghggg', '.ghhhg.', 'gg.g.gg', 'g..g..g', '...g...'],
  'three-towers': ['h..h..h', 'g..g..g', 'g..g..g', 'g..g..g', 'g..g..g', 'ggggggg', '.......'],
  'no-sell': ['..g....', '..gggg.', '..ghhhg', '..gggg.', '..g....', '..g....', '.ggg...'],
  eager: ['.......', 'g...g..', 'gg..gg.', 'ghg.ghg', 'gg..gg.', 'g...g..', '.......'],
  depots: ['ggggggg', 'gh.g.hg', 'g.hgh.g', 'ggghggg', 'g.hgh.g', 'gh.g.hg', 'ggggggg'],
  specialist: ['.......', 'g.g...g', 'g.g...g', 'g..g.g.', 'g..g.g.', 'g...g..', '.......'],
  vents: ['.ggggg.', 'g.....g', 'ggggggg', 'g..h..g', 'ggggggg', 'g.....g', '.ggggg.'],
  'kills-1k': ['..g.g..', '.ggggg.', 'gg.h.gg', '.g.h.g.', 'gg...gg', '.ggggg.', '..g.g..'],
  'kills-10k': ['..ggg..', '..ghg..', 'ggg.ggg', 'ghg.ghg', 'ggggggg', 'ghghghg', 'ggggggg'],
  'stars-40': ['...g...', '..hgg..', 'hhhgggg', '.hhggg.', '..hgg..', '.hh.gg.', 'h.....g'],
  'stars-80': ['h..g..h', '..ggg..', 'ggggggg', '.ggggg.', '..ggg..', '.gg.gg.', 'g.....g'],
  'tech-first': ['g.g....', 'ggg....', '.ggg...', '..ggg..', '...ggg.', '....ggg', '.....gg'],
  'tech-all': ['.g.g.g.', 'ggggggg', '.ghhhg.', 'ggh.hgg', '.ghhhg.', 'ggggggg', '.g.g.g.'],
  archivist: ['gg...gg', 'ghg.ghg', 'ghhghhg', 'ghhghhg', 'ghhghhg', 'ggggggg', '...g...'],
  veteran: ['ggggggg', '.ghhhg.', '..ghg..', '...g...', '..g.g..', '.ghhhg.', 'ggggggg'],
};

// Category colors: ribbon stripes (a b c) and rim ramp (1 2 3) + face (f).
const GOLD = { 1: '#ffe9a0', 2: '#c8a75a', 3: '#8f7438', f: '#e0c06a', g: '#6b5326', h: '#fff6d0' };
const SILVER = { 1: '#f4f6f1', 2: '#a6aeb0', 3: '#6b7378', f: '#c9cec9', g: '#3e464c', h: '#ffffff' };
const BRONZE = { 1: '#f0c08a', 2: '#b07a4a', 3: '#7a4f2e', f: '#c98f5a', g: '#4f3020', h: '#ffe0b8' };
const CATEGORY = {
  campaign: { rim: GOLD, a: '#1f9bff', b: '#eef0ea', c: '#1f9bff' },
  mastery: { rim: SILVER, a: '#c8443a', b: '#ffd27a', c: '#c8443a' },
  heroic: { rim: GOLD, a: '#6d2fd0', b: '#e2a6ff', c: '#6d2fd0' },
  combat: { rim: BRONZE, a: '#4fae4a', b: '#2b2e34', c: '#4fae4a' },
  meta: { rim: SILVER, a: '#38b8e0', b: '#7cf0ff', c: '#38b8e0' },
};
export const MEDAL_CATEGORY = {
  first: 'campaign', kamino: 'campaign', geonosis: 'campaign', kashyyyk: 'campaign', umbara: 'campaign', mustafar: 'campaign',
  flawless: 'mastery', 'umbara-clean': 'mastery', 'planet-perfect': 'mastery', 'campaign-3': 'mastery', master: 'mastery', 'master-bosses': 'mastery',
  heroic: 'heroic', 'heroic-5': 'heroic', 'heroic-all': 'heroic',
  'three-towers': 'combat', 'no-sell': 'combat', eager: 'combat', depots: 'combat', specialist: 'combat', vents: 'combat', 'kills-1k': 'combat', 'kills-10k': 'combat',
  'stars-40': 'meta', 'stars-80': 'meta', 'tech-first': 'meta', 'tech-all': 'meta', archivist: 'meta', veteran: 'meta',
};
const LOCKED = { rim: { 1: '#7d8d90', 2: '#4f5d63', 3: '#33404a', f: '#4f5d63', g: '#222c35', h: '#7d8d90' }, a: '#33404a', b: '#4f5d63', c: '#33404a' };

export function medalMap(id) {
  const glyph = MEDAL_GLYPHS[id];
  const rows = [...RIBBON, ...DISC].map((r) => r.split(''));
  glyph.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') rows[GLYPH_Y + y][GLYPH_X + x] = ch; }));
  return rows.map((r) => r.join(''));
}

export function medal(id, earned = true) {
  const c = earned ? CATEGORY[MEDAL_CATEGORY[id]] : LOCKED;
  const legend = { ...c.rim, a: c.a, b: c.b, c: c.c };
  return hd(fromMap(medalMap(id), legend));
}
