// Phase 0 Kamino mockup map (48x28 tiles). Art preview only: the real
// level layouts arrive in src/data/levels in Phase 1.

export function kaminoMockGrid() {
  const W = 48, H = 28;
  const g = Array.from({ length: H }, () => Array(W).fill('W'));
  const rect = (x0, y0, x1, y1, c = 'G') => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c;
  };
  rect(1, 1, 14, 11);
  rect(20, 2, 34, 12);
  rect(38, 1, 46, 9);
  rect(3, 15, 16, 26);
  rect(21, 16, 33, 26);
  rect(37, 13, 47, 25);
  rect(4, 5, 5, 6, 'X');
  rect(42, 4, 43, 5, 'X');
  rect(25, 22, 26, 23, 'X');
  const path = (pts) => {
    for (let i = 0; i < pts.length - 1; i++) {
      let [x, y] = pts[i];
      const [x1, y1] = pts[i + 1];
      for (;;) {
        g[y][x] = g[y][x] === 'W' || g[y][x] === 'B' ? 'B' : 'P';
        if (x === x1 && y === y1) break;
        x += Math.sign(x1 - x);
        y += Math.sign(y1 - y);
      }
    }
  };
  path([[0, 4], [11, 4], [11, 8], [24, 8], [24, 4], [32, 4], [32, 20], [40, 20], [40, 16], [47, 16]]);
  path([[0, 20], [9, 20], [9, 23], [27, 23], [27, 20], [32, 20]]);
  return g.map((r) => r.join(''));
}

export const MOCK_PROPS = [
  ['dome', 2, 1], ['dome', 39, 1], ['dome', 6, 15], ['dome', 22, 2],
  ['mast', 13, 1], ['mast', 45, 13], ['mast', 21, 16],
  ['floodlight', 14, 9], ['floodlight', 20, 10], ['floodlight', 34, 6], ['floodlight', 16, 24],
  ['crates', 29, 10], ['crates', 13, 17], ['crates', 44, 22],
  ['generator', 2, 9], ['generator', 30, 17],
];
