/*!
 * site.js: small site glue for Prof. Vaishali S. Ingale's portfolio. All scroll motion lives in motion.js.
 *  - navState(): the translucent navbar gets a hairline once the page scrolls.
 *  - refreshSince(): "Years at AIT" (data-since="YYYY-MM-DD" from _data/stats.yml) is recomputed in the
 *    browser, so the number stays right without a rebuild. Runs before motion.js reads data-count.
 */
(function () {
  "use strict";
  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function navState() {
    var nav = document.getElementById("navbar");
    if (!nav) return;
    var update = function () { nav.classList.toggle("is-scrolled", (window.scrollY || window.pageYOffset || 0) > 8); };
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  function refreshSince() {
    all("[data-since]").forEach(function (el) {
      var p = (el.getAttribute("data-since") || "").split("-");
      if (p.length < 3) return;
      var since = new Date(+p[0], +p[1] - 1, +p[2]), now = new Date();
      var years = now.getFullYear() - since.getFullYear();
      if (now.getMonth() < since.getMonth() || (now.getMonth() === since.getMonth() && now.getDate() < since.getDate())) years--;
      if (years > 0) { el.setAttribute("data-count", String(years)); el.textContent = String(years); }
    });
  }

  function init() { navState(); refreshSince(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
