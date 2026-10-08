/*!
 * motion.js: calm scroll motion for Prof. Vaishali S. Ingale's academic portfolio (AIT Pune)
 *
 * Needs, loaded BEFORE this file (all with `defer`, same order):
 *   lenis.min.js 1.3.26 (MIT) · gsap.min.js 3.15.0 · ScrollTrigger.min.js 3.15.0 · SplitText.min.js 3.15.0
 *   (GSAP Standard License: free incl. commercial use since 3.13; https://gsap.com/community/standard-license/)
 * Plus motion.css and the one-line inline head snippet from MOTION_SPEC.md §2.
 *
 * USAGE: add data attributes in HTML/Markdown. Nothing else to call.
 *   data-reveal="lines"     Hero name/tagline, h2 statement headings, p.lead: lines rise from behind a mask.
 *   data-reveal="fade-up"   Block: fades in while rising 24px; neighbours that enter together stagger.
 *   data-reveal="read"      RESERVE, off by default: words brighten 18% -> 100% as you scroll past.
 *                           Max one paragraph on the whole site, only if the lead approves (TYPE_SPEC wants leads as "lines").
 *   data-reveal="image"     Image/frame: wipes open bottom-to-top, the photo settles from 1.08 to 1.
 *                           Put data-reveal-media on the inner element to clip (e.g. the <img> in a polaroid);
 *                           the outer frame then only fades, so its shadow and tilt never get clipped.
 *   data-count="43"         Number counts up once when seen. Keep the final number as the element's text
 *                           (no-JS fallback). Optional data-suffix="+", data-decimals="1".
 *   data-parallax="40"      Hero wash art / portrait only: drifts 40px against the scroll (desktop only, never text).
 *   data-rail               On a timeline <ul>: a thin cinnamon rail draws down as you scroll.
 *   data-pin-hero           Signature moment (one per site). Children marked data-pin-step crossfade
 *                           one into the next while the hero stays pinned (desktop >= 900px only).
 * Optional per-element tuning: data-delay="0.2", data-start="top 80%" (or "load" to play on page load),
 *   data-distance="24" (fade-up px), data-stagger="0.08", data-duration="1.1",
 *   data-pin-length="100" on [data-pin-hero] (scroll distance per crossfade, % of viewport height).
 * Optional global config BEFORE this file: window.MOTION_CONFIG = { smooth: true, auto: {...}, breakpoint: 900 }
 *   `auto` maps CSS selectors to attributes so existing al-folio markup needs no edits, e.g.
 *   { ".card-soft": { reveal: "fade-up" }, ".post-title": { reveal: "lines" } }.
 *
 * Rules kept here: only transform/opacity (plus a short clip-path wipe on images), every trigger plays
 * once, nothing pins on phones, prefers-reduced-motion = no motion at all, and any error makes all
 * content visible again.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  if (root.hasAttribute("data-motion-init")) return;
  root.setAttribute("data-motion-init", "");

  /* Default auto-tagging follows Role D's TYPE_SPEC §6 (publications, CV, news, body text stay static). */
  var DEFAULT_AUTO = {
    "article h2:not(.bibliography)": { reveal: "lines" },
    "p.lead": { reveal: "lines" },
    ".stat-strip": { reveal: "fade-up" },
    ".wish-card": { reveal: "fade-up", stagger: "0.06" },
    "figure.memory-frame": { reveal: "image" },
    "figure.memory-frame > img": { "reveal-media": "" },
    "ul.timeline-list > li": { reveal: "fade-up" },
    "ul.timeline-list": { rail: "" }
  };
  var user = window.MOTION_CONFIG || {};
  var CFG = {
    smooth: user.smooth !== false,
    auto: user.auto || DEFAULT_AUTO,
    breakpoint: user.breakpoint || 900
  };

  /* power4.out is easeOutQuint = cubic-bezier(0.22, 1, 0.36, 1), the curve in TYPE_SPEC §6 */
  var EASE_OUT = "power4.out";
  var EASE_SOFT = "power4.out";
  var hasSplit = false;

  function all(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function num(v, d) {
    var n = parseFloat(v);
    return isNaN(n) ? d : n;
  }
  function finish(ok) {
    root.classList.remove("motion-pending");
    root.classList.add(ok ? "motion-ready" : "motion-off");
  }

  function autoTag() {
    Object.keys(CFG.auto).forEach(function (sel) {
      var spec = CFG.auto[sel];
      all(sel).forEach(function (el) {
        if (el.closest("[data-motion-skip]")) return;
        Object.keys(spec).forEach(function (k) {
          var attr = "data-" + k;
          if (!el.hasAttribute(attr)) el.setAttribute(attr, spec[k]);
        });
      });
    });
  }

  function trigger(el, fallbackStart) {
    var start = el.getAttribute("data-start") || fallbackStart;
    if (start === "load") return undefined;
    return { trigger: el, start: start, once: true };
  }

  /* Fallback word splitter (only if SplitText is missing): wraps words in text nodes, keeps links. */
  function splitWords(el) {
    var out = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          var s = document.createElement("span");
          s.className = "m-word";
          s.textContent = part;
          frag.appendChild(s);
          out.push(s);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });
    return out;
  }

  /* 1. Signature hero: pinned crossfade between data-pin-step children (desktop) */
  function pinHero(isDesktop) {
    var hero = document.querySelector("[data-pin-hero]");
    if (!hero) return;
    var steps = all("[data-pin-step]", hero);
    if (steps.length < 2) return;
    if (!isDesktop) {
      steps.slice(1).forEach(function (s) {
        if (!s.hasAttribute("data-reveal")) s.setAttribute("data-reveal", "fade-up");
      });
      return;
    }
    root.classList.add("pin-on");
    gsap.set(steps.slice(1), { autoAlpha: 0, y: 48 });
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: "+=" + (steps.length - 1) * num(hero.getAttribute("data-pin-length"), 100) + "%",
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        refreshPriority: 1
      }
    });
    for (var i = 1; i < steps.length; i++) {
      var at = (i - 1) * 1.4;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -48, scale: 0.98, duration: 0.6, ease: "power1.in" }, at + 0.2)
        .to(steps[i], { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, at + 0.5);
    }
    tl.to({}, { duration: 0.4 });
    return function () {
      root.classList.remove("pin-on");
    };
  }

  /* 2. Line-mask rise for headings */
  function lines(el) {
    var dur = num(el.getAttribute("data-duration"), 0.9);
    var stagger = num(el.getAttribute("data-stagger"), 0.08);
    var delay = num(el.getAttribute("data-delay"), 0);
    var st = trigger(el, "top 85%");
    /* Never split headings that contain links, icons or images (QA P1-2): splitting would duplicate the
       anchor and hide it from screen readers. Those get a plain fade-up instead. */
    if (!hasSplit || el.querySelector("a, i, svg, img, button, abbr")) {
      gsap.fromTo(el, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: dur, delay: delay, ease: EASE_SOFT, scrollTrigger: st });
      return;
    }
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "m-line",
      aria: "none", /* text stays in the DOM, so no aria-label is needed (aria-label on <p> is invalid) */
      autoSplit: true,
      onSplit: function (self) {
        gsap.set(el, { autoAlpha: 1 });
        return gsap.fromTo(self.lines,
          { yPercent: 100, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, duration: dur, delay: delay, ease: EASE_OUT, stagger: stagger, scrollTrigger: st });
      }
    });
  }

  /* 3. Fade-up, batched so items entering together stagger */
  function fadeUps(els) {
    if (!els.length) return;
    var loadNow = els.filter(function (el) { return el.getAttribute("data-start") === "load"; });
    var onScroll = els.filter(function (el) { return el.getAttribute("data-start") !== "load"; });
    gsap.set(els, {
      autoAlpha: 0,
      y: function (i, el) { return num(el.getAttribute("data-distance"), 24); }
    });
    if (loadNow.length) {
      gsap.to(loadNow, {
        autoAlpha: 1, y: 0, duration: 0.8, ease: EASE_SOFT, stagger: 0.06, clearProps: "transform",
        delay: function (i, el) { return num(el.getAttribute("data-delay"), 0.3); }
      });
    }
    if (onScroll.length) {
      ScrollTrigger.batch(onScroll, {
        start: "top 88%",
        once: true,
        interval: 0.1,
        batchMax: 6,
        onEnter: function (batch) {
          gsap.to(batch, {
            autoAlpha: 1, y: 0, duration: 0.8, ease: EASE_SOFT, overwrite: true, clearProps: "transform",
            stagger: function (i, el) { return i * num(el.getAttribute("data-stagger"), 0.06); }
          });
        }
      });
    }
  }

  /* 4. Scroll-read highlight: words brighten as the paragraph passes the reading line */
  function read(el, isDesktop) {
    var words = hasSplit ? SplitText.create(el, { type: "words", wordsClass: "m-word" }).words : splitWords(el);
    if (!words.length) return;
    gsap.fromTo(words, { opacity: 0.18 }, {
      opacity: 1,
      ease: "none",
      stagger: 0.1,
      scrollTrigger: {
        trigger: el,
        start: isDesktop ? "top 80%" : "top 90%",
        end: isDesktop ? "clamp(bottom 55%)" : "clamp(bottom 65%)",
        scrub: 0.6
      }
    });
  }

  /* 5. Count-up (target read at enter time, so data-since logic elsewhere can update it first) */
  function count(el) {
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = num(el.getAttribute("data-decimals"), 0);
    var fmt = function (v) {
      return v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    };
    var finalText = el.textContent;
    var o = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: el.getAttribute("data-start") || "top 88%",
      once: true,
      onEnter: function () {
        var target = parseFloat(String(el.getAttribute("data-count")).replace(/[^0-9.]/g, ""));
        if (isNaN(target)) return;
        el.textContent = fmt(0);
        gsap.to(o, {
          v: target,
          duration: num(el.getAttribute("data-duration"), 1.2),
          ease: EASE_OUT,
          onUpdate: function () { el.textContent = fmt(o.v); },
          onComplete: function () { el.textContent = fmt(target); }
        });
      }
    });
    return finalText;
  }

  /* 6. Image reveal: clip-path wipe upward + photo settles */
  function image(el) {
    var media = el.querySelector("[data-reveal-media]");
    var clipEl = media || el;
    var img = clipEl.tagName === "IMG" ? null : clipEl.querySelector("img, picture, video");
    var st = trigger(el, "top 85%");
    var delay = num(el.getAttribute("data-delay"), 0);
    var tl = gsap.timeline({ scrollTrigger: st, delay: delay });
    if (media) {
      tl.fromTo(el, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE_SOFT, clearProps: "transform" }, 0);
    } else {
      gsap.set(el, { autoAlpha: 1 });
    }
    tl.fromTo(clipEl,
      { clipPath: "inset(100% 0% 0% 0%)" },
      { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: EASE_OUT, clearProps: "clipPath" }, media ? 0.1 : 0);
    if (img) tl.fromTo(img, { scale: 1.08 }, { scale: 1, duration: 1.6, ease: EASE_OUT, clearProps: "transform" }, media ? 0.1 : 0);
  }

  /* 7a. Parallax on decorative art (desktop only) */
  function parallax(el) {
    var d = num(el.getAttribute("data-parallax"), 40);
    gsap.fromTo(el, { y: -d / 2 }, {
      y: d / 2,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 }
    });
  }

  /* 7b. Timeline rail draws down as the list scrolls */
  function rail(list) {
    var bar = list.querySelector(":scope > .m-rail");
    if (!bar) {
      bar = document.createElement("span");
      bar.className = "m-rail";
      bar.setAttribute("aria-hidden", "true");
      list.insertBefore(bar, list.firstChild);
    }
    gsap.fromTo(bar, { scaleY: 0 }, {
      scaleY: 1,
      ease: "none",
      scrollTrigger: { trigger: list, start: "top 75%", end: "clamp(bottom 60%)", scrub: 0.6 }
    });
  }

  function staticCounts() {
    all("[data-count]").forEach(function (el) {
      var t = parseFloat(String(el.getAttribute("data-count")).replace(/[^0-9.]/g, ""));
      if (!isNaN(t) && !el.textContent.trim()) el.textContent = t + (el.getAttribute("data-suffix") || "");
    });
  }

  function makeVisible() {
    root.classList.remove("pin-on");
    if (window.gsap) {
      try {
        if (window.ScrollTrigger) ScrollTrigger.getAll().forEach(function (t) { t.kill(true); });
        gsap.set(all("[data-reveal], [data-pin-step], [data-reveal-media], [data-parallax], [data-reveal] *"), { clearProps: "opacity,visibility,transform,clipPath" });
      } catch (e) { /* ignore */ }
    }
    all("[data-reveal], [data-pin-step]").forEach(function (el) {
      el.style.opacity = "";
      el.style.visibility = "";
    });
  }

  function init() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !window.gsap || !window.ScrollTrigger) {
      staticCounts();
      finish(false);
      return;
    }
    try {
      gsap.registerPlugin(ScrollTrigger);
      hasSplit = !!window.SplitText;
      if (hasSplit) gsap.registerPlugin(SplitText);
      autoTag();
      /* Phones/tablets: the hero is static so it paints at first render (QA P1-10, LCP). */
      if (!window.matchMedia("(min-width: " + CFG.breakpoint + "px)").matches) {
        all("[data-hero] [data-reveal]").forEach(function (el) { el.removeAttribute("data-reveal"); });
      }

      if (CFG.smooth && window.Lenis && !window.siteLenis) {
        var lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: { offset: -80 } });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
        window.siteLenis = lenis;
      }

      var bp = CFG.breakpoint;
      var mm = gsap.matchMedia();
      var isDesktopNow = window.matchMedia("(min-width: " + bp + "px)").matches;

      /* Pinning first (top of page), then everything else in document order */
      mm.add({ desktop: "(min-width: " + bp + "px)", mobile: "(max-width: " + (bp - 1) + "px)" }, function (ctx) {
        var undo = pinHero(ctx.conditions.desktop);
        if (ctx.conditions.desktop) all("[data-parallax]").forEach(parallax);
        return undo;
      });

      all('[data-reveal="lines"]').forEach(lines);
      fadeUps(all('[data-reveal="fade-up"]'));
      all('[data-reveal="read"]').forEach(function (el) { read(el, isDesktopNow); });
      all('[data-reveal="image"]').forEach(image);
      all("[data-count]").forEach(count);
      all("[data-rail]").forEach(rail);

      finish(true);
      window.addEventListener("load", function () { ScrollTrigger.refresh(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    } catch (err) {
      if (window.console) console.warn("[motion] disabled:", err);
      makeVisible();
      staticCounts();
      finish(false);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
