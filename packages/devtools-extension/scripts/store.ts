/**
 * Chrome Web Store assets. Builds the release zip, loads that zip unpacked into
 * Chromium, checks chrome://extensions for errors, and captures the real
 * DevTools window inspecting `examples/dashboard` under `text dev`:
 *
 *   store/textjs-devtools-<version>.zip   the upload
 *   store/icon-128.png
 *   store/screenshot-{1..4}-*.png         1280×800: frame, components, timeline, console
 *   store/promo-small.png                 440×280
 *   store/promo-marquee.png               1400×560
 *
 *   bun scripts/store.ts [--headed]
 *
 * Nothing is uploaded.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "./build";
import { requireChromium } from "./chromium";
import { renderIcon } from "./icons";

const ROOT = resolve(import.meta.dir, "..");
const REPO = resolve(ROOT, "../..");
const STORE = join(ROOT, "store");
const headed = process.argv.includes("--headed");
const W = 1280;
const H = 800;

function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const a = s.address();
      s.close(() => (typeof a === "object" && a ? res(a.port) : rej(new Error("no port"))));
    });
  });
}

async function poll<T>(label: string, fn: () => Promise<T | null | undefined | false>, timeout = 20_000): Promise<T> {
  const t0 = Date.now();
  let last: unknown;
  while (Date.now() - t0 < timeout) {
    try {
      const v = await fn();
      if (v) return v as T;
    } catch (e) {
      last = e;
    }
    await Bun.sleep(150);
  }
  throw new Error(`timed out waiting for ${label}${last ? `: ${String(last)}` : ""}`);
}

/** A persistent CDP connection to one target. */
class Cdp {
  private id = 0;
  private pending = new Map<number, (msg: { result?: any; error?: { message: string } }) => void>();
  private constructor(private ws: WebSocket) {
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data));
      if (msg.id !== undefined) this.pending.get(msg.id)?.(msg);
    };
  }
  static async open(url: string): Promise<Cdp> {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    return new Cdp(ws);
  }
  send(method: string, params: object = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, (msg) => (msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result)));
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval<T = unknown>(expression: string): Promise<T> {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result?.value as T;
  }
  close(): void {
    this.ws.close();
  }
}

const font = (file: string): string => `data:font/woff2;base64,${readFileSync(join(REPO, "apps/web/public/fonts", file)).toString("base64")}`;
const MARK = '<svg viewBox="0 0 24 24"><path d="M2 4h20L12 21.5z" fill="#fff"/></svg>';

/** The site's look: black, a faint cell grid inside framing rules, Geist, the ▼ mark. */
function promoHtml(kind: "small" | "marquee"): string {
  const small = kind === "small";
  const [w, h] = small ? [440, 280] : [1400, 560];
  const inset = small ? 16 : 36;
  const cell = small ? 40 : 70;
  const shot = small ? "" : `data:image/png;base64,${readFileSync(join(STORE, "screenshot-1-frame.png")).toString("base64")}`;
  const crosses = [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ]
    .map(([x, y]) => `<span class="cross" style="left:${x! - 10}px;top:${y! - 10}px"></span>`)
    .join("");
  const body = small
    ? `<div class="center"><div class="lockup">${MARK}<span>Text.js</span></div><div class="sub">DevTools</div></div>`
    : `<div class="left"><div class="lockup">${MARK}<span>Text.js</span></div><div class="title">DevTools</div><p class="desc">Inspect the component tree, frames and timing of Text.js apps in Chrome DevTools.</p></div>
       <div class="window"><img src="${shot}"></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Geist"; font-weight: 100 900; src: url(${font("geist-latin.woff2")}) format("woff2"); }
@font-face { font-family: "Geist Mono"; font-weight: 100 900; src: url(${font("geist-mono-latin.woff2")}) format("woff2"); }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${w}px; height: ${h}px; overflow: hidden; background: #000; color: #ededed; font-family: "Geist", sans-serif; -webkit-font-smoothing: antialiased; }
.grid { position: absolute; left: ${inset}px; top: ${inset}px; width: ${w - 2 * inset}px; height: ${h - 2 * inset}px;
  background-image: linear-gradient(rgba(255,255,255,0.075) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.075) 1px, transparent 1px);
  background-size: ${cell}px ${cell}px; background-position: -1px -1px;
  -webkit-mask-image: ${small ? "radial-gradient(ellipse 60% 70% at 50% 50%, transparent 20%, #000 85%)" : "linear-gradient(90deg, transparent 15%, #000 60%)"}; }
.rule-h, .rule-v { position: absolute; background: rgba(255,255,255,0.14); }
.rule-h { left: 0; width: ${w}px; height: 1px; }
.rule-v { top: 0; height: ${h}px; width: 1px; }
.cross { position: absolute; width: 21px; height: 21px; }
.cross::before, .cross::after { content: ""; position: absolute; background: rgba(255,255,255,0.5); }
.cross::before { left: 10px; top: 0; width: 1px; height: 21px; }
.cross::after { top: 10px; left: 0; width: 21px; height: 1px; }
.lockup { display: flex; align-items: center; gap: ${small ? 12 : 14}px; font-weight: 700; letter-spacing: -0.04em; color: #fff; }
.lockup svg { width: ${small ? 46 : 40}px; height: ${small ? 46 : 40}px; display: block; }
.lockup span { font-size: ${small ? 46 : 38}px; line-height: 1; }
.center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; }
.sub { font-family: "Geist Mono", monospace; font-size: 22px; color: #a1a1a1; letter-spacing: 0; }
.left { position: absolute; left: 100px; top: 0; bottom: 0; width: 500px; display: flex; flex-direction: column; justify-content: center; }
.title { margin-top: 34px; font-size: 92px; font-weight: 600; letter-spacing: -0.045em; line-height: 1; color: #fff; }
.desc { margin-top: 24px; font-size: 28px; line-height: 1.4; color: #a1a1a1; letter-spacing: -0.01em; text-wrap: balance; }
.window { position: absolute; left: 640px; top: 84px; width: 960px; height: 600px; border: 1px solid rgba(255,255,255,0.16); border-radius: 14px; overflow: hidden;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.6), 0 40px 100px -20px rgba(0,0,0,0.9), 0 0 160px -40px rgba(255,255,255,0.12); }
.window img { display: block; width: 960px; height: 600px; }
</style></head><body><div class="grid"></div><div class="rule-h" style="top:${inset}px"></div><div class="rule-h" style="top:${h - inset}px"></div><div class="rule-v" style="left:${inset}px"></div><div class="rule-v" style="left:${w - inset}px"></div>${crosses}${body}</body></html>`;
}

type Target = { id: string; type: string; url: string; webSocketDebuggerUrl?: string };

let chrome: ChildProcess | null = null;
let server: ChildProcess | null = null;
const work = mkdtempSync(join(tmpdir(), "textjs-devtools-store-"));

try {
  // 1. The release zip, extracted the way Chrome will see it.
  const { zip, version } = await build();
  mkdirSync(STORE, { recursive: true });
  const upload = join(STORE, `textjs-devtools-${version}.zip`);
  copyFileSync(zip!, upload);
  const ext = join(work, "ext");
  if (spawnSync("unzip", ["-q", upload, "-d", ext]).status !== 0) throw new Error("unzip failed");
  const manifest = JSON.parse(readFileSync(join(ext, "manifest.json"), "utf8"));
  console.log(`▼ ${upload.slice(ROOT.length + 1)} · manifest ${manifest.version} · ${manifest.description.length}-char description`);
  if (manifest.version !== version || manifest.version === "0.0.0") throw new Error(`manifest version is ${manifest.version}`);
  writeFileSync(join(STORE, "icon-128.png"), renderIcon(128, 16));

  // 2. The app.
  const devPort = await freePort();
  server = spawn("bun", [join(REPO, "packages/app/bin/text.ts"), "dev", "--port", String(devPort)], { cwd: join(REPO, "examples/dashboard"), stdio: "ignore" });
  const appUrl = `http://localhost:${devPort}/`;
  await poll("dev server", async () => (await fetch(appUrl)).ok, 30_000);

  // 3. Chromium with the extension, Developer mode on (so chrome://extensions collects errors) and DevTools undocked.
  const profile = join(work, "profile");
  mkdirSync(join(profile, "Default"), { recursive: true });
  writeFileSync(
    join(profile, "Default/Preferences"),
    JSON.stringify({
      extensions: { ui: { developer_mode: true } },
      devtools: { preferences: { currentDockState: '"undocked"', uiTheme: '"dark"', "panel-selected-tab": '"console"' } },
    }),
  );
  const port = await freePort();
  chrome = spawn(
    requireChromium(),
    [
      ...(headed ? [] : ["--headless=new"]),
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--disable-extensions-except=${ext}`,
      `--load-extension=${ext}`,
      "--auto-open-devtools-for-tabs",
      `--window-size=${W},${H}`,
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      "--disable-renderer-backgrounding",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--no-first-run",
      "--no-default-browser-check",
      appUrl,
    ],
    { stdio: "ignore" },
  );
  const list = async (): Promise<Target[]> => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as Target[];
  const target = (match: (t: Target) => boolean, label: string): Promise<Target> => poll(label, async () => (await list()).find((t) => match(t) && t.webSocketDebuggerUrl));

  const front = await Cdp.open((await target((t) => t.url.startsWith("devtools://devtools/"), "DevTools frontend")).webSocketDebuggerUrl!);
  await front.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const page = await Cdp.open((await target((t) => t.type === "page" && t.url.startsWith(appUrl), "app page")).webSocketDebuggerUrl!);
  await poll("console root", () => page.eval<boolean>("(globalThis.__TEXTJS_DEVTOOLS_HOOK__?.roots.size ?? 0) > 0"));

  // 4. Open the Text.js panel in the real DevTools window.
  const findTab = (name: string): string => `(() => {
    const walk = (root) => {
      for (const el of root.querySelectorAll("*")) {
        if (el.getAttribute("role") === "tab" && el.textContent.trim() === ${JSON.stringify(name)}) return el;
        if (el.shadowRoot) { const hit = walk(el.shadowRoot); if (hit) return hit; }
      }
      return null;
    };
    const tab = walk(document);
    if (!tab) return false;
    tab.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, composed: true }));
    tab.click();
    return true;
  })()`;
  await poll("Text.js tab", () => front.eval<boolean>(findTab("Text.js")));
  const panelTarget = await target((t) => t.url.startsWith("chrome-extension://") && t.url.endsWith("/panel.html"), "panel");
  const extId = panelTarget.url.split("/")[2]!;
  const panel = await Cdp.open(panelTarget.webSocketDebuggerUrl!);
  await poll("tree rows", () => panel.eval<boolean>(`document.querySelectorAll(".tree .row").length > 20`));

  const shot = async (name: string): Promise<void> => {
    await Bun.sleep(700);
    const { data } = await front.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(STORE, name), Buffer.from(data, "base64"));
    console.log(`  · store/${name}`);
  };
  const press = async (key: string): Promise<void> => {
    const code = key.length === 1 ? (/\d/.test(key) ? `Digit${key}` : `Key${key.toUpperCase()}`) : key;
    const vk = key === "Tab" ? 9 : key.toUpperCase().charCodeAt(0);
    await page.send("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: vk, text: key.length === 1 ? key : undefined });
    await page.send("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: vk });
  };
  const inPanel = (js: string): Promise<unknown> => panel.eval(`(() => { ${js} })()`);

  // Pin the grid to the size of the Frame view, so the frame fills it.
  await inPanel(`[...document.querySelectorAll(".tab")].find((t) => t.textContent.trim() === "Frame").click()`);
  await poll("frame grid", () => inPanel(`return !!document.querySelector(".frame-grid .grid-row")`));
  await Bun.sleep(300);
  const fit = (await inPanel(`
    const grid = document.querySelector(".frame-grid").getBoundingClientRect();
    const scroll = document.querySelector(".frame-scroll").getBoundingClientRect();
    const [, cols, rows] = document.querySelector(".pane-head .mono").textContent.match(/(\\d+) × (\\d+)/).map(Number);
    const pad = 2 * (grid.left - scroll.left);
    return { cols: Math.floor((scroll.width - pad) / (grid.width / cols)), rows: Math.floor((scroll.height - pad) / (grid.height / rows)) };
  `)) as { cols: number; rows: number };
  await inPanel(`document.querySelector(".chip").click()`);
  await Bun.sleep(200);
  await inPanel(`
    const set = (input, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const [c, r] = document.querySelectorAll(".popover input");
    set(c, ${fit.cols});
    set(r, ${fit.rows});
    document.querySelector('.popover button[type="submit"]').click();
  `);
  await poll(`${fit.cols}×${fit.rows} grid`, () => page.eval<boolean>(`globalThis.text.stats().cols === ${fit.cols} && globalThis.text.stats().rows === ${fit.rows}`));

  // Real use: focus the page and switch routes, so the timeline has commits. (`/status` is
  // skipped: it reloads the page.)
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: 20, y: 20, button: "left", clickCount: 1 });
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: 20, y: 20, button: "left", clickCount: 1 });
  const routes: string[] = [];
  for (const key of ["2", "3", "1", "4", "1", "2", "1", "3", "4", "2", "1", "3", "1", "4", "2", "1"]) {
    await press(key);
    await Bun.sleep(700);
    routes.push(await page.eval<string>("location.pathname"));
  }
  console.log(`  routes visited: ${[...new Set(routes)].join(" ")}`);
  await Bun.sleep(4000);

  // 1. Components: ThroughputChart selected, with its props, hooks and scene node.
  await inPanel(`[...document.querySelectorAll(".tab")].find((t) => t.textContent.trim() === "Components").click()`);
  await poll("tree", () => inPanel(`return document.querySelectorAll(".tree .row").length > 20`));
  await inPanel(`document.querySelector(".tree-pane .check input").click()`);
  await poll("ThroughputChart row", () =>
    inPanel(`
      const row = [...document.querySelectorAll(".tree .row")].find((r) => r.textContent.trim() === "ThroughputChart");
      if (!row) return false;
      row.click();
      row.scrollIntoView({ block: "center" });
      return true;
    `),
  );
  await poll("inspector", () => inPanel(`return document.querySelector(".inspector-head h2")?.textContent === "ThroughputChart"`));
  await shot("screenshot-2-components.png");

  // 2. Frame: hover a cell of the throughput chart.
  await inPanel(`[...document.querySelectorAll(".tab")].find((t) => t.textContent.trim() === "Frame").click()`);
  await poll("frame grid", () => inPanel(`return !!document.querySelector(".frame-grid .grid-row")`));
  await Bun.sleep(400);
  const cell = (await inPanel(`
    const rows = [...document.querySelectorAll(".frame-grid .grid-row")];
    const y = rows.findIndex((r) => r.textContent.includes("████"));
    const x = rows[y].textContent.indexOf("████") + 2;
    return { x, y };
  `)) as { x: number; y: number };
  await inPanel(`
    const grid = document.querySelector(".frame-grid");
    const r = grid.getBoundingClientRect();
    const head = document.querySelector(".pane-head .mono").textContent;
    const cols = Number(head.match(/(\\d+) × (\\d+)/)[1]);
    const rows = Number(head.match(/(\\d+) × (\\d+)/)[2]);
    const cw = r.width / cols;
    const lh = r.height / rows;
    const ev = (type) => new MouseEvent(type, { bubbles: true, clientX: r.left + (${cell.x} + 0.5) * cw, clientY: r.top + (${cell.y} + 0.5) * lh });
    grid.dispatchEvent(ev("mouseover"));
    grid.dispatchEvent(ev("mousemove"));
  `);
  await poll("cell info", () => inPanel(`return [...document.querySelectorAll("h3")].some((h) => h.textContent.includes("Painted by"))`));
  await shot("screenshot-1-frame.png");

  // 3. Timeline, after streaming logs and cycling the level filter on /logs for a while.
  await inPanel(`document.querySelector(".frame-grid").dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }))`);
  await press("3");
  await Bun.sleep(1000);
  for (let i = 0; i < 110; i++) {
    await press("l");
    await Bun.sleep(140);
  }
  await Bun.sleep(2500);
  await inPanel(`[...document.querySelectorAll(".tab")].find((t) => t.textContent.trim() === "Timeline").click()`);
  await poll("timeline", () => inPanel(`return document.querySelectorAll(".chart-svg").length === 3`));
  await shot("screenshot-3-timeline.png");

  // 4. The app itself in the Console, with a node selected in the panel.
  await press("1");
  await Bun.sleep(1200);
  await inPanel(`[...document.querySelectorAll(".tab")].find((t) => t.textContent.trim() === "Components").click()`);
  await poll("ThroughputChart row", () =>
    inPanel(`
      const row = [...document.querySelectorAll(".tree .row")].find((r) => r.textContent.trim() === "ThroughputChart");
      if (!row) return false;
      row.click();
      return true;
    `),
  );
  await Bun.sleep(500);
  await poll("Console tab", () => front.eval<boolean>(findTab("Console")));
  await Bun.sleep(1500);
  await shot("screenshot-4-console.png");

  // 5. Promo tiles, drawn like the site's Open Graph cards.
  const art = await Cdp.open(`ws://127.0.0.1:${port}/devtools/page/${(await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json()).id}`);
  for (const [name, width, height] of [
    ["promo-small.png", 440, 280],
    ["promo-marquee.png", 1400, 560],
  ] as const) {
    await art.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const { frameTree } = await art.send("Page.getFrameTree");
    await art.send("Page.setDocumentContent", { frameId: frameTree.frame.id, html: promoHtml(width === 440 ? "small" : "marquee") });
    await art.eval("document.fonts.ready.then(() => true)");
    await Bun.sleep(300);
    const { data } = await art.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale: 1 } });
    writeFileSync(join(STORE, name), Buffer.from(data, "base64"));
    console.log(`  · store/${name}`);
  }
  art.close();

  // 6. Errors, as chrome://extensions reports them.
  const extensionsPage = await Cdp.open(`ws://127.0.0.1:${port}/devtools/page/${(await (await fetch(`http://127.0.0.1:${port}/json/new?chrome://extensions`, { method: "PUT" })).json()).id}`);
  await Bun.sleep(1000);
  const info = await extensionsPage.eval<any>(`new Promise((r) => chrome.developerPrivate.getExtensionsInfo({ includeDisabled: true }, r))`);
  const mine = (info as any[]).find((e) => e.id === extId);
  const errors = { manifest: mine.manifestErrors, runtime: mine.runtimeErrors, install: mine.installWarnings };
  console.log(`  chrome://extensions: ${mine.name} ${mine.version}, ${mine.state}, ${JSON.stringify(errors)}`);
  if (errors.manifest.length + errors.runtime.length + errors.install.length > 0) throw new Error("chrome://extensions reports errors");
  for (const c of [front, page, panel, extensionsPage]) c.close();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  chrome?.kill();
  server?.kill();
  await Bun.sleep(300);
  rmSync(work, { recursive: true, force: true });
}
