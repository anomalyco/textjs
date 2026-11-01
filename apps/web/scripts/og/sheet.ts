/**
 * Labelled contact sheets of rendered images, for review.
 *
 *   bun scripts/og/sheet.ts <out.png> <columns> <tile width> <image>… [--label=<text>]…
 *
 * Images are laid out in order; each is captioned with its file name unless a `--label` is given
 * for it (labels pair with images by position).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { chromium } from "playwright-core";
import { BASE_CSS, CHROMIUM_ARGS, escapeHtml, OG_FONTS, OG_ORIGIN } from "./template";

const WEB_DIR = new URL("../..", import.meta.url).pathname;

export interface SheetItem {
  file: string;
  label: string;
}

export async function contactSheet(out: string, items: readonly SheetItem[], columns: number, tileWidth: number, title = ""): Promise<void> {
  for (const it of items) if (!existsSync(it.file)) throw new Error(`sheet: ${it.file} not found`);
  const gap = 32;
  const width = columns * tileWidth + (columns + 1) * gap;
  const tiles = items
    .map((it, i) => `<figure><img src="/img/${i}${extname(it.file)}"><figcaption>${escapeHtml(it.label)}</figcaption></figure>`)
    .join("");
  const html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
    html, body { width: ${width}px; height: auto; overflow: visible; background: #0a0a0a; }
    .sheet { padding: ${gap}px; display: grid; grid-template-columns: repeat(${columns}, ${tileWidth}px); gap: ${gap}px; }
    h1 { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; color: #ededed; padding: ${gap}px ${gap}px 0; }
    figure { display: flex; flex-direction: column; gap: 12px; }
    img { width: ${tileWidth}px; height: auto; display: block; border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; }
    figcaption { font-family: "Geist Mono", "Geist Mono OG"; font-size: 18px; color: #a1a1a1; }
  </style>${title ? `<h1>${escapeHtml(title)}</h1>` : ""}<div class="sheet">${tiles}</div>`;
  const browser = await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
  try {
    const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== OG_ORIGIN) return route.abort();
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: html });
      const font = OG_FONTS[url.pathname];
      if (font) return route.fulfill({ contentType: "font/woff2", body: readFileSync(`${WEB_DIR}/${font}`) });
      const m = /^\/img\/(\d+)/.exec(url.pathname);
      const item = m ? items[Number(m[1])] : undefined;
      if (!item) return route.abort();
      return route.fulfill({ contentType: extname(item.file) === ".jpg" ? "image/jpeg" : "image/png", body: readFileSync(item.file) });
    });
    await page.goto(`${OG_ORIGIN}/`, { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map((i) => i.decode()));
    });
    writeFileSync(out, await page.screenshot({ fullPage: true, type: "png" }));
  } finally {
    await browser.close();
  }
}

if (import.meta.main) {
  const [out, cols, tile, ...rest] = process.argv.slice(2);
  const labels = rest.filter((a) => a.startsWith("--label=")).map((a) => a.slice(8));
  const files = rest.filter((a) => !a.startsWith("--"));
  if (!out || !cols || !tile || files.length === 0) throw new Error("usage: bun scripts/og/sheet.ts <out.png> <columns> <tile width> <image>…");
  await contactSheet(out, files.map((file, i) => ({ file, label: labels[i] ?? basename(file) })), Number(cols), Number(tile));
  console.log(out);
}
