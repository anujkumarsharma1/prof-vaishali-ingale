/* CameraPath: one spline each for the camera, its look target and the avatar, through every location.
   Location i sits at t = i/(n-1). Scroll, swipe and keys move a target t; the current t follows with
   critically damped smoothing; when input stops it snaps to the nearest location. */
import * as THREE from 'three';

export class CameraPath {
  constructor(bus, store, locations) {
    this.bus = bus; this.store = store; this.n = locations.length;
    const mk = (k) => new THREE.CatmullRomCurve3(locations.map((l) => l[k].clone()), false, 'centripetal');
    this.cam = mk('camPos'); this.look = mk('look'); this.char = mk('charPos');
    this.t = 0; this.target = 0; this.vel = 0; this._idle = 0; this.section = -1; this.locked = false;
    this._v = new THREE.Vector3(); this._l = new THREE.Vector3();
  }
  secT(i) { return i / (this.n - 1); }
  nudge(d) { if (this.locked) return; this.target = THREE.MathUtils.clamp(this.target + d, 0, 1); this._idle = 0; }
  /* jump without animating (used under the brush cover or with reduced motion) */
  jump(i) { this.t = this.target = this.secT(i); this.vel = 0; this._idle = 1; }
  glide(i) { this.target = this.secT(i); this._idle = 1; }
  update(dt) {
    this._idle += dt; this._dt = dt;
    if (this._idle > 0.35) {                      // snap to the nearest place
      const near = Math.round(this.target * (this.n - 1));
      this.target += (this.secT(near) - this.target) * Math.min(1, dt * 4);
    }
    if (this.store.get('reducedMotion')) { this.t = this.target; this.vel = 0; }
    else {                                        // spring smoothing (momentum feel)
      const k = 22, c = 2 * Math.sqrt(k);
      this.vel += ((this.target - this.t) * k - this.vel * c) * dt;
      this.t += this.vel * dt;
    }
    const near = Math.round(this.t * (this.n - 1));
    if (near !== this.section && Math.abs(this.t - this.secT(near)) < 0.06) {
      const prev = this.section; this.section = near;
      this.bus.emit('section:enter', { index: near, prev });
    }
  }
  apply(camera, character) {
    const t = THREE.MathUtils.clamp(this.t, 0, 1);
    camera.position.copy(this.cam.getPoint(t, this._v));
    camera.lookAt(this.look.getPoint(t, this._l));
    const p = this.char.getPoint(t, this._v);
    const prev = character.group.position.clone();
    character.group.position.copy(p);
    // face away from the camera, toward the look target (back-facing avatar)
    const L = this._l; character.group.rotation.y = Math.atan2(L.x - p.x, L.z - p.z);
    const speed = prev.distanceTo(p) / Math.max(1e-3, this._dt || 0.016);
    character.setSpeed(speed > 0.4 ? speed : 0);
  }
}
