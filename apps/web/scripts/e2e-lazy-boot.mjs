// Headless E2E for loading the console companion on intent: a cold visit to Home or a docs page logs no
// console frames and downloads none of the companion (its boot chunk, React's console renderer, Yoga),
// on a desktop with DevTools undocked and on a phone, while the hero shows its prerendered frame. A
// DevTools shortcut, DevTools docking, a click on a console surface, a focus pad or a pre-boot size pick
// boots it at once, and a reload in the same tab boots it again. Hovering the hero only downloads it.
//
//   bun run build && bun run preview -- --port 4173 --strictPort
//   PLAYWRIGHT=/path/to/playwright-core BASE=http://localhost:4173 node scripts/e2e-lazy-boot.mjs
//
// Every other loopback port is blocked, so a local OpenCode server is never reached.
import { fileURLToPath } from "node:url";

const pw = process.env.PLAYWRIGHT ?? fileURLToPath(new URL("../../../bench/devtools/node_modules/playwright-core/index.mjs", import.meta.url));
const { chromium } = await import(pw);
const base = (process.env.BASE ?? "http://localhost:4173").replace(/\/$/, "");
const port = new URL(base).port;
const browser = await chromium.launch({ headless: true });

/** Chunks that only the companion needs. */
const COMPANION = /\/assets\/(boot|yoga|reconciler|HomeTab|DocsTab|ExampleTab)-[\w-]+\.js$/;
const DESKTOP = { viewport: { width: 1440, height: 900 } };
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `\n    ${detail}`}`);
  if (!ok) failures++;
};

async function open(options, path) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__frames = 0;
    // Headless windows have no browser chrome: outer and inner sizes match. `__dock` adds a docked panel's height.
    window.__dock = 0;
    const outer = Object.getOwnPropertyDescriptor(window, "outerHeight") ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), "outerHeight");
    Object.defineProperty(window, "outerHeight", { configurable: true, get: () => (outer?.get?.call(window) ?? innerHeight) + window.__dock });
    const log = console.log;
    console.log = function (...a) {
      if (typeof a[0] === "string" && a[0].includes("%c")) window.__frames++;
      return log.apply(this, a);
    };
  });
  await page.route((url) => /^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname) && url.port !== port, (r) => r.abort());
  const chunks = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (COMPANION.test(u.pathname)) chunks.push(u.pathname.replace(/-[\w-]+\.js$/, ""));
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (path) {
    await page.goto(base + path, { waitUntil: "load" });
    await page.waitForTimeout(2500);
  }
  return { context, page, chunks, errors };
}

const frames = (page) => page.evaluate(() => window.__frames);
const booted = (page) => page.waitForFunction(() => window.__frames > 0, null, { timeout: 8000 }).then(() => true, () => false);

// Cold visits: nothing of the companion, no frames, and the hero already shows the console's first frame.
for (const [label, options] of [["desktop", DESKTOP], ["phone", PHONE]]) {
  for (const path of ["/", "/docs/routing"]) {
    const { context, page, chunks, errors } = await open(options, path);
    check(`${label} ${path}: no console frames on a cold visit`, (await frames(page)) === 0, `${await frames(page)} frames`);
    check(`${label} ${path}: none of the companion downloaded`, chunks.length === 0, chunks.join(" "));
    check(`${label} ${path}: no page errors`, errors.length === 0, errors.join(" | "));
    if (path === "/") {
      const hero = await page.locator(".hero [data-textjs-mirror]").innerText().catch(() => "");
      check(`${label} /: the hero mirrors the console's first frame`, hero.includes("React 19 in console.log") && hero.includes("count"), hero.slice(0, 200));
    }
    await context.close();
  }
}

// Every way in on a desktop.
const ways = [
  ["F12", async (page) => page.keyboard.press("F12")],
  ["Ctrl+Shift+J", async (page) => page.keyboard.press("Control+Shift+J")],
  [
    "docking DevTools (a resize)",
    async (page) =>
      page.evaluate(() => {
        window.__dock = 320;
        dispatchEvent(new Event("resize"));
      }),
  ],
  // The console's log row is the "Click to focus" button; the rest of the DevTools window is the engage surface.
  ["a click on the hero's console", async (page) => page.locator(".hero .dt-log").click()],
  ["a click on the hero's DevTools prompt", async (page) => page.locator(".hero .dt-prompt").click()],
  ["the hero's inspect button", async (page) => page.locator(".hero .dt-inspect").click()],
  ["the Console pill", async (page) => page.locator(".console-pill").click()],
];
for (const [name, act] of ways) {
  const { context, page, errors } = await open(DESKTOP, "/");
  await act(page);
  check(`desktop /: ${name} boots the companion`, await booted(page), `${await frames(page)} frames`);
  await page.waitForTimeout(400);
  const hero = await page.locator(".hero [data-textjs-mirror]").innerText();
  check(`desktop /: after ${name}, the hero mirrors the live console`, hero.includes("React 19 in console.log"), hero.slice(0, 200));
  const engaged = await page.locator(".hero .dt-log.engaged").count();
  const shouldEngage = /click|pill/i.test(name);
  check(`desktop /: ${name} ${shouldEngage ? "gives" : "doesn't give"} the console the keyboard`, (engaged === 1) === shouldEngage, `engaged ${engaged}`);
  if (/inspect/.test(name)) check("desktop /: the inspect button turns the wireframe on", (await page.locator(".hero .dt-inspect.active").count()) === 1 && (await page.evaluate(() => window.text?.renderer?.wireframe)) === true);
  check(`desktop /: ${name}: no page errors`, errors.length === 0, errors.join(" | "));
  if (name === "a click on the hero's console") {
    const before = await page.locator(".hero [data-textjs-mirror]").innerText();
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(300);
    const after = await page.locator(".hero [data-textjs-mirror]").innerText();
    check("desktop /: ↑ after the boot click counts up in the hero", before !== after, after.slice(0, 400));
    // Same tab: the reload boots at once, even with DevTools undocked.
    await page.reload({ waitUntil: "load" });
    check("desktop /: a reload in the same tab boots without another signal", await booted(page), "no frames after reload");
  }
  await context.close();
}

// Docs: running an example in the console works before boot.
{
  const { context, page, errors } = await open(DESKTOP, "/docs/components-layout");
  const stage = page.locator("[data-preview] .preview-stage").first();
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  check("desktop docs: the stage offers to run in the console before boot", (await stage.getAttribute("title")) === "Click to run in your console", String(await stage.getAttribute("title")));
  await stage.click();
  check("desktop docs: clicking an example boots the companion", await booted(page));
  await page.waitForTimeout(600);
  check("desktop docs: the example runs in the console", (await page.locator(".preview.in-console").count()) === 1);
  check("desktop docs: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

// Pads: a click on the pad, or a size picked before boot, starts the console (at that size).
{
  const { context, page, errors } = await open(DESKTOP, "/playground");
  check("desktop /playground: no frames before intent", (await frames(page)) === 0);
  await page.locator(".pad-stage select").first().selectOption("80x24");
  check("desktop /playground: picking a size boots the companion", await booted(page));
  await page.waitForTimeout(600);
  const size = await page.evaluate(() => (window.text ? `${window.text.stats().cols}x${window.text.stats().rows}` : null));
  check("desktop /playground: it boots at the picked size", size === "80x24", String(size));
  // As before lazy loading: a size picked in a focus pad also gives the console the keyboard (FocusPad's onChange activates it).
  check("desktop /playground: picking a size gives the console the keyboard", (await page.evaluate(() => document.activeElement?.hasAttribute("data-textjs-input-sink"))) === true);
  check("desktop /playground: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}
{
  const { context, page, chunks } = await open(DESKTOP, "/playground");
  check("desktop /playground: the companion downloads on idle", chunks.includes("/assets/boot"), chunks.join(" "));
  check("desktop /playground: but doesn't boot", (await frames(page)) === 0);
  await page.mouse.click(720, 600);
  check("desktop /playground: a click on the pad boots it", await booted(page));
  await page.waitForTimeout(500);
  check("desktop /playground: and gives it the keyboard", (await page.evaluate(() => document.activeElement?.hasAttribute("data-textjs-input-sink"))) === true);
  await context.close();
}

// Localized pads: the locale prefix doesn't hide the route from idle prefetch or engaging.
{
  const { context, page, chunks, errors } = await open(DESKTOP, "/ja/playground");
  check("desktop /ja/playground: the companion downloads on idle", chunks.includes("/assets/boot"), chunks.join(" "));
  check("desktop /ja/playground: but doesn't boot", (await frames(page)) === 0);
  await page.locator(".pad-stage").click({ position: { x: 8, y: 8 } });
  check("desktop /ja/playground: a click beside the pad boots it", await booted(page));
  await page.waitForTimeout(500);
  check("desktop /ja/playground: and gives it the keyboard", (await page.evaluate(() => document.activeElement?.hasAttribute("data-textjs-input-sink"))) === true);
  check("desktop /ja/playground: no page errors", errors.length === 0, errors.join(" | "));
  await context.close();
}

// Navigating to a pad in the page downloads the companion on idle too.
{
  const { context, page, chunks } = await open(DESKTOP, "/docs/routing");
  await page.evaluate(() => {
    history.pushState(null, "", "/playground");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForTimeout(2500);
  check("desktop: a client-side navigation to /playground downloads the companion", chunks.includes("/assets/boot"), chunks.join(" "));
  check("desktop: but doesn't boot it", (await frames(page)) === 0);
  await context.close();
}

// A boot that fails on a dropped connection (Yoga's WebAssembly here) is retried by the next click without a
// reload, and leaves no second keyboard sink behind. A failed *chunk* can't be retried in place: Chromium, Firefox
// and WebKit all keep a failed module fetch in their module map, so that path reloads once (see crash-reports.md).
{
  const { context, page } = await open(DESKTOP, null);
  let aborted = 0;
  await page.route(/\/assets\/yoga-[\w-]+\.wasm$/, (r) => (aborted++ === 0 ? r.abort() : r.continue()));
  await page.goto(base + "/", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window.__sameDocument = true));
  await page.locator(".hero .dt-log").click();
  await page.waitForTimeout(2500);
  check("desktop /: a boot whose WebAssembly failed to load logs no frames", aborted === 1 && (await frames(page)) === 0, `${aborted} requests, ${await frames(page)} frames`);
  check("desktop /: and hands the hero back (not engaged)", (await page.locator(".hero .dt-log.engaged").count()) === 0);
  check("desktop /: and leaves no keyboard sink", (await page.locator("[data-textjs-input-sink]").count()) === 0);
  await page.locator(".hero .dt-log").click();
  check("desktop /: the next click boots the companion", await booted(page));
  await page.waitForTimeout(400);
  check("desktop /: without reloading the page", (await page.evaluate(() => window.__sameDocument)) === true);
  check("desktop /: with one keyboard sink", (await page.locator("[data-textjs-input-sink]").count()) === 1, String(await page.locator("[data-textjs-input-sink]").count()));
  await context.close();
}

// Keys pressed right after the click, while the companion is still loading on a slow network, reach it.
{
  const { context, page } = await open(DESKTOP, "/");
  const mirror = () => page.locator(".hero [data-textjs-mirror]").innerText();
  const zero = await mirror();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  await page.locator(".hero .dt-log").click();
  check("desktop /: the click shows the console as engaged before it loads", (await page.locator(".hero .dt-log.engaged").count()) === 1 && (await frames(page)) === 0);
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  check("desktop /: the companion boots on the slow network", await page.waitForFunction(() => window.__frames > 0, null, { timeout: 60000 }).then(() => true, () => false));
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.waitForTimeout(500);
  const two = await mirror();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(400);
  check("desktop /: ↑ ↑ pressed while it loaded count to 2", two !== zero && (await mirror()) === zero, two.slice(0, 600));
  await context.close();
}

// Hovering a console surface downloads the companion without booting it.
{
  const { context, page, chunks } = await open(DESKTOP, "/");
  await page.locator(".hero .dt-log").hover();
  await page.waitForTimeout(1500);
  check("desktop /: hovering the hero downloads the companion", chunks.includes("/assets/boot"), chunks.join(" "));
  check("desktop /: hovering doesn't boot it", (await frames(page)) === 0);
  await context.close();
}

// Phones: the hero's console is a picture. Taps on it don't boot anything; the inspect button still works.
{
  const { context, page, chunks } = await open(PHONE, "/");
  check("phone /: no Click to focus button", (await page.locator(".hero .dt-focus").count()) === 0);
  await page.locator(".hero .dt-log").tap();
  await page.locator(".hero .dt-prompt").tap();
  await page.waitForTimeout(1500);
  check("phone /: taps on the hero's console don't boot the companion", (await frames(page)) === 0 && chunks.length === 0, `${await frames(page)} frames, ${chunks.join(" ")}`);
  await page.locator(".hero .dt-inspect").tap();
  check("phone /: the inspect button still boots it for the wireframe", await booted(page));
  await page.waitForTimeout(400);
  check("phone /: and the hero shows the wireframe", (await page.locator(".hero .dt-inspect.active").count()) === 1 && (await page.evaluate(() => window.text?.renderer?.wireframe)) === true);
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : "\nall good");
process.exit(failures ? 1 : 0);
