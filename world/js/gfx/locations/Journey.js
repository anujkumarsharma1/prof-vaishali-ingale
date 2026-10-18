/* The journey beyond campus: distinct stylised places along one road, each with its own mood.
   All geometry is original and procedural. Places build lazily when the camera comes near
   (World handles that), use instancing for repeated parts, and drop detail with distance (LOD). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../geo.js';
import { Location } from '../Location.js';
import { mat, surf, paint, glass, water, waterTick, curtainWall, softDot, textTexture, triplanar, waterfallMaterial, REAL } from '../materials.js';
import { rockGeometry } from '../noise.js';
import { Flora } from '../Flora.js';

const view = (X, Y, Z) => ({ charPos: [X, Y, Z], camPos: [X + 1.2, Y + 2.7, Z + 8.5], look: [X, Y + 3.2, Z - 14] });
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

/* Research / Publications: a modern skyline at blue hour, glowing windows, billboards of paper titles. */
export class Skyline extends Location {
  constructor(pubs) { super('research', 'Research', view(74, 0, -50)); this.pubs = pubs; this.lazy = true;
    this.mood = { fog: '#b9b3b4', hemi: '#c3cde0', sun: '#ffbf8f', exposure: 0.85 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z;
    // towers: one InstancedMesh, varied heights, kept 7+ m off the road
    const N = 34, geo = new THREE.BoxGeometry(1, 1, 1);
    let tmat;
    if (REAL.lite) tmat = mat('#4a5560', { roughness: 0.2, metalness: 0.6 });
    else {   // glass curtain wall: mullion grid every 1.5 m, floor slabs every 3.5 m, some offices lit; reflects the HDRI
      const cw = curtainWall();
      tmat = triplanar(new THREE.MeshStandardMaterial({ map: cw.map, roughnessMap: cw.roughnessMap, emissiveMap: cw.emissiveMap, emissive: '#ffd9a0', emissiveIntensity: 0.3, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.5 }), 6, 14, false);
    }
    const tower = new THREE.InstancedMesh(geo, tmat, N);
    const colors = ['#ffffff', '#e6eef5', '#f2ece4', '#dfe6ea'], m4 = new THREE.Matrix4(), c = new THREE.Color();
    this.towerSpots = [];
    for (let i = 0; i < N; i++) {   // towers on the left and far behind; the right side stays open for the road to the valley
      const back = i % 3 === 0, x = back ? X - 8 + rnd() * 12 : X - 8 - rnd() * 22, z = back ? Z - 30 - rnd() * 14 : Z - 4 - rnd() * 28, w = 6 * Math.round(1 + rnd() * 2), h = 3.5 * Math.round(4 + rnd() * 9), d = 6 * Math.round(1 + rnd() * 1.5);
      m4.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); tower.setMatrixAt(i, m4);
      tower.setColorAt(i, c.set(colors[i % 4])); this.towerSpots.push({ x, z, w, h, d });
    }
    tower.castShadow = true; tower.receiveShadow = true; this.group.add(tower);
    // roof plant boxes on top of each tower (instanced)
    const roof = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), surf('concrete', { color: '#8c8780' }), N);
    this.towerSpots.forEach((t, i) => roof.setMatrixAt(i, m4.compose(new THREE.Vector3(t.x, t.h + 0.6, t.z), new THREE.Quaternion(), new THREE.Vector3(t.w * 0.5, 1.2, t.d * 0.5))));
    this.group.add(roof);
    // billboards: real paper titles from the publication list
    const pick = this.pubs.slice(0, 3);
    pick.forEach((p, i) => {
      const tex = textTexture(p.title.length > 46 ? p.title.slice(0, 44) + '…' : p.title, { w: 1024, h: 256, bg: '#1f2326', fg: '#f1ece4', font: '600 46px Inter, sans-serif', sub: String(p.year), subFont: '600 40px Inter, sans-serif' });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tex }));
      b.position.set(X + (i - 1) * 9, 7 + (i % 2) * 3, Z - 10 - i * 2); this.group.add(b);
      const post = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, b.position.y, 10), surf('metal', { color: '#55595e', metalness: 0.9 })), b.position.x, b.position.y / 2 - 1, b.position.z - 0.1);
      void post;
    });
    // plaza paving + street lamps
    this.add(new THREE.Mesh(new RoundedBoxGeometry(22, 0.06, 18, 3, 0.02), surf('paving', { color: '#bdb6ad' })), X, 0.03, Z - 4).castShadow = false;
    for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 3; j++) {
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.5, 10), surf('metal', { color: '#3d4044', metalness: 0.9 })), X + i * 4.5, 2, Z + 4 - j * 6);
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.3, 12), new THREE.MeshBasicMaterial({ color: '#ffe2ac' })), X + i * 4.5, 4.6, Z + 4 - j * 6);
    }
  }
  update() {}
}

/* Teaching: a waterfall valley; cliffs, a falling sheet of water, a river, a bridge, drifting mist. */
export class WaterfallValley extends Location {
  constructor() { super('teaching', 'Teaching', view(112, 0, -104)); this.lazy = true;
    this.mood = { fog: '#b9c2b4', hemi: '#c9d6d6', sun: '#ffd2a0', exposure: 0.9 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z, rock = surf('rock', { scale: 6 });
    // cliffs on both sides of the falls: welded, noise-displaced boulders with smooth normals (no facets)
    const det = REAL.lite ? 4 : 5;
    [[-12.5, 15, 8], [12.5, 15, 8], [-23, 10, 8], [23, 11, 8]].forEach(([dx, h, r], i) => {
      const sy = (h / r) * 0.62, c = this.add(new THREE.Mesh(rockGeometry(r, { detail: det, sx: 0.8, sy, sz: 0.9, seed: i * 3.7, amp: 0.3, freq: 1.0, flat: -0.6 }), rock), X + dx, 0.6 * sy * r - 0.6, Z - 26);
      c.rotation.y = (i % 2 ? -1 : 1) * 0.35;
    });
    // the rock face behind the curtain (its lip sits just above the top of the water)
    this.add(new THREE.Mesh(rockGeometry(8, { detail: det, sx: 1.1, sy: 0.95, sz: 0.55, seed: 9.2, amp: 0.18, freq: 0.9, flat: -0.6, box: 0.7 }), rock), X, 5, Z - 31.5);
    // waterfall: an animated shader curtain (streaks, aerated white water, soft edges) and plunge-pool foam
    this.fallMat = waterfallMaterial('fall'); this.foamMat = waterfallMaterial('foam');
    const fall = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.6, 12.4, 48, 6, true, -0.42, 0.84), this.fallMat);
    fall.position.set(X, 6.1, Z - 32.5); fall.userData.noOcclude = true; fall.renderOrder = 2; this.group.add(fall);
    const foamDisc = new THREE.Mesh(new THREE.CircleGeometry(6.5, 48), this.foamMat); foamDisc.rotation.x = -Math.PI / 2;
    foamDisc.position.set(X, 0.2, Z - 24.8); foamDisc.scale.set(1, 0.6, 1); foamDisc.userData.noOcclude = true; foamDisc.renderOrder = 3; this.group.add(foamDisc);
    this.waterTex = true;
    this.waterMat = water('#21423f', { repeat: 6 });
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.2, 48), this.waterMat), X, 0.05, Z - 22).castShadow = false;
    const river = this.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 30), this.waterMat), X, 0.04, Z - 6); river.rotation.y = Math.PI / 2; river.castShadow = false;
    // timber bridge with steel handrails
    const wood = surf('wood', { scale: 1.5 }), rail = surf('metal', { color: '#3b3d40', metalness: 0.85 });
    this.add(new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.3, 7, 2, 0.02), wood), X, 0.5, Z - 6);
    [-1, 1].forEach((sd) => {
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 7, 10), rail), X + 1.6 * sd, 1.6, Z - 6).rotation.x = Math.PI / 2;
      for (let i = 0; i < 6; i++) this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), rail), X + 1.6 * sd, 1.1, Z - 9.3 + i * 1.3);
    });
    const fl = new Flora();
    for (let i = 0; i < 20; i++) { const sd = i % 2 ? 1 : -1; fl.tree(X + sd * (11 + rnd() * 16), 0, Z - 4 - rnd() * 24, 1 + rnd() * 0.4); }
    fl.flush(this.group);
    // mist: drifting points at the base of the falls
    const M = 140, pos = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) { pos[i * 3] = X + (rnd() - 0.5) * 18; pos[i * 3 + 1] = rnd() * 5; pos[i * 3 + 2] = Z - 26 + (rnd() - 0.5) * 10; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mist = new THREE.Points(pg, new THREE.PointsMaterial({ map: softDot(), color: '#eef3f3', size: 4.5, transparent: true, opacity: 0.16, depthWrite: false }));
    this.mist.userData.noOcclude = true; this.group.add(this.mist);
  }
  update({ dt, t }) {
    if (!this.waterTex) return;
    waterTick(this.waterMat, dt);
    if (this.reduced) return;
    this.fallMat.uniforms.uTime.value += dt; this.foamMat.uniforms.uTime.value += dt;
    const p = this.mist.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (0.4 + (i % 5) * 0.1); if (y > 6) y = 0; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.2); }
    p.needsUpdate = true;
  }
}

/* Projects: a futuristic tech park; glass pavilion, neon rings and a floating card carousel. */
export class TechPark extends Location {
  constructor(items) { super('projects', 'Projects', view(56, 0, -140)); this.items = items; this.lazy = true;
    this.mood = { fog: '#c2bdb9', hemi: '#cdd3df', sun: '#ffd0a8', exposure: 0.9 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z;
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.25, 6), surf('concrete', { color: '#cfcac3' })), X, 0.12, Z - 6).castShadow = false;
    const glassM = new THREE.MeshPhysicalMaterial({ color: '#9fb4bd', transparent: true, opacity: 0.45, roughness: 0.04, metalness: 0.1, envMapIntensity: 1.4 });
    const pav = new THREE.Mesh(new RoundedBoxGeometry(14, 6, 8, 3, 0.09), glassM); pav.position.set(X, 3.2, Z - 16); this.group.add(pav);
    this.add(new THREE.Mesh(new RoundedBoxGeometry(14.6, 0.35, 8.6, 3, 0.08), surf('concrete', { color: '#d8d3cb' })), X, 6.3, Z - 16);
    this.rings = [];
    // card carousel (research areas until the professor supplies project data)
    this.cards = new THREE.Group(); this.cards.position.set(X, 3.4, Z - 9); this.group.add(this.cards);
    this.items.forEach((it, i) => {
      const tex = textTexture(it.b, { w: 512, h: 320, bg: '#f3f1ed', fg: '#22262a', font: '700 52px Inter, sans-serif', sub: it.t.slice(0, 38), subFont: '500 26px Inter, sans-serif' });
      const card = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 0.04), [mat('#8d9196', { metalness: 0.9, roughness: 0.4 }), mat('#8d9196', { metalness: 0.9, roughness: 0.4 }), mat('#8d9196', { metalness: 0.9, roughness: 0.4 }), mat('#8d9196', { metalness: 0.9, roughness: 0.4 }), new THREE.MeshBasicMaterial({ map: tex }), mat('#8d9196', { metalness: 0.9, roughness: 0.4 })]);
      const a = (i / this.items.length) * Math.PI * 2; card.position.set(Math.sin(a) * 4.2, 0, Math.cos(a) * 4.2); card.rotation.y = a; card.userData.noOcclude = true;
      this.cards.add(card);
    });
    // server pillars (instanced) with glowing strips
    const pil = new THREE.InstancedMesh(new RoundedBoxGeometry(0.8, 3.5, 0.8, 3, 0.06), surf('metal', { color: '#3f4347', metalness: 0.8 }), 8), m4 = new THREE.Matrix4();
    for (let i = 0; i < 8; i++) { const sd = i % 2 ? 1 : -1; m4.makeTranslation(X + sd * (13 + (i % 4) * 0.6), 1.75, Z - 6 - Math.floor(i / 2) * 3.5); pil.setMatrixAt(i, m4); }
    pil.castShadow = true; this.group.add(pil);
  }
  update({ dt }) {
    if (!this.cards || this.reduced) return;
    this.cards.rotation.y += dt * 0.25; this.rings.forEach((r, i) => { r.rotation.x += dt * (0.3 + i * 0.2); r.rotation.y += dt * 0.2; });
  }
}

/* Leadership & awards: a monument plaza in golden light; a stepped arch, an obelisk and trophy plinths. */
export class MonumentPlaza extends Location {
  constructor(awards) { super('leadership', 'Leadership & awards', view(26, 0, -202)); this.awards = awards; this.lazy = true;
    this.mood = { fog: '#d9c09e', hemi: '#d2cfca', sun: '#ffc27a', exposure: 0.9 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z, stone = surf('concrete', { color: '#d9c6a3', scale: 2 }), gold = mat('#c9a227', { metalness: 1, roughness: 0.28 });
    for (let i = 0; i < 4; i++) this.add(new THREE.Mesh(new RoundedBoxGeometry(26 - i * 4, 0.35, 18 - i * 3, 3, 0.05), stone), X, 0.17 + i * 0.35, Z - 10).castShadow = false;
    // arch
    [-1, 1].forEach((sd) => this.add(new THREE.Mesh(new RoundedBoxGeometry(2, 9, 2, 2, 0.02), stone), X + 4.5 * sd, 6, Z - 16));
    this.add(new THREE.Mesh(new RoundedBoxGeometry(11, 1.6, 2.4, 2, 0.02), stone), X, 11, Z - 16);
    this.add(new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.5, 16, 64, Math.PI), stone), X, 7.2, Z - 16);
    // obelisk
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.0, 10, 4), stone), X + 12, 5.4, Z - 20).rotation.y = Math.PI / 4;
    this.add(new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 4), gold), X + 12, 11, Z - 20).rotation.y = Math.PI / 4;
    // trophy plinths with labels from the awards timeline
    this.trophies = [];
    this.awards.slice(0, 3).forEach((a, i) => {
      const x = X + (i - 1) * 4, z = Z - 9;
      this.add(new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.4, 1.6, 2, 0.02), stone), x, 2.1, z);
      const cup = new THREE.Group(); cup.position.set(x, 2.8, z); this.group.add(cup);
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold); bowl.position.y = 0.75; bowl.rotation.x = Math.PI; cup.add(bowl);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 0.6, 10), gold); stem.position.y = 0.3; cup.add(stem);
      this.trophies.push(cup);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), new THREE.MeshBasicMaterial({ map: textTexture(a.y + ' · ' + a.t.split(',')[0].slice(0, 30), { w: 768, h: 160, bg: '#2a2622', fg: '#e3c98f', font: '600 44px Inter, sans-serif' }) }));
      plate.position.set(x, 2.1, z + 0.82); this.group.add(plate);
    });
  }
  update({ t }) { if (this.trophies && !this.reduced) this.trophies.forEach((c, i) => (c.rotation.y = t * 0.6 + i)); }
}
