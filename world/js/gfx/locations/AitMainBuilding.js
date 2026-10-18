/* Home: a stylised version of the AIT Pune main building (Dighi Hills), modelled from
   reference photos (see /workspace/site_build/ait_refs/SOURCES.md). Our own geometry: central
   tower with a cusped arch, stepped octagonal drum with cornice ledges, a dome and finial,
   2-storey peach wings with terracotta sunshade bands, palms, a quatrefoil fountain, and the
   maroon entrance gate in front (from Cyber's photo). No logos or emblems. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../geo.js';
import { Location } from '../Location.js';
import { mat, surf, paint, glass, water, waterTick, textTexture, PALETTE as P } from '../materials.js';
import { Flora, hedgeMat } from '../Flora.js';

const C = { wall: '#d8906f', trim: '#e9e0d2', band: '#a4483a', dome: '#97412f', trunk: '#8a7258' };
const STOREY = 3.5;   // real storey height (m)
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
  rb(w, h, d, r = 0.03, s = 2) { return new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01)); }
  build() {
    // lawn
    this.flora = new Flora();
    const lawn = this.add(new THREE.Mesh(new THREE.BoxGeometry(46, 1.2, 74), surf('grass', { scale: 2.6 })), 0, -0.6, -20); lawn.castShadow = false; lawn.userData.noOcclude = true;
    this._walkway();
    this._wings(); this._tower(); this._grounds();
    this._gate();
    this.flora.flush(this.group);
  }
  /* Entrance gate, modelled on Cyber's photo: maroon arched frame with white lettering on the top
     beam, a cream crossbeam on two cream inner pillars, black iron gates, cream side walls with a
     red cap, a hedge planter in the middle and hedges in front. Our own low-poly geometry. */
  _gate() {
    const GZ = 0, M = paint('#7a2427'), CR = paint(C.trim), IRON = surf('metal', { color: '#2b2b2c', roughness: 0.7, metalness: 0.7 }), RED = paint('#9c2f2a');
    const rb = (w, h, d, r) => this.rb(w, h, d, r);
    // maroon outer pillars and arched top beam
    [-6.6, 6.6].forEach((x) => this.add(new THREE.Mesh(rb(0.9, 6.4, 0.9, 0.1), M), x, 3.2, GZ));
    const beamTex = textTexture('ARMY INSTITUTE OF TECHNOLOGY', { w: 2048, h: 160, bg: '#8e2a2e', fg: '#ffffff', font: '700 96px Inter, Arial, sans-serif' });
    const beam = new THREE.Mesh(rb(14.1, 1.15, 0.8, 0.08), [M, M, M, M, new THREE.MeshStandardMaterial({ map: beamTex, roughness: 0.7 }), M]);
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
    this.add(new THREE.Mesh(rb(3.9, 0.7, 0.8, 0.05), hedgeMat()), 0, 0.7, GZ);
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
      for (let k = 0; k < 5; k++) this.add(new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.03, 0.02), paint('#cbbfae')), 8.8 * sd, 0.4 + k * 0.42, GZ + 0.66);
    });
    // trimmed hedges in the foreground (kept to the sides so they never hide the avatar)
    [[-9.6, 2.4, 5], [10.8, 2.4, 4]].forEach(([x, z, w]) => this.add(new THREE.Mesh(rb(w, 0.9, 1.1, 0.06), hedgeMat()), x, 0.45, z));
  }
  /* The walkway from the gate to the building (from Cyber's photo): concrete slabs with joints,
     on the left a steel railing and a shelter roof, then a row of potted plants on gravel; on the
     right yellow-and-black kerb blocks with a hedge; palms and round trees on both sides; a light pole. */
  _walkway() {
    const z0 = -1.5, z1 = -31.5, len = z0 - z1, cz = (z0 + z1) / 2;   // walkway ends at the curved drive
    this.add(new THREE.Mesh(this.rb(6.4, 0.12, len, 0.02), surf('paving', { scale: 1.6 })), 0, 0.06, cz).castShadow = false;
    this.add(new THREE.Mesh(this.rb(1.6, 0.1, len - 10, 0.04), surf('concrete', { color: '#b5aca1', scale: 1.2 })), -4.1, 0.05, cz - 5);       // gravel strip
    // left: railing + shelter near the gate
    const steel = surf('metal', { color: '#c9cdd1', roughness: 0.55, metalness: 0.9, scale: 0.5 });
    for (let z = -3; z >= -15; z -= 1.5) this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 10), steel), -3.4, 0.55, z);
    [0.55, 1.05].forEach((y) => this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 12, 10), steel), -3.4, y, -9).rotation.x = Math.PI / 2);
    [[-4.2, -3], [-4.2, -15], [-7.4, -3], [-7.4, -15]].forEach(([x, z]) => this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3, 10), surf('metal', { color: '#3a3b3d', metalness: 0.8 })), x, 1.5, z));
    this.add(new THREE.Mesh(this.rb(4.4, 0.12, 13, 0.02), surf('metal', { color: '#9fa4a8', metalness: 0.7, scale: 1.5 })), -5.8, 3.05, -9);
    this.add(new THREE.Mesh(this.rb(3.6, 1.0, 0.12, 0.02), paint('#2f4f86')), -5.8, 1.6, -15.2);              // blue notice board (blank)
    // left: potted plants
    for (let z = -17; z > z1 + 1; z -= 2.1) {
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 16), paint('#8e4a33')), -4.1, 0.38, z);
      this.flora.bush(-4.1, 0.55, z, 1.1);
    }
    // right: yellow/black kerb blocks + hedge
    const kerb = this.rb(0.3, 0.25, 0.9, 0.02), Y = paint('#d9ad2b'), K = paint('#262626');
    let i = 0; for (let z = -2; z > z1; z -= 1.0) this.add(new THREE.Mesh(kerb, i++ % 2 ? K : Y), 3.4, 0.125, z);
    this.add(new THREE.Mesh(this.rb(1.2, 1.0, len - 2, 0.06), hedgeMat()), 4.6, 0.5, cz);
    // palms and round trees lining both sides
    for (let z = -6, k = 0; z > -29; z -= 4.5, k++) { this.flora.palm((z > -16 ? -9 : -6.2) - (k % 2) * 1.2, 0, z); if (z > -12) this.flora.palm(6.6 + (k % 2), 0, z - 2); }
    for (let z = -4; z > -29; z -= 5) [-11, 11.5].forEach((x, j) => {
      if (j && z < -10) return;   // keep the right side open: the ride to About leaves that way
      this.flora.tree(x, 0, z, 1.1 + ((z + j) % 3) * 0.1);
    });
    // light pole on the right
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.5, 8), surf('metal', { color: '#8d9196', metalness: 0.8 })), 5.6, 3.25, -12);
    this.add(new THREE.Mesh(this.rb(0.9, 0.18, 0.35, 0.06), surf('metal', { color: '#8d9196', metalness: 0.8 })), 5.25, 6.5, -12);
    this.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat('#fff1c2', { emissive: '#ffcf7a', emissiveIntensity: 1.5 })), 4.9, 6.38, -12);
  }
  /* instanced helper: one draw call for many identical parts (windows, frames, sunshades) */
  _inst(geo, material, list) {
    const im = new THREE.InstancedMesh(geo, material, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    list.forEach(([x, y, z, ry = 0], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q, one)); });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); this.group.add(im); return im;
  }
  _wing(x0, x1, win, frame) {
    const w = Math.abs(x1 - x0), cx = (x0 + x1) / 2, H = 2 * STOREY + 0.2, D = 9;
    this.add(new THREE.Mesh(this.rb(w, H, D), paint(C.wall)), cx, H / 2, BZ - D / 2);
    // parapet coping and a plinth course
    this.add(new THREE.Mesh(this.rb(w + 0.2, 0.25, D + 0.2, 0.02), paint(C.trim)), cx, H + 0.12, BZ - D / 2);
    this.add(new THREE.Mesh(this.rb(w + 0.06, 0.6, D + 0.06, 0.02), surf('concrete', { color: '#a99e92' })), cx, 0.3, BZ - D / 2);
    // two storeys: windows (1.4 x 1.6 m, sill at 0.9 m) with frames, a terracotta sunshade (chhajja) above each row
    const n = Math.max(2, Math.floor(w / 2.2));
    [0, STOREY].forEach((fl) => {
      this.add(new THREE.Mesh(this.rb(w + 0.1, 0.12, 0.7, 0.02), paint(C.band)), cx, fl + 2.85, BZ + 0.35);
      for (let i = 0; i < n; i++) { const x = x0 + (i + 0.5) * (w / n) * Math.sign(x1 - x0); win.push([x, fl + 1.7, BZ + 0.04]); frame.push([x, fl + 1.7, BZ + 0.01]); }
    });
    [x0, x1].forEach((x) => this.add(new THREE.Mesh(this.rb(0.5, H + 0.1, 0.3, 0.02), paint(C.trim)), x, H / 2, BZ + 0.1));
  }
  _wings() {
    const win = [], frame = [];
    this._wing(-2.8, -21, win, frame); this._wing(2.8, 21, win, frame);   // long 2-storey wings (front photo)
    this._inst(new THREE.BoxGeometry(1.4, 1.6, 0.06), glass('#26313a'), win);
    this._inst(new THREE.BoxGeometry(1.62, 1.82, 0.04), paint('#ece6dc'), frame);
  }
  _tower() {
    // built at the old stylised size, then scaled 1.3x about the façade so storeys read as real (~3.5 m)
    const g0 = this.group, TG = (this.group = new THREE.Group());
    this._towerParts();
    this.group = g0; TG.scale.setScalar(1.3); TG.position.set(0, 0, BZ * (1 - 1.3)); g0.add(TG);
  }
  _towerParts() {
    const T = paint(C.trim), Wl = paint(C.wall), zf = BZ + 0.6;
    this.add(new THREE.Mesh(this.rb(5.6, 7.2, 5.2), Wl), 0, 3.6, BZ - 2);
    this.add(new THREE.Mesh(this.rb(3.6, 6.2, 0.3), T), 0, 3.4, zf);
    this.add(new THREE.Mesh(this.rb(2.8, 4.6, 0.2), paint('#cf9a7f')), 0, 2.6, zf + 0.1);
    const foil = new THREE.TorusGeometry(0.42, 0.09, 8, 20, Math.PI);
    [[-0.95, 4.9, 0.55], [0, 5.35, 0.62], [0.95, 4.9, 0.55]].forEach(([x, y, s]) => { const m = this.add(new THREE.Mesh(foil, paint(C.band)), x, y, zf + 0.2); m.scale.setScalar(s / 0.42); });
    [[2.0, 0.5], [3.4, 0.45]].forEach(([y, h]) => this.add(new THREE.Mesh(this.rb(1.8, h, 0.5), T), 0, y + 1.2, zf + 0.35));
    this.add(new THREE.Mesh(this.rb(0.9, 0.9, 0.1), glass()), 0, 4.1, zf + 0.2);
    this.add(new THREE.Mesh(this.rb(1.4, 1.85, 0.1), glass('#33424a')), 0, 0.93, zf + 0.2);                 // entrance door (2.4 m after scale)
    this.add(new THREE.Mesh(this.rb(2.6, 0.12, 0.8), paint(C.band)), 0, 2.0, zf + 0.35);   // porch shade
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24), paint('#9c2f2a')), 0, 6.1, zf + 0.35).rotation.x = Math.PI / 2;
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.14, 24), paint(C.trim)), 0, 6.1, zf + 0.38).rotation.x = Math.PI / 2;
    const oct = (r, h, m, y) => { const o = this.add(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), m), 0, y, BZ - 2); o.rotation.y = Math.PI / 8; return o; };
    oct(3.5, 0.22, T, 7.35); oct(2.6, 1.3, Wl, 8.15);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8, w = this.add(new THREE.Mesh(this.rb(0.7, 0.75, 0.08), glass()), Math.sin(a) * 2.42, 8.15, BZ - 2 + Math.cos(a) * 2.42);
      w.rotation.y = a;
    }
    oct(3.0, 0.18, T, 8.9); oct(2.1, 0.5, T, 9.25);
    const dome = this.add(new THREE.Mesh(new THREE.SphereGeometry(2.0, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), paint(C.dome, { scale: 1.2 })), 0, 9.5, BZ - 2);
    dome.scale.y = 0.85;
    const gold = mat('#c9a227', { metalness: 1, roughness: 0.3 });
    this.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), gold), 0, 11.3, BZ - 2);
    this.add(new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 12), gold), 0, 11.75, BZ - 2);
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 4.2, 10), surf('metal', { color: '#c9cdd1', metalness: 0.9 })), -2.3, 2.1, BZ + 1.2);
    const flagGeo = new THREE.PlaneGeometry(0.9, 0.55, 6, 1); flagGeo.translate(0.45, 0, 0);
    this.flag = this.add(new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: '#8e3a30', side: THREE.DoubleSide, roughness: 0.95 })), -2.25, 3.9, BZ + 1.2); this.flag.castShadow = false;
  }
  _grounds() {
    const sh = new THREE.Shape(), R = 1.4;
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, r = R * (0.75 + 0.25 * Math.abs(Math.cos(2 * a))); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const rim = new THREE.ExtrudeGeometry(sh, { depth: 0.45, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 1 });
    const pond = this.add(new THREE.Mesh(rim, surf('concrete', { color: '#d6cec2', scale: 1 })), -9, 0, BZ + 4.6); pond.rotation.x = -Math.PI / 2;
    this.waterMat = water('#2a4b4e', { repeat: 1.5 });
    const wtr = this.add(new THREE.Mesh(new THREE.ShapeGeometry(sh), this.waterMat), -9, 0.4, BZ + 4.6);
    wtr.rotation.x = -Math.PI / 2; wtr.scale.setScalar(0.92); wtr.castShadow = false;
    this.jet = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.12, 1.1, 12, 1, true), new THREE.MeshStandardMaterial({ color: '#e8f1f2', transparent: true, opacity: 0.55, roughness: 0.2 })), -9, 0.95, BZ + 4.6); this.jet.castShadow = false;
    this.add(new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 10, 32), hedgeMat()), 9, 0.22, BZ + 4.6).rotation.x = Math.PI / 2;
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.2, 24), surf('grass')), 9, 0.1, BZ + 4.6);
    this.flora.bush(9, 0.15, BZ + 4.6, 1.3);
    const a0 = Math.PI * 0.2, a1 = Math.PI * 0.6;
    const drive = this.add(new THREE.Mesh(new THREE.RingGeometry(15, 18.5, 96, 1, a0, a1), surf('asphalt')), 0, 0.09, BZ + 23);
    drive.rotation.x = -Math.PI / 2; drive.castShadow = false;
    [15, 18.5].forEach((r) => { const k = this.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.13, 4, 96, a1), surf('concrete', { color: '#dcd6cc' })), 0, 0.1, BZ + 23); k.rotation.set(-Math.PI / 2, 0, a0); });
    [-8, 8].forEach((x) => this.add(new THREE.Mesh(this.rb(8, 0.8, 0.9, 0.05), hedgeMat()), x, 0.4, BZ + 2.2));
    [-19, -16, -13, -5, 5, 13, 16, 19].forEach((x) => this.flora.palm(x, 0, BZ + 3.4, 1.05));
    // Dighi hills behind: dry-grass slopes with noise relief
    [[-22, -82, 22, 14], [-2, -92, 30, 18], [22, -86, 24, 12]].forEach(([x, z, r, h], i) => {
      const g = new THREE.ConeGeometry(r, h, 40, 10), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k), f = 1 + 0.22 * Math.sin(vx * 0.21 + i) * Math.cos(vz * 0.27 + i * 2) + 0.08 * Math.sin(vx * 0.9 + vz * 0.7) + 0.03 * Math.sin(vx * 2.3 - vz * 1.9); p.setXYZ(k, vx * f * 1.35, vy * (0.75 + 0.25 * f) - Math.max(0, vy) * 0.25 * Math.sin(vx * 0.15), vz * f * 0.8); }
      g.computeVertexNormals();
      const m = this.add(new THREE.Mesh(g, surf('grass', { color: '#b3a27c', scale: 9 })), x, h / 2 - 1, z); m.castShadow = false;
    });
  }
  update({ t, dt }) {
    waterTick(this.waterMat, dt);
    if (this.reduced) return;
    this.flag.rotation.y = -0.15 + Math.sin(t * 2.2) * 0.2;
    this.jet.scale.y = 1 + Math.sin(t * 6) * 0.06;
  }
}
