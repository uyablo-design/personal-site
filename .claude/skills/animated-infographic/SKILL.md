---
name: animated-infographic
description: Create polished animated infographic GIFs (LinkedIn-style explainer diagrams with traveling connector dots, filling confidence bars, highlighter sweeps, growing bar charts) and render them to seamless looping GIF, MP4 and PNG. Use when the user asks for an animated infographic, explainer GIF, animated diagram, "one of those GIFs", or a visual post for LinkedIn or social.
---

# Animated infographic GIFs

You write one HTML page per infographic using the kit's design system and animation
attributes. `render.mjs` then captures every frame in headless Chromium and encodes a
looping GIF with ffmpeg. Each frame is a pure function of time, so loops are seamless and
renders are reproducible.

Files in this skill:

- `runtime/gifkit.css`: the design system (tones, cards, pills, code, meters, highlighter, tips, chart, footer).
- `runtime/gifkit.js`: the animation runtime, connector router and icon set.
- `render.mjs`: the renderer (stills, GIF, MP4, poster, standalone preview HTML).
- `examples/agentic-case-triage.html`: the canonical template. It uses every component and effect.

## Workflow

1. **Content first.** Get the topic and the one message. Write the copy before any layout:
   - a title of 2–4 words (it must fit about 700px at 64px)
   - a subtitle under 60 characters
   - a "before" flow and an "after" flow of 3–4 nodes each
   - a one-line takeaway per flow
   - four numbered principles, each a title of 3–5 words, one or two sentences, and one small visual

   Never invent statistics. Label any chart without real data "(illustrative)".
   The default footer is "Follow **Uri Yablonka** for more on agentic AI in biopharma | uriyablonka.com".
   Use another footer if the user gives one.
2. **Build.** Copy `examples/agentic-case-triage.html` to `gif-output/<slug>/<slug>.html` in the repo,
   then replace its content and adjust the page `<style>` widths. Keep `<link href="gifkit.css">` and
   `<script src="gifkit.js">` as they are; the renderer serves both from this skill.
   Fill the whole 1080×1350 canvas. Large empty cards look unfinished, so add content or tighten the grid.
3. **Review stills before rendering the GIF.**
   `node .claude/skills/animated-infographic/render.mjs gif-output/<slug>/<slug>.html --stills 0.3,2.6 --scale 1`
   Read both PNGs. 2.6s is the fully built state; 0.3s shows the empty, pre-build state. Fix every
   `warning:` the renderer prints (overflow, content past the canvas), plus any of these you can see:
   - titles wrapping to a second line
   - side-by-side cards with uneven heights
   - text colliding with charts or with other text
   - arrows ending inside a card
   
   Repeat until clean.
4. **Render.** `node .claude/skills/animated-infographic/render.mjs gif-output/<slug>/<slug>.html --mp4`
   This writes `<slug>.gif`, `<slug>.mp4` (three loops, for LinkedIn video) and `<slug>.png`
   (a still of the built state). Then check one frame decoded from the GIF itself:
   `ffmpeg -v error -i x.gif -vf "select=eq(n\,36)" -frames:v 1 check.png`
5. **Deliver.** Send the GIF to the user (SendUserFile, display render), and mention the MP4 and PNG.
   `gif-output/` is git-ignored. Commit outputs only if the user asks.

## Motion recipe

The recipe below was measured from a reference post. Keep to it unless the user wants something else.

- Loop of 4–4.5s (`data-loop`), encoded at 15 fps (`data-fps`).
- **Build** (about 0.4–2.1s), staggered left to right and top to bottom:
  1. confidence meters fill
  2. highlighter pills sweep
  3. chart bars grow one by one
  4. the dashed trend line draws
  5. the trend line's arrowhead appears last
- **Hold** for at least 1.5s on the finished state.
- **Reset:** everything retracts together over 0.45s (`data-reset`, `data-reset-dur`), then
  stays empty for about 0.5s before the next build.
- **Connectors never stop:** a small colored dot travels along each one, about 0.7s per trip.
- **Titles, cards, body text and the footer never move.** Motion is only for things that carry
  meaning (data flowing, confidence, choices, growth). Animate at most 5–7 regions.

## Animation attributes

- **Build-and-reset animations:** put `data-anim` on an element. Add `data-at` (start, in seconds),
  `data-dur` and `data-ease` (`out`, `in`, `inout`, `back` or `linear`). Add `data-persist` to stop
  an element from retracting at reset.

  | `data-anim` | Effect |
  |---|---|
  | `grow-x` | Horizontal fill, e.g. `.track > .fill` with `style="--v:80%"` |
  | `grow-y` | Vertical growth for `.bar` |
  | `sweep` | Left-to-right reveal (clip) |
  | `var` | Only sets `--p` from 0 to 1; `.hl` highlighter pills use this |
  | `fade` / `rise` / `pop` | Appear |
  | `draw` | SVG path draw-on; `data-dash="6 7"` makes it dashed |
  | `count` | Number ticker; uses `data-to`, `data-decimals`, `data-prefix`, `data-suffix` |
  | `type` | Typewriter, for code or quotes |

- **Stagger:** `data-stagger="0.1"` (with optional `data-at`) on a parent offsets each animated
  descendant by 0.1s.
- **Connectors:** add `<path data-wire data-from="#a" data-to="#b">` inside `<svg class="wires">`
  at the end of the canvas. It routes automatically with an elbow, rounded corners, an arrowhead
  and a traveling dot.

  | Option | Purpose |
  |---|---|
  | `data-from-side` / `data-to-side` | Which side to connect: `left`, `right`, `top` or `bottom` |
  | `data-from-at` / `data-to-at` | Position along that side, 0 to 1 |
  | `data-elbow` | Where the elbow sits: px from the start, or `%` |
  | `data-to-edge="#card"` | Aim at a row inside a card but stop at the card's border (for forks) |
  | `data-dots` | Number of traveling dots |
  | `data-dot-color` | Dot color |
  | `data-phase` | Offsets the dot (0–1); stagger sibling wires |
  | `data-arrow="none"` | No arrowhead |

  A tone class on the wrapping `<g>` colors the dots.
- **Trend line:** `<svg class="overlay"><path class="trend" data-trend data-lift="18" data-dash="6 7" data-anim="draw" …>`
  inside a `.chart`. The curve is computed through the bar tops, and the arrowhead is added and
  timed automatically.
- **Continuous motion:** `data-pulse="1.15" data-cycles="2"` adds a gentle scale pulse.
- **Icons:** `<i class="ic" data-icon="agent"></i>`. Available icons:
  agent, user, users, doc, check, alert, info, spark, route, shield, flask, capsule, chart, clock,
  mail, search, layers, zap, database, tag, code, eye, target, gauge, split, plus, arrow, globe,
  dna, lock. Add new ones to the `ICONS` map in `gifkit.js` as 24×24 stroke paths.

## Design system

- **Tones:** `.tone-orange` (problem or "before"), `.tone-green` (solution or "after"), `.tone-blue`,
  `.tone-red` (risk or escalation), `.tone-violet`, `.tone-gray`. A tone set on a container
  colors its section band, borders, badges, pills, meters and highlights. Use at most three
  tones per graphic.
- **Components:**
  - layout: `.hero` with `.title`/`.subtitle`; `.section` with `.section-head` (+ `.aside`) and
    `.section-note` (+ `.soft`); `.divider`; `.tips` grid of `.tip` with `.tip-head`, `.badge`
    and `.tip-title`; `.footer`
  - content: `.node` (`.accent`) with `.node-title`, `.node-sub`, `ul`; `.code` (`.k` `.s` `.d`
    spans); `.kv` with `.key` + `.pill`; `.fields` with `.label`, `.meter` / `.track` / `.fill`,
    and `.value`; `.hl` highlighter; `.chart` with `.bars` / `.bar`, `.axis-label` and `.chart-note`
- **Type:** Inter and Inter Display, plus a monospace font for code. Minimum size is 10.5px. Copy is
  sentence case except titles. The canvas defaults to 1080×1350 (4:5 portrait); set `--w` / `--h`
  on `.canvas` for 1080×1080 or 1200×675.

## Renderer options

`--stills 0.3,2.6` (PNG only) · `--fps 15` · `--width 1080` (output width) · `--scale 2`
(supersampling) · `--mp4` / `--mp4-repeat 3` · `--colors 256` · `--dither none|bayer|sierra2_4a`
· `--out path.gif` · `--no-poster` · `--keep-frames` · `--bundle` (writes a standalone
`.standalone.html` that animates in any browser; click to pause).

If a GIF is too large, try these in order: `--fps 12`, `--width 900`, `--colors 128`, a shorter loop.

## Requirements

Node 18+, ffmpeg, and Playwright with Chromium. Claude Code cloud sessions have all three. On a
Mac: `brew install ffmpeg && npm i -g playwright && npx playwright install chromium`. Inter is
used when installed; otherwise the fallback is Helvetica/Arial.
