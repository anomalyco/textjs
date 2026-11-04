/**
 * `text build --embed` end to end in a real Chromium: a plain HTML page on one
 * origin loads `embed.js` from `text start` on another, the way a marketing
 * site would.
 *
 * Skipped when Playwright (bench/devtools) or a Chromium build isn't installed.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/cli/build";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer, type StartedServer } from "../src/cli/start";
import { createFixture, REPO } from "./server-fixture";

const PLAYWRIGHT = join(REPO, "bench/devtools/node_modules/playwright-core/index.mjs");

function findChromium(): string | null {
  if (process.env.TEXTJS_CHROMIUM && existsSync(process.env.TEXTJS_CHROMIUM)) return process.env.TEXTJS_CHROMIUM;
  for (const cache of [join(homedir(), "Library", "Caches", "ms-playwright"), join(homedir(), ".cache", "ms-playwright")]) {
    if (!existsSync(cache)) continue;
    const dirs = readdirSync(cache)
      .filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => Number(b.split("-").pop()) - Number(a.split("-").pop()));
    for (const d of dirs) {
      for (const rel of [
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-linux/chrome",
        "chrome-linux64/chrome",
        "chrome-headless-shell-linux64/chrome-headless-shell",
      ]) {
        const p = join(cache, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  return null;
}

const chromiumPath = findChromium();
const enabled = existsSync(PLAYWRIGHT) && chromiumPath !== null;

/** The slice of playwright-core this test uses. */
interface Page {
  on(event: "console", fn: (m: { type(): string; text(): string }) => void): void;
  on(event: "request", fn: (r: { url(): string }) => void): void;
  on(event: "pageerror", fn: (e: Error) => void): void;
  addInitScript(fn: () => void): Promise<void>;
  goto(url: string): Promise<unknown>;
  evaluate<T, A = undefined>(fn: (arg: A) => T, arg?: A): Promise<T>;
  click(selector: string): Promise<void>;
  tap(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  focus(selector: string): Promise<void>;
  keyboard: { press(key: string): Promise<void>; type(text: string): Promise<void> };
  mouse: { wheel(dx: number, dy: number): Promise<void> };
  bringToFront(): Promise<void>;
  close(): Promise<void>;
}
interface Context {
  newPage(): Promise<Page>;
  close(): Promise<void>;
}
interface Browser {
  newContext(options?: { viewport?: { width: number; height: number }; isMobile?: boolean; hasTouch?: boolean }): Promise<Context>;
  close(): Promise<void>;
}
interface PW {
  chromium: { launch(options: { executablePath: string; headless: boolean }): Promise<Browser> };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function until(fn: () => boolean | Promise<boolean>, timeout = 15_000): Promise<void> {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > timeout) throw new Error("timed out");
    await sleep(25);
  }
}

const PAGE = `import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";
export default function StatusEmbed() {
  const [tab, setTab] = useState(0);
  useInput((e) => {
    if (e.key === "left") setTab((t) => (t + 2) % 3);
    if (e.key === "right") setTab((t) => (t + 1) % 3);
  });
  return (
    <Box flexDirection="column" border="rounded" paddingX={2} paddingY={1}>
      <Text bold>Acme Systems</Text>
      <Text>{"region " + ["us", "eu", "ap"][tab]}</Text>
    </Box>
  );
}
`;

const hostHtml = (src: string): string => `<!doctype html>
<html><head><meta charset="utf-8"><title>Acme host</title><link rel="icon" href="data:,"></head>
<body>
  <h1>Acme</h1>
  <input id="field" aria-label="field">
  <button type="button" data-textjs-engage>Open in the console</button>
  <p id="prose">Long page.</p>
  <script>console.log("host log before embed");</script>
  <script type="module" src="${src}"></script>
</body></html>`;

describe.skipIf(!enabled)("embed.js on a plain HTML page in Chromium", () => {
  let dir = "";
  let embed: StartedServer;
  let host: ReturnType<typeof Bun.serve>;
  let browser: Browser;
  let embedOrigin = "";
  let hostUrl = "";
  const env = process.env.NODE_ENV;

  beforeAll(async () => {
    // As users run it: `bun test` sets NODE_ENV=test, which would bundle React's development builds.
    delete process.env.NODE_ENV;
    dir = createFixture({ "text.config.ts": `import { defineConfig } from "@textjs/app";\nexport default defineConfig({ embed: true });\n`, "app/page.tsx": PAGE }, "textjs-embed-e2e-");
    await buildApp({ root: dir, log: false });
    if (env !== undefined) process.env.NODE_ENV = env;
    embed = await startProductionServer({ root: dir, port: 0, log: false });
    // Another origin: the host page is on 127.0.0.1, the embed on localhost.
    embedOrigin = new URL(embed.url).origin;
    const html = hostHtml(`${embedOrigin}/embed.js`);
    // A strict policy: no inline styles, scripts only from the embed's origin (plus the page's own inline log).
    const csp = `default-src 'none'; script-src 'unsafe-inline' ${embedOrigin} 'wasm-unsafe-eval'; connect-src ${embedOrigin}; style-src 'self'; img-src data:`;
    host = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": csp } }) });
    hostUrl = `http://127.0.0.1:${host.port}/`;
    const pw = (await import(PLAYWRIGHT)) as PW;
    browser = await pw.chromium.launch({ executablePath: chromiumPath as string, headless: true });
  }, 240_000);

  afterAll(async () => {
    await browser?.close();
    host?.stop(true);
    await embed?.close();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  /** A desktop page whose window metrics read as DevTools closed until `window.__dock(px)` docks a panel at the bottom. */
  async function open(context: Context): Promise<{ page: Page; logs: () => string[]; clears: () => number; requests: () => string[] }> {
    const page = await context.newPage();
    const calls: Array<{ type: string; text: string }> = [];
    const requests: string[] = [];
    page.on("console", (m) => calls.push({ type: m.type(), text: m.text().replace(/%c/g, "") }));
    page.on("request", (r) => requests.push(r.url()));
    await page.addInitScript(() => {
      let dock = 0;
      const w = window as unknown as Record<string, unknown>;
      const violations: string[] = [];
      w.__violations = violations;
      document.addEventListener("securitypolicyviolation", (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
      Object.defineProperty(window, "outerWidth", { configurable: true, get: () => 1200 });
      Object.defineProperty(window, "innerWidth", { configurable: true, get: () => 1200 });
      // An 88px browser toolbar; docking takes height from the page only.
      Object.defineProperty(window, "outerHeight", { configurable: true, get: () => 888 });
      Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 800 - dock });
      w.__dock = (px: number) => {
        dock = px;
        window.dispatchEvent(new Event("resize"));
      };
    });
    await page.goto(hostUrl);
    await page.bringToFront();
    return {
      page,
      logs: () => calls.filter((c) => c.type === "log").map((c) => c.text),
      clears: () => calls.filter((c) => c.type === "clear").length,
      requests: () => requests.filter((u) => u.startsWith(embedOrigin)).map((u) => new URL(u).pathname),
    };
  }

  test(
    "DevTools closed: frame 0 once, nothing else loads, the page keeps its keyboard; docking boots the app below it",
    async () => {
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      try {
        const { page, logs, clears, requests } = await open(context);
        await until(() => logs().some((l) => l.includes("Acme Systems")));
        await sleep(1000);
        expect(requests()).toEqual(["/embed.js"]);
        expect(logs().filter((l) => l.includes("Acme Systems"))).toHaveLength(1);
        expect(logs()[0]).toBe("host log before embed");
        expect(clears()).toBe(0);
        expect(await page.evaluate(() => ({ sink: document.querySelectorAll("[data-textjs-input-sink]").length, text: "text" in window }))).toEqual({ sink: 0, text: false });
        await page.fill("#field", "typed");
        expect(await page.evaluate(() => (document.getElementById("field") as HTMLInputElement).value)).toBe("typed");

        // DevTools docks at the bottom: the runtime and Yoga load, and frame 1 appends without clearing.
        await page.evaluate(() => (window as unknown as { __dock(px: number): void }).__dock(320));
        await until(() => logs().filter((l) => l.includes("Acme Systems")).length >= 2);
        const loaded = requests();
        expect(loaded.some((p) => /^\/assets\/embed-client-[\w-]+\.js$/.test(p))).toBe(true);
        expect(loaded.some((p) => /^\/assets\/yoga-[\w-]+\.wasm$/.test(p))).toBe(true);
        expect(clears()).toBe(0);
        expect(logs()[0]).toBe("host log before embed");
        expect(await page.evaluate(() => ({ href: location.href, title: document.title, text: typeof (window as unknown as { text?: { stats?: unknown } }).text?.stats }))).toEqual({ href: hostUrl, title: "Acme host", text: "function" });

        // Unengaged, keys belong to the page.
        await page.focus("#field");
        await page.keyboard.press("ArrowRight");
        await sleep(300);
        expect(logs().some((l) => l.includes("region eu"))).toBe(false);
        // Pressing a console surface routes keys to the app.
        await page.click("[data-textjs-engage]");
        await sleep(50);
        await page.keyboard.press("ArrowRight");
        await until(() => logs().some((l) => l.includes("region eu")));
        // Clicking back into the page's own field hands the keyboard back.
        await page.click("#field");
        await page.keyboard.type("!");
        await page.keyboard.press("ArrowRight");
        await sleep(300);
        expect(logs().some((l) => l.includes("region ap"))).toBe(false);
        expect(await page.evaluate(() => (document.getElementById("field") as HTMLInputElement).value)).toBe("typed!");
        expect(clears()).toBe(0);
        // The input sink and the scrollbar probe set styles through CSSOM, which `style-src 'self'` allows.
        expect(await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations)).toEqual([]);
      } finally {
        await context.close();
      }
    },
    90_000,
  );

  test(
    "touch screens: embed.js logs nothing and loads nothing, even after a tap on a console surface",
    async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        const { page, logs, requests } = await open(context);
        await until(() => requests().includes("/embed.js"));
        await sleep(800);
        await page.tap("[data-textjs-engage]");
        await page.evaluate(() => (window as unknown as { __dock(px: number): void }).__dock(320));
        await sleep(1000);
        expect(requests()).toEqual(["/embed.js"]);
        expect(logs()).toEqual(["host log before embed"]);
        expect(await page.evaluate(() => ({ text: "text" in window, owner: Symbol.for("textjs.consoleOwner") in globalThis }))).toEqual({ text: false, owner: false });
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "text dev --embed: the preview page and another site's page both boot the app on dock",
    async () => {
      // The fixture links @textjs/* from this repo, outside the project, where Vite serves no files by default (yoga.wasm).
      writeFileSync(join(dir, "text.config.ts"), `import { defineConfig } from "@textjs/app";\nexport default defineConfig({ vite: { server: { fs: { allow: [${JSON.stringify(REPO)}, ${JSON.stringify(dir)}] } } } });\n`);
      const dev = await startDevServer({ root: dir, port: 41000 + Math.floor(Math.random() * 2000), log: false, embed: true });
      const devOrigin = new URL(dev.resolvedUrls?.local[0] ?? "").origin;
      const html = hostHtml(`${devOrigin}/embed.js`);
      const other = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }) });
      const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
      try {
        for (const url of [`${devOrigin}/`, `http://127.0.0.1:${other.port}/`]) {
          const page = await context.newPage();
          const logs: string[] = [];
          const errors: string[] = [];
          page.on("console", (m) => (m.type() === "log" ? logs.push(m.text()) : m.type() === "error" ? errors.push(m.text()) : undefined));
          page.on("pageerror", (e) => errors.push(String(e)));
          await page.addInitScript(() => {
            let dock = 0;
            Object.defineProperty(window, "outerWidth", { configurable: true, get: () => 1200 });
            Object.defineProperty(window, "innerWidth", { configurable: true, get: () => 1200 });
            Object.defineProperty(window, "outerHeight", { configurable: true, get: () => 888 });
            Object.defineProperty(window, "innerHeight", { configurable: true, get: () => 800 - dock });
            (window as unknown as Record<string, unknown>).__dock = (px: number) => {
              dock = px;
              window.dispatchEvent(new Event("resize"));
            };
          });
          await page.goto(url);
          await until(() => logs.some((l) => l.includes("Acme Systems")), 30_000);
          await page.evaluate(() => (window as unknown as { __dock(px: number): void }).__dock(320));
          await until(() => logs.filter((l) => l.includes("Acme Systems")).length >= 2 || errors.length > 0, 30_000);
          expect({ url, errors }).toEqual({ url, errors: [] });
          await page.close();
        }
      } finally {
        await context.close();
        other.stop(true);
        await dev.waitForRequestsIdle();
        await dev.close();
      }
    },
    120_000,
  );
});
