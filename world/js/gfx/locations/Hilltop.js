/* Contact: a hilltop at dusk with giant clay glyph tiles; each tile is a real link. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../../../room/vendor/RoundedBoxGeometry.js';
import { Location } from '../Location.js';
import { clay, textTexture, PALETTE as P } from '../materials.js';

const X = 40, Y = 0, Z = -70;   // ground-level lookout toward the Dighi hills
const GLYPH = { Email: '@', 'Google Scholar': 'Sc', ORCID: 'iD', LinkedIn: 'in' };
const TINT = [P.coral, P.pink, P.peach, P.mauve];

export class Hilltop extends Location {
  constructor(links) {
    super('contact', 'Contact', { charPos: [X, Y, Z + 7], camPos: [X + 1, Y + 2.8, Z + 15.5], look: [X, Y + 2.8, Z - 2] });
    this.links = links;
  }
  build() {
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 1, 32), clay(P.leaf)), X, Y - 0.48, Z + 2);
    // little fort wall hint (Pune hill-fort mood)
    for (let i = -3; i <= 3; i++) this.add(new THREE.Mesh(new RoundedBoxGeometry(1.2, 1 + (i % 2 ? 0.4 : 0), 0.8, 2, 0.15), clay(P.stone)), X + i * 1.5, Y + 0.5, Z - 4.4);
    this.tiles = [];
    const n = this.links.length, gap = 2.9, ox = -((n - 1) * gap) / 2;
    this.links.forEach((l, i) => {
      const face = new THREE.MeshStandardMaterial({ map: textTexture(GLYPH[l.label] || l.label.slice(0, 2), { w: 256, h: 256, bg: TINT[i % 4], fg: P.cream, font: '700 150px Quicksand, Comfortaa, Inter, sans-serif' }), roughness: 0.8 });
      const side = clay(TINT[i % 4]);
      const m = new THREE.Mesh(new RoundedBoxGeometry(2.2, 2.2, 0.9, 4, 0.32), [side, side, side, side, face, side]);
      const home = new THREE.Vector3(X + ox + i * gap, Y + 2.6, Z - 1);
      m.position.copy(home); m.castShadow = true;
      m.userData = { home, href: l.href, label: l.label + (l.value && l.value !== 'Profile' ? ': ' + l.value : ''), i, hover: 0 };
      this.group.add(m); this.tiles.push(m); this.pickables.push(m);
      // label plate
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: textTexture(l.label, { w: 512, h: 128, bg: P.cream, fg: P.plum, font: '600 54px Inter, sans-serif' }) }));
      plate.position.set(home.x, Y + 1.05, Z - 0.5); this.group.add(plate);
    });
  }
  setHover(obj) { this.tiles.forEach((t) => (t.userData.target = t === obj ? 1 : 0)); }
  update({ dt, t }) {
    for (const m of this.tiles) {
      const u = m.userData; u.hover += ((u.target || 0) - u.hover) * Math.min(1, dt * 10);
      const bob = this.reduced ? 0 : Math.sin(t * 1.2 + u.i) * 0.12;
      m.position.y = u.home.y + bob + u.hover * 0.35;
      m.rotation.y = this.reduced ? 0 : Math.sin(t * 0.6 + u.i) * 0.12;
      m.scale.setScalar(1 + u.hover * 0.08);
    }
  }
}
