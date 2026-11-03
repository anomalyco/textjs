import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NOT_FOUND_PATH, ROUTES } from "../src/entry-server";
import { OG_HEIGHT, OG_WIDTH, ogCards, ogSlug } from "../src/og";
import { cardHtml, drawn, escapeHtml } from "../scripts/og/template";
import { inlineScriptHashes } from "../scripts/csp";

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
  const dist = join(out, "draft", "dist");
  const live = join(out, "live", "dist");
  const locales = join(out, "locales");

  beforeAll(() => {
    const run = (cmd: string[], env: Record<string, string> = {}): void => {
      const proc = Bun.spawnSync(cmd, { cwd: ROOT, stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
      if (proc.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed:\n${proc.stderr.toString()}`);
    };
    // English plus Japanese as scripts/build.ts builds them. The fixtures pin ja's status, so promoting it in
    // locales.ts doesn't change what these tests expect.
    const set = { TEXTJS_LOCALES: "ja:draft" };
    run(["bun", "x", "vite", "build", "--outDir", join(out, "base", "dist"), "--emptyOutDir"], set);
    run(["bun", "x", "vite", "build", "--ssr", "src/entry-server.tsx", "--outDir", join(out, "base", "ssr"), "--emptyOutDir"], set);
    const ja = { ...set, TEXTJS_LOCALE: "ja" };
    run(["bun", "x", "vite", "build", "--outDir", join(locales, "ja", "client"), "--emptyOutDir"], ja);
    run(["bun", "x", "vite", "build", "--ssr", "src/entry-server.tsx", "--outDir", join(locales, "ja", "ssr"), "--emptyOutDir"], ja);
    // The prerenderer twice: ja as a draft, and ja live (its links, hreflang, sitemap and headers).
    for (const [name, status] of [["draft", "ja:draft"], ["live", "ja:live"]] as const) {
      cpSync(join(out, "base"), join(out, name), { recursive: true });
      run(["bun", "scripts/postbuild-pages.ts"], { TEXTJS_WEB_DIST: join(out, name, "dist"), TEXTJS_WEB_SSR: join(out, name, "ssr"), TEXTJS_WEB_LOCALES: locales, TEXTJS_LOCALES: status });
    }
  }, 300_000);

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

  /** `_headers` rules in file order: path → lowercased header → value. */
  const headerRules = (): Map<string, Map<string, string>> => {
    const rules = new Map<string, Map<string, string>>();
    let current: Map<string, string> | null = null;
    for (const line of readFileSync(join(dist, "_headers"), "utf8").split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      if (!/^\s/.test(line)) rules.set(line.trim(), (current = new Map()));
      else current!.set(line.slice(0, line.indexOf(":")).trim().toLowerCase(), line.slice(line.indexOf(":") + 1).trim());
    }
    return rules;
  };
  const htmlFiles = (): string[] => {
    const out: string[] = [];
    const walk = (d: string): void => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory()) walk(join(d, e.name));
        else if (e.name.endsWith(".html")) out.push(join(d, e.name));
      }
    };
    walk(dist);
    return out;
  };

  test("every route has its own _headers rule (no cache, same-origin resource policy)", () => {
    const rules = headerRules();
    for (const { path } of ROUTES) {
      const rule = [...rules].find(([p]) => p !== "/*" && (p === path || (p.endsWith("/*") && path.startsWith(p.slice(0, -1)))));
      expect({ path, cache: rule?.[1].get("cache-control"), corp: rule?.[1].get("cross-origin-resource-policy") }).toEqual({
        path,
        cache: "public, max-age=0, must-revalidate",
        corp: "same-origin",
      });
    }
  });

  test("the Content-Security-Policy allows every inline script the pages ship, on one line Pages accepts", () => {
    const line = readFileSync(join(dist, "_headers"), "utf8")
      .split("\n")
      .find((l) => /^\s+Content-Security-Policy:/.test(l))!;
    const hashes = inlineScriptHashes(dist);
    expect(hashes.length).toBeGreaterThan(0);
    for (const h of hashes) expect(line).toContain(h);
    expect(line.length).toBeLessThanOrEqual(2000);
  });

  test("prerendered pages embed nothing the policy doesn't expect", () => {
    for (const file of htmlFiles()) {
      const html = readFileSync(file, "utf8");
      const rel = file.slice(dist.length);
      expect({ rel, embeds: html.match(/<(iframe|object|embed)\b/gi) ?? [] }).toEqual({ rel, embeds: [] });
      expect({ rel, handlers: html.match(/<[^>]*\son[a-z]+\s*=/gi) ?? [] }).toEqual({ rel, handlers: [] });
      const external = [...html.matchAll(/\s(?:src|srcset)="([^"]*)"/gi)]
        .flatMap((m) => (m[1] as string).split(",").map((c) => c.trim().split(/\s+/)[0] as string))
        .filter((u) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(u) && !/^https:\/\/(media\.)?textjs\.org\//.test(u));
      expect({ rel, external }).toEqual({ rel, external: [] });
    }
  });

  test("a draft locale's pages carry their language, stay out of indexes and get their own cards", () => {
    const html = readFileSync(join(dist, "ja", "docs", "routing.html"), "utf8");
    expect(html).toContain('<html lang="ja" dir="ltr"');
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).toContain('data-route="/ja/docs/routing"');
    expect(html).not.toContain('hreflang="');
    expect(new URL(meta(html, "property", "og:image") as string).pathname).toBe("/og/ja-docs-routing.png");
    expect(html).toContain('href="/ja/docs/installation"');
    // Anchors keep their English ids.
    expect(html).toContain('<h2 id="dynamic-segments">');
    expect(existsSync(join(dist, "ja", "404.html"))).toBe(true);
    expect(readFileSync(join(dist, "ja", "blog", "rss.xml"), "utf8")).toContain("<language>ja</language>");
    const rule = headerRules().get("/ja/*");
    expect(rule?.get("x-robots-tag")).toBe("noindex");
    expect(rule?.get("content-language")).toBe("ja");
    // Drafts add nothing to English pages.
    expect(readFileSync(join(dist, "docs", "routing.html"), "utf8")).not.toContain('hreflang="');
    expect(existsSync(join(dist, "sitemap-ja.xml"))).toBe(false);
  });

  test("a live locale is offered only for pages with translated content of their own", () => {
    const page = (p: string): string => readFileSync(join(live, `${p}.html`), "utf8");
    const canonical = (html: string): string | undefined => /<link\s+rel="canonical"\s+href="([^"]*)"/.exec(html)?.[1];
    const routing = page("ja/docs/routing");
    expect(routing).not.toContain('name="robots"');
    expect(canonical(routing)).toBe("https://textjs.org/ja/docs/routing");
    expect(routing).toContain('<link rel="alternate" hreflang="en" href="https://textjs.org/docs/routing" />');
    expect(routing).toContain('<link rel="alternate" hreflang="ja" href="https://textjs.org/ja/docs/routing" />');
    expect(routing).toContain('<link rel="alternate" hreflang="x-default" href="https://textjs.org/docs/routing" />');
    expect(routing.indexOf('hreflang="ja"')).toBeGreaterThan(routing.indexOf('rel="modulepreload"'));
    expect(page("docs/routing")).toContain('hreflang="ja"');
    // /docs/introduction is /docs: only the canonical URL is an alternate or in the sitemap.
    expect(page("docs/introduction")).not.toContain('hreflang="');
    expect(page("ja/docs/introduction")).not.toContain('hreflang="');
    expect(canonical(page("ja/docs/introduction"))).toBe("https://textjs.org/ja/docs");
    // The enterprise page's own copy isn't translated; shared header and footer strings don't make it Japanese.
    const enterprise = page("ja/enterprise");
    expect(enterprise).not.toContain('hreflang="');
    expect(canonical(enterprise)).toBe("https://textjs.org/enterprise");
    const sitemap = readFileSync(join(live, "sitemap-ja.xml"), "utf8");
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls).toContain("https://textjs.org/ja/docs/routing");
    expect(urls.filter((u) => u === "https://textjs.org/ja/docs")).toHaveLength(1);
    expect(urls).not.toContain("https://textjs.org/ja/docs/introduction");
    expect(urls).not.toContain("https://textjs.org/ja/enterprise");
    expect(readFileSync(join(live, "robots.txt"), "utf8")).toContain("Sitemap: https://textjs.org/sitemap-ja.xml");
    expect(readFileSync(join(live, "_headers"), "utf8")).not.toContain("X-Robots-Tag");
  });
});
