/*
 * Publications page (plan.md change 9). Topic map: _data/pub_topics.yml. Styles: assets/custom/pubs.css.
 *  - Topic chips: one ink "glider" slides from chip to chip. It is a clip-path window onto a light copy
 *    of the chip row, so the active label changes colour exactly where the ink passes (no text swap).
 *  - Filtering (chips and text search) is FLIP-animated: entries that stay glide to their new place,
 *    entries that leave fade and shrink where they stood, entries that arrive rise in. GSAP when it is
 *    loaded, otherwise the Web Animations API. Transform and opacity only.
 *  - Copy BibTeX: one button per entry (the old "Bib" toggle is gone). The label slides to "Copied"
 *    with a drawn check; the status line announces it. If the clipboard is unavailable, the BibTeX
 *    opens under the entry, selected, so it can be copied by hand.
 * Without JavaScript the chips, search and copy buttons stay hidden and every paper is listed.
 * Reduced motion: every change is instant.
 */
(function () {
  "use strict";
  var bar = document.querySelector(".pub-filter");
  var status = document.querySelector(".pub-status");
  var mapEl = document.getElementById("pub-topics");
  var list = document.querySelector(".publications");
  if (!bar || !mapEl || !list) return;

  var map = {};
  try {
    map = JSON.parse(mapEl.textContent) || {};
  } catch (e) {
    return;
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var slice = function (x) {
    return Array.prototype.slice.call(x);
  };

  var items = slice(list.querySelectorAll("ol.bibliography > li"));
  var heads = slice(list.querySelectorAll("h2.bibliography"));
  var credit = document.querySelector(".image-credit");
  var tracked = items.concat(heads);
  if (credit) tracked.push(credit);

  items.forEach(function (li) {
    var keyEl = li.querySelector("[id]");
    var key = keyEl ? keyEl.id : "";
    li.setAttribute("data-topic", map[key] || "other");
  });

  var chips = slice(bar.querySelectorAll(".pub-chip"));

  function isShown(li) {
    return !li.classList.contains("topic-off") && !li.classList.contains("search-off");
  }
  function visible(el) {
    return el.offsetParent !== null && !el.classList.contains("pub-leaving");
  }

  function regroup() {
    slice(list.querySelectorAll("ol.bibliography")).forEach(function (ol) {
      var shown = Array.prototype.some.call(ol.children, isShown);
      ol.classList.toggle("group-off", !shown);
      var h = ol.previousElementSibling;
      if (h && h.tagName === "H2") h.classList.toggle("group-off", !shown);
    });
  }

  function announce() {
    var n = items.filter(isShown).length;
    status.textContent = "Showing " + n + (n === 1 ? " paper" : " papers");
  }

  /* ---------- tiny animation adapter: GSAP if present, else WAAPI ---------- */
  var running = [];
  var EASE = {
    move: ["power3.out", "cubic-bezier(0.22, 1, 0.36, 1)"],
    out: ["power2.in", "cubic-bezier(0.4, 0, 1, 1)"],
    in: ["power3.out", "cubic-bezier(0.16, 1, 0.3, 1)"],
  };
  function tf(v) {
    return "translate(" + (v.x || 0) + "px," + (v.y || 0) + "px) scale(" + (v.scale == null ? 1 : v.scale) + ")";
  }
  function tween(el, from, to, dur, ease, delay, done) {
    if (window.gsap) {
      var t = gsap.fromTo(
        el,
        from,
        Object.assign({}, to, {
          duration: dur,
          ease: EASE[ease][0],
          delay: delay || 0,
          overwrite: true,
          onComplete: function () {
            gsap.set(el, { clearProps: "transform,opacity" });
            if (done) done();
          },
        })
      );
      running.push({
        kill: function () {
          t.kill();
          gsap.set(el, { clearProps: "transform,opacity" });
        },
      });
      return;
    }
    if (!el.animate) {
      if (done) done();
      return;
    }
    var a = el.animate(
      [
        { transform: tf(from), opacity: from.opacity == null ? 1 : from.opacity },
        { transform: tf(to), opacity: to.opacity == null ? 1 : to.opacity },
      ],
      { duration: dur * 1000, easing: EASE[ease][1], delay: (delay || 0) * 1000, fill: "both" }
    );
    a.onfinish = function () {
      a.cancel();
      if (done) done();
    };
    running.push({
      kill: function () {
        a.cancel();
      },
    });
  }

  var leaving = [];
  function finishLeave(el) {
    el.classList.remove("pub-leaving");
    el.style.top = el.style.left = el.style.width = "";
    var ol = el.parentElement;
    if (ol && ol.classList.contains("pub-group-leaving") && !ol.querySelector(".pub-leaving")) ol.classList.remove("pub-group-leaving");
  }
  function settle() {
    running.forEach(function (r) {
      r.kill();
    });
    running = [];
    leaving.forEach(finishLeave);
    leaving = [];
    slice(list.querySelectorAll(".pub-group-leaving")).forEach(function (ol) {
      ol.classList.remove("pub-group-leaving");
    });
  }

  /* FLIP: First (measure) -> mutate -> Last (measure) -> Invert -> Play */
  function flip(mutate) {
    if (reduce || !list.getBoundingClientRect) {
      settle();
      mutate();
      return;
    }
    var first = new Map();
    tracked.forEach(function (el) {
      if (visible(el)) first.set(el, el.getBoundingClientRect());
    });
    var groupsBefore = slice(list.querySelectorAll("ol.bibliography")).filter(function (ol) {
      return !ol.classList.contains("group-off");
    });
    settle();
    mutate();

    /* Leavers come back out of flow, pinned where they stood, and fade there. */
    var box = list.getBoundingClientRect();
    groupsBefore.forEach(function (ol) {
      if (ol.classList.contains("group-off")) ol.classList.add("pub-group-leaving");
    });
    var out = [];
    first.forEach(function (r, el) {
      if (el === credit || visible(el)) return;
      out.push([el, r]);
    });
    out.forEach(function (pair) {
      var el = pair[0],
        r = pair[1];
      el.classList.add("pub-leaving");
      el.style.top = (r.top - box.top).toFixed(1) + "px";
      el.style.left = (r.left - box.left).toFixed(1) + "px";
      el.style.width = r.width.toFixed(1) + "px";
      leaving.push(el);
    });
    /* Pinned leavers were measured against the pre-mutation box; correct for any box shift. */
    var box2 = list.getBoundingClientRect();
    if (Math.abs(box2.top - box.top) > 0.5) {
      out.forEach(function (pair) {
        pair[0].style.top = (pair[1].top - box2.top).toFixed(1) + "px";
      });
    }
    out.forEach(function (pair) {
      var el = pair[0];
      tween(el, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.97 }, 0.24, "out", 0, function () {
        finishLeave(el);
        var i = leaving.indexOf(el);
        if (i > -1) leaving.splice(i, 1);
      });
    });

    var n = 0;
    tracked.forEach(function (el) {
      if (!visible(el)) return;
      var r0 = first.get(el);
      if (r0) {
        var r1 = el.getBoundingClientRect();
        var dx = r0.left - r1.left;
        var dy = r0.top - r1.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        var vh = window.innerHeight;
        if (r1.bottom < 0 || r1.top > vh) return; /* lands off-screen: nothing to see */
        if (Math.abs(dy) > vh * 0.75) {
          /* a long jump would read as a swoosh; arrive in place instead */
          tween(el, { opacity: 0, y: 14, scale: 0.985 }, { opacity: 1, y: 0, scale: 1 }, 0.5, "in", 0.14 + Math.min(n++, 8) * 0.035);
          return;
        }
        tween(el, { x: dx, y: dy }, { x: 0, y: 0 }, 0.7, "move", 0);
      } else {
        var rb = el.getBoundingClientRect();
        if (rb.bottom < 0 || rb.top > window.innerHeight) return;
        tween(el, { opacity: 0, y: 14, scale: 0.985 }, { opacity: 1, y: 0, scale: 1 }, 0.5, "in", 0.14 + Math.min(n++, 8) * 0.035);
      }
    });
  }

  /* ---------- sliding active chip ---------- */
  var glider = null;
  function buildGlider() {
    if (!("clipPath" in document.documentElement.style) && !CSS.supports("clip-path", "inset(0)")) return;
    glider = document.createElement("div");
    glider.className = "pub-chip-glider";
    glider.setAttribute("aria-hidden", "true");
    chips.forEach(function (c) {
      var s = document.createElement("span");
      s.className = "pub-chip";
      s.innerHTML = c.innerHTML;
      glider.appendChild(s);
    });
    bar.appendChild(glider);
    bar.classList.add("has-glider");
  }
  function placeGlider(instant) {
    if (!glider) return;
    var active = bar.querySelector('.pub-chip[aria-pressed="true"]');
    if (!active) return;
    var W = bar.clientWidth,
      H = bar.clientHeight;
    var t = active.offsetTop,
      l = active.offsetLeft;
    var r = W - l - active.offsetWidth,
      b = H - t - active.offsetHeight;
    if (instant) glider.classList.add("no-anim");
    glider.style.clipPath = "inset(" + t + "px " + r + "px " + b + "px " + l + "px round 4px)";
    if (instant) {
      void glider.offsetWidth;
      glider.classList.remove("no-anim");
    }
  }

  function apply(topic, speak) {
    flip(function () {
      items.forEach(function (li) {
        li.classList.toggle("topic-off", topic !== "all" && li.getAttribute("data-topic") !== topic);
      });
      regroup();
    });
    chips.forEach(function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-topic") === topic ? "true" : "false");
    });
    placeGlider(false);
    if (speak) announce();
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      if (c.getAttribute("aria-pressed") === "true") return;
      apply(c.getAttribute("data-topic"), true);
    });
  });

  /* ---------- text filter (replaces al-folio's bibsearch.js on this page) ---------- */
  var search = document.getElementById("bibsearch");
  var searchWrap = document.querySelector(".pub-search");
  var texts = items.map(function (li) {
    return li.textContent.replace(/\s+/g, " ").toLowerCase();
  });
  var timer;
  var lastQ = "";
  function filterText() {
    var q = (search.value || "").trim().toLowerCase();
    if (q === lastQ) return;
    lastQ = q;
    flip(function () {
      items.forEach(function (li, i) {
        li.classList.toggle("search-off", q !== "" && texts[i].indexOf(q) === -1);
      });
      regroup();
    });
    announce();
  }
  if (search) {
    search.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(filterText, 200);
    });
    if (searchWrap) searchWrap.hidden = false;
  }

  bar.hidden = false;
  status.hidden = false;
  buildGlider();
  chips.forEach(function (c) {
    c.setAttribute("aria-pressed", c.getAttribute("data-topic") === "all" ? "true" : "false");
  });
  regroup();
  placeGlider(true);
  announce();
  window.addEventListener("resize", function () {
    placeGlider(true);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      placeGlider(true);
    });
  }

  /* ---------- Copy BibTeX ---------- */
  var CHECK =
    '<svg class="pub-copy-check" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>';
  items.forEach(function (li) {
    var panel = li.querySelector(".bibtex.hidden");
    var code = panel && panel.querySelector("code");
    var links = li.querySelector(".links");
    if (!code || !links) return;
    panel.setAttribute("inert", ""); /* closed panel: keep its stray copy button out of the tab order */
    var titleEl = li.querySelector(".title");
    var title = titleEl ? titleEl.textContent.trim() : "";
    var short = title.length > 60 ? title.slice(0, 57).replace(/\s+\S*$/, "") + "…" : title;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm z-depth-0 pub-copy";
    btn.innerHTML =
      '<span class="pub-copy-label">Copy BibTeX</span><span class="pub-copy-done" aria-hidden="true">' +
      CHECK +
      '<span class="pub-copy-msg">Copied</span></span>';
    links.appendChild(btn);
    var msg = btn.querySelector(".pub-copy-msg");
    var reset;

    function done(ok) {
      clearTimeout(reset);
      msg.textContent = ok ? "Copied" : "Selected below";
      btn.classList.toggle("is-fallback", !ok);
      btn.classList.remove("is-copied");
      void btn.offsetWidth; /* restart the check-draw if pressed twice */
      btn.classList.add("is-copied");
      status.textContent = ok ? "BibTeX copied: " + short : "Clipboard unavailable. The BibTeX is shown below the entry and selected.";
      reset = setTimeout(function () {
        btn.classList.remove("is-copied");
      }, 2200);
    }
    function fallback() {
      panel.removeAttribute("inert");
      panel.classList.add("open");
      var r = document.createRange();
      r.selectNodeContents(code);
      var s = window.getSelection();
      s.removeAllRanges();
      s.addRange(r);
      done(false);
    }
    btn.addEventListener("click", function () {
      var text = code.textContent.trim() + "\n";
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(function () {
          done(true);
        }, fallback);
      } else {
        fallback();
      }
    });
  });
})();
