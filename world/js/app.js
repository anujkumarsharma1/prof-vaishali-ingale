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

const SECTIONS = [{ id: 'home', label: 'Home' }, { id: 'campus', label: 'Main building' }, { id: 'about', label: 'About' }, { id: 'research', label: 'Research' },
  { id: 'teaching', label: 'Teaching' }, { id: 'projects', label: 'Projects' }, { id: 'leadership', label: 'Leadership & awards' }, { id: 'contact', label: 'Contact' }];
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
    const THREE = await import('three'); this._T = THREE;
    const [{ Stage }, { World }, { Character }, { CameraPath }, { GateView, AitCampus }, { HiTerrace }, { Hilltop }] = await Promise.all([
      import('./gfx/Stage.js'), import('./gfx/World.js'), import('./gfx/Character.js'), import('./gfx/CameraPath.js'),
      import('./gfx/locations/AitMainBuilding.js'), import('./gfx/locations/HiTerrace.js'), import('./gfx/locations/Hilltop.js')]);
    const J = await import('./gfx/locations/Journey.js');
    const MAT = await import('./gfx/materials.js');
    MAT.REAL.lite = this.quality.tier < 2;   // Lite: plain realistic colours, no texture sets, no HDRI
    this.root.classList.toggle('lite', MAT.REAL.lite);
    this._progress(0.25); await nextFrame();
    const bus = this.bus, store = this.store, F = Object.fromEntries(this.content.folders.map((f) => [f.id, f]));
    this.stage = new Stage(bus, this.$('stage'), this.quality);
    const skyP = this.stage.loadSky();
    this.world = new World(bus, this.stage, this.quality); this.world.lights();
    const locs = [new GateView(), new AitCampus(this.content), new HiTerrace(),
      new J.Skyline(F.publications.pubs), new J.WaterfallValley(), new J.TechPark(F.research.sections[0].items),
      new J.MonumentPlaza(F.awards.sections[0].timeline), new Hilltop(F.contact.links)];
    for (let i = 0; i < locs.length; i++) { this.world.addLocation(locs[i]); this._progress(0.3 + 0.15 * (i + 1)); await nextFrame(); }
    this.path = new CameraPath(bus, store, locs);
    this.world.scenery(this.path);
    this.character = new Character(); this.stage.scene.add(this.character.group);
    const modelP = this.character.loadModel();          // rigged GLB (falls back to the procedural figure)
    this.world.initOcclusion(this.character);
    this.character.group.traverse((o) => { if (o.isMesh) o.castShadow = this.quality.tier >= 2; });
    this.world.setReduced(store.get('reducedMotion')); this.character.reduced = store.get('reducedMotion');
    this.path.apply(this.stage.camera, this.character);
    this.modelLoaded = await Promise.race([modelP, new Promise((r) => setTimeout(() => r(false), 9000))]);
    this.character.group.traverse((o) => { if (o.isMesh) o.castShadow = this.quality.tier >= 2; });
    await skyP;
    await this._prewarm(locs);
    this._progress(0.95); await nextFrame();

    // per-frame
    bus.hook('beforeRender', (ctx) => {
      this.quality.sample(ctx.dt);
      if (this.started) this.path.update(ctx.dt);
      this.path.apply(this.stage.camera, this.character);
      this._dolly();
      this.world.stream(this.stage.camera); this.world.mood(this.stage.camera, ctx.dt);
      this._establish(ctx.dt);
      if (this.portraitCam) this._portrait();
      this._frame(ctx.dt);
      this.character.update(ctx); this.world.update(ctx); this.world.updateOcclusion(ctx.dt);
      if (this.started) {
        this._preT = (this._preT || 0) + ctx.dt;
        if (this._preT > 0.6) { this._preT = 0; const sec = Math.max(0, this.path.section); const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1));
          if (!this._preBusy) { this._preBusy = true; idle(() => { this.world.preload(sec, this.stage.renderer, this.stage.camera); this._preBusy = false; }); } }
        if (this.joy && this.joy.v) this.path.nudge(-this.joy.v * ctx.dt * 0.09);
      }
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
  /* Establishing shot after START: a high, wide view of the whole campus (front photo) that eases
     down into the back-facing view at the gate. Skipped with reduced motion. */
  _establish(dt) {
    if (this._estT === undefined || this._estT >= 1) { if (this.character) this.character.ringBoost = 0; return; }
    if (this.store.get('reducedMotion')) { this._estT = 1; return; }
    this._estT = Math.min(1, this._estT + dt / 3.2);
    const e = this._estT < 0.5 ? 4 * this._estT ** 3 : 1 - Math.pow(-2 * this._estT + 2, 3) / 2;   // easeInOutCubic
    const cam = this.stage.camera, to = cam.position.clone(), look = this.path._l.clone();
    if (!this._est) { const T = this._T; this._est = { p: new T.Vector3(6, 24, 26), l: new T.Vector3(0, 4, -38) }; }
    cam.position.lerpVectors(this._est.p, to, e);
    this.character.ringBoost = 1 - e;              // the glow under her is larger while the camera is high up
    cam.lookAt(this._est.l.clone().lerp(look, e));
  }
  /* Framing: keep her in the part of the screen nothing covers. The free area is the viewport minus the
     title bar, the info card (side panel on desktop, bottom sheet on phones) and the icon bar; an
     off-axis view offset slides the image so her waist lands in the middle of that area. Damped, so
     the card opening/closing or a ride glides rather than jumps. */
  /* portrait phones: pull the camera back along the line to her (same orientation), so she reads smaller
     with more of the place around her, instead of filling the narrow screen */
  _dolly() {
    const cam = this.stage.camera; if (cam.aspect >= 1) return;
    const k = cam.aspect < 0.62 ? 1.32 : 1.18, g = this.character.group.position;
    cam.position.sub(g).multiplyScalar(k).add(g);
  }
  _freeRect() {
    const W = innerWidth, H = innerHeight, r = { l: 0, t: 0, r: W, b: H };
    const brand = document.querySelector('.brand'); if (brand && !this.$('chrome').hidden) r.t = brand.getBoundingClientRect().bottom + 10;
    const pan = Object.values(this.panels.el).find((p) => !p.hidden);
    if (pan) {
      const b = pan.getBoundingClientRect();
      if (b.width > W * 0.6) r.b = Math.min(r.b, b.top - 12);            // bottom sheet
      else if (b.height > 0) r.l = Math.max(r.l, b.right + 16);           // side panel
    }
    const ib = document.querySelector('.iconbar');
    if (ib && !this.$('chrome').hidden) { const b = ib.getBoundingClientRect(); if (b.left > W * 0.15 && b.right < W * 0.85) r.b = Math.min(r.b, b.top - 10); }
    if (r.b - r.t < H * 0.25) r.t = Math.max(0, r.b - H * 0.25);
    return r;
  }
  _frame(dt) {
    const T = this._T, cam = this.stage.camera, W = innerWidth, H = innerHeight;
    if (!this._fv) this._fv = { v: new T.Vector3(), ox: 0, oy: 0, n: 0 };
    const F = this._fv; F.n = (F.n + 1) % 6;
    if (F.n === 0 || !F.rect) F.rect = this._freeRect();                  // layout read ~10x a second
    const fr = F.rect;
    cam.updateMatrixWorld();
    const v = F.v.copy(this.character.group.position); v.y += 1.05; v.applyMatrix4(cam.matrixWorldInverse);
    if (v.z > -0.5) return;
    const tv = Math.tan(T.MathUtils.degToRad(cam.fov) / 2);
    const sx = (0.5 + 0.5 * (v.x / -v.z) / (tv * cam.aspect)) * W, sy = (0.5 - 0.5 * (v.y / -v.z) / tv) * H;
    const tx = (fr.l + fr.r) / 2, ty = fr.t + (fr.b - fr.t) * 0.56;
    const ox = T.MathUtils.clamp(sx - tx, -W * 0.4, W * 0.4), oy = T.MathUtils.clamp(sy - ty, -H * 0.4, H * 0.6);
    const k = F.init ? 1 - Math.exp(-dt * 5) : 1; F.init = true;
    F.ox += (ox - F.ox) * k; F.oy += (oy - F.oy) * k;
    cam.setViewOffset(W, H, Math.round(F.ox * 10) / 10, Math.round(F.oy * 10) / 10, W, H); cam.updateProjectionMatrix();
    const root = this.root.style, mid = (fr.t + fr.b) / 2;
    if (Math.abs((F.mid || 0) - mid) > 2) { F.mid = mid; root.setProperty('--joy-top', Math.round(mid - 52) + 'px'); root.setProperty('--hint-top', Math.round(fr.t + (fr.b - fr.t) * 0.2) + 'px'); }
  }
  /* test/preview: close three-quarter front view of the character */
  _portrait() {
    const T = this._T, g = this.character.group, cam = this.stage.camera;
    const off = new T.Vector3(0.75, 1.62, 1.35).applyAxisAngle(new T.Vector3(0, 1, 0), g.rotation.y);
    cam.position.copy(g.position).add(off); cam.lookAt(g.position.x, g.position.y + 1.45, g.position.z);
  }
  /* mobile joystick: drag up to walk/ride forward, down to go back (swipe and the menu still work) */
  _joystick() {
    if (!matchMedia('(pointer: coarse)').matches) return;
    const pad = document.createElement('div'); pad.className = 'joy'; pad.setAttribute('aria-hidden', 'true');
    pad.innerHTML = '<span class="joy-knob"></span><i class="joy-up"></i><i class="joy-dn"></i>';
    document.getElementById('chrome').appendChild(pad);
    const knob = pad.firstChild; this.joy = { v: 0 }; let id = null, y0 = 0;
    const set = (dy) => { const c = Math.max(-34, Math.min(34, dy)); knob.style.transform = `translateY(${c}px)`; this.joy.v = Math.abs(c) < 6 ? 0 : c / 34; };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; y0 = e.clientY; pad.setPointerCapture(id); pad.classList.add('on'); e.stopPropagation(); });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e.clientY - y0); });
    const end = (e) => { if (e.pointerId !== id) return; id = null; set(0); pad.classList.remove('on'); };
    pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
    ['touchstart', 'touchmove'].forEach((t) => pad.addEventListener(t, (e) => e.stopPropagation(), { passive: true }));
  }
  async _prewarm(locs) {
    const r = this.stage.renderer, cam = this.stage.camera, sc = this.stage.scene;
    if (r.compileAsync && r.extensions.has('KHR_parallel_shader_compile')) await r.compileAsync(sc, cam); else r.compile(sc, cam);
    for (const l of locs) { cam.position.copy(l.camPos); cam.lookAt(l.look); r.render(sc, cam); await nextFrame(); }
    this.path.apply(cam, this.character);
  }
  go(i) {
    if (!this.path || i === this.path.section) return;
    const far = Math.abs(i - this.path.section) > 2;   // up to two places away: ride; further: soft wipe
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
    const contact = locs[locs.length - 1];
    cv.addEventListener('pointermove', (e) => { const o = this.world.pick(e.clientX, e.clientY); contact.setHover(o); cv.style.cursor = o ? 'pointer' : ''; });
    cv.addEventListener('click', (e) => {
      const o = this.world.pick(e.clientX, e.clientY); if (!o || !o.userData.href) return;
      const h = o.userData.href; if (/^mailto:/.test(h)) location.href = h; else window.open(h, '_blank', 'noopener');
    });
  }
  _progress(v) { const r = this.$('gate-ring'); if (r) r.style.setProperty('--p', v); }
  /* touch vs pointer: the matching instruction line goes first and is emphasised */
  _helpOrder() {
    const h = this.$('gate-help'); if (!h) return;
    this.touch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && !matchMedia('(pointer: fine)').matches);
    const first = h.querySelector(`[data-k="${this.touch ? 'touch' : 'pointer'}"]`); first.classList.add('first'); h.prepend(first);
  }
  /* brief animated hint after START (mouse wheel or swipe), fades on the first scroll / swipe / key, or after 7 s */
  _scrollHint() {
    if (this.mode !== '3d') return;
    const el = document.createElement('div'); el.className = 'scroll-hint'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = this.touch
      ? '<svg viewBox="0 0 30 46"><rect x="9" y="10" width="12" height="26" rx="6" opacity=".35"/><circle class="finger" cx="15" cy="23" r="5" fill="#fff" stroke="none"/></svg><span>Swipe up to travel</span>'
      : '<svg viewBox="0 0 30 46"><rect x="3" y="3" width="24" height="40" rx="12"/><line class="wheel" x1="15" y1="11" x2="15" y2="17" stroke-linecap="round"/></svg><span>Scroll to travel</span>';
    document.body.appendChild(el); requestAnimationFrame(() => el.classList.add('in'));
    const off = () => { el.classList.remove('in'); setTimeout(() => el.remove(), 700); ['wheel', 'touchmove', 'keydown'].forEach((t) => removeEventListener(t, off)); this.joyPad && this.joyPad.removeEventListener('pointerdown', off); };
    ['wheel', 'touchmove', 'keydown'].forEach((t) => addEventListener(t, off, { passive: true }));
    setTimeout(() => { this.joyPad = document.querySelector('.joy'); this.joyPad && this.joyPad.addEventListener('pointerdown', off); }, 0);
    setTimeout(off, 7000);
  }
  _gateReady() {
    const gate = this.$('gate'), btn = this.$('start');
    this._helpOrder();
    gate.classList.add('ready'); btn.disabled = false; btn.focus({ preventScroll: true });
    const go = (withSound) => {
      if (this.started) return; this.started = true; this._joystick();
      if (withSound) this.store.set('sound', true);
      document.body.classList.remove('is-loading');
      const done = () => { gate.remove(); this.$('chrome').hidden = false; this._scrollHint(); };
      if (this._onStart) { this._onStart(); done(); return; }
      const hash = location.hash.slice(1), idx = Math.max(0, SECTIONS.findIndex((s) => s.id === hash));
      this.brush.run(() => { done(); this.path.jump(idx); this.path.section = -1; if (idx === 0) this._estT = 0; });
    };
    btn.addEventListener('click', () => go(true));
    this.$('start-quiet').addEventListener('click', () => go(false));
  }
}
new App().start();
