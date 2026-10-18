/* App: boots the world. Order: detect quality -> build panels -> (fallback | 3D) -> START gate. */
import { EventBus } from './core/EventBus.js';
import { Loop } from './core/Loop.js';
import { Store } from './core/Store.js';
import { Quality } from './core/Quality.js';
import { Panels } from './ui/Panels.js';
import { Nav } from './ui/Nav.js';
import { BrushTransition } from './ui/BrushTransition.js';
import { Sound } from './ui/Sound.js';
import { Fallback } from './ui/Fallback.js';

const SECTIONS = [{ id: 'home', label: 'Home' }, { id: 'about', label: 'About' }, { id: 'contact', label: 'Contact' }];
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

export class App {
  constructor() {
    this.root = document.documentElement;
    this.site = this.root.getAttribute('data-site-base') || '../';
    this.content = window.ROOM_CONTENT;
    this.bus = new EventBus(); this.store = new Store(this.bus); this.quality = new Quality(this.bus);
    this.$ = (id) => document.getElementById(id);
    window.__world = this;   // read-only handle for the tests
  }
  async start() {
    const bus = this.bus, store = this.store;
    await bus.runAsync('beforeLoad', this);
    this.quality.detect();
    this.panels = new Panels(bus, this.$('panels'), this.content, this.site);
    this.brush = new BrushTransition(bus, store, document.body);
    this.nav = new Nav(bus, store, this.quality, SECTIONS, this.site);
    this.sound = new Sound(bus, store);
    this.root.classList.toggle('reduced', store.get('reducedMotion'));
    bus.on('store:reducedMotion', (v) => { this.root.classList.toggle('reduced', v); this.world && this.world.setReduced(v); this.character && (this.character.reduced = v); });

    if (this.quality.tier === 0) { this._progress(1); this._gateReady(); this.mode = 'static'; this._onStart = () => Fallback.mount(this.panels, this.quality.reason); return; }
    try { await this._build3D(); this.mode = '3d'; }
    catch (e) { console.error(e); this.mode = 'static'; this._onStart = () => Fallback.mount(this.panels, 'the 3D view failed'); }
    this._gateReady();
    await bus.runAsync('afterLoad', this);
  }
  async _build3D() {
    const THREE = await import('three');
    const [{ Stage }, { World }, { Character }, { CameraPath }, { CampusGate }, { HiTerrace }, { Hilltop }] = await Promise.all([
      import('./gfx/Stage.js'), import('./gfx/World.js'), import('./gfx/Character.js'), import('./gfx/CameraPath.js'),
      import('./gfx/locations/CampusGate.js'), import('./gfx/locations/HiTerrace.js'), import('./gfx/locations/Hilltop.js')]);
    this._progress(0.25); await nextFrame();
    const bus = this.bus, store = this.store, F = Object.fromEntries(this.content.folders.map((f) => [f.id, f]));
    this.stage = new Stage(bus, this.$('stage'), this.quality);
    this.world = new World(bus, this.stage, this.quality); this.world.lights();
    const locs = [new CampusGate(this.content), new HiTerrace(), new Hilltop(F.contact.links)];
    for (let i = 0; i < locs.length; i++) { this.world.addLocation(locs[i]); this._progress(0.3 + 0.15 * (i + 1)); await nextFrame(); }
    this.path = new CameraPath(bus, store, locs);
    this.world.scenery(this.path);
    this.character = new Character(); this.stage.scene.add(this.character.group);
    this.character.group.traverse((o) => { if (o.isMesh) o.castShadow = this.quality.tier >= 2; });
    this.world.setReduced(store.get('reducedMotion')); this.character.reduced = store.get('reducedMotion');
    this.path.apply(this.stage.camera, this.character);
    this.stage.renderer.compile(this.stage.scene, this.stage.camera);
    this._progress(0.95); await nextFrame();

    // per-frame
    bus.hook('beforeRender', (ctx) => {
      this.quality.sample(ctx.dt);
      if (this.started) this.path.update(ctx.dt);
      this.path.apply(this.stage.camera, this.character);
      this.character.update(ctx); this.world.update(ctx);
    });
    bus.on('quality:change', (t) => { this.stage.renderer.shadowMap.enabled = t >= 2; this.world.sun.castShadow = t >= 2; this.stage.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); });
    bus.on('section:enter', ({ index, prev }) => {
      if (prev >= 0) locs[prev].leave(); locs[index].enter();
      this.panels.show(SECTIONS[index].id); this.store.set('section', index);
      this.$('live').textContent = SECTIONS[index].label;
      history.replaceState(null, '', '#' + SECTIONS[index].id);
    });
    bus.on('section:leave', () => {});
    bus.on('nav:go', (i) => this.go(i));
    this._input(locs);
    this.loop = new Loop(bus); this.loop.start();
    this._progress(1);
  }
  go(i) {
    if (!this.path || i === this.path.section) return;
    const far = Math.abs(i - this.path.section) > 1 || this.store.get('reducedMotion');
    if (far) this.brush.run(() => this.path.jump(i)); else this.path.glide(i);
  }
  _input(locs) {
    const p = this.path, cv = this.stage.renderer.domElement;
    const blocked = (e) => e.target.closest && e.target.closest('.panel, .menu, .iconbar, .gate');
    addEventListener('wheel', (e) => { if (!this.started || blocked(e)) return; p.nudge(e.deltaY * 0.0009); }, { passive: true });
    let ty = null;
    addEventListener('touchstart', (e) => { if (blocked(e)) { ty = null; return; } ty = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', (e) => { if (ty === null || !this.started) return; const y = e.touches[0].clientY; p.nudge((ty - y) * 0.0022); ty = y; }, { passive: true });
    addEventListener('keydown', (e) => {
      if (!this.started || e.target.closest('input, textarea')) return;
      const k = e.key, cur = p.section;
      if (k === 'ArrowDown' || k === 'PageDown' || k === 'ArrowRight') { e.preventDefault(); this.go(Math.min(SECTIONS.length - 1, cur + 1)); }
      if (k === 'ArrowUp' || k === 'PageUp' || k === 'ArrowLeft') { e.preventDefault(); this.go(Math.max(0, cur - 1)); }
    });
    const contact = locs[2];
    cv.addEventListener('pointermove', (e) => { const o = this.world.pick(e.clientX, e.clientY); contact.setHover(o); cv.style.cursor = o ? 'pointer' : ''; });
    cv.addEventListener('click', (e) => {
      const o = this.world.pick(e.clientX, e.clientY); if (!o || !o.userData.href) return;
      const h = o.userData.href; if (/^mailto:/.test(h)) location.href = h; else window.open(h, '_blank', 'noopener');
    });
  }
  _progress(v) { const r = this.$('gate-ring'); if (r) r.style.setProperty('--p', v); }
  _gateReady() {
    const gate = this.$('gate'), btn = this.$('start');
    gate.classList.add('ready'); btn.disabled = false; btn.focus({ preventScroll: true });
    const go = (withSound) => {
      if (this.started) return; this.started = true;
      if (withSound) this.store.set('sound', true);
      document.body.classList.remove('is-loading');
      const done = () => { gate.remove(); this.$('chrome').hidden = false; };
      if (this._onStart) { this._onStart(); done(); return; }
      const hash = location.hash.slice(1), idx = Math.max(0, SECTIONS.findIndex((s) => s.id === hash));
      this.brush.run(() => { done(); this.path.jump(idx); this.path.section = -1; });
    };
    btn.addEventListener('click', () => go(true));
    this.$('start-quiet').addEventListener('click', () => go(false));
  }
}
new App().start();
