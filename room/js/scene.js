/* The office, built from simple shapes. Three.js (MIT) draws it, GSAP moves the camera.
   Optional imported props (js/props.js, role P) are attached through o.props.attach(ctx): see
   /workspace/site_build/v3/HOOK_P.md. Room metres: x -2.4..2.4 (left wall has the window),
   z -2.4 (back wall) .. 2.6 (front wall with the door), y 0..2.8. Anchors (fixed, ctx.anchors):
     chalkboard  ( 1.98, 0,    -1.05)  rotY -1.15  floor, beside the bookshelf, facing the room/door
     plant       (-2.33, 0.90, -1.60)  rotY  0     windowsill top (sill is 0.16 m deep, x -2.45..-2.29)
     clock       ( 0.00, 2.47,  2.59)  rotY  PI    front wall above the door, face toward -z (into the room)
     lamp        (-0.86, 0.75, -2.16)  rotY  0     desk top where the code-built lamp stands (named.lamp)
     floor       ( 0.00, 0.00,  0.10)  rotX -PI/2  centre of the 4.8 x 5.0 m floor plane (named.floor)
     shelfTop    ( 1.42, 1.92, -2.23)  rotY  0     top board of the bookshelf (0.92 x 0.32 m) */
import * as THREE from '../vendor/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const gsap = window.gsap;

const PAL = {
  bg: '#fbf4ec',
  wall: '#f1e4d5',
  wallBack: '#f4e9dc',
  outside: '#f2e7da',
  ceiling: '#f6eee4',
  floor: '#d8bd9b',
  trim: '#f8f1e8',
  oak: '#c69d70',
  oakDark: '#a57b52',
  ink: '#2b2420',
  linen: '#f2e9de',
  shelf: '#efe5d8',
  alu: '#cdc6bd',
  aluDark: '#b4aca2',
  bezel: '#1d1a17',
  sage: '#7f8f70',
  sageDark: '#62735a',
  pot: '#e4d6c4',
  books: ['#b0643a', '#c98e5d', '#e7d3bd', '#8a9a7b', '#4a4440', '#d9b99b', '#9c6b4e', '#efe2d0', '#b7a48c', '#e2c4a6']
};

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cssGradient(ctx, w, h, deg, stops) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const cx = w / 2, cy = h / 2;
  const g = ctx.createLinearGradient(cx - (dx * len) / 2, cy - (dy * len) / 2, cx + (dx * len) / 2, cy + (dy * len) / 2);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export async function createScene(container, o) {
  const phone = !!o.phone;
  const reduced = !!o.reduced;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: !!o.strictPerf
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 1.75));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(PAL.bg, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.bg);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.01, 40);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  o.onProgress && o.onProgress(0.2);

  /* ---------- materials and helpers ---------- */
  const mats = new Map();
  function mat(color, rough = 0.88, metal = 0) {
    const k = color + rough + metal;
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
    return mats.get(k);
  }
  function box(w, h, d, m, { r = 0, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true, receive = true, parent = scene } = {}) {
    const g = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(g, typeof m === 'string' ? mat(m) : m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = cast; mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }
  function cyl(rt, rb, h, m, { x = 0, y = 0, z = 0, rx = 0, rz = 0, seg = 28, parent = scene, cast = true } = {}) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof m === 'string' ? mat(m) : m);
    mesh.position.set(x, y, z); mesh.rotation.set(rx, 0, rz);
    mesh.castShadow = cast; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  // many similar small objects (keys, books, leaves) are drawn in one call each
  function batch(geo, matOpts, parent) {
    const items = [];
    return {
      add(p, r, sc, color) { items.push([p, r, sc, color]); },
      build() {
        const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial(matOpts), items.length);
        const o = new THREE.Object3D(), c = new THREE.Color();
        items.forEach(([p, r, sc, col], i) => {
          o.position.set(p[0], p[1], p[2]); o.rotation.set(r[0], r[1], r[2]); o.scale.set(sc[0], sc[1], sc[2]);
          o.updateMatrix(); m.setMatrixAt(i, o.matrix);
          if (col) m.setColorAt(i, c.set(col));
        });
        m.castShadow = true; m.receiveShadow = true;
        parent.add(m); extraMats.push(m.material);
        return m;
      }
    };
  }
  const extraMats = [];
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  }

  /* ---------- room shell: x -2.4..2.4, z -2.4..2.6, y 0..2.8 ---------- */
  const R = { x0: -2.4, x1: 2.4, z0: -2.4, z1: 2.6, h: 2.8 };
  const floorTex = canvasTex(1024, 1024, (g, w, h) => {
    const rnd = rng(7);
    g.fillStyle = PAL.floor; g.fillRect(0, 0, w, h);
    const n = 8, pw = w / n;
    for (let i = 0; i < n; i++) {
      let y = -rnd() * 400;
      while (y < h) {
        const len = 380 + rnd() * 420;
        const l = 0.965 + rnd() * 0.06;
        g.fillStyle = `rgb(${Math.round(216 * l)},${Math.round(189 * l)},${Math.round(155 * l)})`;
        g.fillRect(i * pw + 1, y + 1, pw - 2, len - 2);
        g.strokeStyle = 'rgba(120,85,50,0.05)';
        for (let k = 0; k < 6; k++) { g.beginPath(); const xx = i * pw + 6 + rnd() * (pw - 12); g.moveTo(xx, y); g.lineTo(xx + (rnd() - 0.5) * 6, y + len); g.stroke(); }
        y += len;
      }
      g.fillStyle = 'rgba(110,78,48,0.16)'; g.fillRect(i * pw, 0, 1.2, h);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(5.5, 2.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.78 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (R.z0 + R.z1) / 2); floor.receiveShadow = true; scene.add(floor);
  const outsideFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), mat('#efe3d4', 1));
  outsideFloor.rotation.x = -Math.PI / 2; outsideFloor.position.set(0, -0.001, R.z1 + 4); outsideFloor.receiveShadow = true; scene.add(outsideFloor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), new THREE.MeshStandardMaterial({ color: PAL.ceiling, roughness: 1, emissive: '#e9dccb', emissiveIntensity: 0.35 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, R.h, (R.z0 + R.z1) / 2); scene.add(ceil);

  const T = 0.12;
  box(R.x1 - R.x0 + 0.24, R.h, T, PAL.wallBack, { x: 0, y: R.h / 2, z: R.z0 - T / 2 });
  box(T, R.h, R.z1 - R.z0, PAL.wall, { x: R.x1 + T / 2, y: R.h / 2, z: (R.z0 + R.z1) / 2 });
  // left wall with a window opening z -1.95..-0.45, y 0.9..2.3
  const W = { z0: -1.95, z1: -0.45, y0: 0.9, y1: 2.3 };
  const lx = R.x0 - T / 2;
  box(T, W.y0, R.z1 - R.z0, PAL.wall, { x: lx, y: W.y0 / 2, z: (R.z0 + R.z1) / 2 });
  box(T, R.h - W.y1, R.z1 - R.z0, PAL.wall, { x: lx, y: (R.h + W.y1) / 2, z: (R.z0 + R.z1) / 2 });
  box(T, W.y1 - W.y0, W.z0 - R.z0, PAL.wall, { x: lx, y: (W.y0 + W.y1) / 2, z: (R.z0 + W.z0) / 2 });
  box(T, W.y1 - W.y0, R.z1 - W.z1, PAL.wall, { x: lx, y: (W.y0 + W.y1) / 2, z: (W.z1 + R.z1) / 2 });
  // window frame and mullions
  const wz = (W.z0 + W.z1) / 2, wy = (W.y0 + W.y1) / 2, ww = W.z1 - W.z0, wh = W.y1 - W.y0;
  const fr = 0.045;
  box(0.07, fr, ww + fr * 2, PAL.trim, { x: R.x0, y: W.y1 + fr / 2, z: wz });
  box(0.16, 0.035, ww + 0.16, PAL.trim, { x: R.x0 + 0.03, y: W.y0 - 0.0175, z: wz });
  box(0.07, wh, fr, PAL.trim, { x: R.x0, y: wy, z: W.z0 - fr / 2 });
  box(0.07, wh, fr, PAL.trim, { x: R.x0, y: wy, z: W.z1 + fr / 2 });
  box(0.04, wh, 0.03, PAL.trim, { x: R.x0 - 0.02, y: wy, z: wz });
  box(0.04, 0.03, ww, PAL.trim, { x: R.x0 - 0.02, y: wy + 0.18, z: wz });
  // the view outside: soft garden, painted
  const skyTex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = cssGradient(g, w, h, 180, [[0, '#fdf7ef'], [0.6, '#f9eadb'], [1, '#f1dcc6']]); g.fillRect(0, 0, w, h);
    const r = rng(3);
    if ('filter' in g) g.filter = 'blur(10px)';
    for (let i = 0; i < 26; i++) {
      g.fillStyle = ['rgba(176,186,152,0.55)', 'rgba(196,201,170,0.6)', 'rgba(160,172,136,0.45)'][i % 3];
      const x = r() * w, y = h * (0.52 + r() * 0.22), s = 40 + r() * 90;
      g.beginPath(); g.ellipse(x, y, s, s * 0.85, 0, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(214,206,178,0.9)'; g.fillRect(0, h * 0.8, w, h * 0.2);
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false }));
  sky.position.set(R.x0 - 2.2, 1.7, wz); sky.rotation.y = Math.PI / 2; scene.add(sky);
  // sheer curtain gathered at the window's room-side edge
  const cg = new THREE.PlaneGeometry(0.42, 2.38, 40, 1);
  const cp = cg.attributes.position;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin((cp.getX(i) + 0.21) * Math.PI * 14) * 0.018);
  cg.computeVertexNormals();
  const curtain = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: '#f5ede3', roughness: 1, side: THREE.DoubleSide }));
  curtain.position.set(R.x0 + 0.11, 1.27, W.z1 + 0.16); curtain.rotation.y = Math.PI / 2; curtain.castShadow = true; curtain.receiveShadow = true; scene.add(curtain);
  cyl(0.008, 0.008, ww + 0.9, PAL.ink, { x: R.x0 + 0.11, y: 2.48, z: wz + 0.2, rx: Math.PI / 2 });

  // front wall with the doorway (x -0.5..0.5, height 2.15)
  const fz = R.z1 + T / 2, D = { x0: -0.5, x1: 0.5, h: 2.15 };
  box(D.x0 - R.x0 + T, R.h, T, PAL.outside, { x: (R.x0 - T + D.x0) / 2, y: R.h / 2, z: fz });
  box(R.x1 + T - D.x1, R.h, T, PAL.outside, { x: (D.x1 + R.x1 + T) / 2, y: R.h / 2, z: fz });
  box(D.x1 - D.x0, R.h - D.h, T, PAL.outside, { x: 0, y: (R.h + D.h) / 2, z: fz });
  box(0.05, D.h, T + 0.02, PAL.trim, { x: D.x0 + 0.025, y: D.h / 2, z: fz });
  box(0.05, D.h, T + 0.02, PAL.trim, { x: D.x1 - 0.025, y: D.h / 2, z: fz });
  box(D.x1 - D.x0, 0.05, T + 0.02, PAL.trim, { x: 0, y: D.h - 0.025, z: fz });
  // skirting
  box(R.x1 - R.x0, 0.08, 0.015, PAL.trim, { x: 0, y: 0.04, z: R.z0 + 0.008, cast: false });
  box(0.015, 0.08, R.z1 - R.z0, PAL.trim, { x: R.x1 - 0.008, y: 0.04, z: (R.z0 + R.z1) / 2, cast: false });
  box(0.015, 0.08, R.z1 - R.z0, PAL.trim, { x: R.x0 + 0.008, y: 0.04, z: (R.z0 + R.z1) / 2, cast: false });

  o.onProgress && o.onProgress(0.4);

  /* ---------- rug ---------- */
  box(2.1, 0.01, 1.5, mat('#e9d8c4', 1), { r: 0.004, x: 0.05, y: 0.005, z: -1.15, cast: false });
  box(1.94, 0.011, 1.34, mat('#e3cfb8', 1), { r: 0.004, x: 0.05, y: 0.006, z: -1.15, cast: false });
  box(1.86, 0.012, 1.26, mat('#e9d8c4', 1), { r: 0.004, x: 0.05, y: 0.0065, z: -1.15, cast: false });

  /* ---------- desk ---------- */
  const DESK = { x: -0.3, z: -1.98, w: 1.5, d: 0.72, top: 0.75 };
  const DX = DESK.x;
  box(DESK.w, 0.035, DESK.d, mat(PAL.oak, 0.7), { r: 0.012, x: DESK.x, y: DESK.top - 0.0175, z: DESK.z });
  box(DESK.w - 0.12, 0.06, DESK.d - 0.1, mat(PAL.oakDark, 0.8), { x: DESK.x, y: DESK.top - 0.065, z: DESK.z });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) =>
    box(0.036, DESK.top - 0.035, 0.036, mat(PAL.ink, 0.6), { r: 0.006, x: DESK.x + sx * (DESK.w / 2 - 0.06), y: (DESK.top - 0.035) / 2, z: DESK.z + sz * (DESK.d / 2 - 0.06) }));

  /* ---------- laptop ---------- */
  const laptop = new THREE.Group(); laptop.name = 'laptop'; scene.add(laptop);
  const LB = { w: 0.34, h: 0.014, d: 0.235 };
  laptop.position.set(DX, DESK.top, -1.86);
  box(LB.w, LB.h, LB.d, mat(PAL.alu, 0.5, 0.25), { r: 0.006, y: LB.h / 2, parent: laptop });
  const kb = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.105), mat(PAL.aluDark, 0.7));
  kb.rotation.x = -Math.PI / 2; kb.position.set(0, LB.h + 0.0005, -0.035); laptop.add(kb);
  const keys = batch(new THREE.PlaneGeometry(0.0175, 0.0165), { color: '#a59c91', roughness: 0.8 }, laptop);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 14; c++) keys.add([-0.1365 + c * 0.021, LB.h + 0.0008, -0.078 + r * 0.021], [-Math.PI / 2, 0, 0], [1, 1, 1]);
  keys.build().castShadow = false;
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.066), mat('#c3bbb1', 0.55));
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, LB.h + 0.0005, 0.067); laptop.add(pad);
  const LID_OPEN = -0.25, LID_SHUT = 1.5;
  const lid = new THREE.Group(); lid.position.set(0, LB.h, -LB.d / 2); lid.rotation.x = LID_SHUT; laptop.add(lid);
  const LID = { w: 0.34, h: 0.226, t: 0.007 };
  box(LID.w, LID.h, LID.t, mat(PAL.alu, 0.5, 0.25), { r: 0.0034, y: LID.h / 2, z: -LID.t / 2, parent: lid });
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(LID.w - 0.006, LID.h - 0.006), mat(PAL.bezel, 0.6));
  bezel.position.set(0, LID.h / 2, 0.0006); lid.add(bezel);
  const SCR = { w: 0.316, h: 0.1975 };
  const screenTex = canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = cssGradient(g, w, h, 160, [[0, '#fbf4ec'], [0.58, '#f5e6d7'], [1, '#eed5bf']]);
    g.fillRect(0, 0, w, h);
  });
  const SLEEP = 0.14;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.material.color.setScalar(SLEEP);
  screen.position.set(0, LID.h / 2 + 0.003, 0.0009); lid.add(screen);

  /* ---------- chair ---------- */
  const chair = new THREE.Group(); chair.position.set(DX + 0.42, 0, -1.3); chair.rotation.y = -0.5; scene.add(chair);
  box(0.46, 0.05, 0.44, mat('#d2b394', 0.95), { r: 0.018, y: 0.465, parent: chair });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
    const leg = cyl(0.014, 0.019, 0.45, mat(PAL.oakDark, 0.7), { x: sx * 0.19, y: 0.22, z: sz * 0.18, parent: chair });
    leg.rotation.set(sz * 0.05, 0, -sx * 0.05);
  });
  box(0.44, 0.17, 0.025, mat(PAL.oak, 0.7), { r: 0.01, y: 0.8, z: 0.2, rx: -0.12, parent: chair });
  [-1, 1].forEach(sx => box(0.026, 0.4, 0.026, mat(PAL.oakDark, 0.7), { r: 0.008, x: sx * 0.19, y: 0.66, z: 0.19, rx: -0.08, parent: chair }));

  /* ---------- on the desk ---------- */
  // lamp
  const lamp = new THREE.Group(); lamp.position.set(DX - 0.56, DESK.top, -2.16); scene.add(lamp);
  cyl(0.075, 0.08, 0.016, mat(PAL.ink, 0.55), { y: 0.008, parent: lamp });
  cyl(0.007, 0.007, 0.42, mat(PAL.ink, 0.5), { y: 0.22, z: 0.0, rz: 0.12, parent: lamp });
  cyl(0.007, 0.007, 0.3, mat(PAL.ink, 0.5), { x: 0.06, y: 0.47, z: 0.0, rz: -1.05, parent: lamp });
  const shade = cyl(0.028, 0.075, 0.12, mat('#efe4d6', 0.8), { x: 0.2, y: 0.5, rz: 0.55, parent: lamp });
  shade.material = new THREE.MeshStandardMaterial({ color: '#efe4d6', roughness: 0.8, side: THREE.DoubleSide });
  // books
  [['#a04a0d', 0.24, 0.17], ['#e7d3bd', 0.23, 0.16], ['#8a9a7b', 0.21, 0.15]].forEach(([c, w, d], i) =>
    box(w, 0.028, d, mat(c, 0.9), { r: 0.003, x: DX + 0.6, y: DESK.top + 0.014 + i * 0.028, z: -2.06, ry: 0.08 - i * 0.07 }));
  // mug
  const mugMat = mat('#f4ece2', 0.55);
  cyl(0.036, 0.033, 0.09, mugMat, { x: DX + 0.36, y: DESK.top + 0.045, z: -1.72 });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 10, 24), mugMat);
  handle.position.set(DX + 0.398, DESK.top + 0.05, -1.72); handle.castShadow = true; scene.add(handle);
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.032, 24), mat('#8a5a3a', 0.4));
  tea.rotation.x = -Math.PI / 2; tea.position.set(DX + 0.36, DESK.top + 0.08, -1.72); scene.add(tea);
  // notebook and pencil
  const notebook = new THREE.Group(); notebook.position.set(DX - 0.36, DESK.top, -1.8); notebook.rotation.y = 0.18; scene.add(notebook);
  box(0.16, 0.012, 0.22, mat('#c98e5d', 0.9), { r: 0.003, y: 0.006, parent: notebook });
  box(0.15, 0.004, 0.21, mat('#faf5ee', 1), { x: 0.003, y: 0.014, parent: notebook });
  cyl(0.004, 0.004, 0.17, mat(PAL.ink, 0.6), { x: 0.11, y: 0.006, z: 0.0, rx: Math.PI / 2, seg: 8, parent: notebook });
  // framed portrait
  const frame = new THREE.Group(); frame.position.set(DX + 0.37, DESK.top, -2.2); frame.rotation.y = -0.32; scene.add(frame);
  const frameTilt = new THREE.Group(); frameTilt.position.y = 0.095; frameTilt.rotation.x = -0.14; frame.add(frameTilt);
  box(0.15, 0.19, 0.014, mat(PAL.oakDark, 0.7), { r: 0.003, parent: frameTilt });
  const portraitTex = await new Promise(res => {
    new THREE.TextureLoader().load(o.portrait, t => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null));
  });
  if (portraitTex) {
    // crop the square-ish portrait to the frame's 3:4 window
    const img = portraitTex.image, ar = 0.12 / 0.16, iar = img.width / img.height;
    portraitTex.repeat.set(ar / iar, 1); portraitTex.offset.set((1 - ar / iar) / 2, 0);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.16), new THREE.MeshStandardMaterial({ map: portraitTex, roughness: 0.6 }));
    photo.position.z = 0.0076; frameTilt.add(photo);
  }
  o.onProgress && o.onProgress(0.6);

  /* ---------- wall art (abstract, painted in code) ---------- */
  const artTex = canvasTex(600, 800, (g, w, h) => {
    g.fillStyle = '#f7efe4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eccfb3'; g.beginPath(); g.arc(w * 0.5, h * 0.62, w * 0.34, Math.PI, 0); g.fill();
    g.fillStyle = '#d9a37a'; g.beginPath(); g.arc(w * 0.66, h * 0.33, w * 0.1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a3b092'; g.fillRect(w * 0.12, h * 0.62, w * 0.76, h * 0.012);
    g.fillStyle = '#e4c3a3'; g.fillRect(w * 0.12, h * 0.7, w * 0.76, h * 0.17);
  });
  const art = new THREE.Group(); art.position.set(DX - 0.05, 1.72, R.z0 + 0.015); scene.add(art);
  box(0.6, 0.8, 0.025, mat(PAL.oak, 0.7), { r: 0.004, parent: art });
  box(0.56, 0.76, 0.004, mat('#fbf6ef', 1), { z: 0.013, parent: art, cast: false });
  const artPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.95 }));
  artPlane.position.z = 0.0155; art.add(artPlane);
  const art2Tex = canvasTex(400, 400, (g, w, h) => {
    g.fillStyle = '#f7efe4'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#a04a0d'; g.lineWidth = 3;
    g.beginPath(); for (let x = 40; x <= 360; x += 4) g.lineTo(x, 200 + Math.sin(x / 34) * 40 * Math.sin(x / 120)); g.stroke();
    g.strokeStyle = '#c9a481'; g.lineWidth = 2;
    g.beginPath(); for (let x = 40; x <= 360; x += 4) g.lineTo(x, 240 + Math.sin(x / 22 + 1) * 22); g.stroke();
  });
  const art2 = new THREE.Group(); art2.position.set(DX + 0.52, 1.56, R.z0 + 0.015); scene.add(art2);
  box(0.32, 0.32, 0.02, mat(PAL.ink, 0.7), { r: 0.003, parent: art2 });
  const a2 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), new THREE.MeshStandardMaterial({ map: art2Tex, roughness: 0.95 }));
  a2.position.z = 0.0105; art2.add(a2);

  /* ---------- bookshelf on the right wall ---------- */
  const shelf = new THREE.Group(); shelf.name = 'shelf'; shelf.position.set(1.42, 0, R.z0 + 0.17); scene.add(shelf);
  const SH = { w: 0.92, h: 1.92, d: 0.32 };
  const shm = mat(PAL.shelf, 0.85);
  box(0.026, SH.h, SH.d, shm, { x: -SH.w / 2, y: SH.h / 2, parent: shelf });
  box(0.026, SH.h, SH.d, shm, { x: SH.w / 2, y: SH.h / 2, parent: shelf });
  box(SH.w, SH.h, 0.012, shm, { y: SH.h / 2, z: -SH.d / 2 + 0.006, parent: shelf });
  const levels = [0.06, 0.5, 0.94, 1.38, SH.h - 0.013];
  levels.forEach(y => box(SH.w + 0.026, 0.026, SH.d, shm, { y, parent: shelf }));
  const rb = rng(11);
  const books = batch(new THREE.BoxGeometry(1, 1, 1), { color: '#ffffff', roughness: 0.92 }, shelf);
  levels.slice(0, 4).forEach((y, li) => {
    let x = -SH.w / 2 + 0.03;
    const end = SH.w / 2 - 0.03 - (li === 1 ? 0.3 : li === 3 ? 0.18 : 0.08);
    while (x < end) {
      const bw = 0.022 + rb() * 0.03, bh = 0.2 + rb() * 0.14, bd = 0.17 + rb() * 0.07;
      if (x + bw > end) break;
      const c = PAL.books[Math.floor(rb() * PAL.books.length)];
      const lean = rb() < 0.08 ? 0.12 : 0;
      books.add([x + bw / 2 + (lean ? 0.02 : 0), y + 0.013 + bh / 2, -SH.d / 2 + 0.02 + bd / 2], [0, 0, -lean], [bw, bh, bd], c);
      x += bw + 0.002 + (lean ? 0.04 : 0);
    }
    if (li === 1) {
      // a small horizontal stack and a ceramic vase
      [0, 1, 2].forEach(k => box(0.2 - k * 0.015, 0.03, 0.2, mat(PAL.books[(k * 3 + 2) % 10], 0.9), { r: 0.002, x: SH.w / 2 - 0.16, y: y + 0.028 + k * 0.03, z: 0, parent: shelf }));
      cyl(0.035, 0.05, 0.14, mat('#e7dccd', 0.6), { x: SH.w / 2 - 0.16, y: y + 0.083 + 0.07 + 0.012, parent: shelf });
    }
    if (li === 3) cyl(0.055, 0.045, 0.1, mat('#d9a37a', 0.7), { x: SH.w / 2 - 0.1, y: y + 0.063, parent: shelf });
  });
  books.build();
  // a small plant on top of the shelf
  cyl(0.06, 0.048, 0.1, mat(PAL.pot, 0.7), { x: -0.24, y: SH.h + 0.05, parent: shelf });
  const leafGeo = new THREE.SphereGeometry(1, 12, 8);
  const lr = rng(5);
  const shelfLeaves = batch(leafGeo, { color: '#ffffff', roughness: 0.85 }, shelf);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + lr() * 0.4;
    shelfLeaves.add([-0.24 + Math.cos(a) * 0.05, SH.h + 0.12 + lr() * 0.04, Math.sin(a) * 0.05], [0, -a, 0.5 + lr() * 0.3], [0.045, 0.011, 0.026], i % 2 ? PAL.sage : PAL.sageDark);
  }
  shelfLeaves.build();

  /* ---------- floor plant in the corner ---------- */
  const plant = new THREE.Group(); plant.position.set(-1.68, 0, -2.02); scene.add(plant);
  cyl(0.17, 0.13, 0.38, mat(PAL.pot, 0.75), { y: 0.19, parent: plant });
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24), mat('#6b5644', 1)); soil.rotation.x = -Math.PI / 2; soil.position.y = 0.36; plant.add(soil);
  cyl(0.012, 0.016, 0.9, mat('#7b6450', 0.9), { y: 0.8, parent: plant });
  const pr = rng(9);
  const plantLeaves = batch(leafGeo, { color: '#ffffff', roughness: 0.85 }, plant);
  for (let i = 0; i < 34; i++) {
    const y = 0.62 + pr() * 0.78, a = pr() * Math.PI * 2, rr = 0.08 + pr() * 0.2 * (1 - Math.abs(y - 1.05));
    plantLeaves.add([Math.cos(a) * rr, y, Math.sin(a) * rr], [(pr() - 0.5) * 0.9, -a, 0.35 + pr() * 0.4], [0.075, 0.016, 0.05], i % 3 ? PAL.sage : PAL.sageDark);
  }
  const plantSway = plantLeaves.build();

  o.onProgress && o.onProgress(0.8);

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight('#fff5ea', '#e0c6a6', 0.95));
  const sun = new THREE.DirectionalLight('#ffe2c0', 3.1);
  sun.position.set(-5.0, 3.3, 0.9);
  sun.target.position.set(0.2, 0.6, -2.0);
  scene.add(sun.target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(phone ? 1024 : 2048, phone ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -3.2, right: 3.2, top: 2.6, bottom: -2.6, near: 1, far: 12 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#fff1e3', 0.55);
  fill.position.set(2.5, 2.4, 3.5); scene.add(fill);

  /* ---------- ambient life: dust in the window light, a slow light shift, a barely moving plant ---------- */
  const sunDir = new THREE.Vector3().subVectors(sun.target.position, sun.position).normalize();
  const MOTES = phone ? 34 : 60;
  const moteBase = new Float32Array(MOTES * 3), motePhase = new Float32Array(MOTES);
  const mr = rng(21);
  for (let i = 0; i < MOTES; i++) {
    const z = W.z0 + 0.12 + mr() * (ww - 0.24), y = W.y0 + 0.12 + mr() * (wh - 0.24), d = 0.3 + mr() * 1.9;
    moteBase.set([R.x0 + sunDir.x * d, y + sunDir.y * d, z + sunDir.z * d], i * 3);
    motePhase[i] = mr() * Math.PI * 2;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute('position', new THREE.BufferAttribute(moteBase.slice(), 3));
  const moteTex = canvasTex(64, 64, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.45, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    map: moteTex, color: '#fff3df', size: phone ? 0.014 : 0.011, sizeAttenuation: true,
    transparent: true, opacity: 0.55, depthWrite: false
  }));
  motes.frustumCulled = false;
  scene.add(motes);
  const SUN_I = sun.intensity;
  function ambient(t) {
    const pos = moteGeo.attributes.position.array;
    for (let i = 0; i < MOTES; i++) {
      const ph = motePhase[i], j = i * 3;
      pos[j] = moteBase[j] + Math.sin(t * 0.11 + ph) * 0.05;
      pos[j + 1] = moteBase[j + 1] + Math.sin(t * 0.07 + ph * 1.7) * 0.06;
      pos[j + 2] = moteBase[j + 2] + Math.cos(t * 0.09 + ph) * 0.05;
    }
    moteGeo.attributes.position.needsUpdate = true;
    sun.intensity = SUN_I * (1 + 0.035 * Math.sin(t * 0.29) + 0.012 * Math.sin(t * 0.83 + 1.3));
    plantSway.rotation.z = Math.sin(t * 0.55) * 0.005;
    plantSway.rotation.x = Math.sin(t * 0.37 + 1) * 0.004;
  }

  /* ---------- camera ---------- */
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), sph = new THREE.Spherical();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const xyz = v => ({ x: v.x, y: v.y, z: v.z });
  const POSES = {
    wide: { fov: 40, door: { p: V(0.05, 1.62, 5.6), t: V(0.0, 1.32, 0.0) }, via: V(0.1, 1.6, 2.7), stand: { p: V(0.95, 1.6, 1.9), t: V(-0.12, 0.9, -1.95) } },
    tall: { fov: 62, door: { p: V(0.02, 1.58, 5.4), t: V(0.0, 1.25, 0.0) }, via: V(0.06, 1.55, 2.7), stand: { p: V(0.0, 1.45, 0.6), t: V(-0.3, 0.9, -1.9) } }
  };
  let P = POSES.wide;
  function pickPoses() {
    const a = camera.aspect;
    P = a < 0.9 ? POSES.tall : POSES.wide;
    camera.fov = a < 0.9 ? P.fov : a < 1.3 ? 50 : P.fov;
    camera.updateProjectionMatrix();
  }
  // poses that depend on the open laptop lid
  function withLidOpen(fn) {
    const r = lid.rotation.x; lid.rotation.x = LID_OPEN; scene.updateMatrixWorld(true);
    const out = fn(); lid.rotation.x = r; scene.updateMatrixWorld(true);
    return out;
  }
  function screenFrame() {
    const c = screen.getWorldPosition(new THREE.Vector3());
    const n = new THREE.Vector3(0, 0, 1).transformDirection(screen.matrixWorld);
    return { c, n };
  }
  const seatedPose = () => withLidOpen(() => { const { c, n } = screenFrame(); return { p: c.clone().addScaledVector(n, 0.6), t: c.clone().add(V(0, -0.02, 0)) }; });
  const coverPose = () => withLidOpen(() => {
    const { c, n } = screenFrame();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const d = Math.min(SCR.h / (2 * tan), SCR.w / (2 * tan * camera.aspect)) * 0.9;
    return { p: c.clone().addScaledVector(n, d), t: c.clone() };
  });
  const photoPos = frame.getWorldPosition(new THREE.Vector3()).add(V(0, 0.1, 0));
  const CHAIR_IN = { x: DX + 0.02, z: -1.12, ry: 0.04 };

  const cam = { p: new THREE.Vector3(), t: new THREE.Vector3() };
  const look = { yaw: 0, pitch: 0, gy: 0, gp: 0 };
  const par = { x: 0, y: 0, gx: 0, gy: 0 };
  const view = new THREE.Vector3();
  let state = 'loading', active = true, dirty = true, moving = 0, raf = 0, prevNow = 0, lastRender = 0, renders = 0;
  let introTl = null, measuring = !!o.strictPerf, tuned = false, game = null;
  const frameTimes = [];

  function setCam(pose) { cam.p.copy(pose.p); cam.t.copy(pose.t); dirty = true; }
  function effective(outP, outT) {
    outP.copy(cam.p);
    if (state !== 'room') { outT.copy(cam.t); return; }
    outP.x += par.x * 0.07; outP.y += par.y * 0.035;
    tmp2.subVectors(cam.t, cam.p); sph.setFromVector3(tmp2);
    sph.theta += look.yaw; sph.phi = THREE.MathUtils.clamp(sph.phi + look.pitch, 0.7, 2.3);
    tmp2.setFromSpherical(sph);
    outT.copy(outP).add(tmp2);
  }
  function apply() { effective(camera.position, view); camera.lookAt(view); }
  // fold the visitor's drag and mouse offsets into the camera before a scripted move
  function bake() {
    effective(tmp, view); cam.p.copy(tmp); cam.t.copy(view);
    look.yaw = look.pitch = look.gy = look.gp = 0; par.x = par.y = par.gx = par.gy = 0;
  }
  function setBright(v) { screen.material.color.setScalar(v); dirty = true; }

  function loop(now) {
    if (!active) return;
    raf = requestAnimationFrame(loop);
    const dt = prevNow ? Math.min(100, now - prevNow) : 16; prevNow = now;
    if (state === 'room') {
      const k = Math.min(1, dt * 0.006);
      const d1 = par.gx - par.x, d2 = par.gy - par.y, d3 = look.gy - look.yaw, d4 = look.gp - look.pitch;
      if (Math.abs(d1) + Math.abs(d2) + Math.abs(d3) + Math.abs(d4) > 1e-3) {
        par.x += d1 * k; par.y += d2 * k; look.yaw += d3 * k * 1.6; look.pitch += d4 * k * 1.6; dirty = true;
      }
    }
    if (hiddenQueue.length && roomHidden()) flushHidden();
    if (game) { game.render(now); renders++; measure(now); lastRender = now; return; }
    const living = state === 'intro' || state === 'room' || state === 'moving';
    // camera moves render every frame; the room's quiet life renders at about 30 fps
    if (!(dirty || moving || (living && now - lastRender > 32))) return;
    if (living) ambient(now / 1000);
    apply();
    renderer.render(scene, camera);
    renders++; dirty = false;
    measure(now);
    lastRender = now;
  }
  // the fps guard: 20 frames; first drop to 1x pixels, then hand the visitor the 2D desk
  function measure(now) {
    if (!measuring || !lastRender) return;
    frameTimes.push(now - lastRender);
    if (frameTimes.length === 20) {
      const avg = frameTimes.slice(4).reduce((a, b) => a + b, 0) / 16;
      frameTimes.length = 0;
      if (avg > 30 && !tuned && renderer.getPixelRatio() > 1) { tuned = true; renderer.setPixelRatio(1); }
      else { measuring = false; if (avg > 42 && o.onSlow) o.onSlow(avg); }
    }
  }

  function tweenTo(pose, dur, ease, via) {
    return new Promise(resolve => {
      if (reduced || !gsap || dur === 0) { setCam(pose); resolve(); return; }
      const from = cam.p.clone(), fromT = cam.t.clone();
      const curve = via ? new THREE.CatmullRomCurve3([from, via, pose.p.clone()], false, 'centripetal') : null;
      const k = { v: 0 };
      moving++;
      gsap.to(k, {
        v: 1, duration: dur, ease,
        onUpdate() { if (curve) curve.getPoint(k.v, cam.p); else cam.p.lerpVectors(from, pose.p, k.v); cam.t.lerpVectors(fromT, pose.t, k.v); },
        onComplete() { moving--; dirty = true; resolve(); }
      });
    });
  }

  /* ---------- the intro: one GSAP timeline ---------- */
  let fillAt = 0;
  function buildIntro(short, onFill, tight) {
    const seat = seatedPose(), cover = coverPose();
    const tl = gsap.timeline({ paused: true, onUpdate() { dirty = true; } });
    const k = { v: 0 }, b = { v: SLEEP };
    const wake = (at, dur) => tl.to(b, { v: 1, duration: dur, ease: 'sine.inOut', onUpdate() { setBright(b.v); } }, at);
    const lidOpen = (at, dur) => tl.to(lid.rotation, { x: LID_OPEN, duration: dur, ease: 'power2.inOut' }, at);
    const chairIn = (at, dur) => {
      tl.to(chair.position, { x: CHAIR_IN.x, z: CHAIR_IN.z, duration: dur, ease: 'power2.inOut' }, at);
      tl.to(chair.rotation, { y: CHAIR_IN.ry, duration: dur, ease: 'power2.inOut' }, at);
    };
    const T = (v, at, dur, ease = 'sine.inOut') => tl.to(cam.t, { ...xyz(v), duration: dur, ease }, at);
    const Pp = (v, at, dur, ease = 'sine.inOut') => tl.to(cam.p, { ...xyz(v), duration: dur, ease }, at);
    if (tight && !short) {
      // after the game: about 7.5 s. Door, bookshelf, chalkboard, photo, sit, screen fill
      const inside = V(0.4, 1.6, 1.5);
      const board = anchors.chalkboard.position.clone().add(V(0, 1.0, 0));
      const curve = new THREE.CatmullRomCurve3([P.door.p.clone(), P.via.clone(), inside], false, 'centripetal');
      tl.to(k, { v: 1, duration: 2.2, ease: 'power2.inOut', onUpdate() { curve.getPoint(k.v, cam.p); } }, 0);
      T(V(0.2, 1.25, -1.4), 0, 1.6);
      T(V(1.42, 1.12, -2.2), 1.5, 1.4);                      // the bookshelf
      Pp(V(0.62, 1.57, 0.95), 2.2, 1.7);
      T(board, 2.9, 1.0);                                     // the chalkboard beside it
      T(photoPos, 3.9, 1.0, 'power2.inOut');                  // her photo on the desk
      Pp(V(0.22, 1.44, -0.35), 3.9, 1.1, 'power2.inOut');
      lidOpen(4.3, 1.1);
      chairIn(4.4, 1.0);
      Pp(V(-0.12, 1.42, -0.72), 5.0, 0.8, 'sine.in');         // approach the chair
      T(seat.t, 4.9, 1.1);
      Pp(seat.p, 5.8, 0.7, 'sine.out');                       // sit down
      wake(6.0, 0.6);                                         // the screen wakes
      Pp(cover.p, 6.5, 1.0, 'power2.inOut');                  // the screen fills the view
      T(cover.t, 6.5, 1.0, 'power2.inOut');
      fillAt = 7.2; tl.call(onFill, null, 7.2);
    } else if (!short) {
      const inside = V(0.35, 1.6, 1.45);
      const curve = new THREE.CatmullRomCurve3([P.door.p.clone(), P.via.clone(), inside], false, 'centripetal');
      tl.to(k, { v: 1, duration: 2.9, ease: 'power2.inOut', onUpdate() { curve.getPoint(k.v, cam.p); } }, 0);  // dolly through the door
      T(V(-0.7, 1.3, -1.6), 0, 2.5);
      T(V(-2.3, 1.42, -1.15), 2.5, 1.5);                    // the window light
      Pp(V(0.42, 1.6, 1.25), 2.9, 1.2);
      T(V(1.42, 1.12, -2.2), 4.3, 1.7);                     // past the bookshelf
      Pp(V(0.62, 1.57, 0.95), 4.1, 1.9);
      T(photoPos, 6.0, 1.4, 'power2.inOut');                // her photo on the desk
      Pp(V(0.22, 1.44, -0.35), 6.0, 1.6, 'power2.inOut');
      lidOpen(6.9, 1.3);
      chairIn(7.1, 1.2);
      Pp(V(-0.12, 1.42, -0.72), 7.6, 1.15, 'sine.in');      // approach the chair
      T(seat.t, 7.4, 1.5);
      Pp(seat.p, 8.75, 0.9, 'sine.out');                    // sit down: lower, tilt slightly
      wake(9.0, 0.8);                                       // the screen wakes
      Pp(cover.p, 9.75, 1.2, 'power2.inOut');               // the screen fills the view
      T(cover.t, 9.75, 1.2, 'power2.inOut');
      fillAt = 10.6; tl.call(onFill, null, 10.6);
    } else {
      const inside = V(0.0, 1.5, 1.0);
      const curve = new THREE.CatmullRomCurve3([P.door.p.clone(), P.via.clone(), inside], false, 'centripetal');
      tl.to(k, { v: 1, duration: 2.3, ease: 'power2.inOut', onUpdate() { curve.getPoint(k.v, cam.p); } }, 0);
      T(V(-1.5, 1.32, -1.5), 0.1, 1.2);                     // pan across: window side
      T(V(1.3, 1.12, -2.2), 1.3, 1.2);                      // to the shelf
      T(photoPos, 2.5, 0.9, 'power2.inOut');                // rest on the photo
      Pp(V(-0.05, 1.42, 0.15), 2.3, 1.1, 'power2.inOut');
      lidOpen(2.9, 1.0);
      chairIn(3.0, 1.0);
      Pp(seat.p, 3.4, 1.15, 'sine.inOut');                  // approach the laptop
      T(seat.t, 3.4, 1.15, 'sine.inOut');
      wake(4.15, 0.6);
      Pp(cover.p, 4.65, 0.95, 'power2.inOut');
      T(cover.t, 4.65, 0.95, 'power2.inOut');
      fillAt = 5.35; tl.call(onFill, null, 5.35);
    }
    return tl;
  }
  function finalDeskState() {
    lid.rotation.x = LID_OPEN; setBright(1);
    chair.position.x = CHAIR_IN.x; chair.position.z = CHAIR_IN.z; chair.rotation.y = CHAIR_IN.ry;
    setCam(coverPose());
  }

  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    pickPoses();
    if (state === 'room') setCam(P.stand);
    if (state === 'desk') setCam(coverPose());
    dirty = true;
  }
  window.addEventListener('resize', onResize);

  /* ---------- looking around and picking (room only) ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pickables = [
    { obj: laptop, label: null, folder: null },
    { obj: shelf, label: 'Awards & Books', folder: 'awards' },
    { obj: frame, label: 'About', folder: 'about' },
    { obj: notebook, label: 'Teaching', folder: 'teaching' }
  ];
  function pick(x, y) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables.map(p => p.obj), true);
    if (!hits.length) return null;
    let n = hits[0].object;
    while (n && !pickables.some(p => p.obj === n)) n = n.parent;
    return pickables.find(p => p.obj === n) || null;
  }
  const el = renderer.domElement;
  let drag = null;
  el.addEventListener('pointerdown', e => {
    if (state === 'intro') { o.onIntroPoke && o.onIntroPoke(); return; }
    if (state !== 'room') return;
    drag = { x: e.clientX, y: e.clientY, yaw: look.gy, pitch: look.gp, moved: false, id: e.pointerId };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' && state === 'room' && !drag) {
      par.gx = (e.clientX / window.innerWidth) * 2 - 1;
      par.gy = (e.clientY / window.innerHeight) * 2 - 1;
    }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      look.gy = THREE.MathUtils.clamp(drag.yaw + dx * 0.0035, -0.75, 0.75);
      look.gp = THREE.MathUtils.clamp(drag.pitch + dy * 0.0025, -0.3, 0.3);
      el.classList.toggle('is-dragging', drag.moved);
      o.onHover && o.onHover(null);
      return;
    }
    if (state !== 'room') { o.onHover && o.onHover(null); return; }
    o.onHover && o.onHover(pick(e.clientX, e.clientY), e.clientX, e.clientY);
  });
  el.addEventListener('pointerup', e => {
    if (!drag) return;
    const d = drag; drag = null; el.classList.remove('is-dragging');
    if (!d.moved && state === 'room') { const hit = pick(e.clientX, e.clientY); if (hit && o.onPick) o.onPick(hit); }
  });
  el.addEventListener('pointercancel', () => { drag = null; el.classList.remove('is-dragging'); });
  el.addEventListener('pointerleave', () => { if (!drag) { par.gx = par.gy = 0; } o.onHover && o.onHover(null); });

  /* ---------- props hook (role P): fixed anchors, named objects, pickables ---------- */
  const anchor = (name, x, y, z, ry = 0, rx = 0) => {
    const g = new THREE.Group(); g.name = 'anchor:' + name; g.position.set(x, y, z); g.rotation.set(rx, ry, 0); scene.add(g); return g;
  };
  const anchors = {
    chalkboard: anchor('chalkboard', 1.98, 0, -1.05, -1.15),
    plant: anchor('plant', R.x0 + 0.07, W.y0, -1.6),
    clock: anchor('clock', 0, 2.47, R.z1 - 0.01, Math.PI),
    lamp: anchor('lamp', lamp.position.x, lamp.position.y, lamp.position.z),
    floor: anchor('floor', 0, 0, (R.z0 + R.z1) / 2, 0, -Math.PI / 2),
    shelfTop: anchor('shelfTop', shelf.position.x, SH.h, shelf.position.z)
  };
  lamp.name = 'lamp'; floor.name = 'floor'; frame.name = 'photo'; plant.name = 'floorPlant'; notebook.name = 'notebook';
  const named = {
    lamp, floor, shelf, laptop, photo: frame, notebook, floorPlant: plant,
    shelfTop: anchors.shelfTop, windowSill: anchors.plant, doorWall: anchors.clock, chalkboard: anchors.chalkboard
  };
  // props may only change what is on camera while the room is hidden (game, loading, or the desk covering it)
  const hiddenQueue = [];
  const roomHidden = () => state === 'game' || state === 'desk' || state === 'loading';
  function whenHidden(fn) { if (roomHidden()) { fn(); dirty = true; } else hiddenQueue.push(fn); }
  function flushHidden() { while (hiddenQueue.length) { try { hiddenQueue.shift()(); } catch (e) { console.warn(e); } } dirty = true; }
  const propsCtx = {
    THREE, scene, renderer, camera, named, anchors, phone, PAL, maxAniso,
    addPickable(obj, folder, label) { pickables.push({ obj, folder: folder || null, label: label || null }); },
    invalidate() { dirty = true; },
    whenHidden
  };
  let propsReady = Promise.resolve(null);
  if (o.props && typeof o.props.attach === 'function') {
    try { propsReady = Promise.resolve(o.props.attach(propsCtx)).catch(e => { console.warn('props:', e && e.message); return null; }); }
    catch (e) { console.warn('props:', e && e.message); }
  }

  /* ---------- first frame ---------- */
  camera.aspect = container.clientWidth / container.clientHeight;
  pickPoses();
  setCam(P.door);
  apply();
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  o.onProgress && o.onProgress(1);
  raf = requestAnimationFrame(loop);

  let introLen = 0, introFill = 0;
  let gameWanted = false;
  function endGame() { gameWanted = false; if (game) { const g = game; game = null; g.dispose(); dirty = true; } }
  return {
    get state() { return state; },
    get renders() { return renders; },
    get calls() { return renderer.info.render.calls; },
    /* plays the intro; resolves when it has ended or been skipped. onFill fires when the screen fills the view */
    intro(short, onFill, opts) {
      const fromGame = !!(opts && opts.fromGame);
      endGame();
      state = 'intro';
      if (reduced || !gsap) { finalDeskState(); state = 'desk'; onFill && onFill(); return Promise.resolve(); }
      if (fromGame) { setCam(P.door); measuring = !!o.strictPerf; frameTimes.length = 0; lastRender = 0; }
      return new Promise(resolve => {
        let filled = false;
        const fill = () => { if (!filled) { filled = true; onFill && onFill(); } };
        introTl = buildIntro(short, fill, fromGame);
        // after the game the phone picks up the short walk-in at the photo (its t = 2.3 s)
        const from = fromGame && short ? 2.3 : 0;
        introLen = introTl.duration() - from;
        introFill = fillAt - from;
        introTl.eventCallback('onComplete', () => { state = 'desk'; measuring = false; introTl = null; fill(); resolve(); });
        introTl.play(from);
      });
    },
    /* "Teach the model" (js/intro-game.js), drawn with this renderer while the room waits behind it */
    async playGame(g) {
      gameWanted = true;
      const m = await import('./intro-game.js');
      if (!gameWanted || !active && state !== 'loading') return null;   // skipped (or 2D) while the module loaded
      game = m.createGame({
        THREE, renderer, gsap, phone, touch: g.touch, ui: g.ui, labels: g.labels, title: g.title, tagline: g.tagline,
        onStep: g.onStep, onPlay: g.onPlay, onDone: g.onDone
      });
      state = 'game';
      frameTimes.length = 0; lastRender = 0;
      if (!active) this.resume();
      game.start();
      return game;
    },
    get game() { return game; },
    get introDuration() { return introLen; },
    get introFill() { return introFill; },   // seconds from the start of the walk-in until the desk fades in
    /* test hook: hold the intro at t seconds (used to record still frames on slow software GL) */
    holdIntro(t) { if (introTl) { introTl.pause(); introTl.seek(Math.min(t, introTl.duration() - 0.5), false); ambient(t); apply(); renderer.render(scene, camera); renders++; } },
    playIntro() { if (introTl) introTl.play(); },
    skipIntro() {
      endGame();
      if (introTl) { const tl = introTl; tl.progress(1, false); tl.kill(); introTl = null; }
      finalDeskState(); state = 'desk'; measuring = false; dirty = true;
    },
    jumpDesk() { endGame(); finalDeskState(); state = 'desk'; apply(); renderer.render(scene, camera); },
    stand() {
      state = 'moving';
      return tweenTo(P.stand, 1.8, 'power2.inOut', V(0.1, 1.35, -0.55)).then(() => { state = 'room'; });
    },
    sit() {
      bake();
      state = 'moving';
      const seat = seatedPose(), cover = coverPose();
      return tweenTo(seat, reduced ? 0 : 1.5, 'power2.inOut').then(() => tweenTo(cover, reduced ? 0 : 1.1, 'power2.inOut')).then(() => { state = 'desk'; });
    },
    pause() { active = false; cancelAnimationFrame(raf); },
    resume() { if (!active) { active = true; dirty = true; prevNow = 0; lastRender = 0; raf = requestAnimationFrame(loop); } },
    dispose() {
      active = false; cancelAnimationFrame(raf);
      endGame();
      if (introTl) introTl.kill();
      window.removeEventListener('resize', onResize);
      scene.traverse(n => { if (n.geometry) n.geometry.dispose(); });
      mats.forEach(m => m.dispose());
      extraMats.forEach(m => m.dispose());
      motes.material.dispose();
      [floorTex, skyTex, screenTex, artTex, art2Tex, portraitTex, envTex, moteTex].forEach(t => t && t.dispose());
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.remove();
    }
  };
}
