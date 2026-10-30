// Save document: versioned schema, migrations and the conflict-free merge
// used for phone <-> desktop sync. Pure functions (unit-tested).
//
// {
//   saveVersion, updatedAt (ms),
//   levels:   { [levelId]: { stars, heroic, bestLives, wins, master } },
//   tech:     { [nodeId]: true } (stars spent in the tech tree),
//   unlocks:  { [key]: true },
//   achievements: { [id]: unlockedAtMs },
//   stats:    { kills: {type: n}, playSeconds, creditsEarned, wins, losses },
//   settings: { master, music, sfx, muted, reduceEffects, damageNumbers, showGrid, debug },
//   inProgress: null | { levelId, difficulty, heroic, updatedAt, snapshot }
// }

export const SAVE_VERSION = 3;

export const DEFAULT_SETTINGS = {
  master: 0.8, music: 0.6, sfx: 0.8, muted: false,
  reduceEffects: false, damageNumbers: false, showGrid: true, debug: false,
};

export function emptySave(now = 0) {
  return {
    saveVersion: SAVE_VERSION,
    updatedAt: now,
    levels: {},
    tech: {},
    unlocks: {},
    achievements: {},
    stats: { kills: {}, playSeconds: 0, creditsEarned: 0, wins: 0, losses: 0 },
    settings: { ...DEFAULT_SETTINGS },
    inProgress: null,
  };
}

// Each migration takes a doc at version N and returns version N+1.
export const MIGRATIONS = {
  // v0 (pre-release prototype): { stars: {levelId: n}, kills: n }
  0: (d) => {
    const out = emptySave(d.updatedAt || 0);
    out.saveVersion = 1;
    for (const [id, n] of Object.entries(d.stars || {})) out.levels[id] = { stars: n, heroic: false, bestLives: 0, wins: n > 0 ? 1 : 0 };
    out.stats.kills = typeof d.kills === 'number' ? { trooper: d.kills } : {};
    delete out.settings;
    return out;
  },
  // v1 -> v2: settings block added, inProgress gained `heroic`.
  1: (d) => {
    const out = { ...d, saveVersion: 2, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
    if (out.inProgress) out.inProgress = { heroic: false, ...out.inProgress };
    return out;
  },
  // v2 -> v3: tech tree (Phase 3); levels gained `master` (won on Jedi Master).
  2: (d) => {
    const levels = {};
    for (const [id, lv] of Object.entries(d.levels || {})) levels[id] = { master: false, ...lv };
    return { ...d, saveVersion: 3, tech: { ...(d.tech || {}) }, levels };
  },
};

export function migrate(doc) {
  if (!doc || typeof doc !== 'object') return emptySave();
  let d = doc;
  let v = d.saveVersion ?? 0;
  if (v > SAVE_VERSION) throw new Error(`save version ${v} is newer than this build (${SAVE_VERSION})`);
  while (v < SAVE_VERSION) {
    d = MIGRATIONS[v](d);
    v = d.saveVersion;
  }
  return fillDefaults(d);
}

function fillDefaults(d) {
  const e = emptySave(d.updatedAt || 0);
  return {
    ...e,
    ...d,
    tech: { ...(d.tech || {}) },
    stats: { ...e.stats, ...(d.stats || {}), kills: { ...(d.stats?.kills || {}) } },
    settings: { ...e.settings, ...(d.settings || {}) },
  };
}

const maxNum = (a, b) => Math.max(a || 0, b || 0);

function mergeKeyed(a = {}, b = {}, fn) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = k in a && k in b ? fn(a[k], b[k]) : structuredClone(a[k] ?? b[k]);
  return out;
}

// Merge two saves without ever losing progress: max per field for progress
// and cumulative stats; the newer in-progress snapshot wins; settings and
// the tech tree (stars spent, refundable) follow the newer document, so a
// merge can never spend more stars than were earned.
export function mergeSaves(x, y) {
  const a = migrate(x), b = migrate(y);
  const newer = (b.updatedAt || 0) > (a.updatedAt || 0) ? b : a;
  const ipA = a.inProgress, ipB = b.inProgress;
  let inProgress = null;
  if (ipA && ipB) inProgress = structuredClone((ipB.updatedAt || 0) > (ipA.updatedAt || 0) ? ipB : ipA);
  else inProgress = structuredClone(ipA || ipB || null);
  return {
    saveVersion: SAVE_VERSION,
    updatedAt: maxNum(a.updatedAt, b.updatedAt),
    levels: mergeKeyed(a.levels, b.levels, (p, q) => ({
      stars: maxNum(p.stars, q.stars),
      heroic: !!(p.heroic || q.heroic),
      bestLives: maxNum(p.bestLives, q.bestLives),
      wins: maxNum(p.wins, q.wins),
      master: !!(p.master || q.master),
    })),
    tech: { ...newer.tech },
    unlocks: mergeKeyed(a.unlocks, b.unlocks, (p, q) => p || q),
    achievements: mergeKeyed(a.achievements, b.achievements, (p, q) => Math.min(p, q) || p || q),
    stats: {
      kills: mergeKeyed(a.stats.kills, b.stats.kills, maxNum),
      playSeconds: maxNum(a.stats.playSeconds, b.stats.playSeconds),
      creditsEarned: maxNum(a.stats.creditsEarned, b.stats.creditsEarned),
      wins: maxNum(a.stats.wins, b.stats.wins),
      losses: maxNum(a.stats.losses, b.stats.losses),
    },
    settings: { ...newer.settings },
    inProgress,
  };
}

export function starsFor(won, lives, maxLives, leaked) {
  if (!won) return 0;
  if (leaked === 0) return 3;
  if (lives >= maxLives * 0.5) return 2;
  return 1;
}
