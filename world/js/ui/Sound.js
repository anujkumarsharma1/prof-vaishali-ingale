/* Sound: a soft generated pad and a tiny blip on arrival, made with WebAudio (no audio files).
   Off by default; only starts after a user gesture (START or the sound button). */
export class Sound {
  constructor(bus, store) {
    this.store = store; this.ctx = null; this.master = null;
    bus.on('store:sound', (on) => (on ? this.on() : this.off()));
    bus.on('section:enter', () => this.blip());
  }
  _init() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = 0; this.master.connect(this.ctx.destination);
    [220, 277.18, 329.63, 440].forEach((f, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; g.gain.value = 0.05 / (i + 1);
      lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 0.02 / (i + 1); lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(this.master); o.start(); lfo.start();
    });
    return true;
  }
  on() { if (!this.ctx && !this._init()) return; this.ctx.resume(); this.master.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.6); }
  off() { if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2); }
  blip() {
    if (!this.ctx || !this.store.get('sound')) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
    o.frequency.setValueAtTime(660, t); o.frequency.exponentialRampToValueAtTime(990, t + 0.12);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + 0.32);
  }
}
