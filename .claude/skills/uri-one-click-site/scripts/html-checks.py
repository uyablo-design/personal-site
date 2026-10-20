#!/usr/bin/env python3
"""Static checks for the uri-one-click-site gates. Usage: html-checks.py [--json] --root <build> [files...]
Without files, scans every .html and non-engine .css under --root (lab/ excluded).
Covers: page basics (title, description, h1, lang, viewport), machine tells (em dash, scroll cues,
counters, placeholders), CSS bans, WCAG structure (skip link, landmarks, labels, zoom, tabindex,
autoplay pause control, overlay widgets) and the legal set (privacy, terms, accessibility pages,
footer links on every page, dated copyright line, CalOPPA elements, launch-blocker markers).
Exit 1 when any hard finding exists."""
import argparse
import datetime
import json
import os
import re
import sys
from html.parser import HTMLParser

SKIP_TEXT_IN = {"script", "style", "noscript", "template", "svg"}
SCROLL_CUE = re.compile(r"scroll\s+(to|down|for)\b|scroll\s*[↓⬇▼]|[↓⬇]\s*$|scroll to explore", re.I)
COUNTER_HARD = re.compile(r"\b0\d\s*/\s*0\d\b")
COUNTER_SOFT = re.compile(r"(?<![\d.])\b[1-9]\s*/\s*[1-9]\b(?![\d.])")
PLACEHOLDER = re.compile(r"lorem ipsum|\bTODO\b|\[placeholder\]|image goes here|\{\{|\}\}|\bFIXME\b|\bTBD\b", re.I)
EM_DASH = "—"
OVERLAY = re.compile(r"accessibe|acsbapp|userway|audioeye|equalweb|maxaccess|accessibilityadapter|user1st|purpose-?a11y|ada-?widget|enable\.co\.il|nagish", re.I)
CSS_HARD = [
    (re.compile(r"transition\s*:\s*all\b"), "transition: all"),
    (re.compile(r"transition\s*:[^;]*\b(width|height|top|left)\b"), "transition animates width/height/top/left"),
    (re.compile(r"background-clip\s*:\s*text"), "gradient text (background-clip: text)"),
]
CSS_SOFT = [
    (re.compile(r"text-shadow\s*:\s*0\s+0\s+\d"), "zero-offset glow text-shadow"),
    (re.compile(r"box-shadow\s*:\s*0\s+0\s+\d+px\s+#?[0-9a-fA-F]{3,8}\s*;"), "zero-offset halo box-shadow"),
    (re.compile(r"#(000000|000|ffffff|fff|808080|666666|666|999999|999|333333|333)\b"), "pure black/white/grey neutral"),
    (re.compile(r"cubic-bezier\([^)]*\b1\.\d+\)|ease-in-out-back|elastic|bounce", re.I), "bounce/elastic easing"),
]
LABELLABLE = {"input", "select", "textarea"}
NO_LABEL_TYPES = {"hidden", "submit", "button", "reset", "image"}
FOCUSABLE = {"a", "button", "input", "select", "textarea", "summary"}
LEGAL_PAGES = {"privacy": "privacy.html", "terms": "terms.html", "accessibility": "accessibility.html"}
YEAR = datetime.date.today().year


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None; self.title = ""; self.in_title = False; self.desc = None; self.viewport = None
        self.h1 = 0; self.imgs = []; self.links = []; self.text = []; self.styles = []; self.in_style = False
        self.stack = []; self.landmarks = {}; self.canonical = False; self.og = set(); self.jsonld = 0
        self.ids = set(); self.label_for = set(); self.controls = []; self.first_focusable = None
        self.tabindex_pos = []; self.scripts = []; self.videos = []; self.audios = []; self.pause_controls = 0
        self.footer_links = []; self.footer_text = []; self.legal_todos = []; self.has_reduced_motion = False
        self._style_buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs); line = self.getpos()[0]
        self.stack.append(tag)
        if a.get("id"): self.ids.add(a["id"])
        if tag == "html": self.lang = a.get("lang")
        elif tag == "title": self.in_title = True
        elif tag == "meta":
            n = (a.get("name") or a.get("property") or "").lower()
            if n == "description": self.desc = a.get("content", "")
            if n == "viewport": self.viewport = a.get("content", "")
            if n.startswith("og:"): self.og.add(n)
        elif tag == "link" and (a.get("rel") or "").lower() == "canonical": self.canonical = True
        elif tag == "h1": self.h1 += 1
        elif tag == "img": self.imgs.append((line, a))
        elif tag == "a" and a.get("href"):
            self.links.append((line, a["href"]))
            if "footer" in self.stack: self.footer_links.append(a["href"])
        elif tag == "style": self.in_style = True; self._style_buf = []
        elif tag == "script":
            if (a.get("type") or "").lower() == "application/ld+json": self.jsonld += 1
            if a.get("src"): self.scripts.append((line, a["src"]))
        elif tag == "label" and a.get("for"): self.label_for.add(a["for"])
        elif tag == "video": self.videos.append((line, a))
        elif tag == "audio": self.audios.append((line, a))
        if tag in LABELLABLE:
            t = (a.get("type") or "text").lower()
            if not (tag == "input" and t in NO_LABEL_TYPES):
                self.controls.append({"line": line, "tag": tag, "id": a.get("id"), "aria": bool(a.get("aria-label") or a.get("aria-labelledby") or a.get("title")),
                                      "wrapped": "label" in self.stack[:-1], "name": a.get("name") or a.get("id") or tag})
        if tag in ("header", "nav", "main", "footer"): self.landmarks[tag] = self.landmarks.get(tag, 0) + 1
        if a.get("role") in ("main", "banner", "contentinfo", "navigation"):
            m = {"main": "main", "banner": "header", "contentinfo": "footer", "navigation": "nav"}[a["role"]]; self.landmarks[m] = self.landmarks.get(m, 0) + 1
        ti = a.get("tabindex")
        if ti is not None and ti.strip().lstrip("-").isdigit() and int(ti) > 0: self.tabindex_pos.append((line, tag, ti))
        lbl = " ".join([a.get("aria-label") or "", a.get("title") or ""]).lower()
        if tag == "button" and "pause" in lbl: self.pause_controls += 1
        if "legal-todo" in (a.get("class") or "") or a.get("data-legal-todo"): self.legal_todos.append((line, a.get("data-legal-todo") or "unspecified"))
        if self.first_focusable is None and "body" in self.stack and (tag in FOCUSABLE and (tag != "a" or a.get("href")) or (ti is not None and ti.strip() == "0")):
            self.first_focusable = (tag, a.get("href") or "")
        if a.get("style"): self.styles.append((line, a["style"]))

    def handle_endtag(self, tag):
        if tag == "title": self.in_title = False
        if tag == "style": self.in_style = False; self.styles.append((self.getpos()[0], "".join(self._style_buf)))
        while self.stack and self.stack[-1] != tag: self.stack.pop()
        if self.stack: self.stack.pop()

    def handle_data(self, data):
        if self.in_title: self.title += data
        if self.in_style: self._style_buf.append(data); return
        if any(t in SKIP_TEXT_IN for t in self.stack): return
        if data.strip():
            self.text.append((self.getpos()[0], data))
            if "footer" in self.stack: self.footer_text.append(data)
            if "button" in self.stack and "pause" in data.lower(): self.pause_controls += 1


def check_html(path, root):
    p = Page(); src = open(path, encoding="utf-8", errors="replace").read(); p.feed(src)
    f = []
    H = lambda gate, msg, line=0: f.append({"file": path, "line": line, "severity": "hard", "gate": gate, "message": msg})
    S = lambda gate, msg, line=0: f.append({"file": path, "line": line, "severity": "soft", "gate": gate, "message": msg})
    # basics
    if not p.lang: H("lang", "<html> has no lang attribute (WCAG 3.1.1)")
    t = p.title.strip()
    if not (10 <= len(t) <= 70): H("title", f"title length {len(t)} (want 10-70): {t[:60]!r}")
    if p.desc is None: H("meta-description", "missing meta description")
    elif not (50 <= len(p.desc) <= 160): H("meta-description", f"meta description length {len(p.desc)} (want 50-160)")
    if p.viewport is None: H("viewport", "missing viewport meta")
    else:
        vp = p.viewport.replace(" ", "").lower()
        m = re.search(r"maximum-scale=([\d.]+)", vp)
        if "user-scalable=no" in vp or "user-scalable=0" in vp or (m and float(m.group(1)) < 2):
            H("zoom-disabled", f"viewport blocks zoom ({p.viewport}); WCAG 1.4.4 requires zoom to work")
    if p.h1 != 1: H("h1", f"{p.h1} h1 elements (want exactly 1)")
    # images and media
    for line, a in p.imgs:
        if "alt" not in a: H("img-alt", f"<img src={a.get('src','?')!r}> has no alt (WCAG 1.1.1)", line)
        elif a["alt"].strip() == "" and (a.get("role") or "").lower() != "presentation" and (a.get("aria-hidden") or "") != "true":
            S("img-alt", "empty alt without role=presentation (fine only if decorative)", line)
    for line, a in p.audios:
        if "autoplay" in a: H("autoplay-audio", "audio element autoplays (WCAG 1.4.2)", line)
    for line, a in p.videos:
        if "autoplay" in a:
            if "muted" not in a: H("autoplay-sound", "autoplaying video is not muted (WCAG 1.4.2)", line)
            if "loop" in a and p.pause_controls == 0: H("pause-control", "looping autoplay video and no pause button on the page (WCAG 2.2.2)", line)
        if "controls" not in a and (a.get("aria-hidden") or "") != "true":
            S("video-semantics", "video without controls should be aria-hidden decorative, or carry a text equivalent", line)
    # visible text tells
    for line, data in p.text:
        if EM_DASH in data: H("em-dash", f"em dash in visible text: {data.strip()[:70]!r}", line)
        if SCROLL_CUE.search(data): H("scroll-cue", f"scroll cue text: {data.strip()[:60]!r}", line)
        if COUNTER_HARD.search(data): H("section-counter", f"zero-padded section counter: {data.strip()[:30]!r}", line)
        elif COUNTER_SOFT.search(data): S("section-counter", f"possible counter: {data.strip()[:30]!r}", line)
        if PLACEHOLDER.search(data): H("placeholder", f"placeholder text left in copy: {data.strip()[:60]!r}", line)
    # links
    for line, href in p.links:
        if re.match(r"^(https?:|mailto:|tel:|#|data:|javascript:)", href, re.I):
            if href.startswith("#") and len(href) > 1 and href[1:] not in p.ids: H("broken-anchor", f"in-page link target missing: {href}", line)
            continue
        target = os.path.normpath(os.path.join(os.path.dirname(path), href.split("#")[0].split("?")[0]))
        if href.startswith("/"): target = os.path.normpath(os.path.join(root, href.lstrip("/")))
        if not os.path.exists(target): H("broken-link", f"local link does not resolve: {href}", line)
    # WCAG structure
    if not p.first_focusable or not p.first_focusable[1].startswith("#") or p.first_focusable[1][1:] not in p.ids:
        H("skip-link", f"first focusable element is not a skip link to an existing id (found {p.first_focusable}); WCAG 2.4.1")
    for lm in ("header", "main", "footer"):
        if not p.landmarks.get(lm): H("landmarks", f"missing <{lm}> landmark (WCAG 1.3.1)")
    if p.landmarks.get("main", 0) > 1: H("landmarks", f"{p.landmarks['main']} <main> elements")
    for c in p.controls:
        if not (c["aria"] or c["wrapped"] or (c["id"] and c["id"] in p.label_for)):
            H("form-label", f"<{c['tag']} name={c['name']!r}> has no label (WCAG 1.3.1, 3.3.2, 4.1.2)", c["line"])
    for line, tag, ti in p.tabindex_pos: H("tabindex", f"positive tabindex={ti} on <{tag}> breaks focus order (WCAG 2.4.3)", line)
    for line, s in p.scripts:
        if OVERLAY.search(s): H("overlay-widget", f"accessibility overlay script {s!r}: overlays do not make a site conformant; remove it", line)
    if OVERLAY.search(src) and not any(OVERLAY.search(s) for _, s in p.scripts): H("overlay-widget", "accessibility overlay vendor referenced in the page; remove it")
    # CSS inside the page
    for line, css in p.styles: f += check_css_text(css, path, line)
    # SEO softs
    if not p.canonical: S("seo", "no canonical link")
    if not {"og:title", "og:description"} <= p.og: S("seo", "missing og:title/og:description")
    if p.jsonld == 0: S("seo", "no JSON-LD block")
    # footer: legal links and copyright on every page
    fl = " ".join(p.footer_links).lower()
    for key, fname in LEGAL_PAGES.items():
        if fname not in fl: H("footer-legal-links", f"footer has no link to {fname}")
    ft = " ".join(p.footer_text)
    if not re.search(r"(©|&copy;|copyright)", ft, re.I) or str(YEAR) not in ft:
        H("copyright", f"footer has no copyright line with the current year ({YEAR})")
    for line, key in p.legal_todos: S("legal-todo", f"launch blocker: legal fact '{key}' not supplied", line)
    words = sum(len(d.split()) for _, d in p.text)
    return f, {"title": t, "h1": p.h1, "words": words, "imgs": len(p.imgs), "links": len(p.links), "jsonld": p.jsonld,
               "legal_todos": [k for _, k in p.legal_todos], "text": " ".join(d for _, d in p.text)}


def check_css_text(css, path, base_line=0):
    f = []
    for rx, msg in CSS_HARD:
        for m in rx.finditer(css):
            f.append({"file": path, "line": base_line + css[: m.start()].count("\n"), "severity": "hard", "gate": "css", "message": msg})
    for rx, msg in CSS_SOFT:
        for m in rx.finditer(css):
            f.append({"file": path, "line": base_line + css[: m.start()].count("\n"), "severity": "soft", "gate": "css", "message": msg})
    return f


def site_checks(root, pages, css_text):
    """Whole-site legal and motion checks, run when the root holds index.html."""
    f = []
    H = lambda gate, msg, file=root: f.append({"file": file, "line": 0, "severity": "hard", "gate": gate, "message": msg})
    for key, fname in LEGAL_PAGES.items():
        if fname not in pages: H("legal-pages", f"{fname} missing (every site ships privacy, terms and accessibility pages)")
    priv = pages.get("privacy.html", {}).get("text", "")
    if priv:
        pf = os.path.join(root, "privacy.html")
        if not re.search(r"effective date", priv, re.I): H("privacy-calOPPA", "privacy policy has no effective date (Bus. & Prof. Code 22575(b)(4))", pf)
        if not re.search(r"do not track", priv, re.I): H("privacy-calOPPA", "privacy policy does not say how the site responds to Do Not Track (22575(b)(5))", pf)
        if not re.search(r"third part", priv, re.I): H("privacy-calOPPA", "privacy policy does not address third-party collection (22575(b)(1),(6))", pf)
        if not re.search(r"chang", priv, re.I): H("privacy-calOPPA", "privacy policy does not say how changes are notified (22575(b)(3))", pf)
        if not re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", priv) and "contact-email" not in pages["privacy.html"]["legal_todos"]:
            H("privacy-contact", "privacy policy has no contact email (or a contact-email launch-blocker marker)", pf)
    terms = pages.get("terms.html", {}).get("text", "")
    if terms and not re.search(r"effective date", terms, re.I): H("terms-date", "terms of use have no effective date", os.path.join(root, "terms.html"))
    acc = pages.get("accessibility.html", {}).get("text", "")
    if acc:
        af = os.path.join(root, "accessibility.html")
        if not re.search(r"WCAG", acc): H("a11y-statement", "accessibility statement does not name the standard (WCAG 2.2 AA)", af)
        if not re.search(r"last reviewed|last updated", acc, re.I): H("a11y-statement", "accessibility statement has no review date", af)
        if not re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", acc) and "contact-email" not in pages["accessibility.html"]["legal_todos"]:
            H("a11y-statement", "accessibility statement has no way to report a barrier", af)
        if re.search(r"100%\s*(compliant|accessible)|fully compliant|ADA certified", acc, re.I): H("a11y-statement", "accessibility statement overclaims (no such certification exists)", af)
    if re.search(r"@keyframes|transition\s*:|animation\s*:|scroll-timeline|view-timeline", css_text) and "prefers-reduced-motion" not in css_text:
        H("reduced-motion", "site animates but no CSS honours prefers-reduced-motion (WCAG 2.3.3)")
    return f


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--root", required=True); ap.add_argument("--json", action="store_true"); ap.add_argument("files", nargs="*")
    a = ap.parse_args(); root = os.path.abspath(a.root)
    files = a.files or sorted(
        os.path.join(dp, fn) for dp, dn, fns in os.walk(root) for fn in fns
        if fn.endswith((".html", ".css")) and "/lab" not in dp and fn not in ("scrollcraft.css", "scrollcraft.js"))
    findings, pages, css_all = [], {}, ""
    for fp in files:
        if fp.endswith(".html"):
            ff, meta = check_html(fp, root); findings += ff; pages[os.path.relpath(fp, root)] = meta
            css_all += open(fp, encoding="utf-8", errors="replace").read()
        else:
            txt = open(fp, encoding="utf-8", errors="replace").read(); css_all += txt
            findings += check_css_text(txt, fp, 1)
    if os.path.exists(os.path.join(root, "index.html")):
        for extra in ("scrollcraft.css",):
            ep = os.path.join(root, extra)
            if os.path.exists(ep): css_all += open(ep, encoding="utf-8", errors="replace").read()
        findings += site_checks(root, pages, css_all)
    hard = [x for x in findings if x["severity"] == "hard"]; soft = [x for x in findings if x["severity"] == "soft"]
    for m in pages.values(): m.pop("text", None)
    launch_blockers = sorted({k for m in pages.values() for k in m["legal_todos"]})
    out = {"root": root, "files": len(files), "pages": pages, "hard": len(hard), "soft": len(soft), "launch_blockers": launch_blockers, "findings": findings}
    if a.json: print(json.dumps(out, indent=1))
    else:
        print(f"html-checks: {len(files)} files, {len(hard)} hard, {len(soft)} soft" + (f"; launch blockers: {', '.join(launch_blockers)}" if launch_blockers else ""))
        for x in findings: print(f" [{x['severity']:4}] {os.path.relpath(x['file'], root)}:{x['line']} {x['gate']}: {x['message']}")
    sys.exit(1 if hard else 0)


if __name__ == "__main__":
    main()
