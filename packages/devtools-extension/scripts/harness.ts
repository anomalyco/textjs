/**
 * Renders the panel UI against `harness/fixture.json` and screenshots each view.
 *
 *   bun scripts/harness.ts            # build harness/dist and take screenshots → harness/shots/
 *   bun scripts/harness.ts --serve    # build and serve on http://localhost:4320/
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const REPO = resolve(ROOT, "../..");
const OUT = join(ROOT, "harness/dist");
const SHOTS = join(ROOT, "harness/shots");

async function buildHarness(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const result = await Bun.build({
    entrypoints: [join(ROOT, "harness/harness.tsx")],
    target: "browser",
    format: "iife",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  if (!result.success) throw new AggregateError(result.logs, "harness build failed");
  writeFileSync(join(OUT, "harness.js"), await result.outputs[0]!.text());
  writeFileSync(join(OUT, "panel.css"), readFileSync(join(ROOT, "static/panel.css")));
  writeFileSync(
    join(OUT, "index.html"),
    readFileSync(join(ROOT, "static/panel.html"), "utf8").replace("panel.js", "harness.js").replace("<title>Text.js</title>", "<title>Text.js DevTools · harness</title>"),
  );
}

function findChromium(): string | undefined {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  for (const d of readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
    const p = join(cache, d, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (existsSync(p)) return p;
  }
  return undefined;
}

await buildHarness();

if (process.argv.includes("--serve")) {
  const server = Bun.serve({
    port: 4320,
    fetch(req) {
      const path = new URL(req.url).pathname;
      const file = Bun.file(join(OUT, path === "/" ? "index.html" : path.slice(1)));
      return new Response(file);
    },
  });
  console.log(`▼ harness on http://localhost:${server.port}/`);
} else {
  const { chromium } = (await import(join(REPO, "bench/devtools/node_modules/playwright-core/index.mjs"))) as typeof import("playwright-core");
  mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch({ executablePath: findChromium() });
  const url = `file://${join(OUT, "index.html")}`;
  const views: Array<{ name: string; query: string; width: number; height: number; act?: (page: import("playwright-core").Page) => Promise<void> }> = [
    { name: "components", query: "tab=components&select=Metric", width: 1100, height: 620 },
    {
      name: "frame",
      query: "tab=frame",
      width: 1100,
      height: 620,
      act: async (page) => {
        const box = (await page.locator(".frame-grid").boundingBox())!;
        await page.mouse.move(box.x + 7.22 * 40, box.y + 14 * 4 + 7);
      },
    },
    {
      name: "timeline",
      query: "tab=timeline",
      width: 1100,
      height: 620,
      act: async (page) => {
        const svg = (await page.locator(".chart-svg").first().boundingBox())!;
        await page.mouse.move(svg.x + svg.width - 40, svg.y + svg.height - 10);
      },
    },
    { name: "components-narrow", query: "tab=components&select=Metric", width: 560, height: 700 },
    { name: "timeline-narrow", query: "tab=timeline", width: 560, height: 700 },
  ];
  for (const v of views) {
    const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: 2 });
    await page.goto(`${url}?${v.query}`);
    await page.locator(".toolbar").waitFor();
    await page.waitForTimeout(150);
    await v.act?.(page);
    await page.waitForTimeout(100);
    await page.screenshot({ path: join(SHOTS, `${v.name}.png`) });
    console.log(`  harness/shots/${v.name}.png`);
    await page.close();
  }
  await browser.close();
}
