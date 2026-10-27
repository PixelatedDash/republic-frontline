// Headless bots. Each bot is a controller(sim) called every 15 ticks.
//   balanced     reads the wave preview, counters air/shields/armor, upgrades,
//                picks tier-4 branches, sets targeting modes, builds depots
//   spam-<type>  builds and upgrades only one tower type
//   no-upgrades  the balanced bot's placement, tier-1 towers only

import { TOWERS, nextTiers, towerDps } from '../../src/data/towers.js';
import { DAMAGE } from '../../src/data/rules.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { LEVELS } from '../../src/data/levels/index.js';
import { wavePreview, canPlace, build, upgrade, setTargeting, towerCenter } from '../../src/sim/sim.js';

const SAMPLE = 16;

// Path/lane sample points + per-tile coverage maps, cached per level.
const cache = new Map();
function levelCache(sim) {
  const key = sim.state.levelId;
  let c = cache.get(key);
  if (c) return c;
  const pts = (list) => {
    const out = [];
    for (const p of list)
      for (let d = 0; d < p.len; d += SAMPLE) {
        let i = 1;
        while (i < p.cum.length - 1 && p.cum[i] < d) i++;
        const a = p.pts[i - 1], b = p.pts[i], seg = p.cum[i] - p.cum[i - 1] || 1, t = (d - p.cum[i - 1]) / seg;
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    return out;
  };
  c = { samples: { ground: pts(sim.level.paths), air: pts(sim.level.lanes) }, cov: new Map() };
  cache.set(key, c);
  return c;
}

// Coverage map: number of path samples within [minRange, range] of each tile.
function coverageMap(sim, type, st, layer) {
  const c = levelCache(sim);
  const key = `${type}:${st.range}:${st.minRange || 0}:${layer}`;
  let m = c.cov.get(key);
  if (m) return m;
  const { w, h } = sim.level;
  m = new Int16Array(w * h);
  const r2 = st.range * st.range, m2 = (st.minRange || 0) ** 2;
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      const { x, y } = towerCenter(type, tx, ty);
      let n = 0;
      for (const [px, py] of c.samples[layer]) {
        const d2 = (px - x) ** 2 + (py - y) ** 2;
        if (d2 <= r2 && d2 >= m2) n++;
      }
      m[ty * w + tx] = n;
    }
  c.cov.set(key, m);
  return m;
}
const coverage = (sim, type, tx, ty, st, layer) => coverageMap(sim, type, st, layer)[ty * sim.level.w + tx];

const layerOf = (st) => (st.ground ? 'ground' : 'air');

function bestSpot(sim, type, layer) {
  const st = TOWERS[type].tiers.t1;
  if (type === 'depot') return depotSpot(sim);
  const m = coverageMap(sim, type, st, layer);
  const { w, h } = sim.level;
  let best = null;
  for (let ty = 0; ty < h; ty++)
    for (let tx = 0; tx < w; tx++) {
      const c = m[ty * w + tx];
      if (best && c <= best.c) continue;
      if (!canPlace(sim, type, tx, ty).ok) continue;
      best = { tx, ty, c };
    }
  return best && best.c > 0 ? best : null;
}

// Depots go where they block nothing: the buildable spot farthest from the path.
function depotSpot(sim) {
  const m = coverageMap(sim, 'rifle', { range: 160 }, 'ground');
  const { w, h } = sim.level;
  let best = null;
  for (let ty = 0; ty < h - 1; ty++)
    for (let tx = 0; tx < w - 1; tx++) {
      const c = -m[ty * w + tx];
      if (best && c <= best.c) continue;
      if (!canPlace(sim, 'depot', tx, ty).ok) continue;
      best = { tx, ty, c };
    }
  return best ? { ...best, c: 12 } : null;
}

// Expected damage efficiency of a damage type against the coming threats.
function typeEff(dtype, threat) {
  if (!dtype) return 0;
  const m = DAMAGE[dtype];
  return threat.shieldShare * m.shield + threat.armorShare * m.armored + (1 - threat.shieldShare - threat.armorShare) * m.unarmored;
}

function threatOf(sim) {
  // look two waves ahead so anti-air / anti-armor is ready in time
  const w = sim.state.waveIndex;
  const groups = [wavePreview(sim, w), wavePreview(sim, w + 1)].filter(Boolean).flatMap((p) => p.groups);
  if (!groups.length) { const pv = wavePreview(sim, w - 1); if (pv) groups.push(...pv.groups); }
  let tot = 0, air = 0, shield = 0, armor = 0, swarm = 0;
  for (const g of groups) {
    const d = ENEMIES[g.type];
    const hp = (d.hp + d.shield) * g.count;
    tot += hp;
    if (d.layer === 'air') air += hp;
    if (d.shield > 0) shield += d.shield * g.count;
    if (d.bubble) shield += d.bubble.v * g.count * 4;
    if (d.body === 'armored') armor += d.hp * g.count;
    if (g.count >= 15 || d.split) swarm += hp;
  }
  for (const e of sim.state.enemies) if (e.air) air += e.hp;
  tot = Math.max(1, tot);
  return { tot, airShare: Math.min(1, air / tot), shieldShare: Math.min(0.8, shield / tot), armorShare: Math.min(0.9, armor / tot), swarmShare: swarm / tot, air: air > 0 };
}

function layerDps(sim, layer) {
  let d = 0;
  for (const t of sim.state.towers) {
    const st = TOWERS[t.type].tiers[t.tier];
    if (layer === 'air' ? st.air : st.ground) d += towerDps(t.type, t.tier) * uptime(coverage(sim, t.type, t.tx, t.ty, st, layer));
  }
  return d;
}

// Longer stretches of covered path mean more time on target (diminishing).
const uptime = (c) => Math.min(1.8, Math.pow(c / 12, 0.6));

// Splash weapons hit several droids in a column; swarms make that count.
function splashTargets(st, threat) {
  if (st.pulse) return 1 + threat.swarmShare * 2;
  if (st.chain) return 1 + threat.swarmShare * 1.5 + 0.5;
  if (st.pierce) return 1.4 + threat.swarmShare;
  if (!st.splash) return 1;
  return 1 + (0.6 + threat.swarmShare * 2) * Math.min(1.5, st.splash / 32);
}

function chooseBranch(t, threat) {
  switch (t.type) {
    case 'rifle': return threat.airShare > 0.2 ? 't4a' : 't4b';
    case 'rocket': return threat.swarmShare > 0.25 ? 't4b' : 't4a';
    case 'flak': return 't4a';
    case 'repeater': return threat.armorShare > 0.4 ? 't4b' : 't4a';
    case 'artillery': return threat.swarmShare > 0.25 ? 't4b' : 't4a';
    case 'ion': return threat.shieldShare > 0.15 ? 't4a' : 't4b';
    case 'sharpshooter': return threat.armorShare > 0.3 ? 't4a' : 't4b';
    case 'depot': return 't4a';
    default: return 't4a';
  }
}

function wavesLeft(sim) {
  return sim.state.totalWaves - sim.state.waveIndex;
}

// How much more damage each layer still needs (diminishing as it is met).
function needs(sim, threat) {
  const boss = LEVELS[sim.state.levelId].boss;
  const late = boss && wavesLeft(sim) <= 5 ? 1.5 : 1;
  const bossAir = boss === 'dreadnought';
  return {
    ground: (1 - threat.airShare * 0.8) * (bossAir ? 1 : late) / (1 + layerDps(sim, 'ground') / 350),
    air: (threat.air ? Math.max(0.25, threat.airShare) * 3 : 0.15) * (bossAir ? late * 1.4 : 1) / (1 + layerDps(sim, 'air') / 120),
  };
}

// Value of `dps` worth of a tower tier placed at (tx, ty).
function worth(sim, type, st, dps, tx, ty, threat, need) {
  const eff = typeEff(TOWERS[type].dtype, threat) * splashTargets(st, threat) * (st.stun ? 1.15 : 1) * (st.slow ? 1.1 : 1);
  let v = 0;
  if (st.ground) v += dps * uptime(coverage(sim, type, tx, ty, st, 'ground')) * need.ground;
  if (st.air) v += dps * uptime(coverage(sim, type, tx, ty, st, 'air')) * need.air;
  return v * eff;
}

export function balancedBot({ upgrades = true } = {}) {
  return (sim) => {
    const s = sim.state;
    const threat = threatOf(sim);
    for (let guard = 0; guard < 4; guard++) {
      const options = [];
      const need = needs(sim, threat);
      const depots = s.towers.filter((t) => t.type === 'depot').length;
      // new towers
      for (const type of s.allowedTowers) {
        const st = TOWERS[type].tiers.t1;
        if (type === 'depot') {
          // income pays back over the remaining waves; only early, max 2
          if (!upgrades || depots >= 2 || wavesLeft(sim) < 8 || s.towers.length < 5) continue;
          const spot = depotSpot(sim);
          if (spot) options.push({ kind: 'build', type, spot, cost: st.cost, value: st.income * wavesLeft(sim) * 0.09 });
          continue;
        }
        const layer = layerOf(st);
        if (layer === 'air' && !threat.air && !s.towers.length) continue;
        const spot = bestSpot(sim, type, layer);
        if (!spot) continue;
        let value = worth(sim, type, st, towerDps(type, 't1'), spot.tx, spot.ty, threat, need);
        value /= 1 + 0.3 * s.towers.filter((t) => t.type === type).length; // prefer a mixed defense
        options.push({ kind: 'build', type, spot, cost: st.cost, value });
      }
      // upgrades
      if (upgrades)
        for (const t of s.towers) {
          const nexts = nextTiers(t.tier);
          if (!nexts.length) continue;
          const tier = nexts.length > 1 ? chooseBranch(t, threat) : nexts[0];
          const st = TOWERS[t.type].tiers[tier];
          if (t.type === 'depot') {
            const gain = (st.income || 0) - (TOWERS.depot.tiers[t.tier].income || 0);
            if (gain > 0 && wavesLeft(sim) >= 6) options.push({ kind: 'upgrade', id: t.id, tier, cost: st.cost, value: gain * wavesLeft(sim) * 0.08 });
            continue;
          }
          const value = worth(sim, t.type, st, towerDps(t.type, tier) - towerDps(t.type, t.tier), t.tx, t.ty, threat, need) * 1.1;
          options.push({ kind: 'upgrade', id: t.id, tier, cost: st.cost, value });
        }
      if (!options.length) return;
      options.sort((a, b) => b.value / b.cost - a.value / a.cost);
      const best = options[0];
      const pick = best.cost <= s.credits ? best : options.find((o) => o.cost <= s.credits && o.value / o.cost >= 0.6 * (best.value / best.cost));
      if (!pick) return;
      const r = pick.kind === 'build' ? build(sim, pick.type, pick.spot.tx, pick.spot.ty) : upgrade(sim, pick.id, pick.tier);
      if (!r.ok) return;
      if (pick.kind === 'build' && (pick.type === 'rocket' || pick.type === 'sharpshooter' || pick.type === 'artillery')) setTargeting(sim, r.id, threat.shieldShare > 0.1 || threat.armorShare > 0.3 ? 'strongest' : 'first');
    }
  };
}

export function spamBot(type) {
  return (sim) => {
    const s = sim.state;
    for (let guard = 0; guard < 4; guard++) {
      const st = TOWERS[type].tiers.t1;
      const spot = bestSpot(sim, type, layerOf(st));
      const up = s.towers.filter((t) => nextTiers(t.tier).length).sort((a, b) => a.spent - b.spent)[0];
      const upTier = up ? nextTiers(up.tier)[0] : null;
      const upCost = up ? TOWERS[type].tiers[upTier].cost : Infinity;
      if (spot && (s.towers.length < 4 || st.cost <= upCost) && s.credits >= st.cost) build(sim, type, spot.tx, spot.ty);
      else if (up && s.credits >= upCost) upgrade(sim, up.id, upTier);
      else return;
    }
  };
}

export function noUpgradeBot() {
  return balancedBot({ upgrades: false });
}

export function makeBot(name) {
  if (name === 'balanced') return balancedBot();
  if (name === 'no-upgrades') return noUpgradeBot();
  if (name.startsWith('spam-')) return spamBot(name.slice(5));
  throw new Error(`unknown bot ${name}`);
}

export { LEVELS };
