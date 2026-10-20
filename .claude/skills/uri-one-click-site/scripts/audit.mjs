// Accessibility and data-practice audit for every page of a built site.
// - axe-core (WCAG 2.0/2.1/2.2 A and AA rule tags) at 1440, 390 and 320 px
// - keyboard walk: Tab through the page, check each stop has a visible focus change,
//   is not hidden behind sticky chrome (2.4.11), and that focus never gets stuck (2.1.2)
// - reflow at 320 px (1.4.10) and the WCAG text-spacing override (1.4.12)
// - data inventory: third-party hosts, cookies, localStorage keys, forms and their fields,
//   mailto/tel links (feeds the privacy-policy gate in verify.sh)
// Resolves playwright-core and axe-core from the cwd (the project root), like shoot.mjs.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const base = arg("--url", "http://localhost:4500/");
const pages = (arg("--pages", "index.html")).split(",").filter(Boolean);
const chrome = arg("--chrome", process.env.SCROLLCRAFT_CHROME);
const outA11y = arg("--out-a11y", "a11y.json");
const outInv = arg("--out-inventory", "data-inventory.json");
const maxTabs = parseInt(arg("--max-tabs", "250"), 10);

const req = createRequire(path.join(process.cwd(), "package.json"));
let chromium, axePath;
try { ({ chromium } = req("playwright-core")); } catch { console.error("playwright-core not found from " + process.cwd()); process.exit(2); }
try { axePath = req.resolve("axe-core/axe.min.js"); } catch { console.error("axe-core not found from " + process.cwd() + " (npm i --no-save axe-core)"); process.exit(2); }

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const TEXT_SPACING = `*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}p{margin-bottom:2em!important}`;
const baseHost = new URL(base).host;
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const a11y = { base, tags: TAGS, pages: {} };
const inv = { base, pages: {}, third_party_hosts: {}, cookies: {}, local_storage_keys: [], forms: [], mailto: [], tel: [] };

async function axeRun(page) {
  await page.addScriptTag({ path: axePath });
  return await page.evaluate(async (tags) => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "incomplete"] });
    const slim = (v) => ({ id: v.id, impact: v.impact, help: v.help, tags: v.tags.filter(t => t.startsWith("wcag")), nodes: v.nodes.length,
                           targets: v.nodes.slice(0, 5).map(n => n.target.join(" ")) });
    return { violations: r.violations.map(slim), incomplete: r.incomplete.map(slim) };
  }, TAGS);
}

async function overflow(page) {
  return await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function clippedText(page) {
  return await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (!/(hidden|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
      const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join("");
      if (!own) continue;
      if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
        out.push((el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : "")).slice(0, 80));
      }
    }
    return out.slice(0, 20);
  });
}

async function keyboardWalk(page) {
  // Snapshot unfocused styles of every focusable element first.
  await page.evaluate(() => {
    const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';
    const props = ["outlineStyle", "outlineWidth", "outlineColor", "boxShadow", "borderTopColor", "borderBottomColor", "borderBottomWidth", "backgroundColor", "color", "textDecorationLine", "transform", "opacity"];
    const snap = (el) => { const o = {}; const cs = getComputedStyle(el); for (const p of props) o[p] = cs[p];
      for (const pe of ["::before", "::after"]) { const c = getComputedStyle(el, pe); o[pe] = [c.content, c.outlineStyle, c.boxShadow, c.backgroundColor, c.opacity, c.transform, c.borderBottomColor].join("|"); } return o; };
    window.__snap = snap; window.__base = new Map();
    for (const el of document.querySelectorAll(sel)) window.__base.set(el, snap(el));
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  });
  const stops = []; let last = null; let stuck = 0; let trap = null;
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(40);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { body: true };
      const before = window.__base.get(el) || null; const now = window.__snap(el);
      const changed = before ? Object.keys(now).filter(k => now[k] !== before[k]) : ["(no baseline)"];
      const r = el.getBoundingClientRect();
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2]];
      const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0 && r.height > 0;
      const hits = inView ? pts.filter(([x, y]) => { const h = document.elementFromPoint(Math.min(Math.max(x, 0), innerWidth - 1), Math.min(Math.max(y, 0), innerHeight - 1)); return h && (h === el || el.contains(h) || h.contains(el)); }).length : -1;
      const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("href") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 60);
      const key = el.tagName + "|" + label + "|" + Math.round(r.top + scrollY);
      return { key, tag: el.tagName.toLowerCase(), label, changed, obscured: hits === 0, size: [Math.round(r.width), Math.round(r.height)] };
    });
    if (info.body) { if (stops.length) break; else continue; }
    if (stops.length && info.key === stops[0].key) break;            // wrapped around: walk complete
    if (last && info.key === last) { stuck++; if (stuck >= 3) { trap = info.label; break; } } else stuck = 0;
    if (!last || info.key !== last) stops.push(info);
    last = info.key;
  }
  return { stops: stops.length, invisible: stops.filter(s => !s.changed.length).map(s => `${s.tag} "${s.label}"`),
           obscured: stops.filter(s => s.obscured).map(s => `${s.tag} "${s.label}"`), trap };
}

for (const rel of pages) {
  const url = new URL(rel, base).toString();
  const pres = { url, viewports: {} };
  // 1440: axe, keyboard walk, text spacing, inventory
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const hosts = {};
    page.on("request", (r) => { try { const h = new URL(r.url()).host; if (h && h !== baseHost && !r.url().startsWith("data:")) hosts[h] = (hosts[h] || 0) + 1; } catch {} });
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const axe = await axeRun(page);
    const walk = await keyboardWalk(page);
    // scroll to the end so lazy and scroll-triggered requests happen, then read storage
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
    await page.waitForTimeout(400);
    const dom = await page.evaluate(() => ({
      ls: Object.keys(localStorage), ss: Object.keys(sessionStorage),
      forms: [...document.forms].map(f => ({ action: f.getAttribute("action") || "", method: (f.getAttribute("method") || "get").toLowerCase(),
        fields: [...f.elements].filter(e => e.name || e.id).map(e => ({ name: e.name || e.id, type: (e.type || e.tagName).toLowerCase(), autocomplete: e.getAttribute("autocomplete") || "" })).filter(x => !["submit", "button", "hidden", "reset"].includes(x.type)) })),
      mailto: [...document.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute("href").replace(/^mailto:/, "").split("?")[0]),
      tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a => a.getAttribute("href").replace(/^tel:/, "")),
    }));
    const cookies = await ctx.cookies();
    await page.addStyleTag({ content: TEXT_SPACING }); await page.waitForTimeout(150);
    const tsOverflow = await overflow(page); const tsClipped = await clippedText(page);
    pres.viewports["1440"] = { axe, keyboard: walk, text_spacing: { overflow: tsOverflow, clipped: tsClipped } };
    inv.pages[rel] = { third_party_hosts: hosts, cookies: cookies.map(c => ({ name: c.name, domain: c.domain })), local_storage: dom.ls, session_storage: dom.ss, forms: dom.forms };
    for (const [h, n] of Object.entries(hosts)) inv.third_party_hosts[h] = (inv.third_party_hosts[h] || 0) + n;
    for (const c of cookies) inv.cookies[c.name] = c.domain;
    inv.local_storage_keys.push(...dom.ls.filter(k => !inv.local_storage_keys.includes(k)));
    for (const f of dom.forms) inv.forms.push({ page: rel, ...f });
    inv.mailto.push(...dom.mailto.filter(m => !inv.mailto.includes(m))); inv.tel.push(...dom.tel.filter(m => !inv.tel.includes(m)));
    await ctx.close();
  }
  // 390: axe
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage(); await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(400);
    pres.viewports["390"] = { axe: await axeRun(page) }; await ctx.close();
  }
  // 320: reflow + text spacing
  {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await ctx.newPage(); await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(400);
    const ov = await overflow(page);
    await page.addStyleTag({ content: TEXT_SPACING }); await page.waitForTimeout(150);
    pres.viewports["320"] = { reflow_overflow: ov, text_spacing: { overflow: await overflow(page), clipped: await clippedText(page) } };
    await ctx.close();
  }
  a11y.pages[rel] = pres;
  const v = pres.viewports["1440"];
  const serious = ["1440", "390"].flatMap(k => pres.viewports[k].axe.violations.filter(x => ["critical", "serious"].includes(x.impact)));
  console.error(`[audit] ${rel}: axe serious/critical ${serious.length}; focus stops ${v.keyboard.stops}, invisible ${v.keyboard.invisible.length}, obscured ${v.keyboard.obscured.length}${v.keyboard.trap ? ", TRAP at " + v.keyboard.trap : ""}; reflow320 ${pres.viewports["320"].reflow_overflow}px`);
}
await browser.close();
fs.writeFileSync(outA11y, JSON.stringify(a11y, null, 1));
fs.writeFileSync(outInv, JSON.stringify(inv, null, 1));
console.log(JSON.stringify({ pages: pages.length, out_a11y: outA11y, out_inventory: outInv }));
