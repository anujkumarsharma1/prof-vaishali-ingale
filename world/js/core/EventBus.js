/* EventBus: tiny pub/sub plus ordered hooks.
   Events (fire-and-forget): section:enter, section:leave, transition:start, transition:cover,
   transition:end, sound:toggle, quality:change, motion:change, input:move.
   Hooks (ordered, can be awaited): beforeLoad, afterLoad, beforeRender, afterRender. */
export class EventBus {
  constructor() { this._ev = new Map(); this._hooks = new Map(); }
  on(name, fn) {
    if (!this._ev.has(name)) this._ev.set(name, new Set());
    this._ev.get(name).add(fn);
    return () => this.off(name, fn);
  }
  once(name, fn) { const off = this.on(name, (p) => { off(); fn(p); }); return off; }
  off(name, fn) { const s = this._ev.get(name); if (s) s.delete(fn); }
  emit(name, payload) {
    const s = this._ev.get(name); if (!s) return;
    for (const fn of [...s]) { try { fn(payload); } catch (e) { console.error('[bus]', name, e); } }
  }
  hook(name, fn, order = 0) {
    if (!this._hooks.has(name)) this._hooks.set(name, []);
    const list = this._hooks.get(name); list.push({ fn, order }); list.sort((a, b) => a.order - b.order);
    return () => { const i = list.findIndex((h) => h.fn === fn); if (i >= 0) list.splice(i, 1); };
  }
  /* Synchronous run for per-frame hooks. */
  run(name, ctx) { const l = this._hooks.get(name); if (l) for (const h of l) h.fn(ctx); }
  /* Async run for lifecycle hooks. */
  async runAsync(name, ctx) { const l = this._hooks.get(name); if (l) for (const h of l) await h.fn(ctx); }
}
