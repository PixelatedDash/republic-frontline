// Sprite atlas: packs Bitmaps into 1024x1024 canvas pages with a shelf
// packer. Sprites can be added at any time (panels of new sizes, etc.).
// A sprite ref is { page, x, y, w, h } drawn with drawImage.

const PAGE = 1024;

export class Atlas {
  constructor(createCanvas) {
    this.createCanvas = createCanvas;
    this.pages = [];
    this.cur = null;
    this.count = 0;
  }

  newPage() {
    const canvas = this.createCanvas(PAGE, PAGE);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    this.cur = { canvas, ctx, x: 0, y: 0, shelfH: 0 };
    this.pages.push(this.cur);
  }

  add(bm) {
    const w = Math.max(1, bm.w), h = Math.max(1, bm.h);
    if (w + 2 > PAGE || h + 2 > PAGE) throw new Error(`sprite too large for atlas: ${w}x${h}`);
    if (!this.cur) this.newPage();
    let p = this.cur;
    if (p.x + w + 1 > PAGE) {
      p.x = 0;
      p.y += p.shelfH + 1;
      p.shelfH = 0;
    }
    if (p.y + h + 1 > PAGE) {
      this.newPage();
      p = this.cur;
    }
    const ref = { page: p.canvas, x: p.x, y: p.y, w, h };
    if (bm.w && bm.h) {
      const img = p.ctx.createImageData(bm.w, bm.h);
      new Uint32Array(img.data.buffer).set(bm.d);
      p.ctx.putImageData(img, p.x, p.y);
    }
    p.x += w + 1;
    p.shelfH = Math.max(p.shelfH, h);
    this.count++;
    return ref;
  }

  addAll(list) {
    return list.map((b) => this.add(b));
  }
}
