/* Imported CC0 props for the office (credits in ../CREDITS.md).
   Loaded after the room is built; every visible change goes through ctx.whenHidden,
   so nothing appears on camera. If any file fails, the code-built room stays as it is. */

const MODELS = new URL('../assets/models/', import.meta.url);
const TEXTURES = new URL('../assets/textures/', import.meta.url);
const START_DELAY = 600;           // ms after attach, so the first game frames are not competing with downloads
const IST_OFFSET = 330 * 60000;    // UTC+5:30

let cleanup = [];

export function attach(ctx) {
  const { THREE, phone } = ctx;
  return new Promise(r => setTimeout(r, START_DELAY))
    .then(() => Promise.all([import('../vendor/GLTFLoader.js'), import('../vendor/meshopt_decoder.module.js')]))
    .then(([{ GLTFLoader }, { MeshoptDecoder }]) => {
      const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
      const load = name => loader.loadAsync(new URL(name + (phone ? '.phone' : '') + '.glb', MODELS).href).then(g => g.scene);
      const loadDesk = name => loader.loadAsync(new URL(name + '.glb', MODELS).href).then(g => g.scene);
      const jobs = [
        load('chalkboard').then(m => chalkboard(ctx, m)),
        load('plant').then(m => plant(ctx, m)),
        floor(ctx)
      ];
      if (!phone) jobs.push(
        loadDesk('lamp').then(m => lamp(ctx, m)),
        loadDesk('clock').then(m => clock(ctx, m)),
        loadDesk('books').then(m => books(ctx, m))
      );
      // each prop is independent: one failure leaves the others (and the code-built fallback) in place
      return Promise.allSettled(jobs).then(res => {
        res.filter(r => r.status === 'rejected').forEach(r => console.info('props: skipped,', r.reason && r.reason.message));
        return res.filter(r => r.status === 'fulfilled').length;
      });
    });
}

export function detach() {
  cleanup.forEach(fn => { try { fn(); } catch (e) { /* already gone */ } });
  cleanup = [];
}

/* matte, palette-tinted materials: roughness >= 0.6, no metal, no emission */
function matte(ctx, root, { tint = null, rough = 0.85, shadows = !ctx.phone } = {}) {
  const { THREE } = ctx;
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = shadows; o.receiveShadow = shadows;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m) return;
      m.metalness = 0;
      m.roughness = Math.max(rough, m.roughness || 0);
      m.metalnessMap = null; m.roughnessMap = null;
      if (m.emissive) m.emissive.setScalar(0);
      m.envMapIntensity = 0.8;
      if (tint) m.color.multiply(new THREE.Color(tint));
      if (m.map) m.map.anisotropy = Math.min(4, ctx.maxAniso || 1);
      m.needsUpdate = true;
      cleanup.push(() => { m.map && m.map.dispose(); m.normalMap && m.normalMap.dispose(); m.dispose(); });
    });
  });
  return root;
}

/* ---------- chalkboard: board face redrawn as a neural-net sketch, opens Teaching ---------- */
function boardTexture(THREE, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const s = w / 512;
  g.fillStyle = '#323a35'; g.fillRect(0, 0, w, h);
  // faint wiped-chalk haze
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = `rgba(235,230,220,${0.012 + rnd() * 0.02})`;
    g.beginPath(); g.ellipse(rnd() * w, rnd() * h, (60 + rnd() * 140) * s, (14 + rnd() * 30) * s, rnd() * 0.6 - 0.3, 0, Math.PI * 2); g.fill();
  }
  const chalk = 'rgba(240,236,228,0.88)';
  g.fillStyle = chalk; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = `400 ${Math.round(70 * s)}px Fraunces, Georgia, serif`;
  g.fillText('Teaching', w / 2, 118 * s);
  g.fillRect(w * 0.3, 140 * s, w * 0.4, 2.5 * s);
  // a 3-layer network: inputs, hidden, output
  const layers = [3, 4, 2];
  const top = 210 * s, bottom = h - 190 * s;
  const xs = [w * 0.2, w * 0.5, w * 0.8];
  const pos = layers.map((n, li) => Array.from({ length: n }, (_, k) => [xs[li], top + (bottom - top) * (n === 1 ? 0.5 : k / (n - 1)) * (n === 4 ? 1 : 0.7) + (n === 4 ? 0 : (bottom - top) * 0.15)]));
  g.strokeStyle = 'rgba(240,236,228,0.42)'; g.lineWidth = 2 * s; g.lineCap = 'round';
  for (let li = 0; li < 2; li++) pos[li].forEach(a => pos[li + 1].forEach(b => {
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0] + (rnd() - 0.5) * 2 * s, b[1] + (rnd() - 0.5) * 2 * s); g.stroke();
  }));
  const r = 24 * s;
  pos.flat().forEach(([x, y]) => {
    g.fillStyle = '#323a35'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = chalk; g.lineWidth = 3.2 * s; g.beginPath(); g.arc(x, y, r, 0.1, Math.PI * 2.05); g.stroke();
  });
  g.fillStyle = 'rgba(240,236,228,0.7)';
  g.font = `500 ${Math.round(22 * s)}px Inter, system-ui, sans-serif`;
  ['input', 'hidden', 'output'].forEach((t, i) => g.fillText(t, xs[i], bottom + 74 * s));
  g.font = `italic 400 ${Math.round(34 * s)}px Fraunces, Georgia, serif`;
  g.fillStyle = chalk;
  g.fillText('y = σ(Wx + b)', w / 2, h - 52 * s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function chalkboard(ctx, model) {
  const { THREE } = ctx;
  matte(ctx, model, { tint: '#e6cfb8', rough: 0.8 });
  let board = null;
  model.traverse(o => { if (o.isMesh && /board/.test(o.material.name)) board = o; });
  const fonts = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('400 70px Fraunces'), document.fonts.load('500 22px Inter')]).catch(() => null)
    : Promise.resolve();
  return fonts.then(() => {
    if (board) {
      // the source UVs pack both faces into one atlas; give each face the whole drawing, upright
      const geo = board.geometry, p = geo.attributes.position, n = geo.attributes.normal;
      geo.computeBoundingBox();
      const bb = geo.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
      const uv = new Float32Array(p.count * 2);
      for (let i = 0; i < p.count; i++) {
        const x = (p.getX(i) - bb.min.x) / w;
        uv[i * 2] = n.getZ(i) >= 0 ? x : 1 - x;
        uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / h;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      const tex = boardTexture(THREE, ctx.phone ? 256 : 512, ctx.phone ? 384 : 768);
      tex.anisotropy = Math.min(4, ctx.maxAniso || 1);
      board.material.dispose();
      board.material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
      cleanup.push(() => { tex.dispose(); board.material.dispose(); });
    }
    model.name = 'prop:chalkboard';
    ctx.whenHidden(() => {
      ctx.anchors.chalkboard.add(model);
      ctx.addPickable(model, 'teaching', 'Teaching');
    });
  });
}

/* ---------- succulent on the windowsill ---------- */
function plant(ctx, model) {
  matte(ctx, model, { tint: '#f4ece2', rough: 0.8 });
  model.scale.setScalar(0.88);   // the sill is 0.16 m deep; the pot is 0.168 m across
  model.name = 'prop:plant';
  ctx.whenHidden(() => ctx.anchors.plant.add(model));
}

/* ---------- desk lamp, replaces the code-built one ---------- */
function lamp(ctx, model) {
  // the source is bright orange; calm it toward the room's cinnamon and ink
  matte(ctx, model, { tint: '#e6d6ca', rough: 0.7 });
  model.scale.setScalar(0.82);
  model.rotation.y = -2.0;       // head over the desk, arm toward the back-left corner
  model.name = 'prop:lamp';
  ctx.whenHidden(() => {
    ctx.named.lamp.visible = false;
    ctx.anchors.lamp.add(model);
  });
}

/* ---------- Kenney books on the shelf top ---------- */
function books(ctx, model) {
  const { THREE, PAL } = ctx;
  const colours = [PAL.books[0], PAL.books[2], PAL.books[3], PAL.books[4]];
  let k = 0;
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const repl = list.map(() => new THREE.MeshStandardMaterial({ color: colours[k++ % colours.length], roughness: 0.9, metalness: 0 }));
    list.forEach(m => m.dispose());
    o.material = Array.isArray(o.material) ? repl : repl[0];
    repl.forEach(m => cleanup.push(() => m.dispose()));
  });
  model.scale.setScalar(1.25);
  model.position.set(0.12, 0, 0.06);
  model.rotation.y = 0.25;
  model.name = 'prop:books';
  ctx.whenHidden(() => ctx.anchors.shelfTop.add(model));
}

/* ---------- wall clock above the door, real IST time, moved once a minute ---------- */
function clock(ctx, model) {
  const { THREE } = ctx;
  matte(ctx, model, { tint: '#f6ece0', rough: 0.75 });
  // angles (degrees clockwise from 12) the hands point to in the source model
  const hands = { wall_clock_hours_hand: -53.2, wall_clock_minute_hand: 57.0, wall_clock_second_hand: 170.5 };
  const pivots = {};
  Object.keys(hands).forEach(name => {
    const hand = model.getObjectByName(name);
    if (!hand) return;
    const pivot = new THREE.Group();
    hand.parent.add(pivot); pivot.add(hand);   // pivot sits at the dial centre (model origin)
    pivots[name] = pivot;
  });
  const set = () => {
    const t = new Date(Date.now() + IST_OFFSET);
    const m = t.getUTCMinutes(), h = t.getUTCHours() % 12;
    const deg = { wall_clock_hours_hand: (h + m / 60) * 30, wall_clock_minute_hand: m * 6, wall_clock_second_hand: 0 };
    Object.keys(pivots).forEach(n => { pivots[n].rotation.z = -THREE.MathUtils.degToRad(deg[n] - hands[n]); });
    ctx.invalidate();
  };
  set();
  let timer = setTimeout(function tick() { set(); timer = setTimeout(tick, 60000 - (Date.now() % 60000) + 50); }, 60000 - (Date.now() % 60000) + 50);
  cleanup.push(() => clearTimeout(timer));
  model.name = 'prop:clock';
  ctx.whenHidden(() => ctx.anchors.clock.add(model));
}

/* ---------- ambientCG WoodFloor051 on the floor (canvas floor stays if this fails) ---------- */
function floor(ctx) {
  const { THREE, phone } = ctx;
  const tl = new THREE.TextureLoader();
  const get = f => tl.loadAsync(new URL(f, TEXTURES).href);
  return Promise.all([get(phone ? 'woodfloor051_color_256.webp' : 'woodfloor051_color_512.webp'), phone ? null : get('woodfloor051_normal_512.webp')])
    .then(([col, nor]) => {
      // the texture covers 1.8 m; the floor is 4.8 x 5.0 m
      [col, nor].forEach(t => {
        if (!t) return;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(4.8 / 1.8, 5.0 / 1.8);
        t.anisotropy = ctx.maxAniso || 1;
      });
      col.colorSpace = THREE.SRGBColorSpace;
      cleanup.push(() => { col.dispose(); nor && nor.dispose(); });
      ctx.whenHidden(() => {
        const m = ctx.named.floor.material;
        m.map = col;
        if (nor) { m.normalMap = nor; m.normalScale.set(0.5, 0.5); }
        m.roughness = Math.max(0.78, m.roughness);
        m.needsUpdate = true;
      });
    });
}
