# Rules for every agent working on this portfolio

Read `plan.md` (sections 1–3 and your own section) before touching anything.

## Ownership and git

- Edit only the files your brief says you own. If you need a change elsewhere, write it in your final report; the lead applies it.
- Do not run git commands that change state (`add`, `commit`, `checkout`, `stash`, `reset`, `restore`). Read-only git (`diff`, `log`, `show`) is fine.
- Do not create `_sass/`, `_scripts/`, `assets/tailwind/` or `tailwind.config.js`. Do not touch `room/` or the root `index.html`.
- New files must pass `npx prettier --check <file>`. Do not reformat existing files wholesale; keep diffs to what you changed.

## Build, serve, look

Each agent has its own build directory and port so parallel builds never collide.

```bash
DEST=<your build dir> tools/portfolio/build.sh                 # about 10–25 s
DEST=<your build dir> PORT=<your port> tools/portfolio/serve.sh   # run in the background once; it serves the latest build
node tools/portfolio/shots.mjs <out dir> http://127.0.0.1:<port>/prof-vaishali-ingale [about/ leadership/ ...]
```

- `shots.mjs` saves full-page and above-the-fold PNGs at 1440 px and 390 px, plus `errors.txt`. `net::ERR_TUNNEL_CONNECTION_FAILED` lines are blocked external CDNs; ignore them. Any other error is yours to fix.
- For custom checks, write Playwright scripts in your scratch directory: `import { chromium } from "/home/user/prof-vaishali-ingale/node_modules/playwright/index.mjs"` and launch with `executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"`. Use `page.emulateMedia({ reducedMotion: "reduce" })` for the reduced-motion pass.
- Baseline screenshots from before any v5 work: `<scratchpad>/before/`. Baseline build: `<scratchpad>/before_site/`.
- **Look at your screenshots** (Read the PNG) and judge them as a demanding designer would. Iterate until they are good. A change you have not seen rendered is not done.

## Facts

- Never change a number, date, name, title, venue, award or other fact. Every figure was verified against sources that are not in this repo, so you cannot re-check them, only preserve them.
- Do not invent content: no new achievements, quotes, testimonials, photos or claims.

## Design and motion

- Concept: the loss landscape (plan.md §2). Palette unchanged: paper `#fbf4ec`, ink `#1f1712`, cinnamon `#a04a0d` (the single accent), contour lines `#a67c52` at 14–35 % opacity (never text), ink-soft `#5e4b3f`. Fonts: Fraunces (opsz 9–144, wght 100–900; `@font-face` in `site.scss` currently declares `300 500`) and Inter.
- Banned AI tells: tracked ALL-CAPS labels; meta strings joined with middle dots; "→" glued onto every link; one radius and one shadow on every box; identical card stacks; fade-up on every section; numbered 01/02/03 markers on things that are not sequences; gradient blobs; glassmorphism; neon; custom cursors.
- Animate only `transform`, `opacity`, `clip-path`, `stroke-dashoffset` and font-variation axes. CLS must stay 0.
- `prefers-reduced-motion: reduce` gets a fully static, fully visible page. Check it.
- Below 900 px: no pinning, no sticky stacks, no endless animation loops.
- Pause canvases and loops when off-screen (`IntersectionObserver`) or the tab is hidden. Cap device pixel ratio at 1.5.
- Text must never wait for JS to be visible. Without JS the page must still read correctly.
- No new CDN dependencies. Vendored on every page: Lenis, `gsap`, `ScrollTrigger`, `SplitText` (all `defer`; wait for `DOMContentLoaded` and check `window.gsap` exists). Existing scroll motion lives in `assets/js/motion.js` (data-reveal, data-count, etc.); read its header so you don't animate the same element twice.
- Keyboard: every interactive element reachable by Tab, with a visible focus ring. Touch targets at least 44 px.
- No horizontal scroll at 390 px.

## Copy rules (Editor, and anyone writing words)

- Plain, specific, professional third person. Say each thing once, in the place it belongs.
- Cut: throat-clearing ("much of it", "also listed as"), restating what a heading already says, stacked qualifiers, audit-log "Source:" notes in the visible text (keep sources only where a reader needs them, e.g. a figure credit or licence), filler adjectives, em-dash asides, rhetorical triplets.
- Prefer commas or line breaks over middle-dot chains. Sentence case for headings and labels.
- Keep every fact and figure exactly. If a sentence can't be shortened without losing a fact, keep the fact.

## Working alongside other agents

- Other agents edit other files at the same time. A build can pick up their half-finished work: if a page you don't own looks broken, ignore it; judge only your own pages.
- Never "fix" a file you don't own, even a one-line fix. Report it.
- If a global change by someone else (for example card or label styles in `site.scss`) clashes with your page, scope your override under your page's wrapper class instead of fighting the global rule.

## Definition of done

A change is done only when all of these hold:

1. The build passes and the changed pages render without page errors (CDN tunnel errors excepted).
2. You have looked at desktop (1440 px) and phone (390 px) screenshots and would show them to the owner.
3. The reduced-motion pass shows everything visible and static.
4. Keyboard focus reaches every new control, with a visible ring.
5. No horizontal scroll at 390 px.
6. Every number from the baseline is still on the page, or its move is justified in your report.
7. New files pass Prettier.

## Final report (under 400 words)

Files changed; what you did for each change; how you verified it (screenshot paths); known issues; requests for files you do not own.
