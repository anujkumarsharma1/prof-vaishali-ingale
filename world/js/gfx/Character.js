/* Character: a stylised, respectful likeness of Prof. Vaishali Ingale (from her photo): shoulder-length
   voluminous wavy black hair worn open, black saree with a gold embroidered border and pallu over her
   left shoulder, black blouse, blue patterned ID lanyard, red lips, small earrings. ~1:6.5 head ratio.
   Plus her own stylised scooter.
   Parked at a place: she stands, scooter beside her, idle breathing and a look-around.
   Moving between places: she sits on the scooter; wheels spin with distance, the rig leans into
   curves and bounces softly. Swap build() for a modelled GLB in M3; the API stays:
   group, setMotion(speed, yawRate), update(ctx). */
import * as THREE from 'three';
import { mat, PALETTE as P } from './materials.js';

/* gold/mustard embroidered border: repeating paisley-ish motifs on black */
function borderTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#c99a3a'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#1d1a1f'; g.fillRect(0, 26, 256, 12);
  g.fillStyle = '#e8c26a';
  for (let x = 8; x < 256; x += 32) { g.beginPath(); g.ellipse(x + 8, 14, 7, 5, 0.6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x + 8, 50, 7, 5, -0.6, 0, Math.PI * 2); g.fill(); g.fillRect(x + 4, 30, 8, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
/* blue lanyard ribbon with a white repeating pattern */
function lanyardTexture() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#2f5fb3'; g.fillRect(0, 0, 32, 256); g.fillStyle = '#ffffff';
  for (let y = 6; y < 256; y += 22) { g.fillRect(8, y, 16, 4); g.fillRect(14, y + 8, 4, 6); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

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
    const m = (g, mt, x, y, z, p = body) => this._m(g, mt, x, y, z, p);
    // palette from her photo: black saree + blouse, mustard/gold embroidered border, warm brown skin
    const black = mat('#1d1a1f', { roughness: 0.7 }), skin = mat('#a8714f', { roughness: 0.6 }), hairM = mat('#141012', { roughness: 0.55, flatShading: true });
    const goldTex = borderTexture(), gold = new THREE.MeshStandardMaterial({ map: goldTex, roughness: 0.45, metalness: 0.25 });
    const goldPlain = mat('#c99a3a', { roughness: 0.4, metalness: 0.35 });
    // --- saree skirt (feet 0 -> waist 1.0), slim and gently flared; embroidered hem band
    const prof = [new THREE.Vector2(0, 0)];
    for (let i = 0; i <= 16; i++) { const y = i / 16; prof.push(new THREE.Vector2(0.15 + (1 - y) * 0.1 + Math.sin(y * Math.PI) * 0.02, y * 1.0)); }
    prof.push(new THREE.Vector2(0, 1.0));
    this.skirt = m(new THREE.LatheGeometry(prof, 32), black, 0, 0.01, 0);
    const hemTex = goldTex.clone(); hemTex.repeat.set(6, 1); hemTex.needsUpdate = true;
    this.hem = m(new THREE.CylinderGeometry(0.252, 0.256, 0.13, 32, 1, true), new THREE.MeshStandardMaterial({ map: hemTex, roughness: 0.45, metalness: 0.25, side: THREE.DoubleSide }), 0, 0.075, 0);
    // front pleats with a gold edge (the saree's tucked fall)
    const pleat = m(new THREE.BoxGeometry(0.05, 0.86, 0.015), gold, 0.05, 0.5, 0.2); pleat.rotation.x = -0.115; this.pleat = pleat;
    // --- torso: black blouse, narrow waist
    m(new THREE.CapsuleGeometry(0.115, 0.3, 6, 16), black, 0, 1.24, 0).scale.set(1.15, 1, 0.78);
    m(new THREE.CylinderGeometry(0.135, 0.15, 0.1, 20), black, 0, 1.03, 0);
    // --- pallu over her LEFT shoulder (local +x): front diagonal + long fall down the back, gold borders
    const pf = m(new THREE.BoxGeometry(0.11, 0.6, 0.02), black, 0.03, 1.27, 0.098); pf.rotation.z = -0.42;
    const pfb = m(new THREE.BoxGeometry(0.03, 0.62, 0.022), gold, 0.08, 1.29, 0.103); pfb.rotation.z = -0.42;
    const pallu = (this.pallu = new THREE.Group()); pallu.position.set(0.12, 1.5, -0.08); body.add(pallu);
    m(new THREE.BoxGeometry(0.2, 0.95, 0.025), black, 0, -0.47, 0, pallu);
    m(new THREE.BoxGeometry(0.21, 0.12, 0.03), gold, 0, -0.9, 0, pallu);
    m(new THREE.BoxGeometry(0.04, 0.95, 0.03), gold, 0.09, -0.47, 0, pallu);
    pallu.rotation.set(0.12, 0, 0.12);
    m(new THREE.SphereGeometry(0.075, 14, 10), black, 0.15, 1.5, 0, body).scale.set(1, 0.6, 1.1);      // drape over the shoulder
    // --- lanyard: blue patterned ribbon in a V to a white ID card
    const lanTex = lanyardTexture(), lan = new THREE.MeshStandardMaterial({ map: lanTex, roughness: 0.6 });
    [-1, 1].forEach((sd) => { const r = m(new THREE.BoxGeometry(0.028, 0.36, 0.008), lan, 0.05 * sd, 1.42, 0.103); r.rotation.z = 0.15 * sd; r.rotation.x = -0.12; });
    m(new THREE.BoxGeometry(0.075, 0.1, 0.008), mat('#f4f4f2'), 0, 1.2, 0.118);
    m(new THREE.BoxGeometry(0.05, 0.02, 0.009), mat('#3b62b0'), 0, 1.235, 0.119);
    // --- neck and head (head ~1/6.5 of height)
    m(new THREE.CylinderGeometry(0.042, 0.05, 0.12, 14), skin, 0, 1.6, 0.0);
    const head = (this.head = new THREE.Group()); head.position.set(0, 1.76, 0.01); body.add(head);
    m(new THREE.SphereGeometry(0.105, 28, 22), skin, 0, 0, 0, head).scale.set(0.88, 1.12, 0.96);
    m(new THREE.SphereGeometry(0.06, 16, 12), skin, 0, -0.055, 0.03, head).scale.set(1.1, 0.8, 1);   // jaw/chin
    // face: brows, eyes, nose, red lips, small earrings
    const ink = mat('#1a1214', { roughness: 0.4 });
    [-1, 1].forEach((sd) => {
      m(new THREE.SphereGeometry(0.017, 12, 8), mat('#f5efe8'), 0.034 * sd, 0.012, 0.087, head).scale.set(1.3, 0.8, 0.5);
      m(new THREE.SphereGeometry(0.0105, 10, 8), ink, 0.034 * sd, 0.012, 0.094, head);
      const brow = m(new THREE.BoxGeometry(0.04, 0.008, 0.008), ink, 0.036 * sd, 0.042, 0.091, head); brow.rotation.z = -0.15 * sd;
      m(new THREE.SphereGeometry(0.011, 8, 6), goldPlain, 0.093 * sd, -0.03, 0.0, head);            // earring stud
      m(new THREE.SphereGeometry(0.009, 8, 6), mat('#b3282d'), 0.093 * sd, -0.05, 0.0, head);       // red drop
    });
    m(new THREE.SphereGeometry(0.013, 8, 6), skin, 0, -0.012, 0.1, head).scale.set(0.9, 1.2, 0.8);    // nose
    m(new THREE.SphereGeometry(0.02, 12, 8), mat('#a3222a', { roughness: 0.35 }), 0, -0.05, 0.088, head).scale.set(1.25, 0.42, 0.5);
    // hair: voluminous, shoulder-length, wavy, worn open; side parting; faceted waves
    const H = (r, x, y, z, sx = 1, sy = 1, sz = 1) => m(new THREE.IcosahedronGeometry(r, 2), hairM, x, y, z, head).scale.set(sx, sy, sz);
    H(0.118, 0, 0.035, -0.012, 0.98, 0.95, 1.0);              // crown
    H(0.05, 0.04, 0.11, 0.03, 1.4, 0.5, 1);                    // side-parted fringe sweep (above the brows)
    H(0.042, -0.055, 0.1, 0.035, 1, 0.55, 1);
    [-1, 1].forEach((sd) => {
      H(0.066, 0.108 * sd, -0.02, -0.03, 0.75, 1.2, 1);         // sides framing the face
      H(0.07, 0.11 * sd, -0.12, -0.03, 0.9, 1.1, 1);           // waves at the jaw
      H(0.075, 0.12 * sd, -0.21, -0.05, 1, 1.0, 0.9);          // ends resting on the shoulders
      H(0.06, 0.14 * sd, -0.27, -0.06, 1, 0.8, 0.8);
    });
    H(0.13, 0, -0.06, -0.07, 1.1, 1.2, 0.8);                    // back volume
    H(0.11, 0, -0.2, -0.08, 1.3, 1.0, 0.7);                     // back ends
    // --- arms: short black sleeve, forearm, hand, one gold bangle
    const arm = (side) => {
      const piv = new THREE.Group(); piv.position.set(0.17 * side, 1.47, 0); body.add(piv);
      m(new THREE.CapsuleGeometry(0.048, 0.08, 4, 12), black, 0, -0.05, 0, piv);
      m(new THREE.CapsuleGeometry(0.038, 0.2, 4, 12), skin, 0, -0.18, 0, piv);
      const elbow = new THREE.Group(); elbow.position.set(0, -0.29, 0); piv.add(elbow);
      m(new THREE.CapsuleGeometry(0.032, 0.2, 4, 12), skin, 0, -0.12, 0, elbow);
      m(new THREE.SphereGeometry(0.038, 12, 10), skin, 0, -0.26, 0.005, elbow).scale.set(0.8, 1.1, 0.6);
      if (side < 0) { const b = m(new THREE.TorusGeometry(0.036, 0.007, 6, 16), goldPlain, 0, -0.2, 0, elbow); b.rotation.x = Math.PI / 2; }
      piv.userData.elbow = elbow; piv.rotation.z = 0.08 * side; return piv;
    };
    this.armL = arm(1); this.armR = arm(-1);   // armL = her left (+x)
    // --- seated drape for riding: lap over the seat, black fall with gold hem over the board, feet
    const seat = (this.seated = new THREE.Group()); body.add(seat);
    m(new THREE.CapsuleGeometry(0.135, 0.28, 6, 14), black, 0, 0.98, 0.1, seat).rotation.x = Math.PI / 2;
    const fall = m(new THREE.BoxGeometry(0.32, 0.56, 0.08), black, 0, 0.67, 0.33, seat); fall.rotation.x = 0.1;
    m(new THREE.BoxGeometry(0.33, 0.09, 0.09), gold, 0, 0.42, 0.36, seat);
    [-0.07, 0.07].forEach((x) => m(new THREE.SphereGeometry(0.045, 10, 8), mat('#2a2023'), x, 0.39, 0.44, seat).scale.set(1, 0.6, 1.6));
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.6, 24), new THREE.MeshBasicMaterial({ color: '#3a2a35', transparent: true, opacity: 0.18, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; this.group.add(blob);
  }
  buildScooter() {
    const s = (this.scooter = new THREE.Group()); this.rig.add(s);
    const m = (g, mat, x, y, z, p = s) => this._m(g, mat, x, y, z, p);
    const B = mat(SCOOT.body);
    m(new THREE.BoxGeometry(0.42, 0.1, 0.9), mat(SCOOT.dark), 0, 0.32, 0.05);           // floorboard
    const rear = m(new THREE.CapsuleGeometry(0.26, 0.5, 6, 16), B, 0, 0.6, -0.42); rear.rotation.x = Math.PI / 2; rear.scale.set(1, 1, 0.9);
    m(new THREE.BoxGeometry(0.36, 0.1, 0.62), mat(SCOOT.seat), 0, 0.88, -0.4);             // seat
    const shield = m(new THREE.CapsuleGeometry(0.2, 0.55, 6, 14), B, 0, 0.75, 0.5); shield.rotation.x = -0.25; shield.scale.z = 0.55;
    const stem = m(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mat(SCOOT.chrome), 0, 1.08, 0.45); stem.rotation.x = -0.45;
    const bar = m(new THREE.CapsuleGeometry(0.035, 0.6, 4, 8), mat(SCOOT.dark), 0, 1.28, 0.34); bar.rotation.z = Math.PI / 2;
    m(new THREE.SphereGeometry(0.09, 14, 10), mat(SCOOT.light, { emissive: '#fff1b0', emissiveIntensity: 0.4 }), 0, 1.18, 0.62);
    const fender = m(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), B, 0, 0.26, 0.62); fender.scale.set(0.7, 0.8, 1);
    this.wheels = [0.62, -0.55].map((z) => {
      const w = new THREE.Group(); w.position.set(0, 0.22, z); s.add(w);
      const tyre = m(new THREE.TorusGeometry(0.17, 0.065, 10, 20), mat(SCOOT.tyre), 0, 0, 0, w); tyre.rotation.y = Math.PI / 2;
      const hub = m(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 10), mat(SCOOT.chrome), 0, 0, 0, w); hub.rotation.z = Math.PI / 2;
      m(new THREE.BoxGeometry(0.11, 0.2, 0.03), mat(SCOOT.chrome), 0, 0, 0, w);          // spoke marker, shows the spin
      return w;
    });
  }
  setMotion(speed, yawRate, canRide = true, hasScooter = true) { this.speed = speed; this.yawRate = yawRate; this.canRide = canRide; this.scooter.visible = hasScooter; }
  update({ dt, t }) {
    const k = 1 - Math.exp(-dt * 5);                 // frame-rate independent smoothing
    const riding = this.speed > 0.6 && this.canRide !== false ? 1 : 0;
    const walk = this.speed > 0.6 && !riding ? Math.min(1, this.speed / 3) : 0;
    this.walk = (this.walk || 0) + (walk - (this.walk || 0)) * k;
    this.ride += (riding - this.ride) * (1 - Math.exp(-dt * 6));
    const r = THREE.MathUtils.smoothstep(this.ride, 0, 1);
    this.dist += this.speed * dt;
    // scooter: parked to her right, slides under her when she rides
    this.scooter.position.set(1.15 * (1 - r), 0, 0.15 * (1 - r));
    this.scooter.rotation.y = 0.35 * (1 - r);
    this.wheels.forEach((w) => (w.rotation.x += (this.speed * dt) / 0.24));
    // figure: stand -> sit on the seat, arms to the handlebar
    this.body.position.set(0, -0.02 * r, -0.2 * r);
    const st = Math.max(0.001, 1 - r);
    this.skirt.scale.set(1, st, 1); this.hem.scale.set(1, st, 1); this.hem.position.y = 0.075 * st; this.pleat.scale.y = st; this.pleat.position.y = 0.5 * st;
    this.seated.scale.setScalar(Math.max(0.001, r)); this.seated.visible = r > 0.01;
    this.pallu.scale.y = 1 - 0.5 * r;
    const lean = THREE.MathUtils.clamp(-this.yawRate * 0.35, -0.3, 0.3) * r;
    this.lean += (lean - this.lean) * k;
    if (this.reduced) {
      this.rig.rotation.z = 0; this.rig.position.y = 0;
      this.armL.rotation.x = this.armR.rotation.x = -1.0 * r;
      this.armL.userData.elbow.rotation.x = this.armR.userData.elbow.rotation.x = -0.5 * r; return;
    }
    this.rig.rotation.z = this.lean;
    this.rig.position.y = r * Math.abs(Math.sin(this.dist * 2.2)) * 0.035;            // road bounce
    const idle = 1 - r;
    this.body.position.y += idle * Math.sin(t * 1.6) * 0.01;
    // walking on foot: step bob, hip sway, arm swing
    const wk = this.walk, ph = this.dist * 3.2;
    this.rig.position.y += wk * Math.abs(Math.sin(ph)) * 0.05;
    this.body.rotation.z = wk * Math.sin(ph) * 0.04;
    this.skirt.rotation.y = wk * Math.sin(ph) * 0.08;
    // arms swing opposite each other; elbows soften on the back swing; on the scooter they reach the grips
    const swing = wk * Math.sin(ph) * 0.38, breathe = Math.sin(t * 1.6) * 0.03 * (1 - wk);
    this.armL.rotation.x = -1.0 * r + idle * (swing + breathe);
    this.armR.rotation.x = -1.0 * r + idle * (-swing + breathe);
    this.armL.userData.elbow.rotation.x = -0.5 * r - idle * (0.12 + Math.max(0, swing) * 0.4);
    this.armR.userData.elbow.rotation.x = -0.5 * r - idle * (0.12 + Math.max(0, -swing) * 0.4);
    this.head.rotation.x = idle * wk * Math.sin(ph * 2) * 0.02;
    this.head.rotation.y = idle * Math.sin(t * 0.4) * 0.25;
    this.armL.rotation.z = 0.08 - r * 0.1; this.armR.rotation.z = -0.08 + r * 0.1;   // hands in to the grips
  }
}
