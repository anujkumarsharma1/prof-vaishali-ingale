/*!
 * sections.js: motion for /leadership/ and /awards/ (plan.md change 8).
 *
 * Loaded with `defer` after gsap, ScrollTrigger and motion.js, on those two pages only.
 * The containers carry data-motion-skip, so motion.js does not auto-tag anything inside them;
 * this file is the only thing that moves them.
 *
 *   1. ICNDIA feature: the contour lines draw once (stroke-dashoffset).
 *   2. Leadership deck (>= 900px only): cards stick near the top; as the next card arrives the
 *      previous one scales back slightly and its content dims (transform + opacity, scrubbed).
 *      A card taller than the viewport pins by its bottom edge so none of it is hidden.
 *   3. Milestones: the rail fill draws with the scroll; each dot fills and pulses once as it
 *      crosses the reading line (60% of the viewport).
 *   4. Awards shelf: spines rise onto the shelf once when it comes into view.
 *
 * Reduced motion, missing GSAP, or any error: nothing runs and the page stays fully static and visible.
 */
(function () {
  "use strict";

  var BP = 900;

  function all(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  function contours() {
    var paths = all(".lx-contours path");
    if (!paths.length) return;
    paths.forEach(function (p, i) {
      var len = p.getTotalLength();
      gsap.fromTo(
        p,
        { strokeDasharray: len, strokeDashoffset: len },
        {
          strokeDashoffset: 0,
          duration: 2.2,
          delay: 0.15 + i * 0.12,
          ease: "power2.inOut",
          onComplete: function () {
            gsap.set(p, { clearProps: "strokeDasharray,strokeDashoffset" });
          },
        }
      );
    });
  }

  function deck(mm) {
    var stack = document.querySelector(".lx-stack");
    if (!stack) return;
    var cards = all(":scope > .lx-card", stack);
    if (cards.length < 2) return;

    mm.add("(min-width: " + BP + "px)", function () {
      var BASE = 96;
      var STEP = 14;
      var GAP = 24;

      function stickTop(i) {
        var h = cards[i].offsetHeight;
        var top = BASE + i * STEP;
        var room = window.innerHeight - h - GAP;
        return Math.min(top, room);
      }
      function setTops() {
        cards.forEach(function (c, i) {
          c.style.setProperty("--stick", stickTop(i) + "px");
        });
      }

      stack.classList.add("is-stacking");
      setTops();
      ScrollTrigger.addEventListener("refreshInit", setTops);

      cards.slice(0, -1).forEach(function (card, i) {
        var next = cards[i + 1];
        var inner = card.querySelector(".lx-card-inner") || card;
        var tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: next,
            /* Begin when the next card reaches the bottom of this pinned card, i.e. when it starts to cover it. */
            start: function () {
              return "top " + Math.min(window.innerHeight, stickTop(i) + card.offsetHeight) + "px";
            },
            end: function () {
              return "top " + stickTop(i + 1) + "px";
            },
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });
        tl.to(card, { scale: 0.95 }, 0).to(inner, { opacity: 0.8 }, 0);
      });

      /* Cards differ in height. Once the next card slides over, clip the covered card just below the
         next card's top edge, so a taller card never shows out from under a shorter one. The clipped
         part is hidden by the next card anyway, so the clip itself is never seen. */
      function clipCovered() {
        for (var i = 0; i < cards.length - 1; i++) {
          var r = cards[i].getBoundingClientRect();
          var n = cards[i + 1].getBoundingClientRect();
          var scale = r.width / cards[i].offsetWidth || 1;
          var hidden = (r.bottom - (n.top + 40)) / scale;
          cards[i].style.clipPath = hidden > 0 ? "inset(0 0 " + hidden.toFixed(1) + "px 0 round 6px)" : "";
        }
      }
      ScrollTrigger.create({
        trigger: stack,
        start: "top bottom",
        end: "bottom top",
        onRefresh: clipCovered,
        /* run every frame only while the deck is on screen (the scrubbed scale lags the scroll) */
        onToggle: function (self) {
          gsap.ticker.remove(clipCovered);
          if (self.isActive) gsap.ticker.add(clipCovered);
          clipCovered();
        },
      });

      return function () {
        gsap.ticker.remove(clipCovered);
        ScrollTrigger.removeEventListener("refreshInit", setTops);
        stack.classList.remove("is-stacking");
        cards.forEach(function (c) {
          c.style.removeProperty("--stick");
          c.style.clipPath = "";
          gsap.set([c, c.querySelector(".lx-card-inner")], { clearProps: "transform,opacity" });
        });
      };
    });
  }

  function milestones() {
    var ms = document.querySelector(".ms");
    if (!ms) return;
    var track = ms.querySelector(".ms-track");
    var fill = ms.querySelector(".ms-rail-fill");
    var items = all(".ms-item", ms);
    ms.classList.add("is-live");
    if (fill && track) {
      gsap.fromTo(
        fill,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: { trigger: track, start: "top 60%", end: "bottom 60%", scrub: 0.5 },
        }
      );
    }
    items.forEach(function (item) {
      var dot = item.querySelector(".ms-dot") || item;
      ScrollTrigger.create({
        trigger: dot,
        start: "center 60%",
        onEnter: function () {
          item.classList.add("is-lit");
        },
        onLeaveBack: function () {
          item.classList.remove("is-lit");
        },
      });
    });
  }

  function shelf() {
    var spines = all(".shelf .spine");
    if (!spines.length) return;
    gsap.fromTo(
      spines,
      { yPercent: 18, autoAlpha: 0 },
      {
        yPercent: 0,
        autoAlpha: 1,
        duration: 0.9,
        ease: "power4.out",
        stagger: 0.07,
        clearProps: "transform,opacity,visibility",
        scrollTrigger: { trigger: ".shelf", start: "top 85%", once: true },
      }
    );
  }

  function init() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    try {
      gsap.registerPlugin(ScrollTrigger);
      var mm = gsap.matchMedia();
      contours();
      deck(mm);
      milestones();
      shelf();
      window.addEventListener("load", function () {
        ScrollTrigger.refresh();
      });
    } catch (err) {
      if (window.console) console.warn("[sections] motion disabled:", err);
      all(".is-stacking").forEach(function (el) {
        el.classList.remove("is-stacking");
      });
      all(".ms.is-live").forEach(function (el) {
        el.classList.remove("is-live");
      });
      if (window.gsap) gsap.set(all(".lx-card, .lx-card-inner, .spine, .ms-rail-fill, .lx-contours path"), { clearProps: "all" });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
