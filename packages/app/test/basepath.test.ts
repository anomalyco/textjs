/**
 * basePath on every host (dev, start, bun, vercel, cloudflare), and a build
 * that never executes the cache handler or waits on middleware side effects.
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
import { cloudflareRoutes } from "../src/server/adapters/cloudflare";
import { __configureCache } from "../src/server/cache";
import { listApiRoutes, scanApp } from "../src/server/scan";
import { BASE_APP, createFixture, exerciseBasePath } from "./server-fixture";
import { startVercelHarness } from "./vercel-harness";

const loads = () => {
  const g = globalThis as Record<string, unknown>;
  return { cacheHandler: g.__textjsCacheHandlerLoads ?? 0, middleware: g.__textjsMiddlewareLoads ?? 0 };
};

async function adapt(dir: string, adapter: "bun" | "vercel" | "cloudflare") {
  const { config } = await loadTextConfig(dir, "build");
  const scan = scanApp(dir, config.appDir ?? "app");
  return runBuildAdapter({ root: dir, config, outDir: join(dir, "dist"), scan, api: listApiRoutes(scan), adapter, print: () => undefined });
}

describe("basePath across hosts", () => {
  let dir = "";
  beforeAll(() => {
    __configureCache({ reset: true });
    dir = createFixture(BASE_APP, "textjs-basepath-");
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "text dev",
    async () => {
      const server: ViteDevServer = await startDevServer({ root: dir, port: 38000 + Math.floor(Math.random() * 1500), log: false });
      try {
        const origin = new URL(server.resolvedUrls?.local[0] ?? "").origin;
        const health = await fetch(`${origin}/console/api/health`);
        expect(await health.json()).toEqual({ ok: true, path: "/api/health" });
        expect(health.headers.get("x-mw")).toBe("1");
        const go = await fetch(`${origin}/console/go`, { redirect: "manual" });
        expect(new URL(go.headers.get("location") ?? "", origin).pathname).toBe("/console/api/health");
        await go.arrayBuffer();
        // Vite internals under basePath never run user middleware.
        const client = await fetch(`${origin}/console/@vite/client`);
        expect(client.status).toBe(200);
        expect(client.headers.has("x-mw")).toBe(false);
        await client.arrayBuffer();
      } finally {
        await server.waitForRequestsIdle();
        await server.close();
      }
    },
    60_000,
  );

  test(
    "text build runs neither the cache handler nor middleware module code in-process",
    async () => {
      const before = loads();
      await buildApp({ root: dir, log: false });
      expect(loads()).toEqual(before);
    },
    120_000,
  );

  test(
    "text start",
    async () => {
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        await exerciseBasePath(new URL(server.url).origin, { immutable: true });
      } finally {
        await server.close();
      }
    },
    60_000,
  );

  test(
    "bun adapter",
    async () => {
      await adapt(dir, "bun");
      const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
      try {
        const reader = proc.stdout.getReader();
        let text = "";
        while (!/ready on (http:\/\/\S+)/.test(text)) {
          const { value, done } = await reader.read();
          if (done) throw new Error(text);
          text += new TextDecoder().decode(value);
        }
        reader.releaseLock();
        const url = /ready on (http:\/\/\S+)/.exec(text)?.[1] as string;
        await exerciseBasePath(new URL(url).origin, { immutable: true });
      } finally {
        proc.kill();
        await proc.exited;
      }
    },
    60_000,
  );

  test(
    "vercel adapter",
    async () => {
      const result = await adapt(dir, "vercel");
      const harness = await startVercelHarness(result.output);
      try {
        // Vercel serves only the configured routes: /api/health outside basePath has no route.
        await exerciseBasePath(harness.url, { immutable: true });
      } finally {
        await harness.close();
      }
    },
    60_000,
  );

  test(
    "cloudflare adapter: assets reachable under basePath, missing files 404",
    async () => {
      await adapt(dir, "cloudflare");
      const dist = join(dir, "dist");
      const routes = JSON.parse(readFileSync(join(dist, "_routes.json"), "utf8"));
      // dist/assets is served at /assets, so /console/assets/* must go through the worker, and so must paths outside /console.
      expect(routes).toEqual({ version: 1, include: ["/*"], exclude: [] });
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
      const local = Bun.serve({ port: 0, fetch: (req) => mod.default.fetch(req, env, { waitUntil: () => undefined }) });
      try {
        await exerciseBasePath(`http://localhost:${local.port}`, { immutable: true });
      } finally {
        local.stop(true);
      }
    },
    60_000,
  );
});

describe("cloudflare _routes.json", () => {
  const ctx = (basePath: string) => ({ basePath, outDir: "/nonexistent" }) as never;
  test("every request reaches the worker when the app has middleware or a basePath", () => {
    expect(cloudflareRoutes(ctx(""), null)).toEqual({ version: 1, include: ["/*"], exclude: ["/assets/*"] });
    expect(cloudflareRoutes(ctx(""), { config: { matcher: [{ source: "/:path*", has: [{ type: "header", key: "x-a" }] }] } })).toEqual({ version: 1, include: ["/*"], exclude: [] });
    expect(cloudflareRoutes(ctx(""), { config: { matcher: "/assets/:file*" } }).exclude).toEqual([]);
    // `/assets/../admin/x` is served by Pages without the worker if /assets/* is excluded.
    expect(cloudflareRoutes(ctx(""), { config: { matcher: "/api/:path*" } }).exclude).toEqual([]);
    expect(cloudflareRoutes(ctx("/b"), null)).toEqual({ version: 1, include: ["/*"], exclude: [] });
  });
});
