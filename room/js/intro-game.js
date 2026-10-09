/* "Teach the model": the intro game. A ball (the model) rolls along a smooth inward spiral around
   a matte loss surface into its minimum, like a marble circling a funnel; her research areas fade in
   as it passes. Input only speeds it up. At the minimum the surface flattens into the floor while the
   camera glides down to eye level in one move, and the walk-in takes over.
   Renders with the room's WebGLRenderer into its own scene; no library beyond three and GSAP. */

const SAND = '#ecd6bd', CLAY = '#d09670', FLOOR = '#d8bd9b', BG = '#fbf4ec', BALL = '#a04a0d', TRAIL = '#8a4a22', LINE = '#a04a0d', MARK = '#5e4b3f';

// the loss: a wide bowl around the minimum, two soft hills outside the spiral, faint ripples that vanish at the centre
const MIN = { x: 1.3, z: -0.9 };
function loss(x, z) {
  const dx = x - MIN.x, dz = z - MIN.z, r2 = dx * dx + dz * dz;
  return 1.75 * (1 - Math.exp(-r2 / 10))
    + 0.6 * Math.exp(-((x + 4.6) ** 2 + (z + 5.6) ** 2) / 1.6)
    + 0.5 * Math.exp(-((x - 6.4) ** 2 + (z - 4.4) ** 2) / 1.8)
    + 0.06 * Math.sin(0.9 * x + 0.4) * Math.cos(0.75 * z) * (r2 / (r2 + 5));
}
function grad(x, z) {
  const e = 1e-3;
  return [(loss(x + e, z) - loss(x - e, z)) / (2 * e), (loss(x, z + e) - loss(x, z - e)) / (2 * e)];
}
// an inward spiral around the minimum (about 2.3 turns), sampled densely as [x, z] pairs
function spiral() {
  const R0 = 4.7, TURNS = 2.3, A0 = 2.45, n = 700, pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, r = R0 * Math.pow(1 - u, 1.35), a = A0 - u * TURNS * 2 * Math.PI;
    pts.push([MIN.x + r * Math.cos(a), MIN.z + r * Math.sin(a)]);
  }
  return pts;
}
// speed profile along the path (arc-length fraction u): starts from rest, gathers speed downhill, eases into the minimum
const speedAt = u => Math.sqrt(Math.min(1, (u + 0.02) / 0.22)) * (0.35 + 0.65 * Math.pow(Math.min(1, (1.0 - u + 0.004) / 0.2), 0.7));

export function createGame(o) {
  const { THREE, renderer, ui } = o;
  const gsap = o.gsap || window.gsap;
  const phone = !!o.phone;
  const N = phone ? 4 : 6;
  const TITLE_DUR = phone ? 1.2 : 2.0;
  const ROLL = phone ? 2.9 : 5.8;     // idle seconds from the top of the spiral to the minimum
  const GLIDE = phone ? 1.25 : 2.2;   // the camera glide while the surface flattens into the floor
  const MAXX = 3;                     // input speeds the ball up to 3x
  const labels = o.labels || [];
  const touch = !!o.touch;
  const now = () => gsap.ticker.time;

  /* ---------- scene ---------- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  // haze only at the far periphery, so the surface itself stays crisp
  scene.fog = new THREE.Fog(BG, phone ? 20 : 17, phone ? 36 : 31);
  const camera = new THREE.PerspectiveCamera(phone ? 52 : 38, 1, 0.1, 60);
  // a low, gentle side light so the slopes read; no shadow maps (the ball has a contact shadow)
  scene.add(new THREE.HemisphereLight('#fff6ec', '#c8a487', 0.8));
  const sun = new THREE.DirectionalLight('#fff0e0', 2.3);
  sun.position.set(-6, 4.2, 2.5);
  scene.add(sun, sun.target);

  const SEG = phone ? 88 : 150, SIZE = 46;   // wide enough that the edges dissolve in the far haze
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const base = new Float32Array(pos.count);
  let hmax = 0;
  for (let i = 0; i < pos.count; i++) { base[i] = loss(pos.getX(i), pos.getZ(i)); hmax = Math.max(hmax, base[i]); }
  geo.setAttribute('h0', new THREE.BufferAttribute(base, 1));
  const colors = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const cSand = new THREE.Color(SAND), cClay = new THREE.Color(CLAY), cFloor = new THREE.Color(FLOOR), tc = new THREE.Color();
  const surfMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  // thin matte contour lines (isolines of the loss), about 1 px, fading where they would crowd
  const lineU = { uLine: { value: 1 }, uLineColor: { value: new THREE.Color(LINE) }, uStep: { value: 0.12 }, uPx: { value: renderer.getPixelRatio() } };
  surfMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, lineU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float h0;\nvarying float vH0;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvH0 = h0;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH0;\nuniform float uLine;\nuniform vec3 uLineColor;\nuniform float uStep;\nuniform float uPx;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'float hh = vH0 / uStep;',
        'float fw = max(fwidth(hh), 1e-4);',
        'float dl = abs(fract(hh - 0.5) - 0.5) / fw;',
        'float ln = 1.0 - smoothstep(0.35 * uPx, 0.35 * uPx + 1.0, dl);',
        'ln *= 1.0 - smoothstep(0.18, 0.45, fw);',
        'ln *= step(0.02, vH0);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, uLineColor, ln * uLine * 0.8);'
      ].join('\n'));
  };
  const surface = new THREE.Mesh(geo, surfMat);
  scene.add(surface);
  let flat = 1;   // 1 = the loss surface, 0 = flat floor
  function shape(k) {
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, base[i] * k);
      tc.copy(cSand).lerp(cClay, Math.pow(base[i] / hmax, 1.2)).lerp(cFloor, 1 - k);
      colors[i * 3] = tc.r; colors[i * 3 + 1] = tc.g; colors[i * 3 + 2] = tc.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  }
  shape(1);

  /* ---------- the spiral path, by arc length ---------- */
  const traj = spiral();
  const cum = [0];
  for (let i = 1; i < traj.length; i++) cum.push(cum[i - 1] + Math.hypot(traj[i][0] - traj[i - 1][0], traj[i][1] - traj[i - 1][1]));
  const L = cum[cum.length - 1];
  // idle duration of the roll = integral of du / speed; scaled so it takes ROLL seconds
  let T1 = 0; for (let i = 0; i < 400; i++) T1 += (1 / 400) / speedAt((i + 0.5) / 400);
  const RATE = T1 / ROLL;
  function at(s, out) {
    let lo = 1, hi = cum.length - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < s) lo = m + 1; else hi = m; }
    const i = lo, t = Math.max(0, Math.min(1, (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1)));
    out.x = traj[i - 1][0] + (traj[i][0] - traj[i - 1][0]) * t;
    out.z = traj[i - 1][1] + (traj[i][1] - traj[i - 1][1]) * t;
    return out;
  }

  const R = phone ? 0.2 : 0.17;
  const ballMat = new THREE.MeshStandardMaterial({ color: BALL, roughness: 0.62, metalness: 0 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 20), ballMat);
  scene.add(ball);
  // soft contact shadow: a small radial blob laid on the surface under the ball
  const blobC = document.createElement('canvas'); blobC.width = blobC.height = 64;
  const bg = blobC.getContext('2d'), rg = bg.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, 'rgba(60,32,16,0.55)'); rg.addColorStop(0.45, 'rgba(60,32,16,0.25)'); rg.addColorStop(1, 'rgba(60,32,16,0)');
  bg.fillStyle = rg; bg.fillRect(0, 0, 64, 64);
  const blobTex = new THREE.CanvasTexture(blobC);
  const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false });
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(R * 3.2, R * 3.2), blobMat);
  scene.add(blob);
  // the global minimum: a small matte ring with a dot
  const markMat = new THREE.MeshStandardMaterial({ color: MARK, roughness: 1, transparent: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const marker = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.35, R * 1.6, 48), markMat); ring.rotation.x = -Math.PI / 2;
  const pip = new THREE.Mesh(new THREE.CircleGeometry(R * 0.28, 24), markMat); pip.rotation.x = -Math.PI / 2;
  marker.add(ring, pip);
  marker.position.set(MIN.x, loss(MIN.x, MIN.z) + 0.008, MIN.z);
  scene.add(marker);
  const nrm = new THREE.Vector3(), qb = new THREE.Quaternion(), zUp = new THREE.Vector3(0, 0, 1);

  // a faint dotted trail behind the ball
  const DOT_GAP = 0.24;
  const nDots = Math.floor(L / DOT_GAP);
  const dotMat = new THREE.MeshStandardMaterial({ color: TRAIL, roughness: 1, transparent: true, opacity: 0.6 });
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

  const prog = { s: 0, wob: 0 };
  const bp = { x: 0, z: 0 }, last = new THREE.Vector3(), axis = new THREE.Vector3(), q = new THREE.Quaternion();
  const endDir = { x: 0, z: 0 };
  { const p0 = at(L - 0.25, { x: 0, z: 0 }); const d = Math.hypot(MIN.x - p0.x, MIN.z - p0.z) || 1; endDir.x = (MIN.x - p0.x) / d; endDir.z = (MIN.z - p0.z) / d; }
  function placeBall() {
    at(prog.s, bp);
    bp.x += endDir.x * prog.wob; bp.z += endDir.z * prog.wob;   // the small damped wobble at the minimum
    ball.position.set(bp.x, loss(bp.x, bp.z) * flat + R * 0.92, bp.z);
    // roll: rotate about the axis across the direction of travel
    const dx = ball.position.x - last.x, dz = ball.position.z - last.z, dist = Math.hypot(dx, dz);
    if (dist > 1e-5 && dist < 1) { axis.set(dz, 0, -dx).normalize(); q.setFromAxisAngle(axis, dist / R); ball.quaternion.premultiply(q); }
    last.copy(ball.position);
    // contact shadow follows the slope under the ball
    const g = grad(bp.x, bp.z);
    nrm.set(-g[0] * flat, 1, -g[1] * flat).normalize();
    qb.setFromUnitVectors(zUp, nrm);
    blob.quaternion.copy(qb);
    blob.position.set(bp.x, loss(bp.x, bp.z) * flat + 0.006, bp.z);
    dots.count = Math.min(dotXZ.length, Math.floor(prog.s / DOT_GAP));
  }
  placeBall();

  /* ---------- camera: a slow orbit that follows the ball, then one glide down to eye level ---------- */
  const look = new THREE.Vector3(0, 0.6, 0), lookGoal = new THREE.Vector3();
  const cam = { orbit: phone ? 0.75 : 0.62, dist: phone ? 11.5 : 10.2, height: phone ? 9.6 : 7.2, follow: 0 };
  const par = { x: 0, y: 0, gx: 0, gy: 0 };
  const DEG2 = THREE.MathUtils.degToRad(2);
  let glide = null;   // { k, curve, l0, l1 } while gliding
  function placeCamera(dt) {
    if (glide) {
      glide.curve.getPoint(glide.k, camera.position);
      look.lerpVectors(glide.l0, glide.l1, glide.k);
      camera.lookAt(look);
      return;
    }
    cam.orbit += dt * 0.035;
    lookGoal.set(ball.position.x * cam.follow, 0.4 + ball.position.y * 0.5 * cam.follow, ball.position.z * cam.follow);
    look.lerp(lookGoal, Math.min(1, dt * 2.2));
    const a = cam.orbit + par.x * DEG2;
    camera.position.set(look.x + Math.sin(a) * cam.dist, look.y + cam.height + par.y * cam.dist * Math.tan(DEG2) * 0.6, look.z + Math.cos(a) * cam.dist);
    camera.lookAt(look);
  }
  // starts slowly and leaves still moving forward, so the walk-in (which starts moving) continues it
  const glideEase = t => 0.55 * t * t * (3 - 2 * t) + 0.45 * t * t;
  function startGlide() {
    const p0 = camera.position.clone();
    const fx = MIN.x - p0.x, fz = MIN.z - p0.z, fl = Math.hypot(fx, fz) || 1, ux = fx / fl, uz = fz / fl;
    const p2 = new THREE.Vector3(MIN.x - ux * 2.4, 1.55, MIN.z - uz * 2.4);
    const p1 = new THREE.Vector3(p0.x + (p2.x - p0.x) * 0.55, p0.y * 0.5 + p2.y * 0.5, p0.z + (p2.z - p0.z) * 0.55);
    glide = { k: 0, curve: new THREE.QuadraticBezierCurve3(p0, p1, p2), l0: look.clone(), l1: new THREE.Vector3(MIN.x + ux * 9, 1.25, MIN.z + uz * 9) };
    return glide;
  }

  /* ---------- the overlay: title, prompt, labels, passive progress dots ---------- */
  const el = document.createElement('div');
  el.className = 'g-ui';
  const promptText = touch ? 'Watch the model learn. Tap to speed it up.' : 'Watch the model learn. Click or press Space to speed it up.';
  el.innerHTML =
    '<div class="g-title"><p class="g-name"></p><p class="g-tag"></p></div>' +
    '<p class="g-label" aria-hidden="true"></p>' +
    '<p class="g-learned" aria-hidden="true">Learned.</p>' +
    '<div class="g-bar"><p class="g-prompt"></p>' +
    '<ol class="g-dots" aria-hidden="true">' + '<li></li>'.repeat(N) + '</ol></div>' +
    '<p class="sr-only g-live" aria-live="polite"></p>';
  el.querySelector('.g-name').textContent = o.title || '';
  el.querySelector('.g-tag').textContent = o.tagline || '';
  const promptEl = el.querySelector('.g-prompt'), bar = el.querySelector('.g-bar'), title = el.querySelector('.g-title');
  const labelEl = el.querySelector('.g-label'), learned = el.querySelector('.g-learned'), live = el.querySelector('.g-live');
  const dotEls = el.querySelectorAll('.g-dots li');
  promptEl.textContent = promptText;
  ui.appendChild(el);
  // labels[i] (i >= 1) is shown around u = i / N; dot i fills when the ball passes u = (i + 1) / N
  const marks = []; for (let i = 1; i < N; i++) if (labels[i]) marks.push({ u: i / N, text: labels[i] });
  const WIN = phone ? 0.11 : 0.075;

  /* ---------- game state ---------- */
  let phase = 'idle', t0 = 0, prev = 0, done = false, u = 0, mult = 1, kick = 0, hold = false, keyHold = false, boosted = false, passed = 0, shown = null;
  const timers = [];
  const later = (s, fn) => { const c = gsap.delayedCall(s, fn); timers.push(c); return c; };

  function showPlay() {
    if (phase !== 'title') return;
    phase = 'play';
    gsap.to(title, { opacity: 0, y: -8, duration: 0.6, ease: 'power2.inOut' });
    bar.classList.add('is-on');
    gsap.to(cam, { follow: 1, duration: 2.4, ease: 'sine.inOut' });
    if (o.onPlay) o.onPlay(promptEl);
  }

  function input() {
    if (done) return;
    if (phase === 'title') showPlay();
    if (phase !== 'play') return;
    kick = Math.min(1, kick + 0.75); boosted = true;
  }

  function roll(dt) {
    const target = 1 + (MAXX - 1) * Math.max(kick, hold || keyHold ? 1 : 0);
    mult += (target - mult) * Math.min(1, dt * 3.5);
    kick = Math.max(0, kick - dt * 0.9);
    u = Math.min(1, u + dt * RATE * speedAt(u) * mult);
    prog.s = u * L;
    const p = Math.min(N, Math.floor(u * N + 1e-6));
    while (passed < p) { dotEls[passed].classList.add('is-done'); passed++; }
    // the label nearest the ball fades in while it passes, then out
    let m = null; for (const k of marks) if (Math.abs(u - k.u) < WIN) m = k;
    if (m !== shown) {
      shown = m;
      if (m) { labelEl.textContent = m.text; labelEl.classList.add('is-on'); live.textContent = m.text; if (o.onStep) o.onStep(passed, N, m.text); }
      else labelEl.classList.remove('is-on');
    }
    if (u >= 1) settle();
  }

  function settle() {
    phase = 'settle';
    bar.classList.remove('is-on');
    labelEl.classList.remove('is-on');
    live.textContent = 'Model trained. Opening the office.';
    learned.classList.add('is-on');
    // the marble overshoots a touch and settles (damped wobble along its last heading)
    const w0 = { t: 0 };
    gsap.to(w0, { t: 1, duration: 0.9, ease: 'none', onUpdate() { prog.wob = 0.16 * Math.exp(-4.2 * w0.t) * Math.sin(w0.t * 3 * Math.PI); } });
    const dur = GLIDE * (boosted ? 0.85 : 1);
    const gl = startGlide(), k = { v: 1 };
    gsap.to(gl, { k: 1, duration: dur, ease: glideEase });
    gsap.to(k, { v: 0, duration: dur * 0.9, ease: 'sine.inOut', onUpdate() {
      flat = k.v; shape(k.v); placeDots();
      lineU.uLine.value = k.v; markMat.opacity = k.v;
      marker.position.y = loss(MIN.x, MIN.z) * k.v + 0.008;
    } });
    gsap.to(dotMat, { opacity: 0, duration: dur * 0.6, ease: 'sine.inOut' });
    later(dur * 0.55, () => learned.classList.remove('is-on'));
    later(dur, finish);
  }

  function finish() {
    if (done) return;
    done = true; phase = 'done';
    if (o.onDone) o.onDone({ game: now() - t0, last: renderFrame });
  }

  /* ---------- input: click / tap / Space / arrows; holding keeps it fast ---------- */
  const canvas = renderer.domElement;
  const onPointer = e => { if (e.button > 0) return; hold = true; input(); };
  const onUp = () => { hold = false; };
  const isKey = k => k === ' ' || k === 'Enter' || k === 'Spacebar' || k === 'ArrowDown' || k === 'ArrowRight';
  const onKey = e => {
    if (done || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || !isKey(e.key)) return;
    const t = e.target;
    // Space/Enter on a focused button or link does what that control does (Skip skips)
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowRight' && t && t.closest && t.closest('button, a, [role="button"]')) return;
    e.preventDefault();
    keyHold = true;
    if (!e.repeat) input();
  };
  const onKeyUp = e => { if (isKey(e.key)) keyHold = false; };
  const onMove = e => {
    if (phone || e.pointerType !== 'mouse') return;
    par.gx = (e.clientX / window.innerWidth) * 2 - 1;
    par.gy = (e.clientY / window.innerHeight) * 2 - 1;
  };
  canvas.addEventListener('pointerdown', onPointer);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  window.addEventListener('blur', onUp);
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointermove', onMove);

  const size = new THREE.Vector2(), proj = new THREE.Vector3();
  const awake = () => {};
  function renderFrame() { renderer.render(scene, camera); return renderer.domElement; }
  return {
    get phase() { return phase; },
    get step() { return passed; },
    get progress() { return u; },
    get speed() { return mult; },
    steps: N,
    start() {
      gsap.ticker.add(awake);   // GSAP's ticker sleeps when no tween runs; the roll reads its clock
      t0 = now(); prev = 0;
      phase = 'title';
      requestAnimationFrame(() => title.classList.add('is-on'));
      later(TITLE_DUR, showPlay);
    },
    poke: input,
    render(ms) {
      // the GSAP clock (not the frame stamp), so the roll keeps time with the tweens even on slow frames
      const t = now(), dt = prev ? Math.min(0.25, Math.max(0, t - prev)) : 0.016; prev = t;
      if (phase === 'play') roll(dt);
      par.x += (par.gx - par.x) * Math.min(1, dt * 3); par.y += (par.gy - par.y) * Math.min(1, dt * 3);
      placeBall();
      placeCamera(dt);
      renderer.getSize(size);
      if (Math.abs(camera.aspect - size.x / size.y) > 1e-3) { camera.aspect = size.x / size.y; camera.updateProjectionMatrix(); }
      renderer.render(scene, camera);
      // the label sits beside the ball
      if (labelEl.classList.contains('is-on')) {
        proj.copy(ball.position).project(camera);
        labelEl.style.transform = 'translate(' + ((proj.x + 1) / 2 * size.x + (phone ? -40 : 26)) + 'px,' + ((1 - proj.y) / 2 * size.y + (phone ? -58 : -14)) + 'px)';
      }
    },
    skip() { gsap.ticker.remove(awake); done = true; phase = 'done'; timers.forEach(c => c.kill()); gsap.killTweensOf([prog, cam, dotMat, title]); if (glide) gsap.killTweensOf(glide); },
    dispose() {
      this.skip();
      canvas.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', onUp);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('pointermove', onMove);
      el.remove();
      scene.traverse(n => { if (n.geometry) n.geometry.dispose(); });
      [surfMat, ballMat, dotMat, blobMat, markMat].forEach(m => m.dispose());
      blobTex.dispose();
    }
  };
}
