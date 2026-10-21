# Finish and hand off

## 1. Last checks against the shipped files

Run `no-ai-slop-design`'s self-review list and scroll-craft's Hard Rules table
one more time against the files in the build folder, not against your memory
of them. Fix hits; re-run `verify.sh` if anything changed.

## 2. Final DESIGN.md

Follow `.claude/skills/impeccable/reference/document.md` in scan mode (auto-
extract from the shipped CSS, then the eight-section body). Its Step 3 asks the
user for qualitative language; under delegation you author that language and
mark the section `authored by uri-one-click-site; confirm or edit`. Replace the
Phase 2 draft at the project root. Remove the `draft:` marker.

## 3. Finish review

Spawn the `impeccable-finish-reviewer` agent with the build folder, BRIEF.md,
site-plan.md and the strips. It returns an ordered list of material fixes.
Apply them, re-verify if anything changed, and keep its list for the report.

## 4. Registry

Append the build's row to `<workspace>/FINGERPRINTS.md` in the registry's
column order (grammar, nav treatment, hero device, act-sequence shape, close
pattern, signature move, world, port). Record it as built, including anything
you are not proud of; the registry's job is to stop the next build repeating
this one.

## 5. Deliver

- `--into <dir>` given: copy `index.html`, the secondary pages, `tokens.css`,
  `site.css`, `scrollcraft.css`, `scrollcraft.js`, `assets/`, and any
  `robots.txt`/`sitemap.xml` there. Do not copy `lab/`, `BRIEF.md` or
  `site-plan.md`.
- No `--into` and the project root has no `index.html`: copy there, same list.
- Otherwise leave the build where it is and print the copy command. A live
  site is never overwritten by a run the user has not looked at.

Do not commit, push or deploy. Say what would do each.

## 6. The report

Keep it short; the site is the deliverable. Use this structure:

```
# <Site name>: built

Open: <local URL or path>     Build: <workspace>/builds/<name>/

## What it is
Category, register, material, lineage (one line each). The point of view.
The grammar chosen and why the other seven lost (scroll-craft's own report
item). The signature move. The peak, as the sentence a visitor would say.

## Pages
| Page | Mode | Status |

## Verified
Last verify.sh summary.md, verbatim. Fingerprint gate result per row (or
"registry empty; nothing to clear"). Finish-reviewer fixes applied.

## Not verified / known limits
Anything verify.sh could not run, any soft check left, anything the three
rounds could not close.

## Accessibility and legal
Standard: built to WCAG 2.2 AA. Automated gates passed (axe-core at three
widths, keyboard walk, reflow, text spacing, structure), with the counts.
Not yet done, and why: screen-reader pass (VoiceOver/NVDA), real-device
keyboard walk-through, review by disabled users; automated tools find only
part of real issues.
Data inventory: third-party hosts, cookies, storage, forms (from
lab/data-inventory.json), and confirmation that privacy.html discloses each.
Legal pages: privacy.html, terms.html, accessibility.html; CCPA assumed
<applies / does not apply>; jurisdictions not covered (if the audience
suggests any).
**These legal pages are drafts written from the site's measured behaviour.
They are not legal advice. Have counsel review them before launch.**

## Launch blockers
Every `legal-todo` key (owner legal name, contact email, and so on) with the
page it appears on. The site must not go live until each is supplied.

## Placeholders you must supply
Every marked placeholder with its file and line, and what real content goes
there.

## Assumptions
Every (inferred) fact from PRODUCT.md and every Authored decision from
BRIEF.md, one line each, so the user can correct the ones that are wrong.

## Next
The copy command (if not delivered to the root), the commit command, how to
run /impeccable polish or /scroll-craft again on this build with their
own interviews if the user wants a second opinion.
```

Attach or link the three contact sheets. Say plainly that the brief was
self-authored under delegation and which flags were in effect.
