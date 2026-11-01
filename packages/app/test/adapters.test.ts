import { VERSION } from "@textjs/core";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildApp } from "../src/cli/build";
import { loadTextConfig } from "../src/cli/config";
import { resolveAdapter, runBuildAdapter } from "../src/server/adapters/build-step";
import { patternRegex, rewriteRoute, matcherRegex } from "../src/server/adapters/shared";
import { listApiRoutes, scanApp } from "../src/server/scan";
import { __configureCache } from "../src/server/cache";
import { createFixture, EDGE_APP, exerciseEdgeApp, LIVE_APP, openLiveStream, STATIC_APP, until } from "./server-fixture";
import { startVercelHarness } from "./vercel-harness";

async function adapt(dir: string, adapter: "static" | "bun" | "vercel" | "cloudflare") {
  const { config } = await loadTextConfig(dir, "build");
  const scan = scanApp(dir, config.appDir ?? "app");
  return runBuildAdapter({ root: dir, config, outDir: join(dir, "dist"), scan, api: listApiRoutes(scan), adapter, print: () => undefined });
}

async function waitForLine(stream: ReadableStream<Uint8Array>, re: RegExp, timeoutMs: number): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { done, value } = await Promise.race([reader.read(), new Promise<{ done: true; value: undefined }>((r) => setTimeout(() => r({ done: true, value: undefined }), deadline - Date.now()))]);
    if (done) break;
    text += decoder.decode(value);
    const m = re.exec(text);
    if (m) {
      reader.releaseLock();
      return m[1] as string;
    }
  }
  throw new Error(`timed out waiting for ${re}:\n${text}`);
}

describe("adapter helpers", () => {
  test("route patterns become anchored regexes with one outer capture", () => {
    const re = new RegExp(patternRegex("/api/posts/[id]"));
    expect(re.exec("/api/posts/42")?.[1]).toBe("/api/posts/42");
    expect(re.test("/api/posts/42/")).toBe(true);
    expect(re.test("/api/posts")).toBe(false);
    expect(new RegExp(patternRegex("/api/[...slug]", "/console")).exec("/console/api/a/b")?.[1]).toBe("/console/api/a/b");
    expect(new RegExp(patternRegex("/api/[[...slug]]")).test("/api")).toBe(true);
    expect(new RegExp(patternRegex("/(group)/api/x")).test("/api/x")).toBe(true);
  });

  test("matchers and rewrites translate to Vercel route sources", () => {
    expect(new RegExp(matcherRegex("/admin/:path*", "/base")).test("/base/admin/x")).toBe(true);
    expect(new RegExp(matcherRegex("/admin/:path*", "/base")).test("/admin/x")).toBe(false);
    expect(rewriteRoute({ source: "/old/:a/:rest*", destination: "/new/:rest*?a=:a" })).toEqual({ src: expect.any(String), dest: "/new/$2?a=$1" });
    expect(rewriteRoute({ source: "/gh/:path*", destination: "https://github.com/:path*" }, "/b").dest).toBe("https://github.com/$1");
  });

  test("adapter resolution: flag, TEXTJS_ADAPTER, Vercel / Pages detection", () => {
    expect(resolveAdapter(undefined, {})).toBeUndefined();
    expect(resolveAdapter("bun", { VERCEL: "1" })).toBe("bun");
    expect(resolveAdapter(undefined, { VERCEL: "1" })).toBe("vercel");
    expect(resolveAdapter(undefined, { CF_PAGES: "1" })).toBe("cloudflare");
    expect(resolveAdapter(undefined, { TEXTJS_ADAPTER: "static" })).toBe("static");
    expect(resolveAdapter("node", {})).toBeUndefined();
    expect(() => resolveAdapter("netlify", {})).toThrow(/unknown adapter/);
  });
});

describe("deploy adapters (middleware + route handlers + cache)", () => {
  let dir = "";
  beforeAll(async () => {
    __configureCache({ reset: true });
    dir = createFixture(EDGE_APP, "textjs-adapters-");
    await buildApp({ root: dir, log: false });
  }, 120_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "bun: dist/server.js serves the whole app",
    async () => {
      const result = await adapt(dir, "bun");
      expect(result.output).toBe(join(dir, "dist"));
      const server = join(dir, "dist/server.js");
      const src = readFileSync(server, "utf8");
      expect(src).not.toMatch(/from "@textjs\//);
      const proc = Bun.spawn(["bun", server], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
      try {
        const url = await waitForLine(proc.stdout, /ready on (http:\/\/\S+)/, 15_000);
        await exerciseEdgeApp(url, { cache: true });
        expect((await fetch(`${url}/server.js`)).status).toBe(404);
        expect((await fetch(`${url}/.text/server/api.mjs`)).status).toBe(404);
        const html = await (await fetch(`${url}/`)).text();
        const asset = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1] as string;
        const res = await fetch(url + asset);
        expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
        await res.arrayBuffer();
      } finally {
        proc.kill();
        await proc.exited;
      }
    },
    60_000,
  );

  test(
    "vercel: Build Output API v3 layout, config and a local router harness",
    async () => {
      const result = await adapt(dir, "vercel");
      const out = join(dir, ".vercel/output");
      expect(result.output).toBe(out);
      const config = JSON.parse(readFileSync(join(out, "config.json"), "utf8"));
      expect(config.version).toBe(3);
      expect(config.framework.version).toBe(VERSION);
      const mw = config.routes.find((r: { middlewarePath?: string }) => r.middlewarePath);
      expect(mw).toMatchObject({ middlewarePath: "_middleware", continue: true, override: true, middlewareRawSrc: ["/((?!assets/|favicon.ico).*)"] });
      expect(config.routes.some((r: { handle?: string }) => r.handle === "filesystem")).toBe(true);
      expect(JSON.parse(readFileSync(join(out, "functions/_textjs/server.func/.vc-config.json"), "utf8"))).toEqual({
        runtime: "nodejs22.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
        shouldAddHelpers: false,
        supportsResponseStreaming: true,
      });
      expect(JSON.parse(readFileSync(join(out, "functions/_middleware.func/.vc-config.json"), "utf8"))).toEqual({ runtime: "edge", entrypoint: "index.js" });
      const edgeSrc = readFileSync(join(out, "functions/_middleware.func/index.js"), "utf8");
      expect(edgeSrc).not.toMatch(/from ["']node:/);
      expect(existsSync(join(out, "static/index.html"))).toBe(true);
      expect(existsSync(join(out, "static/.text"))).toBe(false);
      expect(readdirSync(join(out, "static/assets")).some((f) => f.endsWith(".js"))).toBe(true);

      const harness = await startVercelHarness(out);
      try {
        await exerciseEdgeApp(harness.url, { cache: true });
        expect(harness.middlewareCalls).toContain("/secret");
        const html = await (await fetch(`${harness.url}/`)).text();
        const asset = /src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1] as string;
        const res = await fetch(harness.url + asset);
        expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
        expect(res.headers.has("x-powered-by-mw")).toBe(false);
        await res.arrayBuffer();
        expect(harness.middlewareCalls).not.toContain(asset);
      } finally {
        await harness.close();
      }
    },
    60_000,
  );

  test("static: refuses apps that need a server", async () => {
    await expect(adapt(dir, "static")).rejects.toThrow(/middleware\.ts needs a server/);
  }, 30_000);

  test(
    "cloudflare: _worker.js, _routes.json and _headers; no server bundle left in dist",
    async () => {
      const result = await adapt(dir, "cloudflare");
      const dist = join(dir, "dist");
      expect(result.notes.join("\n")).toContain("nodejs_compat");
      const worker = readFileSync(join(dist, "_worker.js"), "utf8");
      expect(worker).toContain("export {");
      expect(worker).not.toMatch(/from ["'](?!node:)[^"'./][^"']*["']/);
      expect(JSON.parse(readFileSync(join(dist, "_routes.json"), "utf8"))).toEqual({ version: 1, include: ["/*"], exclude: ["/assets/*"] });
      expect(readFileSync(join(dist, "_headers"), "utf8")).toContain("/assets/*\n  Cache-Control: public, max-age=31536000, immutable");
      expect(existsSync(join(dist, ".text/server"))).toBe(false);

      // Run the worker in-process with a fake ASSETS binding.
      const mod = (await import(`${join(dist, "_worker.js")}?t=${Date.now()}`)) as { default: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> } };
      const env = {
        ASSETS: {
          fetch: async (req: Request) => {
            const p = new URL(req.url).pathname;
            const file = join(dist, p === "/" ? "index.html" : p);
            return existsSync(file) ? new Response(readFileSync(file), { headers: { "content-type": p === "/" ? "text/html" : "text/javascript" } }) : new Response("nf", { status: 404 });
          },
        },
      };
      // The Vercel function above ran in this process and shares the global cache.
      __configureCache({ reset: true });
      const pending: Promise<unknown>[] = [];
      const ctx = { waitUntil: (p: Promise<unknown>) => pending.push(p) };
      const local = Bun.serve({ port: 0, fetch: (req) => mod.default.fetch(req, env, ctx) });
      try {
        await exerciseEdgeApp(`http://localhost:${local.port}`, { cache: true });
      } finally {
        local.stop(true);
      }
    },
    60_000,
  );

  test.skipIf(process.env.TEXTJS_TEST_WRANGLER !== "1")(
    "cloudflare: runs under `wrangler pages dev` (TEXTJS_TEST_WRANGLER=1)",
    async () => {
      if (!existsSync(join(dir, "dist/_worker.js"))) await adapt(dir, "cloudflare");
      const port = 38700 + Math.floor(Math.random() * 200);
      const proc = Bun.spawn(["bunx", "wrangler", "pages", "dev", "dist", "--port", String(port), "--compatibility-date=2025-01-01", "--compatibility-flags=nodejs_compat", "--show-interactive-dev-session=false"], {
        cwd: dir,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
      });
      try {
        await waitForLine(proc.stdout, /(Ready on http:\/\/\S+)/, 90_000);
        await exerciseEdgeApp(`http://127.0.0.1:${port}`, { cache: true });
      } finally {
        proc.kill();
        await proc.exited;
      }
    },
    150_000,
  );
});

describe("static adapter", () => {
  let dir = "";
  beforeAll(() => {
    dir = createFixture(STATIC_APP, "textjs-static-");
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "prerenders force-static GET handlers and adds the SPA 404 fallback",
    async () => {
      const result = await buildApp({ root: dir, log: false, adapter: "static" });
      expect(result.adapter?.adapter).toBe("static");
      expect(result.output).toContain("Prerendered 1 route handler: /api/feed.json");
      const dist = join(dir, "dist");
      expect(JSON.parse(readFileSync(join(dist, "api/feed.json"), "utf8"))).toEqual({ items: [1, 2], query: "" });
      expect(readFileSync(join(dist, "404.html"), "utf8")).toBe(readFileSync(join(dist, "index.html"), "utf8"));
      expect(existsSync(join(dist, ".text/server"))).toBe(false);
    },
    120_000,
  );
});

describe("server-rendered routes and adapters", () => {
  let dir = "";
  beforeAll(async () => {
    dir = createFixture(LIVE_APP, "textjs-live-adapters-");
    await buildApp({ root: dir, log: false });
  }, 120_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("static, vercel and cloudflare refuse them with TX030 / a listed reason", async () => {
    await expect(adapt(dir, "static")).rejects.toThrow(/\/ops: renders on the server/);
    await expect(adapt(dir, "vercel")).rejects.toThrow(/TX030[\s\S]*\/ops[\s\S]*vercel adapter/);
    await expect(adapt(dir, "cloudflare")).rejects.toThrow(/TX030[\s\S]*cloudflare adapter/);
    expect(existsSync(join(dir, "dist/.text/server/live.mjs"))).toBe(true);
  }, 60_000);

  test(
    "bun: dist/server.js hosts live sessions",
    async () => {
      await adapt(dir, "bun");
      const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...process.env, PORT: "0", HOSTNAME: "127.0.0.1" }, stdout: "pipe", stderr: "inherit" });
      try {
        const url = await waitForLine(proc.stdout, /ready on (http:\/\/\S+)/, 15_000);
        const doc = await (await fetch(`${url}/ops`, { headers: { accept: "text/html" } })).text();
        expect(doc).toContain('data-textjs-runtime="server"');
        const live = await openLiveStream(url, "path=/ops&cols=40&rows=4");
        expect(live.status).toBe(200);
        const frames = () => JSON.stringify(live.messages.filter((m) => m.t === "f"));
        await until(() => frames().includes("server"));
        const sid = (live.messages.find((m) => m.t === "hello") as { sid: string }).sid;
        const input = await fetch(`${url}/__textjs/live`, { method: "POST", headers: { "content-type": "application/json", "x-textjs-live": sid }, body: JSON.stringify([{ type: "key", key: "+", input: "+" }]) });
        expect(input.status).toBe(204);
        const count = live.messages.length;
        await until(() => live.messages.length > count && live.messages.slice(count).some((m) => m.t === "f"));
        live.close();
        const client = await openLiveStream(url, "path=/");
        await until(() => client.messages.some((m) => m.t === "load"));
        client.close();
      } finally {
        proc.kill();
        await proc.exited;
      }
    },
    60_000,
  );
});
