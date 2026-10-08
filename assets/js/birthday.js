/*!
 * birthday.js: site glue + interim motion for Prof. Vaishali S. Ingale's site.
 *  1. Tags content with data attributes (data-reveal="lines" | "fade-up", data-count, data-pin-hero, data-parallax)
 *     so Markdown files stay clean.
 *  2. Keeps "years at AIT" current (data-since).
 *  3. Runs the motion for those attributes with Lenis + GSAP ScrollTrigger + SplitText,
 *     unless a dedicated motion.js has already claimed them (window.SiteMotion).
 * Vendored: Lenis 1.3.26 (MIT) · GSAP 3.15.0 + ScrollTrigger + SplitText (GSAP Standard "no charge" licence).
 * Calm by design: expo/power3 out, 0.8–1.1 s, once, no loops, no tilt. Reduced motion = static page.
 */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = "expo.out";
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function quiet(el) { return el.closest(".publications, .news, .cv, #cv, .bibliography, [data-hero]"); }

  /* 1. Tagging (TYPE_SPEC §6 placements) */
  function tag() {
    all("article h2, .post-header .post-title, .section-title, .lead").forEach(function (el) {
      if (!el.hasAttribute("data-reveal") && !quiet(el)) el.setAttribute("data-reveal", "lines");
    });
    all(".stat-strip, .wish-card, figure.memory-frame, .milestone").forEach(function (el) {
      if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "fade-up");
    });
    all(".stat-number").forEach(function (el) {
      if (!el.querySelector("[data-count]") && !el.hasAttribute("data-count")) {
        var m = el.textContent.trim().match(/^([0-9][0-9,]*)(.*)$/);
        if (m) el.innerHTML = '<span data-count="' + m[1].replace(/,/g, "") + '">' + m[1] + "</span>" +
          (m[2] ? '<span class="stat-suffix">' + m[2] + "</span>" : "");
      }
    });
    var pic = document.querySelector(".hero-portrait");
    if (pic && !pic.hasAttribute("data-parallax")) pic.setAttribute("data-parallax", "0.08");
  }

  /* 2. Whole years since a date */
  function since() {
    all("[data-since]").forEach(function (el) {
      var p = el.getAttribute("data-since").split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]), n = new Date();
      var y = n.getFullYear() - d.getFullYear();
      if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) y--;
      if (y > 0) { el.setAttribute("data-count", y); el.textContent = y; }
    });
  }

  function nav() {
    var n = document.getElementById("navbar");
    if (!n) return;
    var u = function () { n.classList.toggle("is-scrolled", (window.scrollY || 0) > 8); };
    u(); window.addEventListener("scroll", u, { passive: true });
  }

  /* 3. Motion */
  function motion() {
    if (reduce || window.SiteMotion || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    var split = !!window.SplitText;
    if (split) gsap.registerPlugin(SplitText);
    document.documentElement.classList.add("js-motion");

    if (window.Lenis) {
      var lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: { offset: -80 } });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    function lines(el, trigger) {
      var vars = { yPercent: 100, opacity: 0, duration: 0.9, ease: EASE, stagger: 0.08 };
      if (trigger) vars.scrollTrigger = { trigger: el, start: "top 85%", once: true };
      else vars.delay = 0.15;
      if (!split) return gsap.from(el, Object.assign({}, vars, { yPercent: 0, y: 24 }));
      SplitText.create(el, { type: "lines", mask: "lines", linesClass: "split-line", autoSplit: true,
        onSplit: function (self) { return gsap.from(self.lines, vars); } });
    }

    // Hero: on load
    var hero = document.querySelector("[data-hero]");
    if (hero) {
      all('[data-reveal="lines"]', hero).forEach(function (el) { lines(el, false); });
      var rest = all("[data-hero-item]:not([data-reveal])", hero);
      if (rest.length) gsap.from(rest, { opacity: 0, y: 16, duration: 0.9, ease: "power3.out", stagger: 0.06, delay: 0.5 });
      var img = hero.querySelector(".portrait-frame img");
      if (img) gsap.from(img, { scale: 1.05, opacity: 0, duration: 1.2, ease: "power3.out", delay: 0.2 });
    }
    // Everything else: on scroll
    all('[data-reveal="lines"]').forEach(function (el) { if (!el.closest("[data-hero]")) lines(el, true); });
    var ups = all('[data-reveal="fade-up"]');
    gsap.set(ups, { opacity: 0, y: 24 });
    ScrollTrigger.batch(ups, { start: "top 88%", once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.06, overwrite: true, clearProps: "transform" }); } });
    all('[data-reveal="fade-up"] img, .publications .preview').forEach(function (im) {
      if (quiet(im) && !im.classList.contains("preview")) return;
      gsap.from(im, { scale: 1.05, duration: 1.2, ease: "power3.out", scrollTrigger: { trigger: im, start: "top 90%", once: true } });
    });
    // Portrait parallax (<= 8%)
    all("[data-parallax]").forEach(function (el) {
      var f = Math.min(parseFloat(el.getAttribute("data-parallax")) || 0.08, 0.08);
      gsap.to(el, { yPercent: -f * 100, ease: "none", scrollTrigger: { trigger: el, start: "top top+=80", end: "bottom top", scrub: true } });
    });
    // Hero → bio: brief pin with a gentle crossfade (desktop only)
    var pin = document.querySelector("[data-pin-hero]");
    if (pin) gsap.matchMedia().add("(min-width: 900px) and (min-height: 640px)", function () {
      gsap.timeline({ scrollTrigger: { trigger: pin, start: "top top+=64", end: "+=35%", scrub: 0.6, pin: true } })
        .to(pin.querySelector(".hero-text"), { opacity: 0, y: -32, ease: "none" }, 0)
        .to(pin.querySelector(".hero-portrait"), { opacity: 0, ease: "none" }, 0.1);
    });
    // Milestones rail
    var list = document.querySelector(".milestones-list");
    if (list) {
      var bar = document.createElement("span"); bar.className = "timeline-progress"; bar.setAttribute("aria-hidden", "true");
      list.insertBefore(bar, list.firstChild);
      gsap.to(bar, { scaleY: 1, ease: "none", scrollTrigger: { trigger: list, start: "top 75%", end: "bottom 75%", scrub: 0.6 } });
    }
    // Counters: count up once
    all("[data-count]").forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-count")); if (isNaN(to)) return;
      var o = { v: 0 }; el.textContent = "0";
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: function () {
        gsap.to(o, { v: to, duration: 1.2, ease: "power2.out", onUpdate: function () { el.textContent = Math.round(o.v).toLocaleString("en-US"); } });
      } });
    });
    window.addEventListener("load", function () { ScrollTrigger.refresh(); });
  }

  function init() {
    tag(); since(); nav();
    try { motion(); } catch (e) {
      document.documentElement.classList.remove("js-motion");
      if (window.gsap) gsap.set(all("[data-reveal], [data-reveal] *"), { clearProps: "all" });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
