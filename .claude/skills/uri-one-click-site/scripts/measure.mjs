// Loads a page at two widths and reports engine readiness and horizontal overflow.
// Resolves playwright-core from cwd (the project root), like scroll-craft's shoot.mjs.
import path from "node:path";
import { createRequire } from "node:module";
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const url = arg("--url", "http://localhost:4500/");
const chrome = arg("--chrome", process.env.SCROLLCRAFT_CHROME);
const needReady = args.includes("--expect-sc-ready");
let chromium;
try { ({ chromium } = createRequire(path.join(process.cwd(), "package.json"))("playwright-core")); }
catch { console.error("playwright-core not found from " + process.cwd()); process.exit(2); }
const b = await chromium.launch({ executablePath: chrome, headless: true });
const out = { url, viewports: [] };
for (const [name, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width, height } });
  const p = await ctx.newPage();
  const errors = [];            // script errors and console errors that are not resource failures
  const failed = new Map();     // url -> status/reason, unique
  p.on("pageerror", (e) => errors.push(String(e.message || e)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  p.on("response", (r) => { if (r.status() >= 400) failed.set(r.url(), String(r.status())); });
  p.on("requestfailed", (r) => failed.set(r.url(), r.failure()?.errorText || "failed"));
  await p.goto(url, { waitUntil: "load" });
  let ready = null;
  if (needReady) { try { await p.waitForSelector("html.sc-ready", { timeout: 15000 }); ready = true; } catch { ready = false; } }
  await p.waitForTimeout(400);
  const m = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    h1: document.querySelectorAll("h1").length,
    title: document.title,
    height: document.documentElement.scrollHeight,
  }));
  const base = new URL(url);
  const failedResources = [...failed].map(([u, st]) => `${st} ${u.startsWith(base.origin) ? u.slice(base.origin.length + 1) : u}`);
  out.viewports.push({ name, width, height, ready, errors: [...new Set(errors)].slice(0, 10), failedResources: failedResources.slice(0, 30), ...m });
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 2));
