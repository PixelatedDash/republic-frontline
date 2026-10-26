// Raw input -> event queue in device pixels. Screens drain the queue once
// per frame and do their own gesture logic (tap, drag-pan, pinch, wheel).
// Blocks browser zoom, scrolling, pull-to-refresh and long-press menus.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.queue = [];
    this.pointers = new Map();
    this.unlockers = [];
    this.mouse = { x: -1, y: -1, inside: false };
    this.shift = false;
    window.addEventListener('keyup', (e) => { if (e.key === 'Shift') this.shift = false; });
    const opt = { passive: false };
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      const dpr = canvas.width / r.width;
      return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
    };
    const firstGesture = () => {
      for (const f of this.unlockers) f();
      this.unlockers.length = 0;
    };
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture?.(e.pointerId);
      const p = pos(e);
      this.pointers.set(e.pointerId, { ...p, type: e.pointerType });
      this.queue.push({ type: 'down', id: e.pointerId, x: p.x, y: p.y, ptype: e.pointerType, button: e.button });
      firstGesture();
    }, opt);
    canvas.addEventListener('pointermove', (e) => {
      const p = pos(e);
      this.mouse = { x: p.x, y: p.y, inside: true, type: e.pointerType };
      if (!this.pointers.has(e.pointerId) && e.pointerType !== 'mouse') return;
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { ...p, type: e.pointerType });
      this.queue.push({ type: 'move', id: e.pointerId, x: p.x, y: p.y, ptype: e.pointerType, held: this.pointers.has(e.pointerId) });
    }, opt);
    const up = (type) => (e) => {
      const p = pos(e);
      this.pointers.delete(e.pointerId);
      this.queue.push({ type, id: e.pointerId, x: p.x, y: p.y, ptype: e.pointerType, button: e.button });
      if (type === 'up') firstGesture();
    };
    canvas.addEventListener('pointerup', up('up'), opt);
    canvas.addEventListener('pointercancel', up('cancel'), opt);
    canvas.addEventListener('pointerleave', () => { this.mouse.inside = false; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const p = pos(e);
      this.queue.push({ type: 'wheel', dy: e.deltaY, x: p.x, y: p.y });
    }, opt);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    for (const t of ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'gesturechange', 'dblclick'])
      canvas.addEventListener(t, (e) => e.preventDefault(), opt);
    document.addEventListener('gesturestart', (e) => e.preventDefault(), opt);
    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === 'Shift') this.shift = true;
      this.queue.push({ type: 'key', key: e.key, code: e.code, shift: e.shiftKey });
      if ([' ', 'Escape', 'Tab'].includes(e.key)) e.preventDefault();
      firstGesture();
    });
  }

  onFirstGesture(fn) {
    this.unlockers.push(fn);
  }

  drain() {
    const q = this.queue;
    this.queue = [];
    return q;
  }
}
