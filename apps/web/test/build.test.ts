import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DOCS, docPath } from "../src/docs/registry";

const ROOT = join(import.meta.dir, "..");

describe("production build", () => {
  test("vite build succeeds with zero warnings and SEO-ready output", () => {
    const out = mkdtempSync(join(tmpdir(), "textjs-web-"));
    try {
      const proc = Bun.spawnSync(["bun", "x", "vite", "build", "--outDir", out, "--emptyOutDir"], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
      const log = `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
      expect(proc.exitCode).toBe(0);
      expect(log).toContain("built in");
      expect(log.toLowerCase()).not.toContain("warning");
      expect(log).not.toContain("(!)");
      expect(log.toLowerCase()).not.toContain("error");

      const html = readFileSync(join(out, "index.html"), "utf8");
      expect(html).toContain("<title>Text.js by Vershell — The Console Framework for the Web</title>");
      expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"');
      expect(html).toContain('property="og:url" content="https://textjs.org/"');
      expect(html).toContain('property="og:image" content="https://textjs.org/og.png"');
      expect(html).toContain('name="twitter:image" content="https://textjs.org/og.png"');
      expect(html).toContain("background:#000000");
      expect(html).not.toContain("▲");
      for (const f of ["favicon.svg", "og.png", "og.svg", "robots.txt", "sitemap.xml"]) expect(existsSync(join(out, f))).toBe(true);
      const assets = readdirSync(join(out, "assets"));
      expect(assets.some((a) => a.endsWith(".css"))).toBe(true);
      expect(assets.filter((a) => a.endsWith(".js")).length).toBeGreaterThanOrEqual(3);
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
    for (const p of ["/", "/docs/routing", "/playground", "/opencode", "/nope"]) expect(re.test(p)).toBe(true);
    for (const p of ["/assets/index-abc.js", "/assets/missing.js", "/favicon.svg", "/og.png", "/og.svg", "/robots.txt", "/sitemap.xml"]) expect(re.test(p)).toBe(false);
    const all = cfg.headers.find((h) => h.source === "/(.*)")?.headers ?? [];
    expect(all).toContainEqual({ key: "X-Content-Type-Options", value: "nosniff" });
  });

  test("sitemap lists every docs page", () => {
    const sitemap = readFileSync(join(ROOT, "public/sitemap.xml"), "utf8");
    for (const d of DOCS) expect(sitemap).toContain(`https://textjs.org${docPath(d.slug)}<`);
  });
});
