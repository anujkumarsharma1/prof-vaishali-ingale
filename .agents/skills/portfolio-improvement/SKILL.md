---
name: portfolio-improvement
description: Redesign or upgrade this academic portfolio (Jekyll + al-folio v1) so it looks distinctive and reads professionally, using parallel agents with strict file ownership. Use when asked to make the site look better, add motion or interaction, remove "AI slop" from the copy, or run another design pass. Covers diagnosis, concept, plan.md, the agent split, briefs, the watchdog, integration checks, review and the motion techniques already proven on this site.
---

# Portfolio improvement

This is the process behind v5 ("loss landscape", October 2026): the hero contour field, kinetic name, odometer ledger, Leadership card deck, textbook shelf, publications FLIP filter, nav indicator and view transitions, plus a site-wide copy pass. Run it again for the next design pass. Where it says "this repo", it means `anujkumarsharma1/prof-vaishali-ingale`.

Before anything else, read `AGENTS.md`, `plan.md` (the last pass's plan) and `tools/portfolio/AGENT_RULES.md`.

## 1. Diagnose before designing

Build, serve and screenshot the current site first (section 4). Look at the shots and list what reads as generated. The tells, from Anthropic's `frontend-design` skill and Leonxlnx/taste-skill (MIT):

- A cream page, high-contrast serif and terracotta accent: the most common AI default. This site has it. v5 kept the palette because the watercolour art, the 3D room, the OG image and the PDF depend on it, and fixed everything around it instead.
- Tracked ALL-CAPS labels above headings.
- Meta strings joined with middle dots ("A · B · C").
- "→" glued onto every link.
- One radius and one shadow on every box; identical card stacks.
- A fade-up entrance on every section; hover lifts on every card.
- 01/02/03 markers on things that are not sequences.
- In the copy: the headline repeated straight underneath it, the same figure in three places, audit-trail wording ("Listed as staff in-charge on AIT's clubs page"), visible "Source:" lines.

Say what is generic plainly. Agreeing that a template is "clean" helps nobody.

## 2. One concept, grounded in the subject

Pick one idea from the subject's own world and let it carry the site. v5: she works in machine learning and the intro game rolls a ball down a loss surface, so the 2D site uses topographic contour lines, and gradient descent is the main interaction. Spend boldness in one place, the hero. Everything else is motion that answers what the visitor does: hover, filter, open, navigate.

Ask of every idea: would this exist on any other portfolio? If yes, it is decoration. Cut it.

## 3. Write plan.md first

Sections, in this order: where the site stands (checked facts, not assumptions); an honest diagnosis; the concept and tokens; rules every agent follows; the numbered changes, each with an owner and files; the copy pass; agents and phases; acceptance checks; what needs a person; status. Commit it before any agent starts. Keep `plan.md` and `tools/` in the `_config.yml` `exclude` list.

## 4. Harness (already in `tools/portfolio/`)

```bash
DEST=/tmp/x/site tools/portfolio/build.sh                    # production build; fails if any page is missing
DEST=/tmp/x/site PORT=4101 tools/portfolio/serve.sh &         # serves at /prof-vaishali-ingale/ like GitHub Pages
node tools/portfolio/shots.mjs /tmp/x/shots http://127.0.0.1:4101/prof-vaishali-ingale [pages...]
python3 tools/portfolio/watch.py                               # agent watchdog (section 6)
```

Container quirks these scripts already handle: the locale is US-ASCII (`al_folio_core` crashes without `LC_ALL=C.UTF-8`); `bundle exec jekyll` fails on a Bundler shim mismatch, so `build.sh` calls the jekyll gem's own executable; Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, and `net::ERR_TUNNEL_CONNECTION_FAILED` lines are blocked CDNs, not bugs. A front-matter typo makes Jekyll silently drop a page and still exit 0, which is why `build.sh` checks every page landed.

Before any agent starts, take baselines: screenshots, a copy of the built site, a per-page list of every visible number, and sha256 hashes of `room/` and the root `index.html`.

## 5. Split the work by file, not by idea

Parallel agents share one working tree, so ownership must be by file and must not overlap. v5's split worked:

| Agent         | Owns                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| Editor        | prose in pages nobody else owns, `_news/`, `_data/cv.yml`, `_data/timeline.yml`, labels  |
| Chrome + pubs | `header.liquid`, `site.scss`, `motion.css`, `chrome.css/js`, `bib.liquid`, `pubs.css/js` |
| Home          | `about.liquid`, `about.md` (copy too), `home.css/js`                                     |
| Sections      | `leadership.md`, `awards.md` (copy too), `milestones.liquid`, `sections.css/js`          |
| Lead (you)    | `head.liquid` wiring, `plan.md`, `tools/`, integration, commits                          |

Rules that saved time:

- The lead creates every new CSS/JS file empty and wires it into `_includes/head.liquid` before agents start, so no agent needs the shared head.
- An agent that restructures a page also owns that page's copy. Otherwise the copy pass and the markup pass collide on the same file.
- Agents never run state-changing git. The lead commits each agent's files separately.
- Each agent has its own `DEST` and `PORT`.
- Four agents plus the Editor reused as Reviewer (through SendMessage) was enough. Spawn more only for independent files.

Each brief: a pointer to `AGENT_RULES.md` and `plan.md`, the exact files owned and not owned, scratch dir, DEST and PORT, the changes with concrete specs, the verification required (at least three screenshot rounds, Playwright interaction frames, reduced-motion pass, keyboard pass, number check), and the report format, including "list the techniques you used", which feeds this skill.

## 6. Watch the agents

Agents can drift into work nobody asked for, or invent a figure. Check the files, not the reports.

- `python3 tools/portfolio/watch.py` flags any change outside an agent's files and any number in new content that is absent from the baseline. Update its `OWNERS` map for each new pass.
- Watch added-line counts. A big number is fine only if it maps to the changes asked for: open the file and check its sections.
- Pass findings between agents yourself (SendMessage to the owner); never let one agent fix another's file.
- When an agent reports, re-run the number check yourself. "Every number kept" is a claim to verify.

## 7. Integrate one agent at a time

For each finished agent:

1. Run the watchdog.
2. Build that agent's files on top of what is already committed, in a clean worktree, without the other agents' unfinished files: `git worktree add --detach <dir> HEAD`, copy the files in, `DEST=<dir>/_site tools/portfolio/build.sh`.
3. Screenshot every page of that build: global CSS from one agent lands on another's pages.
4. Look at the shots, then commit only that agent's files and push.

Never commit an agent's files while it is still editing them. If the branch's PR was merged mid-pass, fast-forward the branch to `main` (the trees match) before the next push.

## 8. Review, then fix

Reuse the Editor as a read-only Reviewer: every page at 1440 and 390 px, the key interactions, reduced motion, keyboard, console errors, horizontal scroll, CLS, the number diff, a final copy read, and the room hashes. Findings ranked BLOCKER, MAJOR, MINOR, each with evidence and the responsible file. The lead fixes, rebuilds and re-checks.

## What the v5 review caught that the agents missed

Each agent checked its own pages and still shipped these. Check for them directly next time:

- **Layout shift from JS-only controls.** `pubs.js` revealed hidden filter chips after first paint, and the first heading's margin collapsed through `<article>` meanwhile: CLS 0.139 on phones. Fix: the head guard sets `<html class="has-js">`, and JS-only controls hold their space with `visibility: hidden` until revealed. Measure CLS by landing directly on every inner page, not only the home page, and find the culprit with layout-shift `sources`.
- **Motion that hurts reading.** The card deck dimmed a card to 35 % while it was still the one being read. Scrubbed effects must start only when the next element actually covers the current one.
- **Display-size glyphs.** At opsz 144, Fraunces draws "+" as a hairline. Pin suffixes and symbols to a text optical size.
- **One agent's markup, another agent's chrome.** The home page had no brand in the nav, and the nav was translucent enough for sticky labels to show through. Review the integrated build, not each agent's own build.
- **Copy across owners.** "Faculty In-Charge" in three spellings, kickers repeating the lead under them, page titles repeated as the first heading. One editor has to read every page at the end.
- **Number checks and punctuation.** "2025." versus "2025" shows up as a false "missing number". Strip trailing punctuation before comparing.

## Constraints specific to this repo

- `baseurl` is `/prof-vaishali-ingale`; never blank it.
- PurgeCSS rewrites only `_site/assets/css/*.css`. Put new styles in `assets/custom/`, which it never touches, so classes added only by JS survive.
- `room/` and the root `index.html` are generated by `make_root_index.py` and `build_content.py`, which are not in this repo. Leave them alone; `_data/room_copy.yml` feeds `room/js/content.js` only through that generator.
- Every figure on the site was verified against sources outside the repo. Never change a fact. Move provenance into comments instead of deleting it.
- The deploy workflow runs on PRs into `main` as a build check; merging to `main` deploys live.
- The repo already fails Prettier on 19 files and has no Prettier CI. New files must pass; do not mass-reformat old ones.

## References

- `references/techniques.md`: motion and layout techniques already proven here, with the files they live in.
- `references/copy.md`: the slop patterns found in v5 and how each was fixed.
- `tools/portfolio/AGENT_RULES.md`: binding rules for every agent.
