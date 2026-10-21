#!/usr/bin/env python3
"""Shortlist DESIGN.md lineages from the library by sector words and measured mood.

Usage:
  pick-reference.py --query "words from the brief" --mood "light warm serif editorial" [--top 3] [--json]
  pick-reference.py --list            # every entry with its measured properties
"""
import argparse
import colorsys
import json
import os
import re
import sys

STOP = set("a an the and or of for to in on with by from at as is are be this that it its site website page brand company".split())
REGISTER = ["editorial", "product", "luxury", "playful", "minimal", "dense", "retro", "brutalist", "maximalist",
            "premium", "technical", "developer", "consumer", "enterprise", "warm", "cool", "dark", "light"]
SERIF_NAMES = ("serif", "tiempos", "copernicus", "georgia", "times", "garamond", "playfair", "fraunces", "freight",
               "caslon", "baskerville", "didot", "bodoni", "canela", "reckless", "editorial", "newsreader", "lora")


def find_library(explicit):
    if explicit:
        return explicit
    here = os.path.dirname(os.path.abspath(__file__))
    for c in (os.path.join(os.getcwd(), ".claude", "design-md"), os.path.normpath(os.path.join(here, "../../../design-md"))):
        if os.path.isdir(c):
            return c
    sys.exit("design-md library not found; pass --library")


def parse_front_matter(text):
    m = re.match(r"\s*---\n(.*?)\n---\n", text, re.S)
    if not m:
        return None
    raw = m.group(1)
    try:
        import yaml  # type: ignore
        return yaml.safe_load(raw)
    except Exception:
        return mini_yaml(raw)


def mini_yaml(raw):
    """Enough YAML for these files: nested maps of scalars, two to three levels."""
    root, stack = {}, [(-1, {})]
    stack[0] = (-1, root)
    for line in raw.splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        key, _, val = line.strip().partition(":")
        val = val.strip().strip('"').strip("'")
        while stack and indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]
        if val == "":
            node = {}
            parent[key] = node
            stack.append((indent, node))
        else:
            parent[key] = val
    return root


def hex_rgb(v):
    if not isinstance(v, str):
        return None
    m = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", v.strip())
    if not m:
        return None
    h = m.group(1)
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def luminance(rgb):
    def ch(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def temperature(rgb):
    h, s, v = colorsys.rgb_to_hsv(*rgb)
    if s < 0.04:
        r, g, b = rgb
        return "warm" if r - b > 0.008 else ("cool" if b - r > 0.008 else "neutral")
    deg = h * 360
    if deg < 70 or deg >= 300:
        return "warm"
    if 160 <= deg < 270:
        return "cool"
    return "neutral"


def face_class(family):
    f = str(family).lower()
    if "mono" in f:
        return "mono"
    if ("serif" in f and "sans" not in f.split("serif")[0][-5:]) or any(n in f for n in SERIF_NAMES):
        if "sans-serif" in f and not any(n in f for n in SERIF_NAMES if n != "serif"):
            return "sans"
        return "serif"
    return "sans"


def analyse(brand, data):
    colors = data.get("colors", {}) or {}
    typo = data.get("typography", {}) or {}
    canvas = hex_rgb(colors.get("canvas")) or hex_rgb(colors.get("background"))
    primary = hex_rgb(colors.get("primary"))
    display_key = next((k for k in typo if any(w in k for w in ("display", "hero", "heading-xl", "campaign"))), next(iter(typo), None))
    display = typo.get(display_key, {}) if display_key else {}
    family = str(display.get("fontFamily", "")).split(",")[0].strip("'\" ")
    return {
        "brand": brand,
        "name": data.get("name", brand),
        "tone": ("dark" if luminance(canvas) < 0.3 else "light") if canvas else "unknown",
        "temperature": temperature(canvas) if canvas else "unknown",
        "primary_temperature": temperature(primary) if primary else "unknown",
        "display_face": family or "unspecified",
        "face_class": face_class(display.get("fontFamily", "")),
        "type_steps": len(typo),
        "radius": list((data.get("rounded") or {}).values())[:5],
        "canvas": colors.get("canvas"), "primary": colors.get("primary"), "ink": colors.get("ink"),
        "description": re.sub(r"\s+", " ", str(data.get("description", "")))[:260],
    }


def score(entry, query_words, mood_words):
    desc = (entry["description"] + " " + entry["name"]).lower()
    s, hits = 0, []
    for w in query_words:
        if w in desc:
            s += 2; hits.append(w)
    for w in mood_words:
        if w in ("dark", "light") and entry["tone"] == w:
            s += 3; hits.append(w)
        elif w in ("warm", "cool") and entry["temperature"] == w:
            s += 2; hits.append(w)
        elif w in ("serif", "sans", "mono") and entry["face_class"] == w:
            s += 3; hits.append(w)
        elif w in REGISTER and w in desc:
            s += 2; hits.append(w)
    return s, hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--library")
    ap.add_argument("--query", default="")
    ap.add_argument("--mood", default="")
    ap.add_argument("--top", type=int, default=3)
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--list", action="store_true")
    a = ap.parse_args()
    lib = find_library(a.library)
    entries, prose_only = [], []
    for brand in sorted(os.listdir(lib)):
        f = os.path.join(lib, brand, "DESIGN.md")
        if not os.path.isfile(f):
            continue
        data = parse_front_matter(open(f, encoding="utf-8").read())
        if not data or not isinstance(data, dict) or not data.get("colors"):
            prose_only.append(brand)
            continue
        entries.append(analyse(brand, data))
    if a.list:
        for e in entries:
            print(f'{e["brand"]:16} {e["tone"]:5} {e["temperature"]:7} {e["face_class"]:5} {e["display_face"][:22]:22} {e["primary"]}')
        print(f"\nprose-only (no tokens): {', '.join(prose_only)}")
        return
    qw = [w for w in re.findall(r"[a-z0-9]+", a.query.lower()) if w not in STOP and len(w) > 2]
    mw = re.findall(r"[a-z]+", a.mood.lower())
    ranked = []
    for e in entries:
        s, hits = score(e, qw, mw)
        ranked.append((s, hits, e))
    ranked.sort(key=lambda t: (-t[0], t[2]["brand"]))
    top = ranked[: a.top]
    if a.json:
        print(json.dumps({"query": qw, "mood": mw, "candidates": [dict(e, score=s, matched=h) for s, h, e in top],
                          "prose_only": prose_only, "library": lib}, indent=2))
        return
    print(f"query={qw} mood={mw}  ({len(entries)} token-bearing entries, {len(prose_only)} prose-only)\n")
    for s, hits, e in top:
        print(f'{e["brand"]}  score {s}  matched {hits}')
        print(f'   {e["tone"]} canvas {e["canvas"]}, {e["temperature"]}; primary {e["primary"]} ({e["primary_temperature"]}); display {e["display_face"]} ({e["face_class"]}); {e["type_steps"]} type steps; radius {e["radius"]}')
        print(f'   {e["description"][:200]}\n   -> .claude/design-md/{e["brand"]}/DESIGN.md\n')
    print("Lineage only: inherit scale, contrast relationships, radius logic. Replace hue family, canvas temperature, display face, signature move.")


if __name__ == "__main__":
    main()
