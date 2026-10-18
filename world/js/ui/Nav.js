/* Nav: hamburger menu (sections + the classic pages) and the icon bar
   (sound, motion, quality, plain site). Keyboard: Esc closes, focus returns to the button. */
export class Nav {
  constructor(bus, store, quality, sections, site) {
    this.bus = bus; this.store = store;
    const $ = (id) => document.getElementById(id);
    this.btn = $('menu-btn'); this.menu = $('menu'); this.list = $('menu-list');
    sections.forEach((s, i) => {
      const li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.className = 'menu-item'; b.innerHTML = `<span class="n">0${i + 1}</span>${s.label}`;
      b.addEventListener('click', () => { this.close(); bus.emit('nav:go', i); });
      li.appendChild(b); this.list.appendChild(li);
    });
    [['Publications', 'publications/'], ['Leadership', 'leadership/'], ['Awards & books', 'awards/'], ['CV', 'cv/']].forEach(([l, u]) => {
      const li = document.createElement('li'); li.innerHTML = `<a class="menu-item small" href="${site + u}">${l}</a>`; $('menu-pages').appendChild(li);
    });
    this.btn.addEventListener('click', () => (this.menu.hidden ? this.open() : this.close()));
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !this.menu.hidden) { this.close(); this.btn.focus(); } });
    // icon bar
    const snd = $('ico-sound'), mot = $('ico-motion'), q = $('ico-quality');
    const sync = () => {
      snd.setAttribute('aria-pressed', String(store.get('sound')));
      mot.setAttribute('aria-pressed', String(store.get('reducedMotion')));
      q.querySelector('.lbl').textContent = quality.tier >= 2 ? 'HD' : 'Lite';
    };
    snd.addEventListener('click', () => store.set('sound', !store.get('sound')));
    mot.addEventListener('click', () => store.set('reducedMotion', !store.get('reducedMotion')));
    q.addEventListener('click', () => quality.setManual(quality.tier >= 2 ? 1 : 2));
    ['store:sound', 'store:reducedMotion', 'quality:change'].forEach((e) => bus.on(e, sync)); sync();
    bus.on('section:enter', ({ index }) => [...this.list.querySelectorAll('.menu-item')].forEach((b, i) => b.toggleAttribute('aria-current', i === index)));
  }
  open() { this.menu.hidden = false; this.btn.setAttribute('aria-expanded', 'true'); requestAnimationFrame(() => this.menu.classList.add('in')); const f = this.list.querySelector('button'); f && f.focus(); }
  close() { this.menu.classList.remove('in'); this.menu.hidden = true; this.btn.setAttribute('aria-expanded', 'false'); }
}
