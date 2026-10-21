#!/usr/bin/env bash
# uri-one-click-site preflight. Read-only: reports what the run can and cannot do.
# Exit 1 only on required failures.
set -u
ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
SK="$ROOT/.claude/skills"
ok(){ printf ' [ ok ] %-22s %s\n' "$1" "$2"; }
warn(){ printf ' [warn] %-22s %s\n' "$1" "$2"; WARN=$((WARN+1)); }
fail(){ printf ' [FAIL] %-22s %s\n' "$1" "$2"; FAIL=$((FAIL+1)); }
WARN=0; FAIL=0
echo "uri-one-click-site preflight  (project root: $ROOT)"; echo

# runtimes
if command -v node >/dev/null; then
  v=$(node -v); maj=${v#v}; maj=${maj%%.*}
  [ "$maj" -ge 18 ] && ok node "$v" || fail node "$v (need 18+)"
else fail node "not found"; fi
command -v python3 >/dev/null && ok python3 "$(python3 --version 2>&1)" || fail python3 "not found (pick-reference.py, html-checks.py)"
python3 -c 'import yaml' 2>/dev/null && ok pyyaml "present" || warn pyyaml "absent; pick-reference.py falls back to its own front-matter parser"

# sibling skills and library
[ -f "$SK/scroll-craft/SKILL.md" ] && ok scroll-craft "$SK/scroll-craft" || fail scroll-craft "missing: $SK/scroll-craft"
[ -f "$SK/impeccable/SKILL.md" ] && ok impeccable "$SK/impeccable" || fail impeccable "missing: $SK/impeccable"
if [ -d "$ROOT/.claude/design-md" ]; then
  n=$(find "$ROOT/.claude/design-md" -name DESIGN.md | wc -l); ok "design-md library" "$n brand files"
else warn "design-md library" "missing: $ROOT/.claude/design-md (Phase 2 lineage falls back to scroll-craft worlds.md)"; fi

# impeccable engine
L="$SK/impeccable/scripts/impeccable"
if [ -x "$L" ]; then
  p=$("$L" engine-probe 2>/dev/null | head -1 || true)
  case "$p" in impeccable-engine*) ok "impeccable engine" "$p" ;; *) warn "impeccable engine" "launcher present; engine not cached yet (first run downloads it, needs network to impeccable.style)" ;; esac
else fail "impeccable launcher" "not executable: $L"; fi

# chrome resolution (what verify.sh will use)
CHROME=""
for c in "${SCROLLCRAFT_CHROME:-}" /usr/bin/google-chrome /usr/bin/google-chrome-stable /usr/bin/chromium /usr/bin/chromium-browser /opt/pw-browsers/chromium "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
  [ -n "$c" ] && [ -x "$c" ] && { CHROME="$c"; break; }
done
[ -n "$CHROME" ] && ok chrome "$CHROME (export SCROLLCRAFT_CHROME=$CHROME)" || fail chrome "none found; install Chrome/Chromium or set SCROLLCRAFT_CHROME (no screenshots = no Phase 4)"
[ -n "$CHROME" ] && export SCROLLCRAFT_CHROME="$CHROME"

# scroll-craft's own preflight (ffmpeg, playwright, chrome, key, workspace)
if [ -f "$SK/scroll-craft/scripts/doctor.mjs" ]; then
  echo; echo " scroll-craft doctor:"; (cd "$ROOT" && node "$SK/scroll-craft/scripts/doctor.mjs" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | sed 's/^/   /'); echo
fi

# playwright-core must resolve from the project root (shoot.mjs resolves from cwd)
(cd "$ROOT" && node -e "require.resolve('playwright-core')" 2>/dev/null) && ok playwright-core "resolves from $ROOT" || warn playwright-core "not resolvable from $ROOT; run: cd $ROOT && npm i --no-save --no-package-lock playwright-core axe-core (install both in ONE command: npm --no-save prunes anything not named)"

# axe-core for the accessibility audit (WCAG 2.2 AA rules)
(cd "$ROOT" && node -e "require.resolve('axe-core/axe.min.js')" 2>/dev/null) && ok axe-core "$(cd "$ROOT" && node -p "require('axe-core/package.json').version") resolves from $ROOT" || fail axe-core "not resolvable from $ROOT; run: cd $ROOT && npm i --no-save --no-package-lock playwright-core axe-core (install both in ONE command: npm --no-save prunes anything not named)"

# root + sandbox
if [ "$(id -u)" = "0" ]; then
  U=""
  for cand in ubuntu $(awk -F: '$3>=1000 && $3<60000 && $7!~/nologin|false/{print $1}' /etc/passwd); do
    h=$(getent passwd "$cand" | cut -d: -f6); [ -n "$h" ] && [ -d "$h" ] && { U="$cand"; break; }
  done
  if [ -n "$U" ] && command -v runuser >/dev/null; then
    ok "root workaround" "shell is root; Chrome will run as '$U' with its sandbox on (verify.sh handles this; set ONE_CLICK_USER to override)"
  else
    fail "root workaround" "shell is root and no unprivileged user with a home dir + runuser found; Chrome will not start. Create a user (useradd -m runner) or run as non-root"
  fi
else ok user "$(id -un) (not root)"; fi

# generation
[ -n "${KIE_AI_API_KEY:-}" ] && ok "kie.ai key" "set (generation possible with --generate)" || ok "kie.ai key" "not set; runs use supplied assets and non-photographic worlds unless --generate and a key"

echo; echo " summary: $FAIL required failure(s), $WARN warning(s)"
[ "$FAIL" -eq 0 ]
