/**
 * End to end in a real Chromium: `text build` + `text start` on
 * examples/dashboard, capturing every console call the page makes.
 *
 * Skipped when Playwright (bench/devtools) or a Chromium build isn't installed.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { buildApp } from "../src/cli/build";
import { startProductionServer, type StartedServer } from "../src/cli/start";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const SOURCE = join(REPO, "examples/dashboard");
/** A private copy of examples/dashboard, so this build never races build.test.ts on examples/dashboard/dist. */
let DASHBOARD = "";

function copyDashboard(): string {
  const dir = mkdtempSync(join(tmpdir(), "textjs-e2e-dashboard-"));
  cpSync(SOURCE, dir, { recursive: true, filter: (src) => !/[\\/](dist|node_modules)$/.test(src) });
  mkdirSync(join(dir, "node_modules/@textjs"), { recursive: true });
  symlinkSync(join(REPO, "packages/app"), join(dir, "node_modules/@textjs/app"));
  for (const dep of ["react", "react-dom"]) symlinkSync(join(REPO, "node_modules", dep), join(dir, "node_modules", dep));
  return dir;
}
const PLAYWRIGHT = join(REPO, "bench/devtools/node_modules/playwright-core/index.mjs");

function findChromium(): string | null {
  const cache = join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(cache)) {
    const dirs = readdirSync(cache)
      .filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => Number(b.split("-").pop()) - Number(a.split("-").pop()));
    for (const d of dirs) {
      for (const rel of [
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-linux/chrome",
        "chrome-headless-shell-linux64/chrome-headless-shell",
      ]) {
        const p = join(cache, d, rel);
        if (existsSync(p)) return p;
      }
    }
  }
  const system = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return existsSync(system) ? system : null;
}

const chromiumPath = findChromium();
const enabled = existsSync(PLAYWRIGHT) && chromiumPath !== null;

interface Call {
  type: string;
  text: string;
}

/** The slice of playwright-core this test uses (it lives in bench/devtools, outside this package). */
interface Page {
  on(event: "console", fn: (m: { type(): string; text(): string }) => void): void;
  goto(url: string): Promise<unknown>;
  bringToFront(): Promise<void>;
  evaluate<T>(fn: () => T): Promise<T>;
  exposeFunction(name: string, fn: (...args: any[]) => unknown): Promise<void>;
  waitForURL(url: string): Promise<void>;
  keyboard: { press(key: string): Promise<void> };
  close(): Promise<void>;
}
interface Browser {
  newPage(options?: { viewport?: { width: number; height: number } }): Promise<Page>;
  close(): Promise<void>;
}
interface PW {
  chromium: { launch(options: { executablePath: string; headless: boolean }): Promise<Browser> };
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function until(fn: () => boolean | Promise<boolean>, timeout = 10_000): Promise<void> {
  const t0 = Date.now();
  while (!(await fn())) {
    if (Date.now() - t0 > timeout) throw new Error("timed out");
    await sleep(25);
  }
}

describe.skipIf(!enabled)("server rendering + PPR in Chromium (text start)", () => {
  let server: StartedServer;
  let browser: Browser;

  beforeAll(async () => {
    DASHBOARD = copyDashboard();
    await buildApp({ root: DASHBOARD, log: false });
    server = await startProductionServer({ root: DASHBOARD, port: 0, log: false });
    const pw = (await import(PLAYWRIGHT)) as PW;
    browser = await pw.chromium.launch({ executablePath: chromiumPath as string, headless: true });
  }, 180_000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
    if (DASHBOARD) rmSync(DASHBOARD, { recursive: true, force: true });
  });

  async function open(path: string): Promise<{ page: Page; calls: Call[]; logs: () => string[] }> {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const calls: Call[] = [];
    page.on("console", (m) => calls.push({ type: m.type(), text: m.text() }));
    await page.goto(server.url + path);
    await page.bringToFront();
    return { page, calls, logs: () => calls.filter((c) => c.type === "log").map((c) => c.text.replace(/%c/g, "")) };
  }

  /** The player is connected (the shell alone already shows the static frame). */
  const live = (page: Page): Promise<void> => until(async () => (await page.evaluate(() => document.documentElement.dataset.textjsLive)) === "live");

  test(
    "a server route paints its shell, streams server frames, and takes input",
    async () => {
      const { page, calls, logs } = await open("/status");
      // The prerendered shell: the static frame with Suspense fallbacks, before any module ran.
      expect(calls[0]?.type).toBe("clear");
      expect(logs()[0]).toContain("Status");
      expect(logs()[0]).toContain("probing…");
      expect(logs()[0]).not.toContain("p50");
      expect(await page.evaluate(() => (window as { __TEXTJS_SHELL__?: number }).__TEXTJS_SHELL__)).toBe(1);
      // Async server components (node:os + probes) stream into their holes.
      await until(() => logs().some((l) => (l.match(/p50 \d+ms/g) ?? []).length === 5));
      await until(() => logs().some((l) => / CPUs/.test(l)));
      // The console was cleared exactly once: by the shell (no flash on hydration).
      expect(calls.filter((c) => c.type === "clear").length).toBe(1);
      expect(await page.evaluate(() => document.title)).toBe("Status · Edge Console");
      expect(await page.evaluate(() => document.documentElement.dataset.textjsLive)).toBe("live");

      // Keys round-trip through the server.
      await page.keyboard.press("r");
      await until(() => logs().some((l) => l.includes("attempt 2")));

      // Frames are paced like the client renderer (≥ ~66ms apart), measured in the page (not across CDP).
      await page.evaluate(() => {
        const w = window as unknown as { __logTimes: number[] };
        w.__logTimes = [];
        const log = console.log.bind(console);
        console.log = (...args: unknown[]) => {
          w.__logTimes.push(performance.now());
          log(...args);
        };
      });
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("r");
        await sleep(120);
      }
      await sleep(500);
      const times = await page.evaluate(() => (window as unknown as { __logTimes: number[] }).__logTimes);
      const gaps = times.slice(1).map((t, i) => t - (times[i] as number));
      if (gaps.length > 3) expect(Math.min(...gaps)).toBeGreaterThan(50);
      await page.close();
    },
    60_000,
  );

  test(
    "server → client → server navigation hands the document over",
    async () => {
      const { page, logs } = await open("/status");
      await live(page);
      await page.keyboard.press("3");
      await page.waitForURL(`${server.url}/logs`);
      await until(() => logs().some((l) => l.includes("Runtime Logs")));
      // Client route: the full client bundle booted (FocusPad DOM).
      await until(async () => (await page.evaluate(() => typeof (window as { __TEXTJS_APP__?: unknown }).__TEXTJS_APP__)) === "object");
      await page.keyboard.press("5");
      await page.waitForURL(`${server.url}/status`);
      await until(() => logs().some((l) => l.includes("rendered on the server")));
      await page.close();
    },
    60_000,
  );

  test(
    "one session per tab; a dropped connection resumes",
    async () => {
      const a = await open("/status");
      const b = await open("/status");
      await live(a.page);
      await live(b.page);
      await a.page.bringToFront();
      await a.page.keyboard.press("r");
      await until(() => a.logs().some((l) => l.includes("attempt 2")));
      await sleep(300);
      expect(b.logs().some((l) => l.includes("attempt 2"))).toBe(false);

      // Drop every connection: the player reconnects (Last-Event-ID) and resumes the same session.
      const states: string[] = [];
      await a.page.exposeFunction("__state", (s: string) => states.push(s));
      await a.page.evaluate(() => {
        new MutationObserver(() => (window as unknown as { __state(s: string): void }).__state(document.documentElement.dataset.textjsLive ?? "")).observe(document.documentElement, { attributes: true });
      });
      server.server.closeAllConnections();
      await until(() => states.includes("reconnecting"));
      await until(async () => (await a.page.evaluate(() => document.documentElement.dataset.textjsLive)) === "live", 15_000);
      expect(states.at(-1)).toBe("live");
      await a.page.keyboard.press("r");
      await until(() => a.logs().some((l) => l.includes("attempt 3")), 15_000);
      // Tab B reconnected to its own session too.
      await until(async () => (await b.page.evaluate(() => document.documentElement.dataset.textjsLive)) === "live", 15_000);
      expect(b.logs().some((l) => l.includes("attempt 2"))).toBe(false);
      await a.page.close();
      await b.page.close();
    },
    60_000,
  );

  test(
    "a client route paints its PPR shell, then the client appends without clearing again",
    async () => {
      const { page, calls, logs } = await open("/logs");
      expect(calls[0]?.type).toBe("clear");
      expect(logs()[0]).toContain("Runtime Logs");
      await until(() => logs().length >= 2);
      await until(async () => (await page.evaluate(() => typeof (window as { __TEXTJS_APP__?: unknown }).__TEXTJS_APP__)) === "object");
      await sleep(500);
      expect(calls.filter((c) => c.type === "clear").length).toBe(1);
      await page.close();
    },
    60_000,
  );

  test("the frame player is a fraction of the client bundle", () => {
    const assets = join(DASHBOARD, "dist", "assets");
    const files = readdirSync(assets).filter((f) => f.endsWith(".js"));
    const size = (f: string): { raw: number; gzip: number } => {
      const buf = readFileSync(join(assets, f));
      return { raw: buf.length, gzip: gzipSync(buf).length };
    };
    const player = files.filter((f) => f.startsWith("player-")).map(size)[0] as { raw: number; gzip: number };
    const client = files.filter((f) => !f.startsWith("player-")).map(size).reduce((a, b) => ({ raw: a.raw + b.raw, gzip: a.gzip + b.gzip }), { raw: 0, gzip: 0 });
    expect(player.gzip).toBeLessThan(23 * 1024);
    expect(player.gzip * 8).toBeLessThan(client.gzip);
    const playerJs = readFileSync(join(assets, files.find((f) => f.startsWith("player-")) as string), "utf8");
    // No React, no Yoga, no route modules or their server-only imports.
    expect(playerJs).not.toContain("react.transitional.element");
    expect(playerJs).not.toContain("yoga");
    expect(playerJs).not.toContain("loadavg");
    // A `CellGrid`, not a `CellBuffer`: no drawing API (box borders, truncation).
    expect(playerJs).not.toContain("╭");
    expect(playerJs).not.toContain("truncate-");
    const clientJs = files.filter((f) => !f.startsWith("player-")).map((f) => readFileSync(join(assets, f), "utf8")).join("\n");
    expect(clientJs).not.toContain("loadavg");
    expect(clientJs).not.toContain("probing…");
  });
});
