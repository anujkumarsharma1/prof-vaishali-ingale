/* Boot: decide between the 3D office and the 2D desktop, run the intro, wire the controls. */
(function () {
  'use strict';
  var C = window.ROOM_CONTENT, D = window.RoomDesktop, gsap = window.gsap;
  var q = new URLSearchParams(location.search);
  var mq = function (s) { return window.matchMedia(s).matches; };
  var reduced = mq('(prefers-reduced-motion: reduce)');
  var touch = mq('(pointer: coarse)') && !mq('(pointer: fine)');
  var phone = mq('(max-width: 760px)') || (touch && Math.min(innerWidth, innerHeight) < 600);
  var $ = function (id) { return document.getElementById(id); };
  var loader = $('loader'), bar = $('loader-bar'), stage = $('stage'), roomUI = $('room-ui'),
    sitBtn = $('sit'), standBtn = $('stand'), osEl = $('os'), tip = $('tip'), skip = $('skip');

  skip.firstChild.nodeValue = C.skipLabel + ' ';
  sitBtn.textContent = touch ? C.hintTouch : C.hint;
  standBtn.lastChild.nodeValue = ' ' + C.backLabel;
  $('loader-label').textContent = C.loadingLabel;

  var mode = 'pending', reason = '', scene = null, state = 'loading';
  // read-only status, used by the automated tests
  window.__room = { get mode() { return mode; }, get state() { return state; }, get reason() { return reason; }, get renders() { return scene ? scene.renders : 0; }, get calls() { return scene ? scene.calls : 0; } };

  D.build(osEl, { onOffice: function () { stand(); } });

  function progress(p) { bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)).toFixed(3) + ')'; }
  function hideLoader() { loader.classList.add('is-done'); document.body.classList.remove('is-loading'); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function deepLink() { var h = (location.hash || '').slice(1); return C.folders.some(function (f) { return f.id === h; }) ? h : ''; }

  function webglOK(strict) {
    try {
      var c = document.createElement('canvas');
      var g = c.getContext('webgl2', { failIfMajorPerformanceCaveat: strict }) || c.getContext('webgl', { failIfMajorPerformanceCaveat: strict });
      if (!g) return false;
      var soft = false;
      if (strict) {
        var info = g.getExtension('WEBGL_debug_renderer_info');
        var name = info ? String(g.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
        soft = /swiftshader|llvmpipe|softpipe|software/i.test(name);
      }
      if (g.getExtension('WEBGL_lose_context')) g.getExtension('WEBGL_lose_context').loseContext();
      return !soft;
    } catch (e) { return false; }
  }
  function why2D() {
    if (q.has('2d')) return 'requested';
    if (location.protocol === 'file:') return 'file';
    if (!window.fetch || !('noModule' in HTMLScriptElement.prototype)) return 'old-browser';
    var conn = navigator.connection;
    if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return 'save-data';
    var forced = q.has('3d');
    if (!webglOK(!forced)) return 'no-webgl';
    if (!forced && navigator.deviceMemory && navigator.deviceMemory < 2) return 'low-memory';
    return '';
  }

  /* ---------- 2D desktop ---------- */
  function start2D(r) {
    mode = '2d'; reason = r || reason; state = 'desktop';
    if (scene) { try { scene.dispose(); } catch (e) { /* already gone */ } scene = null; }
    stage.innerHTML = '';
    roomUI.hidden = true; standBtn.hidden = true; tip.classList.remove('is-on');
    progress(1);
    setTimeout(function () {
      hideLoader();
      D.show({ openHash: true });
    }, reduced ? 0 : 200);
  }

  /* ---------- 3D office ---------- */
  function prefetch(url, expect, onp) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      if (!res.body || !res.body.getReader) return res.arrayBuffer().then(function () { onp(1); });
      var reader = res.body.getReader(), got = 0;
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) { onp(1); return; }
          got += r.value.length; onp(got / expect);
          return pump();
        });
      })();
    });
  }

  function start3D() {
    mode = '3d';
    var failed = false;
    var timer = setTimeout(function () { if (state === 'loading') { failed = true; start2D('timeout'); } }, 12000);
    progress(0.04);
    prefetch('vendor/three.module.min.js', 691648, function (p) { progress(0.05 + p * 0.65); })
      .then(function () { return import(new URL('js/scene.js', document.baseURI).href); })
      .then(function (m) {
        if (failed) return null;
        return m.createScene(stage, {
          phone: phone, reduced: reduced, strictPerf: !q.has('3d'),
          portrait: 'assets/portrait.webp',
          onProgress: function (p) { progress(0.7 + p * 0.3); },
          onSlow: function () { if (state === 'intro' || state === 'room') start2D('slow'); },
          onHover: onHover, onPick: onPick,
          onRect: function (r) { if (state === 'desktop' && !phone) D.setRect(r); }
        });
      })
      .then(function (s) {
        if (!s || failed) { if (s) s.dispose(); return; }
        clearTimeout(timer);
        scene = s;
        state = 'intro';
        return wait(reduced ? 0 : 300).then(function () {
          hideLoader();
          if (deepLink()) { var r = scene.jumpSeat(); return seated(r, true); }
          return scene.intro(phone).then(function () {
            if (mode !== '3d' || !scene) return;
            if (phone) { state = 'room'; return wait(reduced ? 0 : 250).then(function () { sit(); }); }
            enterRoom();
          });
        });
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (!failed) start2D('error: ' + (e && e.message ? e.message : 'unknown'));
      });
  }

  function enterRoom() {
    state = 'room';
    roomUI.hidden = false;
    requestAnimationFrame(function () { roomUI.classList.add('is-on'); });
  }

  function onHover(hit, x, y) {
    var on = !!hit && state === 'room';
    stage.classList.toggle('is-hover', on);
    sitBtn.classList.toggle('is-hint', on && !hit.folder);
    if (!on || !hit.folder) { tip.classList.remove('is-on'); return; }
    tip.textContent = hit.label;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    tip.classList.add('is-on');
  }
  function onPick(hit) { sit(hit.folder); }

  function sit(folder) {
    if (state !== 'room' || !scene) return;
    state = 'sitting';
    tip.classList.remove('is-on'); stage.classList.remove('is-hover');
    roomUI.classList.remove('is-on');
    setTimeout(function () { if (state !== 'room') roomUI.hidden = true; }, reduced ? 0 : 500);
    scene.sit().then(function (r) { return seated(r, false, folder); });
  }

  function seated(rect, fromLink, folder) {
    state = 'desktop';
    if (phone) {
      D.show({ office: true, openHash: fromLink, focus: !fromLink });
      // the screen fills the phone; stop drawing the room until it is needed again
      setTimeout(function () { if (state === 'desktop' && scene) scene.pause(); }, reduced ? 0 : 600);
    } else {
      D.show({ rect: rect, openHash: fromLink, focus: !fromLink });
      standBtn.hidden = false;
      requestAnimationFrame(function () { standBtn.classList.add('is-on'); });
    }
    if (folder) D.open(folder, { push: true });
  }

  function stand() {
    if (state !== 'desktop' || mode !== '3d' || !scene) return;
    state = 'standing';
    standBtn.classList.remove('is-on');
    standBtn.hidden = true;
    scene.resume();
    D.hide();
    scene.stand().then(function () { enterRoom(); sitBtn.focus({ preventScroll: true }); });
  }

  sitBtn.addEventListener('click', function () { sit(); });
  standBtn.addEventListener('click', stand);
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    if (state === 'intro' && scene && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { scene.finishIntro(); return; }
    if (e.key === 'Escape' && state === 'desktop' && mode === '3d' && !D.isOpen()) { e.preventDefault(); stand(); }
  });
  stage.addEventListener('touchstart', function () { if (state === 'intro' && scene) scene.finishIntro(); }, { passive: true });

  var r = why2D();
  if (r) start2D(r); else start3D();
})();
