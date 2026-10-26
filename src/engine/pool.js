// Fixed-capacity object pool. Objects are preallocated and recycled, so hot
// loops never allocate. `items[0..count)` are live; release swaps with the
// last live item (order is not preserved — fine for particles and decals).

export class Pool {
  constructor(capacity, make) {
    this.items = Array.from({ length: capacity }, make);
    this.count = 0;
    this.capacity = capacity;
    this.dropped = 0;
  }
  get free() {
    return this.capacity - this.count;
  }
  // Returns a recycled object, or null when full (the caller drops the effect).
  acquire() {
    if (this.count >= this.capacity) {
      this.dropped++;
      return null;
    }
    return this.items[this.count++];
  }
  // Oldest-first eviction for decals: reuse slot 0 when full.
  acquireOrOldest() {
    if (this.count < this.capacity) return this.items[this.count++];
    const o = this.items[0];
    for (let i = 1; i < this.count; i++) this.items[i - 1] = this.items[i];
    this.items[this.count - 1] = o;
    return o;
  }
  releaseAt(i) {
    const last = --this.count;
    if (i !== last) {
      const tmp = this.items[i];
      this.items[i] = this.items[last];
      this.items[last] = tmp;
    }
  }
  clear() {
    this.count = 0;
  }
}
