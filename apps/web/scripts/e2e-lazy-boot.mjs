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
const COMPANION = /\/assets\/(boot|yoga|reconciler|tabs-loader|HomeTab|DocsTab)-[\w-]+\.js$/;
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
  ["a click on the hero's console", async (page) => page.locator(".hero .devtools .dt-body").click()],
  ["the hero's Click to focus button", async (page) => page.locator(".hero .dt-focus").click()],
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
  const shouldEngage = /click|button|pill/i.test(name) && !/inspect/.test(name);
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
  check("desktop /playground: picking a size doesn't take the keyboard", (await page.getAttribute("[data-textjs-focus-pad]", "data-state")) !== "live");
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

// Hovering a console surface downloads the companion without booting it.
{
  const { context, page, chunks } = await open(DESKTOP, "/");
  await page.locator(".hero .devtools .dt-body").hover();
  await page.waitForTimeout(1500);
  check("desktop /: hovering the hero downloads the companion", chunks.includes("/assets/boot"), chunks.join(" "));
  check("desktop /: hovering doesn't boot it", (await frames(page)) === 0);
  await context.close();
}

// Phones: taps never boot it, and docs examples stay on the page.
{
  const { context, page, chunks } = await open(PHONE, "/");
  await page.locator(".hero .devtools .dt-body").tap();
  await page.waitForTimeout(1500);
  check("phone /: a tap on the hero doesn't boot the companion", (await frames(page)) === 0 && chunks.length === 0, `${await frames(page)} frames, ${chunks.join(" ")}`);
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} failure(s)` : "\nall good");
process.exit(failures ? 1 : 0);
