/* Character: a procedural clay professor placeholder (saree with pallu, blouse, hair bun, a book).
   Seen from behind, like the reference. Idle = breathing bob; walk = step bob, sway and arm swing.
   Swap for a modelled GLB in M3 by replacing build(); the public API (group, update, setWalking) stays. */
import * as THREE from 'three';
import { clay, PALETTE as P } from './materials.js';

export class Character {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'professor';
    this.speed = 0; this.phase = 0; this.reduced = false;
    this.build();
  }
  build() {
    const g = this.group, body = (this.body = new THREE.Group()); g.add(body);
    const saree = clay(P.coral), blouse = clay(P.mauve), skin = clay(P.skin), hair = clay(P.hair), border = clay(P.gold);
    const m = (geo, mat, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    // saree skirt: a lathe flaring to the floor, with a gold border ring
    const prof = [];
    for (let i = 0; i <= 12; i++) { const y = i / 12; prof.push(new THREE.Vector2(0.27 + (1 - y) * 0.2 + Math.sin(y * 3) * 0.02, y * 1.0)); }
    prof.unshift(new THREE.Vector2(0, 0)); prof.push(new THREE.Vector2(0, 1.0));
    this.skirt = m(new THREE.LatheGeometry(prof, 28), saree, 0, 0.02, 0);
    m(new THREE.TorusGeometry(0.46, 0.035, 8, 32), border, 0, 0.06, 0).rotation.x = Math.PI / 2;
    // torso (blouse) and waist
    m(new THREE.CapsuleGeometry(0.24, 0.42, 6, 16), blouse, 0, 1.33, 0).scale.set(1, 1, 0.78);
    // pallu: a drape from the left shoulder across the back to the right hip
    const pallu = m(new THREE.BoxGeometry(0.26, 0.95, 0.06), saree, 0.03, 1.28, -0.2);
    pallu.rotation.z = -0.55; pallu.rotation.x = 0.08;
    const pb = m(new THREE.BoxGeometry(0.27, 0.06, 0.07), border, 0.24, 0.9, -0.22); pb.rotation.z = -0.55;
    // neck + head
    m(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 12), skin, 0, 1.78, 0);
    this.head = m(new THREE.SphereGeometry(0.21, 24, 18), skin, 0, 2.0, 0);
    // hair cap and bun (visible from behind)
    const cap = m(new THREE.SphereGeometry(0.225, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.72), hair, 0, 2.02, -0.015);
    cap.rotation.x = -0.45;
    m(new THREE.SphereGeometry(0.13, 18, 14), hair, 0, 1.98, -0.22);
    m(new THREE.TorusGeometry(0.1, 0.02, 6, 18), clay(P.cream), 0, 1.98, -0.24); // white flower ring (gajra)
    // arms: shoulder pivots so they can swing
    const arm = (side) => {
      const pivot = new THREE.Group(); pivot.position.set(0.3 * side, 1.58, 0); body.add(pivot);
      m(new THREE.CapsuleGeometry(0.07, 0.22, 4, 10), blouse, 0, -0.12, 0, pivot);
      m(new THREE.CapsuleGeometry(0.06, 0.34, 4, 10), skin, 0, -0.45, 0, pivot);
      pivot.rotation.z = 0.12 * side; return pivot;
    };
    this.armL = arm(-1); this.armR = arm(1);
    // book held in the right hand, against the hip
    this.book = m(new THREE.BoxGeometry(0.06, 0.32, 0.24), clay(P.plum), 0.03, -0.66, 0.05, this.armR);
    m(new THREE.BoxGeometry(0.065, 0.3, 0.02), clay(P.cream), 0.0, 0, 0.115, this.book);
    // soft contact shadow for tier 1 (no shadow maps)
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: '#5b3a4f', transparent: true, opacity: 0.18, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; g.add(blob);
  }
  /* speed: world units per second the character is moving (0 = idle) */
  setSpeed(v) { this.speed = v; }
  update({ dt, t }) {
    const walk = Math.min(1, this.speed / 3);
    if (this.reduced) { this.body.position.y = 0; this.armL.rotation.x = this.armR.rotation.x = 0; return; }
    this.phase += dt * (2 + walk * 7);
    const s = Math.sin(this.phase);
    this.body.position.y = walk * Math.abs(s) * 0.06 + (1 - walk) * Math.sin(t * 1.6) * 0.012;
    this.body.rotation.z = walk * s * 0.04;
    this.armL.rotation.x = walk * s * 0.5;
    this.armR.rotation.x = -walk * s * 0.25;               // the book arm swings less
    this.skirt.scale.x = 1 + walk * Math.abs(s) * 0.04;
    this.head.rotation.y = (1 - walk) * Math.sin(t * 0.4) * 0.15; // looks around when idle
  }
}
