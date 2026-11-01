import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NOT_FOUND_PATH, ROUTES } from "../src/entry-server";
import { OG_HEIGHT, OG_WIDTH, ogCards, ogSlug } from "../src/og";
import { cardHtml, drawn, escapeHtml } from "../scripts/og/template";

const ROOT = join(import.meta.dir, "..");

/** Width and height from a PNG's IHDR or a JPEG's SOF marker. */
function imageSize(buf: Buffer): { type: "png" | "jpeg"; width: number; height: number } {
  if (buf.readUInt32BE(0) === 0x89504e47) return { type: "png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length; ) {
      const marker = buf[i + 1] as number;
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { type: "jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  throw new Error("not a PNG or JPEG");
}

function meta(html: string, attr: "property" | "name", key: string): string | undefined {
  return new RegExp(`<meta\\s+${attr}="${key.replace(/[:]/g, "\\:")}"\\s+content="([^"]*)"`).exec(html)?.[1];
}

describe("Open Graph cards", () => {
  test("every route and the 404 page has a card with a unique slug, a title and alt text", async () => {
    const cards = await ogCards(ROUTES, NOT_FOUND_PATH);
    expect(cards.map((c) => c.path)).toEqual([...ROUTES.map((r) => r.path), NOT_FOUND_PATH]);
    expect(new Set(cards.map((c) => c.slug)).size).toBe(cards.length);
    for (const c of cards) {
      expect(c.title.length).toBeGreaterThan(0);
      expect(c.title).not.toContain("| Text.js");
      expect(c.alt).toContain("Text.js");
      expect(c.title).not.toContain("▲");
    }
    expect(ogSlug("/")).toBe("home");
    expect(ogSlug("/docs/routing")).toBe("docs-routing");
  });

  test("each card draws the mark, at most one label and the title, plus a photo on Store cards", async () => {
    const cards = await ogCards(ROUTES, NOT_FOUND_PATH);
    for (const c of cards) {
      const html = cardHtml(c);
      const count = (cls: string): number => html.match(new RegExp(`class="${cls}[" ]`, "g"))?.length ?? 0;
      expect([count("brand"), count("title")], c.path).toEqual([1, 1]);
      expect(count("label"), c.path).toBeLessThanOrEqual(1);
      expect(html.includes("<img"), c.path).toBe(c.path.startsWith("/store"));
      expect(html).toContain(`>${escapeHtml(c.title)}</div>`);
    }
    const label = (path: string): string => drawn(cards.find((c) => c.path === path) as (typeof cards)[number]).label;
    expect(label("/")).toBe("");
    expect(label("/docs/routing")).toBe("Docs");
    expect(label("/errors/TX014")).toBe("TX014");
  });
});

describe("Open Graph images in the build", () => {
  const out = mkdtempSync(join(tmpdir(), "textjs-og-"));
  const dist = join(out, "dist");
  const ssr = join(out, "ssr");

  beforeAll(() => {
    const run = (cmd: string[], env: Record<string, string> = {}): void => {
      const proc = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
      if (proc.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed:\n${proc.stderr.toString()}`);
    };
    run(["bun", "x", "vite", "build", "--outDir", dist, "--emptyOutDir"]);
    run(["bun", "x", "vite", "build", "--ssr", "src/entry-server.tsx", "--outDir", ssr, "--emptyOutDir"]);
    run(["bun", "scripts/postbuild-pages.ts"], { TEXTJS_WEB_DIST: dist, TEXTJS_WEB_SSR: ssr });
  }, 180_000);

  afterAll(() => rmSync(out, { recursive: true, force: true }));

  const pages = [...ROUTES.map((r) => ({ path: r.path, file: r.path === "/" ? "index.html" : `${r.path.slice(1)}.html` })), { path: NOT_FOUND_PATH, file: "404.html" }];

  test("every prerendered page points og:image and twitter:image at its own 1200×630 file", () => {
    const seen = new Set<string>();
    for (const { path, file } of pages) {
      const html = readFileSync(join(dist, file), "utf8");
      const image = meta(html, "property", "og:image");
      expect(image, path).toBeDefined();
      expect(meta(html, "name", "twitter:image")).toBe(image as string);
      expect(meta(html, "name", "twitter:card")).toBe("summary_large_image");
      expect(meta(html, "property", "og:image:width")).toBe(String(OG_WIDTH));
      expect(meta(html, "property", "og:image:height")).toBe(String(OG_HEIGHT));
      expect(meta(html, "property", "og:image:alt")?.length ?? 0).toBeGreaterThan(0);
      expect(meta(html, "name", "twitter:image:alt")).toBe(meta(html, "property", "og:image:alt") as string);

      const url = new URL(image as string);
      expect(url.origin).toBe("https://textjs.org");
      expect(url.pathname).toBe(`/og/${ogSlug(path)}.${url.pathname.endsWith(".jpg") ? "jpg" : "png"}`);
      expect(url.searchParams.get("v")).toMatch(/^[0-9a-f]{8}$/);
      expect(seen.has(url.pathname)).toBe(false);
      seen.add(url.pathname);

      const onDisk = join(dist, url.pathname);
      expect(existsSync(onDisk), `${path} → ${url.pathname}`).toBe(true);
      const size = imageSize(readFileSync(onDisk));
      expect(size.type).toBe(url.pathname.endsWith(".jpg") ? "jpeg" : "png");
      expect([size.width, size.height]).toEqual([OG_WIDTH, OG_HEIGHT]);
      // Cloudflare Pages takes files up to 25 MiB; unfurlers want far less.
      expect(statSync(onDisk).size).toBeLessThan(300 * 1024);
    }
  });
});
