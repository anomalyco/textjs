/**
 * Store screenshots at 1440 and 390 wide against a running preview (`bun run preview -- --port 4173`).
 *   BASE=http://localhost:4173 bun scripts/shots.ts [route…]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const base = process.env.BASE ?? "http://localhost:4173";
const out = join(import.meta.dir, "..", "screenshots");
mkdirSync(out, { recursive: true });
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/merch", "/merch/frame-tee", "/merch/cap"];
const full = process.env.FULL === "1";

const browser = await chromium.launch({ headless: true });
for (const [w, h, scale] of [
  [1440, 900, 1],
  [390, 844, 2],
] as const) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, isMobile: w < 500, hasTouch: w < 500 });
  for (const r of routes) {
    const page = await context.newPage();
    await page.goto(`${base}${r}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (const img of Array.from(document.images)) img.loading = "eager";
      await Promise.all(Array.from(document.images).map((i) => i.decode().catch(() => undefined)));
    });
    const name = `${r === "/" ? "home" : r.slice(1).replace(/\//g, "_")}-${w}${full ? "-full" : ""}.png`;
    writeFileSync(join(out, name), await page.screenshot({ fullPage: full }));
    console.log(`shot ${name}`);
    await page.close();
  }
  await context.close();
}
await browser.close();
