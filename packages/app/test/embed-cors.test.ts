/**
 * `embed` on every host: `embed.js` and `/assets/*` carry public CORS headers
 * (and nothing else does), and server-rendered routes accept live sessions
 * from `embed.allowOrigins`, still behind middleware.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import { buildApp } from "../src/cli/build";
import { startDevServer } from "../src/cli/dev";
import { startProductionServer } from "../src/cli/start";
import { staticFile } from "../src/server/static-file";
import { __configureCache } from "../src/server/cache";
import { adapt, waitForLine } from "./adapter-helpers";
import { createFixture, until } from "./server-fixture";
import { startVercelHarness } from "./vercel-harness";

const HOST = "https://host.example";
const CORS = ["access-control-allow-origin", "cross-origin-resource-policy"] as const;

const config = (body: string): string => `import { defineConfig } from "@textjs/app";\nexport default defineConfig(${body});\n`;

/** A client app with its own pages and `embed.js`, and a static route handler (so the static adapter can export it). */
const STATIC_APP = (basePath = ""): Record<string, string> => ({
  "text.config.ts": config(`{ title: "Embed Fixture", embed: { standalone: true }${basePath ? `, basePath: ${JSON.stringify(basePath)}` : ""} }`),
  "app/page.tsx": `import { Text } from "@textjs/app";\nexport default function Page() { return <Text>home</Text>; }\n`,
  "app/api/ping/route.ts": `export const dynamic = "force-static";\nexport function GET() { return Response.json({ pong: true }); }\n`,
  "public/assets/doc.html": "<!doctype html><p>doc</p>\n",
});

/** An embed-only build: server-rendered routes, `/ops` behind cookie middleware, and other sites allowed to open sessions. */
const LIVE_APP: Record<string, string> = {
  "text.config.ts": config(`{ title: "Embed Live Fixture", embed: { allowOrigins: [${JSON.stringify(HOST)}] }, server: { trustProxy: true } }`),
  "app/page.tsx": `import { Text } from "@textjs/app";\nexport default function Page() { return <Text>home</Text>; }\n`,
  "app/pub/page.tsx": `import { Text, useInput } from "@textjs/app";
import { useState } from "react";
export const runtime = "server";
export default function Pub() {
  const [n, setN] = useState(0);
  useInput((e) => { if (e.input === "+") setN((v) => v + 1); });
  return <Text>{"pub " + n}</Text>;
}
`,
  "app/ops/page.tsx": `import { Text } from "@textjs/app";\nexport const runtime = "server";\nexport default function Ops() { return <Text>ops secret</Text>; }\n`,
  "app/api/ping/route.ts": `export function GET() { return Response.json({ pong: true }); }\n`,
  "middleware.ts": `import { NextResponse, type NextRequest } from "@textjs/app/server";
export function middleware(request: NextRequest) {
  if (request.cookies.get("auth")?.value === "1") return NextResponse.next();
  return new Response("denied", { status: 401 });
}
export const config = { matcher: ["/ops/:path*"] };
`,
};

function hashedAsset(dir: string): string {
  const name = readdirSync(join(dir, "dist/assets")).find((f) => f.endsWith(".js"));
  if (!name) throw new Error("no hashed asset in dist/assets");
  return `/assets/${name}`;
}

const corsOf = (res: Response): Record<string, string | null> => Object.fromEntries(CORS.map((h) => [h, res.headers.get(h)]));
const PUBLIC = { "access-control-allow-origin": "*", "cross-origin-resource-policy": "cross-origin" };
const NONE = { "access-control-allow-origin": null, "cross-origin-resource-policy": null };

/**
 * `embed.js` and hashed assets are public; documents, route handlers, HTML under /assets and 404s aren't.
 * `byUrl`: a `_headers` file applies the rules (Pages' CDN), by URL, so anything under /assets/ gets them.
 * `hostCors`: the host adds `Access-Control-Allow-Origin: *` to every static file itself (`wrangler pages dev`).
 */
async function expectAssetHeaders(base: string, asset: string, o: { cacheControl?: boolean; byUrl?: boolean; hostCors?: boolean } = {}): Promise<void> {
  const js = await fetch(`${base}${asset}`);
  expect({ path: asset, status: js.status, ...corsOf(js) }).toEqual({ path: asset, status: 200, ...PUBLIC });
  await js.arrayBuffer();
  const embed = await fetch(`${base}/embed.js`);
  expect({ path: "/embed.js", status: embed.status, ...corsOf(embed) }).toEqual({ path: "/embed.js", status: 200, ...PUBLIC });
  if (o.cacheControl !== false) expect(embed.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
  await embed.arrayBuffer();
  for (const [path, accept] of [
    ["/", "text/html"],
    ["/api/ping", "*/*"],
    ...(o.byUrl ? [] : ([["/assets/doc.html", "text/html"], ["/assets/missing-1a2b.js", "*/*"]] as const)),
  ] as const) {
    const res = await fetch(`${base}${path}`, { headers: { accept } });
    await res.arrayBuffer();
    const got = corsOf(res);
    const want: Record<string, string | null> = { ...NONE };
    if (o.hostCors) for (const h of [got, want]) delete h["access-control-allow-origin"];
    expect({ path, ...got }).toEqual({ path, ...want });
  }
}

async function expectNoAssetHeaders(base: string, asset: string): Promise<void> {
  for (const path of [asset, "/embed.js", "/"]) {
    const res = await fetch(`${base}${path}`);
    await res.arrayBuffer();
    expect({ path, ...corsOf(res) }).toEqual({ path, ...NONE });
  }
}

interface Stream {
  status: number;
  headers: Headers;
  messages: Array<Record<string, unknown>>;
  close(): void;
}

async function stream(base: string, path: string, headers: Record<string, string>): Promise<Stream> {
  const ctrl = new AbortController();
  const res = await fetch(`${base}/__textjs/live?path=${encodeURIComponent(path)}&cols=40&rows=4`, { headers, signal: ctrl.signal });
  const out: Stream = { status: res.status, headers: res.headers, messages: [], close: () => ctrl.abort() };
  if (!res.body) return out;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          for (const line of buf.slice(0, i).split("\n")) if (line.startsWith("data: ")) out.messages.push(JSON.parse(line.slice(6)) as Record<string, unknown>);
          buf = buf.slice(i + 2);
        }
      }
    } catch {
      // aborted
    }
  })();
  return out;
}

const frames = (s: Stream): string => JSON.stringify(s.messages.filter((m) => m.t === "f"));
const site = (origin: string, extra: Record<string, string> = {}) => ({ origin, "sec-fetch-site": "cross-site", accept: "text/event-stream", ...extra });

/** Through the whole server (middleware included): what an embed on {@link HOST} can and can't do. */
async function expectCrossOriginLive(base: string): Promise<void> {
  const pre = await fetch(`${base}/__textjs/live`, { method: "OPTIONS", headers: { origin: HOST, "access-control-request-method": "POST", "access-control-request-headers": "content-type,x-textjs-live" } });
  expect(pre.status).toBe(204);
  expect(pre.headers.get("access-control-allow-origin")).toBe(HOST);

  const s = await stream(base, "/pub", site(HOST));
  try {
    expect(s.status).toBe(200);
    expect(s.headers.get("access-control-allow-origin")).toBe(HOST);
    await until(() => frames(s).includes("pub 0"));
    const sid = (s.messages.find((m) => m.t === "hello") as { sid: string }).sid;
    const input = await fetch(`${base}/__textjs/live`, { method: "POST", headers: { origin: HOST, "sec-fetch-site": "cross-site", "content-type": "application/json", "x-textjs-live": sid }, body: JSON.stringify([{ type: "key", key: "+", input: "+" }]) });
    expect(input.status).toBe(204);
    expect(input.headers.get("access-control-allow-origin")).toBe(HOST);
    await until(() => frames(s).includes("pub 1"));
    // The page's own origin can't drive it.
    const own = await fetch(`${base}/__textjs/live`, { method: "POST", headers: { "content-type": "application/json", "x-textjs-live": sid }, body: "[]" });
    expect(own.status).toBe(403);
  } finally {
    s.close();
  }

  const evil = await fetch(`${base}/__textjs/live?path=/pub`, { headers: site("https://evil.example") });
  expect(evil.status).toBe(403);
  expect(evil.headers.get("access-control-allow-origin")).toBeNull();

  // Middleware still guards every route a session renders, and a cross-origin session never carries the visitor's cookies.
  const guarded = await stream(base, "/ops", site(HOST, { cookie: "auth=1" }));
  try {
    await until(() => guarded.messages.some((m) => m.t === "load" || m.t === "f"));
    await new Promise((r) => setTimeout(r, 100));
    expect(frames(guarded)).not.toContain("ops secret");
    expect(guarded.messages.some((m) => m.t === "load")).toBe(true);
  } finally {
    guarded.close();
  }
  const signedIn = await stream(base, "/ops", { cookie: "auth=1", accept: "text/event-stream" });
  try {
    await until(() => frames(signedIn).includes("ops secret"));
  } finally {
    signedIn.close();
  }
}

/** With `trustProxy`, a page on the proxy's public origin is the app's own (`200`); without it, another site (`403`). */
async function expectTrustedProxy(base: string, trusted = true): Promise<void> {
  const s = await stream(base, "/pub", { origin: "https://console.example", "x-forwarded-host": "console.example", "x-forwarded-proto": "https", accept: "text/event-stream" });
  try {
    expect(s.status).toBe(trusted ? 200 : 403);
    expect(s.headers.get("access-control-allow-origin")).toBeNull();
  } finally {
    s.close();
  }
}

/**
 * Pages' asset server: `dir/index.html` at `dir/`, 404.html for misses, and
 * `_headers` applied by URL (`headers: false` leaves them out, to see what the worker adds itself).
 */
function pagesAssets(dist: string, headers: boolean) {
  const rules: Array<{ path: string; headers: Array<[string, string]> }> = [];
  const file = join(dist, "_headers");
  if (headers && existsSync(file)) {
    for (const block of readFileSync(file, "utf8").split(/\n(?=\S)/)) {
      const [path = "", ...lines] = block.trim().split("\n");
      rules.push({ path: path.trim(), headers: lines.map((l) => l.trim().split(/:\s*/, 2) as [string, string]) });
    }
  }
  const withRules = (pathname: string, res: Response): Response => {
    for (const r of rules) if (r.path.endsWith("/*") ? pathname.startsWith(r.path.slice(0, -1)) : pathname === r.path) for (const [k, v] of r.headers) res.headers.set(k, v);
    return res;
  };
  return {
    fetch: async (req: Request) => {
      const url = new URL(req.url);
      const p = decodeURIComponent(url.pathname);
      const index = staticFile(dist, join(p, "index.html"));
      if (index && !p.endsWith("/")) return new Response(null, { status: 308, headers: { location: `${url.pathname}/` } });
      const file = p.endsWith("/") ? index : staticFile(dist, p);
      const type = file?.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream";
      if (file) return withRules(url.pathname, new Response(readFileSync(file), { headers: { "content-type": type } }));
      return withRules(url.pathname, new Response(readFileSync(join(dist, "404.html")), { status: 404, headers: { "content-type": "text/html; charset=utf-8" } }));
    },
  };
}

/** Pages in front of the worker: `_routes.json` decides which requests reach it. */
async function servePages(dist: string, headers = true): Promise<{ url: string; stop(): void }> {
  const worker = ((await import(`${join(dist, "_worker.js")}?t=${Date.now()}`)) as { default: { fetch(r: Request, env: unknown, ctx: unknown): Promise<Response> } }).default;
  const routes = JSON.parse(readFileSync(join(dist, "_routes.json"), "utf8")) as { include: string[]; exclude: string[] };
  const hit = (rule: string, p: string) => (rule.endsWith("/*") ? p.startsWith(rule.slice(0, -1)) : p === rule);
  const env = { ASSETS: pagesAssets(dist, headers) };
  const server = Bun.serve({
    port: 0,
    fetch: (req) => {
      const p = new URL(req.url).pathname;
      const viaWorker = routes.include.some((r) => hit(r, p)) && !routes.exclude.some((r) => hit(r, p));
      return viaWorker ? worker.fetch(req, env, { waitUntil: () => undefined }) : env.ASSETS.fetch(req);
    },
  });
  return { url: `http://127.0.0.1:${server.port}`, stop: () => server.stop(true) };
}

describe("embed: server-rendered routes from other sites", () => {
  let dir = "";
  beforeAll(async () => {
    dir = createFixture(LIVE_APP, "textjs-embed-live-");
    await buildApp({ root: dir, log: false });
  }, 120_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test(
    "text start",
    async () => {
      __configureCache({ reset: true });
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        const base = new URL(server.url).origin;
        await expectAssetHeaders(base, hashedAsset(dir));
        await expectCrossOriginLive(base);
        await expectTrustedProxy(base);
      } finally {
        await server.close();
      }
    },
    60_000,
  );

  test(
    "bun adapter",
    async () => {
      const { TRUST_PROXY: _proxy, TEXTJS_ORIGIN: _origin, ...env } = process.env;
      const serve = async (trustProxyEnv: string | undefined, check: (base: string) => Promise<void>): Promise<void> => {
        const proc = Bun.spawn(["bun", join(dir, "dist/server.js")], { cwd: dir, env: { ...env, PORT: "0", HOSTNAME: "127.0.0.1", ...(trustProxyEnv === undefined ? {} : { TRUST_PROXY: trustProxyEnv }) }, stdout: "pipe", stderr: "inherit" });
        try {
          await check(new URL(await waitForLine(proc.stdout, /ready on (http:\/\/\S+)/, 15_000)).origin);
        } finally {
          proc.kill();
          await proc.exited;
        }
      };
      await adapt(dir, "bun");
      await serve(undefined, async (base) => {
        await expectAssetHeaders(base, hashedAsset(dir));
        await expectCrossOriginLive(base);
        await expectTrustedProxy(base);
      });
      // As in `text start`: `server.trustProxy` from text.config.ts (baked in at build time) wins, TRUST_PROXY is the fallback.
      await serve("0", (base) => expectTrustedProxy(base, true));
      try {
        writeFileSync(join(dir, "text.config.ts"), config(`{ embed: { allowOrigins: [${JSON.stringify(HOST)}] }, server: { trustProxy: false } }`));
        await adapt(dir, "bun");
        await serve("1", (base) => expectTrustedProxy(base, false));
        writeFileSync(join(dir, "text.config.ts"), config(`{ embed: { allowOrigins: [${JSON.stringify(HOST)}] } }`));
        await adapt(dir, "bun");
        await serve("1", (base) => expectTrustedProxy(base, true));
        await serve(undefined, (base) => expectTrustedProxy(base, false));
      } finally {
        writeFileSync(join(dir, "text.config.ts"), LIVE_APP["text.config.ts"] as string);
      }
    },
    120_000,
  );

  test(
    "text dev accepts local host pages on any port, and only those, unless allowOrigins names more",
    async () => {
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Embed Live Fixture", embed: true }`));
      const dev: ViteDevServer = await startDevServer({ root: dir, port: 41000 + Math.floor(Math.random() * 2000), log: false });
      try {
        const base = new URL(dev.resolvedUrls?.local[0] ?? "").origin;
        // Text.js answers the preflight (not Vite's own CORS middleware).
        const pre = await fetch(`${base}/__textjs/live`, { method: "OPTIONS", headers: { origin: "http://localhost:4321", "access-control-request-method": "POST" } });
        expect(pre.status).toBe(204);
        expect(pre.headers.get("access-control-allow-origin")).toBe("http://localhost:4321");
        expect(pre.headers.get("access-control-max-age")).toBe("600");
        const local = await stream(base, "/pub", site("http://localhost:4321"));
        try {
          expect(local.status).toBe(200);
          expect(local.headers.get("access-control-allow-origin")).toBe("http://localhost:4321");
          await until(() => frames(local).includes("pub 0"), 20_000);
        } finally {
          local.close();
        }
        expect((await fetch(`${base}/__textjs/live?path=/pub`, { headers: site(HOST) })).status).toBe(403);
      } finally {
        await dev.waitForRequestsIdle();
        await dev.close();
        writeFileSync(join(dir, "text.config.ts"), LIVE_APP["text.config.ts"] as string);
      }
    },
    60_000,
  );

  test("an invalid allowOrigins fails `text start` and the bun build", async () => {
    writeFileSync(join(dir, "text.config.ts"), config(`{ embed: { allowOrigins: ["*"], credentials: true } }`));
    try {
      await expect(startProductionServer({ root: dir, port: 0, log: false })).rejects.toThrow(/embed\.credentials/);
      await expect(adapt(dir, "bun")).rejects.toThrow(/embed\.credentials/);
    } finally {
      writeFileSync(join(dir, "text.config.ts"), LIVE_APP["text.config.ts"] as string);
    }
  });
});

describe("embed: static files on every adapter", () => {
  let dir = "";
  let based = "";
  beforeAll(async () => {
    dir = createFixture(STATIC_APP(), "textjs-embed-static-");
    based = createFixture(STATIC_APP("/console"), "textjs-embed-based-");
    await buildApp({ root: dir, log: false });
    await buildApp({ root: based, log: false });
  }, 120_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(based, { recursive: true, force: true });
  });

  test(
    "text start, and without embed nothing changes",
    async () => {
      const server = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        await expectAssetHeaders(new URL(server.url).origin, hashedAsset(dir));
      } finally {
        await server.close();
      }
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Embed Fixture" }`));
      const plain = await startProductionServer({ root: dir, port: 0, log: false });
      try {
        await expectNoAssetHeaders(new URL(plain.url).origin, hashedAsset(dir));
      } finally {
        await plain.close();
        writeFileSync(join(dir, "text.config.ts"), STATIC_APP()["text.config.ts"] as string);
      }
    },
    60_000,
  );

  test(
    "vercel adapter (local Build Output router), with and without basePath",
    async () => {
      for (const [root, basePath] of [
        [dir, ""],
        [based, "/console"],
      ] as const) {
        const result = await adapt(root, "vercel");
        const config = JSON.parse(readFileSync(join(result.output, "config.json"), "utf8")) as { routes: Array<{ handle?: string }> };
        expect(config.routes.some((r) => r.handle === "hit")).toBe(true);
        const harness = await startVercelHarness(result.output);
        try {
          await expectAssetHeaders(harness.url + basePath, hashedAsset(root), { cacheControl: false });
        } finally {
          await harness.close();
        }
      }
      writeFileSync(join(dir, "text.config.ts"), config(`{ title: "Embed Fixture" }`));
      try {
        const result = await adapt(dir, "vercel");
        const harness = await startVercelHarness(result.output);
        try {
          await expectNoAssetHeaders(harness.url, hashedAsset(dir));
        } finally {
          await harness.close();
        }
      } finally {
        writeFileSync(join(dir, "text.config.ts"), STATIC_APP()["text.config.ts"] as string);
      }
    },
    120_000,
  );

  test(
    "cloudflare adapter: _headers on the CDN, the worker with basePath",
    async () => {
      await adapt(dir, "cloudflare");
      const dist = join(dir, "dist");
      expect(JSON.parse(readFileSync(join(dist, "_routes.json"), "utf8")).exclude).toEqual(["/assets/*", "/embed.js"]);
      expect(readFileSync(join(dist, "_headers"), "utf8")).toBe(
        [
          "/assets/*",
          "  Cache-Control: public, max-age=31536000, immutable",
          "  access-control-allow-origin: *",
          "  cross-origin-resource-policy: cross-origin",
          "",
          "/embed.js",
          "  Cache-Control: public, max-age=0, must-revalidate",
          "  access-control-allow-origin: *",
          "  cross-origin-resource-policy: cross-origin",
          "",
        ].join("\n"),
      );
      const cdn = await servePages(dist);
      try {
        await expectAssetHeaders(cdn.url, hashedAsset(dir), { byUrl: true });
      } finally {
        cdn.stop();
      }
      await adapt(based, "cloudflare");
      expect(JSON.parse(readFileSync(join(based, "dist/_routes.json"), "utf8")).exclude).toEqual([]);
      const worker = await servePages(join(based, "dist"), false);
      try {
        await expectAssetHeaders(`${worker.url}/console`, hashedAsset(based), { cacheControl: false });
      } finally {
        worker.stop();
      }
    },
    120_000,
  );

  test.skipIf(process.env.TEXTJS_TEST_WRANGLER !== "1")(
    "cloudflare: under `wrangler pages dev` (TEXTJS_TEST_WRANGLER=1)",
    async () => {
      // The CDN path (`_routes.json` excludes the files), then the worker path (basePath).
      for (const [root, basePath] of [
        [dir, ""],
        [based, "/console"],
      ] as const) {
        await adapt(root, "cloudflare");
        const port = 38900 + Math.floor(Math.random() * 100);
        const proc = Bun.spawn(["bunx", "wrangler", "pages", "dev", "dist", "--port", String(port), "--compatibility-date=2025-01-01", "--compatibility-flags=nodejs_compat", "--show-interactive-dev-session=false"], {
          cwd: root,
          stdout: "pipe",
          stderr: "pipe",
          env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "1" },
        });
        try {
          await waitForLine(proc.stdout, /(Ready on http:\/\/\S+)/, 90_000);
          await expectAssetHeaders(`http://127.0.0.1:${port}${basePath}`, hashedAsset(root), { byUrl: true, hostCors: true, cacheControl: !basePath });
        } finally {
          proc.kill();
          await proc.exited;
        }
      }
    },
    240_000,
  );

  test(
    "static adapter writes _headers",
    async () => {
      // A fresh build: the cloudflare adapter removed dist/.text.
      const result = await buildApp({ root: dir, log: false, adapter: "static" });
      expect(readFileSync(join(dir, "dist/_headers"), "utf8")).toContain("/embed.js\n  Cache-Control: public, max-age=0, must-revalidate\n  access-control-allow-origin: *\n  cross-origin-resource-policy: cross-origin\n");
      expect(result.output).toContain("Access-Control-Allow-Origin");
    },
    120_000,
  );
});
