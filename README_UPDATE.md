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

News items dated in the future are shown straight away (the site sets `future: true`).

## Add an award or role

- Awards, the patent, books and certifications are on `_pages/awards.md`. Copy one `<li>...</li>` line in the Recognitions list, paste it at the top of the list and change the year and text.
- Conferences, IEEE, the OSS Club, Innerve and hackathon mentoring are on `_pages/leadership.md`. Each section starts with `<section class="card-soft">`. Edit the text inside, or copy a whole section to add a new one.
- The CV page reads from `_data/cv.yml`. Add a new line under the right heading, following the lines already there.

## Change the biography or contact links

- The home-page biography is the text in `_pages/about.md`, below the second `---` line.
- Email, Google Scholar, ORCID and LinkedIn links are in `_data/socials.yml`.

## Change photos

- **Profile photo:** upload a new picture named exactly `prof_pic.jpg` into `assets/img/` (**Add file → Upload files**). GitHub asks to replace the old one; confirm.
- **Class memories:** upload real photos into `assets/img/memories/` (for example `class_1.jpg`). In `_pages/wishes.md`, find a `<figure class="memory-frame">` block, change its `src` to the new file name and delete `class="memory-placeholder"` from the `<img>`; the site then draws a cream polaroid frame around the photo. Change the `<figcaption>` text too.

## Edit the birthday wishes

The Wishes page is `_pages/wishes.md`. Each wish is a block like this:

```
  <div class="wish-card">
    <p class="wish-text">The message goes here.</p>
    <p class="wish-sign">Name</p>
  </div>
```

Change the message and the name, or copy a whole block to add another wish.

## If something looks wrong

Open the **Actions** tab of the repository. A red cross means the last change has a typing mistake, often a missing `---`, quote or bracket. Open the file you last changed, fix it and commit again. Every earlier version is saved in the file's **History**, so nothing can be lost.

---

## Note for maintainers: replacing the sample wishes and photos

The eight wishes on `_pages/wishes.md` were written as warm samples signed "IT 2028" or "Your students", and the six memory pictures are illustrated frames with short captions (Our class, OSS Club, Innerve, Smart India Hackathon, ICNDIA-2026, 10 October 2026). The line "More notes from the class are on their way." sits under the wishes. When the real messages and class photos are ready:

1. Replace the text inside each `wish-text` paragraph with a real message, and the `wish-sign` line with the student's name, only with that student's permission. Remove any sample cards you no longer need.
2. Upload the real photos as `assets/img/memories/memory_frame_1.png` to `memory_frame_6.png`, overwriting the frames.
3. In `_pages/wishes.md`, change each caption to a short description of the real photo, such as the event and year, and update the matching `alt` text. Delete the "More notes from the class are on their way." line once the real wishes are in.
4. To show more than six photos, copy one `<figure class="memory-frame">` block, raise the number in the file name and upload a matching photo.

---

## For maintainers: design and code (Role A)

Everything custom lives in a handful of files. al-folio v1 itself comes from versioned Ruby gems, so these files are the only ones you would touch for the look and feel.

| File | What it does |
|---|---|
| `assets/custom/site.scss` | **All custom styling** (one file). Colour tokens and fonts are at the top: page `#fbf4ec`, band `#f8eadc`, card `#fffaf4`, text `#1f1712` / `#5e4b3f`, labels `#86613c`, single accent cinnamon `#a04a0d`. Fraunces (display) + Inter (text) from Google Fonts. |
| `assets/js/birthday.js` | **All custom JS** (one file): tags content with `data-reveal="lines" / "fade-up"`, `data-count`, `data-parallax`, `data-pin-hero`; keeps "Years at AIT" current from `_data/stats.yml` (`since:`); runs the scroll motion. Turned off automatically for visitors who prefer reduced motion. |
| `_layouts/about.liquid` | Home page: hero (ribbon, kicker, name, tagline, portrait), counters from `_data/stats.yml`, bio, selected papers, news. Local override of the al-folio gem layout. |
| `_includes/milestones.liquid` | The vertical milestones timeline at the end of the Leadership page, read from `_data/timeline.yml`. |
| `_includes/head.liquid` | Copy of the gem's head with our CSS/JS appended at the bottom. |
| `_data/stats.yml`, `_data/timeline.yml` | Numbers for the home counters and the milestones. Edit these, not the HTML. |
| `assets/lib/` | Vendored libraries, with licence files (see below). |

### Third-party code

| Library | Version | Licence | Use |
|---|---|---|---|
| [al-folio](https://github.com/alshedivat/al-folio) | v1 (al_folio_core 1.0.15) | MIT | Site template |
| [Lenis](https://github.com/darkroomengineering/lenis) | 1.3.26 | MIT (`assets/lib/LICENSE-lenis.md`) | Smooth scrolling |
| [GSAP](https://gsap.com) + ScrollTrigger + SplitText | 3.15.0 | GSAP Standard "no charge" licence, <https://gsap.com/standard-license> | Scroll reveals, counters, line-mask headings |
| [Lucide](https://lucide.dev) icons (by Role C) | — | ISC (`assets/img/section_icons/LUCIDE_LICENSE.txt`) | Section icons, birthday badge |
| Fraunces, Inter (Google Fonts) | — | SIL Open Font Licence 1.1 | Typography |
| arXiv figures (paper thumbnails) | — | CC BY-NC-SA 4.0 (2105.09253), CC BY 4.0 (2003.04360) | Credited on the Publications page |

### Build and deploy

Every push to `main` runs `.github/workflows/deploy.yml`: Jekyll builds the site and publishes it to the `gh-pages` branch, which GitHub Pages serves at <https://anujkumarsharma1.github.io/prof-vaishali-ingale/>. If a build fails, open the **Actions** tab, click the red run, and read the last lines of the "Install and Build" step; it is almost always a typo in a `.md` front matter block or in `papers.bib`.

Local preview (optional): `bundle install && bundle exec jekyll serve`, then open `http://localhost:4000/prof-vaishali-ingale/`.
