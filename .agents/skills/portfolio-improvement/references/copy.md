# Copy: slop patterns found in v5 and the fix for each

The voice: plain, specific, professional third person. Say each thing once, where it belongs. Keep every fact and figure exactly; you cannot re-verify them, only preserve them.

| Pattern                                                  | Example (before)                                                           | Fix (after)                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Headline repeated straight underneath                    | Title "ICNDIA-2026", then "Served as Conference Chair of **ICNDIA-2026**…" | Open with what happened; the title already names it                       |
| The same figure in several places on one page            | ICNDIA numbers on the card, then again in the timeline right below         | Full figures in one home location; elsewhere a short reference            |
| Audit-trail wording in visible text                      | "Listed as staff in-charge on AIT's clubs page, 2018–19 to 2022–23"        | "Staff in-charge, 2018–19 to 2022–23", source kept in a comment           |
| Visible "Source:" lines on cards                         | "Source: ICNDIA-2026 brochure; AIT Pune official posts"                    | HTML or YAML comment, unless a reader needs it (licences, figure credits) |
| Passive credit tacked on at the end                      | "Guided by X as faculty in-charge"                                         | Active voice, subject first                                               |
| Facts glued with semicolons                              | "Faculty In-Charge; Vice Branch Counsellor; Mentor"                        | A sentence, or a list                                                     |
| Parenthetical dates already shown nearby                 | "(2026)" next to a dated heading                                           | Remove                                                                    |
| Descriptions that restate the title or table of contents | CV description listing its own sections                                    | Say what the page is for                                                  |
| Middle-dot chains and ALL-CAPS labels                    | "September 2026 · Conference Chair"                                        | "Conference Chair, September 2026", sentence case                         |
| Title Case keyword lists                                 | "Machine Learning, Deep Learning, Information Security"                    | Sentence case                                                             |
| Throat-clearing openers                                  | "New paper on…:", "Served as…"                                             | Lead with the news                                                        |
| Stiff error copy                                         | "Looks like there has been a mistake. Nothing exists here."                | "Nothing lives at this address. The home page is a good place to start."  |

## Checks after a copy pass

- Run a number diff of every page's visible text against the baseline. A figure that left a page must still exist on its home page or in a comment.
- Quote any YAML value containing `: `. An unquoted one silently drops the page from the build.
- Leave `_data/room_copy.yml` alone unless the room generator is available; it feeds `room/js/content.js` only through that script.
- Facts that conflict between sources (v5: OSS Club "Since 2016" vs the clubs page's 2018–19) go to the owner. Do not pick one.
