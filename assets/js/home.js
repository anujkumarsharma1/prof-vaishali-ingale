/*!
 * home.js: the v5 "loss landscape" home page for Prof. Vaishali S. Ingale (plan.md §2, changes 1–5).
 * Loaded only on the about layout, `defer`, after gsap / ScrollTrigger / SplitText / site.js / motion.js.
 * The page carries data-motion-skip and no data-reveal / data-count, so motion.js leaves it alone.
 *
 *  1. field()     Live contour field behind the hero: marching squares over a sum of separable Gaussian wells plus a tilt,
 *                 drawn on a canvas. Wells breathe; the pointer adds a soft well; click or tap drops a dot that runs
 *                 gradient descent with momentum to a minimum. Pauses off-screen and in hidden tabs. DPR capped at 1.5.
 *  2. kinetic()   The name rises letter by letter from a mask while Fraunces opsz/wght settle (desktop only).
 *  3. portrait()  Clip-path wipe and scale settle on the portrait; contour rings draw around the frame.
 *  4. ledger()    Odometer digits roll once when the stats ledger is seen; "Years at AIT" is recomputed from data-since-date.
 *  5. finale()    Contours around the contact email draw once on scroll.
 * Reduced motion: one static frame of the field, no descent, everything visible. No JS: the watercolour and plain text.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var page = document.querySelector(".about-page");
  if (!page) return;

  var mq = function (q) {
    return !!(window.matchMedia && window.matchMedia(q).matches);
  };
  var REDUCE = mq("(prefers-reduced-motion: reduce)");
  var DESKTOP = mq("(min-width: 900px)");
  var FINE = mq("(pointer: fine)");
  var G = window.gsap;
  var EASE = "power4.out";

  function all(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function done() {
    root.classList.remove("home-pending");
  }

  /* ------------------------------------------------------------------ 4a. live "since" recompute */
  function refreshSince() {
    all("[data-since-date]").forEach(function (el) {
      var p = (el.getAttribute("data-since-date") || "").split("-");
      if (p.length < 3) return;
      var since = new Date(+p[0], +p[1] - 1, +p[2]);
      var now = new Date();
      var years = now.getFullYear() - since.getFullYear();
      if (now.getMonth() < since.getMonth() || (now.getMonth() === since.getMonth() && now.getDate() < since.getDate())) years--;
      if (years > 0) el.textContent = String(years);
    });
  }

  /* ------------------------------------------------------------------ 1. the field */
  function field() {
    var hero = page.querySelector("[data-home-hero]");
    var art = hero && hero.querySelector(".hero-art");
    var step = hero && hero.querySelector(".hero-step-1");
    if (!hero || !step || !window.HTMLCanvasElement) return null;

    var cv = document.createElement("canvas");
    var dv = document.createElement("canvas");
    cv.className = "hero-field";
    dv.className = "hero-descent";
    cv.setAttribute("aria-hidden", "true");
    dv.setAttribute("aria-hidden", "true");
    var after = art ? art.nextSibling : hero.firstChild;
    hero.insertBefore(cv, after);
    hero.insertBefore(dv, after);
    var ctx = cv.getContext("2d");
    var dctx = dv.getContext("2d");
    if (!ctx || !dctx) return null;

    var LINE = "166,124,82"; /* #a67c52 */
    var DOT = "#a04a0d";
    var TRAIL = "160,74,13";
    var animate = !REDUCE;
    var live = animate && DESKTOP; /* continuous breathing + pointer well: desktop only */

    var W = 0,
      H = 0,
      dpr = 1,
      cell = 7,
      nx = 0,
      ny = 0;
    var vals = null,
      xs = null,
      ys = null,
      pex = null,
      pey = null;
    var wells = [],
      tiltX = 0,
      tiltY = 0,
      base = 0,
      stepL = 1,
      S = 1;
    var textBox = null,
      portBox = null;
    var ptr = { x: 0, y: 0, tx: 0, ty: 0, a: 0, ta: 0, seen: false, lock: null };
    var dots = [];
    var running = false,
      visible = true,
      raf = 0,
      last = 0,
      t0 = performance.now();
    var breatheUntil = 0,
      tick = 0;
    var autoCount = 0,
      autoMax = 3,
      lastInteract = performance.now(),
      nextAuto = 0;
    var frameTimes = [];
    window.__homeField = { frames: frameTimes }; /* frame timings (ms), read by the perf check */

    function rel(el) {
      var r = el.getBoundingClientRect();
      var c = cv.getBoundingClientRect();
      return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
    }

    /* wells are anchored to the hero's content box so the landscape composes with the text and portrait at any width */
    function layout() {
      var rect = cv.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = dv.width = Math.round(W * dpr);
      cv.height = dv.height = Math.round(H * dpr);
      cell = DESKTOP ? 8 : 6;
      nx = Math.ceil(W / cell) + 1;
      ny = Math.ceil(H / cell) + 1;
      vals = new Float32Array(nx * ny);
      pex = new Float32Array(nx);
      pey = new Float32Array(ny);
      var c = rel(step);
      var txt = hero.querySelector(".hero-text");
      var por = hero.querySelector(".portrait-frame");
      textBox = txt ? rel(txt) : null;
      portBox = por ? rel(por) : null;
      S = Math.max(320, Math.min(c.w, 1200));
      var X = function (u) {
        return c.x + u * c.w;
      };
      var Y = function (v) {
        return c.y + v * c.h;
      };
      var mobile = !DESKTOP;
      /* [x, y, amplitude, sigma]: negative = well (a minimum), positive = hill */
      var spec = mobile
        ? [
            [X(0.88), Y(0.06), -0.9, 0.34],
            [X(0.1), Y(0.5), -0.55, 0.3],
            [X(0.75), Y(0.62), -1.0, 0.36],
            [X(0.35), Y(0.25), 0.55, 0.32],
            [X(0.2), Y(0.93), -0.6, 0.3],
          ]
        : [
            [X(1.06), Y(0.12), -0.95, 0.2],
            [X(0.6), Y(0.94), -1.1, 0.17],
            [X(-0.2), Y(0.8), -0.75, 0.2],
            [X(0.2), Y(0.13), -0.5, 0.15],
            [X(0.3), Y(0.48), 0.5, 0.26],
            [X(0.86), Y(0.5), 0.32, 0.2],
            [X(1.32), Y(0.78), -0.6, 0.22],
            [X(-0.36), Y(0.18), -0.55, 0.2],
          ];
      wells = spec.map(function (s, i) {
        return {
          x0: s[0],
          y0: s[1],
          x: s[0],
          y: s[1],
          a0: s[2],
          a: s[2],
          s: s[3] * S,
          ph: i * 1.7,
          ex: new Float32Array(nx),
          ey: new Float32Array(ny),
        };
      });
      tiltX = 0.22 / S;
      tiltY = 0.12 / S;
      xs = new Float32Array(nx);
      ys = new Float32Array(ny);
      for (var i = 0; i < nx; i++) xs[i] = i * cell;
      for (var j = 0; j < ny; j++) ys[j] = j * cell;
      /* fix the contour levels once per layout, so lines never jump while the surface breathes */
      evaluate(0, false);
      var mn = Infinity,
        mx = -Infinity;
      for (var k = 0; k < vals.length; k++) {
        if (vals[k] < mn) mn = vals[k];
        if (vals[k] > mx) mx = vals[k];
      }
      stepL = (mx - mn) / (mobile ? 13 : 17);
      base = mn + stepL * 0.5;
    }

    function wellsAt(t) {
      for (var k = 0; k < wells.length; k++) {
        var w = wells[k];
        w.x = w.x0 + 9 * Math.sin(t * 0.00023 + w.ph) + 4 * Math.sin(t * 0.00051 + w.ph * 2.3);
        w.y = w.y0 + 7 * Math.cos(t * 0.00019 + w.ph * 1.3);
        w.a = w.a0 * (1 + 0.045 * Math.sin(t * 0.00031 + w.ph));
      }
    }

    function fieldAt(x, y, withPtr) {
      var v = tiltX * x + tiltY * y;
      for (var k = 0; k < wells.length; k++) {
        var w = wells[k],
          dx = x - w.x,
          dy = y - w.y;
        v += w.a * Math.exp(-(dx * dx + dy * dy) / (2 * w.s * w.s));
      }
      if (withPtr && ptr.a > 0.001) {
        var px = x - ptr.x,
          py = y - ptr.y,
          ps = 0.11 * S;
        v -= 0.42 * ptr.a * Math.exp(-(px * px + py * py) / (2 * ps * ps));
      }
      return v;
    }
    function gradAt(x, y) {
      var gx = tiltX,
        gy = tiltY;
      for (var k = 0; k < wells.length; k++) {
        var w = wells[k],
          dx = x - w.x,
          dy = y - w.y,
          s2 = w.s * w.s;
        var g = (w.a * Math.exp(-(dx * dx + dy * dy) / (2 * s2))) / s2;
        gx -= g * dx;
        gy -= g * dy;
      }
      return [gx, gy];
    }

    /* separable Gaussians: exp(-(dx²+dy²)/2s²) = ex[i]·ey[j], so the grid costs K multiply-adds per node */
    function evaluate(t, withPtr) {
      var k, i, j, w, inv, d;
      for (k = 0; k < wells.length; k++) {
        w = wells[k];
        inv = 1 / (2 * w.s * w.s);
        for (i = 0; i < nx; i++) {
          d = xs[i] - w.x;
          w.ex[i] = w.a * Math.exp(-d * d * inv);
        }
        for (j = 0; j < ny; j++) {
          d = ys[j] - w.y;
          w.ey[j] = Math.exp(-d * d * inv);
        }
      }
      /* tilt first, then each Gaussian added row by row (outer loop over wells keeps the inner loop tight;
         rows where a well has decayed to nothing are skipped) */
      for (j = 0; j < ny; j++) {
        var row0 = j * nx,
          ty = tiltY * ys[j];
        for (i = 0; i < nx; i++) vals[row0 + i] = tiltX * xs[i] + ty;
      }
      var K = wells.length;
      for (k = 0; k <= K; k++) {
        var ex, ey;
        if (k < K) {
          ex = wells[k].ex;
          ey = wells[k].ey;
        } else {
          if (!(withPtr && ptr.a > 0.001)) break;
          var ps = 0.11 * S,
            pinv = 1 / (2 * ps * ps);
          ex = pex;
          ey = pey;
          for (i = 0; i < nx; i++) {
            d = xs[i] - ptr.x;
            ex[i] = -0.42 * ptr.a * Math.exp(-d * d * pinv);
          }
          for (j = 0; j < ny; j++) {
            d = ys[j] - ptr.y;
            ey[j] = Math.exp(-d * d * pinv);
          }
        }
        var i0 = 0,
          i1 = nx - 1;
        while (i0 < i1 && Math.abs(ex[i0]) < 2e-4) i0++;
        while (i1 > i0 && Math.abs(ex[i1]) < 2e-4) i1--;
        for (j = 0; j < ny; j++) {
          var e = ey[j];
          if (e < 2e-4) continue;
          var row = j * nx;
          for (i = i0; i <= i1; i++) vals[row + i] += ex[i] * e;
        }
      }
    }

    /* marching squares; each cell only visits the levels between its corner min and max */
    function contours() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      var minor = new Path2D(),
        major = new Path2D();
      var inv = 1 / stepL;
      for (var j = 0; j < ny - 1; j++) {
        var y0 = j * cell,
          r0 = j * nx,
          r1 = r0 + nx;
        for (var i = 0; i < nx - 1; i++) {
          var a = vals[r0 + i],
            b = vals[r0 + i + 1],
            c = vals[r1 + i + 1],
            d = vals[r1 + i];
          var mn = a,
            mx = a;
          if (b < mn) mn = b;
          else if (b > mx) mx = b;
          if (c < mn) mn = c;
          else if (c > mx) mx = c;
          if (d < mn) mn = d;
          else if (d > mx) mx = d;
          var l0 = Math.ceil((mn - base) * inv),
            l1 = Math.floor((mx - base) * inv);
          if (l1 < l0) continue;
          var x0 = i * cell;
          for (var l = l0; l <= l1; l++) {
            var L = base + l * stepL;
            var idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
            if (idx === 0 || idx === 15) continue;
            var p = l % 5 === 0 ? major : minor;
            /* edge points: top (a-b), right (b-c), bottom (d-c), left (a-d) */
            var tx = x0 + ((L - a) / (b - a)) * cell,
              ry = y0 + ((L - b) / (c - b)) * cell;
            var bx = x0 + ((L - d) / (c - d)) * cell,
              ly = y0 + ((L - a) / (d - a)) * cell;
            var x1 = x0 + cell,
              yb = y0 + cell;
            switch (idx) {
              case 1:
              case 14:
                p.moveTo(x0, ly);
                p.lineTo(bx, yb);
                break;
              case 2:
              case 13:
                p.moveTo(bx, yb);
                p.lineTo(x1, ry);
                break;
              case 3:
              case 12:
                p.moveTo(x0, ly);
                p.lineTo(x1, ry);
                break;
              case 4:
              case 11:
                p.moveTo(tx, y0);
                p.lineTo(x1, ry);
                break;
              case 6:
              case 9:
                p.moveTo(tx, y0);
                p.lineTo(bx, yb);
                break;
              case 7:
              case 8:
                p.moveTo(x0, ly);
                p.lineTo(tx, y0);
                break;
              case 5:
              case 10: {
                var mid = (a + b + c + d) / 4 > L;
                if ((idx === 5) === mid) {
                  p.moveTo(x0, ly);
                  p.lineTo(tx, y0);
                  p.moveTo(bx, yb);
                  p.lineTo(x1, ry);
                } else {
                  p.moveTo(x0, ly);
                  p.lineTo(bx, yb);
                  p.moveTo(tx, y0);
                  p.lineTo(x1, ry);
                }
                break;
              }
            }
          }
        }
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(" + LINE + ",0.22)";
      ctx.stroke(minor);
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = "rgba(" + LINE + ",0.36)";
      ctx.stroke(major);
      /* keep the text column and the portrait clean: soft elliptical erases (the portrait has its own rings) */
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      if (textBox) erase(textBox.x + textBox.w * 0.42, textBox.y + textBox.h * 0.5, textBox.w * 0.9, textBox.h * 0.8, 0.82);
      if (portBox) erase(portBox.x + portBox.w / 2, portBox.y + portBox.h / 2, portBox.w * 0.95, portBox.h * 0.8, 0.9);
      ctx.restore();
    }
    function erase(cx, cy, rx, ry, strength) {
      ctx.setTransform(dpr, 0, 0, (dpr * ry) / rx, dpr * cx, dpr * cy);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, "rgba(0,0,0," + strength + ")");
      g.addColorStop(0.5, "rgba(0,0,0," + strength * 0.8 + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-rx, -rx, 2 * rx, 2 * rx);
    }

    /* ---------- descent ---------- */
    function inBox(x, y, b, pad) {
      return b && x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad;
    }
    function drop(x, y, auto) {
      if (dots.length > 2) dots.shift();
      dots.push({ x: x, y: y, vx: 0, vy: 0, lr: 3.2e-4 * S * S, n: 0, trail: [[x, y]], state: "run", t: 0, auto: auto });
      if (!auto) {
        autoCount = autoMax; /* the visitor took over: no more automatic runs */
        hero.classList.remove("hint-on");
      }
      kick();
    }
    function stepDot(o) {
      var g = gradAt(o.x, o.y);
      o.vx = 0.9 * o.vx - o.lr * g[0];
      o.vy = 0.9 * o.vy - o.lr * g[1];
      var sp = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
      var cap = 0.012 * S;
      if (sp > cap) {
        o.vx *= cap / sp;
        o.vy *= cap / sp;
      }
      o.x += o.vx;
      o.y += o.vy;
      o.lr *= 0.996;
      o.n++;
      o.trail.push([o.x, o.y]);
      if ((o.n > 40 && sp < 0.04) || o.n > 900 || o.x < -20 || o.y < -20 || o.x > W + 20 || o.y > H + 20) {
        o.state = "settle";
        o.t = 0;
      }
    }
    function drawDots(dt) {
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dctx.clearRect(0, 0, W, H);
      for (var q = dots.length - 1; q >= 0; q--) {
        var o = dots[q];
        if (o.state === "run") {
          var steps = Math.min(4, Math.max(1, Math.round(dt / 16.7)));
          for (var s = 0; s < steps && o.state === "run"; s++) stepDot(o);
        } else {
          o.t += dt;
        }
        var fade = o.state === "settle" ? Math.max(0, 1 - Math.max(0, o.t - 2600) / 1400) : 1;
        if (fade <= 0) {
          dots.splice(q, 1);
          continue;
        }
        /* trail: older segments fainter */
        var tr = o.trail,
          n = tr.length,
          B = 6;
        dctx.lineWidth = 1.5;
        dctx.lineCap = "round";
        dctx.lineJoin = "round";
        for (var b = 0; b < B; b++) {
          var s0 = Math.floor((b * (n - 1)) / B),
            s1 = Math.floor(((b + 1) * (n - 1)) / B);
          if (s1 <= s0) continue;
          dctx.beginPath();
          dctx.moveTo(tr[s0][0], tr[s0][1]);
          for (var m = s0 + 1; m <= s1; m++) dctx.lineTo(tr[m][0], tr[m][1]);
          dctx.strokeStyle = "rgba(" + TRAIL + "," + (0.12 + (0.5 * (b + 1)) / B) * fade + ")";
          dctx.stroke();
        }
        dctx.globalAlpha = fade;
        if (o.state === "run") {
          dctx.beginPath();
          dctx.arc(o.x, o.y, 8, 0, Math.PI * 2);
          dctx.fillStyle = "rgba(" + TRAIL + ",0.12)";
          dctx.fill();
        } else if (o.t < 1100) {
          var k = o.t / 1100,
            e = 1 - Math.pow(1 - k, 3);
          dctx.beginPath();
          dctx.arc(o.x, o.y, 4 + 16 * e, 0, Math.PI * 2);
          dctx.strokeStyle = "rgba(" + TRAIL + "," + 0.55 * (1 - k) + ")";
          dctx.lineWidth = 1;
          dctx.stroke();
        }
        dctx.beginPath();
        dctx.arc(o.x, o.y, 3.75, 0, Math.PI * 2);
        dctx.fillStyle = DOT;
        dctx.fill();
        dctx.globalAlpha = 1;
      }
    }

    function autoStart() {
      /* start high on a slope in open space (not under the text or the portrait), so the run is visible */
      var best = [];
      for (var tries = 0; tries < 160; tries++) {
        var x = 40 + Math.random() * (W - 80),
          y = 110 + Math.random() * (H - 300);
        if (inBox(x, y, textBox, 30) || inBox(x, y, portBox, 70)) continue;
        if (x < 0 || x > W) continue;
        best.push([fieldAt(x, y, false), x, y]);
      }
      if (!best.length) return null;
      best.sort(function (p, q) {
        return q[0] - p[0];
      });
      var pick = best[Math.floor(Math.random() * Math.min(8, best.length))];
      return [pick[1], pick[2]];
    }

    /* ---------- loop ---------- */
    function frame(now) {
      raf = 0;
      var dt = Math.min(64, now - (last || now));
      last = now;
      var t = now - t0;
      var tA = performance.now();
      var breathe = live || now < breatheUntil;
      /* ease the pointer well */
      if (live) {
        ptr.x += (ptr.tx - ptr.x) * 0.1;
        ptr.y += (ptr.ty - ptr.y) * 0.1;
        ptr.a += (ptr.ta - ptr.a) * 0.06;
      }
      /* the surface breathes at ~30 Hz; it updates every frame only while the pointer well is still easing */
      var moving = Math.abs(ptr.tx - ptr.x) + Math.abs(ptr.ty - ptr.y) > 0.5 || Math.abs(ptr.ta - ptr.a) > 0.01;
      tick++;
      if (breathe && (moving || tick % 2 === 0)) {
        wellsAt(t);
        evaluate(t, live);
        contours();
      }
      if (dots.length) drawDots(dt);
      else if (dctx._dirty) {
        dctx.clearRect(0, 0, dv.width, dv.height);
      }
      dctx._dirty = dots.length > 0;
      if (frameTimes.length < 1200) frameTimes.push(performance.now() - tA);
      /* idle auto descents */
      if (live && autoCount < autoMax && now > nextAuto && now - lastInteract > 6000 && !dots.length) {
        var st = autoStart();
        if (st) {
          autoCount++;
          drop(st[0], st[1], true);
          if (autoCount === 1) hero.classList.add("hint-on");
        }
        nextAuto = now + 8000;
      }
      var more = breathe || dots.length > 0;
      if (more && visible && !document.hidden) raf = requestAnimationFrame(frame);
      else running = false;
    }
    function kick() {
      if (!animate || !visible || document.hidden) return;
      if (!raf) {
        last = 0;
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }
    function staticFrame() {
      wellsAt(0);
      evaluate(0, false);
      contours();
    }

    /* ---------- events ---------- */
    function local(e) {
      var r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    }
    if (animate) {
      hero.addEventListener("click", function (e) {
        if (e.target.closest("a, button, h1, p, .hero-portrait, input, label")) return;
        var sel = window.getSelection && window.getSelection();
        if (sel && String(sel).length) return;
        var p = local(e);
        lastInteract = performance.now();
        drop(p[0], p[1], false);
      });
    }
    if (live && FINE) {
      hero.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        var p = local(e);
        ptr.tx = p[0];
        ptr.ty = p[1];
        if (!ptr.seen) {
          ptr.x = p[0];
          ptr.y = p[1];
          ptr.seen = true;
        }
        ptr.ta = 1;
      });
      hero.addEventListener("pointerleave", function () {
        ptr.ta = 0;
      });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) kick();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) kick();
    });
    var rt = 0,
      lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (!DESKTOP && Math.abs(window.innerWidth - lastW) < 2) return; /* phones: ignore URL-bar height changes */
        lastW = window.innerWidth;
        layout();
        staticFrame();
        kick();
      }, 160);
    });

    layout();
    staticFrame();
    hero.classList.toggle("has-field", animate);
    if (animate) {
      breatheUntil = performance.now() + (DESKTOP ? 0 : 3500);
      nextAuto = performance.now() + (DESKTOP ? 2300 : 1e12);
      lastInteract = -1e9;
      kick();
    }
    return {
      show: function (delay) {
        setTimeout(function () {
          cv.classList.add("is-on");
          dv.classList.add("is-on");
        }, delay || 0);
      },
      relayout: function () {
        layout();
        staticFrame();
      },
    };
  }

  /* ------------------------------------------------------------------ 2. kinetic name */
  /* Split into letters whose widths copy the browser's own advances (kerning included), so the split
     line is pixel-identical to the plain text and restoring it at the end shifts nothing. */
  function splitName(el) {
    var text = el.textContent.replace(/\s+/g, " ").trim();
    el.textContent = text;
    var node = el.firstChild;
    var range = document.createRange();
    var adv = [];
    for (var i = 0; i < text.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      var r = range.getBoundingClientRect();
      adv.push({ x: r.left, y: r.top, w: r.width });
    }
    for (var k = 0; k < adv.length; k++) {
      var nxt = adv[k + 1];
      if (nxt && Math.abs(nxt.y - adv[k].y) < 2) adv[k].w = nxt.x - adv[k].x;
    }
    var sr = document.createElement("span");
    sr.className = "sr-only";
    sr.textContent = text;
    var vis = document.createElement("span");
    vis.setAttribute("aria-hidden", "true");
    var glyphs = [];
    var word = null;
    for (var c = 0; c < text.length; c++) {
      var ch = text[c];
      if (ch === " ") {
        word = null;
        vis.appendChild(document.createTextNode(" "));
        continue;
      }
      if (!word) {
        word = document.createElement("span");
        word.className = "kn-w";
        vis.appendChild(word);
      }
      var box = document.createElement("span");
      box.className = "kn-c";
      box.style.width = adv[c].w + "px";
      var g = document.createElement("span");
      g.className = "kn-g";
      g.textContent = ch;
      box.appendChild(g);
      word.appendChild(box);
      glyphs.push(g);
    }
    el.textContent = "";
    el.appendChild(sr);
    el.appendChild(vis);
    return { glyphs: glyphs, text: text };
  }

  function heroIntro(fieldApi) {
    var name = page.querySelector("[data-kinetic]");
    var items = all("[data-home-in]", page);
    var frame = page.querySelector("[data-portrait]");
    var img = frame && frame.querySelector("img");
    if (!G || REDUCE) {
      done();
      if (fieldApi) fieldApi.show(0);
      return;
    }
    var tl = G.timeline({ delay: 0.05 });
    if (DESKTOP && name) {
      var s = splitName(name);
      G.set(s.glyphs, { yPercent: 118, "--o": 9, "--w": 150 });
      G.set(name, { opacity: 1 });
      G.set(items, { opacity: 0, y: 14 });
      if (frame) G.set(frame, { clipPath: "inset(100% 0% 0% 0%)" });
      done();
      var byClass = function (c) {
        return items.filter(function (el) {
          return el.classList.contains(c);
        });
      };
      tl.to(byClass("hero-role"), { opacity: 1, y: 0, duration: 0.7, ease: EASE }, 0)
        .to(byClass("name-prefix"), { opacity: 1, y: 0, duration: 0.7, ease: EASE }, 0.08)
        .to(s.glyphs, { yPercent: 0, duration: 0.78, ease: "expo.out", stagger: 0.032 }, 0.14)
        .to(s.glyphs, { "--o": 144, "--w": 380, duration: 1.05, ease: "power2.out", stagger: 0.032 }, 0.14)
        .to(byClass("hero-tagline"), { opacity: 1, y: 0, duration: 0.9, ease: EASE }, 0.72)
        .to(byClass("hero-actions"), { opacity: 1, y: 0, duration: 0.9, ease: EASE, clearProps: "transform" }, 0.88)
        .add(function () {
          /* hand the name back as plain text (same metrics, so nothing moves) */
          name.textContent = s.text;
        });
      if (frame) {
        tl.to(frame, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut", clearProps: "clipPath" }, 0.1);
        if (img) tl.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 2.4, ease: "power3.out", clearProps: "transform" }, 0.1);
      }
    } else {
      done();
      /* phones: everything is already painted (LCP); only a quiet settle on the photo */
      if (img) tl.fromTo(img, { scale: 1.04 }, { scale: 1, duration: 1.8, ease: "power3.out", clearProps: "transform" }, 0);
    }
    rings(tl, DESKTOP ? 0.95 : 0.3);
    if (fieldApi) fieldApi.show(DESKTOP ? 350 : 0);
  }

  /* ------------------------------------------------------------------ 3. portrait rings */
  function ringPath(w, h, d, n, wob, ph) {
    var a = w / 2 + d,
      b = h / 2 + d,
      M = 72,
      pts = [];
    for (var i = 0; i < M; i++) {
      var th = (i / M) * Math.PI * 2,
        c = Math.cos(th),
        s = Math.sin(th);
      var x = Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
        y = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
      var k = 1 + wob * (Math.sin(2 * th + ph) * 0.6 + Math.sin(3 * th + ph * 1.7) * 0.4);
      pts.push([w / 2 + a * x * k, h / 2 + b * y * k]);
    }
    var dstr = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);
    for (var j = 0; j < M; j++) {
      var p0 = pts[(j - 1 + M) % M],
        p1 = pts[j],
        p2 = pts[(j + 1) % M],
        p3 = pts[(j + 2) % M];
      dstr +=
        "C" +
        (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) +
        " " +
        (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) +
        " " +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) +
        " " +
        (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) +
        " " +
        p2[0].toFixed(1) +
        " " +
        p2[1].toFixed(1);
    }
    return dstr + "Z";
  }
  function rings(tl, at) {
    var holder = page.querySelector(".hero-portrait");
    var frame = page.querySelector("[data-portrait]");
    if (!holder || !frame) return;
    var ns = "http://www.w3.org/2000/svg";
    var svg = null;
    function build() {
      var w = frame.offsetWidth,
        h = frame.offsetHeight;
      if (!w || !h) return null;
      /* the outer ring never reaches past the viewport edge (no horizontal scroll) */
      var r = frame.getBoundingClientRect();
      var room = Math.min(window.innerWidth - r.right, r.left) - 6;
      var outer = Math.max(12, Math.min(DESKTOP ? 68 : 33, room / 1.1));
      var gaps = [0.26, 0.58, 1].map(function (f) {
        return Math.round(outer * f);
      });
      var pad = Math.ceil(outer * 1.08 + 3);
      if (svg) svg.remove();
      svg = document.createElementNS(ns, "svg");
      svg.setAttribute("class", "portrait-rings");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.setAttribute("viewBox", -pad + " " + -pad + " " + (w + 2 * pad) + " " + (h + 2 * pad));
      svg.style.left = frame.offsetLeft - pad + "px";
      svg.style.top = frame.offsetTop - pad + "px";
      svg.style.width = w + 2 * pad + "px";
      svg.style.height = h + 2 * pad + "px";
      var ops = [0.42, 0.28, 0.17];
      var paths = gaps.map(function (d, i) {
        var p = document.createElementNS(ns, "path");
        p.setAttribute("d", ringPath(w, h, d, 9 - i * 2.2, 0.006 + i * 0.012, 0.8 + i));
        p.setAttribute("pathLength", "1");
        p.style.opacity = ops[i];
        svg.appendChild(p);
        return p;
      });
      holder.insertBefore(svg, holder.firstChild);
      return paths;
    }
    var paths = build();
    if (!paths) return;
    var rt = 0,
      lastW = window.innerWidth;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        build();
      }, 200);
    });
    if (!G || REDUCE || !tl) return;
    G.set(paths, { strokeDasharray: 1, strokeDashoffset: 1 });
    tl.to(paths, { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", stagger: 0.2 }, at);
  }

  /* ------------------------------------------------------------------ 4b. odometer */
  function ledger() {
    var odos = all("[data-odo]", page);
    if (!odos.length) return;
    odos.forEach(function (el) {
      var text = el.textContent.trim();
      var sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent =
        text + (el.nextElementSibling && el.nextElementSibling.classList.contains("ledger-suffix") ? el.nextElementSibling.textContent : "");
      el.parentNode.insertBefore(sr, el.parentNode.firstChild);
      el.setAttribute("aria-hidden", "true");
      if (el.nextElementSibling && el.nextElementSibling.classList.contains("ledger-suffix"))
        el.nextElementSibling.setAttribute("aria-hidden", "true");
    });
    if (!G || REDUCE) return;
    var digitsOf = function (el) {
      var text = el.textContent.trim();
      var digits = text.replace(/\D/g, "").length;
      var pos = 0,
        cols = [];
      el.textContent = "";
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (!/\d/.test(ch)) {
          el.appendChild(document.createTextNode(ch));
          continue;
        }
        var fromRight = digits - 1 - pos;
        pos++;
        var target = +ch;
        var loops = fromRight === 0 ? 2 : fromRight === 1 ? 1 : 0;
        if (digits === 1) loops = 1;
        var col = document.createElement("span");
        col.className = "odo-col";
        var sizer = document.createElement("span");
        sizer.className = "odo-sizer";
        sizer.textContent = ch;
        var strip = document.createElement("span");
        strip.className = "odo-strip";
        var len = loops * 10 + target + 1;
        for (var n = 0; n < len; n++) {
          var d = document.createElement("span");
          d.textContent = String(n % 10);
          strip.appendChild(d);
        }
        col.appendChild(sizer);
        col.appendChild(strip);
        el.appendChild(col);
        cols.push({ strip: strip, end: len - 1, fromRight: fromRight });
      }
      return cols;
    };
    var prepared = odos.map(function (el) {
      var cols = digitsOf(el);
      cols.forEach(function (c) {
        G.set(c.strip, { xPercent: -50, y: 0 });
      });
      return cols;
    });
    var played = false;
    var play = function () {
      if (played) return;
      played = true;
      prepared.forEach(function (cols, i) {
        cols.forEach(function (c) {
          G.to(c.strip, {
            y: function () {
              return -c.end * c.strip.firstChild.getBoundingClientRect().height;
            },
            duration: 1.5 + 0.18 * c.fromRight,
            delay: 0.1 + i * 0.09,
            ease: "power3.inOut",
          });
        });
      });
    };
    var target = page.querySelector(".home-ledger");
    if ("IntersectionObserver" in window && target) {
      var io = new IntersectionObserver(
        function (es) {
          if (es[0].isIntersecting) {
            io.disconnect();
            play();
          }
        },
        { threshold: 0.45 }
      );
      io.observe(target);
    } else play();
  }

  /* ------------------------------------------------------------------ 5. finale contours */
  function finale() {
    var svg = page.querySelector(".finale-contours");
    if (!svg || REDUCE || !("IntersectionObserver" in window)) return;
    var paths = all("path", svg);
    /* outer rings first, converging on the email */
    paths.forEach(function (p, i) {
      p.style.transitionDelay = (paths.length - 1 - i) * 0.11 + "s";
    });
    svg.classList.add("is-armed");
    var io = new IntersectionObserver(
      function (es) {
        if (es[0].isIntersecting) {
          io.disconnect();
          requestAnimationFrame(function () {
            svg.classList.add("is-drawn");
          });
        }
      },
      { threshold: 0.35 }
    );
    io.observe(svg.parentNode);
  }

  function init() {
    var api = null;
    try {
      refreshSince();
      ledger();
      finale();
      api = field();
      heroIntro(api);
      if (api && document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          api.relayout();
        });
      }
    } catch (err) {
      if (window.console) console.warn("[home] disabled:", err);
      all("[data-home-in], [data-kinetic], [data-portrait]", page).forEach(function (el) {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.clipPath = "";
      });
      if (api) api.show(0);
    } finally {
      done();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
