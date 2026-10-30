// App icon (approved in the Phase 0 deck): navy field, dithered glow, the
// Republic emblem. `maskable` drops the bevel so the icon can bleed to the
// edge (the emblem stays inside the 80% safe circle).

import { Bitmap, blit, blitAdd, fill, scale } from './bitmap.js';

export function appIcon(art, size = 96, maskable = false) {
  const bm = new Bitmap(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      let c = '#1c2a36';
      if (!maskable) {
        if (edge === 0) c = '#101217';
        else if (edge <= 2) c = x < y ? '#4f5d63' : (size - 1 - x < size - 1 - y ? '#151c23' : '#7d8d90');
        else if (edge < 7) c = '#33404a';
      }
      if (c === '#1c2a36' && (x + y) % 2 === 0 && Math.hypot(x - size / 2, y - size / 2) < size * 0.34) c = '#22344a';
      fill(bm, x, y, 1, 1, c);
    }
  const g = art.vfx.glowRep;
  const gk = Math.max(1, Math.round(size / 32));
  blitAdd(bm, scale(g, gk), (size - g.w * gk) >> 1, (size - g.h * gk) >> 1);
  const em = art.emblems.republic;
  blit(bm, em, (size - em.w) >> 1, ((size - em.h) >> 1) + 2);
  return bm;
}
