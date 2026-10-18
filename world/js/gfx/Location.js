/* Location: base class for one place in the world.
   Subclasses build() their meshes into this.group and define the anchors:
   charPos (where the avatar stands), camPos (camera), look (what the camera looks at). */
import * as THREE from 'three';

export class Location {
  constructor(id, label, { charPos, camPos, look }) {
    this.id = id; this.label = label;
    this.group = new THREE.Group(); this.group.name = id;
    this.charPos = new THREE.Vector3(...charPos);
    this.camPos = new THREE.Vector3(...camPos);
    this.look = new THREE.Vector3(...look);
    this.pickables = []; this.active = false; this.reduced = false;
  }
  build() {}
  enter() { this.active = true; }
  leave() { this.active = false; }
  update() {}
  dispose() {
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
  /* helper: add a mesh that casts and receives shadows */
  add(mesh, x = 0, y = 0, z = 0) { mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; this.group.add(mesh); return mesh; }
}
