# The office: the front door of the portfolio

A calm study you walk into. A short film-like intro walks through the door, looks at the window light, the bookshelf and her framed photo, sits down at the desk, opens the laptop, and the screen becomes a small desktop with folders: About, Research, Publications, Leadership & Service, Awards & Books, Teaching, CV and Contact. Each folder opens a short window. Its heading links to the full page on the main site, and every paper title links to the paper.

Fully static: HTML, CSS and JavaScript only. No backend, no forms, no analytics, no cookies, no external requests (the fonts and libraries are in this folder).

## Where it lives: the site root and /room/

The same folder serves two addresses:

| Address | File | `data-site-base` | `data-room-base` |
|---|---|---|---|
| `…/prof-vaishali-ingale/` (front door) | repo `index.html` = `room/root-index.html` | `./` | `room/` |
| `…/prof-vaishali-ingale/room/` | `room/index.html` | `../` | (empty) |

The two attributes on `<html>` are the only configuration:
- `data-site-base`: where the main-site pages are. Folder links in `js/content.js` are written as `about/`, `publications/` and so on, and this base is put in front of them.
- `data-room-base`: where this folder's own files are (scripts, the 3D library, the portrait).

`room/index.html` is the source. After changing it, run `python3 tools/make_root_index.py` to regenerate `root-index.html`, then copy that file to the repository root as `index.html`. The bio page then lives at `/about/`.

## Who sees what

| Visitor | What happens |
|---|---|
| Laptop or desktop with a normal graphics chip | The intro (about 11 s), then the folder desktop fills the screen. **Stand up** (top left, or Esc) returns to the room: drag to look around, and the mouse adds a gentle parallax. Clicking the laptop sits down again; the photo opens About, the bookshelf Awards & Books, the notebook Teaching |
| Phone (narrow screen) | A shorter intro (about 5.6 s): doorway, pan, photo, laptop, screen fill. Then a full-screen folder grid; **Stand up** shows the room |
| No WebGL, software-only graphics, Data Saver, very low memory, or the room renders below about 24 frames a second | The same folders straight away, without the room |
| Reduced motion turned on | No intro and no camera moves: the desktop appears at once, and Stand up and sitting down are instant cuts |
| JavaScript off | A plain list of links to the main site |

- **Skip to pages** (top right) is always visible and goes to `about/`.
- **Skip intro** (small, bottom centre) is visible for the whole intro. Any click, tap or key during the intro highlights it and moves focus to it, so Enter skips; Esc also skips. Skipping jumps straight to the desk.

Handy addresses:
- `#publications` (or any folder id) opens that folder directly, without the intro
- The intro plays once per browser tab session. After it ends or is skipped, `sessionStorage['vsi-intro']` is set, and later visits in that tab, or arrivals from one of the site's own pages, go straight to the desk (the same path as `#folder` links). A new tab or a new session plays it again.
- During the intro her name stays in the top-left corner, where the desk bar shows it afterwards (the loader's name element, moved there by `main.js`).
- `?2d` always shows the plain folder desktop
- `?3d` forces the 3D room even on slow or software graphics (testing only)

## Changing the text

All words live in **`js/content.js`** (one object, `window.ROOM_CONTENT`). It is generated from the main site's content:

```
python3 tools/build_content.py        # needs Python 3 with PyYAML
```

It reads `../content/_data/room_copy.yml` (folder names, one-line blurbs, the main-site `link` for each folder, and which `sections:` to show with their anchors), the trimmed pages `about.md`, `leadership.md`, `awards.md`, `cv.yml`, `socials.yml` and `_bibliography/papers.bib`. Each window shows a lead of up to about three lines, a few facts and at most four items per section, with a "More" link to the anchor on the full page. Paper titles link to the DOI, else arXiv, else the publisher URL; papers with none stay plain text. The script warns about anchors that do not exist on the pages.

You can also edit `js/content.js` by hand (it is plain JSON-like JavaScript), but the next run of the script overwrites it, so pick one way. A folder looks like this:

```js
{
  "id": "awards",                    // used in links: #awards
  "label": "Awards & Books",         // name under the folder icon and in the window title
  "url": "awards/",                  // "Open the full page" link (site base is added)
  "link": "awards/",                 // the window heading links here
  "blurb": ["One-line summary"],     // tooltip on the folder
  "lead": "Up to three short lines at the top of the window.",
  "facts": [{ "b": "Label", "t": "value" }],
  "sections": [
    { "h": "Patent", "link": "awards/#patent", "p": "A paragraph." },
    { "h": "Textbooks", "kicker": "2008–2022", "items": ["A bullet", { "b": "Bold start", "t": "rest" }], "more": true },
    { "h": "Awards", "timeline": [{ "y": "2020", "t": "Paper Presenter Award, …" }] }
  ]
}
```

Publications use `"pubs": [{ "title", "meta", "year", "href" }]`, grouped by year. Contact uses `"links": [{ "label", "value", "href" }]`.

## Changing the room and the intro

Everything is in `js/scene.js`:
- **Colours:** the `PAL` object at the top.
- **Intro:** `buildIntro()` is one GSAP timeline. Each line is a camera move with its start time and length in seconds (`T` = where the camera looks, `Pp` = where it is). The long version is for laptops, the short one for phones. Easing is `power2.inOut` / `sine.inOut` only.
- **Ambient life:** `ambient()` (dust motes in the window light, a slow light shift, a tiny plant sway).
- **Camera:** `POSES` (`wide` for laptops, `tall` for phones): `door` is where the intro starts, `stand` is where Stand up goes.
- **Clickable objects:** the `pickables` list maps an object to a folder id.

Window typography is at the top of `css/room.css` (`--win-title`, `--win-label`, `--win-body`, `--win-lh`, `--win-pad`). They pick up the site's `--fs-h2`, `--fs-label`, `--fs-body` and `--lh-body` variables if those are defined.

## Testing

```
python3 tools/test_room.py http://127.0.0.1:PORT/prof-vaishali-ingale/room/
```
Needs Playwright for Python with Chromium. Serve a folder where `prof-vaishali-ingale/` holds the built main site with `root-index.html` copied in as `index.html`, and `prof-vaishali-ingale/room/` holds this folder. It covers the intro at 1440 and 390 px, Skip intro (click, Enter, Esc, tap), Stand up, drag, sitting, every folder, heading and paper-title links, that every main-site link resolves, Esc, the back button, reduced motion, the no-WebGL fallback and console errors. Screenshots go to `shots/`.

`shots/` and `tools/` are not needed on the live site and can be left out when copying.
