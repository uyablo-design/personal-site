---
name: animated-infographic
description: Generate polished, animated infographic GIFs (also MP4 and PNG) for LinkedIn and social posts, in the style of the diagram-heavy "explainer" GIFs that go viral there. Flow diagrams with traveling connector dots, filling confidence bars, highlighter sweeps, growing bar charts with a drawn trend arrow, numbered tip cards, all in a seamless loop. Use this skill whenever the user asks for an animated infographic, an explainer or diagram GIF, "one of those GIFs", an animated version of a diagram, concept, framework, before/after or process, a visual for a LinkedIn or Twitter post, or wants to copy the look of a GIF or screen recording they show you, even if they only say "GIF" or "make this move" and never mention infographics. Not for searching for existing GIFs, trimming videos, or screen-capturing apps.
compatibility: Needs Node 18+, ffmpeg, and Playwright with Chromium. Run `node "$SKILL/render.mjs" --doctor` to check; cloud Claude Code sessions normally have everything. Inter fonts are bundled.
---

# Animated infographic GIFs

You write one HTML page per infographic from a small design kit, and `render.mjs` captures every
frame in headless Chromium and encodes a looping GIF with ffmpeg. Every visual state is a pure
function of time, so loops are seamless and renders are reproducible. Because the page is plain
HTML/CSS, you can fit the design to any topic and review it as a still before paying for a render.

## Where things are

The harness prints "Base directory for this skill: <path>" when this skill loads. Call that path
`$SKILL` and use it for every command (do not assume `.claude/skills/...` exists in the repo you
are working in):

```
$SKILL/render.mjs                         renderer: stills, GIF, MP4, poster PNG, standalone preview, --doctor
$SKILL/runtime/gifkit.css                 design system (tones, cards, pills, code, meters, charts, footer); Inter fonts bundled
$SKILL/runtime/gifkit.js                  animation runtime, connector router, icon set
$SKILL/examples/agentic-case-triage.html  the canonical template: every component and effect in use
$SKILL/scripts/analyze_reference.py       measure a reference GIF / screen recording (fps, loop, animated regions)
```

## Workflow

1. **Preflight (first use in a session).** `node "$SKILL/render.mjs" --doctor`. It names exactly
   what is missing (ffmpeg, Playwright, Chromium) and the command that fixes it. Fix, then continue.
2. **Content first.** Settle the topic and the one message before any layout, and write all the copy:
   - a title of 2–4 words (about 700px wide at 64px, so it stays on one line)
   - a subtitle under 60 characters
   - a "before" flow and an "after" flow, 3–4 nodes each, plus a one-line takeaway for each
   - four numbered principles: a 3–5 word title, one or two sentences, and one small visual each

   Never invent statistics. A chart without real data is labelled "(illustrative)". If the user
   shows a reference GIF or recording, study it first (see "Matching a reference" below).
   The example's footer is "Follow **Uri Yablonka** for more on agentic AI in biopharma | uriyablonka.com".
   Keep it for Uri's posts; use the user's own name and handle for anyone else.
3. **Build the page.** Make a working folder in the current directory, `gif-output/<slug>/`, copy
   `$SKILL/examples/agentic-case-triage.html` to `gif-output/<slug>/<slug>.html`, and replace its
   content and the widths in its page `<style>`. Keep `<link href="gifkit.css">` and
   `<script src="gifkit.js">` exactly as they are: the renderer serves both, plus the fonts, from the
   skill, wherever the page lives. Fill the whole canvas (1080×1350 by default); big empty cards read
   as unfinished, so add content or tighten the layout. Different shapes are covered in "Canvas sizes".
4. **Review stills before rendering the GIF.**
   `node "$SKILL/render.mjs" gif-output/<slug>/<slug>.html --stills 0.3,2.6 --scale 1`
   and read both PNGs. 0.3s is the empty pre-build state, 2.6s is fully built. Fix every `warning:`
   the renderer prints (overflow, content past the canvas), and anything you can see yourself:
   titles that wrap, uneven card heights, text colliding with charts or other text, arrows that end
   inside a card, a card with large empty areas. Repeat until clean.
5. **Render.** `node "$SKILL/render.mjs" gif-output/<slug>/<slug>.html --mp4` writes `<slug>.gif`,
   `<slug>.mp4` (three loops, which LinkedIn plays better than a GIF) and `<slug>.png` (the built
   state). Check one frame decoded from the GIF itself, because palette conversion can differ from
   the stills: `ffmpeg -v error -i x.gif -vf "select=eq(n\,36)" -frames:v 1 check.png`.
6. **Deliver.** Send the GIF with whatever file-delivery tool you have (SendUserFile, present_files).
   If you have none, give its full path. Mention the MP4 and PNG. Do not `git add` `gif-output/`
   unless the user asks, and say so if the repo does not ignore it.

If a render cannot work in the current environment (no Chromium, no network to install it), say so
and use `--bundle` instead: it writes a single self-contained `.standalone.html` that animates in any
browser (click to pause), which the user can screen-record.

## Motion recipe

Measured from a real viral reference post. Keep to it unless the user wants something else.

- Loop of 4–4.5s (`data-loop`) encoded at 15 fps (`data-fps`); the reference ran at about 13 fps.
- **Build** (about 0.4–2.1s), staggered left to right and top to bottom: confidence meters fill,
  highlighter pills sweep, chart bars grow one by one, the dashed trend line draws, its arrowhead
  appears last.
- **Hold** at least 1.5s on the finished state.
- **Reset:** everything retracts together over 0.45s (`data-reset`, `data-reset-dur`), then stays empty
  for about 0.5s before the next build.
- **Connectors never stop:** a small colored dot travels along each one, about 0.7s per trip.
- **Titles, cards, body text and the footer never move.** Motion is only for things that carry
  meaning (data flowing, confidence, choices, growth). Animate at most 5–7 regions; more reads as noise.

## Animation attributes

Put `data-anim` on an element, with `data-at` (start, seconds), `data-dur`, `data-ease`
(`out`, `in`, `inout`, `back`, `linear`) and `data-persist` (do not retract at reset).

| `data-anim` | Effect |
|---|---|
| `grow-x` | Horizontal fill, e.g. `.track > .fill` with `style="--v:80%"` |
| `grow-y` | Vertical growth for `.bar` |
| `sweep` | Left-to-right reveal (clip) |
| `var` | Only drives `--p` from 0 to 1; `.hl` highlighter pills use this |
| `fade` / `rise` / `pop` | Appear |
| `draw` | SVG path draw-on; `data-dash="6 7"` makes it dashed |
| `count` | Number ticker: `data-to`, `data-decimals`, `data-prefix`, `data-suffix` |
| `type` | Typewriter, for code or quotes |

- **Stagger:** `data-stagger="0.1"` (and optional `data-at`) on a parent offsets each animated
  descendant by 0.1s.
- **Connectors:** `<path data-wire data-from="#a" data-to="#b">` inside `<svg class="wires">` placed
  last in the canvas. It routes itself with an elbow, rounded corners, an arrowhead and a traveling dot.

  | Option | Purpose |
  |---|---|
  | `data-from-side` / `data-to-side` | `left`, `right`, `top` or `bottom` |
  | `data-from-at` / `data-to-at` | Position along that side, 0 to 1 |
  | `data-elbow` | Where the bend sits: px from the start, or `%` |
  | `data-to-edge="#card"` | Aim at a row inside a card but stop at the card's border (forks) |
  | `data-dots`, `data-dot-color`, `data-phase` | Dot count, color, and 0–1 offset (stagger sibling wires) |
  | `data-arrow="none"` | No arrowhead |

  A tone class on the wrapping `<g>` colors the dots.
- **Trend line:** inside a `.chart`, `<svg class="overlay"><path class="trend" data-trend data-lift="18"
  data-dash="6 7" data-anim="draw" data-at="1.45" data-dur="0.6">`. The curve follows the bar tops and
  its arrowhead is added and timed for you.
- **Pulse:** `data-pulse="1.15" data-cycles="2"` for a gentle scale loop.
- **Icons:** `<i class="ic" data-icon="agent"></i>`. Available: agent, user, users, doc, check, alert,
  info, spark, route, shield, flask, capsule, chart, clock, mail, search, layers, zap, database, tag,
  code, eye, target, gauge, split, plus, arrow, globe, dna, lock. To add one, put a 24×24 stroke path
  in the `ICONS` map in `gifkit.js`.

## Design system

- **Tones:** `.tone-orange` (problem or "before"), `.tone-green` (solution or "after"), `.tone-blue`,
  `.tone-red` (risk, escalation), `.tone-violet`, `.tone-gray`. A tone on a container colors its section
  band, borders, badges, pills, meters and highlights. At most three tones per graphic.
- **Layout:** `.hero` (`.title`, `.subtitle`); `.section` (`.section-head` with `.aside`, `.section-note`
  with `.soft`); `.divider`; `.tips` grid of `.tip` (`.tip-head`, `.badge`, `.tip-title`); `.footer`.
- **Content:** `.node` (`.accent`) with `.node-title`, `.node-sub`, `ul`; `.code` (spans `.k` `.s` `.d`);
  `.kv` with `.key` + `.pill`; `.fields` with `.label`, `.meter` > `.track` > `.fill`, `.value`;
  `.hl` highlighter; `.chart` with `.bars` > `.bar`, `.axis-label`, `.chart-note`.
- **Type:** Inter and Inter Display (bundled), monospace for code, minimum 10.5px, sentence case except
  titles. Use real font weights only (300, 400, 500, 600, 700, 800); in-between values resolve unpredictably.

## Canvas sizes

The example is built for 1080×1350 (4:5 portrait, best on LinkedIn). For other shapes set `--w`/`--h`
on `.canvas` and then remove content rather than shrinking it, because the type is already near its
minimum size:

- **1080×1080:** hero + one before/after section + a 2-card tips row. Drop the second flow or the divider.
- **1200×675 (landscape):** hero on the left, one flow on the right, no tips grid.

Always re-run the stills review after resizing; overflow warnings will tell you what to cut.

## Matching a reference

When the user shows a GIF or screen recording to copy:

1. `python3 "$SKILL/scripts/analyze_reference.py" reference.mp4 ref-analysis --crop x,y,w,h` (crop away
   phone status bars and app chrome; needs numpy and Pillow). It reports the real frame rate, the loop
   length, and an activity timeline, and writes `contact_sheet.png` and `activity.png` (red = what moves).
2. Open both images. List which regions move and what each one does (fill, grow, sweep, travel).
   Everything that is not red should stay still in your build.
3. Rebuild the layout in your own content and words. Match the style, structure and timing, not the
   source's text or artwork.

## Renderer options

`--stills 0.3,2.6` (PNG only) · `--fps 15` · `--width 1080` (output width) · `--scale 2` (supersampling)
· `--mp4` / `--mp4-repeat 3` · `--colors 256` · `--dither none|bayer|sierra2_4a` · `--out path.gif`
· `--no-poster` · `--keep-frames` · `--bundle` · `--doctor`.

GIF too big (LinkedIn limit is generous, but Slack and email are not)? Try in order: `--fps 12`,
`--width 900`, `--colors 128`, a shorter loop. The default no-dither palette is already the smallest
clean option.

## When something looks wrong

- **Text overflow warning:** shorten the copy first; widen a card only if every sibling still fits.
- **A connector ends in the wrong place:** check the `data-from`/`data-to` ids exist, then try
  `data-to-edge`, `data-elbow`, or an explicit side.
- **Chart note collides with the trend line:** move `.chart-note` (`left`/`top`) or shorten the bars.
- **Fonts look like Arial:** `--doctor` reports missing bundled fonts; the skill folder is incomplete.
- **Render is slow:** use `--scale 1` while iterating on stills; the final render uses 2.
