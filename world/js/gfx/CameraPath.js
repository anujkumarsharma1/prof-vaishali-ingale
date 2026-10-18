/* CameraPath: one spline each for the camera, its look target and the avatar, through every location.
   Location i sits at t = i/(n-1). Scroll, swipe and keys move a target t; the current t follows with
   critically damped smoothing; when input stops it snaps to the nearest location. */
import * as THREE from 'three';

const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

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
  jump(i) { this.t = this.target = this.secT(i); this.vel = 0; this._idle = 1; this._prev = null; this._yaw = undefined; }
  glide(i) { this.target = this.secT(i); this._idle = 1; }
  update(dt) {
    this._idle += dt; this._dt = dt;
    if (this._idle > 0.35) {                      // snap to the nearest place
      const near = Math.round(this.target * (this.n - 1));
      this.target += (this.secT(near) - this.target) * (1 - Math.exp(-dt * 3));
    }
    if (this.store.get('reducedMotion')) { this.t = this.target; this.vel = 0; }
    else {                                        // spring smoothing (momentum feel)
      const k = 6, c = 2 * Math.sqrt(k);   // critically damped: no overshoot, ~1.8 s glide
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
    const dt = Math.max(1e-3, this._dt || 0.016);
    const speed = this._prev ? this._prev.distanceTo(p) / dt : 0;
    this._prev = (this._prev || new THREE.Vector3()).copy(p);
    character.group.position.copy(p);
    // heading: along the road while moving, toward the place's focus when parked (back to camera)
    const L = this._l, idleYaw = Math.atan2(L.x - p.x, L.z - p.z);
    const tan = this.char.getTangent(t, this._tan || (this._tan = new THREE.Vector3())).multiplyScalar(Math.sign(this.vel) || 1);
    const moveYaw = Math.atan2(tan.x, tan.z);
    const w = THREE.MathUtils.smoothstep(speed, 0.5, 3);
    let want = idleYaw + angDiff(idleYaw, moveYaw) * w;
    if (this._yaw === undefined) this._yaw = want;
    const step = angDiff(this._yaw, want) * (1 - Math.exp(-dt * 8));
    this._yaw += step;
    character.group.rotation.y = this._yaw;
    // walk on foot from the gate to the main building; ride the scooter on the longer hops after that
    character.setMotion(speed, step / dt, t > this.secT(1) + 0.01, t > this.secT(1) - 0.03);
  }
}
