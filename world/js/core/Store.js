/* Store: small observable state, persisted settings, URL hash sync. */
const KEY = 'vi-world-settings';
export class Store {
  constructor(bus) {
    this.bus = bus;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
    const mqReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.state = {
      section: 0,
      sound: false,
      reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : mqReduced,
      quality: saved.quality || 'auto'
    };
  }
  get(k) { return this.state[k]; }
  set(k, v) {
    if (this.state[k] === v) return;
    this.state[k] = v;
    if (k === 'reducedMotion' || k === 'quality') {
      try { localStorage.setItem(KEY, JSON.stringify({ reducedMotion: this.state.reducedMotion, quality: this.state.quality })); } catch (e) { /* private mode */ }
    }
    this.bus.emit('store:' + k, v);
  }
}
