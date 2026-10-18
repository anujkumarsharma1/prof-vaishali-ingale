/* Character: procedural clay professor placeholder (saree with gold border and pallu, blouse,
   large hair bun with a gajra, a book) plus her own stylised clay scooter.
   Parked at a place: she stands, scooter beside her, idle breathing and a look-around.
   Moving between places: she sits on the scooter; wheels spin with distance, the rig leans into
   curves and bounces softly. Swap build() for a modelled GLB in M3; the API stays:
   group, setMotion(speed, yawRate), update(ctx). */
import * as THREE from 'three';
import { clay, PALETTE as P } from './materials.js';

const SCOOT = { body: '#8fcfc4', dark: '#4f6f7a', seat: '#5b3a4f', chrome: '#e9e4e6', tyre: '#3b2f36', light: '#fff4c7' };

export class Character {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'professor';
    this.rig = new THREE.Group(); this.group.add(this.rig);
    this.speed = 0; this.yawRate = 0; this.ride = 0; this.lean = 0; this.dist = 0; this.reduced = false;
    this.buildFigure(); this.buildScooter();
  }
  _m(geo, mat, x, y, z, parent) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; }
  buildFigure() {
    const body = (this.body = new THREE.Group()); this.rig.add(body);
    const m = (g, mat, x, y, z, p = body) => this._m(g, mat, x, y, z, p);
    const saree = clay(P.coral), blouse = clay(P.mauve), skin = clay(P.skin), hair = clay(P.hair), border = clay(P.gold);
    // saree skirt: lathe from waist (y 1.05) flaring gently to the floor
    const prof = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 14; i++) { const y = i / 14; prof.push(new THREE.Vector2(0.21 + (1 - y) * 0.13 + Math.sin(y * Math.PI) * 0.025, y * 1.05)); }
    prof.push(new THREE.Vector2(0, 1.05));
    this.skirt = m(new THREE.LatheGeometry(prof, 28), saree, 0, 0.02, 0);
    this.hem = m(new THREE.TorusGeometry(0.335, 0.03, 8, 32), border, 0, 0.06, 0); this.hem.rotation.x = Math.PI / 2;
    // torso: blouse with a slim waist; then shoulders
    m(new THREE.CapsuleGeometry(0.17, 0.42, 6, 16), blouse, 0, 1.36, 0).scale.set(1.05, 1, 0.75);
    m(new THREE.CylinderGeometry(0.2, 0.18, 0.12, 16), saree, 0, 1.1, 0);              // saree pleat at the waist
    // pallu over the left shoulder, falling down the back (visible from behind = local -z)
    const pallu = (this.pallu = m(new THREE.BoxGeometry(0.24, 1.0, 0.05), saree, -0.05, 1.22, -0.16)); pallu.rotation.z = 0.5; pallu.rotation.x = -0.06;
    const pb = m(new THREE.BoxGeometry(0.25, 0.06, 0.06), border, -0.27, 0.8, -0.18); pb.rotation.z = 0.5;
    // neck, head
    m(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 12), skin, 0, 1.76, 0);
    const head = (this.head = new THREE.Group()); head.position.set(0, 1.97, 0); body.add(head);
    m(new THREE.SphereGeometry(0.17, 24, 18), skin, 0, 0, 0, head).scale.set(0.95, 1.08, 1);
    // face: cute and stylised, readable in side and three-quarter views
    const ink = clay('#2b1d1f', { roughness: 0.5 });
    [-1, 1].forEach((sd) => {
      m(new THREE.SphereGeometry(0.022, 10, 8), ink, 0.058 * sd, 0.015, 0.152, head).scale.set(1, 1.3, 0.6);         // eyes
      m(new THREE.SphereGeometry(0.007, 6, 4), clay('#ffffff'), 0.062 * sd, 0.024, 0.163, head);                     // eye shine
      const brow = m(new THREE.CapsuleGeometry(0.006, 0.04, 2, 6), ink, 0.058 * sd, 0.062, 0.152, head); brow.rotation.z = Math.PI / 2 + 0.18 * sd;
      m(new THREE.SphereGeometry(0.02, 8, 6), clay('#e89a8a'), 0.095 * sd, -0.035, 0.135, head).scale.set(1, 0.6, 0.4); // blush
    });
    const smile = m(new THREE.TorusGeometry(0.03, 0.006, 6, 12, Math.PI), clay('#8e2a2e'), 0, -0.05, 0.155, head); smile.rotation.z = Math.PI;
    m(new THREE.SphereGeometry(0.012, 8, 6), clay('#c0262d'), 0, 0.09, 0.158, head);                                  // bindi
    // hair: cap covering the back and top, centre parting, and a big bun with a white gajra
    const cap = m(new THREE.SphereGeometry(0.182, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), hair, 0, 0.01, -0.012, head);
    cap.rotation.x = -0.55; cap.scale.set(0.97, 1.08, 1.02);
    m(new THREE.SphereGeometry(0.176, 24, 18), hair, 0, 0.0, -0.03, head).scale.set(0.98, 1.05, 1);   // back of the head
    this.bun = m(new THREE.SphereGeometry(0.155, 20, 16), hair, 0, -0.05, -0.215, head); this.bun.scale.set(1.1, 0.95, 0.9);
    const gajra = m(new THREE.TorusGeometry(0.15, 0.03, 8, 22), clay(P.cream), 0, -0.05, -0.215, head); gajra.scale.set(1.1, 0.95, 1);
    for (let i = 0; i < 6; i++) m(new THREE.SphereGeometry(0.028, 8, 6), clay(P.white), Math.cos(i) * 0.165, -0.05 + Math.sin(i) * 0.15, -0.215, head);
    // arms on shoulder pivots
    const arm = (side) => {
      const piv = new THREE.Group(); piv.position.set(0.22 * side, 1.6, 0); body.add(piv);
      m(new THREE.CapsuleGeometry(0.055, 0.2, 4, 10), blouse, 0, -0.11, 0, piv);
      m(new THREE.CapsuleGeometry(0.045, 0.36, 4, 10), skin, 0, -0.44, 0, piv);
      m(new THREE.TorusGeometry(0.05, 0.012, 6, 12), border, 0, -0.56, 0, piv).rotation.x = Math.PI / 2; // bangle
      piv.userData.side = side; piv.rotation.z = 0.1 * side; return piv;
    };
    this.armL = arm(-1); this.armR = arm(1);
    this.book = m(new THREE.BoxGeometry(0.05, 0.3, 0.22), clay(P.plum), 0.04, -0.66, 0.04, this.armR);
    m(new THREE.BoxGeometry(0.055, 0.28, 0.015), clay(P.cream), 0, 0, 0.11, this.book);
    // seated drape: lap over the seat front, pleats falling over the floorboard, feet on the board
    const seat = (this.seated = new THREE.Group()); body.add(seat);
    m(new THREE.CapsuleGeometry(0.17, 0.3, 6, 14), saree, 0, 1.0, 0.12, seat).rotation.x = Math.PI / 2;
    const fall = m(new THREE.BoxGeometry(0.4, 0.58, 0.1), saree, 0, 0.68, 0.36, seat); fall.rotation.x = 0.12;
    m(new THREE.BoxGeometry(0.41, 0.05, 0.11), border, 0, 0.41, 0.39, seat);
    [-0.09, 0.09].forEach((x) => m(new THREE.SphereGeometry(0.055, 10, 8), clay('#8e2a2e'), x, 0.4, 0.46, seat).scale.set(1, 0.6, 1.5));
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: '#5b3a4f', transparent: true, opacity: 0.16, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; this.group.add(blob);
  }
  buildScooter() {
    const s = (this.scooter = new THREE.Group()); this.rig.add(s);
    const m = (g, mat, x, y, z, p = s) => this._m(g, mat, x, y, z, p);
    const B = clay(SCOOT.body);
    m(new THREE.BoxGeometry(0.42, 0.1, 0.9), clay(SCOOT.dark), 0, 0.32, 0.05);           // floorboard
    const rear = m(new THREE.CapsuleGeometry(0.26, 0.5, 6, 16), B, 0, 0.6, -0.42); rear.rotation.x = Math.PI / 2; rear.scale.set(1, 1, 0.9);
    m(new THREE.BoxGeometry(0.36, 0.1, 0.62), clay(SCOOT.seat), 0, 0.88, -0.4);             // seat
    const shield = m(new THREE.CapsuleGeometry(0.2, 0.55, 6, 14), B, 0, 0.75, 0.5); shield.rotation.x = -0.25; shield.scale.z = 0.55;
    const stem = m(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), clay(SCOOT.chrome), 0, 1.1, 0.5); stem.rotation.x = -0.35;
    const bar = m(new THREE.CapsuleGeometry(0.035, 0.6, 4, 8), clay(SCOOT.dark), 0, 1.32, 0.42); bar.rotation.z = Math.PI / 2;
    m(new THREE.SphereGeometry(0.09, 14, 10), clay(SCOOT.light, { emissive: '#fff1b0', emissiveIntensity: 0.4 }), 0, 1.18, 0.62);
    const fender = m(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), B, 0, 0.26, 0.62); fender.scale.set(0.7, 0.8, 1);
    this.wheels = [0.62, -0.55].map((z) => {
      const w = new THREE.Group(); w.position.set(0, 0.22, z); s.add(w);
      const tyre = m(new THREE.TorusGeometry(0.17, 0.065, 10, 20), clay(SCOOT.tyre), 0, 0, 0, w); tyre.rotation.y = Math.PI / 2;
      const hub = m(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 10), clay(SCOOT.chrome), 0, 0, 0, w); hub.rotation.z = Math.PI / 2;
      m(new THREE.BoxGeometry(0.11, 0.2, 0.03), clay(SCOOT.chrome), 0, 0, 0, w);          // spoke marker, shows the spin
      return w;
    });
  }
  setMotion(speed, yawRate, canRide = true, hasScooter = true) { this.speed = speed; this.yawRate = yawRate; this.canRide = canRide; this.scooter.visible = hasScooter; }
  update({ dt, t }) {
    const k = 1 - Math.exp(-dt * 5);                 // frame-rate independent smoothing
    const riding = this.speed > 0.6 && this.canRide !== false ? 1 : 0;
    const walk = this.speed > 0.6 && !riding ? Math.min(1, this.speed / 4) : 0;
    this.walk = (this.walk || 0) + (walk - (this.walk || 0)) * k;
    this.ride += (riding - this.ride) * (1 - Math.exp(-dt * 6));
    const r = THREE.MathUtils.smoothstep(this.ride, 0, 1);
    this.dist += this.speed * dt;
    // scooter: parked to her right, slides under her when she rides
    this.scooter.position.set(1.15 * (1 - r), 0, 0.15 * (1 - r));
    this.scooter.rotation.y = 0.35 * (1 - r);
    this.wheels.forEach((w) => (w.rotation.x += (this.speed * dt) / 0.24));
    // figure: stand -> sit on the seat, arms to the handlebar, book tucked away
    this.body.position.set(0, -0.06 * r, -0.2 * r);
    const st = Math.max(0.001, 1 - r);
    this.skirt.scale.set(1, st, 1); this.hem.scale.setScalar(st);
    this.seated.scale.setScalar(Math.max(0.001, r)); this.seated.visible = r > 0.01;
    this.pallu && (this.pallu.scale.y = 1 - 0.45 * r);
    this.book.scale.setScalar(Math.max(0.001, 1 - r));
    const lean = THREE.MathUtils.clamp(-this.yawRate * 0.35, -0.3, 0.3) * r;
    this.lean += (lean - this.lean) * k;
    if (this.reduced) {
      this.rig.rotation.z = 0; this.rig.position.y = 0;
      this.armL.rotation.x = this.armR.rotation.x = -1.2 * r; return;
    }
    this.rig.rotation.z = this.lean;
    this.rig.position.y = r * Math.abs(Math.sin(this.dist * 2.2)) * 0.035;            // road bounce
    const idle = 1 - r;
    this.body.position.y += idle * Math.sin(t * 1.6) * 0.01;
    // walking on foot: step bob, hip sway, arm swing (the book arm swings less)
    const wk = this.walk, ph = this.dist * 2.6;
    this.rig.position.y += wk * Math.abs(Math.sin(ph)) * 0.05;
    this.body.rotation.z = wk * Math.sin(ph) * 0.04;
    this.skirt.rotation.y = wk * Math.sin(ph) * 0.08;
    this.armL.rotation.x = -1.2 * r + idle * (Math.sin(t * 1.6) * 0.04 * (1 - wk) + wk * Math.sin(ph) * 0.45);
    this.armR.rotation.x = -1.2 * r - idle * wk * Math.sin(ph) * 0.2;
    this.head.rotation.y = idle * Math.sin(t * 0.4) * 0.25;
    this.armL.rotation.z = -0.1 + r * 0.12; this.armR.rotation.z = 0.1 - r * 0.12;   // hands in to the grips
  }
}
