/*!
 * chrome.js: v5 navigation layer (plan.md changes 6 and 7). Pairs with assets/custom/chrome.css.
 *  - glide(): one cinnamon hairline (.nav-mark, rendered by _includes/header.liquid under the current
 *    item) travels to the hovered or focused item and settles back on the current one. It moves with
 *    transform only (translateX + scaleX), so nothing reflows. Pages with no current item get a ghost
 *    mark that fades in where the pointer is.
 *  - progress(): the 2px hairline on the bar's bottom edge. A CSS scroll timeline drives it where
 *    supported; otherwise this file does, once per animation frame.
 *  - tuck(): the bar slides away while you scroll down and returns as soon as you scroll up. It never
 *    hides near the top, while focus is inside it, or while the phone menu is open.
 * The view-transition title handoff (html.vt-in) is an inline script in _includes/header.liquid, because
 * it has to run before the deferred motion.js.
 * site.js still toggles #navbar.is-scrolled. Reduced motion: no glide animation, no tucking, no progress.
 */
(function () {
  "use strict";

  var nav = document.getElementById("navbar");
  if (!nav) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. gliding mark ---------- */
  function glide() {
    var list = nav.querySelector(".navbar-nav");
    if (!list) return;
    var links = Array.prototype.slice.call(list.querySelectorAll(":scope > .nav-item > .nav-link"));
    if (!links.length) return;

    var mark = list.querySelector(".nav-mark");
    var ghost = false;
    if (!mark) {
      mark = document.createElement("span");
      mark.className = "nav-mark is-ghost";
      mark.setAttribute("aria-hidden", "true");
      links[0].appendChild(mark);
      ghost = true;
    }
    var home = mark.parentElement; /* the link that owns the mark */
    var marked = null;

    function padding(el) {
      var cs = window.getComputedStyle(el);
      return { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0 };
    }

    function moveTo(link, instant) {
      if (marked && marked !== link) marked.classList.remove("is-marked");
      marked = link;
      if (!link || link === home) {
        nav.classList.remove("mark-away");
        if (link) link.classList.remove("is-marked");
        mark.style.transform = "";
        if (ghost) mark.classList.toggle("is-on", !!link);
        return;
      }
      /* Base box of the mark, ignoring its current transform. */
      var hr = home.getBoundingClientRect();
      var baseLeft = hr.left + mark.offsetLeft;
      var baseWidth = mark.offsetWidth || 1;
      var tr = link.getBoundingClientRect();
      var p = padding(link);
      var dx = tr.left + p.l - baseLeft;
      var sx = Math.max(tr.width - p.l - p.r, 4) / baseWidth;
      var dy = tr.top - hr.top; /* vertical menus (phones) */
      if (ghost && !mark.classList.contains("is-on")) instant = true;
      if (instant || reduce) mark.classList.add("no-anim");
      mark.style.transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px) scaleX(" + sx.toFixed(4) + ")";
      if (instant || reduce) {
        void mark.offsetWidth;
        mark.classList.remove("no-anim");
      }
      if (ghost) mark.classList.add("is-on");
      nav.classList.add("mark-away");
      link.classList.add("is-marked");
    }

    var hoverable = window.matchMedia("(hover: hover) and (pointer: fine)");
    var leaveTimer;
    links.forEach(function (link) {
      link.addEventListener("pointerenter", function () {
        if (!hoverable.matches) return;
        clearTimeout(leaveTimer);
        moveTo(link);
      });
      link.addEventListener("focus", function () {
        clearTimeout(leaveTimer);
        moveTo(link);
      });
      link.addEventListener("blur", function () {
        leaveTimer = setTimeout(function () {
          if (!list.contains(document.activeElement)) moveTo(null);
        }, 60);
      });
    });
    list.addEventListener("pointerleave", function () {
      if (list.contains(document.activeElement) && document.activeElement !== document.body) {
        var a = document.activeElement.closest(".nav-link");
        if (a && a.matches(":focus-visible")) return moveTo(a);
      }
      leaveTimer = setTimeout(function () {
        moveTo(null);
      }, 90);
    });
    window.addEventListener("resize", function () {
      if (marked && marked !== home) moveTo(marked, true);
    });
    /* A click starts navigation: keep the mark where it is so the view transition carries it over. */
  }

  /* ---------- 2 + 3. progress hairline and tuck-away bar ---------- */
  function scrollChrome() {
    var bar = nav.querySelector(".nav-progress");
    var cssTimeline = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
    if (bar && !cssTimeline && !reduce) bar.classList.add("js-driven");
    var panel = document.getElementById("navbarNav");
    var lastY = window.scrollY || 0;
    var acc = 0;
    var ticking = false;

    function maxScroll() {
      return Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    }
    function sizeCheck() {
      nav.classList.toggle("no-progress", maxScroll() < 240);
    }

    function canHide() {
      if (reduce) return false;
      if (panel && panel.classList.contains("show")) return false;
      if (nav.matches(":focus-within")) return false;
      return true;
    }

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      if (bar && bar.classList.contains("js-driven")) {
        var m = maxScroll();
        bar.style.transform = "scaleX(" + (m ? Math.min(y / m, 1) : 0).toFixed(4) + ")";
      }
      var dy = y - lastY;
      lastY = y;
      if ((dy > 0 && acc < 0) || (dy < 0 && acc > 0)) acc = 0;
      acc += dy;
      if (y < nav.offsetHeight * 2) {
        nav.classList.remove("is-tucked");
      } else if (acc > 12 && canHide()) {
        nav.classList.add("is-tucked");
      } else if (acc < -8) {
        nav.classList.remove("is-tucked");
      }
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    nav.addEventListener("focusin", function () {
      nav.classList.remove("is-tucked");
    });
    /* Keyboard users jumping into the page from the top still get the bar back with Shift+Tab. */
    window.addEventListener("resize", sizeCheck);
    window.addEventListener("load", sizeCheck);
    sizeCheck();
    update();
  }

  function init() {
    glide();
    scrollChrome();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
