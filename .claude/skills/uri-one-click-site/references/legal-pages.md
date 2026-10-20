# Legal pages: privacy, terms, accessibility, copyright

Written for uri-one-click-site. Law summarised as of October 2026, focused on
California and US federal rules. These pages are drafted from what the build
actually does; they are not legal advice and every report says the owner
should have counsel review them before launch.

## Contents
1. The principle: collect nothing, then say exactly that
2. The data inventory
3. Which pages every site gets
4. Privacy policy: CalOPPA, and CCPA/CPRA when it applies
5. Terms of use
6. Copyright and credits
7. Facts the owner must supply (launch blockers)
8. Out of scope

## 1. The principle

A privacy policy is a description of behaviour. The easiest policy to make
true is one for a site that does little: so by default the skill builds with
no analytics, no advertising pixels, no third-party cookies, self-hosted
fonts, and no embeds that load third-party scripts before the visitor asks.
Then the policy is short, honest, and needs no cookie banner and no "Do Not
Sell or Share" link.

When the brief or the owner wants analytics, a newsletter, embedded video or
anything that sends data elsewhere, the skill adds it, and the inventory, the
policy and (where required) the opt-out mechanics follow from it. The policy
is generated after the build from the inventory, never before.

## 2. The data inventory

verify.sh writes `lab/data-inventory.json` from the running site:

- every third-party host the page loads from (scripts, styles, fonts, images, frames, beacons);
- every cookie and `localStorage` key present after load and after a scroll;
- every form: its action, method, and the fields it collects (by name and type);
- `mailto:` and `tel:` links.

Then the gate: every third-party provider and every collected field must be
named in `privacy.html`. A mismatch fails the run. Fix the site (remove the
tracker) or fix the policy (disclose it), never the gate.

## 3. Which pages every site gets

| Page | File | When |
|---|---|---|
| Privacy policy | `privacy.html` | Always. CalOPPA applies to essentially any site that collects personal information from Californians, and a contact form or server log is enough. |
| Terms of use | `terms.html` | Always. |
| Accessibility statement | `accessibility.html` | Always. See california-accessibility.md section 6. |
| Cookie notice | section of `privacy.html` | Always as a section; a banner only if non-essential cookies exist. |
| Do Not Sell or Share My Personal Information | `privacy-choices.html` and footer link | Only if the site sells or shares personal information, which includes third-party advertising cookies or pixels used for cross-context behavioural advertising. The default build has none. |
| Disclaimer | section of `terms.html` | When the site discusses health, medicine, finance, law or investment: say plainly it is not professional advice. |
| Credits | section of `terms.html` or `credits.html` | When fonts, images or code are used under licences that require attribution. |

Footer of every page, in the same place (WCAG 3.2.6): copyright line, links to
Privacy, Terms, Accessibility (and Privacy Choices when it exists), and the
contact method.

## 4. Privacy policy

Template: `assets/legal/privacy-policy.md`. Always include the CalOPPA
elements (Cal. Bus. & Prof. Code §22575):

1. The categories of personally identifiable information collected, and the
   categories of third parties it is shared with.
2. How a visitor can review and request changes to their information, if the
   site offers that.
3. How visitors are told about material changes to the policy.
4. The effective date.
5. How the site responds to "Do Not Track" browser signals and similar
   mechanisms (required wording, even when the answer is "we do not track
   across sites, so there is nothing to switch off").
6. Whether third parties may collect personal information about visitors'
   online activities over time and across sites when they use this site.

The policy must be **conspicuously posted**: a link containing the word
"Privacy" on the home page (and, here, on every page).

**CCPA/CPRA** (Cal. Civ. Code §1798.100 and following, and the CPPA
regulations) applies to a for-profit "business" that meets a threshold:
annual gross revenue above the inflation-adjusted figure (US$25M in the
statute, adjusted every two years; check cppa.ca.gov), or buying, selling or
sharing the personal information of 100,000 or more consumers or households,
or deriving half or more of revenue from selling or sharing it. A personal or
small-business site usually is not covered; the skill records the owner's
answer (or "unknown, assumed not covered") in the report. When it is covered,
or the owner chooses to follow it anyway, the policy adds:

- categories of personal information collected in the last 12 months, their
  sources, business purposes, retention period per category, and categories
  of recipients;
- whether personal information is sold or shared, and the opt-out;
- the rights to know, delete, correct, opt out of sale or sharing, and limit
  use of sensitive personal information, and non-discrimination;
- at least two ways to submit a request (a toll-free number is required
  unless the business operates exclusively online and has a direct
  relationship with consumers, in which case an email address suffices),
  and how authorised agents can act;
- how the site handles **opt-out preference signals** such as Global Privacy
  Control. Since 1 January 2026 the regulations require a business that
  processes such signals to show visitors that their signal was honoured (for
  example "Opt-Out Request Honored"), and the policy explains how to turn the
  signal on. From 1 January 2027 the California Opt Me Out Act requires
  browsers to offer the signal, so expect most Californian visitors to send it;
- an update at least every 12 months.

Other California rules to check and mention only when they apply:
"Shine the Light" (Civ. Code §1798.83, disclosure to third parties for their
direct marketing), the Delete Act (data brokers only), minors' privacy (Bus.
& Prof. Code §22580; avoid by not directing the site to minors), and COPPA
(federal; sites directed at children under 13).

## 5. Terms of use

Template: `assets/legal/terms-of-use.md`. Sections: who operates the site;
acceptance (for a content site, notice by a clear link is customary; any
transaction or account needs an unticked checkbox or button with the terms
linked next to it, the standard the Ninth Circuit applied in Berman v.
Freedom Financial Network, 2022); permitted use; intellectual property and
copyright; user content and a DMCA agent only if the site accepts uploads or
comments; the not-professional-advice disclaimer where relevant; disclaimer
of warranties; limitation of liability (California does not let a contract
excuse fraud, wilful injury or violations of law, Civ. Code §1668, so the
template does not try); links to other sites; governing law (California)
and venue; changes; contact.

Not included by default: mandatory arbitration and class-action waivers.
They are enforceability minefields in California (for example, public
injunctive relief cannot be waived, McGill v. Citibank, 2017) and only belong
in terms that counsel has drafted for a business that needs them.

## 6. Copyright and credits

- Footer of every page: `© <first year>[–<current year>] <owner's legal name>. All rights reserved.`
  Protection does not depend on the notice, but the notice names the owner
  and is customary. html-checks.py requires a © line with the current year.
- Third-party material keeps its licence: self-hosted fonts under the SIL
  Open Font Licence keep their licence file in `assets/fonts/`; images under
  Creative Commons licences that require attribution are credited on the page
  or in a credits section; generated images record the generator in the
  report (and no claim of human authorship is made for them).
- DMCA: only a site that hosts user uploads or comments needs a designated
  agent registered with the US Copyright Office (renewed every three years)
  and a notice-and-takedown section in the terms.

## 7. Facts the owner must supply

The skill never invents these. When a fact is unknown it writes a visible,
plainly worded marker, `<span class="legal-todo" data-legal-todo="KEY">…</span>`,
and the report lists every one as a **launch blocker**:

| Key | Fact |
|---|---|
| `owner-legal-name` | the person or registered entity that operates the site |
| `contact-email` | an address that is read, for privacy and accessibility requests |
| `postal-address` | only when CCPA applies or a newsletter is sent (CAN-SPAM) |
| `effective-date` | defaults to the build date; confirm at launch |
| `ccpa-applicability` | whether the owner meets a CCPA threshold |

## 8. Out of scope

Jurisdictions other than California and US federal law. A site serving the
EU or UK needs GDPR/UK GDPR disclosures (lawful basis, controller identity,
transfers, rights, supervisory authority) and opt-in consent for
non-essential cookies; a site serving Israel needs the Privacy Protection
Law disclosures and an accessibility statement under the 2013 service
accessibility regulations (Israeli Standard 5568, based on WCAG). The report
names these as not covered when the brief suggests those audiences.
