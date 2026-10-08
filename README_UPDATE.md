# How to Update This Website

This website was built once so that nobody has to rebuild it. Every page is a plain text file in the site's GitHub repository. To change something, open the file on GitHub, click the **pencil icon (Edit)**, make the change and click **Commit changes**. The live website updates by itself in about 5 minutes. No software needs to be installed.

## Add a new paper

The Publications page is built from one file: `_bibliography/papers.bib`.

1. Open the paper on [Google Scholar](https://scholar.google.com/citations?user=Ju77mncAAAAJ), click **Cite** (the quotation-mark icon) and choose **BibTeX**.
2. Copy the text that appears. It starts with `@article{` or `@inproceedings{`.
3. Open `_bibliography/papers.bib`, click Edit, paste the text at the top of the file and commit.
4. Optional extras, each added as a new line inside the entry before its closing `}`:
   - `doi={10.xxxx/xxxx},` adds a DOI link
   - `pdf={https://...},` adds a PDF button
   - `selected={true},` also shows the paper on the home page

Add papers from Google Scholar or the publisher's page only. Do not import them automatically from ORCID or Scopus: those databases mix in papers by another researcher with the same name.

**Never add these two Google Scholar entries:** the 2023 *Soft Computing* paper on diabetic retinopathy (it was retracted by the publisher) and the 2017 pomegranate juice-powder paper (it belongs to someone else with a similar name). Both still appear on her Scholar profile.

## Add a news item

News appears on the home page. Each item is one small file in the `_news` folder.

1. Open the `_news` folder and click **Add file → Create new file**.
2. Name it with the date first, for example `2027-02-15-new-award.md`.
3. Paste this, change the date and the sentence, and commit:

```
---
layout: post
date: 2027-02-15 10:00:00+0530
inline: true
related_posts: false
---

Your news sentence goes here, for example a new paper, an award or an event.
```

A news item dated in the future stays hidden until that date arrives and the site is next updated.

## Add an award or role

- Awards, the patent, books and certifications are on `_pages/awards.md`. Copy one `<li>...</li>` line in the Recognitions list, paste it at the top of the list and change the year and text.
- Conferences, IEEE, the OSS Club, Innerve and hackathon mentoring are on `_pages/leadership.md`. Each section starts with `<section class="card-soft">`. Edit the text inside, or copy a whole section to add a new one.
- The CV page reads from `_data/cv.yml`. Add a new line under the right heading, following the lines already there.

## Change the biography or contact links

- The home-page biography is the text in `_pages/about.md`, below the second `---` line.
- Email, Google Scholar, ORCID and LinkedIn links are in `_data/socials.yml`.

If her PhD is confirmed complete, add it to Education in _data/cv.yml and the bio.

## Change photos


- **Profile photo:** upload a new picture named exactly `prof_pic.jpg` into `assets/img/` (**Add file → Upload files**). GitHub asks to replace the old one; confirm.
- **Class letter photos:** see "Note for maintainers: class photos" at the end.

## The class letter page (unlisted)

`_pages/wishes.md` holds the class letter and six photo frames at `/wishes/`. It is not in the menu, not in the sitemap, has a `noindex` tag for search engines, and no other page links to it, so only the QR code or a direct link reaches it.

**To remove it for good, delete `_pages/wishes.md` (one commit).** Nothing else links to it. The frame pictures in `assets/img/memories/` can stay or be deleted; nothing else uses them.

## If something looks wrong

Open the **Actions** tab of the repository. A red cross means the last change has a typing mistake, often a missing `---`, quote or bracket. Open the file you last changed, fix it and commit again. Every earlier version is saved in the file's **History**, so nothing can be lost.

---

## Note for maintainers: class photos

The six frames on `_pages/wishes.md` are illustrated placeholders captioned Our class, OSS Club, Innerve, Smart India Hackathon, ICNDIA-2026 and 10 October 2026. When real photos are ready:

1. Upload them to `assets/img/memories/` (for example `class_1.jpg`).
2. In `_pages/wishes.md`, change that frame's `<img ...>`: point `src` at the new file, remove `class="memory-placeholder"`, and update the `alt` text and the caption.
3. To show more than six photos, copy one `<figure class="memory-frame">` block.


## For maintainers: design and code

Everything custom lives in a handful of files. al-folio v1 itself comes from versioned Ruby gems, so these files are the only ones you would touch for the look and feel.

| File | What it does |
|---|---|
| `assets/custom/site.scss` | **All custom styling** (one file). Self-hosted fonts and colour tokens are at the top: page `#fbf4ec`, band `#f8eadc`, card `#fffaf4`, text `#1f1712` / `#5e4b3f`, labels `#86613c`, single accent cinnamon `#a04a0d`. Fraunces (display) + Inter (text). |
| `assets/custom/motion.css`, `assets/js/motion.js` | Scroll motion driven by `data-reveal`, `data-count`, `data-parallax` and `data-rail` attributes (auto-tagging rules are in `window.MOTION_CONFIG` at the bottom of `_includes/head.liquid`). Off for visitors who prefer reduced motion; content is always visible without JavaScript. |
| `assets/js/site.js` | Small glue: navbar hairline on scroll, keeps "Years at AIT" current from `_data/stats.yml` (`since:`). |
| `_layouts/about.liquid` | Home page: hero (kicker, name, tagline, portrait, "Explore the office" button, Publications link), counters from `_data/stats.yml`, bio, selected papers, news, contact. Local override of the al-folio gem layout. |
| `_layouts/news-item.liquid` | The page for a single news item (title from front matter, date, text). |
| `_layouts/bib.liquid` | Copy of the gem's publication entry with lazy-loaded thumbnails. |
| `_includes/milestones.liquid` | The milestones timeline at the end of the Leadership page, read from `_data/timeline.yml`. |
| `_includes/head.liquid` | Copy of the gem's head with our fonts, CSS and JS added. |
| `_data/stats.yml`, `_data/timeline.yml`, `_data/room_copy.yml` | Numbers for the home counters, the milestones, and the text used by the interactive office. Edit these, not the HTML. |
| `assets/lib/`, `assets/fonts/` | Vendored libraries and fonts, with licence files (see below). |

### The interactive office (`room/`)

`room/` is a self-contained static folder (its own HTML, CSS, JS and assets), copied in as-is; Jekyll publishes it unchanged at `/room/`. The home page shows the **Explore the office** button only when `room/index.html` exists, so deleting the `room/` folder removes the office and the button together.

### Third-party code

| Library | Version | Licence | Use |
|---|---|---|---|
| [al-folio](https://github.com/alshedivat/al-folio) | v1 (al_folio_core 1.0.15) | MIT | Site template |
| [Lenis](https://github.com/darkroomengineering/lenis) | 1.3.26 | MIT (`assets/lib/LICENSE-lenis.md`) | Smooth scrolling |
| [GSAP](https://gsap.com) + ScrollTrigger + SplitText | 3.15.0 | GSAP Standard "no charge" licence, <https://gsap.com/standard-license> | Scroll reveals, counters, line-mask headings |
| Fraunces, Inter (self-hosted woff2) | — | SIL Open Font Licence 1.1 (`assets/fonts/FONTS_LICENSE.txt`) | Typography |
| Font Awesome, Academicons (al-folio, via jsDelivr) | — | Font Awesome Free (icons CC BY 4.0, fonts OFL), Academicons OFL | Icons on the CV and Publications pages |
| arXiv figures (paper thumbnails) | — | CC BY-NC-SA 4.0 (2105.09253), CC BY 4.0 (2003.04360) | Credited on the Publications page |

### Build and deploy

Every push to `main` runs `.github/workflows/deploy.yml`: Jekyll builds the site and publishes it to the `gh-pages` branch, which GitHub Pages serves at <https://anujkumarsharma1.github.io/prof-vaishali-ingale/>. If a build fails, open the **Actions** tab, click the red run, and read the last lines of the "Install and Build" step; it is almost always a typo in a `.md` front matter block or in `papers.bib`.

Local preview (optional): `bundle install && bundle exec jekyll serve`, then open `http://localhost:4000/prof-vaishali-ingale/`.
