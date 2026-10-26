// Seeded PRNG for all gameplay randomness (sfc32). The state is four uint32s
// stored as a plain array so it serializes with the sim snapshot.
// Visual-only randomness (particles, shake) must use a separate instance.

export function seedState(seed) {
  // splitmix32 to spread a small integer seed over 128 bits
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  const st = [next(), next(), next(), next()];
  for (let i = 0; i < 12; i++) nextU32(st);
  return st;
}

export function nextU32(st) {
  let [a, b, c, d] = st;
  const t = (((a + b) >>> 0) + d) >>> 0;
  d = (d + 1) >>> 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) >>> 0;
  c = ((c << 21) | (c >>> 11)) >>> 0;
  c = (c + t) >>> 0;
  st[0] = a >>> 0; st[1] = b; st[2] = c; st[3] = d;
  return t;
}

// [0, 1)
export function rand(st) {
  return nextU32(st) / 4294967296;
}

export function randRange(st, lo, hi) {
  return lo + rand(st) * (hi - lo);
}

export function randInt(st, lo, hiInclusive) {
  return lo + Math.floor(rand(st) * (hiInclusive - lo + 1));
}

// Convenience wrapper for non-sim code (visual RNG).
export class Rng {
  constructor(seed = 1) { this.s = seedState(seed); }
  next() { return rand(this.s); }
  range(lo, hi) { return randRange(this.s, lo, hi); }
  int(lo, hi) { return randInt(this.s, lo, hi); }
}
