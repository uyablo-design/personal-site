#!/usr/bin/env python3
"""Static checks for the uri-one-click-site gates. Usage: html-checks.py [--json] --root <build> [files...]
Without files, scans every .html and non-engine .css under --root (lab/ excluded).
Exit 1 when any hard finding exists."""
import argparse
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


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None; self.title = ""; self.in_title = False; self.desc = None; self.viewport = False
        self.h1 = 0; self.imgs = []; self.links = []; self.text = []; self.styles = []; self.in_style = False
        self.stack = []; self.landmarks = set(); self.canonical = False; self.og = set(); self.jsonld = 0; self.in_script_ld = False
        self.main_count = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs); line = self.getpos()[0]
        self.stack.append(tag)
        if tag == "html": self.lang = a.get("lang")
        elif tag == "title": self.in_title = True
        elif tag == "meta":
            n = (a.get("name") or a.get("property") or "").lower()
            if n == "description": self.desc = a.get("content", "")
            if n == "viewport": self.viewport = True
            if n.startswith("og:"): self.og.add(n)
        elif tag == "link" and (a.get("rel") or "").lower() == "canonical": self.canonical = True
        elif tag == "h1": self.h1 += 1
        elif tag == "img": self.imgs.append((line, a))
        elif tag == "a" and a.get("href"): self.links.append((line, a["href"]))
        elif tag == "style": self.in_style = True; self._style_buf = []
        elif tag == "script" and (a.get("type") or "").lower() == "application/ld+json": self.jsonld += 1
        if tag in ("header", "nav", "main", "footer"): self.landmarks.add(tag)
        if tag == "main": self.main_count += 1
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
        if data.strip(): self.text.append((self.getpos()[0], data))


def check_html(path, root):
    p = Page(); src = open(path, encoding="utf-8", errors="replace").read(); p.feed(src)
    f = []
    H = lambda gate, msg, line=0: f.append({"file": path, "line": line, "severity": "hard", "gate": gate, "message": msg})
    S = lambda gate, msg, line=0: f.append({"file": path, "line": line, "severity": "soft", "gate": gate, "message": msg})
    if not p.lang: H("lang", "<html> has no lang attribute")
    t = p.title.strip()
    if not (10 <= len(t) <= 70): H("title", f"title length {len(t)} (want 10-70): {t[:60]!r}")
    if p.desc is None: H("meta-description", "missing meta description")
    elif not (50 <= len(p.desc) <= 160): H("meta-description", f"meta description length {len(p.desc)} (want 50-160)")
    if not p.viewport: H("viewport", "missing viewport meta")
    if p.h1 != 1: H("h1", f"{p.h1} h1 elements (want exactly 1)")
    for line, a in p.imgs:
        if "alt" not in a: H("img-alt", f"<img src={a.get('src','?')!r}> has no alt", line)
        elif a["alt"].strip() == "" and (a.get("role") or "").lower() != "presentation": S("img-alt", "empty alt without role=presentation (fine only if decorative)", line)
    for line, data in p.text:
        if EM_DASH in data: H("em-dash", f"em dash in visible text: {data.strip()[:70]!r}", line)
        if SCROLL_CUE.search(data): H("scroll-cue", f"scroll cue text: {data.strip()[:60]!r}", line)
        if COUNTER_HARD.search(data): H("section-counter", f"zero-padded section counter: {data.strip()[:30]!r}", line)
        elif COUNTER_SOFT.search(data): S("section-counter", f"possible counter: {data.strip()[:30]!r}", line)
        if PLACEHOLDER.search(data): H("placeholder", f"placeholder text left in copy: {data.strip()[:60]!r}", line)
    for line, href in p.links:
        if re.match(r"^(https?:|mailto:|tel:|#|data:|javascript:)", href, re.I): continue
        target = os.path.normpath(os.path.join(os.path.dirname(path), href.split("#")[0].split("?")[0]))
        if href.startswith("/"): target = os.path.normpath(os.path.join(root, href.lstrip("/")))
        if not os.path.exists(target): H("broken-link", f"local link does not resolve: {href}", line)
    for line, css in p.styles: f += check_css_text(css, path, line)
    missing = {"header", "main", "footer"} - p.landmarks
    if missing: S("landmarks", f"missing landmarks: {sorted(missing)}")
    if p.main_count > 1: S("landmarks", f"{p.main_count} <main> elements")
    if not p.canonical: S("seo", "no canonical link")
    if not {"og:title", "og:description"} <= p.og: S("seo", "missing og:title/og:description")
    if p.jsonld == 0: S("seo", "no JSON-LD block")
    words = sum(len(d.split()) for _, d in p.text)
    return f, {"title": t, "h1": p.h1, "words": words, "imgs": len(p.imgs), "links": len(p.links), "jsonld": p.jsonld}


def check_css_text(css, path, base_line=0):
    f = []
    for rx, msg in CSS_HARD:
        for m in rx.finditer(css):
            f.append({"file": path, "line": base_line + css[: m.start()].count("\n"), "severity": "hard", "gate": "css", "message": msg})
    for rx, msg in CSS_SOFT:
        for m in rx.finditer(css):
            f.append({"file": path, "line": base_line + css[: m.start()].count("\n"), "severity": "soft", "gate": "css", "message": msg})
    return f


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--root", required=True); ap.add_argument("--json", action="store_true"); ap.add_argument("files", nargs="*")
    a = ap.parse_args(); root = os.path.abspath(a.root)
    files = a.files or sorted(
        os.path.join(dp, fn) for dp, dn, fns in os.walk(root) for fn in fns
        if fn.endswith((".html", ".css")) and "/lab" not in dp and fn not in ("scrollcraft.css", "scrollcraft.js"))
    findings, pages = [], {}
    for fp in files:
        if fp.endswith(".html"):
            ff, meta = check_html(fp, root); findings += ff; pages[os.path.relpath(fp, root)] = meta
        else:
            findings += check_css_text(open(fp, encoding="utf-8", errors="replace").read(), fp, 1)
    hard = [x for x in findings if x["severity"] == "hard"]; soft = [x for x in findings if x["severity"] == "soft"]
    out = {"root": root, "files": len(files), "pages": pages, "hard": len(hard), "soft": len(soft), "findings": findings}
    if a.json: print(json.dumps(out, indent=1))
    else:
        print(f"html-checks: {len(files)} files, {len(hard)} hard, {len(soft)} soft")
        for x in findings: print(f" [{x['severity']:4}] {os.path.relpath(x['file'], root)}:{x['line']} {x['gate']}: {x['message']}")
    sys.exit(1 if hard else 0)


if __name__ == "__main__":
    main()
