/* About: a rooftop terrace with a giant voxel "HI!" that pops in when you arrive. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../../../room/vendor/RoundedBoxGeometry.js';
import { Location } from '../Location.js';
import { clay, PALETTE as P } from '../materials.js';

const GLYPHS = {
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['1', '1', '1', '1', '1', '1', '1'],
  '!': ['1', '1', '1', '1', '1', '0', '1']
};
const X = 30, Y = 1.2, Z = -16;   // a raised terrace on the ground (the road can reach it)

export class HiTerrace extends Location {
  constructor() { super('about', 'About', { charPos: [X, Y, Z + 6], camPos: [X - 1.5, Y + 2.6, Z + 14], look: [X, Y + 3.2, Z - 4] }); }
  build() {
    // building under the terrace
    this.add(new THREE.Mesh(new RoundedBoxGeometry(14, Y, 14, 4, 0.3), clay(P.cream)), X, Y / 2 - 0.05, Z + 2);
    // terrace floor and puffy parapet
    this.add(new THREE.Mesh(new RoundedBoxGeometry(14.4, 0.5, 14.4, 3, 0.2), clay(P.sand)), X, Y - 0.25, Z + 2);
    [[0, 9.1, 14, 0.6], [0, -5.1, 14, 0.6], [-7.1, 2, 0.6, 14], [7.1, 2, 0.6, 14]].forEach(([dx, dz, w, d]) =>
      this.add(new THREE.Mesh(new RoundedBoxGeometry(w, 0.9, d, 3, 0.25), clay(P.pink)), X + dx, Y + 0.45, Z + dz));
    // potted plants
    [[-5.5, 7.5], [5.5, 7.5], [-5.5, -3.5]].forEach(([dx, dz]) => {
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.7, 16), clay(P.coral)), X + dx, Y + 0.35, Z + dz);
      this.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), clay(P.leaf, { flatShading: true })), X + dx, Y + 1.2, Z + dz);
    });
    // voxel HI!
    this.voxels = [];
    const s = 0.62, geo = new RoundedBoxGeometry(s * 0.92, s * 0.92, s * 0.92, 2, 0.1);
    const mats = [clay(P.coral), clay(P.pink), clay(P.peach)];
    let ox = -((5 + 1.6 + 1 + 1.6 + 1) * s) / 2, gi = 0;
    for (const ch of ['H', 'I', '!']) {
      const rows = GLYPHS[ch];
      rows.forEach((row, r) => [...row].forEach((bit, c) => {
        if (bit !== '1') return;
        const m = new THREE.Mesh(geo, mats[gi]);
        const home = new THREE.Vector3(X + ox + c * s, Y + 0.6 + (rows.length - 1 - r) * s, Z - 3);
        m.position.copy(home); m.castShadow = true; m.userData.home = home; m.userData.d = Math.random() * 0.6 + (c + r) * 0.03;
        this.group.add(m); this.voxels.push(m);
      }));
      ox += (rows[0].length + 1.6) * s; gi++;
    }
    this._pop = 1;
  }
  enter() { super.enter(); if (!this.reduced) this._pop = 0; }
  update({ dt, t }) {
    if (this._pop < 1.6) this._pop += dt;
    for (const v of this.voxels) {
      const k = Math.min(1, Math.max(0, (this._pop - v.userData.d) / 0.5));
      const e = k === 1 ? 1 : 1 - Math.pow(1 - k, 3) * Math.cos(k * 6);   // springy ease
      v.scale.setScalar(Math.max(0.001, e));
      v.position.y = v.userData.home.y + (this.reduced ? 0 : Math.sin(t * 1.5 + v.userData.home.x) * 0.03);
    }
  }
}
