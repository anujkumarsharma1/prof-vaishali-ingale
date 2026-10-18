/* Shared clay materials (cached) and a canvas-text texture helper. */
import * as THREE from 'three';

export const PALETTE = {
  bg: '#efe9ec', pink: '#f4a7b9', peach: '#ffc9a8', coral: '#f2797a', mauve: '#a8738f',
  plum: '#5b3a4f', cream: '#fff6ee', sand: '#f3dcc8', leaf: '#9cc7a4', leafDark: '#6fa58a',
  stone: '#e6d6d0', skin: '#c98b6b', hair: '#2b1d1f', gold: '#e8b86b', white: '#ffffff'
};
const cache = new Map();
export function clay(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!cache.has(key)) {
    cache.set(key, new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.82, metalness: 0, ...opts }));
  }
  return cache.get(key);
}
/* Text on a canvas, used as a sign or glyph face. */
export function textTexture(text, { w = 512, h = 256, bg = PALETTE.cream, fg = PALETTE.plum, font = '600 120px Quicksand, Comfortaa, Inter, sans-serif', sub = '', subFont = '500 40px Inter, sans-serif' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = font; g.fillText(text, w / 2, sub ? h * 0.42 : h / 2, w * 0.92);
  if (sub) { g.font = subFont; g.globalAlpha = 0.8; g.fillText(sub, w / 2, h * 0.8, w * 0.92); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
/* Vertical sky gradient for scene.background. */
export function skyTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#c9a3c4'); gr.addColorStop(0.45, '#f6b8b8'); gr.addColorStop(0.75, '#ffd3b5'); gr.addColorStop(1, '#efe9ec');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
