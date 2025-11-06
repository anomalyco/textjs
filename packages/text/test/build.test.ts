import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { startProductionServer } from "../src/cli/start";
import { stripAnsi } from "../src/cli/ui";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const DASHBOARD = join(REPO, "examples/dashboard");
const BIN = join(REPO, "packages/text/bin/text.ts");

describe("text build (examples/dashboard)", () => {
  test(
    "builds dist/ cleanly and prints the route summary",
    async () => {
      const proc = Bun.spawn(["bun", BIN, "build"], { cwd: DASHBOARD, stdout: "pipe", stderr: "pipe", env: { ...process.env, NO_COLOR: "1" } });
      const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
      expect(stderr.trim()).toBe("");
      expect(code).toBe(0);
      const out = stripAnsi(stdout);
      expect(out).toContain("▼ Text.js 0.2.0 (Turbolog) — Creating an optimized console production build...");
      expect(out).toContain("✓ Compiled successfully");
      expect(out).toContain("Route (app)                              Type       Target");
      expect(out).toContain("┌ ○ /                                    Static     console.log (%c)");
      expect(out).toContain("├ ƒ /deployments/[id]                    Dynamic    console.log (%c)");
      expect(out).toContain("├ ○ /logs                                Static     console.log (%c)");
      expect(out).toContain("└ ƒ /api/health                          Dynamic    Route Handler");
      expect(out).toContain("○  (Static)   prerendered as static console cells");
      expect(out).toContain("ƒ  (Dynamic)  on-demand console reconciliation");
      expect(out).not.toMatch(/error|warn/i);

      const dist = join(DASHBOARD, "dist");
      const html = readFileSync(join(dist, "index.html"), "utf8");
      expect(html).toContain("<title>Edge Console</title>");
      expect(html).toMatch(/<script type="module" crossorigin src="\/assets\/index-[\w-]+\.js"><\/script>/);
      const assets = readdirSync(join(dist, "assets"));
      const js = assets.filter((f) => f.endsWith(".js"));
      expect(js.length).toBeGreaterThan(0);
      const bundle = js.map((f) => readFileSync(join(dist, "assets", f), "utf8")).join("\n");
      expect(bundle).toContain("Edge Console");
      expect(bundle).toContain("console.log (%c)");
      expect(bundle).not.toContain("virtual:textjs");
      expect(existsSync(join(dist, ".text/server/api.mjs"))).toBe(true);
      const manifest = JSON.parse(readFileSync(join(dist, ".text/routes-manifest.json"), "utf8"));
      expect(manifest.routes.map((r: { pattern: string }) => r.pattern)).toEqual(["/", "/deployments", "/deployments/[id]", "/logs", "/settings"]);
      expect(manifest.api.map((r: { pattern: string }) => r.pattern)).toEqual(["/api/deployments", "/api/health"]);
    },
    120_000,
  );

  test(
    "text start serves the build, SPA fallbacks and route handlers",
    async () => {
      const server = await startProductionServer({ root: DASHBOARD, port: 0, log: false });
      try {
        // Loopback by default; `--host` opts into 0.0.0.0.
        expect((server.server.address() as AddressInfo).address).toBe("127.0.0.1");
        const home = await fetch(server.url + "/");
        expect(home.status).toBe(200);
        expect(await home.text()).toContain('id="__textjs"');
        const deep = await fetch(server.url + "/deployments/dpl_8f2kq1");
        expect(deep.headers.get("content-type")).toContain("text/html");
        const health = await fetch(server.url + "/api/health");
        expect((await health.json()).status).toBe("ok");
        const filtered = await fetch(server.url + "/api/deployments?status=error");
        expect((await filtered.json()).total).toBe(1);
        expect((await fetch(server.url + "/api/health", { method: "DELETE" })).status).toBe(405);
        expect((await fetch(server.url + "/missing.js")).status).toBe(404);
        expect((await fetch(server.url + "/.text/routes-manifest.json")).status).toBe(404);
      } finally {
        await server.close();
      }
    },
    30_000,
  );
});
