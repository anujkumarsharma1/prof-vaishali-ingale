/* "Teach the model": the intro game. The visitor helps a small model learn by stepping a ball
   down a matte loss surface (gradient descent). Each step names one of her research areas.
   At the minimum the surface flattens into the office floor and the walk-in takes over.
   Renders with the room's WebGLRenderer into its own scene; no library beyond three and GSAP. */

const SAND = '#efe2d1', CLAY = '#cc8d68', FLOOR = '#d8bd9b', BG = '#fbf4ec', BALL = '#a04a0d', TRAIL = '#7d5c45';

// the loss: a wide bowl with two soft hills; ripples fade out near the minimum so descent never stalls
const MIN = { x: 1.3, z: -0.9 };
function loss(x, z) {
  const dx = x - MIN.x, dz = z - MIN.z, r2 = dx * dx + dz * dz;
  return 1.75 * (1 - Math.exp(-r2 / 10))
    + 0.6 * Math.exp(-((x + 1.6) ** 2 + (z + 2.4) ** 2) / 1.3)
    + 0.5 * Math.exp(-((x - 3.1) ** 2 + (z - 2.6) ** 2) / 1.6)
    + 0.1 * Math.sin(0.9 * x + 0.4) * Math.cos(0.75 * z) * (r2 / (r2 + 5));
}
function grad(x, z) {
  const e = 1e-3;
  return [(loss(x + e, z) - loss(x - e, z)) / (2 * e), (loss(x, z + e) - loss(x, z - e)) / (2 * e)];
}
// plain gradient descent from a point high on the slope; returns the trajectory as [x, z] pairs
function descend() {
  let x = -3.3, z = 3.1;
  const pts = [[x, z]];
  for (let i = 0; i < 600; i++) {
    const [gx, gz] = grad(x, z);
    x -= 0.9 * gx; z -= 0.9 * gz;
    pts.push([x, z]);
    if (Math.hypot(gx, gz) < 2e-3) break;
  }
  return pts;
}

export function createGame(o) {
  const { THREE, renderer, ui } = o;
  const gsap = o.gsap || window.gsap;
  const phone = !!o.phone;
  const N = phone ? 4 : 6;
  const STEP_DUR = phone ? 0.45 : 0.55;
  const TITLE_DUR = phone ? 1.2 : 2.5;
  const SETTLE = phone ? 0.8 : 1.6;   // flatten into the floor
  const labels = o.labels || [];
  const touch = !!o.touch;
  const now = () => gsap.ticker.time;

  /* ---------- scene ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, phone ? 10 : 9, phone ? 20 : 18);
  const camera = new THREE.PerspectiveCamera(phone ? 52 : 38, 1, 0.1, 60);
  scene.add(new THREE.HemisphereLight('#fff6ec', '#d6b596', 1.15));
  const sun = new THREE.DirectionalLight('#ffe8d0', 1.6);
  sun.position.set(-4, 7, 3.5);
  scene.add(sun, sun.target);
  if (!phone) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 });
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  }

  const SEG = phone ? 40 : 96, SIZE = 11;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const base = new Float32Array(pos.count);
  let hmax = 0;
  for (let i = 0; i < pos.count; i++) { base[i] = loss(pos.getX(i), pos.getZ(i)); hmax = Math.max(hmax, base[i]); }
  const colors = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const cSand = new THREE.Color(SAND), cClay = new THREE.Color(CLAY), cFloor = new THREE.Color(FLOOR), tc = new THREE.Color();
  const surfMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  const surface = new THREE.Mesh(geo, surfMat);
  surface.receiveShadow = !phone;
  scene.add(surface);
  let flat = 1;   // 1 = the loss surface, 0 = flat floor
  function shape(k) {
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, base[i] * k);
      tc.copy(cSand).lerp(cClay, Math.pow(base[i] / hmax, 1.5)).lerp(cFloor, 1 - k);
      colors[i * 3] = tc.r; colors[i * 3 + 1] = tc.g; colors[i * 3 + 2] = tc.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  }
  shape(1);

  /* ---------- the descent path, split into N steps ---------- */
  const traj = descend();
  const cum = [0];
  for (let i = 1; i < traj.length; i++) cum.push(cum[i - 1] + Math.hypot(traj[i][0] - traj[i - 1][0], traj[i][1] - traj[i - 1][1]));
  const L = cum[cum.length - 1];
  // steps shorten gently toward the minimum, as they do in real training
  const stops = [];
  for (let k = 0; k <= N; k++) stops.push(L * (1 - Math.pow(1 - k / N, 1.35)));
  function at(s, out) {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = Math.max(0, Math.min(1, (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)));
    out.x = traj[i - 1][0] + (traj[i][0] - traj[i - 1][0]) * t;
    out.z = traj[i - 1][1] + (traj[i][1] - traj[i - 1][1]) * t;
    return out;
  }

  const R = phone ? 0.2 : 0.17;
  const ballMat = new THREE.MeshStandardMaterial({ color: BALL, roughness: 0.62, metalness: 0 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), ballMat);
  ball.castShadow = !phone;
  scene.add(ball);

  // a faint dotted trail behind the ball
  const DOT_GAP = 0.24;
  const nDots = Math.floor(L / DOT_GAP);
  const dotMat = new THREE.MeshStandardMaterial({ color: TRAIL, roughness: 1, transparent: true, opacity: 0.55 });
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(phone ? 0.04 : 0.032, 8, 6), dotMat, Math.max(1, nDots));
  dots.count = 0;
  scene.add(dots);
  const dotXZ = [];
  for (let d = 1; d <= nDots; d++) dotXZ.push(at(d * DOT_GAP, { x: 0, z: 0 }));
  const m4 = new THREE.Matrix4();
  function placeDots() {
    for (let d = 0; d < dotXZ.length; d++) {
      const p = dotXZ[d];
      m4.makeTranslation(p.x, loss(p.x, p.z) * flat + 0.03, p.z);
      dots.setMatrixAt(d, m4);
    }
    dots.instanceMatrix.needsUpdate = true;
  }
  placeDots();

  const prog = { s: 0 };
  const bp = { x: 0, z: 0 }, last = new THREE.Vector3(), axis = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  function placeBall() {
    at(prog.s, bp);
    ball.position.set(bp.x, loss(bp.x, bp.z) * flat + R * 0.92, bp.z);
    // roll: rotate about the axis across the direction of travel
    const dx = ball.position.x - last.x, dz = ball.position.z - last.z, dist = Math.hypot(dx, dz);
    if (dist > 1e-5 && dist < 1) { axis.set(dz, 0, -dx).normalize(); q.setFromAxisAngle(axis, dist / R); ball.quaternion.premultiply(q); }
    last.copy(ball.position);
    dots.count = Math.min(dotXZ.length, Math.floor(prog.s / DOT_GAP));
  }
  placeBall();

  /* ---------- camera: a slow orbit that follows the ball ---------- */
  const look = new THREE.Vector3(0, 0.6, 0), lookGoal = new THREE.Vector3();
  const cam = { orbit: phone ? 0.75 : 0.62, dist: phone ? 11.5 : 10.2, height: phone ? 9.6 : 7.2, follow: 0 };
  const par = { x: 0, y: 0, gx: 0, gy: 0 };
  const DEG2 = THREE.MathUtils.degToRad(2);
  function placeCamera(dt) {
    cam.orbit += dt * 0.035;
    lookGoal.set(ball.position.x * cam.follow, 0.4 + ball.position.y * 0.5 * cam.follow, ball.position.z * cam.follow);
    look.lerp(lookGoal, Math.min(1, dt * 2.2));
    const a = cam.orbit + par.x * DEG2;
    camera.position.set(look.x + Math.sin(a) * cam.dist, look.y + cam.height + par.y * cam.dist * Math.tan(DEG2) * 0.6, look.z + Math.cos(a) * cam.dist);
    camera.lookAt(look);
  }

  /* ---------- the overlay: title, step button, label, progress dots ---------- */
  const el = document.createElement('div');
  el.className = 'g-ui';
  const stepText = touch ? 'Help the model learn. Tap to step downhill.' : 'Help the model learn. Click, tap or press Space to step downhill.';
  el.innerHTML =
    '<div class="g-title"><p class="g-name"></p><p class="g-tag"></p></div>' +
    '<p class="g-label" aria-hidden="true"></p>' +
    '<p class="g-learned" aria-hidden="true">Learned.</p>' +
    '<div class="g-bar"><button class="pill g-step" type="button"></button>' +
    '<ol class="g-dots" aria-hidden="true">' + '<li></li>'.repeat(N) + '</ol></div>' +
    '<p class="sr-only g-live" aria-live="polite"></p>';
  el.querySelector('.g-name').textContent = o.title || '';
  el.querySelector('.g-tag').textContent = o.tagline || '';
  const btn = el.querySelector('.g-step'), bar = el.querySelector('.g-bar'), title = el.querySelector('.g-title');
  const labelEl = el.querySelector('.g-label'), learned = el.querySelector('.g-learned'), live = el.querySelector('.g-live');
  const dotEls = el.querySelectorAll('.g-dots li');
  btn.textContent = stepText;
  ui.appendChild(el);

  /* ---------- game state ---------- */
  let phase = 'idle', step = 0, animating = false, queued = false, t0 = 0, lastInput = 0, lastAuto = -1e9, pulsed = false;
  let prev = 0, done = false, stepTween = null;
  const timers = [];
  const later = (s, fn) => { const c = gsap.delayedCall(s, fn); timers.push(c); return c; };

  function showPlay() {
    if (phase !== 'title') return;
    phase = 'play';
    // desktop: the idle clock starts when the step button appears; phone: when the game starts (keeps it near 10 s)
    if (!phone) { lastInput = now(); pulsed = false; }
    gsap.to(title, { opacity: 0, y: -8, duration: 0.6, ease: 'power2.inOut' });
    bar.classList.add('is-on');
    gsap.to(cam, { follow: 1, duration: 2.4, ease: 'sine.inOut' });
    if (o.onPlay) o.onPlay(btn);
  }

  function input() {
    if (done) return;
    if (phase === 'title') { showPlay(); }
    if (phase !== 'play') return;
    lastInput = now(); pulsed = false;
    if (animating) { queued = true; return; }   // at most one queued step, so mashing is harmless
    doStep();
  }

  function doStep() {
    if (step >= N || phase !== 'play') return;
    animating = true;
    step++;
    if (step === 1) btn.textContent = 'Step downhill';
    dotEls[step - 1].classList.add('is-done');
    const lab = labels[step - 1] || '';
    labelEl.classList.remove('is-on');
    if (lab) later(STEP_DUR * 0.45, () => { labelEl.textContent = lab; labelEl.classList.add('is-on'); });
    live.textContent = 'Step ' + step + ' of ' + N + (lab ? ': ' + lab : '');
    if (o.onStep) o.onStep(step, N, lab);
    stepTween = gsap.to(prog, {
      s: stops[step], duration: STEP_DUR, ease: 'power2.out',
      onComplete() {
        animating = false;
        if (step >= N) { settle(); return; }
        if (queued) { queued = false; doStep(); }
      }
    });
  }

  function settle() {
    phase = 'settle';
    queued = false;
    bar.classList.remove('is-on');
    labelEl.classList.remove('is-on');
    live.textContent = 'Model trained. Opening the office.';
    learned.classList.add('is-on');
    const k = { v: 1 };
    gsap.to(k, { v: 0, duration: SETTLE, ease: 'power2.inOut', onUpdate() { flat = k.v; shape(k.v); placeDots(); } });
    gsap.to(cam, { height: cam.height + 1.6, dist: cam.dist * 0.82, duration: SETTLE, ease: 'power2.inOut' });
    gsap.to(dotMat, { opacity: 0, duration: SETTLE * 0.75, ease: 'sine.inOut' });
    later(SETTLE * 0.7, () => learned.classList.remove('is-on'));
    later(SETTLE, finish);
  }

  function finish() {
    if (done) return;
    done = true; phase = 'done';
    if (o.onDone) o.onDone({ game: now() - t0 });
  }

  /* ---------- input ---------- */
  const canvas = renderer.domElement;
  const onPointer = e => { if (e.button > 0) return; input(); };
  const onKey = e => {
    if (done || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    const arrow = k === 'ArrowDown' || k === 'ArrowRight';
    const act = k === ' ' || k === 'Enter' || k === 'Spacebar';
    if (!arrow && !act) return;
    const t = e.target;
    // Space/Enter on a focused button or link does what that control does (the step button steps, Skip skips)
    if (act && t && t.closest && t.closest('button, a, [role="button"]')) return;
    e.preventDefault();
    input();
  };
  const onMove = e => {
    if (phone || e.pointerType !== 'mouse') return;
    par.gx = (e.clientX / window.innerWidth) * 2 - 1;
    par.gy = (e.clientY / window.innerHeight) * 2 - 1;
  };
  btn.addEventListener('click', input);
  canvas.addEventListener('pointerdown', onPointer);
  document.addEventListener('keydown', onKey);
  window.addEventListener('pointermove', onMove);

  const size = new THREE.Vector2(), proj = new THREE.Vector3();
  return {
    get phase() { return phase; },
    get step() { return step; },
    steps: N,
    start() {
      t0 = now(); prev = 0; lastInput = t0;
      phase = 'title';
      requestAnimationFrame(() => title.classList.add('is-on'));
      later(TITLE_DUR, showPlay);
    },
    poke: input,
    render(ms) {
      const t = ms / 1000, dt = prev ? Math.min(0.1, t - prev) : 0.016; prev = t;
      // idle: a single pulse at 2.5 s, then the model keeps learning on its own every 0.9 s from 3 s
      if (phase === 'play' && !animating) {
        const idle = now() - lastInput;
        if (idle >= 2.5 && !pulsed) { pulsed = true; btn.classList.remove('is-pulse'); void btn.offsetWidth; btn.classList.add('is-pulse'); }
        if (idle >= 3 && now() - lastAuto >= 0.9) { lastAuto = now(); doStep(); }
      }
      par.x += (par.gx - par.x) * Math.min(1, dt * 3); par.y += (par.gy - par.y) * Math.min(1, dt * 3);
      placeBall();
      placeCamera(dt);
      renderer.getSize(size);
      if (Math.abs(camera.aspect - size.x / size.y) > 1e-3) { camera.aspect = size.x / size.y; camera.updateProjectionMatrix(); }
      renderer.render(scene, camera);
      // the step label sits beside the ball
      if (labelEl.classList.contains('is-on')) {
        proj.copy(ball.position).project(camera);
        labelEl.style.transform = 'translate(' + ((proj.x + 1) / 2 * size.x + (phone ? -40 : 26)) + 'px,' + ((1 - proj.y) / 2 * size.y + (phone ? -58 : -14)) + 'px)';
      }
    },
    skip() { done = true; phase = 'done'; timers.forEach(c => c.kill()); if (stepTween) stepTween.kill(); gsap.killTweensOf([prog, cam, dotMat, title]); },
    dispose() {
      this.skip();
      btn.removeEventListener('click', input);
      canvas.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
      el.remove();
      scene.traverse(n => { if (n.geometry) n.geometry.dispose(); });
      [surfMat, ballMat, dotMat].forEach(m => m.dispose());
      if (sun.shadow && sun.shadow.map) sun.shadow.map.dispose();
    }
  };
}
