// Headless checks for the team views: on each teammate's page, engage the console, type their
// name, and capture the DevTools frame. The page itself must not change.
//
//   bun run build && bunx vite preview --port 4173
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 OUT=/tmp/team-eggs node scripts/e2e-team-eggs.mjs
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { frameHtml } from "./console-frame-html.mjs";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const out = process.env.OUT ?? "";
if (out) mkdirSync(out, { recursive: true });

// person, page, name, text that only the view shows
const EGGS = [
  ["dax", "/", "dax", "Light angle"],
  ["Stefan Avram", "/enterprise", "stefan", "We're all ears"],
  ["Tas", "/enterprise", "tas", "Flying away from the redlines"],
  ["Jay", "/store", "jay", "Sleeve length"],
  ["Aiden Cline", "/store", "aiden", "American traditional"],
  ["Michelle Bakels", "/store", "michelle", "Same as Across"],
  ["Juliana Ardila", "/store", "huli", "is money even real"],
  ["Daniel Chen", "/status", "daniel", "Daniel's Chicken Coop"],
  ["Filip Hejmowski", "/changelog", "filip", "Bakery taken (grandmas)"],
  ["Bob", "/blog", "bob", "Kitchen, ca. 2000"],
  ["Alan Rice", "/learn", "bigal", 'alan "big al" rice'],
  ["Kit Langton", "/playground", "kit", "There Won't Be Blog"],
  ["Frank Wang", "/playground/snake", "frank", "we're a gaming company now!"],
  ["David Hill", "/docs/styling", "david", "Heinz #e85d26"],
  ["Sebastian", "/docs/terminal", "sebastian", "Flughafenwartezeitgetränk"],
  ["Ryan Vogel", "/docs/devtools-extension", "vogel", "Slack Premium Verified"],
  ["bailey", "/docs/support-policy", "bailey", "Liquid grapes"],
  ["Victor Navarro", "/docs/internationalization", "victor", "gracias amigo"],
  ['Luke "Hona" Parker', "/docs/turbolog-engine", "hona", "Throne of Glass"],
  ["Brendan Allan", "/docs/keyboard", "brendan", "Royal Flush"],
  ["James Long", "/docs/components-content", "james", "Liquid Glass"],
  ["dan", "/docs/components-charts", "dan", "a young one"],
  ["jamie", "/docs/fonts", "jamie", "Morning!"],
  ["Simon", "/docs/hooks-and-repl", "simon", "SH-101"],
  ["Jack", "/docs/caching", "jack", "Unbeatable in forest"],
  ["Ludvig", "/docs/components-forms", "ludvig", "Undefeated"],
  ["Aarav Sareen", "/docs/components-layout", "aarav", "aarav_style_doom_rage_avatar"],
  ["kamil", "/docs/components-interactive", "kamil", "kamil_style_doom_rage_avatar"],
  ["Walter", "/docs/middleware", "walter", "HKG → CDG → SJO"],
];
// Keys pressed after the view opens, so the capture shows it doing something.
const PLAY = { stefan: ["ArrowUp"], david: ["Space", "Space", "Space"], ryan: ["c"], kit: ["Space", "Space", "Space", "Space", "Space"], aiden: ["Space", "Space"], james: ["Space", "Space", "Space"], brendan: ["Space"], ludvig: ["Space", "Space", "Space"], simon: ["g"], jay: ["d"] };

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n  ${detail}`}`);
  if (!ok) failures++;
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
// Never reach a real local server (the OpenCode bridge, dev servers) from tests: only the preview port.
const port = new URL(base).port;
await context.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
await context.addInitScript(() => {
  window.__frame = null;
  window.__otherLogs = [];
  window.__cls = 0;
  for (const m of ["log", "info", "warn", "error", "debug"]) {
    const orig = console[m].bind(console);
    console[m] = (...a) => {
      if (m === "log" && typeof a[0] === "string" && a[0].includes("%c")) window.__frame = a.map(String);
      else window.__otherLogs.push(`${m}: ${a.map(String).join(" ").slice(0, 200)}`);
      return orig(...a);
    };
  }
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shotPage = await context.newPage();

const frameText = () => page.evaluate(() => (window.__frame ? window.__frame[0].replace(/%%|%c/g, (m) => (m === "%%" ? "%" : "")) : ""));
const waitFrame = async (has, ms = 4000) => {
  for (let t = 0; t < ms; t += 100) {
    if ((await frameText()).includes(has) === true) return true;
    await page.waitForTimeout(100);
  }
  return false;
};
/**
 * The page's text, minus what changes on its own: focus pads (they echo every key) and docs
 * sandboxes (they animate). The home hero mirror is checked separately.
 */
const pageText = () =>
  page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    for (const el of clone.querySelectorAll("[data-textjs-focus-pad], .devtools, script")) el.remove();
    // Live examples print their render time.
    return clone.innerText.replace(/\d+(\.\d+)?ms/g, "ms");
  });

async function engage(path) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const pad = page.locator("[data-textjs-focus-pad]").first();
  if (path.startsWith("/playground") || path.startsWith("/opencode")) await pad.click({ position: { x: 40, y: 40 } });
  else await page.locator(".console-pill").click();
  await page.waitForTimeout(200);
}

async function capture(slug) {
  if (!out) return;
  const args = await page.evaluate(() => window.__frame);
  await shotPage.setContent(frameHtml(args));
  await shotPage.locator("#frame").screenshot({ path: join(out, `${slug}.png`) });
}

for (const [person, path, name, marker] of EGGS) {
  await engage(path);
  const before = await frameText();
  const mirror = path === "/" ? await page.locator(".hero .dt-log").innerText() : null;
  const textBefore = await pageText();
  await page.keyboard.type(name, { delay: 70 });
  const opened = await waitFrame(marker);
  check(`${person}: "${name}" on ${path} opens their view`, opened, (await frameText()).slice(0, 400));
  if (!opened) continue;
  for (const k of PLAY[name] ?? PLAY[name === "vogel" ? "ryan" : name] ?? []) {
    await page.keyboard.press(k);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(name === "michelle" ? 3200 : name === "brendan" ? 1800 : 900);
  await capture(name === "vogel" ? "ryan" : name === "huli" ? "juliana" : name === "bigal" ? "alan" : name === "hona" ? "luke" : name);
  const textDuring = await pageText();
  check(`${person}: the page doesn't show it`, !textDuring.includes(marker));
  check(`${person}: the page's text didn't change`, textDuring === textBefore, diff(textBefore, textDuring));
  if (mirror !== null) check(`${person}: the hero mirror keeps the regular frame`, (await page.locator(".hero .dt-log").innerText()) === mirror);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const after = await frameText();
  check(`${person}: Esc returns`, !after.includes(marker) && after.split("\n")[1] === before.split("\n")[1], after.slice(0, 300));
  check(`${person}: no layout shift`, (await page.evaluate(() => window.__cls)) === 0, String(await page.evaluate(() => window.__cls)));
  const other = await page.evaluate(() => window.__otherLogs);
  check(`${person}: nothing logged besides frames`, other.length === 0, other.join("\n"));
}

function diff(a, b) {
  const x = a.split("\n");
  const y = b.split("\n");
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return `line ${i}: ${JSON.stringify(x[i])} → ${JSON.stringify(y[i])}`;
  return "";
}

// ── where names must do nothing ──
await engage("/docs/fonts");
await page.keyboard.type("jack", { delay: 70 });
check("jack on /docs/fonts does nothing", !(await waitFrame("Unbeatable in forest", 1200)));

await engage("/docs/caching");
await page.keyboard.press("/");
await page.keyboard.type("jack", { delay: 70 });
check("jack typed into the console's docs search does nothing", !(await waitFrame("Unbeatable in forest", 1200)));
await page.keyboard.press("Escape");

await page.goto(`${base}/docs/caching`, { waitUntil: "networkidle" });
await page.keyboard.press("Meta+k");
await page.locator(".kbar input").fill("");
await page.keyboard.type("jack", { delay: 70 });
check("jack typed into ⌘K does nothing", !(await waitFrame("Unbeatable in forest", 1200)));
await page.keyboard.press("Escape");

await engage("/opencode");
await page.keyboard.type("kit", { delay: 70 });
check("kit typed into the OpenCode composer does nothing", !(await waitFrame("There Won't Be Blog", 1200)) && (await frameText()).includes("kit"));

await engage("/playground");
await page.keyboard.type("ki", { delay: 70 });
await page.waitForTimeout(1700);
await page.keyboard.type("t");
check("letters more than 1.5s apart don't count", !(await waitFrame("There Won't Be Blog", 1200)));

// The names never ship in the page's own scripts.
const scripts = await page.evaluate(() => [...document.querySelectorAll("script[src]")].map((s) => s.src));
let mainSource = "";
for (const src of scripts) mainSource += await (await context.request.get(src)).text();
const leaked = EGGS.map(([, , n]) => n).filter((n) => n.length > 3 && new RegExp(`["'\`]${n}["'\`]`).test(mainSource));
check("the main bundle names no one", leaked.length === 0, leaked.join(", "));

check("no page errors", errors.length === 0, errors.join("\n"));
await browser.close();
console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
