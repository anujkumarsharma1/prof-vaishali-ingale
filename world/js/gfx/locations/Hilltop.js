/* Contact: a ground-level lookout with giant stylised glyph tiles; each tile is a real link. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../geo.js';
import { Location } from '../Location.js';
import { mat, surf, textTexture, PALETTE as P } from '../materials.js';

const X = -20, Y = 0, Z = -232;   // the hills at sunset, end of the journey
const GLYPH = { Email: '@', 'Google Scholar': 'Sc', ORCID: 'iD', LinkedIn: 'in' };
const TINT = ['#2e3a40', '#3a3330', '#2f3b33', '#3b3340'];   // dark enamel plaque faces

export class Hilltop extends Location {
  constructor(links) {
    super('contact', 'Contact', { charPos: [X, Y, Z + 7], camPos: [X + 1, Y + 2.8, Z + 15.5], look: [X, Y + 2.8, Z - 2] });
    this.links = links; this.lazy = true;
    this.mood = { fog: '#d8b49c', hemi: '#c8c8d8', sun: '#ffb27a', exposure: 0.9 };
  }
  build() {
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1, 48), surf('grass', { color: '#b8ad86' })), X, Y - 0.48, Z + 2);
    // little fort wall hint (Pune hill-fort mood)
    for (let i = -3; i <= 3; i++) this.add(new THREE.Mesh(new RoundedBoxGeometry(1.4, 1 + (i % 2 ? 0.4 : 0), 0.8, 2, 0.02), surf('rock', { color: '#8a837a', scale: 2 })), X + i * 1.5, Y + 0.5, Z - 4.4);
    // Dighi hills backdrop, in frame behind the tiles (low-poly, soft mauve haze)
    [[-26, -38, 16, 11], [-6, -46, 22, 16], [14, -40, 15, 10], [32, -50, 20, 13], [-44, -52, 18, 9]].forEach(([dx, dz, r, h], i) => {
      const g = new THREE.ConeGeometry(r, h, 40, 10), p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const vx = p.getX(k), vy = p.getY(k), vz = p.getZ(k), f = 1 + 0.22 * Math.sin(vx * 0.21 + i) * Math.cos(vz * 0.27 + i * 2) + 0.08 * Math.sin(vx * 0.9 + vz * 0.7) + 0.03 * Math.sin(vx * 2.3 - vz * 1.9); p.setXYZ(k, vx * f * 1.35, vy * (0.75 + 0.25 * f) - Math.max(0, vy) * 0.25 * Math.sin(vx * 0.15), vz * f * 0.8); }
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, surf('grass', { color: '#a8977a', scale: 9 }));
      m.position.set(X + dx, h / 2 - 0.5, Z + dz); m.rotation.y = i; this.group.add(m);
    });
    this.tiles = [];
    const n = this.links.length, gap = 2.9, ox = -((n - 1) * gap) / 2;
    this.links.forEach((l, i) => {
      const face = new THREE.MeshStandardMaterial({ map: textTexture(GLYPH[l.label] || l.label.slice(0, 2), { w: 256, h: 256, bg: TINT[i % 4], fg: '#e9e1d3', font: '600 130px Inter, Arial, sans-serif' }), roughness: 0.35, metalness: 0.2 });
      const side = surf('metal', { color: '#6d7074', metalness: 0.9, roughness: 0.6 });
      const m = new THREE.Mesh(new RoundedBoxGeometry(2.2, 2.2, 0.18, 2, 0.015), [side, side, side, side, face, side]);
      const home = new THREE.Vector3(X + ox + i * gap, Y + 2.6, Z - 1);
      m.position.copy(home); m.castShadow = true;
      m.userData = { home, href: l.href, label: l.label + (l.value && l.value !== 'Profile' ? ': ' + l.value : ''), i, hover: 0 };
      this.group.add(m); this.tiles.push(m); this.pickables.push(m);
      this.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, home.y - 1.1, 0.12), surf('metal', { color: '#3c3e41', metalness: 0.9 })), home.x, (home.y - 1.1) / 2, home.z - 0.15);
      // label plate
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: textTexture(l.label, { w: 512, h: 128, bg: '#e9e3d8', fg: '#2b2522', font: '600 54px Inter, sans-serif' }) }));
      plate.position.set(home.x, Y + 1.05, Z - 0.5); this.group.add(plate);
    });
  }
  setHover(obj) { this.tiles.forEach((t) => (t.userData.target = t === obj ? 1 : 0)); }
  update({ dt, t }) {
    for (const m of this.tiles) {
      const u = m.userData; u.hover += ((u.target || 0) - u.hover) * Math.min(1, dt * 10);
      const bob = 0;
      m.position.y = u.home.y + bob + u.hover * 0.35;
      m.rotation.y = 0;
      m.scale.setScalar(1 + u.hover * 0.08);
    }
  }
}
