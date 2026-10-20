# Legal templates

Drafts for uri-one-click-site. Render each into an HTML page in the site's own
design (same tokens, nav and footer as every other page), filling
`{{PLACEHOLDERS}}` from `site-plan.md` and `lab/data-inventory.json`.

- Keep a `<!-- IF:flag -->` ... `<!-- END:flag -->` block only when the flag is
  true for this build; delete it (markers included) otherwise. Flags come
  from the data inventory and the brief: `forms`, `analytics`, `embeds`,
  `newsletter`, `cookies_nonessential`, `sells_or_shares`, `ccpa`,
  `professional_topic`, `user_content`, `third_party_assets`.
- An unknown fact is never invented: write
  `<span class="legal-todo" data-legal-todo="KEY">to be added by the site owner</span>`
  and list it as a launch blocker in the report.
- These are not legal advice. The report recommends review by counsel
  before launch, every time.
