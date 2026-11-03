import { existsSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import { REPO } from "./wad";

export const ROOT = join(REPO, "media/doom-video");
export const CACHE = join(ROOT, ".cache");
export const OUT = join(ROOT, "out");
const DIST = join(CACHE, "site-dist");

/** A production build of apps/web, as textjs.org ships it (no dev-only React warnings in the console). */
export function buildSite(): void {
  const p = Bun.spawnSync(["bunx", "vite", "build", "--outDir", DIST, "--emptyOutDir"], { cwd: join(REPO, "apps/web"), stdout: "pipe", stderr: "pipe" });
  if (p.exitCode !== 0) throw new Error(`site build failed: ${p.stderr.toString().slice(-1500)}`);
}

export function serveSite(): { origin: string; stop(): void } {
  if (!existsSync(join(DIST, "index.html"))) buildSite();
  const srv = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      const file = join(DIST, normalize(path));
      if (path !== "/" && file.startsWith(DIST) && existsSync(file) && statSync(file).isFile()) return new Response(Bun.file(file));
      return new Response(Bun.file(join(DIST, "index.html")), { headers: { "content-type": "text/html; charset=utf-8" } });
    },
  });
  return { origin: `http://127.0.0.1:${srv.port}`, stop: () => srv.stop(true) };
}

const CHROMIUM_CACHE = join(process.env.HOME ?? "", "Library/Caches/ms-playwright");

/** Chrome for Testing (full Chromium, for the real DevTools frontend), as media/learn uses. */
export function chromiumPath(): string {
  const collator = new Intl.Collator("en", { numeric: true });
  const found = [...new Bun.Glob("chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing").scanSync(CHROMIUM_CACHE)].sort(collator.compare).at(-1);
  if (!found) throw new Error("No Chrome for Testing: run `bunx playwright-core install chromium`");
  return join(CHROMIUM_CACHE, found);
}
