import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DOCS_META, docPath } from "../src/docs/registry";

const ROOT = join(import.meta.dir, "..");

describe("production build", () => {
  test("vite build succeeds with zero warnings and SEO-ready output", () => {
    const out = mkdtempSync(join(tmpdir(), "textjs-web-"));
    try {
      const proc = Bun.spawnSync(["bun", "x", "vite", "build", "--outDir", out, "--emptyOutDir"], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
      // Without the colors Vite adds on a terminal.
      const plain = (b: Buffer): string => b.toString().replace(/\x1b\[[\d;]*m/g, "");
      const stdout = plain(proc.stdout);
      const stderr = plain(proc.stderr);
      expect(proc.exitCode).toBe(0);
      expect(stdout).toContain("built in");
      // Vite lists every emitted file with its size; chunk names such as `errors-*.js` aren't messages.
      const log = `${stdout
        .split("\n")
        .filter((line) => !/\/assets\/\S+\s+\d/.test(line))
        .join("\n")}\n${stderr}`;
      expect(log.toLowerCase()).not.toContain("warning");
      expect(log).not.toContain("(!)");
      expect(log.toLowerCase()).not.toContain("error");
      expect(stderr.trim()).toBe("");

      const html = readFileSync(join(out, "index.html"), "utf8");
      expect(html).toContain("<title>Text.js | The Console Framework</title>");
      expect(html.split("\n")[1]).toBe("<!-- ⌘⌥J · Ctrl+Shift+J -->");
      expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
      expect(html).toContain('property="og:url" content="https://textjs.org/"');
      expect(html).toContain('property="og:image" content="https://textjs.org/og.png"');
      expect(html).toContain('name="twitter:image" content="https://textjs.org/og.png"');
      expect(html).toContain("background:#000000");
      expect(html).not.toContain("▲");
      for (const f of ["favicon.svg", "og.png", "og.svg", "robots.txt", "sitemap.xml", "enterprise/sample-invoice.pdf"]) expect(existsSync(join(out, f))).toBe(true);
      const assets = readdirSync(join(out, "assets"));
      expect(assets.some((a) => a.endsWith(".css"))).toBe(true);
      expect(assets.filter((a) => a.endsWith(".js")).length).toBeGreaterThanOrEqual(3);
      // The site's entry and the console companion load without @textjs/core's bidi engine (bidi-[hash].js), which
      // loads on the first right-to-left text. Static imports and re-exports only: `import("./x.js")` doesn't count.
      const read = (f: string): string => readFileSync(join(out, "assets", f), "utf8");
      const STATIC = /\b(?:import|export)\s*(?:[\w$]+\s*,\s*)?(?:\{[^}]*\}\s*from\s*|\*\s*(?:as\s*[\w$]+\s*)?from\s*|[\w$]+\s*from\s*)?"\.\/([\w-]+\.js)"/g;
      const eager = new Set<string>();
      const walk = (f: string): void => {
        if (eager.has(f)) return;
        eager.add(f);
        for (const m of read(f).matchAll(STATIC)) walk(m[1] as string);
      };
      const entries = assets.filter((a) => /^(index|boot)-[\w-]+\.js$/.test(a));
      expect(entries.some((a) => a.startsWith("boot-"))).toBe(true);
      for (const f of entries) walk(f);
      const bidi = assets.filter((a) => /^bidi-(?!engine-)[\w-]+\.js$/.test(a));
      expect(bidi).toHaveLength(1);
      expect([...eager].filter((f) => bidi.includes(f))).toEqual([]);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 120_000);

  test("vercel.json rewrites app routes (never static files) to the SPA shell", () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as {
      rewrites: Array<{ source: string; destination: string }>;
      headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    };
    const rewrite = cfg.rewrites.find((r) => r.destination === "/index.html");
    expect(rewrite).toBeDefined();
    const re = new RegExp(`^${rewrite?.source ?? ""}$`);
    for (const p of ["/", "/docs/routing", "/playground", "/opencode", "/doom", "/nope"]) expect(re.test(p)).toBe(true);
    for (const p of ["/assets/index-abc.js", "/assets/missing.js", "/doom/DOOM1.WAD.gz", "/doom/missing.bin", "/favicon.svg", "/og.png", "/og.svg", "/robots.txt", "/sitemap.xml", "/humans.txt", "/llms.txt", "/home.ansi", "/api/v2/status.json", "/api/v2/components.json", "/api/v2/summary.json", "/enterprise/sample-invoice.pdf"]) expect(re.test(p)).toBe(false);
    expect(re.test("/enterprise")).toBe(true);
    // Doom's WAD gets the same day-long cache as on Cloudflare Pages (_headers).
    expect(cfg.headers.find((h) => h.source === "/doom/(.*)")?.headers).toEqual([{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }]);
    const all = cfg.headers.find((h) => h.source === "/(.*)")?.headers ?? [];
    expect(all).toContainEqual({ key: "X-Content-Type-Options", value: "nosniff" });
    expect(all).toContainEqual({ key: "X-Powered-By", value: "Text.js" });
  });

  test("Cloudflare Pages sends X-Powered-By on every static response", () => {
    const headers = readFileSync(join(ROOT, "public/_headers"), "utf8");
    const all = /^\/\*\n((?:[ \t]+.+\n)+)/m.exec(headers)?.[1] ?? "";
    expect(all).toContain("  X-Powered-By: Text.js\n");
  });

  test("sitemap lists every docs page", () => {
    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    for (const d of DOCS_META) expect(sitemap).toContain(`https://textjs.org${docPath(d.slug)}<`);
  });
});
