/* Loop: requestAnimationFrame with a clamped delta; pauses while the tab is hidden. */
export class Loop {
  constructor(bus) {
    this.bus = bus; this.running = false; this.t = 0; this._last = 0; this._raf = 0;
    this._tick = this._tick.bind(this);
    document.addEventListener('visibilitychange', () => (document.hidden ? this.stop() : this.start()));
  }
  start() { if (this.running) return; this.running = true; this._last = performance.now(); this._raf = requestAnimationFrame(this._tick); }
  stop() { this.running = false; cancelAnimationFrame(this._raf); }
  _tick(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now; this.t += dt;
    const ctx = { dt, t: this.t, now };
    this.bus.run('beforeRender', ctx);
    this.bus.run('render', ctx);
    this.bus.run('afterRender', ctx);
    this._raf = requestAnimationFrame(this._tick);
  }
}
