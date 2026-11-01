/**
 * Side-by-side PNGs: the ssh capture (parity/ssh/) next to this port (parity/ours/), cell
 * colors and all, rendered in headless Chromium.
 *
 *   bun parity/compare.ts && bun parity/render.ts      # writes parity/<shot>.png
 *
 * PLAYWRIGHT points at playwright-core (default: bench/devtools' copy).
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Grid } from "./grid";
import { SHOTS, shotId } from "./shots";

const dir = (p: string): string => new URL(p, import.meta.url).pathname;
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function gridHtml(g: Grid): string {
  const rows = g.cells.map((row) => {
    let html = "";
    for (const [ch, fg, bg, bold] of row) {
      const style = `color:${fg ?? "#c8c8c8"};background:${bg ?? "#000"};${bold ? "font-weight:700;" : ""}`;
      html += `<span style="${style}">${esc(ch)}</span>`;
    }
    return `<div class="row">${html}</div>`;
  });
  return `<div class="grid" style="width:${g.cols}ch;height:${g.rows * 1.25}em">${rows.join("")}</div>`;
}

function page(title: string, panes: Array<{ label: string; grid: Grid }>): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;background:#111;color:#ddd;font:13px/1.25 Menlo,"DejaVu Sans Mono",monospace;padding:16px;display:inline-block}
    h1{font:600 14px system-ui,sans-serif;margin:0 0 10px}
    .panes{display:flex;gap:24px;align-items:flex-start}
    .label{font:12px system-ui,sans-serif;color:#999;margin-bottom:6px}
    .grid{background:#000;outline:1px solid #333;overflow:hidden;white-space:pre}
    .row{height:1.25em;white-space:pre}
  </style></head><body><h1>${esc(title)}</h1><div class="panes">${panes
    .map((p) => `<div><div class="label">${esc(p.label)}</div>${gridHtml(p.grid)}</div>`)
    .join("")}</div></body></html>`;
}

function chromiumPath(): string | undefined {
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (!existsSync(cache)) return undefined;
  for (const d of readdirSync(cache).filter((x) => x.startsWith("chromium-")).sort().reverse()) {
    for (const app of ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium"]) {
      const p = join(cache, d, app);
      if (existsSync(p)) return p;
    }
  }
  return undefined;
}

const pw = (await import(process.env.PLAYWRIGHT ?? dir("../../../bench/devtools/node_modules/playwright-core/index.mjs"))) as { chromium: { launch(o: object): Promise<any> } };
const browser = await pw.chromium.launch({ headless: true, executablePath: chromiumPath() });
const tab = await browser.newPage({ deviceScaleFactor: 2 });
// Only local content: nothing leaves this page.
await tab.route(() => true, (r: { abort(): Promise<void> }) => r.abort());
const only = process.argv.slice(2);
const ids = new Set([...SHOTS.map(shotId), ...readdirSync(dir("./ours")).map((f) => f.replace(/\.json$/, ""))]);
for (const id of ids) {
  if (only.length && !only.some((o) => id.startsWith(o))) continue;
  const oursFile = dir(`./ours/${id}.json`);
  if (!existsSync(oursFile)) continue;
  const sshFile = dir(`./ssh/${id}.json`);
  const ours = JSON.parse(readFileSync(oursFile, "utf8")) as Grid;
  const panes = existsSync(sshFile) ? [{ label: "ssh terminal.shop", grid: JSON.parse(readFileSync(sshFile, "utf8")) as Grid }, { label: "Text.js (console)", grid: ours }] : [{ label: "Text.js (console), not in the ssh shop", grid: ours }];
  await tab.setContent(page(`${id.replace(/-(\d+x\d+)$/, " · $1")}`, panes));
  const body = await tab.$("body");
  writeFileSync(dir(`./${id}.png`), await body.screenshot());
  console.log(`▸ parity/${id}.png`);
}
await browser.close();
