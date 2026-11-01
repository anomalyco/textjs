/**
 * First-run QA for everything a new user runs: the create-text-app templates,
 * `examples/*` and the runnable apps (`apps/opencode-console`, `apps/terminal-shop`).
 *
 *   bun scripts/qa-starters.ts [--only starter,dashboard,…] [--steps install,tsc,lint,dev,build,start,deploy,run]
 *                              [--pm bun,npm] [--skip-build] [--keep] [--headed] [--verbose] [--json <file>]
 *                              [--published <version>]
 *
 * `--published 1.0.0` installs that version from npm instead of this checkout's
 * tarballs: what users get today.
 *
 * Templates and examples are installed the way npm users get them: every
 * package is packed with `bun pm pack` (as `release-publish.ts` does), the
 * template is scaffolded with the packed `create-text-app` CLI and its
 * `@textjs/*` dependencies point at the tarballs. Each target is installed
 * with bun (CLI on Bun, `bun --bun run …`) and with npm (CLI on Node,
 * `npm run …`). The apps only run from the monorepo, so they use the workspace.
 *
 * Steps per target and package manager:
 *   install  scaffold + install; the template's `@textjs/next` range must be `^<version>`
 *   tsc      `tsc --noEmit` (bun only)
 *   lint     eslint-plugin-textjs `recommended` over the project's sources (bun only)
 *   dev      `text dev` + headless Chromium: press every advertised key, visit every
 *            route, resize, then edit a file and check Fast Refresh keeps state
 *   build    `text build`: no warnings in its output
 *   start    `text start` + the same browser pass on the production build
 *   deploy   the READMEs' `text build --adapter vercel|cloudflare|static|bun`, then the same
 *            browser pass against `bun dist/server.js` (bun only)
 *   run      `text run` in a pty: press keys, Ctrl+C exits cleanly
 *
 * Any console error or warning, page error, unhandled rejection, failed
 * same-origin request, React dev warning or Text.js redbox fails the run, as
 * does a warning or stack trace in the CLI's own output.
 *
 * Safety: the browser can only reach the server under test (every other
 * request is aborted). The OpenCode template and app talk to an in-process
 * mock, never to a real OpenCode server, and `opencode` on the PATH is
 * replaced with a stub so nothing discovers a local daemon. terminal.shop runs
 * against its in-memory mock API.
 *
 * Playwright: `PLAYWRIGHT=/path/to/playwright-core/index.mjs`, or
 * `bun install --cwd bench/devtools` once. Chromium: `CHROMIUM=/path/to/chrome`,
 * the Playwright cache, or Playwright's default.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createNetServer } from "node:net";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { packPackages } from "./verify-pack";

const ROOT = resolve(import.meta.dir, "..");
const VERSION = (JSON.parse(readFileSync(join(ROOT, "packages/text/package.json"), "utf8")) as { version: string }).version;

// ---------------------------------------------------------------------------
// CLI options
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const opt = (name: string): string | undefined => {
  const i = argv.indexOf(`--${name}`);
  if (i >= 0) return argv[i + 1];
  return argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
};
const flag = (name: string): boolean => argv.includes(`--${name}`);
const list = (name: string, fallback: string[]): string[] => opt(name)?.split(",").map((s) => s.trim()).filter(Boolean) ?? fallback;

const STEPS = ["install", "tsc", "lint", "dev", "build", "start", "deploy", "run"] as const;
type Step = (typeof STEPS)[number];
type Pm = "bun" | "npm";

const ONLY = list("only", []);
const STEP_FILTER = new Set(list("steps", [...STEPS]) as Step[]);
const PMS = list("pm", ["bun", "npm"]) as Pm[];
const HEADED = flag("headed");
const KEEP = flag("keep");
const VERBOSE = flag("verbose");
const PUBLISHED = opt("published");

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

/** A PATH entry that shadows `opencode` so nothing can discover a real local OpenCode daemon. */
function shimDir(work: string): string {
  const dir = join(work, "shim-bin");
  mkdirSync(dir, { recursive: true });
  const stub = join(dir, "opencode");
  writeFileSync(stub, "#!/bin/sh\necho 'opencode is disabled during QA' >&2\nexit 1\n");
  chmodSync(stub, 0o755);
  return dir;
}

let BASE_ENV: Record<string, string> = {};

function childEnv(extra: Record<string, string | undefined> = {}): Record<string, string> {
  const env: Record<string, string> = { ...BASE_ENV };
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  return env;
}

interface Exec {
  code: number | null;
  out: string;
}

function exec(cmd: string, args: string[], cwd: string, env: Record<string, string | undefined> = {}, timeout = 600_000): Exec {
  if (VERBOSE) console.log(`    $ ${cmd} ${args.join(" ")}  (${cwd})`);
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", env: childEnv(env), timeout, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status, out: stripVTControlCharacters(`${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}`) };
}

interface Server {
  url: string;
  output(): string;
  /** Output since the last `mark()`. */
  since(): string;
  mark(): void;
  stop(): Promise<void>;
}

async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const s = createNetServer();
    s.once("error", fail);
    s.listen(0, "127.0.0.1", () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => done(port));
    });
  });
}

function killTree(child: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): void {
  try {
    process.kill(-(child.pid as number), signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // gone
    }
  }
}

async function startServer(cmd: string, args: string[], cwd: string, port: number, env: Record<string, string | undefined> = {}, readyPath = "/"): Promise<Server> {
  if (VERBOSE) console.log(`    $ ${cmd} ${args.join(" ")}  (${cwd})`);
  const child = spawn(cmd, args, { cwd, env: childEnv(env), stdio: ["ignore", "pipe", "pipe"], detached: true });
  let out = "";
  let markAt = 0;
  child.stdout?.on("data", (d) => (out += d));
  child.stderr?.on("data", (d) => (out += d));
  const url = `http://localhost:${port}`;
  const deadline = Date.now() + 90_000;
  let up = false;
  while (Date.now() < deadline && child.exitCode === null) {
    up = await fetch(`${url}${readyPath}`, { headers: { accept: "text/html" } }).then(
      (r) => r.status < 500,
      () => false,
    );
    if (up) break;
    await Bun.sleep(250);
  }
  const server: Server = {
    url,
    output: () => stripVTControlCharacters(out),
    since: () => stripVTControlCharacters(out.slice(markAt)),
    mark: () => void (markAt = out.length),
    stop: async () => {
      if (child.exitCode !== null) return;
      killTree(child, "SIGTERM");
      for (let i = 0; i < 40 && child.exitCode === null && child.signalCode === null; i++) await Bun.sleep(50);
      if (child.exitCode === null && child.signalCode === null) killTree(child, "SIGKILL");
    },
  };
  if (!up) {
    await server.stop();
    throw new Error(`server did not start: ${cmd} ${args.join(" ")}\n${server.output().trim().split("\n").slice(-30).join("\n")}`);
  }
  return server;
}

// ---------------------------------------------------------------------------
// Log checks
// ---------------------------------------------------------------------------

/** CLI output lines that mean something went wrong. */
const BAD_LINE = [
  /\bwarn(ing)?\b|\(!\)|deprecat|unhandled|hmr (update|invalidate) failed|failed to (load|reload|resolve|parse|fetch)|could not resolve|is not exported|cannot find (module|package)/i,
  // HMR for files far outside the project means the watcher escaped it (it once crawled /).
  /Fast Refresh\s+(\.\.\/){5,}/,
  /⨯|✗|\b[A-Z]\w*Error\b|\bError\b|^error:|\bTX\d{3}\b|\bERR_[A-Z_]+|^\s*at .+[:(]\d+:\d+\)?$|\bat [\w.<>]+ \(.+:\d+:\d+\)/,
];
/** Lines that look bad but aren't (file names, route tables, our own echoed commands). */
const BENIGN_LINE = [/\berror\.tsx\b/, /app\/deployments\/error/, /^\s*\$ /, /0 errors?\b/i, /npm warn deprecated (inflight|glob|rimraf)/i];

/** In a rendered terminal frame, app copy may say "error" or "WARN": only flag what the runtime prints. */
const BAD_PTY_LINE = [/\b[A-Z]\w*Error:|\bError:|\bTX\d{3}\b|Unhandled|\bWarning:|^\s*at .+[:(]\d+:\d+\)?$|\bat [\w.<>]+ \(.+:\d+:\d+\)/];

function badLines(text: string, allow: RegExp[] = [], patterns: RegExp[] = BAD_LINE): string[] {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => patterns.some((re) => re.test(l)) && !BENIGN_LINE.some((re) => re.test(l)) && !allow.some((re) => re.test(l)));
}

// ---------------------------------------------------------------------------
// Mock OpenCode server (template + app)
// ---------------------------------------------------------------------------

interface MockOpencode {
  url: string;
  hits: string[];
  stop(): void;
}

function startMockOpencode(): MockOpencode {
  const hits: string[] = [];
  const sessions: Array<{ id: string; title: string; time: { created: number; updated: number } }> = [
    { id: "ses_mock1", title: "Fix the flaky test", time: { created: Date.now() - 3_600_000, updated: Date.now() - 600_000 } },
    { id: "ses_mock2", title: "Add a dark theme", time: { created: Date.now() - 7_200_000, updated: Date.now() - 3_000_000 } },
  ];
  const messages = new Map<string, Array<{ info: { id: string; role: "user" | "assistant" }; parts: Array<{ type: string; text: string }> }>>();
  let n = 0;
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      hits.push(`${req.method} ${url.pathname}`);
      if (url.pathname === "/session" && req.method === "GET") return Response.json(sessions);
      if (url.pathname === "/session" && req.method === "POST") {
        const body = (await req.json().catch(() => ({}))) as { title?: string };
        const s = { id: `ses_new${++n}`, title: body.title ?? "New session", time: { created: Date.now(), updated: Date.now() } };
        sessions.unshift(s);
        return Response.json(s);
      }
      const m = /^\/session\/([^/]+)\/message$/.exec(url.pathname);
      if (m) {
        const id = m[1] as string;
        const list = messages.get(id) ?? [];
        messages.set(id, list);
        if (req.method === "GET") return Response.json(list);
        const body = (await req.json().catch(() => ({}))) as { parts?: Array<{ text?: string }> };
        list.push({ info: { id: `msg_${++n}`, role: "user" }, parts: [{ type: "text", text: body.parts?.[0]?.text ?? "" }] });
        const reply = { info: { id: `msg_${++n}`, role: "assistant" as const }, parts: [{ type: "text", text: "**Mock reply** from the QA server." }] };
        list.push(reply);
        return Response.json(reply);
      }
      return new Response("not found", { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, hits, stop: () => server.stop(true) };
}

// ---------------------------------------------------------------------------
// Browser
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any -- playwright-core is loaded dynamically and isn't a dependency */
type Browser = any;
type Page = any;

async function launchBrowser(): Promise<Browser> {
  const path = process.env.PLAYWRIGHT ?? join(ROOT, "bench/devtools/node_modules/playwright-core/index.mjs");
  if (!existsSync(path)) throw new Error(`playwright-core not found at ${path}: run \`bun install --cwd bench/devtools\` or set PLAYWRIGHT`);
  const { chromium } = (await import(path)) as { chromium: { launch(o: object): Promise<Browser> } };
  return chromium.launch({ headless: !HEADED, executablePath: process.env.CHROMIUM ?? chromiumPath() });
}

function chromiumPath(): string | undefined {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  for (const dir of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    for (const app of ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]) {
      const p = join(cache, dir, app);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

/** `console.log("%c…", …css)` → the frame's text. */
function decodeFrame(format: string): string {
  return format
    .replace(/%c/g, "")
    .replace(/%%/g, "%")
    .replace(/[\u200b\u200c\u200d\u2060\ufeff]/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/^\n+|\n+$/g, "");
}

type Action =
  | { press: string | string[]; repeat?: number }
  | { type: string }
  | { expect: string | RegExp; timeout?: number; not?: boolean }
  | { goto: string; expect?: string | RegExp }
  | { resize: [number, number] | "fit" }
  | { window: [number, number] }
  | { wait: number }
  | { edit: string; find: string; replace: string; expect: string | RegExp; keep?: string | RegExp }
  | { fetch: string; status?: number };

interface Scenario {
  /** Path to open first (default `/`). */
  path?: string;
  actions: Action[];
}

interface BrowserResult {
  issues: string[];
  notes: string[];
}

const SETTLE = 120;

async function browserPass(browser: Browser, server: Server, scenario: Scenario, opts: { dev: boolean; root: string; allow?: RegExp[] }): Promise<BrowserResult> {
  const issues: string[] = [];
  const notes: string[] = [];
  const origin = new URL(server.url).origin;
  const port = new URL(server.url).port;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page: Page = await context.newPage();
  const allowed = (u: URL): boolean => u.protocol === "data:" || u.protocol === "blob:" || ((u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.port === port);
  const blocked: string[] = [];
  await context.route("**/*", (route: any) => {
    const u = new URL(route.request().url());
    if (allowed(u)) return route.continue();
    blocked.push(u.href);
    return route.abort("blockedbyclient");
  });
  await page.addInitScript(() => {
    const w = window as unknown as { __qaFrames: string[] };
    w.__qaFrames = [];
    const log = console.log.bind(console);
    console.log = (...a: unknown[]) => {
      if (typeof a[0] === "string" && a[0].includes("%c")) {
        w.__qaFrames.push(a[0]);
        if (w.__qaFrames.length > 8) w.__qaFrames.shift();
      }
      return log(...a);
    };
  });
  const allow = opts.allow ?? [];
  const at = (): string => {
    try {
      return new URL(page.url()).pathname;
    } catch {
      return "?";
    }
  };
  const pending: Promise<void>[] = [];
  page.on("console", (msg: any) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning" && type !== "assert") return;
    const where = at();
    pending.push(
      formatConsole(msg).then((text) => {
        const loc = msg.location?.()?.url ?? "";
        if (blocked.some((b) => text.includes(b) || loc === b)) return;
        if (allow.some((re) => re.test(text))) return;
        issues.push(`console.${type === "warning" ? "warn" : type} on ${where}: ${text.split("\n").slice(0, 6).join("\n")}`);
      }),
    );
  });
  page.on("pageerror", (e: Error) => issues.push(`page error on ${at()}: ${e.message}`));
  page.on("requestfailed", (r: any) => {
    const u = new URL(r.url());
    if (!allowed(u) || u.protocol !== "http:") return;
    const reason = r.failure()?.errorText ?? "";
    if (/ERR_ABORTED/.test(reason)) return;
    issues.push(`request failed on ${at()}: ${r.method()} ${u.pathname} ${reason}`);
  });
  page.on("response", (r: any) => {
    const u = new URL(r.url());
    if (!allowed(u) || r.status() < 400) return;
    if (expected404.has(u.pathname)) return;
    issues.push(`HTTP ${r.status()} on ${at()}: ${r.request().method()} ${u.pathname}`);
  });
  let reactBuild: "development" | "production" | null = null;
  page.on("response", async (r: any) => {
    const u = new URL(r.url());
    if (!allowed(u) || !/\.js(\?|$)/.test(u.pathname) || reactBuild === "development") return;
    const body: string = await r.text().catch(() => "");
    if (body.includes("not wrapped in act(")) reactBuild = "development";
    else if (body.includes("react.transitional.element") && reactBuild === null) reactBuild = "production";
  });
  const expected404 = new Set<string>();

  const frame = async (): Promise<string> => {
    const raw = (await page.evaluate(() => {
      const f = (window as unknown as { __qaFrames?: string[] }).__qaFrames;
      return f && f.length > 0 ? (f[f.length - 1] as string) : "";
    })) as string;
    return decodeFrame(raw);
  };
  /** The grid's bottom row, untrimmed (in `text dev` the `[▼]` pill is drawn over its first three cells). */
  const bottomRow = async (): Promise<string> => {
    const raw = (await page.evaluate(() => {
      const f = (window as unknown as { __qaFrames?: string[] }).__qaFrames;
      return f && f.length > 0 ? (f[f.length - 1] as string) : "";
    })) as string;
    const rows = raw.replace(/%c/g, "").replace(/[\u200b\u200c\u200d\u2060\ufeff]/g, "").split("\n");
    while (rows.length > 0 && rows[rows.length - 1] === "") rows.pop();
    return rows[rows.length - 1] ?? "";
  };
  const pillCovered = new Set<string>();
  const checkPill = async (): Promise<void> => {
    if (opts.dev) return;
    const row = await bottomRow();
    if (row.slice(0, 3).trim() !== "") pillCovered.add(`${at()}: "${row.trimEnd()}"`);
  };
  const matches = (text: string, needle: string | RegExp): boolean => (typeof needle === "string" ? text.includes(needle) : needle.test(text));
  const until = async (needle: string | RegExp, timeout = 8000, not = false): Promise<boolean> => {
    const deadline = Date.now() + timeout;
    for (;;) {
      const text = await frame().catch(() => "");
      if (matches(text, needle) !== not) return true;
      if (Date.now() > deadline) return false;
      await page.waitForTimeout(100);
    }
  };
  const engage = async (): Promise<void> => {
    await page.waitForSelector("[data-textjs-focus-pad]", { timeout: 15_000 }).catch(() => undefined);
    const box = await page.locator("[data-textjs-focus-pad]").boundingBox().catch(() => null);
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + 40);
    else await page.mouse.click(200, 200);
    await page.waitForTimeout(SETTLE);
  };
  const open = async (path: string): Promise<void> => {
    await page.goto(`${server.url}${path}`, { waitUntil: "load" });
    await until(/\S/, 15_000);
    await engage();
  };
  const describe = (a: Action): string => JSON.stringify(a);

  try {
    await open(scenario.path ?? "/");
    await page.waitForTimeout(500);
    await checkPill();
    for (const a of scenario.actions) {
      if ("press" in a) {
        const keys = Array.isArray(a.press) ? a.press : [a.press];
        for (let i = 0; i < (a.repeat ?? 1); i++) {
          for (const k of keys) {
            await page.keyboard.press(k);
            await page.waitForTimeout(SETTLE);
          }
        }
      } else if ("type" in a) {
        await page.keyboard.type(a.type, { delay: 20 });
        await page.waitForTimeout(SETTLE);
      } else if ("expect" in a && !("goto" in a) && !("edit" in a)) {
        if (!(await until(a.expect, a.timeout, a.not))) issues.push(`expected the frame ${a.not ? "not " : ""}to show ${String(a.expect)} on ${at()}\n${indent(await frame())}`);
      } else if ("goto" in a) {
        if (a.expect && /not.?found|nope|missing/i.test(a.goto)) expected404.add(a.goto);
        await open(a.goto);
        if (a.expect && !(await until(a.expect))) issues.push(`expected ${a.goto} to show ${String(a.expect)}\n${indent(await frame())}`);
        await checkPill();
      } else if ("resize" in a) {
        await page.evaluate((choice: [number, number] | "fit") => {
          const app = (window as unknown as { __TEXTJS_APP__?: { root: { renderer: { resize(c: number, r: number): void; viewport: { setResponsive(v: boolean): void } }; viewport: { refresh(): void } } } }).__TEXTJS_APP__;
          if (!app) return;
          if (choice === "fit") app.root.renderer.viewport.setResponsive(true);
          else app.root.renderer.resize(choice[0], choice[1]);
          app.root.viewport.refresh();
        }, a.resize);
        await page.waitForTimeout(250);
      } else if ("window" in a) {
        await page.setViewportSize({ width: a.window[0], height: a.window[1] });
        await page.waitForTimeout(300);
      } else if ("wait" in a) {
        await page.waitForTimeout(a.wait);
      } else if ("fetch" in a) {
        const r = await fetch(`${server.url}${a.fetch}`);
        if (r.status !== (a.status ?? 200)) issues.push(`GET ${a.fetch} → ${r.status}`);
      } else if ("edit" in a) {
        if (!opts.dev) continue;
        const file = join(opts.root, a.edit);
        const before = readFileSync(file, "utf8");
        if (!before.includes(a.find)) {
          issues.push(`HMR: ${a.edit} no longer contains ${JSON.stringify(a.find)}`);
          continue;
        }
        const navigations: string[] = [];
        const onNav = (f: any): void => {
          if (f === page.mainFrame()) navigations.push(f.url());
        };
        page.on("framenavigated", onNav);
        server.mark();
        writeFileSync(file, before.replace(a.find, a.replace));
        try {
          if (!(await until(a.expect, 15_000))) issues.push(`HMR: the frame never showed ${String(a.expect)} after editing ${a.edit}\n${indent(await frame())}`);
          else if (a.keep && !matches(await frame(), a.keep)) issues.push(`Fast Refresh lost state after editing ${a.edit}: expected ${String(a.keep)}\n${indent(await frame())}`);
          await page.waitForTimeout(500);
          if (navigations.length > 0) issues.push(`HMR: editing ${a.edit} reloaded the page instead of Fast Refresh`);
          const log = server.since();
          if (!/Fast Refresh/.test(log)) notes.push(`text dev did not log "Fast Refresh" for ${a.edit}`);
        } finally {
          writeFileSync(file, before);
          page.off("framenavigated", onNav);
        }
        await until(a.replace, 15_000, true);
        await page.waitForTimeout(400);
      }
      if (VERBOSE) console.log(`      · ${describe(a)}`);
    }
    await checkPill();
    for (const where of pillCovered) issues.push(`the bottom row starts in the first three cells, where text dev draws its [▼] pill over it: ${where}`);
    // The Dev Overlay pill turns into `[▼ !]` when the app reported an error.
    const last = await frame();
    if (last.includes("[▼ !]")) issues.push(`the Text.js error pill is lit on ${at()}\n${indent(last)}`);
    if (opts.dev && reactBuild !== "development") issues.push(`text dev did not serve React's development build (saw ${reactBuild ?? "no React bundle"})`);
    if (!opts.dev && reactBuild === "development") issues.push("text start served React's development build");
  } catch (e) {
    issues.push(`browser pass crashed on ${at()}: ${e instanceof Error ? e.message : String(e)}\n${indent(await frame().catch(() => ""))}`);
  } finally {
    await Promise.allSettled(pending);
    await context.close();
  }
  const offsite = [...new Set(blocked.map((b) => new URL(b).origin))];
  if (offsite.length > 0) notes.push(`blocked requests to ${offsite.join(", ")}`);
  return { issues: dedupe(issues), notes };
}

/** `console.error("%s …", a)` → the message React and friends actually print. */
async function formatConsole(msg: any): Promise<string> {
  const text: string = msg.text();
  if (!/%[sdioOc]/.test(text)) return text;
  const args: unknown[] = await Promise.all(msg.args().map((a: any) => a.jsonValue().catch(() => "?")));
  if (typeof args[0] !== "string") return text;
  let i = 1;
  const head = args[0].replace(/%[sdioOc]/g, (m) => (m === "%c" ? (i++, "") : i < args.length ? String(args[i++]) : m));
  return [head, ...args.slice(i).map((a) => (typeof a === "string" ? a : JSON.stringify(a)))].join(" ");
}

function dedupe(issues: string[]): string[] {
  const counts = new Map<string, number>();
  for (const i of issues) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts].map(([i, n]) => (n > 1 ? `${i} (×${n})` : i));
}

function indent(s: string): string {
  return s
    .split("\n")
    .slice(0, 40)
    .map((l) => `      │ ${l}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Terminal (`text run`)
// ---------------------------------------------------------------------------

interface RunScenario {
  /** Keys written to the pty, in order (raw bytes). `wait:<ms>` pauses. */
  keys: string[];
  /** Text the first frame must contain. */
  expect: string;
  path?: string;
}

const KEY = { up: "\x1b[A", down: "\x1b[B", right: "\x1b[C", left: "\x1b[D", enter: "\r", esc: "\x1b", tab: "\t", f2: "\x1bOQ", ctrlC: "\x03" } as const;

async function ptyRun(cmd: string[], cwd: string, scenario: RunScenario, env: Record<string, string | undefined> = {}): Promise<string[]> {
  const issues: string[] = [];
  let out = "";
  const decoder = new TextDecoder();
  if (VERBOSE) console.log(`    $ ${cmd.join(" ")}  (${cwd}, pty)`);
  // Bun's built-in pty (`terminal`): the app sees a real 100×32 TTY.
  const child = Bun.spawn(cmd, {
    cwd,
    env: childEnv({ TERM: "xterm-256color", COLORTERM: "truecolor", ...env }),
    terminal: { cols: 100, rows: 32, data: (_t: unknown, d: Uint8Array) => void (out += decoder.decode(d, { stream: true })) },
  } as Parameters<typeof Bun.spawn>[1]) as ReturnType<typeof Bun.spawn> & { terminal: { write(s: string): void; close(): void } };
  const plain = (): string => stripVTControlCharacters(out);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && !plain().includes(scenario.expect) && child.exitCode === null) await Bun.sleep(100);
  if (!plain().includes(scenario.expect)) {
    issues.push(`text run never showed ${JSON.stringify(scenario.expect)}\n${indent(plain().trim().split("\n").slice(-30).join("\n"))}`);
    child.kill("SIGKILL");
    return issues;
  }
  for (const k of scenario.keys) {
    if (k.startsWith("wait:")) await Bun.sleep(Number(k.slice(5)));
    else {
      child.terminal.write(k);
      await Bun.sleep(200);
    }
  }
  await Bun.sleep(300);
  child.terminal.write(KEY.ctrlC);
  const exitBy = Date.now() + 5000;
  while (Date.now() < exitBy && child.exitCode === null) await Bun.sleep(50);
  if (child.exitCode === null) {
    issues.push("text run did not exit within 5s of Ctrl+C");
    child.kill("SIGKILL");
  } else if (child.exitCode !== 0) issues.push(`text run exited with ${child.exitCode} after Ctrl+C`);
  // Cursor moves become line breaks so each painted row is checked on its own.
  const text = stripVTControlCharacters(out.replace(/\x1b\[\d*(;\d*)?[Hf]/g, "\n"));
  const bad = badLines(text, [], BAD_PTY_LINE);
  if (bad.length > 0) issues.push(`text run printed:\n${indent(bad.slice(0, 15).join("\n"))}`);
  if (out.includes("\x1b[?1049h") && out.lastIndexOf("\x1b[?1049l") < out.lastIndexOf("\x1b[?1049h")) issues.push("text run left the terminal in the alternate screen");
  if (out.includes("\x1b[?25l") && out.lastIndexOf("\x1b[?25h") < out.lastIndexOf("\x1b[?25l")) issues.push("text run left the cursor hidden");
  return issues;
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

interface Target {
  name: string;
  kind: "template" | "example" | "app";
  /** Template name, example dir or app dir. */
  source: string;
  scenario: Scenario;
  /** A second pass against `text start` (default: the dev scenario without edits). */
  startScenario?: Scenario;
  run?: RunScenario;
  /** Adapters the README documents (`deploy` step); `browse: false` when the deployed app needs a dev-only `proxy`. */
  deploy?: { adapters: string[]; browse?: boolean };
  /** Extra env for every server (mocks). */
  env?: () => Record<string, string>;
  /** Query string for every page (e.g. `?demo`). */
  allow?: RegExp[];
  /** CLI output lines that are expected. */
  allowLog?: RegExp[];
  setup?: () => Promise<() => void>;
}

let mockOpencode: MockOpencode | null = null;
/** Stopped after the run: one fresh mock per server pass, so state never leaks between dev and start. */
const cleanups: Array<() => void> = [];
let startMockTerminal: ((o?: object) => { url: string; stop(): void }) | null = null;
let MOCK_TERMINAL_TOKEN = "";

function freshMockTerminal(): string {
  const m = (startMockTerminal as (o?: object) => { url: string; stop(): void })();
  cleanups.push(() => m.stop());
  return m.url;
}

const TARGETS: Target[] = [
  {
    name: "template:starter",
    kind: "template",
    source: "starter",
    scenario: {
      actions: [
        { expect: "count" },
        { press: "ArrowUp", repeat: 3 },
        { expect: /count\s+3/ },
        { press: "ArrowDown" },
        { expect: /count\s+2/ },
        { press: ["+", "-", "="] },
        { expect: /count\s+3/ },
        { edit: "app/page.tsx", find: "Save and see your changes instantly.", replace: "QA hot update applied.", expect: "QA hot update applied.", keep: /count\s+3/ },
        { press: "r" },
        { expect: /count\s+0/ },
        { press: "2" },
        { expect: "Renderer" },
        { press: "Escape" },
        { expect: "count" },
        { press: "2" },
        { expect: "Renderer" },
        { press: "1" },
        { expect: "count" },
        { press: "Enter" },
        { expect: "Renderer" },
        { press: "Enter" },
        { expect: "count" },
        { press: ["Tab", "Tab", "Shift+Tab"] },
        { press: "F2" },
        { wait: 300 },
        { press: "F2" },
        { press: "Control+Backquote" },
        { wait: 300 },
        { press: "Control+Backquote" },
        { resize: [80, 24] },
        { expect: "count" },
        { resize: [160, 48] },
        { resize: [40, 12] },
        { resize: "fit" },
        { window: [900, 600] },
        { window: [1440, 900] },
        { goto: "/about", expect: "Renderer" },
        // A query string once made text dev watch / (the page never loaded on Linux).
        { goto: "/?utm_source=qa", expect: "count" },
        { goto: "/nope-not-found", expect: /404|not be found/i },
      ],
    },
    deploy: { adapters: ["vercel", "cloudflare", "static", "bun"] },
    run: { expect: "count", keys: [KEY.up, KEY.up, "wait:200", "2", "wait:300", KEY.esc, "wait:200", "1", KEY.down, KEY.f2, "wait:200", KEY.f2] },
  },
  {
    name: "template:dashboard",
    kind: "template",
    source: "dashboard",
    scenario: {
      actions: [
        { expect: "Deployments" },
        { wait: 1200 },
        { press: "2" },
        { expect: "Compiled successfully" },
        { press: "1" },
        { expect: "Edge hit rate" },
        { press: "2" },
        { press: "Escape" },
        { expect: "Edge hit rate" },
        { press: "1" },
        { press: "2" },
        { press: "1" },
        { press: "Tab", repeat: 3 },
        { press: "Enter" },
        { expect: /dpl_\w+\s+● (ready|building|error)/ },
        { press: "Escape" },
        { expect: "Edge hit rate" },
        { press: ["Tab", "Shift+Tab"] },
        { edit: "app/page.tsx", find: "Deployments\n", replace: "Recent deployments\n", expect: "Recent deployments" },
        { press: "F2" },
        { wait: 300 },
        { press: "F2" },
        { resize: [80, 24] },
        { resize: [160, 48] },
        { resize: "fit" },
        { window: [800, 600] },
        { window: [1440, 900] },
        { goto: "/deployments/dpl_d4", expect: "Failed to compile" },
        { goto: "/deployments/nope", expect: /404|not be found/i },
        { press: "Enter" },
        { expect: "Edge hit rate" },
        { fetch: "/api/metrics" },
        { goto: "/?ref=qa", expect: "Edge hit rate" },
      ],
    },
    // `/api/metrics` is a dynamic route handler: no static export (the README says so).
    deploy: { adapters: ["vercel", "cloudflare", "bun"] },
    run: { expect: "Deployments", keys: ["2", "wait:300", KEY.esc, "wait:200", KEY.tab, KEY.tab, KEY.enter, "wait:300", KEY.esc, "1"] },
  },
  {
    name: "template:opencode",
    kind: "template",
    source: "opencode",
    env: () => ({ OPENCODE_URL: (mockOpencode as MockOpencode).url }),
    scenario: {
      actions: [
        { expect: "Fix the flaky test" },
        { type: "Write a haiku" },
        { expect: "Write a haiku" },
        { press: "Enter" },
        { expect: "Mock reply" },
        { type: "thanks" },
        { press: "Enter" },
        { wait: 600 },
        { press: "Escape" },
        { expect: "Sessions" },
        { edit: "app/page.tsx", find: "Sessions\n", replace: "Recent sessions\n", expect: "Recent sessions" },
        { press: "Tab" },
        { press: ["ArrowDown", "ArrowUp"] },
        { press: "Enter" },
        { expect: /Mock reply|No messages yet/ },
        { press: "Escape" },
        { expect: "Sessions" },
        { press: "F2" },
        { wait: 300 },
        { press: "F2" },
        { resize: [80, 24] },
        { resize: "fit" },
        { goto: "/session/ses_mock1", expect: /No messages yet|you/ },
      ],
    },
    // `proxy` only runs in text dev / text start; deployed builds need a rewrite to a reachable server (README).
    deploy: { adapters: ["vercel", "cloudflare", "static", "bun"], browse: false },
  },
  {
    name: "example:dashboard",
    kind: "example",
    source: "examples/dashboard",
    scenario: {
      actions: [
        { expect: "Edge Console" },
        { press: "2" },
        { expect: "total" },
        { press: ["ArrowDown", "ArrowDown", "ArrowUp"] },
        { press: "Enter" },
        { expect: "← Deployments" },
        { press: "Escape" },
        { expect: "total" },
        { press: "3" },
        { expect: "Runtime Logs" },
        { press: "/" },
        { type: "api" },
        { press: "Escape" },
        { press: ["l", "l", " "] },
        { press: "4" },
        { wait: 300 },
        { press: ["Tab", "Tab", "Enter", "Shift+Tab"] },
        { press: "5" },
        { expect: "Status", timeout: 15_000 },
        { press: "r" },
        { wait: 800 },
        { press: "1" },
        { expect: "Edge Console" },
        { edit: "app/page.tsx", find: "Recent deployments", replace: "QA deployments", expect: "QA deployments" },
        { press: "F2" },
        { wait: 300 },
        { press: "F2" },
        { press: "Control+Backquote" },
        { wait: 300 },
        { press: "Control+Backquote" },
        { resize: [80, 24] },
        { resize: [160, 48] },
        { resize: "fit" },
        { window: [900, 600] },
        { window: [1440, 900] },
        { goto: "/deployments/nope-not-found", expect: /404|not be found|could not/i },
        { goto: "/settings" },
        { goto: "/logs", expect: "Runtime Logs" },
        { goto: "/status", expect: "Status" },
        { goto: "/status?ref=qa", expect: "Status" },
        { goto: "/?ref=qa", expect: "Edge Console" },
        { press: "1" },
        { wait: 800 },
        { fetch: "/api/health" },
        { fetch: "/api/deployments" },
      ],
    },
    // `/status` renders on the server: only the bun adapter has a long-lived server (TX030 elsewhere).
    deploy: { adapters: ["bun"] },
    run: { expect: "Edge Console", keys: ["2", "wait:300", KEY.down, KEY.enter, "wait:300", KEY.esc, "3", "wait:300", "4", "wait:300", "1", KEY.f2, "wait:200", KEY.f2] },
  },
  {
    name: "app:opencode-console",
    kind: "app",
    source: "apps/opencode-console",
    scenario: {
      path: "/?demo",
      actions: [
        { expect: "Ask anything", timeout: 15_000 },
        { wait: 800 },
        { type: "Explain this repo" },
        { press: "Enter" },
        { wait: 3000 },
        { press: "Control+p" },
        { wait: 300 },
        { press: "Escape" },
        { press: "Shift+Tab" },
        { press: ["Control+x", "b"] },
        { wait: 200 },
        { press: ["Control+x", "b"] },
        { press: ["Control+x", "l"] },
        { wait: 300 },
        { press: "Escape" },
        { press: "PageUp" },
        { press: "PageDown" },
        { type: "/help" },
        { press: "Enter" },
        { wait: 300 },
        { press: "Escape" },
        { resize: [80, 24] },
        { resize: [160, 48] },
        { resize: "fit" },
        { goto: "/connect?demo" },
      ],
    },
    run: { expect: "Ask anything", keys: ["hello", KEY.enter, "wait:2500", "\x10", "wait:300", KEY.esc, "\x18", "b", "wait:300", "\x18", "b", KEY.esc] },
  },
  {
    // The README's first run without an OpenCode server: the app falls back to its demo.
    name: "app:opencode-console-offline",
    kind: "app",
    source: "apps/opencode-console",
    env: () => ({ OPENCODE_SERVER_URL: "http://127.0.0.1:9" }),
    scenario: {
      actions: [
        { expect: "Ask anything", timeout: 15_000 },
        { expect: "demo" },
        { press: "Control+p" },
        { wait: 300 },
        { press: "Escape" },
        { goto: "/connect", expect: "demo" },
      ],
    },
    run: { expect: "Ask anything", keys: [KEY.tab, "wait:300", "\x10", "wait:300", KEY.esc] },
  },
  {
    name: "app:terminal-shop",
    kind: "app",
    source: "apps/terminal-shop",
    env: () => ({ TERMINAL_DEV_API_URL: freshMockTerminal(), TERMINAL_DEV_TOKEN: MOCK_TERMINAL_TOKEN, TERMINAL_ENABLE_PRODUCTION: "" }),
    scenario: {
      actions: [
        { expect: "free shipping", timeout: 30_000 },
        { press: "m" },
        { expect: "press esc to close" },
        { press: "Escape" },
        { expect: "~ featured ~" },
        { press: "a" },
        { expect: "order history" },
        { press: "ArrowDown", repeat: 8 },
        { expect: "environment: dev sandbox" },
        { press: "s" },
        { expect: "~ featured ~" },
        { press: "ArrowDown", repeat: 3 },
        { press: ["+", "+", "-", "+"] },
        { expect: "[2]" },
        { press: "c" },
        { expect: "checkout" },
        { press: "Escape" },
        { press: "ArrowUp", repeat: 3 },
      ],
    },
    run: { expect: "free shipping", keys: ["m", "wait:300", KEY.esc, KEY.down, KEY.down, "+", "+", "c", "wait:300", KEY.esc] },
  },
];

// ---------------------------------------------------------------------------
// Scaffolding
// ---------------------------------------------------------------------------

interface Prepared {
  dir: string;
  /** How to run a package.json script / the `text` bin. */
  script(name: string, ...args: string[]): [string, string[]];
  text(...args: string[]): [string, string[]];
  issues: string[];
}

function pointAtTarballs(dir: string, tarballs: Record<string, string>, pm: Pm): void {
  const file = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, string> | string>;
  // `--published <version>`: what npm users get today instead of this checkout.
  const local = Object.fromEntries(Object.entries(tarballs).map(([n, t]) => [n, PUBLISHED ? PUBLISHED : `file:${t}`]));
  for (const field of ["dependencies", "devDependencies"]) {
    const deps = pkg[field] as Record<string, string> | undefined;
    if (!deps) continue;
    for (const name of Object.keys(deps)) if (local[name]) deps[name] = local[name] as string;
  }
  // npm only accepts overrides for direct dependencies when the specs match.
  pkg.overrides = local;
  pkg.resolutions = local;
  if (pm === "npm") delete pkg.resolutions;
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
}

function prepare(target: Target, pm: Pm, work: string, tarballs: Record<string, string>, ctaDir: string): Prepared {
  const issues: string[] = [];
  const dir = join(work, `${target.name.replace(/[:/]/g, "-")}-${pm}`);
  if (target.kind === "template") {
    // Scaffold with the packed CLI: `bunx create-text-app` (Bun) or `npx create-text-app` (Node).
    const cli = join(ctaDir, "package/bin/create-text-app.js");
    const r = pm === "bun" ? exec("bun", [cli, dir, "--template", target.source, "--yes"], work) : exec("npx", ["--yes", `--package=file:${tarballs["create-text-app"]}`, "create-text-app", dir, "--template", target.source, "--yes"], work);
    if (r.code !== 0) throw new Error(`create-text-app failed:\n${r.out}`);
    const bad = badLines(r.out);
    if (bad.length > 0) issues.push(`create-text-app printed:\n${indent(bad.join("\n"))}`);
    // The success message must name commands that exist.
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { dependencies: Record<string, string>; scripts: Record<string, string> };
    for (const m of r.out.matchAll(/^\s+(bun|npm|pnpm|yarn)(?: run)? (\w+)$/gm)) {
      const s = m[2] as string;
      if (s !== "install" && !pkg.scripts[s]) issues.push(`create-text-app suggests \`${m[0].trim()}\`, but package.json has no "${s}" script`);
    }
    if (pm === "npm" && !/npm run dev/.test(r.out)) issues.push("npx create-text-app did not print npm commands");
    const range = pkg.dependencies["@textjs/next"];
    if (range !== `^${VERSION}`) issues.push(`template depends on @textjs/next ${range}, expected ^${VERSION}`);
    const leftover = exec("grep", ["-rln", "{{", dir, "--exclude-dir=node_modules"], work);
    if (leftover.out.trim()) issues.push(`unfilled {{placeholders}} in ${leftover.out.trim()}`);
    pointAtTarballs(dir, tarballs, pm);
  } else if (target.kind === "example") {
    cpSync(join(ROOT, target.source), dir, { recursive: true, filter: (src) => !/node_modules|\/dist(\/|$)|\.textjs/.test(src) });
    const file = join(dir, "package.json");
    const pkg = JSON.parse(readFileSync(file, "utf8")) as { name: string };
    pkg.name = target.source.split("/").pop() as string;
    writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
    pointAtTarballs(dir, tarballs, pm);
  } else {
    // Apps import repo-relative modules: they run from the workspace, as their READMEs describe.
    const textBin = join(ROOT, "packages/text/bin/text.ts");
    const appDir = join(ROOT, target.source);
    return {
      dir: appDir,
      script: (name, ...args) => ["bun", ["run", name, ...args]],
      text: (...args) => ["bun", [textBin, ...args]],
      issues,
    };
  }
  return {
    dir,
    script: (name, ...args) => (pm === "bun" ? ["bun", ["--bun", "run", name, ...args]] : ["npm", ["run", name, "--", ...args]]),
    text: (...args) => (pm === "bun" ? ["bun", ["--bun", "x", "text", ...args]] : ["npx", ["--no-install", "text", ...args]]),
    issues,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

type Status = "pass" | "fail" | "skip" | "n/a";

interface Cell {
  status: Status;
  issues: string[];
  notes: string[];
}

const results = new Map<string, Map<string, Cell>>();

function record(target: string, column: string, issues: string[], notes: string[] = [], status?: Status): void {
  const row = results.get(target) ?? new Map<string, Cell>();
  results.set(target, row);
  const prev = row.get(column);
  const cell: Cell = { status: status ?? (issues.length > 0 ? "fail" : "pass"), issues: [...(prev?.issues ?? []), ...issues], notes: [...(prev?.notes ?? []), ...notes] };
  if (prev?.status === "fail") cell.status = "fail";
  row.set(column, cell);
  const mark = cell.status === "pass" ? "✓" : cell.status === "fail" ? "✗" : "–";
  console.log(`  ${mark} ${target} ${column}${status === "skip" || status === "n/a" ? ` (${status})` : ""}`);
  for (const i of issues) console.log(`      ${i.replace(/\n/g, "\n      ")}`);
  for (const n of notes) console.log(`      note: ${n}`);
}

/** eslint-plugin-textjs `recommended` (the config its README documents) over the project's sources. */
async function lint(dir: string): Promise<string[]> {
  const plugin = join(ROOT, "packages/eslint-plugin-textjs");
  // eslint is a dependency of the plugin package, not of the repo root.
  type LintResult = { errorCount: number; warningCount: number };
  type ESLintLike = { lintFiles(p: string[]): Promise<LintResult[]>; loadFormatter(n: string): Promise<{ format(r: LintResult[]): string | Promise<string> }> };
  const { ESLint } = (await import(Bun.resolveSync("eslint", plugin))) as { ESLint: new (o: object) => ESLintLike };
  const tsParser = (await import(Bun.resolveSync("@typescript-eslint/parser", plugin))) as { default: unknown };
  const textjs = ((await import(join(plugin, "src/index.ts"))) as { default: { configs: { recommended: unknown } } }).default;
  const eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: true,
    overrideConfig: [{ ignores: ["**/node_modules/**", "**/dist/**", "**/.vercel/**"] }, { files: ["**/*.{ts,tsx,mts}"], languageOptions: { parser: tsParser.default ?? tsParser } }, textjs.configs.recommended as never] as never,
  });
  const results = await eslint.lintFiles(["."]);
  const text = await (await eslint.loadFormatter("stylish")).format(results);
  return results.some((r) => r.errorCount + r.warningCount > 0) ? [`eslint-plugin-textjs (recommended):\n${indent(stripVTControlCharacters(text).trim())}`] : [];
}

async function qaTarget(target: Target, pm: Pm, work: string, tarballs: Record<string, string>, ctaDir: string, browser: Browser): Promise<void> {
  const col = (step: Step): string => (pm === "bun" ? step : `${step}:${pm}`);
  const want = (step: Step): boolean => STEP_FILTER.has(step);
  let p: Prepared;
  try {
    p = prepare(target, pm, work, tarballs, ctaDir);
  } catch (e) {
    record(target.name, col("install"), [e instanceof Error ? e.message : String(e)]);
    return;
  }

  // install
  if (target.kind !== "app") {
    const r = pm === "bun" ? exec("bun", ["install"], p.dir) : exec("npm", ["install", "--no-audit", "--no-fund", "--loglevel=warn"], p.dir);
    const issues = [...p.issues];
    if (r.code !== 0) issues.push(`${pm} install failed:\n${indent(r.out.trim().split("\n").slice(-20).join("\n"))}`);
    else {
      // npm 11 asks to approve esbuild's postinstall (Vite's dependency) in every Vite project.
      const bad = badLines(r.out, [/npm warn deprecated/i, /npm warn install-scripts/i]);
      if (bad.length > 0) issues.push(`${pm} install printed:\n${indent(bad.join("\n"))}`);
    }
    record(target.name, col("install"), issues);
    if (r.code !== 0) return;
  }

  // tsc
  if (want("tsc") && pm === "bun") {
    const r = exec("bun", ["x", "tsc", "--noEmit", "-p", "."], p.dir);
    record(target.name, "tsc", r.code === 0 ? [] : [`tsc --noEmit:\n${indent(r.out.trim())}`]);
  }

  // lint: eslint-plugin-textjs `recommended`, the config its README documents.
  if (want("lint") && pm === "bun") {
    record(target.name, "lint", await lint(p.dir));
  }

  const runServerPass = async (step: "dev" | "start", scenario: Scenario): Promise<void> => {
    const port = await freePort();
    const env = target.env?.() ?? {};
    let server: Server;
    try {
      const [cmd, args] = target.kind === "app" ? p.text(step, "--port", String(port)) : p.script(step, "--port", String(port));
      server = await startServer(cmd, args, p.dir, port, env);
    } catch (e) {
      record(target.name, col(step), [e instanceof Error ? e.message : String(e)]);
      return;
    }
    const result = await browserPass(browser, server, scenario, { dev: step === "dev", root: p.dir, allow: target.allow });
    const output = server.output();
    await server.stop();
    const bad = badLines(output, target.allowLog);
    if (bad.length > 0) result.issues.push(`text ${step} printed:\n${indent(bad.slice(0, 20).join("\n"))}`);
    record(target.name, col(step), result.issues, result.notes);
  };

  if (want("dev")) await runServerPass("dev", target.scenario);

  if (want("build") || want("start")) {
    const [cmd, args] = target.kind === "app" ? p.text("build") : p.script("build");
    const r = exec(cmd, args, p.dir, target.env?.() ?? {});
    const issues: string[] = [];
    if (r.code !== 0) issues.push(`text build failed:\n${indent(r.out.trim().split("\n").slice(-30).join("\n"))}`);
    const bad = badLines(r.out, target.allowLog);
    if (bad.length > 0) issues.push(`text build printed:\n${indent(bad.join("\n"))}`);
    record(target.name, col("build"), issues);
    if (r.code === 0 && want("start")) {
      const scenario = target.startScenario ?? { ...target.scenario, actions: target.scenario.actions.filter((a) => !("edit" in a)) };
      await runServerPass("start", scenario);
    }
  }

  // The READMEs' deploy section: `bunx text build --adapter <name>`, then `bun dist/server.js`.
  if (want("deploy") && pm === "bun" && target.deploy) {
    const issues: string[] = [];
    for (const adapter of target.deploy.adapters) {
      const [cmd, args] = p.text("build", "--adapter", adapter);
      const r = exec(cmd, args, p.dir, target.env?.() ?? {});
      if (r.code !== 0) issues.push(`text build --adapter ${adapter} failed:\n${indent(r.out.trim().split("\n").slice(-20).join("\n"))}`);
      const bad = badLines(r.out, target.allowLog);
      if (bad.length > 0) issues.push(`text build --adapter ${adapter} printed:\n${indent(bad.join("\n"))}`);
    }
    if (issues.length === 0 && target.deploy.adapters.includes("bun") && target.deploy.browse !== false) {
      const port = await freePort();
      try {
        const server = await startServer("bun", ["dist/server.js"], p.dir, port, { ...(target.env?.() ?? {}), PORT: String(port) });
        const result = await browserPass(browser, server, { ...target.scenario, actions: target.scenario.actions.filter((a) => !("edit" in a)) }, { dev: false, root: p.dir, allow: target.allow });
        const output = server.output();
        await server.stop();
        issues.push(...result.issues, ...badLines(output, target.allowLog).map((l) => `bun dist/server.js printed: ${l}`));
      } catch (e) {
        issues.push(e instanceof Error ? e.message : String(e));
      }
    }
    record(target.name, "deploy", issues);
  }

  // Under Node (`npx text run`) the CLI re-runs itself with Bun.
  if (want("run")) {
    if (!target.run) {
      if (pm === "bun") record(target.name, "run", [], [], "n/a");
    } else {
      const [cmd, args] = p.text("run");
      record(target.name, col("run"), await ptyRun([cmd, ...args], p.dir, target.run, target.env?.() ?? {}));
    }
  }
}

async function main(): Promise<number> {
  const work = mkdtempSync(join(process.env.QA_TMP ?? tmpdir(), "textjs-qa-"));
  console.log(`▼ QA starters in ${work}`);
  BASE_ENV = {
    ...(process.env as Record<string, string>),
    PATH: `${shimDir(work)}:${process.env.PATH}`,
    NO_COLOR: "1",
    BROWSER: "none",
    // Never reach a real OpenCode server, whatever the shell exported.
    OPENCODE_URL: "http://127.0.0.1:9",
    OPENCODE_SERVER_URL: "http://127.0.0.1:9",
    OPENCODE_PASSWORD: "",
    OPENCODE_SERVER_PASSWORD: "",
  };
  delete BASE_ENV.FORCE_COLOR;

  const targets = TARGETS.filter((t) => ONLY.length === 0 || ONLY.some((o) => t.name === o || t.name.endsWith(`:${o}`) || t.source === o));
  if (targets.length === 0) throw new Error(`--only matched nothing (targets: ${TARGETS.map((t) => t.name).join(", ")})`);

  console.log("▼ packing");
  const tarballs = packPackages(join(work, "pack"), !flag("skip-build"), [
    ["@textjs/core", "packages/core"],
    ["@textjs/react", "packages/react"],
    ["@textjs/opencode", "packages/opencode"],
    ["@textjs/next", "packages/text"],
    ["@textjs/font", "packages/font"],
    ["create-text-app", "packages/create-text-app"],
    ["eslint-plugin-textjs", "packages/eslint-plugin-textjs"],
  ]);
  const ctaDir = join(work, "pack", "create-text-app");

  mockOpencode = startMockOpencode();
  const terminal = (await import("../apps/terminal-shop/test/mock-terminal")) as typeof import("../apps/terminal-shop/test/mock-terminal");
  startMockTerminal = terminal.startMockTerminal;
  MOCK_TERMINAL_TOKEN = terminal.MOCK_TOKEN;
  const browser = await launchBrowser();

  try {
    for (const target of targets) {
      for (const pm of target.kind === "app" ? (["bun"] as Pm[]) : PMS) {
        console.log(`\n▼ ${target.name} (${target.kind === "app" ? "workspace" : pm})`);
        await qaTarget(target, pm, work, tarballs, ctaDir, browser);
      }
    }
  } finally {
    await browser.close().catch(() => undefined);
    mockOpencode.stop();
    for (const stop of cleanups) stop();
  }
  const realHits = mockOpencode.hits.length;
  if (VERBOSE) console.log(`mock OpenCode served ${realHits} requests`);

  // Summary table
  const columns = [...new Set([...results.values()].flatMap((r) => [...r.keys()]))];
  const order = (c: string): number => STEPS.indexOf(c.split(":")[0] as Step) * 10 + (c.includes(":") ? 1 : 0);
  columns.sort((a, b) => order(a) - order(b));
  const sym = (c: Cell | undefined): string => (!c ? " " : c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "–");
  console.log(`\n| target | ${columns.join(" | ")} |\n| --- | ${columns.map(() => "---").join(" | ")} |`);
  for (const [name, row] of results) console.log(`| ${name} | ${columns.map((c) => sym(row.get(c))).join(" | ")} |`);
  const failed = [...results.values()].some((r) => [...r.values()].some((c) => c.status === "fail"));
  const json = opt("json");
  if (json) writeFileSync(json, `${JSON.stringify(Object.fromEntries([...results].map(([k, v]) => [k, Object.fromEntries(v)])), null, 2)}\n`);
  if (!KEEP) rmSync(work, { recursive: true, force: true });
  else console.log(`\nkept ${work}`);
  console.log(failed ? "\n✗ QA failed" : "\n✓ QA passed");
  return failed ? 1 : 0;
}

if (import.meta.main) process.exitCode = await main();
