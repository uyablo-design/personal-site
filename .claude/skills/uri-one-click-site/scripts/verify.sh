#!/usr/bin/env bash
# uri-one-click-site verification runner: serve, shoot (desktop/mobile/reduced), detect, static checks, report.
# Usage: verify.sh --root <build> --out <dir> [--port 4500] [--steps 3] [--chrome <path>] [--no-sc-ready]
set -u
ROOT=""; OUT=""; PORT=4500; STEPS=3; CHROME="${SCROLLCRAFT_CHROME:-}"; EXPECT_READY=1
while [ $# -gt 0 ]; do case "$1" in
  --root) ROOT="$2"; shift 2;; --out) OUT="$2"; shift 2;; --port) PORT="$2"; shift 2;; --steps) STEPS="$2"; shift 2;;
  --chrome) CHROME="$2"; shift 2;; --no-sc-ready) EXPECT_READY=0; shift;; *) echo "unknown arg $1"; exit 2;; esac; done
[ -n "$ROOT" ] && [ -n "$OUT" ] || { echo "usage: verify.sh --root <build> --out <dir>"; exit 2; }
ROOT=$(cd "$ROOT" && pwd); mkdir -p "$OUT"; OUT=$(cd "$OUT" && pwd)
PROJ=$(git -C "$ROOT" rev-parse --show-toplevel 2>/dev/null || pwd)
SK="$PROJ/.claude/skills"; HERE=$(cd "$(dirname "$0")" && pwd)
SC="$SK/scroll-craft/scripts"; IMP="$SK/impeccable/scripts/impeccable"
[ -f "$SC/shoot.mjs" ] || { echo "scroll-craft scripts not found at $SC"; exit 2; }

for c in "$CHROME" /usr/bin/google-chrome /usr/bin/google-chrome-stable /usr/bin/chromium /usr/bin/chromium-browser /opt/pw-browsers/chromium; do
  [ -n "$c" ] && [ -x "$c" ] && { CHROME="$c"; break; }; done
[ -x "$CHROME" ] || { echo "no Chrome found; set SCROLLCRAFT_CHROME"; exit 2; }

# Chrome refuses to run as root with its sandbox on. Run the browser steps as an unprivileged user instead.
RUN=""; SHOT_OUT="$OUT"
if [ "$(id -u)" = "0" ]; then
  U="${ONE_CLICK_USER:-}"
  if [ -z "$U" ]; then for cand in ubuntu $(awk -F: '$3>=1000 && $3<60000 && $7!~/nologin|false/{print $1}' /etc/passwd); do
    h=$(getent passwd "$cand" | cut -d: -f6); [ -n "$h" ] && [ -d "$h" ] && { U="$cand"; break; }; done; fi
  if [ -n "$U" ] && command -v runuser >/dev/null; then
    UH=$(getent passwd "$U" | cut -d: -f6); SHOT_OUT="$UH/.uri-one-click-site/$(date +%s)"
    mkdir -p "$SHOT_OUT"; chown -R "$U" "$UH/.uri-one-click-site"
    RUN="runuser -u $U -- env HOME=$UH PATH=$PATH SCROLLCRAFT_CHROME=$CHROME"
    runuser -u "$U" -- test -r "$ROOT/index.html" || echo "warn: $U cannot read $ROOT; screenshots may fail (chmod -R o+rX)"
    echo "root shell: running browser steps as '$U' (sandbox on), output staged in $SHOT_OUT"
  else echo "root shell and no unprivileged user/runuser available; Chrome will not start"; exit 2; fi
fi

cd "$PROJ"
node "$SC/serve.mjs" --root "$ROOT" --port "$PORT" > "$OUT/serve.log" 2>&1 & SERVER=$!
for i in $(seq 1 40); do node -e "fetch('http://localhost:$PORT/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" && break; sleep 0.25; done
URL="http://localhost:$PORT/"
echo "serving $ROOT at $URL (pid $SERVER)"

shoot(){ # name, extra args
  local name="$1"; shift
  $RUN node "$SC/shoot.mjs" --url "$URL" --out "$SHOT_OUT/$name" --steps "$STEPS" "$@" > "$OUT/shoot-$name.log" 2>&1; echo "shoot $name: exit $?"
}
shoot desktop --width 1440 --height 900
shoot mobile  --width 390  --height 844
shoot reduced --width 1440 --height 900 --reduced-motion
MEAS_ARGS=(--url "$URL" --chrome "$CHROME"); [ "$EXPECT_READY" = 1 ] && MEAS_ARGS+=(--expect-sc-ready)
$RUN node "$HERE/measure.mjs" "${MEAS_ARGS[@]}" > "$OUT/measure.json" 2> "$OUT/measure.log" || echo "measure: exit $?"
# Accessibility (axe-core WCAG 2.2 AA, keyboard walk, reflow 320, text spacing) and data inventory, every page
mapfile -t HTMLREL < <(cd "$ROOT" && find . -maxdepth 2 -name "*.html" ! -path "./lab/*" | sed 's#^\./##' | sort)
PAGELIST=$(IFS=,; echo "${HTMLREL[*]}")
$RUN node "$HERE/audit.mjs" --url "$URL" --pages "$PAGELIST" --chrome "$CHROME" --out-a11y "$SHOT_OUT/a11y.json" --out-inventory "$SHOT_OUT/data-inventory.json" > "$OUT/audit.out" 2> "$OUT/audit.log" || echo "audit: exit $?"
grep '^\[audit\]' "$OUT/audit.log" || true
kill "$SERVER" 2>/dev/null
if [ "$SHOT_OUT" != "$OUT" ]; then cp -r "$SHOT_OUT"/. "$OUT"/ && rm -rf "$SHOT_OUT"; fi

# Impeccable detector on page files only (engine css excluded)
mapfile -t PAGES < <(find "$ROOT" -maxdepth 2 \( -name "*.html" -o -name "*.css" \) ! -name scrollcraft.css ! -path "*/lab/*" | sort)
if [ -x "$IMP" ]; then "$IMP" detect --json "${PAGES[@]}" > "$OUT/detect.json" 2> "$OUT/detect.log" || true; else echo "[]" > "$OUT/detect.json"; fi
python3 "$HERE/html-checks.py" --root "$ROOT" --json "${PAGES[@]}" > "$OUT/html-checks.json" 2>/dev/null || true

PYTHONDONTWRITEBYTECODE=1 python3 - "$OUT" "$ROOT" "$HERE" <<'PY'
import json, os, re, sys
out, root, here = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, here)
from privacy_reconcile import reconcile, policy_text
def load(p, d):
    try: return json.load(open(p))
    except Exception: return d
def log(name):
    try: return open(os.path.join(out, f"shoot-{name}.log")).read()
    except Exception: return ""
gates = []
def gate(name, ok, detail): gates.append({"gate": name, "ok": bool(ok), "detail": detail})
meas = load(os.path.join(out, "measure.json"), {})
vps = {v["name"]: v for v in meas.get("viewports", [])}
for n in ("desktop", "mobile"):
    v = vps.get(n)
    if not v: gate(f"{n} loads", False, "measure.mjs produced no result (see measure.log)"); continue
    if v.get("ready") is not None: gate(f"{n} engine ready", v["ready"], "html.sc-ready " + ("seen" if v["ready"] else "never appeared"))
    gate(f"{n} no horizontal overflow", v["overflow"] <= 0, f"{v['overflow']}px")
    gate(f"{n} no page errors", not v["errors"], "; ".join(v["errors"])[:300] or "none")
    fr = v.get("failedResources", [])
    gate(f"{n} all resources load", not fr, (", ".join(fr[:8]) + (f" (+{len(fr)-8} more)" if len(fr) > 8 else "")) or "none")
for n in ("desktop", "mobile", "reduced"):
    t = log(n); sheet = os.path.exists(os.path.join(out, n, "sheet.png"))
    gate(f"{n} strip shot", sheet, os.path.join(out, n, "sheet.png") if sheet else "no sheet.png (see shoot log)")
    if n != "reduced":
        gate(f"{n} no dead scroll", "no dead scroll" in t, "from shoot log")
        gate(f"{n} contrast over media", "all cues clear" in t, "from shoot log")
det = load(os.path.join(out, "detect.json"), [])
warn = [d for d in det if d.get("antipattern") == "low-contrast" and not d.get("advisory")]
adv = [d for d in det if d.get("advisory")]
other = [d for d in det if d.get("antipattern") != "low-contrast" and not d.get("advisory")]
gate("zero low-contrast warnings", not warn, f"{len(warn)} warning(s), {len(adv)} advisory")
hc = load(os.path.join(out, "html-checks.json"), {"hard": 0, "soft": 0, "findings": []})
gate("html-checks hard gates (incl. WCAG structure and legal set)", hc.get("hard", 1) == 0, f"{hc.get('hard')} hard, {hc.get('soft')} soft")
a11y = load(os.path.join(out, "a11y.json"), None)
if a11y is None: gate("accessibility audit ran", False, "a11y.json missing (see audit.log; is axe-core installed?)")
else:
    for rel, pr in sorted(a11y.get("pages", {}).items()):
        vp = pr["viewports"]
        sv = [f"{k}:{v['id']}x{v['nodes']}" for k in ("1440", "390") for v in vp[k]["axe"]["violations"] if v["impact"] in ("critical", "serious")]
        gate(f"{rel}: axe WCAG 2.2 AA, no serious/critical", not sv, ", ".join(sv[:8]) or "none")
        kb = vp["1440"]["keyboard"]
        gate(f"{rel}: visible focus on every tab stop", not kb["invisible"], f"{kb['stops']} stops; invisible: {', '.join(kb['invisible'][:5]) or 'none'}")
        gate(f"{rel}: focus never hidden by sticky chrome", not kb["obscured"], ", ".join(kb["obscured"][:5]) or "none")
        gate(f"{rel}: no keyboard trap", not kb["trap"], kb["trap"] or "none")
        gate(f"{rel}: reflow at 320px", vp["320"]["reflow_overflow"] <= 0, f"{vp['320']['reflow_overflow']}px overflow")
        ts = [vp["1440"]["text_spacing"], vp["320"]["text_spacing"]]
        gate(f"{rel}: text spacing override survives", all(t["overflow"] <= 0 and not t["clipped"] for t in ts),
             "; ".join(f"overflow {t['overflow']}px clipped {t['clipped'][:3]}" for t in ts))
inv = load(os.path.join(out, "data-inventory.json"), None)
priv = os.path.join(root, "privacy.html")
if inv is not None and os.path.exists(priv):
    rec = reconcile(inv, policy_text(priv))
    bad = [r for r in rec if not r["ok"]]
    gate("privacy policy matches the data inventory", not bad, "; ".join(f"{r['check']}: {r['detail']}" for r in bad[:6]) or
         f"{len(inv.get('third_party_hosts', {}))} third-party host(s), {len(inv.get('cookies', {}))} cookie(s), {len(inv.get('forms', []))} form(s), all disclosed")
report = {"root": root, "gates": gates, "pass": all(g["ok"] for g in gates), "detect": {"warnings": warn, "advisory": adv, "other": other}, "html_checks": hc, "measure": meas}
json.dump(report, open(os.path.join(out, "report.json"), "w"), indent=1)
lines = [f"# verify: {'PASS' if report['pass'] else 'FAIL'}  ({root})", ""]
for g in gates: lines.append(f"- [{'x' if g['ok'] else ' '}] {g['gate']}: {g['detail']}")
if warn: lines += ["", "## low-contrast warnings"] + [f"- {os.path.relpath(d['file'], root)}: {d.get('snippet','')}" for d in warn[:30]]
if other: lines += ["", "## other detector findings"] + [f"- {d.get('antipattern')}: {d.get('snippet', d.get('name',''))[:120]}" for d in other[:30]]
if hc.get("findings"): lines += ["", "## html-checks"] + [f"- [{x['severity']}] {os.path.relpath(x['file'], root)}:{x['line']} {x['gate']}: {x['message']}" for x in hc["findings"][:60]]
if inv is not None:
    lines += ["", "## data inventory", f"- third-party hosts: {', '.join(sorted(inv.get('third_party_hosts', {}))) or 'none'}",
              f"- cookies: {', '.join(sorted(inv.get('cookies', {}))) or 'none'}", f"- browser storage keys: {', '.join(inv.get('local_storage_keys', [])) or 'none'}",
              f"- forms: {len(inv.get('forms', []))}; mailto: {', '.join(inv.get('mailto', [])) or 'none'}"]
if hc.get("launch_blockers"):
    lines += ["", "## launch blockers (legal facts only the owner can supply)"] + [f"- {k}" for k in hc["launch_blockers"]]
lines += ["", f"Strips: {out}/desktop/sheet.png, {out}/mobile/sheet.png, {out}/reduced/sheet.png"]
open(os.path.join(out, "summary.md"), "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
sys.exit(0 if report["pass"] else 1)
PY
