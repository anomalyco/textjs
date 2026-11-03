/**
 * Renders Open Graph cards to `dist/og/<slug>.png` (`.jpg` for product photos) with headless
 * Chromium. Each image is cached under `.cache/og/` by a hash of everything that goes into it
 * (the card data, its photo, the fonts and these scripts), so a build only launches a browser
 * for cards that changed.
 */

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, utimesSync, writeFileSync } from "node:fs";
import { extname, isAbsolute, join } from "node:path";
import type { Browser, Page } from "playwright-core";
import { OG_HEIGHT, OG_WIDTH, type OgCard } from "../../src/og";
import { optimizePng } from "./png";
import { CHROMIUM_ARGS, cardHtml, documentHtml, drawn, LOCKUP_SVG, OG_FONTS, OG_ORIGIN } from "./template";

export interface OgImage {
  /** Site path of the image, with a content version (`/og/docs-routing.png?v=…`). */
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface RenderStats {
  cards: number;
  rendered: number;
  cached: number;
  bytes: number;
  ms: number;
}

const WEB_DIR = join(import.meta.dirname, "..", "..");
const PAGES = 4;
/** Unused cache entries are kept this long, so switching branches doesn't re-render everything. */
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const sha = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");

/** Hash of the renderer itself: these scripts, every font file, the lockup (it lives in the site's logo menu) and the card size. */
function rendererHash(): string {
  const parts = ["template.ts", "render.ts", "png.ts"].map((f) => readFileSync(join(import.meta.dirname, f)));
  for (const file of Object.values(OG_FONTS)) parts.push(readFileSync(join(WEB_DIR, file)));
  parts.push(Buffer.from(`${OG_WIDTH}x${OG_HEIGHT}\n${LOCKUP_SVG}`));
  return sha(Buffer.concat(parts));
}

interface Job {
  card: OgCard;
  key: string;
  ext: "png" | "jpg";
  cacheFile: string;
  /** URL path → file, for the request router. */
  files: Map<string, string>;
}

/** Resolves a card's photo (`/assets/…` from the Vite build, or a file path under `bun test`) to a file. */
function photoFile(photo: string, distDir: string): string {
  const file = isAbsolute(photo) && existsSync(photo) ? photo : join(distDir, photo.replace(/^\//, ""));
  if (!existsSync(file)) throw new Error(`og: photo ${photo} not found (looked for ${file})`);
  return file;
}

async function launch(): Promise<Browser | null> {
  try {
    const { chromium } = await import("playwright-core");
    return await chromium.launch({ headless: true, args: CHROMIUM_ARGS });
  } catch (err) {
    console.warn(`og: Chromium is unavailable (${(err as Error).message.split("\n")[0]}). Cards without a cached image use /og.png.`);
    return null;
  }
}

async function openPage(browser: Browser, files: Map<string, string>): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: OG_WIDTH, height: OG_HEIGHT }, deviceScaleFactor: 1 });
  // Serve fonts and photos from disk; every other request (including localhost) is refused.
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === OG_ORIGIN && url.pathname === "/") return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: documentHtml() });
    const file = url.origin === OG_ORIGIN ? files.get(url.pathname) : undefined;
    if (!file) return route.abort();
    const type = extname(file) === ".woff2" ? "font/woff2" : extname(file) === ".webp" ? "image/webp" : extname(file) === ".png" ? "image/png" : "image/jpeg";
    return route.fulfill({ status: 200, contentType: type, body: readFileSync(file) });
  });
  await page.goto(`${OG_ORIGIN}/`, { waitUntil: "load" });
  return page;
}

async function shoot(page: Page, job: Job): Promise<Buffer> {
  await page.evaluate((html) => {
    document.body.innerHTML = html;
  }, cardHtml(job.card));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((img) => img.decode()));
  });
  const overflow = await page.evaluate(() => (window as unknown as { __fit(): string[] }).__fit());
  if (overflow.length) throw new Error(`og: ${job.card.path} overflows its card: ${overflow.join("; ")}`);
  if (job.ext === "jpg") return page.screenshot({ type: "jpeg", quality: 86 });
  return optimizePng(await page.screenshot({ type: "png" }));
}

/** The characters on the current card, grouped by the `font-family` they're set in. */
function glyphsByFamily(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const out: Record<string, Set<string>> = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const family = getComputedStyle(n.parentElement as Element).fontFamily;
      const set = (out[family] ??= new Set());
      for (const ch of n.textContent ?? "") if (ch.trim()) set.add(ch);
    }
    return Object.fromEntries(Object.entries(out).map(([f, s]) => [f, [...s].join("")]));
  });
}

/**
 * Every glyph on the rendered cards must come from the bundled fonts: a system fallback would
 * look different on another machine. Checks each character in the font stack it was set in.
 */
async function checkGlyphs(page: Page, glyphs: Map<string, Set<string>>): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  /** Whether every character in `text` is drawn from a bundled font when set in `family`. */
  const bundled = async (family: string, text: string): Promise<{ ok: boolean; fonts: string[] }> => {
    await page.evaluate(
      ({ text, family }) => {
        const span = document.createElement("span");
        span.id = "g";
        span.style.fontFamily = family;
        span.textContent = text;
        document.body.replaceChildren(span);
        return document.fonts.ready;
      },
      { text, family },
    );
    const { root } = await cdp.send("DOM.getDocument");
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "#g" });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    return { ok: !fonts.some((f) => !f.isCustomFont), fonts: fonts.map((f) => f.familyName) };
  };
  const bad: string[] = [];
  // One span per family; only a failing set is split in halves to find the characters at fault.
  const find = async (family: string, chars: string[]): Promise<void> => {
    const result = await bundled(family, chars.join(""));
    if (result.ok) return;
    if (chars.length === 1) {
      const ch = chars[0] as string;
      bad.push(`${ch} U+${ch.codePointAt(0)?.toString(16).toUpperCase()} in ${family} → ${result.fonts.join(", ")}`);
      return;
    }
    const half = Math.ceil(chars.length / 2);
    await find(family, chars.slice(0, half));
    await find(family, chars.slice(half));
  };
  for (const [family, chars] of glyphs) await find(family, [...chars]);
  await cdp.detach();
  if (bad.length) throw new Error(`og: these characters fall back to system fonts; add them to scripts/og/fonts:\n  ${bad.join("\n  ")}`);
}

/** Renders (or reuses) one image per card and copies them to `dist/og/`. Returns image meta by route path. */
export async function renderOgImages(cards: readonly OgCard[], distDir: string, cacheDir = join(WEB_DIR, ".cache", "og")): Promise<{ images: Map<string, OgImage>; stats: RenderStats }> {
  const started = performance.now();
  mkdirSync(cacheDir, { recursive: true });
  const outDir = join(distDir, "og");
  mkdirSync(outDir, { recursive: true });

  const fonts = new Map(Object.entries(OG_FONTS).map(([url, file]) => [url, join(WEB_DIR, file)]));
  const renderer = rendererHash();
  const slugs = new Set<string>();
  const jobs: Job[] = cards.map((original) => {
    if (slugs.has(original.slug)) throw new Error(`og: two cards share the slug ${original.slug}`);
    slugs.add(original.slug);
    const files = new Map(fonts);
    let card = original;
    let photoHash = "";
    if (card.photo) {
      const file = photoFile(card.photo, distDir);
      photoHash = sha(readFileSync(file));
      const url = `/photo/${photoHash.slice(0, 16)}${extname(file)}`;
      files.set(url, file);
      card = { ...card, photo: url.slice(1) };
    }
    // Only what's drawn: the alt text, the route and fields the template leaves out don't change a pixel.
    const key = sha(`${renderer}\n${photoHash}\n${JSON.stringify(drawn(card))}`).slice(0, 20);
    const ext = card.photo ? "jpg" : "png";
    return { card, key, ext, cacheFile: join(cacheDir, `${key}.${ext}`), files };
  });

  const misses = jobs.filter((j) => !existsSync(j.cacheFile));
  let rendered = 0;
  const failed = new Set<Job>();
  if (misses.length) {
    const browser = await launch();
    if (!browser) for (const j of misses) failed.add(j);
    else {
      try {
        const allFiles = new Map<string, string>();
        for (const j of misses) for (const [u, f] of j.files) allFiles.set(u, f);
        const pages = await Promise.all(Array.from({ length: Math.min(PAGES, misses.length) }, () => openPage(browser, allFiles)));
        let next = 0;
        const glyphs = new Map<string, Set<string>>();
        await Promise.all(
          pages.map(async (page) => {
            for (let j = misses[next++]; j; j = misses[next++]) {
              writeFileSync(j.cacheFile, await shoot(page, j));
              for (const [family, chars] of Object.entries(await glyphsByFamily(page))) {
                const set = glyphs.get(family) ?? new Set<string>();
                for (const ch of chars) set.add(ch);
                glyphs.set(family, set);
              }
              rendered++;
            }
          }),
        );
        await checkGlyphs(pages[0] as Page, glyphs);
      } catch (err) {
        // A half-written run must not leave images that skipped the glyph check in the cache.
        for (const j of misses) if (existsSync(j.cacheFile)) unlinkSync(j.cacheFile);
        throw err;
      } finally {
        await browser.close();
      }
    }
  }

  const images = new Map<string, OgImage>();
  let bytes = 0;
  const now = new Date();
  for (const j of jobs) {
    if (failed.has(j)) {
      images.set(j.card.path, { url: "/og.png", width: OG_WIDTH, height: OG_HEIGHT, alt: j.card.alt });
      continue;
    }
    const name = `${j.card.slug}.${j.ext}`;
    copyFileSync(j.cacheFile, join(outDir, name));
    utimesSync(j.cacheFile, now, now);
    bytes += statSync(j.cacheFile).size;
    images.set(j.card.path, { url: `/og/${name}?v=${j.key.slice(0, 8)}`, width: OG_WIDTH, height: OG_HEIGHT, alt: j.card.alt });
  }

  const used = new Set(jobs.map((j) => j.cacheFile));
  for (const f of readdirSync(cacheDir)) {
    const file = join(cacheDir, f);
    if (!used.has(file) && now.getTime() - statSync(file).mtimeMs > CACHE_TTL_MS) unlinkSync(file);
  }

  return { images, stats: { cards: jobs.length, rendered, cached: jobs.length - misses.length, bytes, ms: Math.round(performance.now() - started) } };
}
