/*
 * gifkit.js: deterministic, loopable animation runtime for infographic GIFs.
 *
 * Every visual state is a pure function of time t (seconds), so the renderer
 * can seek to any frame and the GIF loops seamlessly. Open the page in a
 * browser to preview it live; render.mjs drives gifkit.renderAt(t) per frame.
 *
 * Canvas:   <div class="canvas" data-gifkit data-loop="4.4" data-reset="3.85" data-reset-dur="0.45">
 * Build:    data-anim="grow-x|grow-y|sweep|fade|rise|pop|draw|count|type|var"
 *           data-at (s), data-dur (s), data-ease (out|in|inout|back|linear), data-persist
 *           data-stagger on a parent offsets each animated descendant by index.
 * Wires:    <svg class="wires"><path data-wire data-from="#a" data-to="#b"/></svg>
 * Loops:    data-pulse="1.04" (scale amplitude), data-cycles (per loop)
 * Icons:    <i class="ic" data-icon="doc"></i>
 */
(() => {
  const EASE = {
    linear: (x) => x,
    in: (x) => x * x * x,
    out: (x) => 1 - Math.pow(1 - x, 3),
    inout: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
  };
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const num = (v, d) => (v == null || v === "" || isNaN(+v) ? d : +v);
  const SVG_NS = "http://www.w3.org/2000/svg";

  // Simple 24x24 stroke icons (drawn for this kit).
  const ICONS = {
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16.2 9.5"/>',
    alert: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.4v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21c1.4-3.9 4.2-6 7.5-6s6.1 2.1 7.5 6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1.2-3.4 3.6-5.2 6.5-5.2s5.3 1.8 6.5 5.2"/><path d="M15.5 4.8a3.5 3.5 0 0 1 0 6.4M18 14.6c1.6.8 2.8 2.6 3.5 5.4"/>',
    agent: '<rect x="4.5" y="8" width="15" height="11.5" rx="3"/><path d="M12 4.5V8M9.3 13v.1M14.7 13v.1M9.5 16.3h5"/><circle cx="12" cy="3.8" r="1"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    route: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M6 8.5v1.5a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V8.5M12 13v2.5"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.1 8.3-7.5 9.9-4.4-1.6-7.5-5.3-7.5-9.9V6z"/><path d="M8.8 12l2.3 2.3 4.2-4.3"/>',
    flask: '<path d="M9 3h6M10 3v6.2L4.8 18.6A1.6 1.6 0 0 0 6.2 21h11.6a1.6 1.6 0 0 0 1.4-2.4L14 9.2V3"/><path d="M7.4 15h9.2"/>',
    capsule: '<rect x="8" y="1.5" width="8" height="21" rx="4" transform="rotate(45 12 12)"/><path d="M9.2 9.2l5.6 5.6"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16.5v-4M12 16.5V8M17 16.5V5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.3 2.2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.4-4.4"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    zap: '<path d="M13 2.5L4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
    database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>',
    tag: '<path d="M3.5 12.3V4.5a1 1 0 0 1 1-1h7.8L21 12.2l-8.8 8.8z"/><path d="M8 8v.1"/>',
    code: '<path d="M8.5 7.5L4 12l4.5 4.5M15.5 7.5L20 12l-4.5 4.5"/>',
    eye: '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5.5"/><circle cx="12" cy="17" r="1.2"/>',
    split: '<path d="M4 12h6l4-6h6M10 12l4 6h6"/><path d="M17.5 3.5L20 6l-2.5 2.5M17.5 15.5L20 18l-2.5 2.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M4 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/>',
    dna: '<path d="M7 3c0 6 10 6 10 12M17 3c0 3-2.5 4.6-5 6M7 21c0-3 2.5-4.6 5-6M17 21c0-6-10-6-10-12"/><path d="M8.5 6.5h7M8.5 17.5h7"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  };

  let canvas, cfg, items = [], wires = [], pulses = [];

  function relRect(el) {
    const c = canvas.getBoundingClientRect();
    const s = c.width / canvas.offsetWidth || 1;
    const r = el.getBoundingClientRect();
    return { x: (r.left - c.left) / s, y: (r.top - c.top) / s, w: r.width / s, h: r.height / s };
  }

  function mountIcons(root) {
    root.querySelectorAll("i.ic[data-icon]").forEach((i) => {
      const body = ICONS[i.dataset.icon];
      if (!body) return console.warn("gifkit: unknown icon", i.dataset.icon);
      i.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    });
  }

  function collectItems() {
    items = [];
    canvas.querySelectorAll("[data-anim]").forEach((el) => {
      const group = el.parentElement && el.parentElement.closest("[data-stagger]");
      let at = num(el.dataset.at, null);
      if (at == null && group && canvas.contains(group)) {
        const peers = [...group.querySelectorAll("[data-anim]")].filter(
          (p) => p.parentElement.closest("[data-stagger]") === group
        );
        at = num(group.dataset.at, 0) + peers.indexOf(el) * num(group.dataset.stagger, 0.1);
      }
      const it = {
        el,
        type: el.dataset.anim,
        at: at == null ? 0 : at,
        dur: num(el.dataset.dur, 0.7),
        ease: EASE[el.dataset.ease] || (el.dataset.anim === "pop" ? EASE.back : EASE.out),
        persist: el.hasAttribute("data-persist"),
      };
      if (it.type === "grow-x") el.style.transformOrigin = "left center";
      if (it.type === "grow-y") el.style.transformOrigin = "center bottom";
      if (it.type === "type") it.text = el.textContent;
      if (it.type === "count") {
        it.to = num(el.dataset.to, num(el.textContent.replace(/[^0-9.-]/g, ""), 0));
        it.from = num(el.dataset.from, 0);
        it.dec = num(el.dataset.decimals, 0);
        it.prefix = el.dataset.prefix || "";
        it.suffix = el.dataset.suffix || "";
      }
      if (it.type === "draw" && el.getTotalLength) {
        it.len = el.getTotalLength();
        it.pattern = (el.dataset.dash || "").trim().split(/[\s,]+/).filter(Boolean).map(Number);
      }
      items.push(it);
    });
    pulses = [...canvas.querySelectorAll("[data-pulse]")].map((el) => ({
      el,
      amp: num(el.dataset.pulse, 1.04),
      cycles: Math.max(1, Math.round(num(el.dataset.cycles, 2))),
    }));
  }

  function anchor(el, side, off) {
    const r = relRect(el);
    if (side === "right") return [r.x + r.w, r.y + r.h * off];
    if (side === "left") return [r.x, r.y + r.h * off];
    if (side === "top") return [r.x + r.w * off, r.y];
    return [r.x + r.w * off, r.y + r.h]; // bottom
  }

  // Rounded orthogonal polyline through pts.
  function roundedPath(pts, radius) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [px, py] = pts[i - 1], [x, y] = pts[i], [nx, ny] = pts[i + 1];
      const l1 = Math.hypot(x - px, y - py), l2 = Math.hypot(nx - x, ny - y);
      const r = Math.min(radius, l1 / 2, l2 / 2);
      if (r < 0.5) { d += ` L${x},${y}`; continue; }
      const ax = x - ((x - px) / l1) * r, ay = y - ((y - py) / l1) * r;
      const bx = x + ((nx - x) / l2) * r, by = y + ((ny - y) / l2) * r;
      d += ` L${ax},${ay} Q${x},${y} ${bx},${by}`;
    }
    const [ex, ey] = pts[pts.length - 1];
    return d + ` L${ex},${ey}`;
  }

  // Measure layout without the transforms gifkit itself applies (grow/rise/pop/pulse).
  function measured(fn) {
    canvas.classList.add("gifkit-measure");
    try { return fn(); } finally { canvas.classList.remove("gifkit-measure"); }
  }

  // <path data-trend> inside a .chart: smooth curve through the bar tops, lifted by data-lift,
  // with an arrowhead that fades in as the draw-on finishes.
  function layoutTrends() {
    canvas.querySelectorAll("path[data-trend]").forEach((path) => {
      const chart = path.closest(".chart");
      const svg = path.ownerSVGElement;
      const bars = chart ? [...chart.querySelectorAll(".bar")] : [];
      if (bars.length < 2 || !svg) return console.warn("gifkit: data-trend needs a .chart with 2+ .bar elements");
      const sr = relRect(svg);
      const lift = num(path.dataset.lift, 16);
      const pts = bars.map((b) => { const r = relRect(b); return [r.x + r.w / 2 - sr.x, r.y - sr.y - lift]; });
      const ext = (a, b, k) => [a[0] + (a[0] - b[0]) * k, a[1] + (a[1] - b[1]) * k];
      const all = [ext(pts[0], pts[1], 0.45), ...pts, ext(pts[pts.length - 1], pts[pts.length - 2], 0.25)];
      let d = `M${all[0][0].toFixed(1)},${all[0][1].toFixed(1)}`;
      for (let i = 0; i < all.length - 1; i++) {
        const p0 = all[Math.max(0, i - 1)], p1 = all[i], p2 = all[i + 1], p3 = all[Math.min(all.length - 1, i + 2)];
        const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
        const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
        d += ` C${c1.map((v) => v.toFixed(1))} ${c2.map((v) => v.toFixed(1))} ${p2.map((v) => v.toFixed(1))}`;
      }
      path.setAttribute("d", d);
      if (path.dataset.arrowhead === "none") return;
      const len = path.getTotalLength();
      const tip = path.getPointAtLength(len), back = path.getPointAtLength(Math.max(0, len - 6));
      const ang = Math.atan2(tip.y - back.y, tip.x - back.x), a = 11, spread = 0.5;
      let head = path._head;
      if (!head) {
        head = document.createElementNS(SVG_NS, "path");
        head.setAttribute("class", "trend-head");
        head.dataset.anim = "fade";
        head.dataset.at = String(num(path.dataset.at, 0) + num(path.dataset.dur, 0.7) - 0.06);
        head.dataset.dur = "0.12";
        path.after(head);
        path._head = head;
      }
      head.setAttribute("d", `M${tip.x - a * Math.cos(ang - spread)},${tip.y - a * Math.sin(ang - spread)} L${tip.x},${tip.y} L${tip.x - a * Math.cos(ang + spread)},${tip.y - a * Math.sin(ang + spread)} Z`);
    });
  }

  function layout() {
    measured(() => { layoutTrends(); layoutWires(); });
    items.forEach((it) => { if (it.type === "draw" && it.el.getTotalLength) it.len = it.el.getTotalLength(); });
  }

  function layoutWires() {
    wires.forEach((w) => w.extras.forEach((e) => e.remove()));
    wires = [];
    canvas.querySelectorAll("path[data-wire]").forEach((path) => {
      const from = canvas.querySelector(path.dataset.from);
      const to = canvas.querySelector(path.dataset.to);
      if (!from || !to) return console.warn("gifkit: wire endpoint not found", path.dataset.from, path.dataset.to);
      const fs = path.dataset.fromSide || "right", ts = path.dataset.toSide || "left";
      let [sx, sy] = anchor(from, fs, num(path.dataset.fromAt, 0.5));
      let [ex, ey] = anchor(to, ts, num(path.dataset.toAt, 0.5));
      // data-from-edge / data-to-edge: keep the row's y (or column's x) but snap to another element's edge,
      // e.g. a wire that targets one row of a card but should stop at the card's border.
      const snap = (sel, side, pt) => {
        const e = sel && canvas.querySelector(sel);
        if (!e) return pt;
        const [ax, ay] = anchor(e, side, 0.5);
        return side === "left" || side === "right" ? [ax, pt[1]] : [pt[0], ay];
      };
      [sx, sy] = snap(path.dataset.fromEdge, fs, [sx, sy]);
      [ex, ey] = snap(path.dataset.toEdge, ts, [ex, ey]);
      const gap = num(path.dataset.gap, 3);
      const unit = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[ts];
      ex += unit[0] * gap; ey += unit[1] * gap;
      const horizFrom = fs === "left" || fs === "right";
      const horizTo = ts === "left" || ts === "right";
      const elbowRaw = path.dataset.elbow;
      const elbowAt = (span) => {
        if (elbowRaw == null) return span / 2;
        const v = parseFloat(elbowRaw);
        return elbowRaw.endsWith("%") ? (span * v) / 100 : v;
      };
      let pts;
      if (horizFrom && horizTo) {
        const mx = sx + elbowAt(ex - sx);
        pts = Math.abs(sy - ey) < 0.5 ? [[sx, sy], [ex, ey]] : [[sx, sy], [mx, sy], [mx, ey], [ex, ey]];
      } else if (!horizFrom && !horizTo) {
        const my = sy + elbowAt(ey - sy);
        pts = Math.abs(sx - ex) < 0.5 ? [[sx, sy], [ex, ey]] : [[sx, sy], [sx, my], [ex, my], [ex, ey]];
      } else if (horizFrom) {
        pts = [[sx, sy], [ex, sy], [ex, ey]];
      } else {
        pts = [[sx, sy], [sx, ey], [ex, ey]];
      }
      path.setAttribute("d", roundedPath(pts, num(path.dataset.radius, 9)));
      path.classList.add("wire");
      const extras = [];
      const g = path.parentNode;
      if (path.dataset.arrow !== "none") {
        const [qx, qy] = pts[pts.length - 2];
        const ang = Math.atan2(ey - qy, ex - qx), a = 8.5, spread = 0.62;
        const head = document.createElementNS(SVG_NS, "path");
        head.setAttribute(
          "d",
          `M${ex - a * Math.cos(ang - spread)},${ey - a * Math.sin(ang - spread)} L${ex},${ey} L${ex - a * Math.cos(ang + spread)},${ey - a * Math.sin(ang + spread)}`
        );
        head.setAttribute("class", "wire-head");
        if (path.style.stroke) head.style.stroke = path.style.stroke;
        g.appendChild(head);
        extras.push(head);
      }
      const dots = [];
      const n = Math.round(num(path.dataset.dots, 1));
      for (let k = 0; k < n; k++) {
        const c = document.createElementNS(SVG_NS, "circle");
        c.setAttribute("r", num(path.dataset.dotR, 4.6));
        c.setAttribute("class", "wire-dot");
        if (path.dataset.dotColor) c.style.fill = path.dataset.dotColor;
        g.appendChild(c);
        dots.push(c);
        extras.push(c);
      }
      wires.push({
        path, dots, extras,
        len: path.getTotalLength(),
        cycles: Math.max(1, Math.round(num(path.dataset.cycles, cfg.loop / 0.75))),
        phase: num(path.dataset.phase, 0),
      });
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  }

  function progressOf(it, t) {
    let p = clamp01((t - it.at) / it.dur);
    p = it.ease(p);
    if (!it.persist && cfg.reset != null && t >= cfg.reset) {
      p *= 1 - EASE.inout(clamp01((t - cfg.reset) / cfg.resetDur));
    }
    return p;
  }

  function apply(it, p) {
    const el = it.el, s = el.style;
    s.setProperty("--p", p.toFixed(4));
    switch (it.type) {
      case "grow-x": s.transform = `scaleX(${p})`; break;
      case "grow-y": s.transform = `scaleY(${p})`; break;
      case "sweep": s.clipPath = `inset(-2px ${((1 - p) * 100).toFixed(2)}% -2px -2px)`; break;
      case "fade": s.opacity = p; break;
      case "rise": s.opacity = p; s.transform = `translateY(${((1 - p) * 14).toFixed(2)}px)`; break;
      case "pop":
        s.opacity = clamp01(p * 1.6);
        s.transform = `scale(${(0.6 + 0.4 * p).toFixed(4)})`;
        break;
      case "count": {
        const v = it.from + (it.to - it.from) * p;
        el.textContent = it.prefix + v.toLocaleString("en-US", { minimumFractionDigits: it.dec, maximumFractionDigits: it.dec }) + it.suffix;
        break;
      }
      case "type": {
        const k = Math.round(it.text.length * p);
        el.innerHTML = escapeHtml(it.text.slice(0, k)) + `<span style="opacity:0">${escapeHtml(it.text.slice(k))}</span>`;
        break;
      }
      case "draw": {
        if (!it.len) break;
        s.visibility = p > 0.002 ? "visible" : "hidden";
        const vis = it.len * p;
        if (!it.pattern.length) {
          s.strokeDasharray = `${it.len} ${it.len}`;
          s.strokeDashoffset = `${it.len - vis}`;
        } else {
          const parts = [];
          let acc = 0, i = 0;
          while (acc < vis - 0.01) {
            const take = Math.min(it.pattern[i % it.pattern.length], vis - acc);
            parts.push(take.toFixed(2));
            acc += take;
            i++;
          }
          if (parts.length % 2 === 1) parts.push((it.len * 2).toFixed(2));
          else parts.push("0", (it.len * 2).toFixed(2));
          s.strokeDasharray = parts.join(" ");
        }
        break;
      }
      default: break; // "var": style through var(--p) in CSS
    }
  }

  function renderAt(t) {
    const L = cfg.loop;
    t = ((t % L) + L) % L;
    for (const it of items) apply(it, progressOf(it, t));
    for (const w of wires) {
      w.dots.forEach((c, k) => {
        const u = (((t / L) * w.cycles + k / w.dots.length + w.phase) % 1 + 1) % 1;
        const pt = w.path.getPointAtLength(u * w.len);
        c.setAttribute("cx", pt.x.toFixed(2));
        c.setAttribute("cy", pt.y.toFixed(2));
        c.style.opacity = clamp01(Math.min(u / 0.08, (1 - u) / 0.08)).toFixed(3);
      });
    }
    for (const pl of pulses) {
      const k = 0.5 - 0.5 * Math.cos((2 * Math.PI * t * pl.cycles) / L);
      pl.el.style.transform = `scale(${(1 + (pl.amp - 1) * k).toFixed(4)})`;
    }
  }

  function fitPreview() {
    const s = Math.min((innerWidth - 32) / canvas.offsetWidth, (innerHeight - 32) / canvas.offsetHeight, 1);
    document.documentElement.style.setProperty("--preview-scale", s.toFixed(4));
  }

  const ready = (async () => {
    if (document.readyState === "loading") await new Promise((r) => addEventListener("DOMContentLoaded", r, { once: true }));
    canvas = document.querySelector("[data-gifkit]") || document.querySelector(".canvas");
    mountIcons(document);
    // Fonts load lazily when first used; force every declared face so frames never render in a fallback font.
    document.body.offsetHeight;
    await Promise.all([...document.fonts].map((f) => f.load().catch(() => null)));
    await document.fonts.ready;
    const resetDur = num(canvas.dataset.resetDur, 0.45);
    const loop = num(canvas.dataset.loop, 4);
    cfg = { loop, resetDur, reset: canvas.dataset.reset === "none" ? null : num(canvas.dataset.reset, loop - resetDur - 0.1) };
    const rendering = !!window.__GIFKIT_RENDER__;
    document.documentElement.classList.add(rendering ? "gifkit-render" : "gifkit-preview");
    if (!rendering) fitPreview();
    measured(() => layoutTrends()); // creates trend arrowheads before items are collected
    collectItems();
    layout();
    renderAt(0);
    if (!rendering) {
      let paused = false, offset = 0, t0 = performance.now();
      addEventListener("resize", () => { fitPreview(); layout(); });
      addEventListener("click", () => {
        paused = !paused;
        if (!paused) t0 = performance.now() - offset * 1000;
      });
      const tick = (now) => {
        if (!paused) { offset = (now - t0) / 1000; renderAt(offset); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    return { loop: cfg.loop, width: canvas.offsetWidth, height: canvas.offsetHeight, fps: num(canvas.dataset.fps, 15) };
  })();

  window.gifkit = { ready, renderAt, icons: Object.keys(ICONS), relayout: () => layout() };
})();
