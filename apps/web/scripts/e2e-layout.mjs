// Pad layout parity: every Playground demo (Dashboard, Streaming, Snake at /playground[/<demo>],
// OpenCode at /opencode, Coffee at /coffee) shares one stage layout, so switching between them in
// the picker must not move the picker, keycaps, subtitle, pad or its slots by a single pixel, before
// the console is open or once the pad is live.
// Loads each route directly and via client navigation at several viewports, measures the bounding
// boxes of corresponding elements and asserts they are identical (±0px). Also checks that the
// OpenCode connection panel keeps one height in every state (checking, sandbox, connecting, live,
// error) and that nothing shifts while it resolves. Never reaches a real local OpenCode server:
// every loopback request is either aborted or answered by a fake in-process route.
//
//   bun run build && bun run preview -- --port 4173 --strictPort
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 OUT=/tmp/layout node scripts/e2e-layout.mjs
//
// OUT (optional) receives screenshots of both pages per viewport plus a difference overlay.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const port = new URL(base).port;
const out = process.env.OUT ?? "";
if (out) mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });

const VIEWPORTS = [
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "390x844", width: 390, height: 844 },
  { name: "390x844-touch", width: 390, height: 844, touch: true },
];

// Elements whose content is the same on both pages: the whole box must match.
const SAME = {
  header: ".header",
  stage: ".pad-stage",
  pad: "[data-textjs-focus-pad]",
  desk: ".tx-pad-desk",
  // The message's rows: progress, headline, hero (the console shortcut before the console is open).
  steps: ".tx-pad-steps",
  headline: ".tx-pad-headline",
  hero: ".tx-pad-hero",
  keycaps: ".tx-pad-keys",
  touchHeadline: ".tx-pad-touch h2",
  touchSub: ".tx-pad-touch p",
  slotTop: ".pad-slot-top",
  // Every demo reserves the banner row; OpenCode and Coffee fill it with their wordmarks.
  banner: ".tx-pad-desk .pad-slot-banner",
  picker: ".pad-picker",
  slotBottom: ".pad-slot-bottom",
  footer: "footer",
};
// Elements whose text differs per page (the demo's action and keys): only the vertical box must match.
const ROW = {
  subtitle: ".tx-pad-sub",
  // Live only: the demo's keys in the hero.
  hints: ".tx-pad-hints",
  // terminal.shop pins its console at 80×30, so the size control's label is shorter there.
  size: ".tx-pad-size",
};

const observe = () => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__shifts.push({ v: e.value, src: (e.sources ?? []).map((s) => (s.node?.nodeType === 1 ? s.node.className || s.node.tagName : `${s.node?.nodeName} in ${s.node?.parentElement?.className || s.node?.parentElement?.tagName}`)) });
  }).observe({ type: "layout-shift", buffered: true });
};

/** Fake OpenCode server on an unused loopback port, answered entirely in-process (no socket is opened). */
const FAKE = "http://127.0.0.1:59871";
let fakeMode = "live";
async function newPage(vp) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, hasTouch: !!vp.touch, isMobile: !!vp.touch });
  const page = await context.newPage();
  await page.route(
    (url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port,
    async (r) => {
      const u = new URL(r.request().url());
      if (u.origin !== FAKE) return r.abort();
      if (fakeMode === "hang") return; // never answers: the quiet probe stays in "checking"
      if (fakeMode === "down") return r.abort();
      const headers = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "content-type": "application/json" };
      if (r.request().method() === "OPTIONS") return r.fulfill({ status: 204, headers });
      if (u.pathname === "/api/info") return r.fulfill({ status: 200, headers, body: JSON.stringify({ version: "9.9.9" }) });
      return r.fulfill({ status: 200, headers, body: JSON.stringify(u.pathname.includes("session") ? { data: [] } : {}) });
    },
  );
  await page.addInitScript(observe);
  return { context, page };
}

async function measure(page) {
  return page.evaluate(
    ({ same, row }) => {
      const box = (sel) => {
        const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height };
      };
      const res = {};
      for (const [k, s] of Object.entries(same)) res[k] = box(s);
      for (const [k, s] of Object.entries(row)) {
        const b = box(s);
        res[k] = b ? { y: b.y, h: b.h } : null;
      }
      return res;
    },
    { same: SAME, row: ROW },
  );
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

async function navigate(page, href) {
  await page.evaluate((h) => document.querySelector(`a[href="${h}"]`)?.click(), href);
  await page.waitForFunction((h) => location.pathname === h, href);
  await settle(page);
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : `\n    ${detail}`}`);
  if (!ok) failures++;
};

function diff(a, b) {
  const bad = [];
  for (const k of Object.keys(a)) {
    const x = a[k];
    const y = b[k];
    if (x === null && y === null) continue;
    if (x === null || y === null) {
      bad.push(`${k}: ${x ? "present" : "missing"} vs ${y ? "present" : "missing"}`);
      continue;
    }
    for (const p of Object.keys(x)) if (x[p] !== y[p]) bad.push(`${k}.${p}: ${x[p]} vs ${y[p]}`);
  }
  return bad;
}

async function overlay(page, a, b, file) {
  // Difference blend of the two screenshots: identical pixels go black, so anything that moved glows.
  const png = await page.evaluate(
    async ({ a, b }) => {
      const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const c = document.createElement("canvas");
      c.width = ia.width;
      c.height = ia.height;
      const g = c.getContext("2d");
      g.drawImage(ia, 0, 0);
      g.globalCompositeOperation = "difference";
      g.drawImage(ib, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 0.35;
      g.drawImage(ia, 0, 0);
      return c.toDataURL("image/png").split(",")[1];
    },
    { a: `data:image/png;base64,${a.toString("base64")}`, b: `data:image/png;base64,${b.toString("base64")}` },
  );
  writeFileSync(file, Buffer.from(png, "base64"));
}

for (const vp of VIEWPORTS) {
  console.log(`\n${vp.name}`);
  const { context, page } = await newPage(vp);
  await page.goto(`${base}/playground`, { waitUntil: "load" });
  await settle(page);
  const ref = await measure(page);
  const shotA = await page.screenshot();

  await navigate(page, "/opencode");
  const navOc = await measure(page);
  const shotB = await page.screenshot();
  const shifts = await page.evaluate(() => window.__shifts);
  check(`${vp.name} /playground → /opencode (nav): identical boxes`, diff(ref, navOc).length === 0, diff(ref, navOc).join("\n    "));
  check(`${vp.name} no layout shift across load + nav`, shifts.length === 0, JSON.stringify(shifts));

  await navigate(page, "/playground");
  const navPg = await measure(page);
  check(`${vp.name} /opencode → /playground (nav): identical boxes`, diff(ref, navPg).length === 0, diff(ref, navPg).join("\n    "));

  // Every demo in the picker lines up (their actions, keys and bottom panels differ), in both directions.
  if (!vp.touch) {
    const demos = await page.evaluate(() => [...document.querySelectorAll(".pad-picker a")].map((a) => [a.textContent, a.getAttribute("href")]));
    check(`${vp.name} picker lists five demos`, demos.length === 5, JSON.stringify(demos));
    await page.evaluate(() => (window.__shifts = []));
    for (const [label, href] of [...demos, ...[...demos].reverse()]) {
      await page.evaluate((h) => document.querySelector(`.pad-picker a[href="${h}"]`).click(), href);
      await page.waitForFunction((h) => location.pathname === h, href);
      await page.waitForTimeout(150);
      const m = await measure(page);
      const d = diff(ref, m);
      check(`${vp.name} picker → "${label}" (${href}) matches Dashboard`, d.length === 0, d.join("\n    "));
      const mark = await page.evaluate(() => document.querySelector(".tx-pad-desk .pad-slot-banner svg")?.getAttribute("aria-label") ?? null);
      const want = { OpenCode: "OpenCode", Coffee: "terminal.shop" }[label] ?? null;
      check(`${vp.name} "${label}" banner: ${want ?? "empty"}`, mark === want, String(mark));
    }
    const s = await page.evaluate(() => window.__shifts);
    check(`${vp.name} switching through every demo: no layout shift`, s.length === 0, JSON.stringify(s));

    // Live: the demos' keys fill the hero, and every demo still lines up (with each other, and with the
    // rows of the "open" message above, which only swap their contents).
    const desk = await page.locator(".tx-pad-desk").boundingBox();
    await page.mouse.click(desk.x + 8, desk.y + desk.height - 8);
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);
    const state = await page.getAttribute("[data-textjs-focus-pad]", "data-state");
    check(`${vp.name} a key makes the pad live`, state === "live", String(state));
    const liveRef = await measure(page);
    const rows = ["steps", "headline", "hero", "subtitle", "pad", "slotBottom"];
    const moved = rows.filter((k) => JSON.stringify(liveRef[k]) !== JSON.stringify(ref[k]));
    check(`${vp.name} live rows sit where the "open" rows were`, moved.length === 0, moved.map((k) => `${k}: ${JSON.stringify(ref[k])} → ${JSON.stringify(liveRef[k])}`).join("\n    "));
    for (const [label, href] of [...demos].reverse()) {
      await page.evaluate((h) => document.querySelector(`.pad-picker a[href="${h}"]`).click(), href);
      await page.waitForFunction((h) => location.pathname === h, href);
      await page.waitForTimeout(450);
      const d = diff(liveRef, await measure(page));
      check(`${vp.name} live: "${label}" matches the first`, d.length === 0, d.join("\n    "));
    }
  }

  const { context: c2, page: p2 } = await newPage(vp);
  await p2.goto(`${base}/opencode`, { waitUntil: "load" });
  await settle(p2);
  const directOc = await measure(p2);
  check(`${vp.name} /opencode (direct load): identical boxes`, diff(ref, directOc).length === 0, diff(ref, directOc).join("\n    "));
  const s2 = await p2.evaluate(() => window.__shifts);
  check(`${vp.name} /opencode direct load: no layout shift`, s2.length === 0, JSON.stringify(s2));
  await navigate(p2, "/");
  await p2.evaluate(() => (window.__shifts = []));
  await navigate(p2, "/opencode");
  const fromHome = await measure(p2);
  check(`${vp.name} / → /opencode (nav): identical boxes`, diff(ref, fromHome).length === 0, diff(ref, fromHome).join("\n    "));
  const s3 = await p2.evaluate(() => window.__shifts);
  check(`${vp.name} / → /opencode (nav): no layout shift`, s3.length === 0, JSON.stringify(s3));
  for (const direct of ["/coffee", "/playground/snake"]) {
    await p2.goto(`${base}${direct}`, { waitUntil: "load" });
    await settle(p2);
    const m = await measure(p2);
    check(`${vp.name} ${direct} (direct load): identical boxes`, diff(ref, m).length === 0, diff(ref, m).join("\n    "));
    const s4 = await p2.evaluate(() => window.__shifts);
    check(`${vp.name} ${direct} direct load: no layout shift`, s4.length === 0, JSON.stringify(s4));
  }
  await c2.close();

  if (out) {
    writeFileSync(join(out, `${vp.name}-playground.png`), shotA);
    writeFileSync(join(out, `${vp.name}-opencode.png`), shotB);
    await overlay(page, shotA, shotB, join(out, `${vp.name}-overlay.png`));
  }
  if (process.env.VERBOSE) console.log(JSON.stringify({ ref, navOc }, null, 1));
  await context.close();
}

// Connection panel: one height in every state, and resolving the quiet probe moves nothing.
for (const vp of VIEWPORTS.filter((v) => !v.touch)) {
  const states = {};
  for (const mode of ["hang", "live", "down"]) {
    fakeMode = mode;
    const { context, page } = await newPage(vp);
    await page.addInitScript((url) => localStorage.setItem("textjs:opencode-server", url), FAKE);
    await page.goto(`${base}/opencode`, { waitUntil: "load" });
    await settle(page);
    await page.waitForTimeout(mode === "down" ? 1200 : 300);
    const m = await measure(page);
    const status = await page.evaluate(() => document.querySelector(".pad-connect")?.getAttribute("data-status") ?? document.querySelector(".status-line")?.textContent);
    const shifts = await page.evaluate(() => window.__shifts);
    states[mode] = { m, status, shifts };
    if (out) await page.screenshot({ path: join(out, `${vp.name}-opencode-${{ hang: "checking", live: "connected", down: "not-found" }[mode]}.png`) });
    if (mode === "live") {
      // Disconnect → sandbox, then a failed manual connect → error.
      await page.evaluate(() => document.querySelector(".status-action")?.click());
      await page.waitForTimeout(300);
      states.sandbox = { m: await measure(page), status: await page.evaluate(() => document.querySelector(".pad-connect")?.getAttribute("data-status")), shifts: [] };
      fakeMode = "down";
      await page.evaluate(() => document.querySelector(".connect-form button[type=submit]")?.click());
      await page.waitForTimeout(800);
      states.error = { m: await measure(page), status: await page.evaluate(() => document.querySelector(".pad-connect")?.getAttribute("data-status")), shifts: [] };
      if (out) await page.screenshot({ path: join(out, `${vp.name}-opencode-error.png`) });
    }
    await context.close();
  }
  const ref = states.hang.m;
  for (const [mode, s] of Object.entries(states)) {
    const d = diff(ref, s.m);
    check(`${vp.name} connection panel "${s.status}" matches "checking" layout`, d.length === 0, d.join("\n    "));
    check(`${vp.name} connection panel "${s.status}": no layout shift`, s.shifts.length === 0, JSON.stringify(s.shifts));
  }
}

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : "\nall layout checks passed");
process.exit(failures ? 1 : 0);
