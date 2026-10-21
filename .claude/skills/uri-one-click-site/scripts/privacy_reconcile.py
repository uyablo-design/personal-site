#!/usr/bin/env python3
"""Check that privacy.html discloses what the running site actually does.
Usage: privacy_reconcile.py <data-inventory.json> <privacy.html> [--json]
Every third-party host, cookie, browser-storage key and form field found by audit.mjs must be
covered by the policy text. Exit 1 on any gap."""
import html, json, re, sys

PROVIDERS = {  # registrable domain -> names that count as disclosure
    "googleapis.com": ["Google"], "gstatic.com": ["Google"], "google.com": ["Google"], "googletagmanager.com": ["Google"],
    "google-analytics.com": ["Google Analytics", "Google"], "doubleclick.net": ["Google"], "youtube.com": ["YouTube", "Google"],
    "youtube-nocookie.com": ["YouTube", "Google"], "ytimg.com": ["YouTube", "Google"], "vimeo.com": ["Vimeo"], "vimeocdn.com": ["Vimeo"],
    "cloudflare.com": ["Cloudflare"], "cloudflareinsights.com": ["Cloudflare"], "jsdelivr.net": ["jsDelivr"], "unpkg.com": ["unpkg"],
    "cdnjs.com": ["cdnjs", "Cloudflare"], "plausible.io": ["Plausible"], "usefathom.com": ["Fathom"], "fathom.com": ["Fathom"],
    "typekit.net": ["Adobe"], "adobe.com": ["Adobe"], "facebook.com": ["Meta", "Facebook"], "facebook.net": ["Meta", "Facebook"],
    "linkedin.com": ["LinkedIn"], "licdn.com": ["LinkedIn"], "twitter.com": ["X", "Twitter"], "x.com": ["X", "Twitter"],
    "hotjar.com": ["Hotjar"], "segment.com": ["Segment"], "segment.io": ["Segment"], "stripe.com": ["Stripe"],
    "mailchimp.com": ["Mailchimp"], "list-manage.com": ["Mailchimp"], "convertkit.com": ["Kit", "ConvertKit"], "calendly.com": ["Calendly"],
    "formspree.io": ["Formspree"], "netlify.com": ["Netlify"], "vercel.com": ["Vercel"], "vercel-insights.com": ["Vercel"],
}
FIELD_WORDS = {"email": ["email"], "tel": ["phone", "telephone"], "name": ["name"], "textarea": ["message"], "message": ["message"],
               "company": ["company", "organisation", "organization"], "url": ["website", "url"], "file": ["file", "upload"]}


def registrable(host):
    host = host.split(":")[0].lower(); parts = host.split(".")
    if len(parts) >= 3 and parts[-2] in ("co", "com", "org", "net", "ac", "gov") and len(parts[-1]) == 2: return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def policy_text(path):
    raw = open(path, encoding="utf-8", errors="replace").read()
    raw = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    return html.unescape(re.sub(r"<[^>]+>", " ", raw))


def reconcile(inv, text):
    low = text.lower(); out = []
    def need(label, names, ok_detail=None):
        hit = next((n for n in names if n.lower() in low), None)
        out.append({"check": label, "ok": bool(hit), "detail": f"disclosed as '{hit}'" if hit else f"not mentioned; expected one of {names}"})
    for host in sorted(inv.get("third_party_hosts", {})):
        reg = registrable(host); names = PROVIDERS.get(reg, []) + [reg, reg.split(".")[0]]
        need(f"third-party host {host}", names)
    if inv.get("cookies"):
        out.append({"check": "cookies disclosed", "ok": "cookie" in low and "sets no cookies" not in low, "detail": f"{len(inv['cookies'])} cookie(s): {', '.join(sorted(inv['cookies']))[:200]}"})
        for name, dom in sorted(inv["cookies"].items()):
            names = [name] + PROVIDERS.get(registrable(dom.lstrip(".")), [])
            need(f"cookie {name} ({dom})", names)
    if inv.get("local_storage_keys"):
        ok = ("storage" in low or "stores" in low) and "stores nothing" not in low
        out.append({"check": "browser storage disclosed", "ok": ok, "detail": f"keys: {', '.join(inv['local_storage_keys'])[:200]}"})
    fields = set()
    for f in inv.get("forms", []):
        for fl in f.get("fields", []):
            key = fl["type"] if fl["type"] in FIELD_WORDS else next((k for k in FIELD_WORDS if k in fl["name"].lower()), None)
            if key: fields.add(key)
    if inv.get("forms"):
        out.append({"check": "forms disclosed", "ok": "form" in low, "detail": f"{len(inv['forms'])} form(s)"})
        for k in sorted(fields): need(f"form field type '{k}'", FIELD_WORDS[k])
    if inv.get("mailto"):
        out.append({"check": "email contact disclosed", "ok": "email" in low or "e-mail" in low, "detail": ", ".join(inv["mailto"])[:120]})
    return out


if __name__ == "__main__":
    inv = json.load(open(sys.argv[1])); res = reconcile(inv, policy_text(sys.argv[2]))
    if "--json" in sys.argv: print(json.dumps(res, indent=1))
    else:
        for r in res: print(f" [{'ok' if r['ok'] else 'FAIL':4}] {r['check']}: {r['detail']}")
        if not res: print(" [ok  ] nothing to disclose: no third parties, cookies, storage or forms")
    sys.exit(0 if all(r["ok"] for r in res) else 1)
