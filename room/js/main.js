/* Boot: decide between the 3D office and the 2D desktop, run the intro, wire the controls.
   <html data-site-base> says where the main site's pages are ("../" when this lives at /room/,
   "./" at the site root). <html data-room-base> says where this folder's files are ("" or "room/"). */
(function () {
  'use strict';
  var C = window.ROOM_CONTENT, D = window.RoomDesktop;
  var root = document.documentElement;
  var SITE = root.getAttribute('data-site-base') || '../';
  var ROOM = root.getAttribute('data-room-base') || '';
  var q = new URLSearchParams(location.search);
  var mq = function (s) { return window.matchMedia(s).matches; };
  var reduced = mq('(prefers-reduced-motion: reduce)');
  var touch = mq('(pointer: coarse)') && !mq('(pointer: fine)');
  var phone = mq('(max-width: 760px)') || (touch && Math.min(innerWidth, innerHeight) < 600);
  var $ = function (id) { return document.getElementById(id); };
  var loader = $('loader'), bar = $('loader-bar'), stage = $('stage'), roomUI = $('room-ui'),
    sitBtn = $('sit'), skipIntroBtn = $('skip-intro'), osEl = $('os'), tip = $('tip'), skip = $('skip');

  skip.firstChild.nodeValue = C.skipLabel + ' ';
  skip.href = SITE + C.skipUrl;
  sitBtn.textContent = touch ? C.hintTouch : C.hint;
  // persona fix 6: touch screens get "Tap", not "Click", in the room caption
  var cap = roomUI.querySelector('.room-cap');
  if (cap && (mq('(hover: none)') || mq('(pointer: coarse)'))) cap.textContent = cap.textContent.replace(/\bClick\b/, 'Tap');
  skipIntroBtn.textContent = C.skipIntroLabel;
  $('loader-label').textContent = C.loadingLabel;

  var mode = 'pending', reason = '', scene = null, state = 'loading';
  // read-only status for the automated tests
  window.__room = {
    get mode() { return mode; }, get state() { return state; }, get reason() { return reason; },
    get renders() { return scene ? scene.renders : 0; }, get calls() { return scene ? scene.calls : 0; },
    get introDuration() { return scene ? scene.introDuration : 0; },
    hold: function (t) { if (scene && state === 'intro') scene.holdIntro(t); }   // test hook for still frames
  };

  D.build(osEl, { siteBase: SITE, roomBase: ROOM, standLabel: C.standLabel, onOffice: function () { stand(); } });

  function progress(p) { bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)).toFixed(3) + ')'; }
  // persona fix 5: during the intro the loader's name moves to the top-left corner instead of fading out
  var nameEl = loader.querySelector('.loader-name');
  function cornerName() { if (nameEl && nameEl.parentNode === loader) { document.body.appendChild(nameEl); nameEl.classList.add('is-corner'); } }
  function uncornerName() { if (nameEl && nameEl.parentNode !== loader) { nameEl.classList.remove('is-corner'); loader.insertBefore(nameEl, loader.firstChild); } }
  function hideLoader(slow) {
    if (slow) cornerName();
    if (slow && !reduced) loader.classList.add('is-slow');
    loader.classList.add('is-done'); document.body.classList.remove('is-loading');
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  // persona fix 1: the intro plays once per session; returning visitors (same session, or coming
  // from one of the site's own pages) go straight to the desk through the deep-link path
  var INTRO_KEY = 'vsi-intro';
  function introSeen() {
    try { if (sessionStorage.getItem(INTRO_KEY)) return true; } catch (e) { /* storage blocked */ }
    try {
      var base = new URL(SITE, location.href).href;
      return !!document.referrer && document.referrer.indexOf(base) === 0;
    } catch (e) { return false; }
  }
  function markIntroSeen() { try { sessionStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* storage blocked */ } }
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
    var was = state;
    uncornerName();
    mode = '2d'; reason = r || reason; state = 'desktop';
    if (scene) { try { scene.dispose(); } catch (e) { /* already gone */ } scene = null; }
    stage.innerHTML = '';
    roomUI.hidden = true; skipIntroBtn.hidden = true; tip.classList.remove('is-on');
    D.setOffice(false);
    progress(1);
    if (was === 'desktop') return;   // already showing the folders
    setTimeout(function () { hideLoader(); D.show({ openHash: true }); }, reduced ? 0 : 200);
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
    // reduced motion and direct folder links go straight to the folders; the room loads behind them
    var early = reduced || !!deepLink() || introSeen();
    if (early) { state = 'desktop'; hideLoader(); D.show({ openHash: true }); markIntroSeen(); }
    var timer = setTimeout(function () { if (!scene) { failed = true; start2D('timeout'); } }, 12000);
    progress(0.04);
    prefetch(ROOM + 'vendor/three.module.min.js', 691648, function (p) { progress(0.05 + p * 0.65); })
      .then(function () { return import(new URL(ROOM + 'js/scene.js', document.baseURI).href); })
      .then(function (m) {
        if (failed) return null;
        return m.createScene(stage, {
          phone: phone, reduced: reduced, strictPerf: !q.has('3d'),
          portrait: ROOM + 'assets/portrait.webp',
          onProgress: function (p) { progress(0.7 + p * 0.3); },
          onSlow: function () { if (state === 'intro' || state === 'room') start2D('slow'); },
          onHover: onHover, onPick: onPick, onIntroPoke: offerSkip
        });
      })
      .then(function (s) {
        if (!s || failed) { if (s) s.dispose(); return; }
        clearTimeout(timer);
        scene = s;
        if (early) { scene.jumpDesk(); scene.pause(); D.setOffice(true); return; }
        state = 'intro';
        hideLoader(true);
        skipIntroBtn.hidden = false;
        requestAnimationFrame(function () { skipIntroBtn.classList.add('is-on'); });
        return scene.intro(phone, function () { toDesk(); });
      })
      .catch(function (e) {
        clearTimeout(timer);
        if (!failed) start2D('error: ' + (e && e.message ? e.message : 'unknown'));
      });
  }

  function offerSkip() {
    if (state !== 'intro') return;
    skipIntroBtn.classList.add('is-offered');
    // after the click has finished moving focus, put it on the button so Enter skips
    setTimeout(function () { if (state === 'intro') skipIntroBtn.focus({ preventScroll: true }); }, 0);
  }
  function skipIntro() {
    if (state !== 'intro' || !scene) return;
    scene.skipIntro();   // fires toDesk through the intro's fill callback
    toDesk();
  }

  function toDesk(folder) {
    if (state === 'desktop' || mode !== '3d') return;
    state = 'desktop';
    markIntroSeen();
    uncornerName();
    skipIntroBtn.classList.remove('is-on'); skipIntroBtn.hidden = true;
    roomUI.classList.remove('is-on'); roomUI.hidden = true;
    tip.classList.remove('is-on'); stage.classList.remove('is-hover');
    D.show({ office: true });
    if (folder) D.open(folder, { push: true });
    // the desktop covers the room: stop drawing it until the visitor stands up
    setTimeout(function () { if (state === 'desktop' && scene) scene.pause(); }, reduced ? 0 : 700);
  }

  function stand() {
    if (state !== 'desktop' || mode !== '3d' || !scene) return;
    state = 'standing';
    scene.resume();
    D.hide();
    scene.stand().then(enterRoom);
  }

  function enterRoom() {
    state = 'room';
    roomUI.hidden = false;
    requestAnimationFrame(function () { roomUI.classList.add('is-on'); });
    sitBtn.focus({ preventScroll: true });
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
    scene.sit().then(function () { toDesk(folder); });
  }

  sitBtn.addEventListener('click', function () { sit(); });
  // any click or tap during the intro offers the skip button (the button and the skip link work as usual)
  document.addEventListener('pointerdown', function (e) {
    if (state === 'intro' && !e.target.closest('#skip-intro, #skip')) offerSkip();
  });
  skipIntroBtn.addEventListener('click', skipIntro);
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    if (state === 'intro') {
      if (e.key === 'Escape') { e.preventDefault(); skipIntro(); }
      else if (e.key !== 'Tab' && document.activeElement !== skipIntroBtn) offerSkip();
      return;
    }
    if (e.key === 'Escape' && state === 'desktop' && mode === '3d' && scene && !D.isOpen()) { e.preventDefault(); stand(); }
  });

  var r = why2D();
  if (r) start2D(r); else start3D();
})();
