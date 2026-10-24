/**
 * Probe: does real DevTools load devtools.html and create the "Text.js" panel?
 * Launches Chromium with `--auto-open-devtools-for-tabs` and lists CDP targets.
 *
 *   bun e2e/probe-devtools.ts [--headed] [--shots]
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "../scripts/build";

const ROOT = resolve(import.meta.dir, "..");
const REPO = resolve(ROOT, "../..");
const headed = process.argv.includes("--headed");
const shots = process.argv.includes("--shots");

function findChromium(): string {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  for (const d of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    const p = join(cache, d, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (existsSync(p)) return p;
  }
  throw new Error("Chromium not found");
}

const { dist } = await build({ zip: false });
const port = 9300 + Math.floor(Math.random() * 500);
const devPort = 4400 + Math.floor(Math.random() * 500);
const server = spawn("bun", [join(REPO, "packages/text/bin/text.ts"), "dev", "--port", String(devPort)], { cwd: join(REPO, "examples/dashboard"), stdio: "ignore" });
const profile = mkdtempSync(join(tmpdir(), "textjs-devtools-probe-"));
// Dock DevTools at the bottom of a wide window so every panel tab fits without overflow.
mkdirSync(join(profile, "Default"), { recursive: true });
writeFileSync(join(profile, "Default/Preferences"), JSON.stringify({ devtools: { preferences: { currentDockState: '"bottom"' } } }));
const chrome = spawn(
  findChromium(),
  [
    ...(headed ? [] : ["--headless=new"]),
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--disable-extensions-except=${dist}`,
    `--load-extension=${dist}`,
    "--auto-open-devtools-for-tabs",
    "--window-size=1800,1100",
    "--no-first-run",
    "--no-default-browser-check",
    `http://localhost:${devPort}/`,
  ],
  { stdio: "ignore" },
);

type Target = { type: string; url: string; webSocketDebuggerUrl?: string };

async function targets(): Promise<Target[]> {
  try {
    return (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as Target[];
  } catch {
    return [];
  }
}

/** Send one CDP command to a target. */
async function cdp(wsUrl: string, method: string, params: object): Promise<any> {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  const result = await new Promise<any>((res) => {
    ws.onmessage = (e) => {
      const msg = JSON.parse(String(e.data));
      if (msg.id === 1) res(msg.result);
    };
    ws.send(JSON.stringify({ id: 1, method, params }));
  });
  ws.close();
  return result;
}

async function evaluate(wsUrl: string, expression: string): Promise<unknown> {
  return (await cdp(wsUrl, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }))?.result?.value;
}

// Finds DevTools' "Text.js" tab through shadow roots and clicks it.
const CLICK_TAB = `(() => {
  const walk = (root) => {
    for (const el of root.querySelectorAll("*")) {
      if (el.getAttribute("role") === "tab" && el.textContent.trim() === "Text.js") return el;
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

const poll = async <T>(fn: () => Promise<T | null | false | undefined>, tries = 80): Promise<T | null> => {
  for (let i = 0; i < tries; i++) {
    const v = await fn();
    if (v) return v;
    await Bun.sleep(250);
  }
  return null;
};

try {
  const frontend = await poll(async () => (await targets()).find((t) => t.url.startsWith("devtools://devtools/") && t.webSocketDebuggerUrl));
  if (!frontend) throw new Error("DevTools frontend did not open");
  console.log("  ✓ DevTools frontend opened");
  const devtoolsPage = await poll(async () => (await targets()).some((t) => t.url.endsWith("/devtools.html")));
  console.log(devtoolsPage ? "  ✓ extension devtools.html loaded" : "  ✗ devtools.html missing");
  const clicked = await poll(async () => (await evaluate(frontend.webSocketDebuggerUrl!, CLICK_TAB)) === true);
  if (!clicked) {
    const dt = (await targets()).find((t) => t.url.endsWith("/devtools.html"));
    if (dt?.webSocketDebuggerUrl) console.log("  detect:", await evaluate(dt.webSocketDebuggerUrl, `new Promise(r => chrome.devtools.inspectedWindow.eval(${JSON.stringify("!!(window.__TEXTJS_DEVTOOLS_HOOK__ && window.__TEXTJS_DEVTOOLS_HOOK__.roots.size > 0)")}, (v, e) => r(JSON.stringify([v, e]))))`));
    console.log("  tabs:", await evaluate(frontend.webSocketDebuggerUrl!, `(() => { const out = []; const walk = (r) => { for (const el of r.querySelectorAll("*")) { if (el.getAttribute("role") === "tab") out.push(el.textContent.trim()); if (el.shadowRoot) walk(el.shadowRoot); } }; walk(document); return out.join(" | "); })()`));
    throw new Error("Text.js panel tab never appeared");
  }
  console.log('  ✓ "Text.js" panel tab created next to Console');
  const panel = await poll(async () => (await targets()).find((t) => t.url.includes("/panel.html") && t.webSocketDebuggerUrl));
  if (!panel) throw new Error("panel.html did not load");
  const state = (await poll(async () => {
    const s = (await evaluate(panel.webSocketDebuggerUrl!, `(() => { const s = globalThis.__textjsPanel?.get(); return s && s.roots.length && s.tree ? { roots: s.roots.length, name: s.roots[0].name, nodes: s.tree.nodes.length } : null })()`)) as { roots: number; name: string; nodes: number } | null;
    return s;
  })) as { roots: number; name: string; nodes: number } | null;
  if (!state) throw new Error("panel never received roots/tree");
  console.log(`  ✓ panel inside real DevTools received ${state.roots} root (${state.name}) and a ${state.nodes}-node tree`);
  if (shots) {
    await Bun.sleep(800);
    const { data } = await cdp(frontend.webSocketDebuggerUrl!, "Page.captureScreenshot", { format: "png" });
    mkdirSync(join(ROOT, "harness/shots"), { recursive: true });
    writeFileSync(join(ROOT, "harness/shots/real-devtools.png"), Buffer.from(data, "base64"));
    console.log("  · wrote harness/shots/real-devtools.png");
  }
  console.log("\n✓ real DevTools probe passed");
} catch (error) {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  for (const t of await targets()) console.log(`  ${t.type.padEnd(16)} ${t.url.slice(0, 110)}`);
  process.exitCode = 1;
} finally {
  chrome.kill();
  server.kill();
  await Bun.sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
