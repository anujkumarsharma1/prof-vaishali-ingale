# The office: an interactive way into the portfolio

A calm study you walk into. Click the laptop (or the bookshelf, the photo or the notebook) and you sit down at a small desktop with folders: About, Research, Publications, Leadership & Service, Awards & Books, Teaching, CV and Contact. Each folder opens a short window with a link to the full page on the main site.

Fully static: HTML, CSS and JavaScript only. No backend, no forms, no analytics, no cookies, no external requests (the fonts and libraries are in this folder).

Lives at `https://anujkumarsharma1.github.io/prof-vaishali-ingale/room/`. All paths are relative, so the folder works under any address.

## Who sees what

| Visitor | What happens |
|---|---|
| Laptop or desktop with a normal graphics chip | Short walk-in (3.4 s), then the room. Moving the mouse gently shifts the view. Clicking the laptop sits down; **Back to the office** (top left) or Esc stands up |
| Phone (narrow screen) | Short walk-in (about 3 s) that ends by moving into the laptop screen, then a full-screen folder grid. **Back to the office** shows the room again |
| No WebGL, software-only graphics, Data Saver, very low memory, or the room renders below about 16 frames a second | The same folders straight away, without the room |
| Reduced motion turned on | No camera movement, no fades; every change is an instant cut |
| JavaScript off | A plain list of links to the main site |

**Skip to portfolio** (top right) is always visible and goes to the main site. Tapping or pressing Enter during the walk-in skips it.

Handy addresses:
- `room/#publications` (or any folder id) opens that folder directly
- `room/?2d` always shows the plain folder desktop
- `room/?3d` forces the 3D room even on slow or software graphics (testing only)

## Changing the text

All words live in **`js/content.js`**. It is plain JavaScript holding one object, `window.ROOM_CONTENT`. Edit it in any text editor or on github.com (pencil icon), commit, and the site updates in about a minute.

Each folder looks like this (every part except `id`, `label` and `url` is optional):

```js
{
  "id": "awards",                 // used in links: room/#awards
  "label": "Awards & Books",      // name under the folder icon and in the window title
  "url": "../awards/",            // "Open the full page" link; ../ means the main site
  "blurb": ["One-line summary"],  // shown as a tooltip on the folder
  "lead": "One or two sentences at the top of the window.",
  "stats": [{ "n": "10", "l": "textbooks" }],           // big numbers
  "sections": [
    { "h": "Patent", "p": "A paragraph." },
    { "h": "Textbooks", "kicker": "2008–2022", "items": ["A bullet", "Another"] },
    { "h": "Selected papers", "papers": [{ "title": "…", "meta": "Venue · 2024", "href": "https://…", "note": "optional line" }] },
    { "h": "Awards", "timeline": [{ "y": "2020", "t": "Paper Presenter Award, …" }] }
  ]
}
```

Publications use `"pubs": [{ "title", "meta", "year", "href" }]` and are grouped by year automatically. Contact uses `"links": [{ "label", "value", "href" }]`.

- **Add a folder:** copy one block, give it a new `id`, save. It appears on the desktop automatically.
- **Reorder folders:** move the blocks.
- **Keep it in sync with the main site (optional):** `python3 tools/build_content.py --site ../repo --copy ../content/_data/room_copy.yml` rebuilds `js/content.js` from the main site's `_data/*.yml`, `_pages/about.md` and `_bibliography/papers.bib`. It needs Python 3 with PyYAML. Hand edits to `js/content.js` are overwritten when you run it, so pick one way.

## Changing the room

Everything is in `js/scene.js`:
- **Colours:** the `PAL` object at the top (walls, floor, wood, book colours).
- **Camera:** `POSES` (`wide` for laptops, `tall` for phones). `door` is where the walk-in starts, `stand` is where it ends.
- **Objects:** each is a few lines under a comment such as `/* desk */` or `/* bookshelf */`.
- **Clickable objects:** the `pickables` list maps an object to a folder id.

## Testing

```
python3 tools/test_room.py http://127.0.0.1:PORT/prof-vaishali-ingale/room/
```
This needs Playwright for Python with Chromium. Serve a folder where `prof-vaishali-ingale/` holds the built main site and `prof-vaishali-ingale/room/` holds this folder. The test covers phone and laptop sizes, every folder opening and closing, Esc, the browser back button, the skip link, reduced motion, the WebGL-off fallback and console errors. Screenshots go to `shots/`.

`shots/` and `tools/` are not needed on the live site and can be left out when copying.
