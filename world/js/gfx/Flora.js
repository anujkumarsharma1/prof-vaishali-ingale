/* Flora: procedural trees, palms, bushes and hedges with alpha-tested leaf cards (textures drawn here,
   original). Placements are collected per place and flushed as InstancedMeshes (2 draw calls per kind). */
import * as THREE from 'three';
import { mergeGeometries } from '../../../room/vendor/BufferGeometryUtils.js';
import { surf, mat, REAL, triplanar } from './materials.js';

let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const canvasTex = (draw, S = 256, srgb = true) => {
  const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d'), S);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const leafColor = (k) => { const h = 78 + rnd() * 30, s = 30 + rnd() * 25, l = 14 + rnd() * 16 + k; return `hsl(${h},${s}%,${l}%)`; };
/* broadleaf cluster card: many small elliptical leaves on transparent ground */
const leafTex = () => canvasTex((g, S) => {
  for (let i = 0; i < 520; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * S * 0.44, x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r * 0.9;
    g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI * 2); g.fillStyle = leafColor((1 - r / (S * 0.44)) * 10);
    g.beginPath(); g.ellipse(0, 0, 6 + rnd() * 4, 2.6 + rnd() * 1.6, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
}, 256);
/* palm frond: central rachis with drooping leaflets, along the card's length (v) */
const frondTex = () => canvasTex((g, S) => {
  g.strokeStyle = '#6b6a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(S / 2, 0); g.lineTo(S / 2, S); g.stroke();
  for (let y = 6; y < S - 4; y += 4) {
    const t = y / S, len = S * 0.46 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05));
    [-1, 1].forEach((sd) => { g.strokeStyle = leafColor(4); g.lineWidth = 2.4; g.beginPath(); g.moveTo(S / 2, y); g.quadraticCurveTo(S / 2 + sd * len * 0.5, y + 4, S / 2 + sd * len, y + 14 + rnd() * 6); g.stroke(); });
  }
}, 256);
/* dense hedge foliage (tileable, opaque) */
const hedgeTex = () => canvasTex((g, S) => {
  g.fillStyle = '#1d2a14'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * S, y = rnd() * S; g.fillStyle = leafColor(6);
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.save(); g.translate(x + ox, y + oy); g.rotate(rnd() * 6.28); g.beginPath(); g.ellipse(0, 0, 4 + rnd() * 2, 2 + rnd(), 0, 0, 6.28); g.fill(); g.restore(); }
  }
}, 256);

let M = null;
function mats() {
  if (M) return M;
  const leaf = new THREE.MeshStandardMaterial({ map: leafTex(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75 });
  const frond = new THREE.MeshStandardMaterial({ map: frondTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
  let hedge;
  if (REAL.lite) hedge = mat('#34502a', { roughness: 0.9 });
  else { const t = hedgeTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping; hedge = triplanar(new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }), 0.7, 0.7, false); }
  M = { leaf, frond, hedge, bark: surf('bark'), palmBark: surf('bark', { color: '#b8a58c', scale: 0.8 }) };
  return M;
}
export const hedgeMat = () => mats().hedge;

/* --- prototype geometries (built once) --- */
function card(w, h) { const g = new THREE.PlaneGeometry(w, h); return g; }
let P = null;
function protos() {
  if (P) return P;
  // broadleaf tree: tapered trunk + 3 limbs; crown of ~26 crossed cards in an ellipsoid
  const trunk = [new THREE.CylinderGeometry(0.13, 0.22, 3.2, 8).translate(0, 1.6, 0)];
  for (let i = 0; i < 3; i++) { const l = new THREE.CylinderGeometry(0.05, 0.1, 1.8, 6).translate(0, 0.9, 0); l.rotateZ(0.6); l.rotateY((i / 3) * Math.PI * 2 + 0.4); l.translate(0, 2.6, 0); trunk.push(l); }
  const crown = [];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()), y = 3.4 + (rnd() - 0.3) * 2.6, s = 1.5 + rnd() * 0.9;
    const c = card(s, s); c.rotateX(-Math.PI / 2 + (rnd() - 0.5) * 1.6); c.rotateY(rnd() * Math.PI); c.translate(Math.cos(a) * r * 2.0, y, Math.sin(a) * r * 2.0); crown.push(c);
  }
  // palm: gently curved ringed trunk (segments) + 11 arched fronds made of bent strips
  const ptr = [], H = 6, segs = 8;
  for (let i = 0; i < segs; i++) { const y0 = (i / segs) * H, c = new THREE.CylinderGeometry(0.16 - i * 0.006, 0.19 - i * 0.006, H / segs, 8).translate(0.04 * (i * i) / 8, y0 + H / segs / 2, 0); ptr.push(c); }
  const pfr = [];
  for (let k = 0; k < 11; k++) {
    const L = 2.4 + rnd() * 0.6, g = new THREE.PlaneGeometry(0.9, L, 1, 8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const v = Math.min(1, Math.max(0, (p.getY(i) + L / 2) / L)); p.setY(i, v * L * 0.9); p.setZ(i, -Math.pow(v, 1.8) * L * 0.55); p.setX(i, p.getX(i) * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, v * 1.1 + 0.05)))); }
    g.computeVertexNormals(); g.rotateX(-Math.PI / 2 + 0.55 + rnd() * 0.3); g.rotateY((k / 11) * Math.PI * 2 + rnd() * 0.3); g.translate(0.04 * 8, H, 0); pfr.push(g);
  }
  // bush: a few cards around a short stub
  const bush = []; for (let i = 0; i < 9; i++) { const c = card(0.9, 0.9); c.rotateY(rnd() * Math.PI); c.rotateX((rnd() - 0.5) * 0.8); c.translate((rnd() - 0.5) * 0.35, 0.45 + rnd() * 0.3, (rnd() - 0.5) * 0.35); bush.push(c); }
  P = { tTrunk: mergeGeometries(trunk), tCrown: mergeGeometries(crown), pTrunk: mergeGeometries(ptr), pFrond: mergeGeometries(pfr), bush: mergeGeometries(bush) };
  return P;
}

export class Flora {
  constructor() { this.trees = []; this.palms = []; this.bushes = []; }
  tree(x, y, z, s = 1) { this.trees.push([x, y, z, s * (0.85 + rnd() * 0.3), rnd() * 6.28]); }
  palm(x, y, z, s = 1) { this.palms.push([x, y, z, s * (0.85 + rnd() * 0.3), rnd() * 6.28]); }
  bush(x, y, z, s = 1) { this.bushes.push([x, y, z, s * (0.8 + rnd() * 0.4), rnd() * 6.28]); }
  /* returns the meshes added to group */
  flush(group, shadows = true) {
    const p = protos(), m = mats(), out = [];
    const inst = (geo, material, list, cast = true) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, material, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach(([x, y, z, s, r], i) => { q.setFromAxisAngle(up, r); im.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s))); });
      im.castShadow = cast && shadows; im.receiveShadow = true; im.computeBoundingSphere(); group.add(im); out.push(im);
    };
    inst(p.tTrunk, m.bark, this.trees); inst(p.tCrown, m.leaf, this.trees);
    inst(p.pTrunk, m.palmBark, this.palms); inst(p.pFrond, m.frond, this.palms);
    inst(p.bush, m.leaf, this.bushes, false);
    return out;
  }
}
