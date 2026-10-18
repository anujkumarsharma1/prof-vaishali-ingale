/* BrushTransition: our own painterly wipe. Three soft, slightly wobbly strokes paint across the
   screen (SVG stroke-dashoffset), the bus gets 'transition:cover' while the screen is hidden, then the
   strokes lift away. Reduced motion: a 200 ms crossfade instead. */
const NS = 'http://www.w3.org/2000/svg';
export class BrushTransition {
  constructor(bus, store, host) {
    this.bus = bus; this.store = store; this.busy = false;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'brush'); this.svg.setAttribute('viewBox', '0 0 100 100');
    this.svg.setAttribute('preserveAspectRatio', 'none'); this.svg.setAttribute('aria-hidden', 'true');
    this.paths = [];
    const colors = ['#fff6ee', '#ffffff', '#fbe3dc', '#ffffff', '#fff6ee'];
    for (let i = 0; i < 3; i++) {
      const y = 17 + i * 33, p = document.createElementNS(NS, 'path');
      // hand-wobbled stroke from off-left to off-right
      let d = `M -10 ${y + (i % 2 ? 3 : -3)}`;
      for (let x = 0; x <= 110; x += 10) d += ` Q ${x - 5} ${y + Math.sin(x * 0.17 + i) * 5} ${x} ${y + Math.cos(x * 0.11 + i * 2) * 3}`;
      p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', colors[i]);
      p.setAttribute('stroke-width', '44'); p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('pathLength', '100'); p.style.strokeDasharray = '100 100'; p.style.strokeDashoffset = '100';
      this.svg.appendChild(p); this.paths.push(p);
    }
    host.appendChild(this.svg);
  }
  /* run(onCover) resolves after the reveal */
  async run(onCover) {
    if (this.busy) return; this.busy = true; this.bus.emit('transition:start');
    const svg = this.svg; svg.classList.add('on');
    if (this.store.get('reducedMotion')) {
      svg.classList.add('fade');
      await this._anim(svg, [{ opacity: 0 }, { opacity: 1 }], 200);
      onCover && onCover(); this.bus.emit('transition:cover');
      await this._anim(svg, [{ opacity: 1 }, { opacity: 0 }], 200);
      svg.classList.remove('fade');
    } else {
      svg.style.opacity = 1;
      await Promise.all(this.paths.map((p, i) => this._anim(p, [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], 300, i * 40, 'cubic-bezier(.65,0,.35,1)')));
      onCover && onCover(); this.bus.emit('transition:cover');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));   // let the new view render once
      await Promise.all(this.paths.map((p, i) => this._anim(p, [{ strokeDashoffset: 0 }, { strokeDashoffset: -100 }], 340, i * 40, 'cubic-bezier(.65,0,.35,1)')));
      this.paths.forEach((p) => (p.style.strokeDashoffset = '100'));
    }
    svg.classList.remove('on'); this.busy = false; this.bus.emit('transition:end');
  }
  _anim(el, kf, dur, delay = 0, easing = 'ease') {
    const a = el.animate(kf, { duration: dur, delay, easing, fill: 'forwards' });
    return a.finished.then(() => { const last = kf[kf.length - 1]; Object.assign(el.style, Object.fromEntries(Object.entries(last).map(([k, v]) => [k, String(v)]))); a.cancel(); });
  }
}
