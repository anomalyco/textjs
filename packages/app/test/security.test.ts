/**
 * Security regressions on every host: path-scoped middleware can't be
 * bypassed, request targets can't move `request.url` to another origin,
 * aborted uploads can't crash the server, and per-visitor responses are never
 * cached for everyone.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { buildApp } from "../src/cli/build";
import { loadTextConfig } from "../src/cli/config";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer } from "../src/cli/start";
import { runBuildAdapter } from "../src/server/adapters/build-step";
import { __configureCache } from "../src/server/cache";
import { listApiRoutes, scanApp } from "../src/server/scan";
import { createFixture, exerciseScopedApp, rawRequest, SCOPED_APP } from "./server-fixture";
import { startVercelHarness } from "./vercel-harness";

async function adapt(dir: string, adapter: "bun" | "vercel" | "cloudflare") {
  const { config } = await loadTextConfig(dir, "build");
  const scan = scanApp(dir, config.appDir ?? "app");
  return runBuildAdapter({ root: dir, config, outDir: join(dir, "dist"), scan, api: listApiRoutes(scan), adapter, print: () => undefined });
}

async function waitForUrl(stream: ReadableStream<Uint8Array>, timeoutMs: number): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { done, value } = await Promise.race([reader.read(), new Promise<{ done: true; value: undefined }>((r) => setTimeout(() => r({ done: true, value: undefined }), deadline - Date.now()))]);
    if (done) break;
    text += decoder.decode(value);
    const m = /ready on (http:\/\/\S+)/.exec(text);
    if (m) {
      reader.releaseLock();
      return m[1] as string;
    }
  }
  throw new Error(`server did not start:\n${text}`);
}

describe("security contract (SCOPED_APP)", () => {
  let dir = "";
  beforeAll(async () => {
    __configureCache({ reset: true });
    dir = createFixture(SCOPED_APP, "textjs-security-");
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "text dev",
    async () => {
      const server: ViteDevServer = await startDevServer({ root: dir, port: 37000 + Math.floor(Math.random() * 2000), log: false });
      try {
        const base = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
        await exerciseScopedApp(base, { cache: false });
        const blocked = await rawRequest(base, "/api/public", { headers: { host: `attacker.example:${new URL(base).port}` } });
        expect(blocked.status).toBe(403);
        expect(blocked.body).toContain('Text.js error TX028: Blocked request. This host ("attacker.example") is not allowed. Add it to `vite.server.allowedHosts` in text.config.ts.');
        // Server-only sources are never served as modules.
        for (const path of ["/middleware.ts", "/text.config.ts", "/app/api/admin/secret/route.ts", "/.env"]) {
          const res = await fetch(`${base}${path}`);
          expect({ path, status: res.status }).toEqual({ path, status: 404 });
          await res.arrayBuffer();
        }
      } finally {
        await server.waitForRequestsIdle();
        await server.close();
      }
    },
    60_000,
  );

  test(
    "text start (also: DNS rebinding and basePath boundaries)",
    async () => {
      await buildApp({ root: dir, log: false });
      __configureCache({ reset: true });
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        await exerciseScopedApp(server.url, { cache: true });
        const port = new URL(server.url).port;
        const blocked = await rawRequest(server.url, "/api/public", { headers: { host: `attacker.example:${port}` } });
        expect(blocked.status).toBe(403);
        expect(blocked.body).toContain('Text.js error TX028: Blocked request. This host ("attacker.example") is not allowed. Add it to `server.allowedHosts` in text.config.ts.');
        expect((await rawRequest(server.url, "/api/public", { headers: { host: `localhost:${port}` } })).status).toBe(200);
        expect((await rawRequest(server.url, "/%E0%A4%A")).status).toBe(400);
      } finally {
        await server.close();
      }
    },
    120_000,
  );

  test(
    "bun adapter",
    async () => {
      await adapt(dir, "bun");
      __configureCache({ reset: true });
      const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
      try {
        const url = await waitForUrl(proc.stdout, 15_000);
        await exerciseScopedApp(url, { cache: true });
      } finally {
        proc.kill();
        await proc.exited;
      }
    },
    60_000,
  );

  test(
    "vercel adapter: the handler function is internal, path-scoped matchers hold",
    async () => {
      const result = await adapt(dir, "vercel");
      __configureCache({ reset: true });
      const harness = await startVercelHarness(result.output);
      try {
        await exerciseScopedApp(harness.url, { cache: true, privateDowngrade: false });
        // Direct and spoofed requests to the function: 404 / 400, never the protected handler.
        for (const target of ["/_textjs/server", "/_textjs/server/x", "/api/public", "/api/public?x=1"]) {
          const res = await rawRequest(harness.url, target, { headers: { "x-textjs-path": "/api/admin/secret" } });
          expect({ target, ok: res.status === 404 || res.status === 400 }).toEqual({ target, ok: true });
          expect(res.body).not.toContain("admin-only");
        }
        expect(harness.middlewareCalls.filter((p) => p.startsWith("/api/admin")).length).toBeGreaterThan(0);
      } finally {
        await harness.close();
      }
    },
    60_000,
  );

  test(
    "cloudflare adapter (worker in-process, Pages-like ASSETS)",
    async () => {
      await adapt(dir, "cloudflare");
      const dist = join(dir, "dist");
      expect(existsSync(join(dist, ".text"))).toBe(false);
      expect(existsSync(join(dist, "404.html"))).toBe(true);
      const mod = (await import(`${join(dist, "_worker.js")}?t=${Date.now()}`)) as { default: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> } };
      const env = {
        ASSETS: {
          fetch: async (req: Request) => {
            const p = new URL(req.url).pathname;
            const file = join(dist, p === "/" ? "index.html" : p);
            if (existsSync(file) && (p === "/" || !p.endsWith("/"))) return new Response(readFileSync(file));
            return new Response(readFileSync(join(dist, "404.html")), { status: 404 });
          },
        },
      };
      __configureCache({ reset: true });
      const local = Bun.serve({ port: 0, fetch: (req) => mod.default.fetch(req, env, { waitUntil: () => undefined }) });
      try {
        const base = `http://localhost:${local.port}`;
        await exerciseScopedApp(base, { cache: true });
        const missing = await fetch(`${base}/assets/missing-abc.js`);
        expect(missing.status).toBe(404);
        await missing.arrayBuffer();
      } finally {
        local.stop(true);
      }
    },
    60_000,
  );
});
