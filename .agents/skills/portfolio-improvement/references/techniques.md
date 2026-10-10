# Techniques proven on this site (v5)

Each line: what it does, where it lives. Reuse before inventing.

## Hero contour field (`assets/js/home.js`, `assets/custom/home.css`)

- Separable Gaussian wells: each well's value is a column factor times a row factor, so filling the grid costs one multiply-add per well per cell.
- Marching squares that tests only the contour levels between a cell's lowest and highest corner.
- Contour levels fixed once per layout, so lines do not jump while the surface breathes.
- Two canvases: contours redraw at about 30 Hz, the descent dot at 60 Hz.
- Gradient descent with momentum, learning-rate decay, a speed cap and a stop rule, on the exact gradient of the wells.
- Lines fade under the text and portrait with soft elliptical erasing; a CSS mask fades the canvas edges.
- Pause with `IntersectionObserver` and `visibilitychange`; device pixel ratio capped at 1.5. Measured: idle 1.2 ms per frame mean, pointer active 2.4 ms (headless software rendering).
- Phones: a few seconds of breathing, then a static field; tap still runs a descent. Reduced motion: one still frame.

## Type and numbers

- Kinetic name: letters split with the browser's own spacing (kerning kept), animated through CSS variables for Fraunces `wght` and `opsz` with GSAP, then swapped back to plain text with no layout shift (`home.js`).
- A small inline guard in the layout hides hero items only on desktop with motion allowed, with a 3 s failsafe (`about.liquid`).
- Odometer digits: a hidden copy of the final digit holds the width while a clipped strip of digits rolls over it; screen readers get the plain number (`home.js`).
- Reserve space for anything that appears later (the descent hint), so it never shifts layout.

## SVG line work

- `pathLength="1"` plus `stroke-dashoffset` to draw any path; avoid `vector-effect: non-scaling-stroke`, which breaks the dashes.
- Pre-computed superellipse contour rings in a static SVG with `preserveAspectRatio="slice"` around the portrait and the contact finale.
- Line icons that redraw on hover with a CSS keyframe, skipped under reduced motion.

## Navigation and transitions (`assets/js/chrome.js`, `assets/custom/chrome.css`, `motion.css`, `header.liquid`)

- One shared nav indicator, rendered in Liquid on the current item (correct without JS), moved with `translateX` and `scaleX` from measured boxes.
- Scroll-progress line driven by a CSS scroll timeline, with a `requestAnimationFrame` fallback.
- Hide-on-scroll with a direction-change threshold, guarded by focus-within and an open phone menu; never near the top or with reduced motion.
- Cross-document view transitions with three named elements (bar, indicator, page title), each with its own timing. Each name must exist at most once per page, or the transition aborts.
- A Navigation API check in an inline script stops the title from being animated twice when it arrives by a transition.

## Publications (`assets/js/pubs.js`, `assets/custom/pubs.css`)

- FLIP filter: kept entries glide, leaving entries are pinned absolutely in place while they fade and shrink, long jumps fade in instead of flying.
- A sliding active chip: a clip-path window of ink over a duplicated light layer, so label colour changes where the ink passes.
- Copy button label swap in a stacked grid so its width never changes; a stroke-dashoffset check mark.
- Closed BibTeX panels are `inert`, which removes hidden buttons from the tab order.

## Leadership and Awards (`assets/js/sections.js`, `assets/custom/sections.css`)

- Sticky deck: `position: sticky` with a per-card `--stick` = min(base + i × 14 px, viewport − card height − 24 px), so a card taller than the screen pins by its bottom edge.
- ScrollTrigger on card i+1 scrubs `scale` on card i and `opacity` on its inner wrapper; covered cards are clipped under the next card's top edge, only while the deck is on screen.
- Milestone dots: `::before` fill scaled 0 → 1, a one-shot `::after` pulse, lit at 60 % of the viewport.
- `data-motion-skip` on a container opts its descendants out of `motion.js` auto-tagging, so only one script animates them.
- Textbook shelf: focusable list items; the detail panel lives in reserved space, and a `:has()` default shows the first book's details without JS.
- Doubled classes (`.x.x`) and `h2[id]` beat the theme's selectors without `!important`.

## Surfaces (`assets/custom/site.scss`)

- Paper grain: sparse-alpha `feTurbulence` as a data-URI on a fixed, composited layer, off in print.
- Three surface kinds instead of one card style: flat cards with hairlines, ruled lists, a 4 px radius on small pieces; no shadows.
- `@font-face` declares the full variable ranges (wght 100–900); bold is held at 600 so nothing gets heavier.
