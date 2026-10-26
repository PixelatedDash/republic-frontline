// Headless bots. Each bot is a controller(sim) called every 15 ticks.
//   balanced     reads the wave preview, counters air/shields/armor, upgrades,
//                picks tier-4 branches, sets targeting modes
//   spam-<type>  builds and upgrades only one tower type
//   no-upgrades  builds only tier-1 towers

import { TOWERS, nextTiers, towerDps } from '../../src/data/towers.js';
import { DAMAGE } from '../../src/data/rules.js';
import { ENEMIES } from '../../src/data/enemies.js';
import { wavePreview, canPlace, build, upgrade, setTargeting, towerCenter } from '../../src/sim/sim.js';

const SAMPLE = 8;

// Path/lane sample points, cached per level.
const cache = new Map();
function samples(sim) {
  const key = sim.state.levelId;
  if (cache.has(key)) return cache.get(key);
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
  const v = { ground: pts(sim.level.paths), air: pts(sim.level.lanes) };
  cache.set(key, v);
  return v;
}

function coverage(sim, type, tx, ty, range, layer) {
  const { x, y } = towerCenter(type, tx, ty);
  let n = 0;
  for (const [px, py] of samples(sim)[layer]) if ((px - x) ** 2 + (py - y) ** 2 <= range * range) n++;
  return n;
}

function bestSpot(sim, type, layer) {
  const st = TOWERS[type].tiers.t1;
  let best = null;
  for (let ty = 0; ty < sim.level.h; ty++)
    for (let tx = 0; tx < sim.level.w; tx++) {
      if (!canPlace(sim, type, tx, ty).ok) continue;
      const c = coverage(sim, type, tx, ty, st.range, layer);
      if (!best || c > best.c) best = { tx, ty, c };
    }
  return best && best.c > 0 ? best : null;
}

// Expected damage efficiency of a damage type against the coming threats.
function typeEff(dtype, threat) {
  const m = DAMAGE[dtype];
  return threat.shieldShare * m.shield + threat.armorShare * m.armored + (1 - threat.shieldShare - threat.armorShare) * m.unarmored;
}

function threatOf(sim) {
  const pv = wavePreview(sim) || wavePreview(sim, sim.state.waveIndex - 1);
  let tot = 0, air = 0, shield = 0, armor = 0, swarm = 0;
  if (pv) for (const g of pv.groups) {
    const d = ENEMIES[g.type];
    const hp = (d.hp + d.shield) * g.count;
    tot += hp;
    if (d.layer === 'air') air += hp;
    if (d.shield > 0) shield += d.shield * g.count;
    if (d.body === 'armored') armor += d.hp * g.count;
    if (g.count >= 15) swarm += hp;
  }
  for (const e of sim.state.enemies) if (e.air) air += e.hp;
  tot = Math.max(1, tot);
  return { tot, airShare: air / tot, shieldShare: shield / tot, armorShare: armor / tot, swarmShare: swarm / tot, air: air > 0 };
}

function layerDps(sim, layer) {
  let d = 0;
  for (const t of sim.state.towers) {
    const st = TOWERS[t.type].tiers[t.tier];
    if (layer === 'air' ? st.air : st.ground) d += towerDps(t.type, t.tier) * Math.min(1, coverage(sim, t.type, t.tx, t.ty, st.range, layer) / 12);
  }
  return d;
}

// Splash weapons hit several droids in a column; swarms make that count.
function splashTargets(st, threat) {
  if (!st.splash) return 1;
  return 1 + (0.6 + threat.swarmShare * 2) * Math.min(1.5, st.splash / 16);
}

function chooseBranch(t, threat) {
  if (t.type === 'rifle') return threat.airShare > 0.2 ? 't4a' : 't4b';
  if (t.type === 'rocket') return threat.swarmShare > 0.25 ? 't4b' : 't4a';
  if (t.type === 'flak') return 't4a';
  return 't4a';
}

export function balancedBot() {
  return (sim) => {
    const s = sim.state;
    const threat = threatOf(sim);
    for (let guard = 0; guard < 4; guard++) {
      const options = [];
      // new towers
      for (const type of s.allowedTowers) {
        const st = TOWERS[type].tiers.t1;
        const layer = st.ground ? 'ground' : 'air';
        if (layer === 'air' && !threat.air && !s.towers.length) continue;
        const spot = bestSpot(sim, type, layer);
        if (!spot) continue;
        let value = towerDps(type, 't1') * Math.min(1, spot.c / 12) * typeEff(TOWERS[type].dtype, threat);
        if (layer === 'air') value *= threat.air ? 2.2 * (layerDps(sim, 'air') < 40 ? 2 : 0.6) : 0.15;
        else value *= 1 + (st.air ? threat.airShare : 0);
        value *= splashTargets(st, threat);
        value /= 1 + 0.25 * s.towers.filter((t) => t.type === type).length; // prefer a mixed defense
        options.push({ kind: 'build', type, spot, cost: st.cost, value });
      }
      // upgrades
      for (const t of s.towers) {
        const nexts = nextTiers(t.tier);
        if (!nexts.length) continue;
        const tier = nexts.length > 1 ? chooseBranch(t, threat) : nexts[0];
        const st = TOWERS[t.type].tiers[tier];
        const layer = st.ground ? 'ground' : 'air';
        const cov = coverage(sim, t.type, t.tx, t.ty, st.range, layer);
        let value = (towerDps(t.type, tier) - towerDps(t.type, t.tier)) * Math.min(1, cov / 12) * typeEff(TOWERS[t.type].dtype, threat);
        if (layer === 'air') value *= threat.air ? 2 : 0.3;
        value *= splashTargets(st, threat) * (1 + (st.range - TOWERS[t.type].tiers[t.tier].range) / 40);
        options.push({ kind: 'upgrade', id: t.id, tier, cost: st.cost, value });
      }
      if (!options.length) return;
      options.sort((a, b) => b.value / b.cost - a.value / a.cost);
      const best = options[0];
      let pick = best.cost <= s.credits ? best : options.find((o) => o.cost <= s.credits && o.value / o.cost >= 0.75 * (best.value / best.cost));
      if (!pick) return;
      const r = pick.kind === 'build' ? build(sim, pick.type, pick.spot.tx, pick.spot.ty) : upgrade(sim, pick.id, pick.tier);
      if (!r.ok) return;
      if (pick.kind === 'build' && pick.type === 'rocket') setTargeting(sim, r.id, threat.shieldShare > 0.1 ? 'strongest' : 'first');
    }
  };
}

export function spamBot(type) {
  return (sim) => {
    const s = sim.state;
    for (let guard = 0; guard < 4; guard++) {
      const st = TOWERS[type].tiers.t1;
      const spot = bestSpot(sim, type, st.ground ? 'ground' : 'air');
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
  return (sim) => {
    const s = sim.state;
    const threat = threatOf(sim);
    for (let guard = 0; guard < 4; guard++) {
      const type = threat.air && !s.towers.some((t) => t.type === 'flak') && s.allowedTowers.includes('flak') ? 'flak' : s.towers.length % 3 === 2 && s.allowedTowers.includes('rocket') ? 'rocket' : 'rifle';
      const st = TOWERS[type].tiers.t1;
      const spot = bestSpot(sim, type, st.ground ? 'ground' : 'air');
      if (!spot || s.credits < st.cost) return;
      build(sim, type, spot.tx, spot.ty);
    }
  };
}

export function makeBot(name) {
  if (name === 'balanced') return balancedBot();
  if (name === 'no-upgrades') return noUpgradeBot();
  if (name.startsWith('spam-')) return spamBot(name.slice(5));
  throw new Error(`unknown bot ${name}`);
}
