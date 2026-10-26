// Uniform-grid spatial hash for targeting and splash queries. Rebuilt every
// tick with typed arrays (no per-tick allocation).

export class SpatialHash {
  constructor(width, height, cell = 32, cap = 2048) {
    this.cell = cell;
    this.cols = Math.ceil(width / cell) + 2;
    this.rows = Math.ceil(height / cell) + 2;
    this.head = new Int32Array(this.cols * this.rows);
    this.next = new Int32Array(cap);
    this.items = new Array(cap);
    this.n = 0;
  }
  clear() {
    this.head.fill(-1);
    this.n = 0;
  }
  cellOf(x, y) {
    const cx = Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cell) + 1));
    const cy = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cell) + 1));
    return cy * this.cols + cx;
  }
  insert(item) {
    if (this.n >= this.next.length) {
      const cap = this.next.length * 2;
      const nx = new Int32Array(cap);
      nx.set(this.next);
      this.next = nx;
      this.items.length = cap;
    }
    const i = this.n++;
    const c = this.cellOf(item.x, item.y);
    this.items[i] = item;
    this.next[i] = this.head[c];
    this.head[c] = i;
  }
  // Fills `out` with items within r of (x, y); returns the count.
  query(x, y, r, out) {
    let k = 0;
    const r2 = r * r;
    const x0 = Math.min(this.cols - 1, Math.max(0, Math.floor((x - r) / this.cell) + 1));
    const x1 = Math.min(this.cols - 1, Math.max(0, Math.floor((x + r) / this.cell) + 1));
    const y0 = Math.min(this.rows - 1, Math.max(0, Math.floor((y - r) / this.cell) + 1));
    const y1 = Math.min(this.rows - 1, Math.max(0, Math.floor((y + r) / this.cell) + 1));
    for (let cy = y0; cy <= y1; cy++)
      for (let cx = x0; cx <= x1; cx++)
        for (let i = this.head[cy * this.cols + cx]; i !== -1; i = this.next[i]) {
          const it = this.items[i];
          const dx = it.x - x, dy = it.y - y;
          if (dx * dx + dy * dy <= r2) out[k++] = it;
        }
    return k;
  }
}
