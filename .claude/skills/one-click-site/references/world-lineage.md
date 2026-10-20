# World lineage

The library under `.claude/design-md/` holds 84 interpretations of real design
systems. It is the most useful and the most dangerous thing in this pipeline:
useful because each file encodes months of professional decisions about scale,
contrast and rhythm; dangerous because copying one produces a site that looks
like someone else's brand, which both sub-skills forbid and the user would
rightly reject.

So the rule is **lineage**: inherit discipline, replace identity.

## 1. Shortlist

```bash
python3 .claude/skills/one-click-site/scripts/pick-reference.py \
  --query "biotech executive writing advisory" \
  --mood "light warm serif editorial" --top 3 --json
```

The script indexes every library file that carries machine-readable tokens
(it prints the count) and scores them on sector words in their description, plus measured properties
(dark or light canvas, warm or cool temperature, serif or sans display face).
It prints the three best with their key tokens. Some library entries are prose only; the script lists them separately and you may read one for its
descriptions, but it cannot be a lineage because its tokens are not measurable.

## 2. Choose one lineage

Read the three candidates' `DESIGN.md` front matter and the first body section.
Choose the one whose *discipline* fits the brief: type-scale ratio, how many
neutrals it uses, how it handles density, how it treats radius (sharp,
pill, mixed). Write one sentence in `site-plan.md`: "Lineage: <brand>, for its
<discipline>; identity replaced as below."

## 3. Derive this site's tokens

Keep from the lineage (these are craft, not identity):

- the number of type steps and the ratio between them
- the contrast relationships (body on canvas, muted on canvas, ink on primary)
- the radius logic (one scale, applied consistently)
- spacing rhythm and density
- how many accents it allows itself (usually one)

Change, without exception (these are identity):

- **Primary hue family**: move at least 60 degrees of hue, or change the
  saturation class (vivid to earthy, or the reverse).
- **Canvas temperature**: a cool near-white lineage gets a warm canvas, or an
  off-black one, chosen for the audience.
- **Display typeface**: a different face of a different class or era. The
  lineage's proprietary face is not available anyway; do not substitute its
  nearest clone. Choose for the register in `site-plan.md`.
- **Signature move**: never the lineage's (a mesh gradient, a particular card
  tilt, a specific hero device). Invent one from the brief; scroll-craft's
  `uniqueness.md` section 3 defines what counts.

Neutrals are always tinted toward the palette; pure `#000`, `#fff` and
`#808080`-type greys are a no-ai-slop tell and also usually fail the
lineage's own contrast relationships once the canvas moves.

## 4. Write the tokens once, use them twice

The same six colours and two fonts feed both instruments:

```css
/* tokens.css: shared by every page */
:root {
  --sc-canvas: ...;   --sc-surface: ...;
  --sc-ink: ...;      --sc-ink-soft: ...;
  --sc-accent: ...;   --sc-accent-ink: ...;
  --sc-font-display: ...; --sc-font-text: ...;
  /* secondary-page extras, derived from the same values */
  --hairline: ...; --radius-sm: ...; --radius-lg: ...;
}
```

Draft `DESIGN.md` at the project root using Impeccable's `document.md`
front matter schema (colors, typography, rounded, spacing, components) with
the same values, and the eight-section body with the qualitative language
authored by you. Mark the file `draft: one-click-site` in the front matter;
Phase 5 rewrites it from the shipped artifact.

Fonts: use faces that load without a licence problem (a self-hosted open
font in `assets/fonts/`, or a system stack chosen on purpose). Name the
pairing and why in `site-plan.md`; "Inter because it is there" fails the
no-ai-slop check.

## 5. The clone test

Before building, put the lineage's canvas, primary and display face next to
yours. If a reader who knows the lineage brand would say "that's a <brand>
site", you have not moved far enough. Then clear the uniqueness gate: 4 of 6
dimensions against every row in `FINGERPRINTS.md`. When the registry is empty,
the gate is trivially clear; say so in the report rather than claiming a
comparison that did not happen.
