/* Home: a stylised campus gate on a grassy plaza (generic arch, no institutional logo). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../../../room/vendor/RoundedBoxGeometry.js';
import { Location } from '../Location.js';
import { clay, textTexture, PALETTE as P } from '../materials.js';

export class CampusGate extends Location {
  constructor(content) {
    super('home', 'Home', { charPos: [0, 0, 0], camPos: [0, 2.4, 7.5], look: [0, 2.6, -8] });
    this.content = content;
  }
  build() {
    const g = this.group;
    // plaza
    const plaza = this.add(new THREE.Mesh(new THREE.CylinderGeometry(14, 14.6, 1.2, 48), clay(P.leaf)), 0, -0.6, -6);
    plaza.castShadow = false;
    this.add(new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.12, 16, 2, 0.05), clay(P.sand)), 0, 0.02, -4);
    // gate pillars + arch
    const pillar = new RoundedBoxGeometry(1.2, 5.2, 1.2, 3, 0.18);
    this.add(new THREE.Mesh(pillar, clay(P.stone)), -3.2, 2.6, -9);
    this.add(new THREE.Mesh(pillar, clay(P.stone)), 3.2, 2.6, -9);
    const arch = this.add(new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.42, 16, 40, Math.PI), clay(P.coral)), 0, 5.2, -9);
    arch.scale.z = 1.4;
    // sign board with her name
    const sign = new THREE.Mesh(new RoundedBoxGeometry(5.6, 1.3, 0.35, 3, 0.12), [
      clay(P.cream), clay(P.cream), clay(P.cream), clay(P.cream),
      new THREE.MeshStandardMaterial({ map: textTexture(this.content.name.replace(/^Prof\.\s*/, ''), { w: 1024, h: 238, font: '600 104px Quicksand, Comfortaa, Inter, sans-serif' }), roughness: 0.9 }),
      clay(P.cream)
    ]);
    this.add(sign, 0, 6.9, -9);
    // pillar caps
    const cap = new THREE.SphereGeometry(0.62, 24, 16);
    this.add(new THREE.Mesh(cap, clay(P.peach)), -3.2, 5.6, -9);
    this.add(new THREE.Mesh(cap, clay(P.peach)), 3.2, 5.6, -9);
    // campus blocks behind the gate
    const blockMat = [clay(P.cream), clay(P.sand), clay(P.stone)];
    [[-7, -15, 4, 5, 3], [7.5, -16, 5, 6.5, 3.4], [0, -19, 7, 4, 3], [-11, -11, 3, 3, 3]].forEach(([x, z, w, h, d], i) => {
      const b = this.add(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.25), blockMat[i % 3]), x, h / 2, z);
      // window strips
      for (let r = 0; r < Math.floor(h / 1.4); r++) {
        const win = new THREE.Mesh(new RoundedBoxGeometry(w * 0.8, 0.35, 0.1, 2, 0.05), clay(P.mauve));
        win.position.set(0, -h / 2 + 1 + r * 1.3, d / 2 + 0.02); b.add(win);
      }
    });
    // trees
    this.trees = [];
    [[-6, -4], [6, -5], [-9, -8], [9.5, -9], [-4.5, 3], [5, 2.5]].forEach(([x, z], i) => this.trees.push(this._tree(x, z, i)));
    void g;
  }
  _tree(x, z, i) {
    const t = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.6, 8), clay('#b07a63'));
    trunk.position.y = 0.8; trunk.castShadow = true; t.add(trunk);
    const s = 0.9 + (i % 3) * 0.25;
    [[0, 2.1, 0, 1.1], [0.5, 1.8, 0.2, 0.75], [-0.45, 1.9, -0.1, 0.8]].forEach(([a, b, c, r]) => {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), clay(i % 2 ? P.leafDark : P.leaf, { flatShading: true }));
      m.position.set(a, b * s, c); m.castShadow = true; t.add(m);
    });
    t.position.set(x, 0, z); this.group.add(t); return t;
  }
  update({ t }) {
    if (this.reduced) return;
    this.trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * 0.8 + i) * 0.02; });
  }
}
