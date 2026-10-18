/* Quality: decides whether WebGL runs at all, and at which tier.
   tier 0 = no WebGL (static fallback), 1 = low (DPR 1, no shadows), 2 = high.
   A short FPS probe after start can drop tier 2 -> 1. */
export class Quality {
  constructor(bus) {
    this.bus = bus; this.tier = 2; this.reason = ''; this.renderer = '';
    this._samples = []; this._probing = true;
  }
  detect() {
    const q = new URLSearchParams(location.search);
    if (q.has('static')) return this._set(0, 'forced by ?static');
    let gl = null;
    try { const c = document.createElement('canvas'); gl = c.getContext('webgl2') || c.getContext('webgl'); } catch (e) { gl = null; }
    if (!gl) return this._set(0, 'no WebGL');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    this.renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext();
    if (/swiftshader|llvmpipe|software|basic render/i.test(this.renderer)) return this._set(1, 'software renderer');
    const mem = navigator.deviceMemory || 8, cores = navigator.hardwareConcurrency || 8;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (q.has('low') || saveData || mem <= 3 || cores <= 4) return this._set(1, 'low-end device or Save-Data');
    if (/Mali-4|Adreno \(TM\) [2-4]\d\d|PowerVR SGX/i.test(this.renderer)) return this._set(1, 'older mobile GPU');
    return this._set(2, 'capable GPU');
  }
  _set(t, why) { this.tier = t; this.reason = why; return t; }
  /* Feed frame deltas for the first ~4 s; if the median is under ~42 fps, drop to tier 1. */
  sample(dt) {
    if (!this._probing || this.tier < 2) return;
    this._samples.push(dt);
    if (this._samples.length >= 180) {
      const s = this._samples.slice(30).sort((a, b) => a - b), med = s[s.length >> 1];
      this._probing = false;
      if (med > 1 / 42) { this.tier = 1; this.reason = 'fps probe ' + Math.round(1 / med) + ' fps'; this.bus.emit('quality:change', this.tier); }
    }
  }
  setManual(t) { this._probing = false; this.tier = t; this.reason = 'manual'; this.bus.emit('quality:change', t); }
}
