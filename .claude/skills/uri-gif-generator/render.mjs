#!/usr/bin/env node
// Render a gifkit infographic page to a looping GIF (and optionally MP4 / PNG stills).
//
//   node render.mjs page.html                       -> page.gif + page.png (poster)
//   node render.mjs page.html --stills 0.6,1.8,3.5  -> PNG stills only (fast design review)
//   node render.mjs page.html --fps 15 --width 1080 --mp4 --out out/name.gif
//   node render.mjs --doctor                         -> check node, ffmpeg, playwright, chromium
//
// Requires: Chromium via Playwright, and ffmpeg on PATH.
import { createRequire } from "node:module";
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNTIME = join(HERE, "runtime");

function parseArgs(argv) {
  const opts = { fps: null, width: null, scale: 2, mp4: false, mp4Repeat: 3, poster: true, keep: false, stills: null, dither: "none", colors: 256, out: null, bundle: false };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === "--fps") opts.fps = +next();
    else if (a === "--width") opts.width = +next();
    else if (a === "--scale") opts.scale = +next();
    else if (a === "--out") opts.out = next();
    else if (a === "--mp4") opts.mp4 = true;
    else if (a === "--mp4-repeat") opts.mp4Repeat = +next();
    else if (a === "--no-poster") opts.poster = false;
    else if (a === "--keep-frames") opts.keep = true;
    else if (a === "--stills") opts.stills = next().split(",").map(Number);
    else if (a === "--dither") opts.dither = next();
    else if (a === "--colors") opts.colors = +next();
    else if (a === "--bundle") opts.bundle = true;
    else if (a === "--doctor") opts.doctor = true;
    else if (a === "-h" || a === "--help") { console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 8).join("\n")); process.exit(0); }
    else pos.push(a);
  }
  if (opts.doctor) return opts;
  if (!pos[0]) throw new Error("usage: node render.mjs page.html [--out x.gif] [--fps 15] [--width 1080] [--stills 0.5,2] [--mp4] [--bundle]");
  opts.input = resolve(pos[0]);
  return opts;
}

function loadPlaywright() {
  const tries = [() => createRequire(import.meta.url)("playwright")];
  try {
    const root = execSync("npm root -g", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    tries.push(() => createRequire(join(root, "noop.js"))("playwright"));
  } catch {}
  for (const t of tries) { try { return t(); } catch {} }
  throw new Error("Playwright not found. Install it with: npm i -g playwright && npx playwright install chromium");
}

async function launch(chromium) {
  try { return await chromium.launch(); } catch (err) {
    const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/pw-browsers"].filter(Boolean);
    for (const r of roots) {
      if (!existsSync(r)) continue;
      for (const d of readdirSync(r).filter((n) => n.startsWith("chromium")).sort().reverse()) {
        for (const exe of ["chrome-linux/chrome", "chrome-linux/headless_shell", "chrome-linux64/chrome", "chrome-headless-shell-linux64/chrome-headless-shell"]) {
          const p = join(r, d, exe);
          if (existsSync(p)) { try { return await chromium.launch({ executablePath: p }); } catch {} }
        }
      }
    }
    throw err;
  }
}

function bundleHtml(input, out) {
  let html = readFileSync(input, "utf8");
  const css = readFileSync(join(RUNTIME, "gifkit.css"), "utf8").replace(/url\("fonts\/([^"]+)"\)/g, (_, f) =>
    `url("data:font/woff2;base64,${readFileSync(join(RUNTIME, "fonts", f)).toString("base64")}")`);
  html = html.replace(/<link[^>]+href="[^"]*gifkit\.css"[^>]*>/, () => `<style>\n${css}\n</style>`);
  html = html.replace(/<script[^>]+src="[^"]*gifkit\.js"[^>]*><\/script>/, () => `<script>\n${readFileSync(join(RUNTIME, "gifkit.js"), "utf8")}\n</script>`);
  writeFileSync(out, html);
  return out;
}

const mb = (f) => (statSync(f).size / 1048576).toFixed(2) + " MB";

const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".json": "application/json" };

// Static server rooted at the page's folder; gifkit.css / gifkit.js fall back to the kit's runtime.
function serve(root) {
  return new Promise((ok) => {
    const srv = createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, "");
      let file = resolve(root, rel);
      if (!file.startsWith(resolve(root)) || !existsSync(file) || statSync(file).isDirectory()) {
        const name = basename(rel);
        const asset = resolve(RUNTIME, rel); // e.g. fonts/Inter-Bold.woff2, referenced from gifkit.css
        if (name === "gifkit.css" || name === "gifkit.js") file = join(RUNTIME, name);
        else if (asset.startsWith(RUNTIME + "/") && existsSync(asset) && !statSync(asset).isDirectory()) file = asset;
        else file = null;
      }
      if (!file) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(readFileSync(file));
    });
    srv.listen(0, "127.0.0.1", () => { srv.unref(); ok({ url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() }); });
  });
}

async function doctor() {
  let ok = true;
  const say = (good, msg, fix) => { console.log(`${good ? "ok     " : "MISSING"} ${msg}`); if (!good) { ok = false; if (fix) console.log(`        fix: ${fix}`); } };
  const major = +process.versions.node.split(".")[0];
  say(major >= 18, `node ${process.versions.node}`, "install Node 18 or newer (https://nodejs.org)");
  let ff = "";
  try { ff = execFileSync("ffmpeg", ["-version"], { stdio: ["ignore", "pipe", "ignore"] }).toString().split("\n")[0]; } catch {}
  say(!!ff, ff || "ffmpeg", "macOS: brew install ffmpeg | Debian/Ubuntu: apt-get install -y ffmpeg");
  let pw = null;
  try { pw = loadPlaywright(); } catch {}
  say(!!pw, "playwright (node module)", "npm i -g playwright   (then re-run --doctor)");
  if (pw) {
    try { const b = await launch(pw.chromium); await b.close(); say(true, "chromium launches headless"); }
    catch (e) { say(false, "chromium launches headless", "npx playwright install chromium   (cloud sessions normally ship it in /opt/pw-browsers)"); }
  }
  const fonts = existsSync(join(RUNTIME, "fonts", "Inter-Bold.woff2"));
  say(fonts, "bundled Inter fonts", "the skill folder is incomplete; reinstall the skill");
  console.log(ok ? "\nall good: ready to render" : "\nfix the MISSING items above, then run --doctor again");
  process.exit(ok ? 0 : 1);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.doctor) return doctor();
  const stem = o.out ? resolve(o.out).replace(/\.gif$/i, "") : join(dirname(o.input), basename(o.input, extname(o.input)));
  mkdirSync(dirname(stem), { recursive: true });
  if (o.bundle) { console.log("standalone html:", bundleHtml(o.input, stem + ".standalone.html")); return; }

  const { chromium } = loadPlaywright();
  const browser = await launch(chromium);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: o.scale });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__GIFKIT_RENDER__ = true; });
  const server = await serve(dirname(o.input));
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") errors.push(m.text()); });

  await page.goto(`${server.url}/${encodeURIComponent(basename(o.input))}`, { waitUntil: "load" });
  const info = await page.evaluate(() => window.gifkit.ready);
  await page.setViewportSize({ width: info.width, height: info.height });
  await page.evaluate(() => window.gifkit.relayout());
  const overflow = await page.evaluate(() => {
    const c = document.querySelector("[data-gifkit]") || document.querySelector(".canvas");
    const bad = [];
    c.querySelectorAll("*").forEach((el) => {
      if (el.closest("svg")) return;
      if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow === "visible" && el.clientWidth > 0 && !el.classList.contains("hl")) bad.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} overflows by ${el.scrollWidth - el.clientWidth}px`);
    });
    const last = [...c.children].filter((e) => !(e instanceof SVGElement)).pop();
    if (last && last.getBoundingClientRect().bottom > c.getBoundingClientRect().bottom + 1) bad.push("content runs past the bottom of the canvas");
    return bad.slice(0, 12);
  });
  for (const e of [...errors, ...overflow]) console.warn("warning:", e);

  const fps = o.fps || info.fps;
  const clip = { x: 0, y: 0, width: info.width, height: info.height };
  const shoot = async (t, path) => {
    await page.evaluate((tt) => window.gifkit.renderAt(tt), t);
    await page.screenshot({ path, clip, type: "png" });
  };

  if (o.stills) {
    for (const t of o.stills) { const p = `${stem}.t${t.toFixed(2)}.png`; await shoot(t, p); console.log("still:", p); }
    await browser.close();
    return;
  }

  const frames = Math.round(info.loop * fps);
  const dir = mkdtempSync(join(tmpdir(), "gifkit-"));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) await shoot(i / fps, join(dir, `f_${String(i).padStart(5, "0")}.png`));
  const holdT = await page.evaluate(() => {
    const c = document.querySelector("[data-gifkit]") || document.querySelector(".canvas");
    const loop = +c.dataset.loop || 4, rd = +c.dataset.resetDur || 0.45;
    return c.dataset.reset && c.dataset.reset !== "none" ? +c.dataset.reset - 0.02 : loop - rd - 0.12;
  });
  if (o.poster) { await shoot(holdT, stem + ".png"); }
  await browser.close();
  console.log(`captured ${frames} frames (${info.width}x${info.height} @${o.scale}x, ${fps} fps, ${info.loop}s loop) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const outW = o.width || info.width;
  const gif = stem + ".gif";
  execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(fps), "-i", join(dir, "f_%05d.png"),
    "-vf", `scale=${outW}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${o.colors}:stats_mode=full[p];[b][p]paletteuse=dither=${o.dither}:diff_mode=rectangle`,
    "-loop", "0", gif], { stdio: "inherit" });
  console.log("gif:", gif, mb(gif), `${outW}px wide`);
  if (o.mp4) {
    const mp4 = stem + ".mp4";
    execFileSync("ffmpeg", ["-v", "error", "-y", "-stream_loop", String(Math.max(0, o.mp4Repeat - 1)), "-framerate", String(fps), "-i", join(dir, "f_%05d.png"),
      "-vf", `scale=${outW}:-2:flags=lanczos,fps=30`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", mp4], { stdio: "inherit" });
    console.log("mp4:", mp4, mb(mp4));
  }
  if (o.poster) console.log("poster:", stem + ".png");
  if (o.keep) console.log("frames kept in", dir); else rmSync(dir, { recursive: true, force: true });
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
