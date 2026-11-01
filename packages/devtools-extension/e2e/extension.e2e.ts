/**
 * End-to-end: load the unpacked extension into Playwright's Chromium, open
 * `examples/dashboard` under `text dev`, and drive the panel (opened as an
 * extension page with `?tabId=`) through the real page → content script →
 * service worker → panel path.
 *
 *   bun e2e/extension.e2e.ts [--headed] [--record]
 *
 * `--record` also writes `harness/fixture.json` (snapshots for the harness) and
 * panel screenshots to `harness/shots/`.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { build } from "../scripts/build";
import { resolveChromium } from "../scripts/chromium";

const ROOT = resolve(import.meta.dir, "..");
const REPO = resolve(ROOT, "../..");
const headed = process.argv.includes("--headed");
const record = process.argv.includes("--record");

function freePort(): Promise<number> {
  return new Promise((res, rej) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const a = s.address();
      s.close(() => (typeof a === "object" && a ? res(a.port) : rej(new Error("no port"))));
    });
  });
}

async function waitFor<T>(label: string, fn: () => Promise<T | null | undefined | false>, timeout = 15_000): Promise<T> {
  const t0 = Date.now();
  let last: unknown;
  while (Date.now() - t0 < timeout) {
    try {
      const v = await fn();
      if (v) return v as T;
    } catch (e) {
      last = e;
    }
    await Bun.sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}${last ? `: ${String(last)}` : ""}`);
}

let passed = 0;
function check(label: string, ok: unknown): void {
  if (!ok) throw new Error(`✗ ${label}`);
  passed++;
  console.log(`  ✓ ${label}`);
}

let server: ChildProcess | null = null;
const userDataDir = mkdtempSync(join(tmpdir(), "textjs-devtools-e2e-"));
let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null;

if (record) mkdirSync(join(ROOT, "harness/shots"), { recursive: true });

try {
  const { dist } = await build({ zip: false, introspect: true });
  const port = await freePort();
  server = spawn("bun", [join(REPO, "packages/app/bin/text.ts"), "dev", "--port", String(port)], {
    cwd: join(REPO, "examples/dashboard"),
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = `http://localhost:${port}/`;
  await waitFor("dev server", async () => (await fetch(url)).ok, 30_000);

  context = await chromium.launchPersistentContext(userDataDir, {
    executablePath: resolveChromium(),
    headless: !headed,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`, "--no-first-run"],
  });
  const sw = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const extensionId = new URL(sw.url()).host;
  console.log(`▼ extension ${extensionId} · ${url}`);

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(url);

  // 1. Hook installed in the MAIN world before the app booted; the root registered.
  const roots = await waitFor<number>("root registration", () => page.evaluate(() => (globalThis as any).__TEXTJS_DEVTOOLS_HOOK__?.roots.size ?? 0));
  check(`page hook has ${roots} console root(s)`, roots >= 1);
  check("hook idle until a panel attaches", (await page.evaluate(() => (globalThis as any).__TEXTJS_DEVTOOLS_HOOK__.active)) === false);

  // 2. Content script connected to the service worker for this tab.
  const tab = await waitFor("content port", async () => {
    const pages = (await sw.evaluate(() => (globalThis as any).__textjsDevtools.pages())) as Array<{ tabId: number; url: string }>;
    return pages.find((p) => p.url?.startsWith(url));
  });
  check(`service worker paired tab ${tab.tabId}`, typeof tab.tabId === "number");

  // 3. Panel attaches → page goes active → roots arrive.
  const panel = await context.newPage();
  await panel.setViewportSize({ width: 1100, height: 620 });
  await panel.goto(`chrome-extension://${extensionId}/panel.html?tabId=${tab.tabId}`);
  await waitFor("panel roots", () => panel.evaluate(() => (globalThis as any).__textjsPanel.get().roots.length > 0));
  check("hook active while the panel is open", await page.evaluate(() => (globalThis as any).__TEXTJS_DEVTOOLS_HOOK__.active));
  await page.bringToFront();

  // 4. Component tree.
  await waitFor("tree", () => panel.evaluate(() => ((globalThis as any).__textjsPanel.get().tree?.nodes.length ?? 0) > 10));
  const names = (await panel.evaluate(() => (globalThis as any).__textjsPanel.get().tree.nodes.map((n: any) => n.name))) as string[];
  check(`tree has ${names.length} nodes incl. RootShell, tx-box, tx-text`, names.includes("RootShell") && names.includes("tx-box") && names.includes("tx-text"));
  const rowCount = await panel.locator(".tree .row").count();
  check(`tree renders ${rowCount} rows`, rowCount > 10);

  // 5. Interaction in the app → frames with commits stream to the timeline.
  const before = (await panel.evaluate(() => (globalThis as any).__textjsPanel.get().records.length)) as number;
  await page.evaluate(() => (globalThis as any).document.body.click());
  for (const key of ["2", "1", "Tab", "Tab"]) {
    await page.keyboard.press(key);
    await Bun.sleep(150);
  }
  const records = await waitFor("frame records", async () => {
    const r = (await panel.evaluate(() => (globalThis as any).__textjsPanel.get().records)) as Array<{ skipped: boolean; commits: number; totalMs: number }>;
    return r.length > before && r.some((x) => !x.skipped && x.commits > 0) ? r : null;
  });
  check(`timeline received ${records.length} frame records (${records.filter((r) => !r.skipped).length} emitted)`, true);

  // 6. Select a node in the tree → highlighted in the live console renderer.
  await panel.locator(".tree .row.kind-host").nth(3).click();
  const highlighted = await waitFor("highlight", () => page.evaluate(() => (globalThis as any).text?.renderer?.highlighted?.id ?? null));
  const selectedScene = await panel.evaluate(() => {
    const s = (globalThis as any).__textjsPanel;
    return s.sceneFor(s.get().selected);
  });
  check(`selecting tree node highlights scene #${highlighted} in the console`, highlighted === selectedScene);
  if (record) await panel.screenshot({ path: join(ROOT, "harness/shots/live-components.png") });

  // 7. Frame inspector: hover reports the painting node, click selects it.
  await panel.locator('.tab:has-text("Frame")').click();
  await panel.locator(".frame-grid").waitFor();
  const box = (await panel.locator(".frame-grid").boundingBox())!;
  await panel.mouse.move(box.x + 30, box.y + 21);
  await panel.locator('h3:has-text("Painted by")').waitFor();
  check("frame inspector shows the node under the cursor", (await panel.locator(".inspector .chain li").count()) > 0);
  await panel.mouse.click(box.x + 30, box.y + 21);
  check("clicking a cell selects its node", (await panel.evaluate(() => (globalThis as any).__textjsPanel.get().selected)) !== null);
  if (record) await panel.screenshot({ path: join(ROOT, "harness/shots/live-frame.png") });

  // 8. Controls.
  await panel.locator('button[aria-label="Wireframe"]').click();
  check("wireframe toggles in the page", await waitFor("wireframe", () => page.evaluate(() => (globalThis as any).text.renderer.wireframe === true)));
  await panel.locator('button[aria-label="Wireframe"]').click();
  await panel.locator('button[aria-label="Pause"]').click();
  check("pause freezes the renderer", await waitFor("pause", () => page.evaluate(() => (globalThis as any).text.renderer.paused === true)));
  await panel.locator('button[aria-label="Resume"]').click();
  check("resume", await waitFor("resume", () => page.evaluate(() => (globalThis as any).text.renderer.paused === false)));
  await panel.locator(".chip").click();
  await panel.locator('.popover input').first().fill("90");
  await panel.locator('.popover input').nth(1).fill("28");
  await panel.locator('.popover button[type="submit"]').click();
  check("resize pins the grid", await waitFor("resize", () => page.evaluate(() => (globalThis as any).text.stats().cols === 90 && (globalThis as any).text.stats().rows === 28)));
  // Controls on a paused root repaint the buffer (no console output) instead of leaving it blank.
  await panel.evaluate(() => (globalThis as any).__textjsPanel.togglePause());
  await waitFor("paused", () => page.evaluate(() => (globalThis as any).text.renderer.paused === true));
  await panel.evaluate(() => (globalThis as any).__textjsPanel.resize(84, 26));
  const pausedText = await waitFor("paused resize", () =>
    page.evaluate(() => {
      const t = (globalThis as any).text;
      return t.stats().cols === 84 ? (t.renderer.buffer.toPlainString(true) as string) : null;
    }),
  );
  check("resize while paused repaints the frozen buffer", pausedText.trim().length > 0);
  await panel.evaluate(() => (globalThis as any).__textjsPanel.togglePause());
  await waitFor("resumed", () => page.evaluate(() => (globalThis as any).text.renderer.paused === false));
  await panel.evaluate(() => (globalThis as any).__textjsPanel.resize(90, 28));
  await waitFor("resize back", () => page.evaluate(() => (globalThis as any).text.stats().cols === 90));

  await panel.locator('button[aria-label="Copy frame"]').click();
  await panel.locator('.toast:has-text("Copied")').waitFor();
  check("copy frame", true);

  await panel.locator('.tab:has-text("Timeline")').click();
  await panel.locator(".chart-svg").first().waitFor();
  check("timeline charts render", (await panel.locator(".chart-svg").count()) === 3);

  if (record) {
    // A few seconds of real activity for the harness timeline, with no highlight baked into the frame.
    await panel.evaluate(() => {
      const s = (globalThis as any).__textjsPanel;
      s.select(null);
      s.fit();
    });
    await page.bringToFront();
    for (let i = 0; i < 24; i++) {
      await page.keyboard.press(["1", "2", "3", "4", "Tab", "Tab"][i % 6]!);
      await Bun.sleep(180);
    }
    await page.keyboard.press("1");
    await Bun.sleep(600);
    await panel.bringToFront();
    await panel.screenshot({ path: join(ROOT, "harness/shots/live-timeline.png") });
    await panel.locator('.tab:has-text("Components")').click();
    const fixture = await panel.evaluate(async () => {
      const s = (globalThis as any).__textjsPanel;
      const st = s.get();
      return {
        roots: st.roots,
        tree: await s.transport.request("tree", st.rootId),
        frame: await s.transport.request("frame", st.rootId),
        records: st.records,
      };
    });
    writeFileSync(join(ROOT, "harness/fixture.json"), `${JSON.stringify(fixture)}\n`);
    console.log("  · wrote harness/fixture.json");
  }

  // 9. DevTools hiding the panel (onHidden → visibility event) detaches; showing re-attaches.
  const setVisible = (visible: boolean) =>
    panel.evaluate((v) => window.dispatchEvent(new CustomEvent("textjs-devtools-visibility", { detail: v })), visible);
  await setVisible(false);
  check("hiding the panel deactivates the hook", await waitFor("hidden detach", () => page.evaluate(() => (globalThis as any).__TEXTJS_DEVTOOLS_HOOK__.active === false)));
  check("hidden panel leaves the worker unpaired", await waitFor("unpaired", async () => ((await sw.evaluate(() => (globalThis as any).__textjsDevtools.panels())) as number[]).length === 0));
  await setVisible(true);
  check("showing the panel re-attaches", await waitFor("shown attach", () => page.evaluate(() => (globalThis as any).__TEXTJS_DEVTOOLS_HOOK__.active === true)));
  await waitFor("roots after show", () => panel.evaluate(() => (globalThis as any).__textjsPanel.get().roots.length > 0));

  // 10. Closing the panel detaches: the page stops streaming.
  await panel.close();
  check("closing the panel deactivates the hook", await waitFor("detach", () => page.evaluate(() => (globalThis as any).__TEXTJS_DEVTOOLS_HOOK__.active === false)));

  console.log(`\n${passed} checks passed`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await context?.close().catch(() => undefined);
  server?.kill();
  rmSync(userDataDir, { recursive: true, force: true });
}

process.exit(process.exitCode ?? 0);
