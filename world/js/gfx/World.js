/* World: lights, the island, clouds, stepping stones between places; owns locations and picking. */
import * as THREE from 'three';
import { clay, PALETTE as P } from './materials.js';

export class World {
  constructor(bus, stage, quality) {
    this.bus = bus; this.stage = stage; this.quality = quality;
    this.root = new THREE.Group(); stage.scene.add(this.root);
    this.locations = []; this.reduced = false;
    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2(); this.hover = null;
  }
  lights() {
    const s = this.stage.scene;
    s.add(new THREE.HemisphereLight('#fff1f3', '#c9a3b4', 1.5));
    const sun = (this.sun = new THREE.DirectionalLight('#ffe2cc', 2.3));
    sun.position.set(20, 40, 25); sun.castShadow = this.quality.tier >= 2;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.04;
    s.add(sun); s.add(sun.target); sun.target.position.set(10, 0, -30);
  }
  addLocation(loc) { loc.build(); this.root.add(loc.group); this.locations.push(loc); return loc; }
  scenery(path) {
    // soft sea of clouds far below
    const cloudMat = clay('#fff4f2', { roughness: 1 });
    this.clouds = [];
    const geo = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < 22; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 4; j++) { const b = new THREE.Mesh(geo, cloudMat); b.position.set(j * 1.4 - 2, Math.sin(j) * 0.4, (j % 2) * 0.6); b.scale.setScalar(1.2 + (j % 3) * 0.5); c.add(b); }
      const a = (i / 22) * Math.PI * 2, r = 30 + (i % 5) * 9;
      c.position.set(10 + Math.cos(a) * r, -6 + (i % 4) * 5, -30 + Math.sin(a) * r);
      c.scale.setScalar(1.4 + (i % 3) * 0.6); c.userData.s = 0.2 + (i % 4) * 0.1;
      this.root.add(c); this.clouds.push(c);
    }
    // floating clay stepping stones along the avatar path between places
    const stone = new THREE.CylinderGeometry(0.9, 0.7, 0.4, 14);
    const mats = [clay(P.sand), clay(P.peach), clay(P.pink)];
    const N = 46;
    for (let i = 1; i < N; i++) {
      const t = i / N, p = path.char.getPoint(t);
      if (this.locations.some((l) => l.charPos.distanceTo(p) < 9.5)) continue;
      const m = new THREE.Mesh(stone, mats[i % 3]); m.position.copy(p).add(new THREE.Vector3(0, -0.2, 0));
      m.receiveShadow = true; m.castShadow = this.quality.tier >= 2; this.root.add(m);
    }
  }
  setReduced(v) { this.reduced = v; this.locations.forEach((l) => (l.reduced = v)); }
  update(ctx) {
    if (!this.reduced && this.clouds) this.clouds.forEach((c, i) => { c.position.x += Math.sin(ctx.t * 0.05 + i) * c.userData.s * ctx.dt; });
    this.locations.forEach((l) => l.update(ctx));
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
