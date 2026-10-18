/* Character: a stylised, respectful likeness of Prof. Vaishali Ingale (from her photo): shoulder-length
   voluminous wavy black hair worn open, black saree with a gold embroidered border and pallu over her
   left shoulder, black blouse, blue patterned ID lanyard, red lips, small earrings. ~1:6.5 head ratio.
   Plus her own stylised scooter.
   Parked at a place: she stands, scooter beside her, idle breathing and a look-around.
   Moving between places: she sits on the scooter; wheels spin with distance, the rig leans into
   curves and bounces softly. Swap build() for a modelled GLB in M3; the API stays:
   group, setMotion(speed, yawRate), update(ctx). */
import * as THREE from 'three';
import { mat, REAL, PALETTE as P } from './materials.js';

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

const SCOOT = { body: '#6e1a1f', dark: '#1d1e20', seat: '#231c1a', chrome: '#d4d7da', tyre: '#151515', light: '#fff4c7' };

/* Rigged likeness (GLB, Draco) made by room/tools/blender/ingale_rig.py. Clips: Idle, Walk, Sit, StandToSit,
   SitToStand. The procedural figure below stays as the fallback (no WASM, load error, ?proc). */
const MODEL_URL = new URL('../../assets/ingale.glb', import.meta.url).href;
const DRACO_PATH = new URL('../../../room/vendor/draco/', import.meta.url).href;
const MODEL_SCALE = 1.17;          // Blender model is 1.62 m; the world was laid out for a ~1.9 m figure

export class Character {
  constructor() {
    this.group = new THREE.Group(); this.group.name = 'professor';
    this.rig = new THREE.Group(); this.group.add(this.rig);
    this.speed = 0; this.yawRate = 0; this.ride = 0; this.lean = 0; this.dist = 0; this.reduced = false;
    this.buildFigure(); this.buildScooter();
    this.model = null; this.mixer = null; this.ringBoost = 0;
    this.buildHighlight();
  }
  /* soft highlight so she reads from far away (aerial Home view, first walk frames): a warm glow disc on the
     ground plus a gentle rim light from in front/above (the camera is usually behind her) */
  buildHighlight() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const rg = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    rg.addColorStop(0, 'rgba(255,240,214,0.85)'); rg.addColorStop(0.55, 'rgba(255,214,190,0.35)'); rg.addColorStop(1, 'rgba(255,214,190,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.glow.rotation.x = -Math.PI / 2; this.glow.position.y = 0.03; this.glow.renderOrder = 2; this.glow.userData.noOcclude = true;
    this.group.add(this.glow);
    this.rim = new THREE.PointLight('#ffd6c4', 6, 5, 1.6); this.rim.position.set(0.4, 2.3, 1.3); this.group.add(this.rim);
  }
  /* Load the rigged model; resolves true when it replaced the procedural figure. */
  async loadModel() {
    if (/[?&]proc\b/.test(location.search) || typeof WebAssembly !== 'object') return false;
    try {
      const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([import('../../../room/vendor/GLTFLoader.js'), import('../../../room/vendor/draco/DRACOLoader.js')]);
      const draco = new DRACOLoader(); draco.setDecoderPath(DRACO_PATH); draco.setDecoderConfig({ type: 'wasm' });
      const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
      const gltf = await loader.loadAsync(MODEL_URL);
      draco.dispose();
      const root = gltf.scene; root.scale.setScalar(MODEL_SCALE);
      root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) o.material = this._realMat(o.material); } });
      this.holder = new THREE.Group(); this.holder.add(root); this.rig.add(this.holder);
      this.mixer = new THREE.AnimationMixer(root); this.clips = {};
      for (const c of gltf.animations) { const a = this.mixer.clipAction(c); a.play(); a.setEffectiveWeight(0); this.clips[c.name] = a; }
      for (const n of ['StandToSit', 'SitToStand']) if (this.clips[n]) { this.clips[n].setLoop(THREE.LoopOnce); this.clips[n].clampWhenFinished = true; this.clips[n].paused = true; }
      this.body.visible = false; this.model = root;
      return true;
    } catch (e) { console.info('character: using the procedural figure (' + (e && e.message) + ')'); return false; }
  }
  /* Realism pass on the baked GLB materials, by name: skin gets a soft reddish grazing sheen (cheap
     subsurface hint), hair an anisotropic highlight, saree/blouse a silk sheen, gold a metal response;
     the eye whites are dimmed and the glossy iris toned down so the eyes read less cartoon-like. */
  _realMat(m) {
    const n = m.name || '', lite = REAL.lite;
    const phys = (extra) => { if (lite) { Object.assign(m, { roughness: extra.roughness ?? m.roughness }); return m; }
      const p = new THREE.MeshPhysicalMaterial({ name: n, map: m.map, normalMap: m.normalMap, color: m.color, roughness: m.roughness, metalness: m.metalness, side: m.side, transparent: m.transparent, alphaTest: m.alphaTest });
      Object.assign(p, extra); if (extra.sheenColor) p.sheenColor = new THREE.Color(extra.sheenColor); m.dispose(); return p; };
    let out = m;
    if (/skin|lips/.test(n)) { if (/skin/.test(n)) m.color.multiplyScalar(0.88); out = phys({ roughness: 0.5, sheen: 0.3, sheenColor: '#c0604a', sheenRoughness: 0.55 }); }
    else if (n === 'hair') { m.color.multiplyScalar(0.55); out = phys({ roughness: 0.45, sheen: 0.3, sheenColor: '#4a3a32', sheenRoughness: 0.3, specularIntensity: 0.5 }); }
    else if (/saree|blouse|pallu/.test(n)) out = phys({ roughness: 0.66, sheen: 0.5, sheenColor: '#6e5f58', sheenRoughness: 0.3 });
    else if (/gold/.test(n)) out = phys({ roughness: 0.32, metalness: 0.85 });
    else if (n === 'eye_white') { m.color.multiplyScalar(0.8); m.roughness = 0.2; }
    else if (n === 'iris') { m.roughness = 0.12; m.color.multiplyScalar(0.85); }
    out.envMapIntensity = 0.7;
    return out;
  }
  /* Drive the clip weights from the same walk / ride blend the procedural figure uses. */
  _animateModel(dt, r) {
    const C = this.clips, wk = this.walk || 0;
    // stand <-> sit: scrub the transition clip by the ride blend (forward when mounting, reverse when stepping off)
    const goingUp = (this._prevR || 0) > r; this._prevR = r;
    const tr = goingUp ? C.SitToStand : C.StandToSit, other = goingUp ? C.StandToSit : C.SitToStand;
    const tw = 4 * r * (1 - r);
    if (tr) { tr.time = (goingUp ? 1 - r : r) * tr.getClip().duration; tr.setEffectiveWeight(tw); }
    if (other) other.setEffectiveWeight(0);
    const rest = 1 - tw;
    C.Idle && C.Idle.setEffectiveWeight(rest * (1 - r) * (1 - wk));
    if (C.Walk) { C.Walk.setEffectiveWeight(rest * (1 - r) * wk); C.Walk.time = ((this.dist * 0.55) % 1) * C.Walk.getClip().duration; }
    C.Sit && C.Sit.setEffectiveWeight(rest * r);
    this.mixer.update(this.reduced ? 0 : dt);
    this.holder.position.set(0, 0, -0.2 * r);
  }
  _m(geo, mat, x, y, z, parent) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; }
  buildFigure() {
    const body = (this.body = new THREE.Group()); this.rig.add(body);
    const m = (g, mt, x, y, z, p = body) => this._m(g, mt, x, y, z, p);
    // palette from her photo: black saree + blouse, mustard/gold embroidered border, warm brown skin
    const black = mat('#1d1a1f', { roughness: 0.7 }), skin = mat('#a8714f', { roughness: 0.6 });
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
    // face: almond eyes (white, iris, lid line), arched brows, red lips; all smooth-shaded
    const ink = mat('#1a1214', { roughness: 0.4 }), white = mat('#f3ece4', { roughness: 0.3 });
    const iris = mat('#2b1a14', { roughness: 0.25 });
    [-1, 1].forEach((sd) => {
      const ex = 0.033 * sd, ey = 0.014, ez = 0.083;
      m(new THREE.SphereGeometry(0.019, 20, 14), white, ex, ey, ez, head).scale.set(1.35, 0.72, 0.55);
      m(new THREE.SphereGeometry(0.0115, 16, 12), iris, ex, ey, ez + 0.007, head).scale.set(1, 1, 0.5);
      m(new THREE.SphereGeometry(0.0026, 8, 6), white, ex + 0.003, ey + 0.003, ez + 0.0115, head);  // catchlight
      const lid = m(new THREE.TorusGeometry(0.024, 0.0032, 6, 18, Math.PI), ink, ex, ey + 0.001, ez + 0.003, head);
      lid.scale.set(1.05, 0.55, 1);
      const brow = m(new THREE.TorusGeometry(0.026, 0.0042, 6, 18, Math.PI * 0.8), ink, ex + 0.002 * sd, 0.026, 0.088, head);
      brow.rotation.z = Math.PI * 0.1; brow.scale.set(1, 0.5, 0.6);
      m(new THREE.SphereGeometry(0.011, 12, 8), goldPlain, 0.093 * sd, -0.03, 0.0, head);            // earring stud
      m(new THREE.SphereGeometry(0.009, 12, 8), mat('#b3282d'), 0.093 * sd, -0.05, 0.0, head);       // red drop
    });
    m(new THREE.SphereGeometry(0.013, 14, 10), skin, 0, -0.012, 0.098, head).scale.set(0.85, 1.3, 0.8);    // nose
    const lipM = mat('#a3222a', { roughness: 0.35 });
    m(new THREE.SphereGeometry(0.018, 18, 12), lipM, 0, -0.045, 0.089, head).scale.set(1.3, 0.32, 0.5);  // upper lip
    m(new THREE.SphereGeometry(0.017, 18, 12), lipM, 0, -0.054, 0.087, head).scale.set(1.2, 0.4, 0.5);   // lower lip
    // hair: smooth lathed shells with soft waves, centre-side parting, open and shoulder length.
    // cap: thin shell hugging the skull, cut away over the face so the forehead stays clear
    const hairM2 = mat('#141012', { roughness: 0.42, metalness: 0.05 });
    const cap = new THREE.SphereGeometry(0.118, 40, 28, Math.PI * 0.62, Math.PI * 1.76, 0, Math.PI * 0.62);
    m(cap, hairM2, 0, 0.012, -0.004, head).scale.set(0.92, 1.0, 1.0);
    const front = new THREE.SphereGeometry(0.119, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.2);      // crown over the hairline
    m(front, hairM2, 0, 0.014, 0.0, head).scale.set(0.92, 1.0, 1.02);
    // parting: two swept wings from a parting slightly to her right, curving down past the temples
    [-1, 1].forEach((sd) => {
      const pts = []; const wide = sd > 0 ? 1.0 : 0.9;
      for (let i = 0; i <= 24; i++) {
        const v = i / 24, y = 0.07 - v * 0.38;
        const rad = (0.035 + Math.sin(Math.min(1, v * 1.6) * Math.PI * 0.5) * 0.085 + Math.sin(v * Math.PI * 5) * 0.02 * v) * wide;
        pts.push(new THREE.Vector2(Math.max(0.005, rad), y));
      }
      // half-lathe that covers the side and back only (front quadrant open for the face)
      const g = new THREE.LatheGeometry(pts, 36, sd > 0 ? Math.PI * 0.3 : Math.PI, Math.PI * 0.7);
      g.computeVertexNormals();
      const w = m(g, hairM2, 0.03 * sd, 0.0, -0.02, head); w.scale.set(0.95, 1, 0.9);
    });
    // swept lock from the parting, up on the crown and off the forehead
    const sweep = m(new THREE.SphereGeometry(0.06, 24, 14), hairM2, 0.03, 0.082, 0.03, head);
    sweep.scale.set(1.15, 0.26, 1.0); sweep.rotation.z = -0.25;
    // back volume to the shoulders
    const back = []; for (let i = 0; i <= 24; i++) { const v = i / 24; back.push(new THREE.Vector2(0.02 + Math.sin(Math.min(1, v * 1.4) * Math.PI * 0.5) * 0.12 + Math.sin(v * 9) * 0.008, 0.06 - v * 0.36)); }
    m(new THREE.LatheGeometry(back, 36, Math.PI * 0.55, Math.PI * 0.9), hairM2, 0, 0, -0.04, head).scale.set(1.05, 1, 0.75);
    // --- arms: tapered lathed limbs with a soft elbow bend, short black sleeve, hands, one gold bangle
    const limb = (r0, r1, len) => {
      const pts = []; for (let i = 0; i <= 12; i++) { const v = i / 12; const rr = r0 + (r1 - r0) * v + Math.sin(v * Math.PI) * 0.006; pts.push(new THREE.Vector2(rr, -len * v)); }
      pts.unshift(new THREE.Vector2(0.001, 0.004)); pts.push(new THREE.Vector2(0.001, -len - 0.004));
      return new THREE.LatheGeometry(pts, 18);
    };
    const arm = (side) => {
      const piv = new THREE.Group(); piv.position.set(0.17 * side, 1.47, 0); body.add(piv);
      m(new THREE.SphereGeometry(0.052, 18, 14), black, 0, -0.02, 0, piv).scale.set(1, 1.15, 1);          // sleeve cap
      m(limb(0.05, 0.043, 0.1), black, 0, -0.01, 0, piv);                                                 // sleeve
      m(limb(0.038, 0.03, 0.28), skin, 0, -0.02, 0, piv);                                                 // upper arm
      const elbow = new THREE.Group(); elbow.position.set(0, -0.29, 0); piv.add(elbow);
      m(new THREE.SphereGeometry(0.03, 14, 10), skin, 0, 0, 0, elbow);
      m(limb(0.03, 0.021, 0.23), skin, 0, 0, 0, elbow);                                                   // forearm to wrist
      const hand = m(new THREE.SphereGeometry(0.03, 16, 12), skin, 0, -0.26, 0.004, elbow); hand.scale.set(0.7, 1.25, 0.45);
      m(new THREE.CapsuleGeometry(0.008, 0.03, 4, 8), skin, 0.018 * side, -0.25, 0.012, elbow).rotation.z = 0.5 * side;  // thumb
      if (side < 0) { const bg = m(new THREE.TorusGeometry(0.027, 0.006, 8, 20), goldPlain, 0, -0.21, 0, elbow); bg.rotation.x = Math.PI / 2; }
      piv.userData.elbow = elbow; piv.rotation.z = 0.1 * side; elbow.rotation.x = -0.18; return piv;
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
    // metallic paint with clearcoat, textured black plastic, chrome, rubber
    const B = REAL.lite ? mat(SCOOT.body, { roughness: 0.35, metalness: 0.4 }) : new THREE.MeshPhysicalMaterial({ color: SCOOT.body, metalness: 0.6, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.06 });
    const PL = mat(SCOOT.dark, { roughness: 0.75 }), CH = mat(SCOOT.chrome, { metalness: 1, roughness: 0.12 }), TY = mat(SCOOT.tyre, { roughness: 0.95 });
    m(new THREE.BoxGeometry(0.42, 0.1, 0.9), PL, 0, 0.32, 0.05);           // floorboard
    const rear = m(new THREE.CapsuleGeometry(0.26, 0.5, 6, 16), B, 0, 0.6, -0.42); rear.rotation.x = Math.PI / 2; rear.scale.set(1, 1, 0.9);
    m(new THREE.BoxGeometry(0.36, 0.1, 0.62), mat(SCOOT.seat, { roughness: 0.55 }), 0, 0.88, -0.4);             // seat
    const shield = m(new THREE.CapsuleGeometry(0.2, 0.55, 6, 14), B, 0, 0.75, 0.5); shield.rotation.x = -0.25; shield.scale.z = 0.55;
    const stem = m(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), CH, 0, 1.08, 0.45); stem.rotation.x = -0.45;
    const bar = m(new THREE.CapsuleGeometry(0.035, 0.6, 4, 8), PL, 0, 1.28, 0.34); bar.rotation.z = Math.PI / 2;
    m(new THREE.SphereGeometry(0.09, 14, 10), mat(SCOOT.light, { emissive: '#fff1b0', emissiveIntensity: 0.4 }), 0, 1.18, 0.62);
    const fender = m(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), B, 0, 0.26, 0.62); fender.scale.set(0.7, 0.8, 1);
    this.wheels = [0.62, -0.55].map((z) => {
      const w = new THREE.Group(); w.position.set(0, 0.22, z); s.add(w);
      const tyre = m(new THREE.TorusGeometry(0.17, 0.065, 10, 20), TY, 0, 0, 0, w); tyre.rotation.y = Math.PI / 2;
      const hub = m(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 10), CH, 0, 0, 0, w); hub.rotation.z = Math.PI / 2;
      m(new THREE.BoxGeometry(0.11, 0.2, 0.03), CH, 0, 0, 0, w);          // spoke marker, shows the spin
      return w;
    });
  }
  setMotion(speed, yawRate, canRide = true, hasScooter = true) { this.speed = speed; this.yawRate = yawRate; this.canRide = canRide; this.scooter.visible = hasScooter; }
  update({ dt, t }) {
    if (this.glow) { const b = this.ringBoost || 0; this.glow.scale.setScalar(1 + 4 * b); this.glow.material.opacity = 0.55 + 0.45 * b - 0.4 * (this.ride || 0); this.rim.intensity = 6 + 10 * b; }
    const k = 1 - Math.exp(-dt * 5);                 // frame-rate independent smoothing
    // rest timer: once she has been slow for 0.35 s she steps off, even if the spring tail is still creeping
    this.slow = this.speed < 1.2 ? (this.slow || 0) + dt : 0;
    const riding = this.speed > 0.6 && this.slow < 0.35 && this.canRide !== false ? 1 : 0;
    const walk = this.speed > 0.6 && !riding && this.slow < 0.35 ? Math.min(1, this.speed / 3) : 0;
    this.walk = (this.walk || 0) + (walk - (this.walk || 0)) * k;
    this.ride += (riding - this.ride) * (1 - Math.exp(-dt * 6));
    const r = THREE.MathUtils.smoothstep(this.ride, 0, 1);
    this.dist += this.speed * dt;
    // scooter: parked to her right, slides under her when she rides
    this.scooter.position.set(1.15 * (1 - r), 0, 0.15 * (1 - r));
    this.scooter.rotation.y = 0.35 * (1 - r);
    this.wheels.forEach((w) => (w.rotation.x += (this.speed * dt) / 0.24));
    if (this.model) { this._animateModel(dt, r); const lean = THREE.MathUtils.clamp(-this.yawRate * 0.35, -0.3, 0.3) * r; this.lean += (lean - this.lean) * k; this.rig.rotation.z = this.reduced ? 0 : this.lean; this.rig.position.y = this.reduced ? 0 : r * Math.abs(Math.sin(this.dist * 2.2)) * 0.035; return; }
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
