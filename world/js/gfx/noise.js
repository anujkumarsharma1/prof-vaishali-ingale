/* Smooth procedural shapes: 3D gradient noise + fbm, and helpers that build organic rocks and hills
   as indexed, vertex-welded meshes so computeVertexNormals() gives smooth shading (no facets). */
import * as THREE from 'three';
import { mergeVertices } from '../../../room/vendor/BufferGeometryUtils.js';

const P = new Uint8Array(512);
(() => { let s = 1337; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647); const p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) P[i] = p[i & 255]; })();
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y, z) => { const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
/* classic improved Perlin noise, range about [-1, 1] */
export function noise3(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z), L = THREE.MathUtils.lerp;
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return L(L(L(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u), L(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    L(L(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u), L(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}
export function fbm(x, y, z, oct = 5) { let a = 0.5, f = 1, s = 0; for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); f *= 2.03; a *= 0.5; } return s; }

/* Boulder / cliff: welded icosphere pushed along its normal by fbm with soft ridges.
   sx/sy/sz stretch the blob; flat clamps the underside so it sits on the ground. */
export function rockGeometry(r, { detail = 5, amp = 0.28, freq = 0.9, seed = 0, sx = 1, sy = 1, sz = 1, flat = -0.35, box = 0.55, strata = 0.05 } = {}) {
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('normal'); g.deleteAttribute('uv'); g = mergeVertices(g, 1e-4);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const m = Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)); v.multiplyScalar(1 + (1 / m - 1) * box);   // toward a rounded block: cliff faces, not balls
    const n = fbm(v.x * freq + seed, v.y * freq * 1.3 + seed * 0.7, v.z * freq - seed, 5);
    const rd = 1 - Math.abs(noise3(v.x * freq * 1.7 + seed, v.y * freq * 2.6, v.z * freq * 1.7 - seed)), ridge = rd * rd;   // ridged gullies
    const layer = Math.sin(v.y * 9 + n * 4 + seed) * strata;                     // soft horizontal bedding
    const k = 1 + amp * n + amp * 0.6 * (ridge - 0.45) + layer;
    v.multiplyScalar(k); v.set(v.x * sx * r, Math.max(v.y, flat) * sy * r, v.z * sz * r);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}
/* Rolling hill: a dense disc lifted by a smooth bell profile plus fbm (no cone tip, no seam). */
export function hillGeometry(r, h, { seed = 0, seg = 72, rings = 24, rough = 0.18 } = {}) {
  const pos = [0, h * (1 + rough * 2 * fbm(seed, seed * 0.3, -seed, 4)), 0], idx = [];
  for (let j = 1; j <= rings; j++) for (let i = 0; i < seg; i++) {
    const t = j / rings, a = (i / seg) * Math.PI * 2, x = Math.cos(a) * t, z = Math.sin(a) * t;
    const bell = Math.pow(Math.cos(t * Math.PI / 2), 1.6), n = fbm(x * 2.2 + seed, seed * 0.3, z * 2.2 - seed, 4);
    pos.push(x * r * (1 + 0.15 * n), h * bell * (1 + rough * 2 * n) - h * 0.04 * (1 - bell), z * r * (1 + 0.15 * n));
  }
  const V = (j, i) => (j === 0 ? 0 : 1 + (j - 1) * seg + (i % seg));
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    if (j === 0) idx.push(0, V(1, i + 1), V(1, i)); else idx.push(V(j, i), V(j, i + 1), V(j + 1, i), V(j, i + 1), V(j + 1, i + 1), V(j + 1, i));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
