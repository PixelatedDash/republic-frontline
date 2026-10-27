// Wave composer. Each level writes its waves by hand as short recipes
// ("trooper:3 rush:1" = mix by threat share, "@tidebreaker" = boss); the
// level's strength curve (b0, g) turns each recipe into droid counts and
// spawn gaps. Threat points ~ how much defense a droid soaks.

import { ENEMIES } from '../enemies.js';

export const COST = {
  trooper: 1, rush: 0.8, scuttler: 0.25, shield: 2.2, fighter: 1.2,
  commando: 2.2, tank: 11, shieldwalker: 8, carrier: 7, bomber: 6,
  crawler: 7, repair: 3, siege: 22, tactical: 6,
};
const GAP = {
  trooper: 1.0, rush: 0.7, scuttler: 0.25, shield: 2.2, fighter: 1.5,
  commando: 1.1, tank: 4, shieldwalker: 3.5, carrier: 3.5, bomber: 3,
  crawler: 3, repair: 2.5, siege: 6, tactical: 4,
};
const all = (n) => Array.from({ length: n }, (_, i) => i);

export function compose(recipes, { b0, g, pow = 1, paths = 1, lanes = 1 }) {
  return recipes.map((str, w) => {
    const B = b0 * Math.pow(1 + g * w, pow);
    const parts = str.trim().split(/\s+/).map((tok) => {
      const [t, sh = '1'] = tok.replace('@', '').split(':');
      return [t, Number(sh)];
    });
    const tot = parts.filter(([t]) => !ENEMIES[t].boss).reduce((a, [, s]) => a + s, 0) || 1;
    const groups = [];
    let delay = 0;
    for (const [type, sh] of parts) {
      if (!ENEMIES[type]) throw new Error(`unknown enemy ${type}`);
      if (ENEMIES[type].boss) {
        groups.push({ type, count: 1, gap: 1, delay, path: 0, lane: 0 });
        delay += 8;
        continue;
      }
      const count = Math.min(type === 'scuttler' ? 40 : 30, Math.max(1, Math.round((B * sh) / tot / COST[type])));
      const gap = +(GAP[type] * Math.min(1, Math.pow(8 / count, 0.35))).toFixed(2);
      const air = ENEMIES[type].layer === 'air';
      groups.push({ type, count, gap, delay, ...(air ? { lane: all(lanes) } : { path: all(paths) }) });
      delay += Math.min(9, count * gap * 0.45);
    }
    return { groups };
  });
}
