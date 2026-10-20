---
name: one-click-site
description: "Build a complete, verified, distinctive website from a one-line brief with no follow-up questions, by running Impeccable, scroll-craft, the DESIGN.md reference library and the copy, accessibility and SEO add-on skills in a fixed order. Use this whenever the user asks for a website, landing page, homepage, portfolio or marketing site to be built, rebuilt or redesigned end to end, says 'one click', 'just build it', 'use your judgment', or gives a brief and expects a finished site back rather than a design discussion. Use it even if they only name a brand and a vibe. Not for editing one component, for app UI inside an existing product, or when the user wants to be interviewed first (then run /impeccable shape or /scroll-craft directly)."
argument-hint: "\"<one-line brief>\" [--interview] [--generate] [--into <dir>] [--name <slug>] [--pages home,about,...] [--assets <dir>]"
---

# one-click-site

One line in, one finished site out. The user has delegated every decision by
invoking this skill, so the run asks nothing and instead records what it
assumed. The result is a site that a design director would sign: a point of
view, real markup, verified at the sizes it ships at, with no tell that a
machine made it.

This skill does not design on its own. It is the conductor. The instruments
are already installed next to it:

| Instrument | Path | Owns |
|---|---|---|
| scroll-craft | `.claude/skills/scroll-craft` | The landing page: journey, grammar, signature move, engine, scroll verification |
| Impeccable | `.claude/skills/impeccable` | Project context, craft floor, secondary pages, finishing passes, DESIGN.md |
| DESIGN.md library | `.claude/design-md/<brand>/DESIGN.md` | 84 real design systems used as lineage, never as a template |
| Add-ons (when listed as skills) | `no-ai-slop-design`, `humanizer`, `accessibility-review`, `on-page-seo`, `schema-markup`, `technical-seo` | Pre/post checklists, copy, a11y, SEO |

Read the sub-skill files when a phase tells you to; do not reproduce them from
memory. Each has rules the other does not, and this skill exists so they are
followed together, not averaged.

## Flags

| Flag | Default | Effect |
|---|---|---|
| `--interview` | off | Ask scroll-craft's eight brief questions once, in one batch, before Phase 1. Everything after is still autonomous. |
| `--generate` | off | Allow image and clip generation (kie.ai via scroll-craft, or an image MCP). Off means the user's assets, SVG, CSS and typographic worlds only. Generation spends money, so silence is a no. |
| `--into <dir>` | see Phase 5 | Copy the verified site into this directory at the end. |
| `--name <slug>` | derived from brief | Build folder name under the scroll-craft workspace. |
| `--pages a,b,c` | derived from brief | Fix the page set instead of inferring it. |
| `--assets <dir>` | none | Folder of the user's photos, footage, logo. Read before deciding the world. |

## Non-negotiables

- **Zero questions.** Invoking this skill is the explicit creative delegation
  both sub-skills recognise. scroll-craft's brief is written as
  `Self-authored under explicit creative delegation`; Impeccable's PRODUCT.md
  is written by you with every inferred fact labelled `(inferred)`. Never run
  `/impeccable init` or `shape` (they interview). The one exception is
  `--interview`.
- **No fabrication.** No invented statistics, testimonials, press, client
  names, founding dates, team members, prices or quotes. Where a real site
  would have them, leave a clearly marked placeholder and list every one in the
  report. A counter with no real number is deleted, not estimated.
- **Lineage, not a clone.** A library DESIGN.md seeds discipline (scale,
  contrast relationships, radius logic, density). The hue family, canvas
  temperature, display face and signature move must all differ from it. See
  [references/world-lineage.md](references/world-lineage.md).
- **Verified, not described.** Nothing ships without `scripts/verify.sh`
  passing its hard gates and the screenshots having been looked at.
- **Finish the job.** The deliverable is complete except assets only the user
  can supply.

## Phase 0: Preflight

```bash
bash .claude/skills/one-click-site/scripts/doctor.sh
```

It reports node, ffmpeg, playwright-core, Chrome (and whether this shell is
root, which Chrome refuses unless run as another user; the script prints the
recipe `verify.sh` will use), the Impeccable engine, the kie.ai key, the three
sibling skills and the library. Required failures stop the run with the
remediation printed. Optional failures only change what the run can do: no
Chrome means no screenshots, which means the run cannot pass Phase 4, so say
so up front rather than at the end.

Then, with cwd at the project root:

```bash
.claude/skills/impeccable/scripts/impeccable context
node .claude/skills/scroll-craft/scripts/workspace.mjs --ensure
```

Follow the directives `impeccable context` prints (it tells you whether a
PRODUCT.md or DESIGN.md already exists and what that makes you responsible
for). The second command prints the scroll-craft workspace; the build lives at
`<workspace>/builds/<name>/`.

## Phase 1: Expand the brief

Read [references/brief-expansion.md](references/brief-expansion.md). Produce
three files before any design thinking:

1. `PRODUCT.md` at the project root (or update the existing one) in
   Impeccable's schema, from `assets/PRODUCT.template.md`.
2. `<build>/BRIEF.md` in scroll-craft's eight-topic form, from
   `assets/BRIEF.template.md`, headed `Self-authored under explicit creative
   delegation`.
3. `<build>/site-plan.md`: the page set, each page's mode (Persuade, Read or
   Operate in Impeccable's vocabulary), the nav and footer, and which
   instrument builds each page.

With `--interview`, ask the eight questions from scroll-craft Step 0 in one
batch first and write the answers verbatim; then proceed exactly as above.

## Phase 2: Choose the world

Read [references/world-lineage.md](references/world-lineage.md). Then:

```bash
python3 .claude/skills/one-click-site/scripts/pick-reference.py \
  --query "<sector and audience words from the brief>" \
  --mood "<dark|light> <warm|cool> <serif|sans|mono> <editorial|product|luxury|playful>" \
  --top 3
```

Open the three candidates' `DESIGN.md`, choose one lineage, and derive this
site's own tokens. Write them twice, from the same values: as scroll-craft's
theme block (six colours, two fonts) and as a draft `DESIGN.md` at the project
root in Impeccable's `document.md` schema, marked `draft: one-click-site`.

Before building, run the `no-ai-slop-design` point-of-view check: who is this
for, what should they feel in two seconds, what is the one visual idea. Write
the answers into `site-plan.md`. If the third answer is a shrug, go back to the
lineage step; a template with the brand's name on it is a failed run, not a
quick one.

Finally, the uniqueness gate: read `<workspace>/FINGERPRINTS.md` and scroll-
craft's `references/uniqueness.md`. A plan that does not clear 4 of 6
dimensions against every row changes; the registry never does.

## Phase 3: Build

Read [references/page-plan.md](references/page-plan.md).

**Landing page** (always): follow scroll-craft `SKILL.md` Steps 1 to 4 exactly
(journey, grammar and score, assets, page), with its `references/feel.md`,
`taste.md`, `devices.md` and `hero-depth.md` as it directs. Treat its Hard
Rules table as this skill's too. Without `--generate`, Step 3 uses only the
user's assets or non-photographic worlds: typographic, SVG, CSS depth, real
product shots the user supplied. Do not write "image goes here" boxes; design
for the material you actually have.

**Secondary pages** (from `site-plan.md`): build them in the same token file
under Impeccable's craft floor. Read
`.claude/skills/impeccable/reference/craft-floor.md` immediately before the
first edit, and the matching `mode-read.md` or `mode-operate.md`. These pages
earn their place through precision, not spectacle: the visitor came to read or
to do something.

**Copy**: every visible sentence gets the `humanizer` pass before the
verification loop (load the skill if listed; its rules are summarised in
[references/verification.md](references/verification.md)). It changes wording,
never facts.

## Phase 4: Verify, fix, repeat (at most three rounds)

Read [references/verification.md](references/verification.md). Each round:

```bash
bash .claude/skills/one-click-site/scripts/verify.sh --root <build> --out <build>/lab
```

It serves the folder, shoots desktop, mobile and reduced-motion strips with
scroll-craft's `shoot.mjs`, runs Impeccable's detector, runs
`html-checks.py`, and writes `lab/report.json` plus `lab/summary.md`. Open the
contact sheets and look at them at every scroll position, then fix everything
the report and your eyes found, batched, before shooting again.

After the gates pass, run the finishing passes in this order, each as its own
narrow, non-interactive Impeccable command on the build folder: `audit`,
`polish`, `typeset`, `harden`. Then `accessibility-review`, `on-page-seo` and
`schema-markup` (load each if listed; fallbacks are in the reference). Any
edit they make sends you back through `verify.sh` once more. Three rounds that
still fail a hard gate end the run with the failure named in the report, not
hidden.

## Phase 5: Finish and hand off

Read [references/handoff.md](references/handoff.md).

1. Run the `no-ai-slop-design` self-review list and the scroll-craft Hard
   Rules table one last time against the shipped files.
2. Write the final `DESIGN.md` with Impeccable's `document` flow, scan mode,
   authoring the qualitative language yourself and labelling it.
3. Spawn the `impeccable-finish-reviewer` agent on the build; apply its
   material fixes; re-verify if anything changed.
4. Append the build's row to `<workspace>/FINGERPRINTS.md`.
5. Deliver: with `--into`, copy the site there. Without it, copy into the
   project root only when the root has no `index.html` yet; otherwise leave the
   build in place and print the copy command. Never overwrite a live site
   silently.
6. Write the report in the format in `handoff.md`, with the screenshot strips,
   the placeholder list, the assumptions list and anything not verified.

Do not commit or deploy. Say what to run to do either.

## Stop conditions

Stop and report (do not improvise around) when: Chrome cannot run and no
screenshot path exists; the brief names a protected or hateful symbol as the
visual motif; the only way to pass a gate is to invent a fact; or the user's
assets are the whole world and the folder is empty or unreadable.
