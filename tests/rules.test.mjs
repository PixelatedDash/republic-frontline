import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';

const unit = (o = {}) => ({ hp: 100, maxHp: 100, shield: 0, maxShield: 0, shieldActive: true, shieldDelay: 0, body: 'unarmored', ...o });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('damage table: blaster vs unarmored / armored', () => {
  const a = unit(); R.applyDamage(a, 10, 'blaster'); close(a.hp, 90);
  const b = unit({ body: 'armored' }); R.applyDamage(b, 10, 'blaster'); close(b.hp, 95);
  const c = unit({ body: 'armored' }); R.applyDamage(c, 10, 'explosive'); close(c.hp, 85);
  const d = unit({ body: 'armored' }); R.applyDamage(d, 10, 'piercing'); close(d.hp, 82.5);
  const e = unit(); R.applyDamage(e, 10, 'ion'); close(e.hp, 92.5);
});

test('shield absorbs first using the shield column', () => {
  const a = unit({ shield: 40, maxShield: 40 });
  R.applyDamage(a, 10, 'ion'); // 25 into shield
  close(a.shield, 15);
  close(a.hp, 100);
});

test('shield overflow carries raw damage into the body column', () => {
  // blaster: 30 raw -> 15 vs shield 10. Pool breaks after 20 raw; 10 raw left x1.0 body.
  const a = unit({ shield: 10, maxShield: 10 });
  const out = R.applyDamage(a, 30, 'blaster');
  close(a.shield, 0);
  close(a.hp, 90);
  assert.equal(out.shieldHit, true);
  assert.equal(out.shieldBroke, true);
  // armored body: overflow uses the armored column
  const b = unit({ shield: 10, maxShield: 10, body: 'armored' });
  R.applyDamage(b, 30, 'explosive'); // 10/0.75 = 13.33 raw used, 16.67 left x1.5
  close(b.hp, 100 - (30 - 10 / 0.75) * 1.5);
});

test('inactive shield (rolling Shield Droid) is bypassed', () => {
  const a = unit({ shield: 40, maxShield: 40, shieldActive: false });
  R.applyDamage(a, 10, 'blaster');
  close(a.shield, 40);
  close(a.hp, 90);
});

test('shields recharge only after 3 s without damage', () => {
  const a = unit({ shield: 0, maxShield: 40 });
  R.applyDamage(a, 1, 'blaster');
  for (let i = 0; i < 170; i++) R.tickShield(a, 1 / 60, 10);
  close(a.shield, 0);
  for (let i = 0; i < 20; i++) R.tickShield(a, 1 / 60, 10); // ~10 ticks finish the delay, ~10 regen
  assert.ok(a.shield > 0 && a.shield < 2, String(a.shield));
});

test('stun: repeats within 4 s halve, then 4 s immunity', () => {
  const s = R.newStunState();
  close(R.applyStun(s, 2), 2);
  close(R.applyStun(s, 2), 1);
  close(R.applyStun(s, 2), 0.5);
  assert.ok(s.immune > 0);
  assert.equal(R.applyStun(s, 2), 0, 'immune');
  for (let i = 0; i < 4 * 60 + 1; i++) R.tickStun(s, 1 / 60);
  close(R.applyStun(s, 2), 2);
});

test('stun: window expiry resets the chain; bosses take 25%', () => {
  const s = R.newStunState();
  R.applyStun(s, 2);
  for (let i = 0; i < 4 * 60 + 1; i++) R.tickStun(s, 1 / 60);
  close(R.applyStun(s, 2), 2);
  const b = R.newStunState();
  close(R.applyStun(b, 2, true), 0.5);
});

test('same-kind effects do not stack: strongest wins, slow capped at 50%', () => {
  const s = R.newSlot();
  R.applySlot(s, 0.3, 2);
  R.applySlot(s, 0.2, 5);
  close(s.v, 0.3);
  close(s.t, 2);
  R.applySlot(s, 0.3, 4);
  close(s.t, 4);
  R.applySlot(s, 0.7, 1);
  close(s.v, 0.7);
  close(R.slowFactor(s), 0.5);
  for (let i = 0; i < 61; i++) R.tickSlot(s, 1 / 60);
  close(R.slowFactor(s), 1);
});

test('auras: strongest source in range only', () => {
  const src = [{ x: 0, y: 0, r: 10, v: 0.2 }, { x: 5, y: 0, r: 10, v: 0.15 }, { x: 100, y: 0, r: 10, v: 0.9 }];
  close(R.strongestAura(src, 3, 0), 0.2);
  close(R.strongestAura(src, 50, 0), 0);
});

test('interest: 5% of banked credits, capped per planet', () => {
  assert.equal(R.interest(400, 'kamino'), 20);
  assert.equal(R.interest(5000, 'kamino'), 60);
  assert.equal(R.interest(5000, 'mustafar'), 80);
});

test('early call bonus: proportional to time left, multiplier floor 30%', () => {
  close(R.earlyCallMult(0, 12), 1);
  close(R.earlyCallMult(11, 12), 0.3);
  assert.ok(R.earlyCallMult(6, 12) > 0.3);
  assert.equal(R.earlyCallBonus(18, 18, 0, 12), 30);
  assert.equal(R.earlyCallBonus(9, 18, 0, 12), 15);
  assert.equal(R.earlyCallBonus(18, 18, 11, 12), 9);
  assert.equal(R.earlyCallBonus(0, 18, 0, 12), 0);
});

test('sell refunds: 100% before first shot, 70% after; depots by wave', () => {
  assert.equal(R.sellValue({ type: 'rifle', spent: 190, fired: false }), 190);
  assert.equal(R.sellValue({ type: 'rifle', spent: 190, fired: true }), 133);
  assert.equal(R.sellValue({ type: 'depot', spent: 200, placedWavesEnded: 3 }, 3), 200);
  assert.equal(R.sellValue({ type: 'depot', spent: 200, placedWavesEnded: 3 }, 4), 140);
});

test('depot limit: max 3 per map', () => {
  const d = { type: 'depot' };
  assert.equal(R.canBuildDepot([d, d]), true);
  assert.equal(R.canBuildDepot([d, d, d]), false);
});
