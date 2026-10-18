/* The journey beyond campus: distinct stylised places along one road, each with its own mood.
   All geometry is original and procedural. Places build lazily when the camera comes near
   (World handles that), use instancing for repeated parts, and drop detail with distance (LOD). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../geo.js';
import { Location } from '../Location.js';
import { mat, textTexture, PALETTE as P } from '../materials.js';

const view = (X, Y, Z) => ({ charPos: [X, Y, Z], camPos: [X + 1.2, Y + 2.7, Z + 8.5], look: [X, Y + 3.2, Z - 14] });
const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

/* Research / Publications: a modern skyline at blue hour, glowing windows, billboards of paper titles. */
export class Skyline extends Location {
  constructor(pubs) { super('research', 'Research', view(70, 0, -46)); this.pubs = pubs; this.lazy = true;
    this.mood = { fog: '#b6a6d8', hemi: '#e4dcff', sun: '#ffc8d8', exposure: 0.95 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z;
    // towers: one InstancedMesh, varied heights, kept 7+ m off the road
    const N = 34, geo = new THREE.BoxGeometry(1, 1, 1), tower = new THREE.InstancedMesh(geo, mat('#6f5d8e', { roughness: 0.35, metalness: 0.2 }), N);
    const colors = ['#6f5d8e', '#8a6f9e', '#5d5a86', '#9a7fa8'], m4 = new THREE.Matrix4(), c = new THREE.Color();
    this.towerSpots = [];
    for (let i = 0; i < N; i++) {   // towers on the left and far behind; the right side stays open for the road to the valley
      const back = i % 3 === 0, x = back ? X - 8 + rnd() * 12 : X - 8 - rnd() * 22, z = back ? Z - 30 - rnd() * 14 : Z - 4 - rnd() * 28, w = 3 + rnd() * 4, h = 10 + rnd() * 34, d = 3 + rnd() * 4;
      m4.compose(new THREE.Vector3(x, h / 2, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); tower.setMatrixAt(i, m4);
      tower.setColorAt(i, c.set(colors[i % 4])); this.towerSpots.push({ x, z, w, h, d });
    }
    tower.castShadow = true; tower.receiveShadow = true; this.group.add(tower);
    // glowing windows: instanced quads on the front faces; LOD: hidden when the camera is far
    const win = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ color: '#ffe3a3', fog: true }), 1600);
    let k = 0;
    for (const t of this.towerSpots) for (let y = 2; y < t.h - 1 && k < 1600; y += 1.6) for (let x = -t.w / 2 + 0.6; x < t.w / 2 - 0.4 && k < 1600; x += 1.0) {
      if (rnd() < 0.35) continue;
      m4.makeTranslation(t.x + x, y, t.z + t.d / 2 + 0.02); win.setMatrixAt(k++, m4);
    }
    win.count = k; this.windows = win; this.group.add(win);
    // billboards: real paper titles from the publication list
    const pick = this.pubs.slice(0, 3);
    pick.forEach((p, i) => {
      const tex = textTexture(p.title.length > 46 ? p.title.slice(0, 44) + '…' : p.title, { w: 1024, h: 256, bg: '#2a2140', fg: '#ffd9e6', font: '600 46px Inter, sans-serif', sub: String(p.year), subFont: '600 40px Inter, sans-serif' });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: tex }));
      b.position.set(X + (i - 1) * 9, 7 + (i % 2) * 3, Z - 10 - i * 2); this.group.add(b);
      const post = this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, b.position.y, 8), mat('#3a3150')), b.position.x, b.position.y / 2 - 1, b.position.z - 0.1);
      void post;
    });
    // plaza paving + street lamps
    this.add(new THREE.Mesh(new THREE.BoxGeometry(22, 0.06, 18), mat('#cfc7da')), X, 0.03, Z - 4).castShadow = false;
    for (let i = -1; i <= 1; i += 2) for (let j = 0; j < 3; j++) {
      this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4, 8), mat('#3a3150')), X + i * 4.5, 2, Z + 4 - j * 6);
      this.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe8b8' })), X + i * 4.5, 4.1, Z + 4 - j * 6);
    }
  }
  update(ctx, camera) { if (this.windows && camera) this.windows.visible = camera.position.distanceTo(this.charPos) < 90; }
}

/* Teaching: a waterfall valley; cliffs, a falling sheet of water, a river, a bridge, drifting mist. */
export class WaterfallValley extends Location {
  constructor() { super('teaching', 'Teaching', view(104, 0, -96)); this.lazy = true;
    this.mood = { fog: '#bfe0da', hemi: '#e8fff8', sun: '#fff0d8', exposure: 1.0 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z, rock = mat('#9c8fa6', { flatShading: true, roughness: 0.8 });
    // cliffs on both sides of the falls (low-poly boulders)
    [[-11, 13, 9], [11, 13, 9], [-20, 9, 8], [20, 10, 8]].forEach(([dx, h, r], i) => {
      const c = this.add(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rock), X + dx, h / 2 - 1, Z - 24); c.scale.y = h / r * 0.8; c.rotation.y = i;
    });
    this.add(new THREE.Mesh(new THREE.BoxGeometry(14, 16, 6), rock), X, 7, Z - 28);
    // waterfall: scrolling stripe texture on a curved sheet
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = '#bfe8f0'; g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.6})`; g.fillRect(Math.random() * 64, Math.random() * 256, 2 + Math.random() * 4, 20 + Math.random() * 50); }
    this.waterTex = new THREE.CanvasTexture(cv); this.waterTex.wrapS = this.waterTex.wrapT = THREE.RepeatWrapping; this.waterTex.repeat.set(3, 2); this.waterTex.colorSpace = THREE.SRGBColorSpace;
    const fall = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 14, 24, 1, true, -0.45, 0.9), new THREE.MeshBasicMaterial({ map: this.waterTex, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
    fall.position.set(X, 7, Z - 32.5); this.group.add(fall);
    // pool + river running across in front, under the bridge
    const water = mat('#8fd0dd', { roughness: 0.15, metalness: 0.1 });
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.2, 32), water), X, 0.05, Z - 22).castShadow = false;
    const river = this.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.12, 30), water), X, 0.04, Z - 6); river.rotation.y = Math.PI / 2; river.castShadow = false;
    // bridge over the river (the road crosses here)
    const wood = mat('#b98a6a'), rail = mat('#8e2a2e');
    this.add(new THREE.Mesh(new RoundedBoxGeometry(3.4, 0.3, 7, 2, 0.05), wood), X, 0.5, Z - 6);
    [-1, 1].forEach((sd) => {
      this.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 7), rail), X + 1.6 * sd, 1.5, Z - 6);
      for (let i = 0; i < 6; i++) this.add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), rail), X + 1.6 * sd, 1.0, Z - 9.3 + i * 1.3);
    });
    // trees on the banks (instanced cones)
    const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1.2, 4, 7), mat(P.leafDark, { flatShading: true }), 40), m4 = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) { const sd = i % 2 ? 1 : -1; m4.makeTranslation(X + sd * (7 + rnd() * 18), 2, Z - 2 - rnd() * 26); trees.setMatrixAt(i, m4); }
    trees.castShadow = true; this.group.add(trees);
    // mist: drifting points at the base of the falls
    const M = 220, pos = new Float32Array(M * 3);
    for (let i = 0; i < M; i++) { pos[i * 3] = X + (rnd() - 0.5) * 18; pos[i * 3 + 1] = rnd() * 5; pos[i * 3 + 2] = Z - 26 + (rnd() - 0.5) * 10; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mist = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.9, transparent: true, opacity: 0.45, depthWrite: false }));
    this.mist.userData.noOcclude = true; this.group.add(this.mist);
  }
  update({ dt, t }) {
    if (!this.waterTex || this.reduced) return;
    this.waterTex.offset.y += dt * 0.9;
    const p = this.mist.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * (0.4 + (i % 5) * 0.1); if (y > 6) y = 0; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t + i) * dt * 0.2); }
    p.needsUpdate = true;
  }
}

/* Projects: a futuristic tech park; glass pavilion, neon rings and a floating card carousel. */
export class TechPark extends Location {
  constructor(items) { super('projects', 'Projects', view(50, 0, -128)); this.items = items; this.lazy = true;
    this.mood = { fog: '#d3c6ef', hemi: '#efe6ff', sun: '#cfe8ff', exposure: 1.05 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z;
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.25, 6), mat('#e7e3f2', { roughness: 0.3 })), X, 0.12, Z - 6).castShadow = false;
    const glass = new THREE.MeshStandardMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.4 });
    const pav = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 8), glass); pav.position.set(X, 3.2, Z - 16); this.group.add(pav);
    this.add(new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.35, 8.6), mat('#e9e6f4')), X, 6.3, Z - 16);
    // neon rings
    this.rings = [0, 1, 2].map((i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(3 + i * 1.2, 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ff8fb8' : '#7fd8ff' })); r.position.set(X, 4.5, Z - 9); r.userData.noOcclude = true; this.group.add(r); return r; });
    // card carousel (research areas until the professor supplies project data)
    this.cards = new THREE.Group(); this.cards.position.set(X, 3.4, Z - 9); this.group.add(this.cards);
    this.items.forEach((it, i) => {
      const tex = textTexture(it.b, { w: 512, h: 320, bg: '#ffffff', fg: '#3b2a52', font: '700 52px Inter, sans-serif', sub: it.t.slice(0, 38), subFont: '500 26px Inter, sans-serif' });
      const card = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.6, 0.08, 2, 0.04), [mat('#ffffff'), mat('#ffffff'), mat('#ffffff'), mat('#ffffff'), new THREE.MeshBasicMaterial({ map: tex }), mat('#ffffff')]);
      const a = (i / this.items.length) * Math.PI * 2; card.position.set(Math.sin(a) * 4.2, 0, Math.cos(a) * 4.2); card.rotation.y = a; card.userData.noOcclude = true;
      this.cards.add(card);
    });
    // server pillars (instanced) with glowing strips
    const pil = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 3.5, 0.8), mat('#4a4466', { roughness: 0.3, metalness: 0.3 }), 16), m4 = new THREE.Matrix4();
    for (let i = 0; i < 16; i++) { const sd = i % 2 ? 1 : -1; m4.makeTranslation(X + sd * (9 + (i % 4)), 1.75, Z - 2 - Math.floor(i / 2) * 2.5); pil.setMatrixAt(i, m4); }
    pil.castShadow = true; this.group.add(pil);
  }
  update({ dt }) {
    if (!this.cards || this.reduced) return;
    this.cards.rotation.y += dt * 0.25; this.rings.forEach((r, i) => { r.rotation.x += dt * (0.3 + i * 0.2); r.rotation.y += dt * 0.2; });
  }
}

/* Leadership & awards: a monument plaza in golden light; a stepped arch, an obelisk and trophy plinths. */
export class MonumentPlaza extends Location {
  constructor(awards) { super('leadership', 'Leadership & awards', view(22, 0, -186)); this.awards = awards; this.lazy = true;
    this.mood = { fog: '#f2d1a6', hemi: '#fff2dc', sun: '#ffd28a', exposure: 1.05 }; }
  build() {
    const X = this.charPos.x, Z = this.charPos.z, stone = mat('#efe0c8'), gold = mat('#d8a845', { metalness: 0.5, roughness: 0.3 });
    for (let i = 0; i < 4; i++) this.add(new THREE.Mesh(new THREE.BoxGeometry(26 - i * 4, 0.35, 18 - i * 3), stone), X, 0.17 + i * 0.35, Z - 10).castShadow = false;
    // arch
    [-1, 1].forEach((sd) => this.add(new THREE.Mesh(new RoundedBoxGeometry(2, 9, 2, 2, 0.05), stone), X + 4.5 * sd, 6, Z - 16));
    this.add(new THREE.Mesh(new RoundedBoxGeometry(11, 1.6, 2.4, 2, 0.05), stone), X, 11, Z - 16);
    this.add(new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.5, 10, 32, Math.PI), stone), X, 7.2, Z - 16);
    // obelisk
    this.add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.0, 10, 4), stone), X + 12, 5.4, Z - 20).rotation.y = Math.PI / 4;
    this.add(new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 4), gold), X + 12, 11, Z - 20).rotation.y = Math.PI / 4;
    // trophy plinths with labels from the awards timeline
    this.trophies = [];
    this.awards.slice(0, 3).forEach((a, i) => {
      const x = X + (i - 1) * 4, z = Z - 9;
      this.add(new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.4, 1.6, 2, 0.05), stone), x, 2.1, z);
      const cup = new THREE.Group(); cup.position.set(x, 2.8, z); this.group.add(cup);
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold); bowl.position.y = 0.75; bowl.rotation.x = Math.PI; cup.add(bowl);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.25, 0.6, 10), gold); stem.position.y = 0.3; cup.add(stem);
      this.trophies.push(cup);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.55), new THREE.MeshBasicMaterial({ map: textTexture(a.y + ' · ' + a.t.split(',')[0].slice(0, 30), { w: 768, h: 160, bg: '#fff8ec', fg: '#5b3a4f', font: '600 44px Inter, sans-serif' }) }));
      plate.position.set(x, 2.1, z + 0.82); this.group.add(plate);
    });
  }
  update({ t }) { if (this.trophies && !this.reduced) this.trophies.forEach((c, i) => (c.rotation.y = t * 0.6 + i)); }
}
