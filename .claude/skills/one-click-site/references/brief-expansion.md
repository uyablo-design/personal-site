# Brief expansion

The user gave one line. The sub-skills expect a product record, an eight-topic
creative brief and a page plan. This file turns the line into those three
without inventing the product.

## 1. Read everything that is already true

Before writing a word, look for evidence the brief did not mention:

- `--assets <dir>` or any `assets/`, `images/`, `brand/`, `photos/` folder:
  what is actually there (count, subjects, orientation, quality). These decide
  the world more than the brief does.
- An existing site in the project root (`index.html`, `about.html`...):
  its copy is product truth; its look is evidence and anti-reference only.
- `PRODUCT.md`, `DESIGN.md`, `README.md`, `package.json`: keep confirmed
  facts; do not re-decide them.
- A logo, a wordmark, a colour in a favicon: binding brand commitments.

Record where each fact came from. In PRODUCT.md, anything not supported by the
brief or a file is written with the suffix `(inferred)`. The report lists them.

## 2. Classify the brief

Decide four things, in this order, and write them at the top of `site-plan.md`:

1. **Category** of the primary surface, in Impeccable's vocabulary:
   - *Persuade*: someone should want something after visiting (brand, product,
     launch, service, portfolio, personal site with a point of view).
   - *Read*: someone came to understand (documentation, an article index, a
     guide).
   - *Operate*: someone came to do a task (dashboard, settings, tooling).
   A one-line website brief is Persuade almost every time. The landing page is
   always Persuade; secondary pages are usually Read.
2. **Sector and audience**, as five to eight plain words. These feed
   `pick-reference.py --query`.
3. **Register**: how far from premium-minimal, from scroll-craft's range
   (brutalist, maximalist, playful, retro, dense, editorial, premium-minimal).
   Pick from the brief's adjectives; if it gives none, choose the register the
   *audience* would trust, and label it inferred. Never pick premium-minimal
   by default because it is safe; pick it because the audience is.
4. **Material**: what the page will be made of. User photos; product shots;
   nothing photographic (so typographic, SVG, CSS depth, real texture); or
   generated (only with `--generate`).

## 3. Write PRODUCT.md

Use `assets/PRODUCT.template.md`. It is Impeccable's schema; keep the headings
and the `impeccable:product-schema` comment so `impeccable context` reads it.

Guidance per section:

- **Stack**: `static HTML/CSS/JS, scroll-craft engine on the landing page`.
  The sub-skills only know how to build that, and it deploys anywhere.
- **Users**: who, in what situation, with what job. Be concrete about the
  situation ("a founder evaluating a vendor on their phone between meetings"),
  not the demographic.
- **Positioning**: the one claim a neighbour could not truthfully copy. If the
  brief does not give one, write the question the site must answer and mark
  the claim as `(to be supplied)`. Do not invent the claim.
- **Evidence on Hand**: list real assets with paths. Then state the absences:
  "No testimonials, press, metrics or client names were supplied; the site
  must not fabricate them." This sentence is what stops a counter from
  appearing later.
- **Product Principles**: three to five, derived from the brief, no visual
  recipes ("Earn trust with specifics, not adjectives", not "use a serif").

## 4. Write BRIEF.md

Use `assets/BRIEF.template.md`. scroll-craft's eight topics, answered in the
brand's voice, each marked **Evidence** (from the brief or a file) or
**Authored** (your decision under delegation). Then the four things feel.md
requires: the feeling curve (one line per act, emotion then cause), the peak,
the tell-someone sentence, and any authored silence.

Two traps, both from scroll-craft's own rules:

- Topic 1 asks for references *from any medium* and warns that naming sites
  produces copies of sites. Name a film, a record sleeve, a building, a
  magazine. Never a website, and never the library brand you will pick in
  Phase 2.
- Topic 7 (one unbroken world vs distinct scenes) is the biggest structural
  fork. Decide it from the material: continuous worlds need continuous
  imagery, which without `--generate` means the user supplied it. With
  nothing photographic, distinct scenes or a typographic grammar are the
  honest choices.

## 5. Write site-plan.md

```
# Site plan: <name>

Category: Persuade | Sector/audience: ... | Register: ... | Material: ...
Point of view (no-ai-slop):
  1. For: ... Feel in two seconds: ...
  2. The one visual idea: ...
  3. Brand constraints: ...

Pages
| Page | File | Mode | Built by | Purpose (one line) |
| Home | index.html | Persuade | scroll-craft | ... |
| About | about.html | Read | Impeccable craft floor | ... |

Nav: <items, in order>      Footer: <items>
Shared: tokens.css (from DESIGN.md), nav + footer markup identical on all pages
Placeholders expected: <list, or "none">
Assumptions: <bullets, each also in PRODUCT.md as (inferred)>
```

### Page-set heuristics (when `--pages` is not given)

| Brief says | Pages |
|---|---|
| a product, a drink, a launch | Home only; a `#details` section instead of a second page |
| a person, consultant, studio | Home, About, Contact (Contact is a section if there is only an email) |
| writes, publishes, articles | add Articles (index) and one Article template |
| a service with a process | Home, How it works (Read), Contact |
| an existing site in the root | mirror its page set; drop pages whose copy is boilerplate |

Fewer pages, each finished, beats a sitemap of stubs. A page you cannot fill
with real content is a section, or nothing.
