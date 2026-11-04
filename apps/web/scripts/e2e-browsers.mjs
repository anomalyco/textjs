// Firefox and WebKit smoke test: the main routes load without page errors and without layout shifts,
// the focus pad shows the right console shortcut for the browser, and frames reach the console with
// the CSS for that browser's console (inline spans, a line-height curtain).
// Also loads the main routes on an iPhone viewport in WebKit, where the pad asks for a desktop and the
// companion never boots. Desktop pages load as a tab that has already shown console intent.
//
// Neither browser has the Layout Instability API, so shifts are measured directly: every rendered
// element's layout box (offsetLeft/offsetTop/offsetWidth/offsetHeight, which ignore transforms and
// scrolling) is sampled on each animation frame. As in Chromium's CLS, an element shifts when its
// top-left corner moves 3px or more between two samples taken after first contentful paint (a size
// change alone doesn't count), scored as impact fraction × distance fraction.
//
//   bun run build && bun run preview -- --port 4173 --strictPort
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 OUT=/tmp/browsers node scripts/e2e-browsers.mjs
//
// Env: BROWSERS=firefox,webkit, ROUTES=/a,/b, OUT (screenshots), LATENCY=ms added to every request (a cold, slow
// load; also reports Firefox's first paint and how long its font hold kept the page hidden).
// Needs `playwright install firefox webkit`.
// Never reaches a local OpenCode server (loopback requests other than BASE are aborted) and never
// writes to terminal.shop (only GET requests leave the machine).
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url)));
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const port = new URL(base).port;
const out = process.env.OUT ?? "";
if (out) mkdirSync(out, { recursive: true });
const latency = Number(process.env.LATENCY ?? 0);
const browsers = (process.env.BROWSERS ?? "firefox,webkit").split(",").filter(Boolean);
const routes = process.env.ROUTES ? process.env.ROUTES.split(",").filter(Boolean) : ["/", "/docs/routing", "/playground", "/learn/getting-started", "/store", "/blog", "/opencode", "/coffee"];
const PAD_ROUTES = new Set(["/playground", "/opencode", "/coffee"]);
const MOBILE_ROUTES = ["/", "/playground", "/docs/routing", "/store"];

/** The console shortcut each browser's pad should show (the VM is Linux; WebKit reports a Mac). */
const SHORTCUT = { firefox: "Ctrl Shift K", webkit: "⌘ ⌥ C" };

function sampler() {
  const seen = new Map();
  const state = { score: 0, shifts: [], frames: [] };
  window.__shifts = state;
  // Frames are `console.log("%c\u200b%c\n…", curtain, "", …)`: keep the first few curtains.
  const log = console.log;
  console.log = function (...args) {
    if (state.frames.length < 3 && typeof args[0] === "string" && args[0].startsWith("%c\u200b%c\n")) state.frames.push(String(args[1]));
    return log.apply(this, args);
  };
  // Firefox's font hold: when the page was hidden and shown again.
  new MutationObserver(() => {
    const hidden = document.documentElement.style.visibility === "hidden";
    if (hidden && state.hiddenAt === undefined) state.hiddenAt = performance.now();
    if (!hidden && state.hiddenAt !== undefined && state.shownAt === undefined) state.shownAt = performance.now();
  }).observe(document, { attributes: true, attributeFilter: ["style"], subtree: true });
  let painted = false;
  try {
    new PerformanceObserver((list) => {
      const fcp = list.getEntriesByName("first-contentful-paint")[0];
    if (fcp) {
      painted = true;
      state.fcp = fcp.startTime;
    }
    }).observe({ type: "paint", buffered: true });
  } catch {
    painted = true;
  }
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : ""}`;
  const box = (el) => {
    let x = 0;
    let y = 0;
    for (let n = el; n; n = n.offsetParent) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };
  const tick = () => {
    const vw = innerWidth;
    const vh = innerHeight;
    let union = null;
    let dist = 0;
    const counting = painted;
    for (const el of document.body ? document.body.querySelectorAll("*") : []) {
      if (!(el instanceof HTMLElement) || el.offsetParent === null) continue;
      const b = box(el);
      if (b.w === 0 || b.h === 0) continue;
      const prev = seen.get(el);
      seen.set(el, b);
      if (!prev || !counting) continue;
      const moved = Math.max(Math.abs(b.x - prev.x), Math.abs(b.y - prev.y));
      if (moved < 3) continue;
      // Only what's on screen counts, as in CLS.
      const top = Math.min(prev.y, b.y) - scrollY;
      if (top > vh || top + Math.max(prev.h, b.h) < 0) continue;
      if (state.shifts.length < 20) state.shifts.push(`${describe(el)} ${prev.x},${prev.y} ${prev.w}x${prev.h} → ${b.x},${b.y} ${b.w}x${b.h}`);
      const r = { x0: Math.min(prev.x, b.x), y0: Math.min(prev.y, b.y) - scrollY, x1: Math.max(prev.x + prev.w, b.x + b.w), y1: Math.max(prev.y + prev.h, b.y + b.h) - scrollY };
      union = union ? { x0: Math.min(union.x0, r.x0), y0: Math.min(union.y0, r.y0), x1: Math.max(union.x1, r.x1), y1: Math.max(union.y1, r.y1) } : r;
      dist = Math.max(dist, moved);
    }
    if (union) {
      const area = Math.max(0, Math.min(vw, union.x1) - Math.max(0, union.x0)) * Math.max(0, Math.min(vh, union.y1) - Math.max(0, union.y0));
      state.score += (area / (vw * vh)) * (dist / Math.max(vw, vh));
    }
    if (!state.stop) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  ✗ ${msg}`);
};

/** A loopback URL on any port but the preview's (requests the route below aborts). */
const otherLoopback = new RegExp(String.raw`\b(127\.0\.0\.1|localhost):(?!${port}\b)\d+`);

/**
 * The pad's message rows (top and height), and whether the message fits its frame: in the Playground
 * stage it must end above the bottom slot and inside `--pad-frame`.
 */
function padRows() {
  const box = (sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: Math.round(r.top * 10) / 10, height: Math.round(r.height * 10) / 10, bottom: Math.round(r.bottom * 10) / 10 };
  };
  const rows = { headline: box(".tx-pad-headline"), hero: box(".tx-pad-hero"), sub: box(".tx-pad-sub"), steps: box(".tx-pad-steps") };
  const banner = box(".tx-pad-desk .pad-slot-banner");
  const bottom = box(".pad-slot-bottom");
  const stage = document.querySelector(".pad-stage");
  const frame = stage ? parseFloat(getComputedStyle(stage).getPropertyValue("--pad-frame")) : null;
  return {
    rows,
    state: document.querySelector("[data-textjs-focus-pad]")?.getAttribute("data-state") ?? null,
    overlap: bottom && rows.sub ? Math.max(0, rows.sub.bottom - bottom.top) : 0,
    overflow: frame && banner && rows.sub ? Math.max(0, rows.sub.bottom - banner.top - frame) : 0,
  };
}

async function newPage(browser, options) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  // The companion boots once the visitor shows they want the console. A tab that already has boots on every load.
  await page.addInitScript(() => sessionStorage.setItem("textjs:console-intent", "1"));
  await page.route("**/*", async (route) => {
    if (latency > 0) await new Promise((r) => setTimeout(r, latency));
    const req = route.request();
    const url = new URL(req.url());
    if (/^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port) return route.abort();
    if (url.origin !== base && req.method() !== "GET") return route.abort();
    return route.continue();
  });
  await page.addInitScript(sampler);
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Requests aborted above, and media.textjs.org, whose CORS policy allows textjs.org but not the preview origin.
    if (otherLoopback.test(text) || (/media\.textjs\.org|Access-Control-Allow-Origin/.test(text) && !base.startsWith("https://textjs.org"))) return;
    errors.push(`console.error: ${text.slice(0, 200)}`);
  });
  return { context, page, errors };
}

async function settle(page) {
  await page.waitForLoadState("load");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  return page.evaluate(() => {
    window.__shifts.stop = true;
    return window.__shifts;
  });
}

for (const name of browsers) {
  const browser = await pw[name].launch({ headless: true });
  console.log(`${name} ${browser.version()}`);

  for (const route of routes) {
    const { context, page, errors } = await newPage(browser, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(base + route, { waitUntil: "commit", timeout: 60_000 });
    const shifts = await settle(page);
    const label = `${name} ${route}`;
    if (errors.length > 0) fail(`${label}: ${errors.join(" | ")}`);
    if (shifts.score > 0) fail(`${label}: layout shift ${shifts.score.toFixed(4)}: ${shifts.shifts.join("; ")}`);
    if (!shifts.frames.some((s) => s === "line-height:100vh;")) fail(`${label}: no frame with the inline-console curtain (got ${JSON.stringify(shifts.frames[0] ?? null)})`);
    if (PAD_ROUTES.has(route)) {
      const keys = await page.evaluate(() => {
        const visible = [...document.querySelectorAll(".tx-pad-keys")].find((el) => el.offsetParent !== null);
        return visible?.getAttribute("aria-label") ?? null;
      });
      if (keys !== `Press ${SHORTCUT[name]}`) fail(`${label}: pad shortcut ${JSON.stringify(keys)}, expected "Press ${SHORTCUT[name]}"`);
    }
    if (out) await page.screenshot({ path: join(out, `${name}${route === "/" ? "_home" : route.replace(/\//g, "_")}.png`) });
    const hold = shifts.hiddenAt !== undefined ? `  hold ${Math.round((shifts.shownAt ?? NaN) - shifts.hiddenAt)}ms` : "";
    const fcp = shifts.fcp !== undefined ? `  fcp ${Math.round(shifts.fcp)}ms` : "";
    if (shifts.hiddenAt !== undefined && !(shifts.shownAt - shifts.hiddenAt <= 200)) fail(`${label}: the font hold kept the page hidden ${Math.round(shifts.shownAt - shifts.hiddenAt)}ms`);
    console.log(`  ${failures.some((f) => f.startsWith(`${label}:`)) ? "✗" : "✓"} ${route}  shift ${shifts.score.toFixed(4)}  errors ${errors.length}${fcp}${hold}`);
    await context.close();
  }

  if (name === "webkit") {
    // Safari's line below the hero is one line longer. It must fit the Playground's frame (also with Web Inspector
    // docked, a short page, and in narrow windows) and every state must reserve it, so open → click moves nothing.
    const PAD_CASES = [
      { route: "/playground", width: 1440, height: 900 },
      { route: "/playground", width: 1440, height: 520 },
      { route: "/playground", width: 600, height: 760 },
      { route: "/coffee", width: 1440, height: 520 },
      { route: "/learn", width: 1440, height: 900, scroll: ".tx-pad" },
    ];
    for (const c of PAD_CASES) {
      const { context, page, errors } = await newPage(browser, { viewport: { width: c.width, height: c.height }, deviceScaleFactor: 1 });
      await page.goto(base + c.route, { waitUntil: "load", timeout: 60_000 });
      await page.waitForTimeout(1200);
      if (c.scroll) await page.locator(c.scroll).first().scrollIntoViewIfNeeded();
      const open = await page.evaluate(padRows);
      // A blur with the page visible reads as focus moving into Web Inspector: the pad asks for a click.
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await page.waitForTimeout(600);
      const click = await page.evaluate(padRows);
      const label = `webkit pad ${c.route} ${c.width}x${c.height}`;
      if (errors.length > 0) fail(`${label}: ${errors.join(" | ")}`);
      if (open.state !== "open" || click.state !== "click") fail(`${label}: states ${open.state} → ${click.state}, expected open → click`);
      if (open.overlap > 0 || click.overlap > 0) fail(`${label}: the message overlaps the bottom slot by ${Math.max(open.overlap, click.overlap)}px`);
      if (open.overflow > 0 || click.overflow > 0) fail(`${label}: the message overflows --pad-frame by ${Math.max(open.overflow, click.overflow)}px`);
      for (const row of ["steps", "headline", "hero", "sub"]) {
        const a = open.rows[row];
        const b = click.rows[row];
        if (!a || !b || a.top !== b.top || a.height !== b.height) fail(`${label}: ${row} moved from ${JSON.stringify(a)} to ${JSON.stringify(b)} between open and click`);
      }
      if (out) await page.screenshot({ path: join(out, `webkit-pad${c.route.replace(/\//g, "_")}-${c.width}x${c.height}.png`) });
      console.log(`  ${failures.some((f) => f.startsWith(`${label}:`)) ? "✗" : "✓"} pad ${c.route} ${c.width}x${c.height}  sub ${open.rows.sub?.height}px`);
      await context.close();
    }

    for (const route of MOBILE_ROUTES) {
      // Phones never boot the companion by themselves, not even in a tab that remembers it.
      const { context, page, errors } = await newPage(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      await page.goto(base + route, { waitUntil: "commit", timeout: 60_000 });
      const shifts = await settle(page);
      const label = `webkit iPhone ${route}`;
      if (errors.length > 0) fail(`${label}: ${errors.join(" | ")}`);
      if (shifts.score > 0) fail(`${label}: layout shift ${shifts.score.toFixed(4)}: ${shifts.shifts.join("; ")}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (overflow > 0) fail(`${label}: page is ${overflow}px wider than the screen`);
      if (shifts.frames.length > 0) fail(`${label}: the companion booted on a phone`);
      if (route === "/playground") {
        const touch = await page.evaluate(() => document.querySelector(".tx-pad-touch")?.offsetParent !== null);
        if (!touch) fail(`${label}: the pad doesn't show the desktop notice`);
      }
      if (out) await page.screenshot({ path: join(out, `webkit-iphone${route === "/" ? "_home" : route.replace(/\//g, "_")}.png`) });
      console.log(`  ${failures.some((f) => f.startsWith(`${label}:`)) ? "✗" : "✓"} iPhone ${route}  shift ${shifts.score.toFixed(4)}  errors ${errors.length}`);
      await context.close();
    }
  }
  await browser.close();
}

if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nAll browser checks passed");
