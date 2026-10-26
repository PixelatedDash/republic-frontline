// World camera. World scale W (device px per art px) is always an integer:
// default S, max 3S, min = the largest integer at which the whole map fits
// (never below 1 or ceil(S/2)). The draw offset rounds to whole device px.

export class Camera {
  constructor(mapW, mapH) {
    this.mapW = mapW;
    this.mapH = mapH;
    this.x = mapW / 2;
    this.y = mapH / 2;
    this.W = 1;
    this.minW = 1;
    this.maxW = 3;
    this.shakeX = 0;
    this.shakeY = 0;
    this.margin = 40; // art px of overscroll so edges can clear the HUD
  }

  setViewport(sc) {
    this.sc = sc;
    const fit = Math.floor(Math.min(sc.dw / this.mapW, sc.dh / this.mapH));
    this.minW = Math.max(1, Math.ceil(sc.S / 2), Math.min(fit, sc.S));
    this.maxW = sc.S * 3;
    if (!this.inited) {
      this.W = sc.S;
      this.inited = true;
    }
    this.W = Math.min(this.maxW, Math.max(this.minW, this.W));
    this.clamp();
  }

  clamp() {
    const { dw, dh } = this.sc;
    const hw = dw / (2 * this.W), hh = dh / (2 * this.W);
    const m = this.margin;
    if (this.mapW + 2 * m <= hw * 2) this.x = this.mapW / 2;
    else this.x = Math.min(this.mapW + m - hw, Math.max(hw - m, this.x));
    if (this.mapH + 2 * m <= hh * 2) this.y = this.mapH / 2;
    else this.y = Math.min(this.mapH + m - hh, Math.max(hh - m, this.y));
  }

  get offX() {
    return Math.round(this.sc.dw / 2 - this.x * this.W) + this.shakeX;
  }
  get offY() {
    return Math.round(this.sc.dh / 2 - this.y * this.W) + this.shakeY;
  }

  // device px -> world art px
  toWorld(dx, dy) {
    return { x: (dx - this.offX) / this.W, y: (dy - this.offY) / this.W };
  }
  toScreen(wx, wy) {
    return { x: wx * this.W + this.offX, y: wy * this.W + this.offY };
  }

  panBy(ddx, ddy) {
    this.x -= ddx / this.W;
    this.y -= ddy / this.W;
    this.clamp();
  }

  // Step to an integer zoom, keeping the world point under (dx, dy) fixed.
  zoomTo(newW, dx = this.sc.dw / 2, dy = this.sc.dh / 2) {
    newW = Math.min(this.maxW, Math.max(this.minW, Math.round(newW)));
    if (newW === this.W) return false;
    const w = this.toWorld(dx, dy);
    this.W = newW;
    this.x = w.x - (dx - this.sc.dw / 2) / newW;
    this.y = w.y - (dy - this.sc.dh / 2) / newW;
    this.clamp();
    return true;
  }

  centerOn(wx, wy) {
    this.x = wx;
    this.y = wy;
    this.clamp();
  }
}
