import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScale, MIN_VIEW_H } from '../src/engine/scaling.js';

// Phones, tablets and desktop windows at common device pixel ratios.
const SIZES = [[844, 390], [932, 430], [667, 375], [568, 320], [1180, 820], [1366, 1024], [1280, 720], [1920, 1080], [2560, 1440], [800, 600], [1024, 600], [390, 844]];
const DPRS = [1, 1.25, 1.5, 2, 2.625, 3];

test('integer UI / world / HI scales on every size and DPR; UI view keeps >= 260 rows', () => {
  for (const [w, h] of SIZES)
    for (const dpr of DPRS) {
      const sc = computeScale(w, h, dpr);
      const tag = `${w}x${h}@${dpr}`;
      for (const k of ['S', 'SW', 'HI']) assert.ok(Number.isInteger(sc[k]) && sc[k] >= 1, `${tag} ${k}=${sc[k]}`);
      assert.ok(Number.isInteger(sc.dw) && Number.isInteger(sc.dh), tag);
      assert.ok(sc.vw * sc.S <= sc.dw && sc.vh * sc.S <= sc.dh, `${tag} UI view fits the canvas`);
      if (sc.dh >= MIN_VIEW_H && sc.dw >= 320) assert.ok(sc.vh >= MIN_VIEW_H, `${tag} vh=${sc.vh}`);
      assert.ok(sc.tap * sc.S >= 44 * dpr - 1e-9, `${tag} tap targets >= 44 CSS px`);
      assert.ok(Number.isInteger(sc.ox) && Number.isInteger(sc.oy), tag);
    }
});
