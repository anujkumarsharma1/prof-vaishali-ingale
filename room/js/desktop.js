/* The laptop desktop: folders and windows. Plain DOM, no dependencies. */
(function () {
  'use strict';
  var C = window.ROOM_CONTENT;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsap = window.gsap;
  var SITE = '../', ROOM = '';

  var FOLDER_SVG =
    '<svg viewBox="0 0 64 50" aria-hidden="true" focusable="false">' +
    '<path d="M3 7.5A3.5 3.5 0 0 1 6.5 4h15.2c1 0 1.9.4 2.6 1.1L28 9h29.5A3.5 3.5 0 0 1 61 12.5V16H3z" fill="#c98f63"/>' +
    '<rect x="3" y="12" width="58" height="35" rx="3.5" fill="#e8bf98"/>' +
    '<rect x="3" y="12" width="58" height="1.2" fill="#f3d6ba"/>' +
    '</svg>';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // site-relative links ("about/") get the configured base; external and mailto links stay as they are
  function href(u) { return /^(https?:|mailto:|#|\/)/.test(u) ? u : SITE + u; }
  function ext(u) { return /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''; }
  function link(u, inner, cls) {
    return u ? '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc(href(u)) + '"' + ext(u) + '>' + inner + '</a>' : inner;
  }
  function text(i) { return typeof i === 'string' ? esc(i) : '<b>' + esc(i.b) + '</b> ' + esc(i.t); }

  function stats(l) { return '<ul class="w-stats">' + l.map(function (s) { return '<li><b>' + esc(s.n) + '</b><span>' + esc(s.l) + '</span></li>'; }).join('') + '</ul>'; }
  function list(items) { return '<ul class="w-list">' + items.map(function (i) { return '<li>' + text(i) + '</li>'; }).join('') + '</ul>'; }
  function papers(items, cls) {
    return '<ul class="' + cls + '">' + items.map(function (p) {
      return '<li>' + link(p.href, esc(p.title), 'w-ptitle') + '<span class="w-meta">' + esc(p.meta) + '</span></li>';
    }).join('') + '</ul>';
  }
  function timeline(items) { return '<ul class="w-tl">' + items.map(function (t) { return '<li><b>' + esc(t.y) + '</b><span>' + esc(t.t) + '</span></li>'; }).join('') + '</ul>'; }

  function render(f) {
    var h = '';
    var title = f.id === 'about' ? C.name : f.label;
    var headLink = f.link && !/^mailto:/.test(f.link) ? f.link : null;
    var head = '<h2 class="w-h" id="win-h">' + link(headLink, esc(title)) + '</h2>' + (f.lead ? '<p class="w-lead">' + esc(f.lead) + '</p>' : '');
    if (f.portrait) h += '<div class="w-top"><div>' + head + '</div><img class="w-portrait" src="' + ROOM + 'assets/portrait.webp" width="400" height="381" alt="Portrait of Prof. Vaishali S. Ingale"></div>';
    else h += head;
    if (f.stats) h += stats(f.stats);
    if (f.facts && f.facts.length) {
      h += '<dl class="w-facts">' + f.facts.map(function (x) {
        return typeof x === 'string' ? '<div><dd>' + esc(x) + '</dd></div>' : '<div><dt>' + esc(x.b) + '</dt><dd>' + esc(x.t) + '</dd></div>';
      }).join('') + '</dl>';
    }
    (f.sections || []).forEach(function (s) {
      h += '<section class="w-sec' + (s.h ? '' : ' w-sec-plain') + '">';
      if (s.kicker) h += '<p class="w-label">' + esc(s.kicker) + '</p>';
      if (s.h) h += '<h3>' + link(s.link, esc(s.h)) + '</h3>';
      if (s.p) h += '<p class="w-p">' + esc(s.p) + '</p>';
      if (s.stats) h += stats(s.stats);
      if (s.items) h += list(s.items);
      if (s.papers) h += papers(s.papers, 'w-papers');
      if (s.timeline) h += timeline(s.timeline);
      if (s.more && s.link) h += '<p class="w-sec-more">' + link(s.link, 'More <span aria-hidden="true">→</span>') + '</p>';
      h += '</section>';
    });
    if (f.pubs) {
      var years = [];
      f.pubs.forEach(function (p) { if (years.indexOf(p.year) < 0) years.push(p.year); });
      h += '<section class="w-sec">' + years.map(function (y) {
        return '<h3 class="w-year">' + esc(y) + '</h3>' + papers(f.pubs.filter(function (p) { return p.year === y; }), 'w-pubs');
      }).join('') + '</section>';
    }
    if (f.links) {
      h += '<ul class="w-links">' + f.links.map(function (l) {
        return '<li><span>' + esc(l.label) + '</span>' + link(l.href, esc(l.value)) + '</li>';
      }).join('') + '</ul>';
    }
    if (f.url) {
      var mail = /^mailto:/.test(f.url);
      h += '<p class="w-more">' + link(f.url, (mail ? 'Write an email' : 'Open the full page') + ' <span aria-hidden="true">→</span>') + '</p>';
    }
    return h;
  }

  var os, desk, grid, scrim, win, winBody, winTitle, current = null, lastFolder = null, pushed = false, opts = {};

  function build(el, o) {
    opts = o || {};
    SITE = opts.siteBase || SITE; ROOM = opts.roomBase || ROOM;
    os = el;
    os.setAttribute('aria-label', 'Portfolio desktop');
    os.innerHTML =
      '<div class="os-bar"><span class="os-who"><strong>Vaishali S. Ingale</strong></span>' +
      '<button class="os-office" type="button"><span aria-hidden="true">←</span>&nbsp;' + esc(opts.standLabel || 'Stand up') + '</button>' +
      '<span class="os-where">' + esc(new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })) + '</span></div>' +
      '<div class="os-desk" tabindex="-1"><div class="os-hello"><p class="os-kicker">' + esc(C.subtitle) + '</p>' +
      '<h1 class="os-name">' + esc(C.name) + '</h1>' +
      '<p class="os-sub">' + esc(C.tagline || '') + '</p>' +
      '<p class="os-foot">Open a folder. Esc closes a window.</p></div>' +
      '<ul class="os-grid" role="list">' + C.folders.map(function (f) {
        return '<li><button class="folder" type="button" data-id="' + esc(f.id) + '" aria-haspopup="dialog" aria-expanded="false" title="' + esc((f.blurb || []).join(' ')) + '">' +
          FOLDER_SVG + '<span>' + esc(f.label) + '</span></button></li>';
      }).join('') + '</ul></div>' +
      '<div class="win-scrim" hidden></div>' +
      '<section class="win" role="dialog" aria-modal="true" aria-labelledby="win-h" tabindex="-1" hidden>' +
      '<div class="win-bar"><button class="win-back" type="button"><span aria-hidden="true">←</span> Folders</button>' +
      '<p class="win-title">' + FOLDER_SVG + '<span></span></p>' +
      '<button class="win-close" type="button" aria-label="Close window">Close <span aria-hidden="true">✕</span></button></div>' +
      '<div class="win-body"></div></section>';
    desk = os.querySelector('.os-desk');
    grid = os.querySelector('.os-grid');
    scrim = os.querySelector('.win-scrim');
    win = os.querySelector('.win');
    winBody = os.querySelector('.win-body');
    winTitle = os.querySelector('.win-title span');

    grid.addEventListener('click', function (e) { var b = e.target.closest('.folder'); if (b) open(b.dataset.id, { push: true }); });
    grid.addEventListener('keydown', onGridKey);
    os.querySelector('.win-close').addEventListener('click', function () { close(); });
    os.querySelector('.win-back').addEventListener('click', function () { close(); });
    scrim.addEventListener('click', function () { close(); });
    os.querySelector('.os-office').addEventListener('click', function () { if (opts.onOffice) opts.onOffice(); });
    win.addEventListener('keydown', trapTab);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && current) { e.preventDefault(); close(); } });
    window.addEventListener('popstate', function () {
      var id = (location.hash || '').slice(1);
      if (current && id !== current) { pushed = false; close({ fromHistory: true }); }
    });
  }

  function onGridKey(e) {
    var btns = Array.prototype.slice.call(grid.querySelectorAll('.folder'));
    var i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    var n = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (e.key === 'Home') n = -i;
    if (e.key === 'End') n = btns.length - 1 - i;
    if (n === undefined) return;
    e.preventDefault();
    btns[Math.max(0, Math.min(btns.length - 1, i + n))].focus();
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(win.querySelectorAll('a[href], button:not([hidden])'), function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === win)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function isPhone() { return window.matchMedia('(max-width: 760px)').matches; }

  function open(id, o) {
    o = o || {};
    var f = C.folders.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    var swap = !!current;
    current = id;
    lastFolder = grid.querySelector('[data-id="' + id + '"]');
    grid.querySelectorAll('.folder').forEach(function (b) { b.setAttribute('aria-expanded', String(b === lastFolder)); });
    winTitle.textContent = f.label;
    winBody.innerHTML = render(f);
    winBody.scrollTop = 0;
    if (o.push && !pushed) { history.pushState({ roomWin: id }, '', '#' + id); pushed = true; }
    else if (o.push && pushed) history.replaceState({ roomWin: id }, '', '#' + id);
    win.hidden = false; scrim.hidden = isPhone();
    desk.setAttribute('aria-hidden', 'true');
    if (gsap && !reduced && !swap) {
      gsap.killTweensOf([win, scrim]);
      if (isPhone()) gsap.fromTo(win, { opacity: 1, yPercent: 4 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
      else gsap.fromTo(win, { opacity: 0, y: 14, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power3.out' });
      gsap.to(scrim, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    } else { win.style.opacity = 1; scrim.style.opacity = 1; win.style.transform = ''; }
    win.focus({ preventScroll: true });
  }

  function close(o) {
    o = o || {};
    if (!current) return;
    if (pushed && !o.fromHistory) { pushed = false; history.back(); }
    else if (!o.fromHistory && location.hash) history.replaceState(null, '', location.pathname + location.search);
    current = null;
    grid.querySelectorAll('.folder').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    desk.removeAttribute('aria-hidden');
    var done = function () { win.hidden = true; scrim.hidden = true; };
    if (gsap && !reduced) {
      gsap.killTweensOf([win, scrim]);
      gsap.to(win, { opacity: 0, y: 10, duration: 0.25, ease: 'power2.in', onComplete: done });
      gsap.to(scrim, { opacity: 0, duration: 0.25 });
    } else done();
    if (lastFolder) lastFolder.focus({ preventScroll: true });
  }

  function show(o) {
    o = o || {};
    os.classList.add('is-full');
    if ('office' in o) setOffice(o.office);
    os.hidden = false;
    var items = grid.querySelectorAll('.folder');
    var head = desk.querySelectorAll('.os-kicker, .os-name, .os-sub, .os-foot');
    if (gsap && !reduced && o.animate !== false) {
      gsap.killTweensOf(os);
      gsap.set(os, { opacity: 0 });
      gsap.to(os, { opacity: 1, duration: 0.6, ease: 'power2.out' });
      gsap.fromTo(head, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, delay: 0.15 });
      gsap.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04, delay: 0.3 });
    } else { os.style.opacity = 1; }
    var hash = (location.hash || '').slice(1);
    if (o.openHash && hash && C.folders.some(function (f) { return f.id === hash; })) open(hash, {});
    else if (o.focus !== false) desk.focus({ preventScroll: true });
  }

  function hide(cb) {
    if (current) close();
    if (gsap && !reduced) gsap.to(os, { opacity: 0, duration: 0.45, ease: 'power2.inOut', onComplete: function () { os.hidden = true; cb && cb(); } });
    else { os.hidden = true; os.style.opacity = 0; cb && cb(); }
  }
  function setOffice(on) { os.classList.toggle('has-office', !!on); }

  window.RoomDesktop = {
    build: build, show: show, hide: hide, open: open, close: close, setOffice: setOffice,
    isOpen: function () { return !!current; }, el: function () { return os; }
  };
})();
