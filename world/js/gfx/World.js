/* World: lights, the island, clouds, stepping stones between places; owns locations and picking. */
import * as THREE from 'three';
import { mat, PALETTE as P } from './materials.js';

export class World {
  constructor(bus, stage, quality) {
    this.bus = bus; this.stage = stage; this.quality = quality;
    this.root = new THREE.Group(); stage.scene.add(this.root);
    this.locations = []; this.reduced = false;
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2(); this.hover = null;
  }
  lights() {
    const s = this.stage.scene;
    s.add((this.hemi = new THREE.HemisphereLight('#fff1f3', '#c9a3b4', 1.5)));
    const sun = (this.sun = new THREE.DirectionalLight('#ffe2cc', 2.3));
    sun.position.set(14, 26, -70);   // low sunset sun behind the main building: backlit glow sun.castShadow = this.quality.tier >= 2;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
    s.add(sun); s.add(sun.target); sun.target.position.set(0, 0, -20);
    const fill = new THREE.DirectionalLight('#ffd9e0', 0.9); fill.position.set(-10, 15, 30); s.add(fill);
    // soft sun disc + halo behind the dome (additive sprites, no textures to load)
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,248,225,1)'); gr.addColorStop(0.18, 'rgba(255,226,170,.9)'); gr.addColorStop(0.5, 'rgba(255,190,150,.25)'); gr.addColorStop(1, 'rgba(255,180,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    glow.position.set(3, 13, -95); glow.scale.set(46, 46, 1); s.add(glow);
  }
  addLocation(loc) { loc.group.userData.isLocation = true; if (!loc.lazy) this._build(loc); this.root.add(loc.group); this.locations.push(loc); return loc; }
  scenery(path) {
    // soft sea of clouds far below
    const cloudMat = mat('#fff4f2', { roughness: 1 });
    this.clouds = [];
    const geo = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < 22; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 4; j++) { const b = new THREE.Mesh(geo, cloudMat); b.position.set(j * 1.4 - 2, Math.sin(j) * 0.4, (j % 2) * 0.6); b.scale.setScalar(1.2 + (j % 3) * 0.5); c.add(b); }
      const a = (i / 22) * Math.PI * 2, r = 30 + (i % 5) * 9;
      c.position.set(10 + Math.cos(a) * r, -6 + (i % 4) * 5, -30 + Math.sin(a) * r);
      c.scale.setScalar(1.4 + (i % 3) * 0.6); c.userData.s = 0.2 + (i % 4) * 0.1;
      if (this.locations.some((l) => l.camPos.distanceTo(c.position) < 30 || l.charPos.distanceTo(c.position) < 22)) continue;   // keep views clear
      this.root.add(c); this.clouds.push(c);
    }
    // ground under everything, so every path is on terrain and the camera is always above the road
    const ground = new THREE.Mesh(new THREE.CircleGeometry(420, 64), mat('#b6d3a8')); ground.rotation.x = -Math.PI / 2; ground.position.set(40, -0.03, -110); ground.receiveShadow = true; ground.userData.noOcclude = true; this.root.add(ground);
    // a road the scooter rides along between places (ribbon + kerbs along the avatar spline)
    const N = 900, half = 1.1, pos = [], kerbL = [], kerbR = [], up = new THREE.Vector3(0, 1, 0);
    const tStart = path.secT(1);   // gate -> main building is the walkway; the road starts at the drive
    for (let i = 0; i <= N; i++) {
      const t = tStart + (1 - tStart) * (i / N), p = path.char.getPoint(t), tan = path.char.getTangent(t), side = new THREE.Vector3().crossVectors(tan, up).normalize();
      const y = Math.max(0, p.y - 0.06) + 0.02;   // on the ground, slightly below the avatar's feet
      pos.push(p.x + side.x * half, y, p.z + side.z * half, p.x - side.x * half, y, p.z - side.z * half);
      kerbL.push(new THREE.Vector3(p.x + side.x * half, y + 0.06, p.z + side.z * half)); kerbR.push(new THREE.Vector3(p.x - side.x * half, y + 0.06, p.z - side.z * half));
    }
    const idx = []; for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }   // upward-facing
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const road = new THREE.Mesh(g, mat(P.sand)); road.receiveShadow = true; road.userData.noOcclude = true; this.root.add(road);
    [kerbL, kerbR].forEach((pts) => { const k = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, 0.09, 6), mat(P.peach)); k.castShadow = this.quality.tier >= 2; k.userData.noOcclude = true; this.root.add(k); });
  }
  /* Occlusion: rays from the camera to the avatar's head and waist; any scenery that blocks them
     fades to low opacity (its materials are cloned on first fade), then fades back when clear. */
  initOcclusion(character) {
    this.char = character; this.fading = new Map(); this._occRay = new THREE.Raycaster();
    this._occList = []; this.root.traverse((o) => { if (o.isMesh && !o.userData.noOcclude) this._occList.push(o); });
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
  }
  _unit(o) { while (o.parent && o.parent !== this.root && !o.parent.userData.isLocation) o = o.parent; return o; }
  blockers() {
    const cam = this.stage.camera, out = new Set();
    for (const h of [1.95, 1.2]) {
      this._b.copy(this.char.group.position); this._b.y += h;
      const dir = this._a.copy(this._b).sub(cam.position), d = dir.length() - 0.4; dir.normalize();
      this._occRay.set(cam.position, dir); this._occRay.far = Math.max(0.1, d);
      for (const hit of this._occRay.intersectObjects(this._occList, false)) out.add(this._unit(hit.object));
    }
    return out;
  }
  updateOcclusion(dt) {
    if (!this.char) return;
    const now = this.blockers();
    now.forEach((u) => { if (!this.fading.has(u)) this.fading.set(u, { a: 1, mats: this._cloneMats(u) }); });
    for (const [u, f] of this.fading) {
      const want = now.has(u) ? 0.18 : 1;
      f.a += (want - f.a) * (1 - Math.exp(-dt * 10));
      f.mats.forEach((m) => { m.opacity = f.a; m.transparent = f.a < 0.99; m.depthWrite = f.a > 0.6; });
      if (want === 1 && f.a > 0.995) { this._restore(u); this.fading.delete(u); }
    }
  }
  _cloneMats(u) {
    const mats = [];
    u.traverse((o) => { if (!o.isMesh) return; o.userData.origMat = o.material;
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.push(m)); });
    return mats;
  }
  _restore(u) { u.traverse((o) => { if (o.isMesh && o.userData.origMat) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); o.material = o.userData.origMat; delete o.userData.origMat; } }); }
  /* for tests: how many blockers are still opaque right now */
  opaqueBlockers() { let n = 0; this.blockers().forEach((u) => { const f = this.fading.get(u); if (!f || f.a > 0.5) n++; }); return n; }
  _build(loc) {
    loc.build(); loc.built = true; loc.reduced = this.reduced;
    const sh = this.quality.tier >= 2;
    loc.group.traverse((o) => { if (o.isMesh || o.isInstancedMesh) { o.castShadow = o.castShadow && sh; if (this._occList && !o.userData.noOcclude && o.isMesh && !o.isInstancedMesh) this._occList.push(o); } });
  }
  /* lazy build: places come into being when the camera is within 150 m (fog hides them until ~120 m) */
  stream(camera) { for (const l of this.locations) if (!l.built && camera.position.distanceTo(l.camPos) < 150) this._build(l); }
  /* preload: in idle time, build (and compile shaders for) places up to two stops ahead/behind, one per call,
     so the first visit doesn't hitch when the lazy build would otherwise happen mid-ride */
  preload(section, renderer, camera) {
    const order = this.locations.map((l, i) => [Math.abs(i - section), l]).filter(([d, l]) => !l.built && d <= 2).sort((x, y) => x[0] - y[0]);
    if (!order.length) return false;
    const l = order[0][1]; this._build(l);
    try { renderer.compile(l.group, camera, this.stage.scene); } catch (e) { /* compile is an optimisation only */ }
    return true;
  }
  /* mood: blend fog, sky light and sun toward the place nearest the camera */
  mood(camera, dt) {
    if (!this._fogC) { this._fogC = new THREE.Color(); this._tmp = new THREE.Color(); }
    let best = null, bd = 1e9; for (const l of this.locations) { const d = camera.position.distanceTo(l.camPos); if (d < bd) { bd = d; best = l; } }
    if (!best) return; const k = 1 - Math.exp(-dt * 1.5), m = best.mood, s = this.stage.scene;
    s.fog.color.lerp(this._tmp.set(m.fog), k); this.hemi.color.lerp(this._tmp.set(m.hemi), k); this.sun.color.lerp(this._tmp.set(m.sun), k);
    const r = this.stage.renderer; r.toneMappingExposure += (m.exposure - r.toneMappingExposure) * k;
  }
  setReduced(v) { this.reduced = v; this.locations.forEach((l) => (l.reduced = v)); }
  update(ctx) {
    if (!this.reduced && this.clouds) this.clouds.forEach((c, i) => { c.position.x += Math.sin(ctx.t * 0.05 + i) * c.userData.s * ctx.dt; });
    this.locations.forEach((l) => l.built && l.update(ctx, this.stage.camera));
  }
  /* pointer picking for clickable 3D objects (contact glyphs) */
  pick(clientX, clientY) {
    this.ptr.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    this.ray.setFromCamera(this.ptr, this.stage.camera);
    const objs = this.locations.flatMap((l) => (l.active ? l.pickables : []));
    const hit = this.ray.intersectObjects(objs, false)[0];
    return hit ? hit.object : null;
  }
}
