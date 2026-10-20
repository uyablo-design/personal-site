# Accessibility to California's standard

Written for uri-one-click-site. Law summarised as of October 2026; this is
working guidance for building sites, not legal advice. Re-check the "Watch"
items before relying on them.

## Contents
1. What the law actually asks for
2. The build target: WCAG 2.2 AA
3. Rules for this skill's kind of site (scroll-driven, motion-heavy)
4. Page-level checklist
5. What never ships
6. The accessibility statement
7. How it is verified

## 1. What the law actually asks for

There is no single "California web accessibility code" for private sites.
The obligation comes from three places, and all of them point at WCAG:

| Source | What it does | Standard it points to |
|---|---|---|
| Unruh Civil Rights Act (Cal. Civ. Code §51, §52) | Makes any ADA violation a violation of state law, with statutory damages of at least $4,000 per violation plus fees. This is why California is the busiest venue for website accessibility suits. | ADA Title III case law, which uses WCAG 2.1 AA |
| ADA Title III (federal) | Places of public accommodation must be accessible; courts apply it to websites, firmly when the site has a nexus to a physical place, and are split on online-only businesses. | WCAG 2.1 AA in settlements and DOJ guidance |
| CCPA regulations | Online notices, including the privacy policy, must be reasonably accessible to consumers with disabilities and follow generally recognised industry standards. | WCAG 2.1 AA (named in the regulations) |
| DOJ ADA Title II rule (2024) | State and local government sites. Compliance dates extended in April 2026 to 2027 (population 50,000+) and 2028 (smaller entities). | WCAG 2.1 AA |
| Cal. Gov. Code §7405, §11135, §11546.7 | State agencies and state-funded entities; biennial accessibility certification for state agency sites. | Section 508 / WCAG |

California courts are split on whether a business that exists only online is
covered. Build as if every site is covered: the cost of doing it right is
small, and the cost of a demand letter is not.

**Watch:** AB 1757 (2023-2024 session) would have written WCAG 2.1 AA into
state law and extended liability to the developers who build sites. Its
status could not be confirmed from primary sources at the time of writing;
check leginfo.legislature.ca.gov. If a successor passes, the target below
already exceeds it.

## 2. The build target: WCAG 2.2 AA

Build to **WCAG 2.2 Level AA**. It contains every 2.1 AA criterion the law
points to, plus the 2.2 additions that matter for modern sites:

- 2.4.11 Focus Not Obscured (Minimum): a sticky header or footer never hides the focused element.
- 2.5.7 Dragging Movements: anything done by dragging has a single-pointer alternative.
- 2.5.8 Target Size (Minimum): interactive targets at least 24 by 24 CSS pixels, or enough spacing.
- 3.2.6 Consistent Help: contact or help appears in the same place on every page.
- 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication: forms do not make people re-type or solve puzzles.

Claim "built to WCAG 2.2 AA and tested with the methods below", never "fully
compliant": no automated test can prove conformance.

## 3. Rules for this skill's kind of site

scroll-craft pages move. Motion is where these sites fail people, so:

| Criterion | Rule here |
|---|---|
| 2.2.2 Pause, Stop, Hide | Anything that moves on its own for more than 5 seconds (autoplaying or looping video, marquees, auto-advancing carousels) has a visible pause control. Scroll-scrubbed motion is user-driven and exempt, but a looping background video is not. |
| 2.3.1 Three Flashes | Nothing flashes more than three times per second. Check generated clips. |
| 2.3.3 Animation from Interactions (AAA, required here) | `prefers-reduced-motion: reduce` removes parallax, scrubbing, pinning and transforms; every act still reads in order. verify.sh shoots this state. |
| 1.2.1 to 1.2.5 Media | A video that carries information has captions (if it has speech) or a text equivalent next to it. Decorative video is `aria-hidden="true"`, muted, has no controls in the tab order, and conveys nothing the text does not. |
| 1.4.3, 1.4.11 Contrast | Text 4.5:1 (3:1 for large text) at the worst frame over imagery or video; UI components and focus indicators 3:1. scroll-craft's contrast-over-media check covers the cues; Impeccable's detector covers the rest. |
| 1.4.10 Reflow | Usable at 320 CSS pixels wide with no horizontal scrolling (verify.sh checks 320). |
| 1.4.12 Text Spacing | Nothing clips when line height is 1.5, paragraph spacing 2x, letter spacing 0.12em, word spacing 0.16em (a11y.mjs applies these and checks for overflow). |
| 1.4.4 Resize Text | Zoom is never disabled: no `user-scalable=no`, no `maximum-scale` below 2. |
| 2.4.7 Focus Visible | Every focusable element shows a visible change on focus; `outline: none` only with a replacement of at least 3:1. |
| 2.1.1 Keyboard, 2.1.2 No Keyboard Trap | Every action works from the keyboard; pinned scroll sections never trap focus. |

## 4. Page-level checklist

- `<html lang>` set; a unique, descriptive `<title>` per page.
- A skip link as the first focusable element, targeting `<main id="main">`.
- Landmarks: one `header`, one `nav` (labelled if there are two), one `main`, one `footer`.
- Headings in order, one `h1`, no levels skipped for styling.
- Every `img` has `alt`: describe what it shows in context, or `alt=""` with
  `role="presentation"` when it is decorative. SVG with meaning gets
  `role="img"` and a `<title>`.
- Links say where they go ("Read the privacy policy", not "click here");
  external links that open a new window say so.
- Every form control has a visible `<label>`; errors are announced
  (`aria-live` or `aria-describedby`) and described in text, not colour alone.
- No positive `tabindex`. DOM order matches visual order.
- Colour is never the only carrier of meaning.
- Help and contact (3.2.6) appear in the same place in the footer on every page.
- Language changes inside a page are marked with `lang` on the element.

## 5. What never ships

- **Accessibility overlay widgets** (accessiBe, UserWay, AudioEye, EqualWeb
  toolbars and the like). They do not make a site conformant, courts have not
  accepted them as a defence, and the FTC's January 2025 order against
  accessiBe ($1M; non-admission settlement) bars claims that such a tool makes
  a site WCAG-compliant. html-checks.py fails the build if one is present.
- Statements that the site is "100% compliant" or "ADA certified". There is no
  such certification.
- Auto-playing audio, ever.

## 6. The accessibility statement

Every site gets `accessibility.html`, linked from the footer of every page,
built from `assets/legal/accessibility-statement.md`: the commitment, the
standard (WCAG 2.2 AA), what was done and how it was tested, known
limitations (honestly, from the verify report), a way to report a barrier
(an email address, with a response time the owner can keep), and the date of
the last review. A statement that promises a response nobody will send is
worse than none; the contact email is a launch blocker if it is unknown.

## 7. How it is verified

`scripts/a11y.mjs`, run by verify.sh at 1440, 390 and 320 pixels wide:

- axe-core with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`
  rule tags. Gate: zero critical or serious violations; moderate and minor
  are listed and fixed where possible.
- Focus visibility: every focusable element is focused in turn and its
  computed outline, box shadow, border, background and text decoration are
  compared with the unfocused state. Gate: none without a visible change.
- Reflow at 320 pixels and the WCAG text-spacing override: no horizontal
  overflow. Gate.
- Zoom not disabled, no positive tabindex, skip link present, landmarks, form
  labels, no overlay scripts: html-checks.py. Gate.

Not automated, so stated in the report as manual or not done: a screen reader
pass (VoiceOver or NVDA), a full keyboard walk-through on a real device, and
review by a person with lived experience of disability. Automated tools find
roughly a third to a half of real issues; the report says so.
