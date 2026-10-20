# Verification and the fix loop

A page is not finished when it is written; it is finished when it has been
looked at, at the sizes it ships at, and nothing found was left in. The loop
below is the only route to "done". Three rounds maximum: a page that still
fails after three has a structural problem, and the report says what it is.

## The runner

```bash
bash .claude/skills/uri-one-click-site/scripts/verify.sh --root <build> --out <build>/lab [--port 4500] [--steps 3]
```

What it does, in order:

1. Serves `<build>` with scroll-craft's `serve.mjs`.
2. Shoots three strips with scroll-craft's `shoot.mjs`: desktop (1440x900),
   mobile (390x844), reduced motion. If the shell is root, it runs the shoots
   as an unprivileged user with the Chrome sandbox on (Chrome refuses to run
   as root otherwise). Output: `lab/desktop/`, `lab/mobile/`, `lab/reduced/`,
   each with numbered shots, `sheet.png` and scroll-craft's `report.json`
   (dead-scroll and contrast-over-media findings).
3. Runs Impeccable's detector on the folder: `impeccable detect --json`.
4. Runs `html-checks.py` on every `.html` and `.css` file.
5. Writes `lab/report.json` (machine) and `lab/summary.md` (human) and exits
   non-zero if any hard gate failed.

## Hard gates (fail the round)

| Gate | Source | Why |
|---|---|---|
| Page reaches `html.sc-ready` and shoots complete | shoot.mjs | Nothing else is trustworthy if the engine did not boot |
| No horizontal overflow at 390 or 1440 | html-checks via shoot | The first thing a visitor notices on a phone |
| No dead scroll; scrub clips keep moving on screen | scroll-craft report | A frozen screen reads as broken |
| Every cue clears 4.5:1 over media at its worst frame | scroll-craft report | Text on video is where contrast fails silently |
| Zero `low-contrast` warnings | impeccable detect | WCAG AA; advisory-severity hits are listed, not failed |
| One `h1`, `lang`, `title` 10-70 chars, meta description 50-160, viewport | html-checks | Baseline SEO and accessibility |
| Every `img` has `alt` (empty allowed only with `role="presentation"`) | html-checks | Screen readers and the no-fabrication rule (alt describes what is there) |
| No em dash in visible text | html-checks | Both sub-skills ban it as a machine tell |
| No scroll cue, arrow, animated mouse, "scroll to explore" | html-checks | scroll-craft Hard Rule |
| No `01 / 06` style counters | html-checks | scroll-craft Hard Rule |
| No `transition: all`; no animated width/height/top/left | html-checks | Performance and jank |
| No gradient text, neon glow, zero-offset halo shadows | html-checks + detect | Both skills ban them |
| Local links resolve; no `lorem`, `TODO`, `[placeholder]` in visible text | html-checks | Finished means finished; placeholders are marked in the report, not left in copy |
| Reduced-motion strip reads in order with every act visible | your eyes | No script can judge this |

## Soft checks (fix if you can, report if you cannot)

- Pure `#000`/`#fff`/grey neutrals (no-ai-slop tell; tint toward the palette).
- Identical padding on every section (no rhythm).
- Body measure outside 45-75 characters.
- Font stack that is only `system-ui`/`Inter`/`Arial` with no stated reason.
- Any section whose heading could sit on any other site in the sector.

## Looking at the strips

Open `lab/desktop/sheet.png`, then `lab/mobile/sheet.png`, then
`lab/reduced/sheet.png`. For each, walk every frame and ask: does the act do
what BRIEF.md's feeling curve says it should at this point; does the peak land
where the brief put it; is the ending a resolve or a fade; is anything
clipped, overlapping, orphaned or empty. Batch every finding before editing.
Shoot again only after the batch is applied.

## The finishing passes

Once the hard gates pass, run these on the build folder, each as a separate,
narrow Impeccable command (they are non-interactive; see
`.claude/skills/impeccable/reference/<name>.md` for each):

1. `audit` for technical quality across a11y, performance, theming, responsive.
2. `polish` for alignment, spacing, consistency, micro-detail.
3. `typeset` for hierarchy, sizing, weight, measure.
4. `harden` for text overflow, long strings, missing images, edge states.

Then the add-ons. Load each skill if it is listed; otherwise apply the
fallback below inline.

- **accessibility-review**: WCAG 2.1 AA pass. Fallback: focus order and
  visible focus rings; every interactive element reachable by keyboard; no
  information carried by colour alone; `prefers-reduced-motion` honoured;
  touch targets at least 44px; headings in order; landmarks (`header`,
  `main`, `nav`, `footer`).
- **on-page-seo**: per page: one intent, title and description written for a
  human reader, one `h1`, descriptive link text, `canonical`, Open Graph
  title/description/image (a real image from the build, not a placeholder),
  `robots.txt` and `sitemap.xml` if the site has more than one page.
- **schema-markup**: JSON-LD matching the category: `Person` for a personal
  site, `Organization` or `LocalBusiness` for a business, `Product` for a
  product page, `Article` for articles, `WebSite` always. Only properties
  with real values; no invented `aggregateRating`, `telephone` or `address`.
- **technical-seo** (final, read-only): crawlability, no blocked assets, no
  render-blocking fonts without `font-display`, images sized, no layout shift
  from late-loading media.

Any edit from these passes means one more `verify.sh` run. The last run's
`summary.md` goes into the report verbatim.

## Humanizer rules (fallback summary)

Apply to visible copy only; never to facts, names, numbers or quotes.
Remove: em dashes, "unlock/empower/elevate/seamless/delve/landscape/tapestry",
triplets built for rhythm, a sentence that restates the heading, a closing
line that summarises the section, rhetorical questions as openers, and any
claim the copy cannot point to. Prefer: the concrete noun, the number the user
gave, the verb the visitor will do.
