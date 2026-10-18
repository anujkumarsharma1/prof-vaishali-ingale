/* Materials. Realistic PBR surfaces from small CC0 texture sets (Poly Haven, see world/CREDITS.md), mapped
   triplanar in world space so every box, cylinder and ribbon gets correctly scaled texture without UVs.
   Lite mode (tier 1) keeps plain materials with realistic colour values and no textures. */
import * as THREE from 'three';

export const PALETTE = {
  bg: '#d9cdc4', pink: '#b9786f', peach: '#c98e6c', coral: '#a9533f', mauve: '#7d6470',
  plum: '#3b2a33', cream: '#e6dccd', sand: '#c9b9a3', leaf: '#5f7a3a', leafDark: '#3f5a2c',
  stone: '#bdb3a6', skin: '#c98b6b', hair: '#1e1617', gold: '#c9a227', white: '#f2efea'
};
export const REAL = { lite: false };
const BASE = new URL('../../assets/tex/', import.meta.url).href;
const loader = new THREE.TextureLoader();
const texCache = new Map();
function tex(name, srgb) {
  if (!texCache.has(name)) {
    const t = loader.load(BASE + name);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    texCache.set(name, t);
  }
  return texCache.get(name);
}
const cache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    const o = { ...opts }; delete o.flatShading;
    cache.set(key, new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.8, metalness: 0, ...o }));
  }
  return cache.get(key);
}

/* Triplanar injection: world-space projection for map / normalMap / roughnessMap / emissiveMap.
   triScale = metres per tile (u, v); v runs vertically on walls, so façade textures keep their storeys. */
export function triplanar(m, su, sv = su, macro = true) {
  m.userData.tri = new THREE.Vector2(su, sv);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.triScale = { value: m.userData.tri };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTpPos; varying vec3 vTpN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 tpw = vec4(transformed, 1.0); vec3 tpn = objectNormal;
        #ifdef USE_INSTANCING
          tpw = instanceMatrix * tpw; tpn = mat3(instanceMatrix) * tpn;
        #endif
        vTpPos = (modelMatrix * tpw).xyz; vTpN = normalize(mat3(modelMatrix) * tpn);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vTpPos; varying vec3 vTpN; uniform vec2 triScale;
        vec3 tpW() { vec3 n = pow(abs(normalize(vTpN)), vec3(4.0)); return n / (n.x + n.y + n.z); }
        vec4 tpS(sampler2D t, float k) { vec3 w = tpW(); vec3 p = vTpPos * k;
          return texture2D(t, p.zy / triScale) * w.x + texture2D(t, p.xz / triScale.xx) * w.y + texture2D(t, p.xy / triScale) * w.z; }`)
      .replace('#include <map_fragment>', `#ifdef USE_MAP
          vec4 tc = tpS(map, 1.0);
          ${macro ? 'float mv = dot(tpS(map, 0.137).rgb, vec3(0.333)); tc.rgb *= mix(0.78, 1.18, smoothstep(0.15, 0.65, mv));' : ''}
          diffuseColor *= tc;
        #endif`)
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          roughnessFactor *= tpS(roughnessMap, 1.0).g;
        #endif`)
      .replace('#include <emissivemap_fragment>', `#ifdef USE_EMISSIVEMAP
          totalEmissiveRadiance *= tpS(emissiveMap, 1.0).rgb;
        #endif`)
      .replace('#include <normal_fragment_maps>', `#ifdef USE_NORMALMAP_TANGENTSPACE
        { vec3 wn = normalize(vTpN); vec3 w = tpW(); vec3 p = vTpPos;
          vec3 tx = texture2D(normalMap, p.zy / triScale).xyz * 2.0 - 1.0;
          vec3 ty = texture2D(normalMap, p.xz / triScale.xx).xyz * 2.0 - 1.0;
          vec3 tz = texture2D(normalMap, p.xy / triScale).xyz * 2.0 - 1.0;
          tx.xy *= normalScale; ty.xy *= normalScale; tz.xy *= normalScale;
          tx = vec3(tx.xy + wn.zy, abs(tx.z) * wn.x); ty = vec3(ty.xy + wn.xz, abs(ty.z) * wn.y); tz = vec3(tz.xy + wn.xy, abs(tz.z) * wn.z);
          normal = normalize((viewMatrix * vec4(normalize(tx.zyx * w.x + ty.xzy * w.y + tz.xyz * w.z), 0.0)).xyz); }
        #endif`);
  };
  m.customProgramCacheKey = () => 'tri' + (macro ? 1 : 0);
  return m;
}

/* Surface kinds: CC0 texture set + metres per tile + default tint and response. */
const KINDS = {
  paving:   { set: 'paving',   s: 2.0, color: '#c9c2b8', rough: 1.0, ns: 0.9 },
  asphalt:  { set: 'asphalt',  s: 3.0, color: '#8d8a87', rough: 1.0, ns: 0.8 },
  plaster:  { set: 'plaster',  s: 2.5, color: '#e9e2d8', rough: 1.0, ns: 0.6 },
  concrete: { set: 'concrete', s: 2.5, color: '#c7c1b8', rough: 1.0, ns: 0.7 },
  grass:    { set: 'grass',    s: 2.6, color: '#d2dcb8', rough: 1.0, ns: 0.8 },
  bark:     { set: 'bark',     s: 1.2, color: '#d6cfc6', rough: 1.0, ns: 1.0 },
  metal:    { set: 'metal',    s: 0.8, color: '#b9bdc1', rough: 0.9, ns: 0.4, metal: 0.85 },
  rock:     { set: 'rock',     s: 5.0, color: '#c9c0b4', rough: 1.0, ns: 1.0 },
  wood:     { set: 'wood',     s: 2.0, color: '#c8b49c', rough: 1.0, ns: 0.8 },
};
const LITE_TINT = { paving: '#b9b1a5', asphalt: '#4a4846', plaster: '#d8cfc2', concrete: '#aaa49b', grass: '#5d7238', bark: '#5a4636', metal: '#9a9ea3', rock: '#7c7064', wood: '#7b5a3e' };
export function surf(kind, opts = {}) {
  const K = KINDS[kind], color = opts.color || K.color;
  const key = 'surf:' + kind + JSON.stringify(opts) + REAL.lite;
  if (cache.has(key)) return cache.get(key);
  let m;
  if (REAL.lite) {
    const c = new THREE.Color(opts.color ? color : LITE_TINT[kind]);
    if (opts.color && kind !== 'metal') c.multiplyScalar(0.82);   // textured albedo averages a bit darker than the tint
    m = new THREE.MeshStandardMaterial({ color: c, roughness: opts.roughness ?? (K.metal ? 0.4 : 0.9), metalness: opts.metalness ?? (K.metal || 0) });
  } else {
    m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), map: tex(K.set + '_c.jpg', true), normalMap: tex(K.set + '_n.jpg'), roughnessMap: tex(K.set + '_r.jpg'),
      roughness: opts.roughness ?? K.rough, metalness: opts.metalness ?? (K.metal || 0), normalScale: new THREE.Vector2(K.ns, K.ns)
    });
    triplanar(m, opts.scale || K.s, opts.scaleV || opts.scale || K.s, opts.macro !== false);
  }
  cache.set(key, m); return m;
}

/* Painted surfaces: plaster texture under a paint colour (walls, trims, kerbs). */
export const paint = (color, o = {}) => surf('plaster', { color, ...o });

/* Reflective dark glass for windows (picks up the HDRI sky). */
export function glass(color = '#2a3540', o = {}) {
  return mat(color, { roughness: 0.06, metalness: 0.9, envMapIntensity: 1.2, ...o });
}

/* Curtain-wall façade texture: 4 panels x 4 storeys (6 m x 14 m), mullions, per-panel tint; lit offices for emissive. */
let _cw = null;
export function curtainWall() {
  if (_cw) return _cw;
  const S = 256, mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const a = mk(), e = mk(), r = mk(), ga = a.getContext('2d'), ge = e.getContext('2d'), gr = r.getContext('2d');
  ga.fillStyle = '#3b3f45'; ga.fillRect(0, 0, S, S); ge.fillStyle = '#000'; ge.fillRect(0, 0, S, S); gr.fillStyle = '#bbb'; gr.fillRect(0, 0, S, S);
  const pw = S / 4, ph = S / 4;
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const v = 70 + rnd() * 30; ga.fillStyle = `rgb(${v * 0.82},${v * 0.92},${v * 1.0})`; ga.fillRect(i * pw + 3, j * ph + 3, pw - 6, ph - 14);
    gr.fillStyle = '#141414'; gr.fillRect(i * pw + 3, j * ph + 3, pw - 6, ph - 14);
    ga.fillStyle = '#5a5f66'; ga.fillRect(i * pw, j * ph + ph - 11, pw, 8);   // spandrel band at each floor slab
    if (rnd() < 0.1) { const w = 150 + rnd() * 80; ge.fillStyle = `rgb(${w},${w * 0.78},${w * 0.5})`; ge.fillRect(i * pw + 3, j * ph + 3, pw - 6, ph - 14); }
  }
  const T = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  _cw = { map: T(a, true), emissiveMap: T(e, true), roughnessMap: T(r) };
  return _cw;
}

/* Text on a canvas, used as a sign face. */
export function textTexture(text, { w = 512, h = 256, bg = PALETTE.cream, fg = PALETTE.plum, font = '600 120px Inter, Arial, sans-serif', sub = '', subFont = '500 40px Inter, sans-serif' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font; g.fillText(text, w / 2, sub ? h * 0.42 : h / 2, w * 0.92);
  if (sub) { g.font = subFont; g.globalAlpha = 0.8; g.fillText(sub, w / 2, h * 0.8, w * 0.92); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
/* Fallback sky gradient (Lite mode or while the HDRI loads). */
export function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#5f7aa0'); gr.addColorStop(0.45, '#a9a7b4'); gr.addColorStop(0.72, '#e2b48c'); gr.addColorStop(0.86, '#f0c79a'); gr.addColorStop(1, '#cfb9a4');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* Soft round sprite for mist / foam particles. */
export function softDot() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* Tileable water normal map from summed sine waves (generated, original). */
let _wn = null;
export function waterNormal() {
  if (_wn) return _wn;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), img = g.createImageData(S, S);
  const waves = []; let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) waves.push([Math.round(1 + rnd() * 7) * (rnd() < 0.5 ? -1 : 1), Math.round(1 + rnd() * 7), rnd() * 6.28, 1 / (1 + i * 0.35)]);
  const h = (x, y) => waves.reduce((s, [a, b, p, amp]) => s + amp * Math.sin((a * x + b * y) * 2 * Math.PI / S + p), 0);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = h(x + 1, y) - h(x - 1, y), dy = h(x, y + 1) - h(x, y - 1), k = 2.2;
    let nx = -dx * k, ny = -dy * k, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const o = (y * S + x) * 4; img.data[o] = (nx * 0.5 + 0.5) * 255; img.data[o + 1] = (ny * 0.5 + 0.5) * 255; img.data[o + 2] = (nz * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; _wn = t; return t;
}
/* Water: dark, glossy, two scrolling normal layers (animate via waterTick). */
export function water(color = '#24474a', o = {}) {
  if (REAL.lite) return mat(color, { roughness: 0.15, ...o });
  const n = waterNormal().clone(); n.needsUpdate = true; n.repeat.set(o.repeat || 4, o.repeat || 4);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.05, metalness: 0.1, normalMap: n, normalScale: new THREE.Vector2(0.35, 0.35), envMapIntensity: 1.1, transparent: true, opacity: 0.92 });
  m.userData.isWater = true; delete o.repeat; Object.assign(m, o); return m;
}
export function waterTick(m, dt) { if (m && m.normalMap) { m.normalMap.offset.x += dt * 0.02; m.normalMap.offset.y += dt * 0.035; } }
