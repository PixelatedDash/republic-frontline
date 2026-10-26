// World camera. World scale W (device px per art px) is an integer at rest:
// default SW, max 3*SW, min = the largest integer at which the whole map fits
// (never below 1 or ceil(SW/2)). Zoom steps ease over 120 ms; panning has
// momentum. The draw offset rounds to whole device px.

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
    this.margin = 80; // art px of overscroll so edges can clear the HUD
    this.vx = 0;
    this.vy = 0;
  }

  setViewport(sc) {
    this.sc = sc;
    const fit = Math.floor(Math.min(sc.dw / this.mapW, sc.dh / this.mapH));
    this.minW = Math.max(1, Math.ceil(sc.SW / 2), Math.min(fit, sc.SW));
    this.maxW = sc.SW * 3;
    if (!this.inited) {
      this.W = sc.SW;
      this.inited = true;
    }
    this.W = Math.min(this.maxW, Math.max(this.minW, this.W));
    this.Z = this.W;
    this.clamp();
  }

  clamp() {
    const { dw, dh } = this.sc;
    const z = this.Z || this.W;
    const hw = dw / (2 * z), hh = dh / (2 * z);
    const m = this.margin;
    if (this.mapW + 2 * m <= hw * 2) this.x = this.mapW / 2;
    else this.x = Math.min(this.mapW + m - hw, Math.max(hw - m, this.x));
    if (this.mapH + 2 * m <= hh * 2) this.y = this.mapH / 2;
    else this.y = Math.min(this.mapH + m - hh, Math.max(hh - m, this.y));
  }

  // Z = displayed scale (eases toward the integer W; equal to W at rest).
  get offX() {
    return Math.round(this.sc.dw / 2 - this.x * this.Z) + this.shakeX;
  }
  get offY() {
    return Math.round(this.sc.dh / 2 - this.y * this.Z) + this.shakeY;
  }
  get resting() {
    return this.Z === this.W;
  }

  // device px -> world art px
  toWorld(dx, dy) {
    return { x: (dx - this.offX) / this.Z, y: (dy - this.offY) / this.Z };
  }
  toScreen(wx, wy) {
    return { x: wx * this.Z + this.offX, y: wy * this.Z + this.offY };
  }

  panBy(ddx, ddy) {
    this.x -= ddx / this.Z;
    this.y -= ddy / this.Z;
    this.clamp();
  }

  // Release a drag with a velocity (device px/s): the view glides to a stop.
  fling(vx, vy) {
    const max = 3000;
    this.vx = Math.max(-max, Math.min(max, vx));
    this.vy = Math.max(-max, Math.min(max, vy));
  }
  stop() {
    this.vx = this.vy = 0;
  }

  // Step to an integer zoom, keeping the world point under (dx, dy) fixed.
  zoomTo(newW, dx = this.sc.dw / 2, dy = this.sc.dh / 2) {
    newW = Math.min(this.maxW, Math.max(this.minW, Math.round(newW)));
    if (newW === this.W) return false;
    this.anchor = { dx, dy, w: this.toWorld(dx, dy) };
    this.from = this.Z;
    this.W = newW;
    this.zt = 0;
    return true;
  }

  // Advance zoom easing (120 ms, ease-out) and pan momentum.
  update(dt) {
    if (this.Z !== this.W) {
      this.zt = Math.min(1, (this.zt || 0) + dt / 0.12);
      const k = 1 - (1 - this.zt) ** 3;
      this.Z = this.zt >= 1 ? this.W : this.from + (this.W - this.from) * k;
      const a = this.anchor;
      this.x = a.w.x - (a.dx - this.sc.dw / 2) / this.Z;
      this.y = a.w.y - (a.dy - this.sc.dh / 2) / this.Z;
      this.clamp();
    }
    if (this.vx || this.vy) {
      this.panBy(this.vx * dt, this.vy * dt);
      const f = Math.exp(-dt * 5);
      this.vx *= f;
      this.vy *= f;
      if (Math.hypot(this.vx, this.vy) < 20) this.stop();
    }
  }

  centerOn(wx, wy) {
    this.x = wx;
    this.y = wy;
    this.clamp();
  }
}
