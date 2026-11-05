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
import { installReactDevToolsHook, REACT18_HEAD, REACT18_ROOT, react18Files, reactDevToolsRenderers } from "./embed-hosts";
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
interface PWRequest {
  url(): string;
  method(): string;
  headers(): Record<string, string>;
}
interface CDPSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  on(event: string, fn: (params: Record<string, any>) => void): void;
}
interface Page {
  on(event: "console", fn: (m: { type(): string; text(): string }) => void): void;
  on(event: "request", fn: (r: PWRequest) => void): void;
  on(event: "pageerror", fn: (e: Error) => void): void;
  route(url: RegExp, handler: (route: Route) => unknown): Promise<void>;
  addInitScript(fn: () => void): Promise<void>;
  goto(url: string): Promise<unknown>;
  evaluate<T, A = undefined>(fn: (arg: A) => T, arg?: A): Promise<T>;
  click(selector: string): Promise<void>;
  tap(selector: string): Promise<void>;
  fill(selector: string, value: string): Promise<void>;
  focus(selector: string): Promise<void>;
  textContent(selector: string): Promise<string | null>;
  keyboard: { press(key: string): Promise<void>; type(text: string): Promise<void>; down(key: string): Promise<void>; up(key: string): Promise<void> };
  bringToFront(): Promise<void>;
  close(): Promise<void>;
}
interface Context {
  newPage(): Promise<Page>;
  route(url: RegExp, handler: (route: Route) => unknown): Promise<void>;
  on(event: "page", fn: (p: Page & { url(): string }) => void): void;
  newCDPSession(page: Page): Promise<CDPSession>;
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

/** An allowed origin no page uses: a session id replayed from it must still be refused. */
const SECOND_ORIGIN = "http://127.0.0.1:9";

/** A server-rendered home with keys and a streamed async component. `beforeAll` sets `allowOrigins` to the host page's origin. */
const SERVER_APP: Record<string, string> = {
  "app/page.tsx": `import { Suspense, useState, type ReactNode } from "react";
import { Box, Text, useInput } from "@textjs/app";
export const runtime = "server";
async function Probe(): Promise<ReactNode> {
  await new Promise((r) => setTimeout(r, 300));
  return <Text>probe ok</Text>;
}
export default function Home() {
  const [n, setN] = useState(0);
  useInput((e) => { if (e.input === "+") setN((v) => v + 1); });
  return (
    <Box flexDirection="column">
      <Text>Live Systems</Text>
      <Text>{"count " + n}</Text>
      <Suspense fallback={<Text>probing</Text>}><Probe /></Suspense>
    </Box>
  );
}
`,
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

interface HostOptions {
  /** The page's own Text.js app (`/host.js`). */
  host?: boolean;
  element?: string;
  leak?: boolean;
  reserve?: boolean;
  /** The page runs its own React 18 app, with an import map that maps `"react"` to React 18. */
  react?: boolean;
  /** No inline scripts: the page's own log comes from a file, for a policy without `'unsafe-inline'`. */
  strict?: boolean;
  /** A page that scrolls. */
  tall?: boolean;
}

const hostHtml = (src: string, o: HostOptions = {}): string => `<!doctype html>
<html><head><meta charset="utf-8"><title>Acme host</title><link rel="icon" href="data:,">${o.leak ? '<link rel="stylesheet" href="/host.css">' : ""}${o.reserve ? '<link rel="stylesheet" href="/reserve.css">' : ""}${o.tall ? '<link rel="stylesheet" href="/tall.css">' : ""}${o.react ? REACT18_HEAD : ""}</head>
<body>
  <h1>Acme</h1>
  ${o.element ?? ""}
  ${o.react ? REACT18_ROOT : ""}
  <input id="field" aria-label="field">
  <button type="button" data-textjs-engage>Open in the console</button>
  <p id="prose">Long page.</p>
  ${o.strict ? '<script src="/host-log.js"></script>' : '<script>console.log("host log before embed");</script>'}
  ${o.host ? '<script type="module" src="/host.js"></script>' : ""}
  <script type="module" src="${src}"></script>
</body></html>`;

describe.skipIf(!enabled)("embed.js on a plain HTML page in Chromium", () => {
  let dir = "";
  let serverDir = "";
  let embed: StartedServer;
  let live: StartedServer;
  let host: ReturnType<typeof Bun.serve>;
  /** The same pages on another origin, which the server app doesn't list in `allowOrigins`. */
  let other: ReturnType<typeof Bun.serve>;
  let browser: Browser;
  let hostScript = "";
  /** What `text build --embed` printed for host pages. */
  let reserveCss = "";
  const env = process.env.NODE_ENV;

  beforeAll(async () => {
    // No inline styles, scripts only from the embeds' origins (plus the page's own inline log and import map).
    const csp = (): string => {
      const origins = `${new URL(embed.url).origin} ${new URL(live.url).origin}`;
      return `default-src 'none'; script-src 'self' 'unsafe-inline' ${origins} 'wasm-unsafe-eval'; connect-src 'self' ${origins}; style-src 'self'; img-src data:`;
    };
    // `?strict`: the policy a security-minded site sends, naming only the embed's own origin and no inline script.
    const strictCsp = (embedOrigin: string): string => `default-src 'none'; script-src 'self' ${embedOrigin} 'wasm-unsafe-eval'; connect-src 'self' ${embedOrigin}; style-src 'self'; img-src 'self' data:`;
    const files: Record<string, { body: string; type: string }> = {
      ...react18Files(),
      "/host-log.js": { body: 'console.log("host log before embed");', type: "text/javascript" },
      "/host.css": { body: LEAKY_CSS, type: "text/css" },
      "/tall.css": { body: "#prose { height: 300vh }", type: "text/css" },
    };
    const serveHost = (req: Request): Response => {
      const url = new URL(req.url);
      if (url.pathname === "/host.js") return new Response(hostScript, { headers: { "content-type": "text/javascript" } });
      if (url.pathname === "/reserve.css") return new Response(reserveCss, { headers: { "content-type": "text/css" } });
      const file = files[url.pathname];
      if (file) return new Response(file.body, { headers: { "content-type": file.type } });
      if (url.pathname !== "/") return new Response("not found", { status: 404 });
      const q = url.searchParams;
      const embedOrigin = new URL(q.get("embed") === "live" ? live.url : embed.url).origin;
      const html = hostHtml(`${embedOrigin}/embed.js`, { host: q.has("host"), element: ELEMENTS[q.get("el") ?? ""], leak: q.has("leak"), reserve: q.has("reserve"), react: q.has("react"), strict: q.has("strict"), tall: q.has("tall") });
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "content-security-policy": q.has("strict") ? strictCsp(embedOrigin) : csp() } });
    };
    host = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: serveHost });
    other = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: serveHost });

    // As users run it: `bun test` sets NODE_ENV=test, which would bundle React's development builds.
    delete process.env.NODE_ENV;
    dir = createFixture(CLIENT_APP, "textjs-embed-e2e-");
    // The host page's origin, and a second allowed one no page uses (`text start` reads allowOrigins at run time).
    serverDir = createFixture({ ...SERVER_APP, "text.config.ts": config(`{ embed: { allowOrigins: ["http://127.0.0.1:${host.port}", "${SECOND_ORIGIN}"] } }`) }, "textjs-embed-e2e-live-");
    reserveCss = (await buildApp({ root: dir, log: false })).embed?.reserveCss as string;
    await buildApp({ root: serverDir, log: false });
    if (env !== undefined) process.env.NODE_ENV = env;
    embed = await startProductionServer({ root: dir, port: 0, log: false });
    live = await startProductionServer({ root: serverDir, port: 0, log: false });
    const fromVite = createRequire(createRequire(import.meta.url).resolve("vite/package.json"));
    const esbuild = fromVite("esbuild") as { build(o: Record<string, unknown>): Promise<{ outputFiles: Array<{ text: string }> }> };
    hostScript = (await esbuild.build({ stdin: { contents: HOST_SCRIPT, loader: "js", resolveDir: join(REPO, "packages/app") }, bundle: true, write: false, format: "esm", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } })).outputFiles[0]!.text;
    const pw = (await import(PLAYWRIGHT)) as PW;
    browser = await pw.chromium.launch({ executablePath: chromiumPath as string, headless: true });
  }, 300_000);

  afterAll(async () => {
    await browser?.close();
    host?.stop(true);
    other?.stop(true);
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

  interface Exchange {
    method: string;
    status?: number;
    /** `Access-Control-Allow-Origin`. */
    acao?: string;
  }
  /** Requests to `/__textjs/live` as the network saw them, CORS preflights included (Playwright doesn't report those). */
  async function network(context: Context, page: Page): Promise<Exchange[]> {
    const out: Exchange[] = [];
    const byId = new Map<string, Exchange>();
    const early = new Map<string, Record<string, any>>();
    const apply = (x: Exchange, info: Record<string, any>): void => {
      x.status = info.statusCode as number;
      const headers = info.headers as Record<string, string>;
      x.acao = Object.entries(headers).find(([k]) => k.toLowerCase() === "access-control-allow-origin")?.[1];
    };
    const cdp = await context.newCDPSession(page);
    cdp.on("Network.requestWillBeSent", (e) => {
      if (!String(e.request.url).includes("/__textjs/live")) return;
      const x: Exchange = { method: e.request.method as string };
      byId.set(e.requestId as string, x);
      out.push(x);
      const info = early.get(e.requestId as string);
      if (info) apply(x, info);
    });
    // Extra info can arrive before the request event.
    cdp.on("Network.responseReceivedExtraInfo", (e) => {
      const x = byId.get(e.requestId as string);
      if (x) apply(x, e);
      else early.set(e.requestId as string, e);
    });
    await cdp.send("Network.enable");
    return out;
  }
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
        await page.evaluate(() => window.scrollTo(0, 200));
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
    "while the app runs unengaged, Space, PageDown, the arrow keys and Tab still scroll and move focus on the page",
    async () => {
      const context = await desktop();
      try {
        const { page, dock, count, errors } = await open(context, hostUrl("?tall"));
        await dock();
        await until(() => count("Acme Systems") >= 2);
        const y = (): Promise<number> => page.evaluate(() => window.scrollY);
        await page.click("h1");
        for (const key of ["Space", "PageDown", "ArrowDown"]) {
          const before = await y();
          await page.keyboard.press(key);
          await until(async () => (await y()) > before, 5_000);
        }
        await page.keyboard.press("ArrowRight");
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.click("h1");
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.id)).toBe("field");
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.hasAttribute("data-textjs-engage"))).toBe(true);
        await sleep(300);
        expect(count("region eu")).toBe(0);
        expect(errors()).toEqual([]);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "a React 18 page with an import map for react and React DevTools installed: both apps run side by side",
    async () => {
      const context = await desktop();
      try {
        const { page, dock, count, errors } = await open(context, hostUrl("?react&el=mirror"), (p) => p.addInitScript(installReactDevToolsHook));
        await until(async () => (await page.textContent("#r18-count")) === "count 0");
        await until(() => count("Acme Systems") === 1);
        await page.click("#r18-count");
        await page.click("#r18-count");
        await page.fill("#r18-name", "Ada");
        expect({ count: await page.textContent("#r18-count"), echo: await page.textContent("#r18-echo") }).toEqual({ count: "count 2", echo: "Ada" });

        await dock();
        await until(() => count("Acme Systems") >= 2);
        await page.click("[data-textjs-engage]");
        await page.keyboard.press("ArrowRight");
        await until(() => count("region eu") > 0);
        await until(async () => (await element(page)).text.includes("region eu"));

        // The page's React keeps working, and its field keeps its keys.
        await page.click("#r18-count");
        await page.click("#r18-name");
        await page.keyboard.type("!");
        await page.keyboard.press("ArrowRight");
        await sleep(300);
        expect(count("region ap")).toBe(0);
        expect({ count: await page.textContent("#r18-count"), echo: await page.textContent("#r18-echo") }).toEqual({ count: "count 3", echo: "Ada!" });

        // React 18 is still the page's React, and each renderer registered with the hook under its own id.
        const state = await page.evaluate(() => ({ version: (window as unknown as { __r18Version: string }).__r18Version, global: (window as unknown as { React: { version: string } }).React.version }));
        expect(state).toEqual({ version: "18.3.1", global: "18.3.1" });
        const renderers = await page.evaluate(reactDevToolsRenderers);
        expect(renderers).toHaveLength(2);
        expect(renderers.find((r) => r.name === "react-dom")?.version).toMatch(/^18\.3\.1\b/);
        expect(renderers.map((r) => r.name).sort()).toEqual(["@textjs/react", "react-dom"]);
        for (const r of renderers) expect({ renderer: r.name, committed: r.commits > 0 }).toEqual({ renderer: r.name, committed: true });
        expect((await element(page)).violations).toEqual([]);
        expect(errors()).toEqual([]);
      } finally {
        await context.close();
      }
    },
    90_000,
  );

  test(
    "a strict CSP (no inline script or style, only the embed's origin): no violations from frame 0, boot, Yoga, the input sink or <text-console mirror>",
    async () => {
      const context = await desktop();
      try {
        const { page, dock, count, logs, requests, errors } = await open(context, hostUrl("?strict&el=mirror&reserve"));
        await until(() => count("Acme Systems") === 1);
        expect(logs()[0]).toBe("host log before embed");
        await until(async () => (await element(page)).text.includes("region us"));
        await dock();
        await until(() => count("Acme Systems") >= 2);
        expect(requests().some((p) => /^\/assets\/yoga-[\w-]+\.wasm$/.test(p))).toBe(true);
        await page.click("text-console");
        await until(async () => (await element(page)).state === "live");
        expect(await page.evaluate(() => document.querySelectorAll("[data-textjs-input-sink]").length)).toBe(1);
        await page.keyboard.press("ArrowRight");
        await until(() => count("region eu") > 0);
        await until(async () => (await element(page)).text.includes("region eu"));
        expect((await element(page)).violations).toEqual([]);
        expect(errors()).toEqual([]);
      } finally {
        await context.close();
      }
    },
    60_000,
  );

  test(
    "a server-rendered embed on another origin: preflight, streaming, keys, reconnect, and refused origins",
    async () => {
      const context = await desktop();
      const liveOrigin = new URL(live.url).origin;
      const hostOrigin = `http://127.0.0.1:${host.port}`;
      try {
        const sent: Array<{ method: string; sid?: string }> = [];
        const { page, dock, count, logs, requests, errors } = await open(context, hostUrl("?embed=live&strict"), async (p) => {
          p.on("request", (r) => {
            if (r.url().startsWith(`${liveOrigin}/__textjs/live`)) sent.push({ method: r.method(), sid: r.headers()["x-textjs-live"] });
          });
        });
        const net = await network(context, page);
        // Frame 0 comes from embed.js, before any connection, with the async component's fallback.
        await until(() => count("Live Systems") === 1);
        expect(requests()).toEqual(["/embed.js"]);
        expect(logs().find((l) => l.includes("Live Systems"))).toContain("probing");
        const length = await page.evaluate(() => history.length);

        await dock();
        await until(() => logs().some((l) => l.includes("probe ok")), 20_000);
        expect(requests().some((p) => /^\/assets\/embed-player-[\w-]+\.js$/.test(p))).toBe(true);
        await page.click("[data-textjs-engage]");
        await page.keyboard.press("+");
        await until(() => count("count 1") > 0);
        // Keys arrive as POSTs, which need a preflight: answered 204 for this page's origin.
        const preflight = net.find((e) => e.method === "OPTIONS");
        expect(preflight).toMatchObject({ status: 204, acao: hostOrigin });
        expect(net.find((e) => e.method === "POST")).toMatchObject({ status: 204, acao: hostOrigin });
        expect(net.find((e) => e.method === "GET")).toMatchObject({ status: 200, acao: hostOrigin });
        const sid = sent.find((s) => s.method === "POST")?.sid as string;
        expect(sid).toMatch(/\S{16,}/);

        // A dropped connection reconnects and resumes the same session: the count goes on from 1.
        live.server.closeAllConnections();
        await until(() => sent.some((s) => s.method === "GET" && s.sid === sid), 15_000);
        await until(() => net.filter((e) => e.method === "GET" && e.status === 200).length >= 2, 15_000);
        await page.keyboard.press("+");
        await until(() => count("count 2") > 0, 15_000);

        // The session id is no use to another origin, even one on the list, and that doesn't end the session.
        const replay = (method: "GET" | "POST", origin: string): Promise<Response> =>
          fetch(`${liveOrigin}/__textjs/live${method === "GET" ? "?path=/&cols=40&rows=4" : ""}`, {
            method,
            headers: { origin, "sec-fetch-site": "cross-site", "x-textjs-live": sid, ...(method === "GET" ? { accept: "text/event-stream" } : { "content-type": "application/json" }) },
            ...(method === "POST" ? { body: JSON.stringify([{ type: "key", key: "+", input: "+" }]) } : {}),
          });
        for (const origin of [SECOND_ORIGIN, `http://127.0.0.1:${other.port}`]) {
          for (const method of ["GET", "POST"] as const) {
            const res = await replay(method, origin);
            await res.body?.cancel();
            expect({ origin, method, status: res.status }).toEqual({ origin, method, status: 403 });
          }
        }
        await page.keyboard.press("+");
        await until(() => count("count 3") > 0, 15_000);

        expect(await page.evaluate(() => ({ href: location.href, title: document.title, length: history.length }))).toEqual({ href: hostUrl("?embed=live&strict"), title: "Acme host", length });
        expect(await page.evaluate(() => (window as unknown as { __violations: string[] }).__violations)).toEqual([]);
        // Only the stream the server dropped.
        expect(errors().filter((e) => !e.includes("ERR_INCOMPLETE_CHUNKED_ENCODING"))).toEqual([]);
        await page.close();

        // The same page on an origin allowOrigins doesn't list: frame 0 still shows, the live session is refused.
        const elsewhere = await open(context, `http://127.0.0.1:${other.port}/?embed=live&strict`);
        const refused = await network(context, elsewhere.page);
        await until(() => elsewhere.count("Live Systems") === 1);
        await elsewhere.dock();
        await until(() => refused.some((e) => e.method === "GET" && e.status !== undefined), 15_000);
        expect(refused.find((e) => e.method === "GET")).toMatchObject({ status: 403, acao: undefined });
        await sleep(500);
        expect(elsewhere.logs().some((l) => l.includes("probe ok"))).toBe(false);
      } finally {
        await context.close();
      }
    },
    120_000,
  );

  test(
    "text dev --embed: the preview page and another site's page both boot the app on dock",
    async () => {
      // The fixture links @textjs/* from this repo, outside the project, where Vite serves no files by default (yoga.wasm).
      writeFileSync(join(dir, "text.config.ts"), config(`{ vite: { server: { fs: { allow: [${JSON.stringify(REPO)}, ${JSON.stringify(dir)}] } } } }`));
      const dev = await startDevServer({ root: dir, port: 41000 + Math.floor(Math.random() * 2000), log: false, embed: true });
      const devOrigin = new URL(dev.resolvedUrls?.local[0] ?? "").origin;
      const html = hostHtml(`${devOrigin}/embed.js`);
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
