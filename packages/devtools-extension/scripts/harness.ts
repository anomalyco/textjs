/**
 * Renders the panel UI against `harness/fixture.json` and screenshots each view.
 *
 *   bun scripts/harness.ts            # build harness/dist and take screenshots → harness/shots/
 *   bun scripts/harness.ts --serve    # build and serve on http://127.0.0.1:4320/
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveChromium } from "./chromium";

const ROOT = resolve(import.meta.dir, "..");
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

/** Map a URL path to a file inside `harness/dist`, or `null` if it would escape it. */
export function resolveServed(pathname: string, root = OUT): string | null {
  let rel: string;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (rel.includes("\0")) return null;
  const base = resolve(root);
  const file = resolve(base, `.${rel === "/" ? "/index.html" : rel}`);
  return file.startsWith(base + sep) ? file : null;
}

async function main(): Promise<void> {
  await buildHarness();

  if (process.argv.includes("--serve")) {
    const server = Bun.serve({
      port: 4320,
      hostname: "127.0.0.1",
      async fetch(req) {
        const file = resolveServed(new URL(req.url).pathname);
        if (file === null || !(await Bun.file(file).exists())) return new Response("Not found", { status: 404 });
        return new Response(Bun.file(file));
      },
    });
    console.log(`▼ harness on http://127.0.0.1:${server.port}/`);
  } else {
    const { chromium } = await import("playwright-core");
    mkdirSync(SHOTS, { recursive: true });
    const browser = await chromium.launch({ executablePath: resolveChromium() });
    const url = pathToFileURL(join(OUT, "index.html")).href;
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
}

if (import.meta.main) await main();
