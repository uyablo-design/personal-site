# Page plan: who builds what

## Build folder layout

```
<workspace>/builds/<name>/
  BRIEF.md            scroll-craft brief (Phase 1)
  site-plan.md        page set, modes, point of view (Phase 1-2)
  index.html          landing page, scroll-craft engine
  about.html ...      secondary pages, Impeccable craft floor
  tokens.css          the shared tokens (Phase 2)
  site.css            secondary-page styles, imports tokens.css
  privacy.html        privacy policy, written from lab/data-inventory.json (legal-pages.md)
  terms.html          terms of use
  accessibility.html  accessibility statement
  scrollcraft.css     copied from the scroll-craft engine, unedited
  scrollcraft.js      copied from the scroll-craft engine, unedited
  assets/             the user's material, encoded clips, SVG, fonts
  lab/                verify.sh output: shots, sheets, report.json
```

`scrollcraft.css` and `scrollcraft.js` are the mechanism and are never edited
per project; bespoke behaviour is page JS driven off `--sc-p` and your own
`data-sc-*` attributes, as scroll-craft's Hard Rules require.

## The landing page: scroll-craft, in full

Run scroll-craft's Steps 1 to 4 as written. This skill adds three constraints:

1. **Material honesty.** Without `--generate`, Step 3 produces nothing
   photographic that the user did not supply. The honest worlds for a page
   with no photography are typographic (type is the imagery), editorial
   (chaptered, printed intertitles), split stage, or a live surface. All four
   are in scroll-craft's grammar list and none needs a single generated pixel.
   A hero that is a grey rectangle waiting for a photo is a failed build.
2. **One instrument per element.** Nav and footer are shared markup across the
   whole site (see below). The scroll-craft page owns everything between them.
3. **Reduced motion is a first-class state.** Every act must read, in order,
   with motion off. `verify.sh` shoots it; look at that strip as carefully as
   the desktop one.

## Secondary pages: Impeccable craft floor

Each secondary page is a document of its kind first (Read mode) or a working
surface first (Operate mode), framed by the world. Read
`.claude/skills/impeccable/reference/mode-read.md` (or `mode-operate.md`) and
`craft-floor.md` immediately before editing, as Impeccable's own setup
requires.

What carries over from the landing page: tokens, type scale, nav, footer, the
signature move at most once and only where it helps wayfinding. What does not:
scrub clips, pinned acts, the engine. A reader on the About page is reading.

Content rules for these pages:

- Real headings that say what the section is. No eyebrow above every one.
- Body measure 45 to 75 characters; line height set for the face, not the
  default.
- Links underlined or otherwise distinguishable without colour alone.
- An article index lists real articles from the project or none at all; an
  empty index is a single sentence saying writing is coming, not three
  lorem-ipsum cards.
- Contact is the real channel the brief gave (an email, a form target). No
  invented phone numbers or addresses.

## Shared chrome

Nav and footer markup is identical on every page, byte for byte, and lives in
each file (static site, no includes). Decide it once in `site-plan.md`:

- Nav: wordmark, then at most four links, then one action if the category
  has one. The current page is marked (`aria-current="page"`).
- Footer: the resolve of the landing page is not the footer; the footer is
  the same quiet block everywhere, in the same place on every page (WCAG
  3.2.6): `© <year> <owner>. All rights reserved.`, links to Privacy, Terms
  and Accessibility (and Privacy Choices only if the site sells or shares
  data), and the contact method. verify.sh fails a page that lacks any of
  them.
- Skip link: the first focusable element of every page is a visible-on-focus
  "Skip to content" link to `<main id="main">`.

## Copy

All visible text passes through the `humanizer` rules before verification:
no "unlock", "empower", "seamless", "elevate"; no rule of three for its own
sake; no em dashes (both sub-skills ban them); no sentence that could sit on
any other site in the sector. Replace adjectives with the specific thing.
Facts stay exactly as PRODUCT.md records them.
