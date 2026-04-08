import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { buildApp } from "../src/cli/build";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer, type StartedServer } from "../src/cli/start";
import { __configureCache } from "../src/server/cache";
import { createFixture, EDGE_APP, exerciseEdgeApp } from "./server-fixture";

describe("middleware.ts + caching in text dev", () => {
  let dir = "";
  let server: ViteDevServer;
  let base = "";

  beforeAll(async () => {
    __configureCache({ reset: true });
    dir = createFixture(EDGE_APP, "textjs-mw-dev-");
    server = await startDevServer({ root: dir, port: 36000 + Math.floor(Math.random() * 2000), log: false });
    base = (server.resolvedUrls?.local[0] ?? "").replace(/\/$/, "");
  }, 30_000);

  afterAll(async () => {
    // Let Vite's dependency optimizer finish before closing (it can't be cancelled mid-run).
    await server?.waitForRequestsIdle();
    await server?.close();
    rmSync(dir, { recursive: true, force: true });
  }, 20_000);

  test("redirects, responses, rewrites, header overrides, cookies and the data cache", async () => {
    await exerciseEdgeApp(base, { cache: false });
  }, 30_000);

  test("Vite module requests never run middleware", async () => {
    const page = await fetch(`${base}/app/page.tsx`);
    expect(page.status).toBe(200);
    expect(page.headers.has("x-powered-by-mw")).toBe(false);
    await page.arrayBuffer();
    const client = await fetch(`${base}/@vite/client`);
    expect(client.headers.has("x-powered-by-mw")).toBe(false);
    await client.arrayBuffer();
  });
});

describe("middleware.ts + caching in text start", () => {
  let dir = "";
  let server: StartedServer;

  beforeAll(async () => {
    __configureCache({ reset: true });
    dir = createFixture(EDGE_APP, "textjs-mw-start-");
    const result = await buildApp({ root: dir, log: false });
    expect(result.output).toContain("ƒ Middleware");
    expect(existsSync(join(dir, "dist/.text/server/runtime.mjs"))).toBe(true);
    server = await startProductionServer({ root: dir, port: 0, log: false });
  }, 120_000);

  afterAll(async () => {
    await server?.close();
    rmSync(dir, { recursive: true, force: true });
  }, 20_000);

  test("the same contract with full-route caching", async () => {
    await exerciseEdgeApp(server.url, { cache: true });
  }, 30_000);

  test("middleware runs for static files matched by config.matcher only", async () => {
    const html = await (await fetch(server.url + "/")).text();
    const asset = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1];
    expect(asset).toBeDefined();
    const res = await fetch(server.url + asset);
    expect(res.status).toBe(200);
    expect(res.headers.has("x-powered-by-mw")).toBe(false);
    await res.arrayBuffer();
  });
});
