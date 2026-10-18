/* Home: a stylised clay version of the AIT Pune main building (Dighi Hills), modelled from
   reference photos (see /workspace/site_build/ait_refs/SOURCES.md). Our own geometry: central
   tower with a cusped arch, stepped octagonal drum with cornice ledges, a dome and finial,
   2-storey peach wings with terracotta sunshade bands, palms, a quatrefoil fountain, and the
   maroon entrance gate in front (from Cyber's photo). No logos or emblems. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../../../room/vendor/RoundedBoxGeometry.js';
import { Location } from '../Location.js';
import { clay, textTexture, PALETTE as P } from '../materials.js';

const C = { wall: '#f3b9a0', trim: '#fbe6d4', band: '#c8604f', dome: '#b4554f', win: '#5b3a4f', palm: '#6fa58a', trunk: '#b8906f', water: '#9fd3dc' };
const BZ = -40;   // building front line (the gate is at z = 0, the walkway runs between)

/* Home anchor: just outside the gate, looking through it down the walkway (geometry lives in AitCampus). */
export class GateView extends Location {
  constructor() { super('home', 'Home', { charPos: [4.3, 0, 7], camPos: [4.6, 2.6, 14.5], look: [1.5, 4.2, -6] }); }
}

/* Main building anchor + all campus geometry: gate, walkway (from Cyber's walkway photo), main building. */
export class AitCampus extends Location {
  constructor(content) {
    super('campus', 'Main building', { charPos: [0, 0, -29], camPos: [0.5, 2.1, -22.5], look: [0, 4.6, -44] });
    this.content = content;
  }
  rb(w, h, d, r = 0.12, s = 2) { return new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)); }
  build() {
    // lawn
    const lawn = this.add(new THREE.Mesh(this.rb(46, 1.2, 74, 0.5), clay(P.leaf)), 0, -0.6, -20); lawn.castShadow = false;
    this._walkway();
    this._wings(); this._tower(); this._grounds();
    this._gate();
  }
  /* Entrance gate, modelled on Cyber's photo: maroon arched frame with white lettering on the top
     beam, a cream crossbeam on two cream inner pillars, black iron gates, cream side walls with a
     red cap, a hedge planter in the middle and hedges in front. Our own low-poly geometry. */
  _gate() {
    const GZ = 0, M = clay('#8e2a2e'), CR = clay(C.trim), IRON = clay('#2a2326', { roughness: 0.6 }), RED = clay('#b23a35');
    const rb = (w, h, d, r) => this.rb(w, h, d, r);
    // maroon outer pillars and arched top beam
    [-6.6, 6.6].forEach((x) => this.add(new THREE.Mesh(rb(0.9, 6.4, 0.9, 0.1), M), x, 3.2, GZ));
    const beamTex = textTexture('ARMY INSTITUTE OF TECHNOLOGY', { w: 2048, h: 160, bg: '#8e2a2e', fg: '#ffffff', font: '700 96px Inter, Arial, sans-serif' });
    const beam = new THREE.Mesh(rb(14.1, 1.15, 0.8, 0.08), [M, M, M, M, new THREE.MeshStandardMaterial({ map: beamTex, roughness: 0.85 }), M]);
    this.add(beam, 0, 6.55, GZ);
    const arcShape = new THREE.Shape(); arcShape.moveTo(-7.05, 0);
    for (let i = 0; i <= 24; i++) { const x = -7.05 + (14.1 * i) / 24; arcShape.lineTo(x, 0.5 * (1 - (x / 7.05) ** 2)); }
    arcShape.lineTo(7.05, 0); arcShape.lineTo(-7.05, 0);
    this.add(new THREE.Mesh(new THREE.ExtrudeGeometry(arcShape, { depth: 0.8, bevelEnabled: false }), M), 0, 7.1, GZ - 0.4);
    // thin inner maroon lining under the beam
    this.add(new THREE.Mesh(rb(12.4, 0.18, 0.5, 0.05), M), 0, 5.95, GZ);
    // cream crossbeam (wider than the frame) on two cream inner pillars
    this.add(new THREE.Mesh(rb(15.4, 0.55, 1.1, 0.12), CR), 0, 4.75, GZ);
    [-2.3, 2.3].forEach((x) => this.add(new THREE.Mesh(rb(0.55, 4.5, 0.55, 0.08), CR), x, 2.25, GZ));
    // middle: low cream base with red band and a hedge on it
    this.add(new THREE.Mesh(rb(4.1, 0.35, 1.0, 0.08), CR), 0, 0.18, GZ);
    this.add(new THREE.Mesh(rb(3.9, 0.7, 0.8, 0.25), clay(P.leafDark)), 0, 0.7, GZ);
    // black iron gates between inner and outer pillars
    [-1, 1].forEach((sd) => {
      const w = 3.55, leaf = new THREE.Group();
      leaf.position.set(6.15 * sd, 0, GZ + 0.1); this.group.add(leaf);
      [0.35, 1.95].forEach((y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), IRON); b.position.set(-sd * w / 2, y, 0); leaf.add(b); });
      for (let i = 0; i <= 14; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.9, 0.05), IRON); b.position.set(-sd * w * (i / 14), 1.1, 0); b.castShadow = true; leaf.add(b); }
      if (sd > 0) leaf.rotation.y = -1.45;   // right gate swung open: that's where she walks in
    });
    // cream side walls with a red cap
    [-1, 1].forEach((sd) => {
      this.add(new THREE.Mesh(rb(3.4, 2.4, 0.7, 0.1), CR), 8.8 * sd, 1.2, GZ + 0.3);
      this.add(new THREE.Mesh(rb(3.6, 0.22, 0.85, 0.06), RED), 8.8 * sd, 2.5, GZ + 0.3);
      for (let k = 0; k < 5; k++) this.add(new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.03, 0.02), clay('#e9d7c4')), 8.8 * sd, 0.4 + k * 0.42, GZ + 0.66);
    });
    // trimmed hedges in the foreground (kept to the sides so they never hide the avatar)
    [[-9.6, 2.4, 5], [10.8, 2.4, 4]].forEach(([x, z, w]) => this.add(new THREE.Mesh(rb(w, 0.9, 1.1, 0.35), clay('#8fbf62')), x, 0.45, z));
  }
  /* The walkway from the gate to the building (from Cyber's photo): concrete slabs with joints,
     on the left a steel railing and a shelter roof, then a row of potted plants on gravel; on the
     right yellow-and-black kerb blocks with a hedge; palms and round trees on both sides; a light pole. */
  _walkway() {
    const z0 = -1.5, z1 = -31.5, len = z0 - z1, cz = (z0 + z1) / 2;   // walkway ends at the curved drive
    this.add(new THREE.Mesh(this.rb(6.4, 0.12, len, 0.04), clay('#d9cfc9')), 0, 0.06, cz).castShadow = false;
    for (let z = z0 - 2; z > z1; z -= 2.2) this.add(new THREE.Mesh(new THREE.BoxGeometry(6.3, 0.02, 0.06), clay('#bfb2ad')), 0, 0.125, z).castShadow = false;
    this.add(new THREE.Mesh(this.rb(1.6, 0.1, len - 10, 0.04), clay('#cdbfb9')), -4.1, 0.05, cz - 5);       // gravel strip
    // left: railing + shelter near the gate
    const steel = clay('#cfd3d6', { roughness: 0.45, metalness: 0.3 });
    for (let z = -3; z >= -15; z -= 1.5) this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), steel), -3.4, 0.55, z);
    [0.55, 1.05].forEach((y) => this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 12, 6), steel), -3.4, y, -9).rotation.x = Math.PI / 2);
    [[-4.2, -3], [-4.2, -15], [-7.4, -3], [-7.4, -15]].forEach(([x, z]) => this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 6), clay('#3b3236')), x, 1.5, z));
    this.add(new THREE.Mesh(this.rb(4.4, 0.15, 13, 0.05), clay('#e9e1d8')), -5.8, 3.05, -9);
    this.add(new THREE.Mesh(this.rb(3.6, 1.0, 0.6, 0.15), clay('#5c7db8')), -5.8, 1.6, -15.2);              // blue notice board (blank)
    // left: potted plants
    for (let z = -17; z > z1 + 1; z -= 2.1) {
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 12), clay('#8a4b3c')), -4.1, 0.38, z);
      this.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clay(P.leafDark, { flatShading: true })), -4.1, 1.0, z);
    }
    // right: yellow/black kerb blocks + hedge
    const kerb = this.rb(0.42, 0.42, 0.9, 0.08), Y = clay('#f2c94c'), K = clay('#2f2a2c');
    let i = 0; for (let z = -2; z > z1; z -= 1.0) this.add(new THREE.Mesh(kerb, i++ % 2 ? K : Y), 3.45, 0.21, z);
    this.add(new THREE.Mesh(this.rb(1.2, 0.9, len - 2, 0.35), clay('#7fae5e')), 4.6, 0.45, cz);
    // palms and round trees lining both sides
    this.lanePalms = [];
    for (let z = -6, k = 0; z > -29; z -= 4.5, k++) { this.lanePalms.push(this._palm((z > -16 ? -9 : -6.2) - (k % 2) * 1.2, z, k)); if (z > -20) this.lanePalms.push(this._palm(6.6 + (k % 2), z - 2, k + 1)); }   // right side stops early: the camera leaves that way   // left palms clear of the shelter roof
    for (let z = -4; z > -29; z -= 5) [-11, 11.5].forEach((x, j) => {
      const tr = this.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + ((z + j) % 3) * 0.2, 1), clay(j ? P.leafDark : P.leaf, { flatShading: true })), x, 3.4, z);
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 2.2, 8), clay(C.trunk)), x, 1.1, z); void tr;
    });
    // light pole on the right
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 8), clay('#e9e4e6')), 5.6, 3.25, -12);
    this.add(new THREE.Mesh(this.rb(0.9, 0.18, 0.35, 0.06), clay('#e9e4e6')), 5.25, 6.5, -12);
    this.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), clay('#fff1c2', { emissive: '#ffd98a', emissiveIntensity: 0.8 })), 4.9, 6.38, -12);
  }
  _wing(x0, x1) {
    const w = Math.abs(x1 - x0), cx = (x0 + x1) / 2, H = 5, D = 4;
    this.add(new THREE.Mesh(this.rb(w, H, D, 0.2), clay(C.wall)), cx, H / 2, BZ - D / 2);
    // parapet band and roof
    this.add(new THREE.Mesh(this.rb(w + 0.2, 0.35, D + 0.2, 0.08), clay(C.band)), cx, H + 0.15, BZ - D / 2);
    // two floors: window row + terracotta sunshade band above each
    const n = Math.max(2, Math.floor(w / 1.7)), winGeo = this.rb(1.0, 1.0, 0.12, 0.04), shade = this.rb(w + 0.1, 0.22, 0.6, 0.06);
    [1.25, 3.55].forEach((y) => {
      this.add(new THREE.Mesh(shade, clay(C.band)), cx, y + 0.85, BZ + 0.2);
      for (let i = 0; i < n; i++) this.add(new THREE.Mesh(winGeo, clay(C.win)), x0 + (i + 0.5) * (w / n) * Math.sign(x1 - x0), y, BZ + 0.02);
    });
    // cream pilasters at the ends
    [x0, x1].forEach((x) => this.add(new THREE.Mesh(this.rb(0.4, H + 0.1, 0.3, 0.08), clay(C.trim)), x, H / 2, BZ + 0.1));
  }
  _wings() { this._wing(-2.8, -21); this._wing(2.8, 21); }   // long 2-storey wings (front photo)
  _tower() {
    const T = clay(C.trim), Wl = clay(C.wall), zf = BZ + 0.6;
    // main tower block
    this.add(new THREE.Mesh(this.rb(5.6, 7.2, 5.2, 0.25), Wl), 0, 3.6, BZ - 2);
    // recessed panel with cusped arch: cream frame + darker inset + multifoil arch made of tori
    this.add(new THREE.Mesh(this.rb(3.6, 6.2, 0.3, 0.1), T), 0, 3.4, zf);
    this.add(new THREE.Mesh(this.rb(2.8, 4.6, 0.2, 0.06), clay('#efc9b3')), 0, 2.6, zf + 0.1);
    const foil = new THREE.TorusGeometry(0.42, 0.09, 8, 20, Math.PI);
    [[-0.95, 4.9, 0.55], [0, 5.35, 0.62], [0.95, 4.9, 0.55]].forEach(([x, y, s]) => { const m = this.add(new THREE.Mesh(foil, clay(C.band)), x, y, zf + 0.2); m.scale.setScalar(s / 0.42); });
    // two stacked balconies and the door
    [[2.0, 0.5], [3.4, 0.45]].forEach(([y, h]) => this.add(new THREE.Mesh(this.rb(1.8, h, 0.5, 0.1), T), 0, y + 1.2, zf + 0.35));
    this.add(new THREE.Mesh(this.rb(0.9, 0.9, 0.1, 0.04), clay(C.win)), 0, 4.1, zf + 0.2);
    this.add(new THREE.Mesh(this.rb(1.6, 1.8, 0.1, 0.04), clay('#7c9fb0')), 0, 0.9, zf + 0.2);
    this.add(new THREE.Mesh(this.rb(2.6, 0.22, 0.8, 0.06), clay(C.band)), 0, 2.0, zf + 0.35);   // porch shade
    // crest: a plain cream shield with a red rim (stylised; not the institute's emblem)
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20), clay('#b23a35')), 0, 6.1, zf + 0.35).rotation.x = Math.PI / 2;
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.14, 20), clay(P.cream)), 0, 6.1, zf + 0.38).rotation.x = Math.PI / 2;
    // stepped octagonal drum with cornice ledges
    const oct = (r, h, mat, y) => { const m = this.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat), 0, y, BZ - 2); m.rotation.y = Math.PI / 8; return m; };
    oct(3.5, 0.3, T, 7.35);                       // lower chhajja
    oct(2.6, 1.3, Wl, 8.15);
    for (let i = 0; i < 8; i++) {                 // drum windows
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8, w = this.add(new THREE.Mesh(this.rb(0.9, 0.55, 0.1, 0.03), clay(C.win)), Math.sin(a) * 2.45, 8.15, BZ - 2 + Math.cos(a) * 2.45);
      w.rotation.y = a;
    }
    oct(3.0, 0.25, T, 8.9);                       // upper chhajja
    oct(2.1, 0.5, T, 9.25);
    // dome + finial
    const dome = this.add(new THREE.Mesh(new THREE.SphereGeometry(2.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), clay(C.dome)), 0, 9.5, BZ - 2);
    dome.scale.y = 0.85;
    this.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), clay(P.gold)), 0, 11.3, BZ - 2);
    this.add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 8), clay(P.gold)), 0, 11.75, BZ - 2);
    // flag pole (plain pennant, no emblem)
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.2, 6), clay(P.stone)), -2.3, 2.1, BZ + 1.2);
    const flagGeo = new THREE.PlaneGeometry(0.9, 0.55, 6, 1); flagGeo.translate(0.45, 0, 0);   // hinge at the pole
    this.flag = this.add(new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: '#b4554f', side: THREE.DoubleSide, roughness: 0.9 })), -2.25, 3.9, BZ + 1.2); this.flag.castShadow = false;
  }
  _grounds() {
    // quatrefoil fountain pond
    const sh = new THREE.Shape(), R = 1.4;
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, r = R * (0.75 + 0.25 * Math.abs(Math.cos(2 * a))); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const rim = new THREE.ExtrudeGeometry(sh, { depth: 0.35, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.1, bevelSegments: 3 });
    const pond = this.add(new THREE.Mesh(rim, clay(P.cream)), -9, 0, BZ + 4.6); pond.rotation.x = -Math.PI / 2;
    const water = this.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), clay(C.water, { roughness: 0.3 })), -9, 0.47, BZ + 4.6);
    water.rotation.x = -Math.PI / 2; water.scale.setScalar(0.88);
    this.jet = this.add(new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.1, 10), new THREE.MeshStandardMaterial({ color: '#dff3f6', transparent: true, opacity: 0.8 })), -9, 1.0, BZ + 4.6);
    // round flower bed with a yellow hedge
    this.add(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.28, 10, 28), clay('#e6c95a')), 9, 0.2, BZ + 4.6).rotation.x = Math.PI / 2;
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.2, 24), clay('#b9d98f')), 9, 0.1, BZ + 4.6);
    // curved asphalt drive with a white kerb in front of the building (front photo)
    const a0 = Math.PI * 0.2, a1 = Math.PI * 0.6;
    const drive = this.add(new THREE.Mesh(new THREE.RingGeometry(15, 18.5, 64, 1, a0, a1), clay('#8f8a8f')), 0, 0.09, BZ + 23);
    drive.rotation.x = -Math.PI / 2; drive.castShadow = false;
    [15, 18.5].forEach((r) => { const k = this.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.12, 6, 64, a1), clay('#f7f3ef')), 0, 0.12, BZ + 23); k.rotation.set(-Math.PI / 2, 0, a0); });
    // front hedge strips
    [-8, 8].forEach((x) => this.add(new THREE.Mesh(this.rb(8, 0.6, 0.9, 0.25), clay(P.leafDark)), x, 0.3, BZ + 2.2));
    // palms in a row along the wings
    this.palms = [];
    [-19, -16, -13, -5, 5, 13, 16, 19].forEach((x, i) => this.palms.push(this._palm(x, BZ + 3.4, i)));
    // Dighi hills behind
    [[-22, -72, 10, 9], [-6, -80, 14, 12], [16, -75, 12, 8]].forEach(([x, z, r, h]) => {
      const m = this.add(new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), clay('#b9a3b5', { flatShading: true })), x, h / 2 - 1, z); m.castShadow = false;
    });
  }
  _palm(x, z, i) {
    const g = new THREE.Group(), h = 4.6 + (i % 3) * 0.5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, h, 8), clay(C.trunk)); trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
    const crown = new THREE.Group(); crown.position.y = h; g.add(crown);
    const frond = new THREE.ConeGeometry(0.28, 2.2, 4); frond.translate(0, 1.1, 0);
    for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(frond, clay(C.palm, { flatShading: true })); f.rotation.set(1.15, (k / 7) * Math.PI * 2, 0, 'YXZ'); f.scale.z = 0.35; f.castShadow = true; crown.add(f); }
    g.position.set(x, 0, z); g.userData.crown = crown; this.group.add(g); return g;
  }
  update({ t }) {
    if (this.reduced) return;
    [...this.palms, ...this.lanePalms].forEach((p, i) => { p.userData.crown.rotation.z = Math.sin(t * 0.9 + i) * 0.05; });
    this.flag.rotation.y = -0.15 + Math.sin(t * 2.2) * 0.2;
    this.jet.scale.y = 1 + Math.sin(t * 6) * 0.08;
  }
}
