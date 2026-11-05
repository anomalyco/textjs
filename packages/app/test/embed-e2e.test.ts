/**
 * `text build --embed` end to end in a real Chromium: a plain HTML page on one
 * origin loads `embed.js` from `text start` on another, the way a marketing
 * site would.
 *
 * Skipped when Playwright (bench/devtools) or a Chromium build isn't installed,
 * unless `TEXTJS_CHROMIUM` names the browser (CI), which makes a missing one fail.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/cli/build";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer, type StartedServer } from "../src/cli/start";
import { createFixture, REPO } from "./server-fixture";

const PLAYWRIGHT = join(REPO, "bench/devtools/node_modules/playwright-core/index.mjs");

function findChromium(): string | null {
  if (process.env.TEXTJS_CHROMIUM) return existsSync(process.env.TEXTJS_CHROMIUM) ? process.env.TEXTJS_CHROMIUM : null;
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

if (process.env.TEXTJS_CHROMIUM && !enabled) {
  test("TEXTJS_CHROMIUM is set, so the embed suite must run", () => {
    throw new Error(`Playwright (${PLAYWRIGHT}) or the browser (${process.env.TEXTJS_CHROMIUM}) is missing.`);
  });
}

/** The slice of playwright-core this test uses. */
interface Route {
  request(): { url(): string };
  continue(): Promise<void>;
  abort(): Promise<void>;
  fulfill(response: { status: number; body?: string; contentType?: string }): Promise<void>;
}
interface Page {
  on(event: "console", fn: (m: { type(): string; text(): string }) => void): void;
  on(event: "request", fn: (r: { url(): string }) => void): void;
  on(event: "pageerror", fn: (e: Error) => void): void;
  route(url: RegExp, handler: (route: Route) => unknown): Promise<void>;
  addInitScript(fn: () => void): Promise<void>;
  goto(url: string): Promise<unknown>;
  evaluate<T, A = undefined>(fn: (arg: A) => T, arg?: A): Promise<T>;
  click(selector: string): Promise<void>;
  tap(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  focus(selector: string): Promise<void>;
  keyboard: { press(key: string): Promise<void>; type(text: string): Promise<void> };
  bringToFront(): Promise<void>;
  close(): Promise<void>;
}
interface Context {
  newPage(): Promise<Page>;
  route(url: RegExp, handler: (route: Route) => unknown): Promise<void>;
  on(event: "page", fn: (p: Page & { url(): string }) => void): void;
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

const config = (body = "{ embed: true }"): string => `import { defineConfig } from "@textjs/app";\nexport default defineConfig(${body});\n`;

/** Arrow keys switch regions; `a` opens /about, `x` an external URL. /about's `s` opens a server-rendered page. */
const CLIENT_APP: Record<string, string> = {
  "text.config.ts": config(),
  "app/page.tsx": `import { useState } from "react";
import { Box, Text, useInput } from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
export default function StatusEmbed() {
  const [tab, setTab] = useState(0);
  const router = useRouter();
  useInput((e) => {
    if (e.key === "left") setTab((t) => (t + 2) % 3);
    if (e.key === "right") setTab((t) => (t + 1) % 3);
    if (e.input === "a") router.push("/about");
    if (e.input === "x") router.push("https://example.com/docs");
  });
  return (
    <Box flexDirection="column" border="rounded" paddingX={2} paddingY={1}>
      <Text bold>Acme Systems</Text>
      <Text>{"region " + ["us", "eu", "ap"][tab]}</Text>
    </Box>
  );
}
`,
  "app/about/page.tsx": `import { Text, useInput } from "@textjs/app";
import { useRouter } from "@textjs/app/navigation";
export default function About() {
  const router = useRouter();
  useInput((e) => { if (e.input === "s") router.push("/srv"); });
  return <Text>About page</Text>;
}
`,
  "app/srv/page.tsx": `import { Text } from "@textjs/app";\nexport const runtime = "server";\nexport default function Srv() { return <Text>server page</Text>; }\n`,
};

const SERVER_APP: Record<string, string> = {
  "text.config.ts": config(`{ embed: { allowOrigins: ["http://127.0.0.1:*"] } }`),
  "app/page.tsx": `import { Text } from "@textjs/app";\nexport const runtime = "server";\nexport default function Home() { return <Text>Live Systems</Text>; }\n`,
};

/** The page's own Text.js app: `startHost()` renders into the console, `startHostPlayer()` plays a server route. */
const HOST_SCRIPT = `import { ConsoleRenderer } from ${JSON.stringify(join(REPO, "packages/core/src/index.ts"))};
import { bootFramePlayer } from ${JSON.stringify(join(REPO, "packages/app/src/live-player.ts"))};
window.startHost = () => { window.hostApp = new ConsoleRenderer({ input: false }); };
window.startHostPlayer = () => { window.hostApp = bootFramePlayer({ basePath: "", endpoint: "/no-live-server", path: "/" }); };
if (new URLSearchParams(location.search).get("host") === "first") window.startHost();
`;

/** What `?el=` puts on the host page. */
const ELEMENTS: Record<string, string> = {
  mirror: "<text-console mirror></text-console>",
  chrome: "<text-console chrome></text-console>",
  pad: "<text-console></text-console>",
  hints: '<text-console hints="← →:switch region"></text-console>',
};
/** A page stylesheet that would restyle anything it reaches. */
const LEAKY_CSS = "* { letter-spacing: 3px !important; text-transform: uppercase !important; font-family: Georgia, serif !important; color: red !important; }";

const hostHtml = (src: string, host: boolean, element = "", leak = false, reserve = false): string => `<!doctype html>
<html><head><meta charset="utf-8"><title>Acme host</title><link rel="icon" href="data:,">${leak ? '<link rel="stylesheet" href="/host.css">' : ""}${reserve ? '<link rel="stylesheet" href="/reserve.css">' : ""}</head>
<body>
  <h1>Acme</h1>
  ${element}
  <input id="field" aria-label="field">
  <button type="button" data-textjs-engage>Open in the console</button>
  <p id="prose">Long page.</p>
  <script>console.log("host log before embed");</script>
  ${host ? '<script type="module" src="/host.js"></script>' : ""}
  <script type="module" src="${src}"></script>
</body></html>`;

describe.skipIf(!enabled)("embed.js on a plain HTML page in Chromium", () => {
  let dir = "";
  let serverDir = "";
  let embed: StartedServer;
  let live: StartedServer;
  let host: ReturnType<typeof Bun.serve>;
  let browser: Browser;
  let hostScript = "";
  /** What `text build --embed` printed for host pages. */
  let reserveCss = "";
  const env = process.env.NODE_ENV;

  beforeAll(async () => {
    // As users run it: `bun test` sets NODE_ENV=test, which would bundle React's development builds.
    delete process.env.NODE_ENV;
    dir = createFixture(CLIENT_APP, "textjs-embed-e2e-");
    serverDir = createFixture(SERVER_APP, "textjs-embed-e2e-live-");
    reserveCss = (await buildApp({ root: dir, log: false })).embed?.reserveCss as string;
    await buildApp({ root: serverDir, log: false });
    if (env !== undefined) process.env.NODE_ENV = env;
    embed = await startProductionServer({ root: dir, port: 0, log: false });
    live = await startProductionServer({ root: serverDir, port: 0, log: false });
    const fromVite = createRequire(createRequire(import.meta.url).resolve("vite/package.json"));
    const esbuild = fromVite("esbuild") as { build(o: Record<string, unknown>): Promise<{ outputFiles: Array<{ text: string }> }> };
    hostScript = (await esbuild.build({ stdin: { contents: HOST_SCRIPT, loader: "js", resolveDir: join(REPO, "packages/app") }, bundle: true, write: false, format: "esm", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } })).outputFiles[0]!.text;
    // A strict policy: no inline styles, scripts only from the embeds' origins (plus the page's own inline log).
    const origins = `${new URL(embed.url).origin} ${new URL(live.url).origin}`;
    const csp = `default-src 'none'; script-src 'self' 'unsafe-inline' ${origins} 'wasm-unsafe-eval'; connect-src 'self' ${origins}; style-src 'self'; img-src data:`;
    host = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      fetch: (req) => {
        const url = new URL(req.url);
        if (url.pathname === "/host.js") return new Response(hostScript, { headers: { "content-type": "text/javascript" } });
        if (url.pathname === "/host.css") return new Response(LEAKY_CSS, { headers: { "content-type": "text/css" } });
        if (url.pathname === "/reserve.css") return new Response(reserveCss, { headers: { "content-type": "text/css" } });
        if (url.pathname !== "/") return new Response("not found", { status: 404 });
        const src = url.searchParams.get("embed") === "live" ? `${new URL(live.url).origin}/embed.js` : `${new URL(embed.url).origin}/embed.js`;
        return new Response(hostHtml(src, url.searchParams.has("host"), ELEMENTS[url.searchParams.get("el") ?? ""], url.searchParams.has("leak"), url.searchParams.has("reserve")), { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": csp } });
      },
    });
    const pw = (await import(PLAYWRIGHT)) as PW;
    browser = await pw.chromium.launch({ executablePath: chromiumPath as string, headless: true });
  }, 300_000);

  afterAll(async () => {
    await browser?.close();
    host?.stop(true);
    await embed?.close();
    await live?.close();
    for (const d of [dir, serverDir]) if (d) rmSync(d, { recursive: true, force: true });
  });

  const hostUrl = (query = ""): string => `http://127.0.0.1:${host.port}/${query}`;

  interface Opened {
    page: Page;
    logs(): string[];
    warnings(): string[];
    errors(): string[];
    clears(): number;
    /** Paths requested from the embed servers. */
    requests(): string[];
    dock(): Promise<void>;
    count(text: string): number;
  }

  /** A desktop page whose window metrics read as DevTools closed until `dock()` docks a panel at the bottom. */
  async function open(context: Context, url: string, before?: (page: Page) => Promise<void>): Promise<Opened> {
    const page = await context.newPage();
    const calls: Array<{ type: string; text: string }> = [];
    const requests: string[] = [];
    const embedOrigins = [new URL(embed.url).origin, new URL(live.url).origin];
    page.on("console", (m) => calls.push({ type: m.type(), text: m.text().replace(/%c/g, "") }));
    page.on("pageerror", (e) => calls.push({ type: "pageerror", text: String(e) }));
    page.on("request", (r) => {
      if (embedOrigins.some((o) => r.url().startsWith(o))) requests.push(new URL(r.url()).pathname);
    });
    await page.addInitScript(() => {
      let dock = 0;
      const w = window as unknown as Record<string, unknown>;
      const violations: string[] = [];
      w.__violations = violations;
      document.addEventListener("securitypolicyviolation", (e) => violations.push(`${e.violatedDirective} ${e.blockedURI}`));
      window.addEventListener("unhandledrejection", (e) => console.error(`unhandledrejection: ${String(e.reason)}`));
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
    await before?.(page);
    await page.goto(url);
    await page.bringToFront();
    const logs = (): string[] => calls.filter((c) => c.type === "log").map((c) => c.text);
    return {
      page,
      logs,
      warnings: () => calls.filter((c) => c.type === "warning").map((c) => c.text),
      errors: () => calls.filter((c) => c.type === "error" || c.type === "pageerror").map((c) => c.text),
      clears: () => calls.filter((c) => c.type === "clear").length,
      requests: () => [...requests],
      dock: () => page.evaluate(() => (window as unknown as { __dock(px: number): void }).__dock(320)),
      count: (text) => logs().filter((l) => l.includes(text)).length,
    };
  }

  const desktop = (): Promise<Context> => browser.newContext({ viewport: { width: 1200, height: 800 } });
  const isRuntime = (p: string): boolean => /^\/assets\/embed-(client|player)-[\w-]+\.js$/.test(p);
  /** Who has the console and `window.text`. */
  const ownership = (page: Page) =>
    page.evaluate(() => {
      const w = window as unknown as { text?: { renderer?: unknown; stats?: () => { runtime?: string } }; hostApp?: unknown };
      const owner = (globalThis as unknown as Record<symbol, { embed?: boolean } | undefined>)[Symbol.for("textjs.consoleOwner")];
      return { owner: owner === undefined ? "none" : owner.embed ? "embed" : "host", textIsHost: w.text !== undefined && (w.text.renderer === w.hostApp || w.text.stats?.().runtime === "server"), sinks: document.querySelectorAll("[data-textjs-input-sink]").length };
    });

  test(
    "DevTools closed: frame 0 once, nothing else loads, the page keeps its keyboard; docking boots the app below it",
    async () => {
      const context = await desktop();
      try {
        const { page, logs, clears, requests, dock, count, errors } = await open(context, hostUrl());
        await until(() => count("Acme Systems") === 1);
        await sleep(1000);
        expect(requests()).toEqual(["/embed.js"]);
        expect(count("Acme Systems")).toBe(1);
        expect(logs()[0]).toBe("host log before embed");
        expect(clears()).toBe(0);
        expect(await page.evaluate(() => ({ sink: document.querySelectorAll("[data-textjs-input-sink]").length, text: "text" in window }))).toEqual({ sink: 0, text: false });
        await page.fill("#field", "typed");

        // DevTools docks at the bottom: the runtime and Yoga load, and frame 1 appends without clearing.
        await dock();
        await until(() => count("Acme Systems") >= 2);
        expect(requests().some((p) => /^\/assets\/embed-client-[\w-]+\.js$/.test(p))).toBe(true);
        expect(requests().some((p) => /^\/assets\/yoga-[\w-]+\.wasm$/.test(p))).toBe(true);
        expect(clears()).toBe(0);
        expect(logs()[0]).toBe("host log before embed");
        expect(await page.evaluate(() => ({ href: location.href, title: document.title, text: typeof (window as unknown as { text?: { stats?: unknown } }).text?.stats }))).toEqual({ href: hostUrl(), title: "Acme host", text: "function" });

        // Unengaged, keys belong to the page.
        await page.focus("#field");
        await page.keyboard.press("ArrowRight");
        await sleep(300);
        expect(count("region eu")).toBe(0);
        // Pressing a console surface routes keys to the app.
        await page.click("[data-textjs-engage]");
        await sleep(50);
        await page.keyboard.press("ArrowRight");
        await until(() => count("region eu") > 0);
        // Clicking back into the page's own field hands the keyboard back.
        await page.click("#field");
        await page.keyboard.type("!");
        await page.keyboard.press("ArrowRight");
        await sleep(300);
        expect(count("region ap")).toBe(0);
        expect(await page.evaluate(() => (document.getElementById("field") as HTMLInputElement).value)).toBe("typed!");
        expect(clears()).toBe(0);
        // The input sink and the scrollbar probe set styles through CSSOM, which `style-src 'self'` allows.
        expect(await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations)).toEqual([]);
        expect(errors()).toEqual([]);
      } finally {
        await context.close();
      }
    },
    90_000,
  );

  test(
    "navigation stays in the console: other routes, server routes and external URLs never navigate the host page",
    async () => {
      const context = await desktop();
      const popups: string[] = [];
      await context.route(/^https:\/\/example\.com\//, (r) => r.fulfill({ status: 200, body: "elsewhere", contentType: "text/plain" }));
      context.on("page", (p) => popups.push(p.url()));
      try {
        const { page, dock, count, errors } = await open(context, hostUrl());
        const length = await page.evaluate(() => {
          (window as unknown as { __marker: number }).__marker = 42;
          return history.length;
        });
        await dock();
        await until(() => count("Acme Systems") >= 2);
        await page.click("[data-textjs-engage]");
        await sleep(50);
        await page.keyboard.press("x");
        await until(() => popups.length > 0);
        await page.keyboard.press("a");
        await until(() => count("About page") > 0);
        await page.keyboard.press("s");
        await until(() => errors().some((e) => e.includes("/srv renders on the server")));
        await sleep(500);
        expect(await page.evaluate(() => ({ marker: (window as unknown as { __marker?: number }).__marker, href: location.href, title: document.title, length: history.length }))).toEqual({ marker: 42, href: hostUrl(), title: "Acme host", length });
        expect(errors().filter((e) => !e.includes("/srv renders on the server"))).toEqual([]);
      } finally {
        await context.close();
      }
    },
    90_000,
  );

  test(
    "the page's own app keeps the console: embed.js stays off when it started first",
    async () => {
      const context = await desktop();
      try {
        const { page, dock, count, requests, warnings } = await open(context, hostUrl("?host=first"));
        await until(() => warnings().some((w) => w.includes("another app is already rendering in this console")));
        await dock();
        await sleep(1000);
        expect(count("Acme Systems")).toBe(0);
        expect(requests()).toEqual(["/embed.js"]);
        expect(await ownership(page)).toEqual({ owner: "host", textIsHost: true, sinks: 0 });
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "the page's own app takes the console from a running embed (renderer and frame player)",
    async () => {
      const context = await desktop();
      try {
        for (const start of ["startHost", "startHostPlayer"] as const) {
          const { page, dock, count } = await open(context, hostUrl("?host"));
          await dock();
          await until(() => count("Acme Systems") >= 2);
          expect((await ownership(page)).owner).toBe("embed");
          await page.evaluate((fn) => (window as unknown as Record<string, () => void>)[fn]!(), start);
          // The embed unmounted, detached its input and dropped its `window.text`: the host app has both.
          expect(await ownership(page)).toEqual({ owner: "host", textIsHost: true, sinks: start === "startHost" ? 0 : 1 });
          const frames = count("Acme Systems");
          await page.click("[data-textjs-engage]");
          await page.keyboard.press("ArrowRight");
          await sleep(300);
          expect(count("Acme Systems")).toBe(frames);
          await page.close();
        }
      } finally {
        await context.close();
      }
    },
    90_000,
  );

  test(
    "a host app that starts while the embed is still loading wins, and the embed never renders",
    async () => {
      const context = await desktop();
      try {
        let release: () => void = () => undefined;
        const held = new Promise<void>((r) => (release = r));
        const { page, dock, count, requests, errors } = await open(context, hostUrl("?host"), (p) =>
          p.route(/\/assets\/embed-client-[\w-]+\.js$/, async (r) => {
            await held;
            await r.continue();
          }),
        );
        await until(() => count("Acme Systems") === 1);
        await dock();
        await until(() => requests().some(isRuntime));
        await page.evaluate(() => (window as unknown as { startHost(): void }).startHost());
        release();
        await sleep(1500);
        expect(count("Acme Systems")).toBe(1);
        expect(await ownership(page)).toEqual({ owner: "host", textIsHost: true, sinks: 0 });
        expect(errors()).toEqual([]);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "a server-rendered embed: the frame player streams, and gives way to the page's own app",
    async () => {
      const context = await desktop();
      try {
        const first = await open(context, hostUrl("?embed=live&host=first"));
        await until(() => first.warnings().some((w) => w.includes("won't start")));
        await first.dock();
        await sleep(800);
        expect(first.requests()).toEqual(["/embed.js"]);
        await first.page.close();

        const { page, dock, count, requests } = await open(context, hostUrl("?embed=live&host"));
        await until(() => count("Live Systems") === 1);
        await dock();
        await until(() => count("Live Systems") >= 2, 20_000);
        expect(requests().some((p) => /^\/assets\/embed-player-[\w-]+\.js$/.test(p))).toBe(true);
        expect(requests()).toContain("/__textjs/live");
        expect((await ownership(page)).owner).toBe("embed");
        await page.evaluate(() => (window as unknown as { startHost(): void }).startHost());
        expect(await ownership(page)).toEqual({ owner: "host", textIsHost: true, sinks: 0 });
      } finally {
        await context.close();
      }
    },
    90_000,
  );

  test(
    "files a redeploy removed: one warning, no unhandled rejection, and the console is free again",
    async () => {
      const context = await desktop();
      try {
        for (const [what, pattern, respond] of [
          ["the runtime chunk", /\/assets\/embed-client-[\w-]+\.js$/, (r: Route) => r.fulfill({ status: 404, body: "gone" })],
          ["yoga.wasm", /\/assets\/yoga-[\w-]+\.wasm$/, (r: Route) => r.abort()],
        ] as const) {
          const { page, dock, warnings, errors } = await open(context, hostUrl(), (p) => p.route(pattern, respond));
          await dock();
          await until(() => warnings().some((w) => w.includes("couldn't load its files")));
          await sleep(500);
          expect({ what, warnings: warnings().filter((w) => w.includes("Text.js")).length }).toEqual({ what, warnings: 1 });
          expect({ what, unhandled: errors().filter((e) => e.includes("unhandledrejection") || e.includes("Uncaught")) }).toEqual({ what, unhandled: [] });
          expect({ what, owner: (await ownership(page)).owner }).toEqual({ what, owner: "none" });
          await page.close();
        }
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "a field focused while the runtime loads keeps the keyboard, even after a press on a console surface",
    async () => {
      const context = await desktop();
      try {
        let release: () => void = () => undefined;
        const held = new Promise<void>((r) => (release = r));
        const { page, count, requests } = await open(context, hostUrl(), (p) =>
          p.route(/\/assets\/embed-client-[\w-]+\.js$/, async (r) => {
            await held;
            await r.continue();
          }),
        );
        await until(() => count("Acme Systems") === 1);
        await page.click("[data-textjs-engage]");
        await until(() => requests().some(isRuntime));
        await page.click("#field");
        release();
        await until(() => count("Acme Systems") >= 2);
        await page.keyboard.type("q");
        await page.keyboard.press("ArrowRight");
        await sleep(300);
        expect(count("region eu")).toBe(0);
        expect(await page.evaluate(() => ({ active: document.activeElement?.id, value: (document.getElementById("field") as HTMLInputElement).value }))).toEqual({ active: "field", value: "q" });
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "touch screens: embed.js logs nothing and loads nothing, even after a tap on a console surface",
    async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        const { page, logs, requests, dock } = await open(context, hostUrl());
        await until(() => requests().includes("/embed.js"));
        await sleep(800);
        await page.tap("[data-textjs-engage]");
        await dock();
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

  /** `<text-console>`'s shadow tree: its state, the mirror's text and the styles it ended up with. */
  const element = (page: Page) =>
    page.evaluate(() => {
      const host = document.querySelector("text-console") as HTMLElement;
      const f = host.shadowRoot?.querySelector(".f") as HTMLElement | null;
      const css = f ? getComputedStyle(f) : null;
      return {
        state: f?.dataset.state ?? null,
        text: (host.shadowRoot?.querySelector(".s") ?? host.shadowRoot?.querySelector(".b"))?.textContent ?? "",
        display: getComputedStyle(host).display,
        label: host.getAttribute("aria-label"),
        style: css ? { letterSpacing: css.letterSpacing, textTransform: css.textTransform, font: css.fontFamily.includes("Georgia") } : null,
        violations: (window as unknown as { __violations: string[] }).__violations,
      };
    });
  const isElement = (p: string): boolean => /^\/assets\/text-console-[\w-]{8}\.js$/.test(p);

  test(
    "<text-console mirror>: the first frame before anything else loads, then a press boots the app and the mirror follows it",
    async () => {
      const context = await desktop();
      try {
        const { page, requests, count, errors } = await open(context, hostUrl("?el=mirror"));
        await until(async () => (await element(page)).text.includes("region us"));
        await sleep(500);
        expect(requests().filter((r) => r !== "/embed.js").every(isElement)).toBe(true);
        expect(requests().some(isElement)).toBe(true);
        expect(count("Acme Systems")).toBe(1);
        // The curtain that pushes earlier logs up in the console is left out of the page.
        expect((await element(page)).text.startsWith("\u200b")).toBe(false);

        await page.click("text-console");
        await until(() => count("Acme Systems") >= 2);
        expect(requests().some(isRuntime)).toBe(true);
        await page.keyboard.press("ArrowRight");
        await until(() => count("region eu") > 0);
        await until(async () => (await element(page)).text.includes("region eu"));
        const after = await element(page);
        expect(after.state).toBe("live");
        expect(after.violations).toEqual([]);
        expect(errors()).toEqual([]);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "<text-console>: open the console, then click here, then live as keys reach the app",
    async () => {
      const context = await desktop();
      try {
        const { page, dock, count, requests, errors } = await open(context, hostUrl("?el=pad"));
        await until(async () => (await element(page)).state === "open");
        expect((await element(page)).text).toContain("Open the console");
        expect((await element(page)).label).toMatch(/^Open the console, press (⌘ ⌥|Ctrl Shift) J$/);
        await dock();
        await until(() => requests().some(isRuntime));
        await until(async () => (await element(page)).state === "click");
        expect((await element(page)).text).toContain("Click to focus");
        expect((await element(page)).label).toBe("Click to focus");
        // Keyboard users: Tab to it and press Enter.
        await page.focus("text-console");
        await page.keyboard.press("Enter");
        await until(async () => (await element(page)).state === "live");
        expect((await element(page)).label).toBe("Live in your console");
        await page.keyboard.press("ArrowRight");
        await until(() => count("region eu") > 0);
        expect((await element(page)).violations).toEqual([]);
        expect(errors()).toEqual([]);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "<text-console>: once focus moves into one of the page's fields without a press, it's no longer live and its keycaps stay dark",
    async () => {
      const context = await desktop();
      try {
        const { page, dock, count, requests } = await open(context, hostUrl("?el=hints"));
        await dock();
        await until(() => requests().some(isRuntime));
        await page.click("text-console");
        await until(async () => (await element(page)).state === "live");
        expect((await element(page)).label).toBe("← → switch region");
        const lit = () => page.evaluate(() => document.querySelector("text-console")?.shadowRoot?.querySelectorAll("[data-lit]").length ?? 0);
        await page.keyboard.down("ArrowRight");
        expect(await lit()).toBeGreaterThan(0);
        await page.keyboard.up("ArrowRight");
        await until(() => count("region eu") > 0);
        await sleep(250);
        // Tab, autofocus or a dialog moves focus into a field: the page has the keys.
        await page.focus("#field");
        await until(async () => (await element(page)).state !== "live");
        await page.keyboard.down("ArrowRight");
        expect(await lit()).toBe(0);
        await page.keyboard.up("ArrowRight");
        await sleep(300);
        expect(count("region ap")).toBe(0);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "<text-console mirror> taken out of the page and put back draws what the app painted meanwhile",
    async () => {
      const context = await desktop();
      try {
        const { page, count } = await open(context, hostUrl("?el=mirror"));
        await page.click("text-console");
        await until(() => count("Acme Systems") >= 2);
        await page.keyboard.press("ArrowRight");
        await until(async () => (await element(page)).text.includes("region eu"));
        expect((await element(page)).label).toBe("Live");
        await page.evaluate(() => {
          const el = document.querySelector("text-console") as HTMLElement;
          (window as unknown as { __parked: HTMLElement }).__parked = el;
          el.remove();
        });
        await page.keyboard.press("ArrowRight");
        await until(() => count("region ap") > 0);
        await page.evaluate(() => document.body.prepend((window as unknown as { __parked: HTMLElement }).__parked));
        await until(async () => (await element(page)).text.includes("region ap"));
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "<text-console mirror>: an app with more than 4,096 span styles starts them over between frames, never partway through one",
    async () => {
      const context = await desktop();
      try {
        const { page } = await open(context, hostUrl("?el=mirror"));
        await until(async () => (await element(page)).text.includes("region us"));
        const colors = await page.evaluate(() => {
          type Frame = [string, string[], number, number];
          const hub = (globalThis as unknown as Record<symbol, { app: unknown; listeners: Set<() => void> }>)[Symbol.for("textjs.embed")]!;
          const frame = (n: number, base: number): Frame => [
            "%cx".repeat(n),
            Array.from({ length: n }, (_, i) => `color:rgb(${(base + i) % 256}, ${Math.floor((base + i) / 256) % 256}, 7);`),
            n,
            1,
          ];
          const spans = (): string[] => {
            const all = [...(document.querySelector("text-console")!.shadowRoot!.querySelectorAll(".s span") as NodeListOf<HTMLElement>)];
            return [all[0]!, all[all.length - 1]!].map((s) => getComputedStyle(s).color);
          };
          let next = frame(4100, 0);
          hub.app = { frame: () => next, engaged: () => false, docked: () => false };
          for (const l of hub.listeners) l();
          const first = spans();
          next = frame(3, 9000);
          for (const l of hub.listeners) l();
          return [first, spans()];
        });
        expect(colors).toEqual([
          ["rgb(0, 0, 7)", "rgb(3, 16, 7)"],
          ["rgb(40, 35, 7)", "rgb(42, 35, 7)"],
        ]);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "with the CSS text build printed, the page doesn't move when <text-console> loads (bar, mirror, chrome)",
    async () => {
      const context = await desktop();
      try {
        for (const el of ["pad", "mirror", "chrome"]) {
          const { page, requests } = await open(context, hostUrl(`?el=${el}&reserve`), async (p) => {
            await p.addInitScript(() => {
              const w = window as unknown as { __cls: number };
              w.__cls = 0;
              new PerformanceObserver((list) => {
                for (const e of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) if (!e.hadRecentInput) w.__cls += e.value;
              }).observe({ type: "layout-shift", buffered: true });
            });
            // The element's file arrives 1.5 s after the page painted.
            await p.route(/\/assets\/text-console-[\w-]+\.js$/, async (r) => {
              await sleep(1500);
              await r.continue();
            });
          });
          await until(() => requests().some(isElement));
          await until(async () => (await element(page)).state !== null, 10_000);
          await sleep(500);
          const box = await page.evaluate(() => {
            const r = document.querySelector("text-console")!.getBoundingClientRect();
            return { height: r.height, cls: (window as unknown as { __cls: number }).__cls };
          });
          expect({ el, cls: box.cls }).toEqual({ el, cls: 0 });
          if (el === "pad") expect(box.height).toBe(58);
          await page.close();
        }
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "<text-console>: the page's CSS stays out",
    async () => {
      const context = await desktop();
      try {
        const { page } = await open(context, hostUrl("?el=pad&leak"));
        await until(async () => (await element(page)).state !== null);
        const { style, violations } = await element(page);
        expect(style).toEqual({ letterSpacing: "normal", textTransform: "none", font: false });
        expect(violations).toEqual([]);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "<text-console> on a touch screen: a mirror is a picture of the first frame, a bar hides, and nothing else loads",
    async () => {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      try {
        const { page, requests, logs } = await open(context, hostUrl("?el=mirror"));
        await until(async () => (await element(page)).text.includes("Acme Systems"));
        await page.tap("text-console");
        await sleep(800);
        expect(requests().filter((r) => !isElement(r))).toEqual(["/embed.js"]);
        expect(logs()).toEqual(["host log before embed"]);
        expect(await page.evaluate(() => ({ tabIndex: document.querySelector("text-console")?.getAttribute("tabindex") ?? null, label: document.querySelector("text-console")?.getAttribute("aria-label") ?? null }))).toEqual({ tabIndex: null, label: null });
        await page.close();

        // A bar would only hide on a touch screen: its file never loads, and the printed CSS hides the tag.
        const pad = await open(context, hostUrl("?el=pad&reserve"));
        await until(() => pad.requests().includes("/embed.js"));
        await sleep(800);
        expect(pad.requests()).toEqual(["/embed.js"]);
        expect((await element(pad.page)).display).toBe("none");
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
      writeFileSync(join(dir, "text.config.ts"), config(`{ vite: { server: { fs: { allow: [${JSON.stringify(REPO)}, ${JSON.stringify(dir)}] } } } }`));
      const dev = await startDevServer({ root: dir, port: 41000 + Math.floor(Math.random() * 2000), log: false, embed: true });
      const devOrigin = new URL(dev.resolvedUrls?.local[0] ?? "").origin;
      const html = hostHtml(`${devOrigin}/embed.js`, false);
      const other = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }) });
      const context = await desktop();
      try {
        for (const url of [`${devOrigin}/`, `http://127.0.0.1:${other.port}/`]) {
          const { page, dock, count, errors } = await open(context, url);
          await until(() => count("Acme Systems") === 1, 30_000);
          await dock();
          await until(() => count("Acme Systems") >= 2 || errors().length > 0, 30_000);
          expect({ url, errors: errors() }).toEqual({ url, errors: [] });
          await page.close();
        }
      } finally {
        await context.close();
        other.stop(true);
        await dev.waitForRequestsIdle();
        await dev.close();
        writeFileSync(join(dir, "text.config.ts"), CLIENT_APP["text.config.ts"] as string);
      }
    },
    120_000,
  );
});
